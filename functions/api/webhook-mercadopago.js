export async function onRequestPost({ request, env }) {
  try {
    // MercadoPago envía eventos por POST. Leemos el body o los query params.
    const url = new URL(request.url);
    const bodyText = await request.text();
    let body = {};
    if (bodyText) body = JSON.parse(bodyText);

    // Identificar tipo de evento ('payment' o 'subscription_preapproval')
    const type = url.searchParams.get('type') || url.searchParams.get('topic') || body.type;
    const resourceId = body?.data?.id || body?.id || url.searchParams.get('id');

    if (!resourceId || !env.MP_ACCESS_TOKEN) {
      // Retornar 200 rápido para que MP no reintente locamente si no configuraron el token
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
      payerEmail = paymentData?.payer?.email;
      resourceStatus = paymentData?.status; // 'approved'
      
    } else if (type === 'subscription_preapproval' || type === 'preapproval') {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
      });
      const subData = await mpRes.json();
      payerEmail = subData?.payer_email;
      resourceStatus = subData?.status; // 'authorized'
    }

    // 2. Si se aprobó el pago y tenemos el correo del pagador
    if (payerEmail && (resourceStatus === 'approved' || resourceStatus === 'authorized')) {
      
      const supabaseHeaders = {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      };

      // 3. Obtener el usuario actual en la base de datos para ver si ya estaba activo o no
      const getMembersRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id,status&email=eq.${payerEmail}`, {
        method: 'GET',
        headers: supabaseHeaders
      });
      const members = await getMembersRes.json();

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

      await fetch(`${env.SUPABASE_URL}/rest/v1/members?email=eq.${payerEmail}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(updatePayload)
      });

      if (wasPending && env.RESEND_API_KEY) {
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background-color: #f8fafc; padding: 30px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <img src="https://club-hogga.pages.dev/images/logo.webp" alt="Club Hogga Logo" style="height: 48px; margin-bottom: 0;">
            </div>
            <!-- Body -->
            <div style="padding: 30px 24px;">
              <h2 style="color: #ea580c; font-size: 22px; margin-top: 0; margin-bottom: 16px;">¡Bienvenido/a al Club! 🎉</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hola, tu suscripción ha sido confirmada exitosamente y ya eres oficialmente parte de la red de beneficios.</p>
              
              <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #ea580c;">
                <h3 style="color: #9a3412; font-size: 16px; margin-top: 0; margin-bottom: 8px;">¿Cómo cobro mis beneficios?</h3>
                <p style="font-size: 15px; line-height: 1.5; margin: 0; color: #c2410c;">
                  Es súper simple: visita cualquier comercio asociado, menciona que eres socio y <strong>dicta tu RUT</strong> al momento de pedir la cuenta. El local validará tu membresía en segundos para aplicar tu descuento.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
                <a href="https://clubhogga.cl/beneficios/" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">Explorar Beneficios</a>
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
    // Para MP, si fallamos debemos devolver 200 OK igual, o hace retry infinito que bota servidores.
    return new Response('Error controlado', { status: 200 });
  }
}
