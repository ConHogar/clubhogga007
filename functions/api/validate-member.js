// Reduce a full name to "Firstname L." for at-counter verification.
// The merchant needs to recognize the customer in front of them, not store
// or correlate the full name. Returning full names on every successful lookup
// turns any leaked partner token into a name-harvesting oracle over the
// ~10M Chilean RUT space.
function abbreviateName(fullName) {
  if (!fullName) return 'Socio';
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Socio';
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${first} ${lastInitial}.`;
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    if (!data.validation_token || !data.rut) {
      return new Response(JSON.stringify({ error: 'Token y RUT son obligatorios.' }), { status: 400 });
    }

    const rut_norm = data.rut.replace(/[\.\-]/g, '').toUpperCase();
    const headers = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    // 1. Identificar al comercio (Partner) mediante el token
    const partnerRes = await fetch(`${env.SUPABASE_URL}/rest/v1/partners?select=id,business_name,is_test&validation_token=eq.${data.validation_token}&active=eq.true`, { headers });
    const partners = await partnerRes.json();
    
    if (!partners || partners.length === 0) {
      // Registrar log token fallido (opcional) pero cortamos ejecución
      return new Response(JSON.stringify({ error: 'Comercio inactivo o Token inválido.' }), { status: 401 });
    }
    const partner = partners[0];

    // 2. Buscar al socio por RUT Normalizado
    const memberRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id,full_name,status,is_test&rut_normalized=eq.${rut_norm}`, { headers });
    const members = await memberRes.json();
    
    const isTestMode = Boolean(partner.is_test || (members && members.length > 0 && members[0].is_test));
    
    let resultLog = 'not_found';
    let responsePayload = {};
    let statusCode = 200;

    if (!members || members.length === 0) {
      resultLog = 'not_found';
      responsePayload = { status: 'not_found', message: 'Socio no encontrado' };
    } else {
      const member = members[0];
      if (member.status === 'active') {
        resultLog = 'active';
        responsePayload = {
          status: 'active',
          message: 'Socio activo',
          member: {
            id: member.id,
            full_name: abbreviateName(member.full_name),
            is_test: member.is_test
          },
          partner: {
            id: partner.id,
            business_name: partner.business_name,
            is_test: partner.is_test
          },
          partner_id: partner.id
        };
        
        // Obtener beneficios de este comercio para mostrar selector
        const benefitsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/benefits?select=id,title&partner_id=eq.${partner.id}&active=eq.true`, { headers });
        const benefits = await benefitsRes.json();
        responsePayload.benefits = benefits || [];
        
      } else {
        resultLog = 'inactive';
        responsePayload = { 
          status: 'inactive', 
          message: 'Socio inactivo',
          member: {
            is_test: member.is_test
          }
        };
      }
    }

    // 3. Registrar en validation_logs (asincrónico) SOLO si no es test mode
    if (!isTestMode) {
      const logPayload = {
        partner_id: partner.id,
        member_id: members && members.length > 0 ? members[0].id : null,
        rut_entered: data.rut,
        result: resultLog,
        ip_address: request.headers.get('cf-connecting-ip') || '',
        user_agent: request.headers.get('user-agent') || ''
      };

      await fetch(`${env.SUPABASE_URL}/rest/v1/validation_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(logPayload)
      });
    }

    return new Response(JSON.stringify(responsePayload), { 
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('validate-member error:', error);
    return new Response(JSON.stringify({ error: 'Error procesando solicitud.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
