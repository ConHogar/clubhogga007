export async function onRequestPost({ request, env }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (!env.ADMIN_SECRET || token !== env.ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403 });
    }
    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurado' }), { status: 500 });
    }

    const body = await request.json();
    const { subject, heading, body_text, cta_text, cta_url, segment, city_id, partner_ids, test_email } = body;

    if (!subject || !heading || !body_text) {
      return new Response(JSON.stringify({ error: 'subject, heading y body_text son obligatorios' }), { status: 400 });
    }

    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    let recipients = [];

    if (test_email) {
      recipients = [{ email: test_email, business_name: 'Admin (Test)' }];
    } else if (partner_ids && partner_ids.length > 0) {
      const idList = partner_ids.join(',');
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/partners?select=id,email,business_name&id=in.(${idList})`,
        { headers: supabaseHeaders }
      );
      const data = await res.json();
      recipients = Array.isArray(data) ? data.filter(p => p.email) : [];
    } else {
      let query = `${env.SUPABASE_URL}/rest/v1/partners?select=id,email,business_name&active=eq.true`;
      if (city_id) query += `&city_id=eq.${city_id}`;
      const res = await fetch(query, { headers: supabaseHeaders });
      const data = await res.json();
      recipients = Array.isArray(data) ? data.filter(p => p.email) : [];
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay aliados con email para ese segmento.' }), { status: 400 });
    }

    const buildHtml = (businessName) => {
      const safeBody = (body_text || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      const personalizedBody = safeBody.replace(/\{empresa\}/gi, businessName || 'aliado');
      const personalizedHeading = heading.replace(/\{empresa\}/gi, businessName || 'aliado');
      return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;color:#1e293b;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)">
  <div style="background:#f8fafc;padding:30px 20px;text-align:center;border-bottom:1px solid #e2e8f0">
    <img src="https://club.hogga.cl/images/logo.png" alt="Club Hogga" style="height:48px">
  </div>
  <div style="padding:30px 24px">
    <h2 style="color:#0a2e46;font-size:22px;margin-top:0;margin-bottom:16px">${personalizedHeading}</h2>
    <div style="font-size:16px;line-height:1.6;margin-bottom:24px">${personalizedBody}</div>
    ${cta_text && cta_url ? `<div style="text-align:center;margin:32px 0 16px"><a href="${cta_url}" style="background:#108f8e;color:#fff;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;display:inline-block;font-size:16px">${cta_text}</a></div>` : ''}
  </div>
  <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="font-size:13px;color:#64748b;margin:0">Si tienes alguna consulta, escríbenos a club@hogga.cl.</p>
    <p style="font-size:12px;color:#94a3b8;margin-top:12px">© 2026 Club Hogga. Todos los derechos reservados.</p>
  </div>
</div>`;
    };

    const BATCH = 100;
    let sentCount = 0;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      const emails = batch.map(p => ({
        from: 'Club Hogga <club@hogga.cl>',
        to: [p.email],
        subject: subject.replace(/\{empresa\}/gi, p.business_name || ''),
        html: buildHtml(p.business_name)
      }));
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(emails)
      });
      const data = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Error al enviar', details: data, sent_so_far: sentCount }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      sentCount += batch.length;
    }

    return new Response(JSON.stringify({ success: true, sent_count: sentCount }), {
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
