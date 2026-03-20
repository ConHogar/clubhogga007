export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    if (!data.validation_token || !data.member_id || !data.partner_id || !data.benefit_id) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos.' }), { status: 400 });
    }

    const headers = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    // 1. Validar el token del comercio
    const partnerRes = await fetch(`${env.SUPABASE_URL}/rest/v1/partners?select=id&validation_token=eq.${data.validation_token}&active=eq.true`, { headers });
    const partners = await partnerRes.json();
    if (!partners || partners.length === 0 || partners[0].id !== data.partner_id) {
      return new Response(JSON.stringify({ error: 'Token inválido o comercio no corresponde.' }), { status: 401 });
    }

    // 2. Verificar que el socio exista y esté activo
    const memberRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id,status&id=eq.${data.member_id}`, { headers });
    const members = await memberRes.json();
    if (!members || members.length === 0 || members[0].status !== 'active') {
      return new Response(JSON.stringify({ error: 'Socio inválido o inactivo.' }), { status: 400 });
    }

    // 3. Verificar que el beneficio pertenezca al partner y sea activo
    const benefitRes = await fetch(`${env.SUPABASE_URL}/rest/v1/benefits?select=id&id=eq.${data.benefit_id}&partner_id=eq.${data.partner_id}&active=eq.true`, { headers });
    const benefits = await benefitRes.json();
    if (!benefits || benefits.length === 0) {
      return new Response(JSON.stringify({ error: 'Beneficio inválido para este comercio.' }), { status: 400 });
    }

    // 4. Chequear duplicados (Regla Anti-Duplicados: misma combinación en los últimos 5 mins)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const dupRes = await fetch(`${env.SUPABASE_URL}/rest/v1/benefit_uses?select=id&member_id=eq.${data.member_id}&partner_id=eq.${data.partner_id}&benefit_id=eq.${data.benefit_id}&created_at=gte.${fiveMinutesAgo}`, { headers });
    const duplicates = await dupRes.json();
    if (duplicates && duplicates.length > 0) {
      return new Response(JSON.stringify({ error: 'Este beneficio ya fue registrado para este socio hace menos de 5 minutos.' }), { status: 429 });
    }

    // 5. Insertar Uso
    const usePayload = {
      member_id: data.member_id,
      partner_id: data.partner_id,
      benefit_id: data.benefit_id
    };

    const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/benefit_uses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(usePayload)
    });

    if (!insertRes.ok) {
      const err = await insertRes.json();
      return new Response(JSON.stringify({ error: 'Error al registrar uso: ' + err.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Beneficio registrado correctamente.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error procesando solicitud: ' + error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
