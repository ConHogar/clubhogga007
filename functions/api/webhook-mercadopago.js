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

      // 4. Actualizar el estado en Supabase a 'active' usando el correo como puente
      const updatePayload = {
        status: 'active',
        payment_status: resourceStatus,
        subscription_id: resourceId
      };

      await fetch(`${env.SUPABASE_URL}/rest/v1/members?email=eq.${payerEmail}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(updatePayload)
      });

      if (wasPending && env.RESEND_API_KEY) {
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <h2 style="color: #0d9488;">¡Bienvenido/a a Club Hogga! 🎉</h2>
            <p>Hola, tu suscripción ha sido confirmada exitosamente y ya eres oficialmente parte del club.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong>¿Cómo cobro mis beneficios?</strong><br>
              Es súper simple: visita cualquier comercio asociado, menciona que eres del Club Hogga y dicta tu RUT al momento de pagar. El comercio validará tu RUT en su sistema para aplicar el descuento en el acto.
            </div>
            <p>Explora todos los beneficios activos de tu ciudad aquí: <br>
            <a href="https://clubhogga.cl/beneficios/" style="color: #0ea5e9; font-weight: bold;">Directorio de Beneficios</a></p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af;">Si tienes alguna duda con tu membresía, puedes responder directamente a este correo.</p>
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
            from: 'Club Hogga <onboarding@resend.dev>', // Cambia esto por tu correo real de @clubhogga cuando valides tu dominio.
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
