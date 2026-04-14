// Verify MercadoPago webhook signature using HMAC-SHA256
// Docs: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
async function verifyMPSignature(request, bodyText, secret) {
  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  if (!xSignature) return false;

  // Header format: "ts=<timestamp>,v1=<hash>"
  const parts = Object.fromEntries(
    xSignature.split(',').map(p => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    })
  );
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  // Reject requests older than 5 minutes (replay attack protection)
  const tsNum = parseInt(ts, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > 300) return false;

  // Extract data.id from body
  let dataId = '';
  try {
    const parsed = JSON.parse(bodyText);
    dataId = parsed?.data?.id ?? '';
  } catch {
    return false;
  }

  // Build the manifest string MP specifies
  const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;

  // Compute HMAC-SHA256 using Web Crypto (native in CF Workers)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === v1;
}

export async function onRequestPost({ request, env }) {
  try {
    const bodyText = await request.text();

    // --- Signature verification ---
    // If MP_WEBHOOK_SECRET is set, enforce verification.
    // If not set yet (e.g. local dev), log a warning and continue.
    if (env.MP_WEBHOOK_SECRET) {
      const valid = await verifyMPSignature(request, bodyText, env.MP_WEBHOOK_SECRET);
      if (!valid) {
        // Return 200 so MP doesn't retry — we just discard the invalid request silently.
        console.warn('Webhook rejected: invalid signature');
        return new Response('Invalid signature', { status: 200 });
      }
    } else {
      console.warn('MP_WEBHOOK_SECRET not set — skipping signature verification');
    }

    // --- Parse body ---
    const url = new URL(request.url);
    let body = {};
    if (bodyText) {
      try { body = JSON.parse(bodyText); } catch { /* ignore */ }
    }

    const type = url.searchParams.get('type') || url.searchParams.get('topic') || body.type;
    const resourceId = body?.data?.id || body?.id || url.searchParams.get('id');
    console.log('Webhook received — type:', type, '| resourceId:', resourceId);

    if (!resourceId || !env.MP_ACCESS_TOKEN) {
      return new Response('Ignored - No resourceId or Token', { status: 200 });
    }

    let payerEmail = null;
    let resourceStatus = null;

    // 1. Consultar a la API de MercadoPago el estado del pago o suscripción
    if (type === 'payment') {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
      });
      const paymentData = await mpRes.json();
      console.log('MP payment data:', JSON.stringify({ status: paymentData?.status, email: paymentData?.payer?.email }));
      payerEmail = paymentData?.payer?.email;
      resourceStatus = paymentData?.status; // 'approved'

    } else if (type === 'subscription_preapproval' || type === 'preapproval') {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
      });
      const subData = await mpRes.json();
      console.log('MP preapproval data:', JSON.stringify({ status: subData?.status, email: subData?.payer_email }));
      payerEmail = subData?.payer_email;
      resourceStatus = subData?.status; // 'authorized'

    } else if (type === 'subscription_authorized_payment') {
      // MP fires this when a subscription charge is successfully collected
      const mpRes = await fetch(`https://api.mercadopago.com/authorized_payments/${resourceId}`, {
        headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
      });
      const authPayment = await mpRes.json();
      console.log('MP authorized_payment data:', JSON.stringify({ status: authPayment?.status, preapproval_id: authPayment?.preapproval_id }));
      // Look up the parent preapproval to get payer_email
      if (authPayment?.preapproval_id) {
        const subRes = await fetch(`https://api.mercadopago.com/preapproval/${authPayment.preapproval_id}`, {
          headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
        });
        const subData = await subRes.json();
        payerEmail = subData?.payer_email;
        resourceStatus = authPayment?.status === 'processed' ? 'approved' : authPayment?.status;
      }
    } else {
      console.warn('Unhandled webhook type:', type, '| body type:', body.type, '| topic param:', url.searchParams.get('topic'));
    }

    // 2. Si se aprobó el pago y tenemos el correo del pagador
    if (payerEmail && (resourceStatus === 'approved' || resourceStatus === 'authorized')) {

      const supabaseHeaders = {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      };

      // 3. Obtener el usuario actual en la base de datos
      const encodedEmail = encodeURIComponent(payerEmail);
      const getMembersRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id,status&email=eq.${encodedEmail}`, {
        method: 'GET',
        headers: supabaseHeaders
      });
      const members = await getMembersRes.json();
      console.log('Supabase member lookup for', payerEmail, ':', JSON.stringify(members));

      let wasPending = false;
      if (members && members.length > 0 && members[0].status === 'pending') {
        wasPending = true;
      }

      // 4. Actualizar estado y fecha de vencimiento (+31 días)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 31);

      const updatePayload = {
        status: 'active',
        payment_status: resourceStatus,
        subscription_id: resourceId,
        valid_until: validUntil.toISOString()
      };

      const patchRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?email=eq.${encodedEmail}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(updatePayload)
      });
      console.log('Supabase PATCH status:', patchRes.status);

      if (wasPending && env.RESEND_API_KEY) {
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background-color: #f8fafc; padding: 30px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="https://club-hogga.pages.dev/images/logo.webp" alt="Club Hogga Logo" style="height: 48px; margin-bottom: 0;">
            </div>
            <!-- Body -->
            <div style="padding: 30px 24px;">
              <h2 style="color: #0a2e46; font-size: 22px; margin-top: 0; margin-bottom: 16px;">¡Bienvenido/a al Club! 🎉</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hola, tu suscripción ha sido confirmada exitosamente y ya eres oficialmente parte de la red de beneficios.</p>

              <div style="background-color: #f0fdfa; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #108f8e;">
                <h3 style="color: #0a2e46; font-size: 16px; margin-top: 0; margin-bottom: 8px;">¿Cómo cobro mis beneficios?</h3>
                <p style="font-size: 15px; line-height: 1.5; margin: 0; color: #0f766e;">
                  Es súper simple: visita cualquier comercio asociado, menciona que eres socio y <strong>dicta tu RUT</strong> al momento de pedir la cuenta. El local validará tu membresía en segundos para aplicar tu descuento.
                </p>
              </div>

              <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
                <a href="https://clubhogga.cl/beneficios/" style="background-color: #108f8e; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">Explorar Beneficios</a>
              </div>
            </div>
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #64748b; margin: 0;">Si tienes alguna duda, responde a este correo o escríbenos a club@hogga.cl.</p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 12px;">© 2026 Club Hogga. Todos los derechos reservados.</p>
            </div>
          </div>
        `;

        // 5. Enviar correo de bienvenida por Resend
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Club Hogga <club@hogga.cl>',
            to: [payerEmail],
            subject: '¡Tu membresía Club Hogga está activa! 🎉',
            html: emailHtml
          })
        });
      }
    }

    return new Response('Webhook procesado correctamente', { status: 200 });

  } catch (err) {
    console.error('Webhook error:', err);
    // Always return 200 to prevent MP infinite retries
    return new Response('Error controlado', { status: 200 });
  }
}
