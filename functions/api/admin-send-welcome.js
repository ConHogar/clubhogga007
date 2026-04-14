export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify Admin Secret
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (token !== (env.ADMIN_SECRET || 'babeclub_dev_secret')) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403 });
    }

    // 2. Parse body
    const body = await request.json();
    const { member_id } = body;
    if (!member_id) {
      return new Response(JSON.stringify({ error: 'member_id requerido' }), { status: 400 });
    }

    // 3. Fetch member from Supabase
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    const memberRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/members?select=full_name,email,status&id=eq.${member_id}`,
      { headers: supabaseHeaders }
    );
    const members = await memberRes.json();

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ error: 'Socio no encontrado' }), { status: 404 });
    }

    const member = members[0];
    if (!member.email) {
      return new Response(JSON.stringify({ error: 'El socio no tiene email registrado' }), { status: 400 });
    }

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurado' }), { status: 500 });
    }

    // 4. Send welcome email via Resend
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

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Club Hogga <club@hogga.cl>',
        to: [member.email],
        subject: '¡Tu membresía Club Hogga está activa! 🎉',
        html: emailHtml
      })
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok || !resendData.id) {
      return new Response(JSON.stringify({ error: 'Error al enviar email', details: resendData }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, email_sent_to: member.email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
