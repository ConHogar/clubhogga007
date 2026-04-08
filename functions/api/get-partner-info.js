export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('k');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token es obligatorio.' }), { status: 400 });
    }

    const headers = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    // 1. Fetch partner by token
    const partnerRes = await fetch(`${env.SUPABASE_URL}/rest/v1/partners?select=id,business_name,logo_url&validation_token=eq.${token}&active=eq.true`, { headers });
    const partners = await partnerRes.json();
    
    if (!partners || partners.length === 0) {
      return new Response(JSON.stringify({ error: 'Comercio inactivo o Token inválido.' }), { status: 404 });
    }
    const partner = partners[0];

    return new Response(JSON.stringify({ 
      status: 'success',
      partner: {
        id: partner.id,
        business_name: partner.business_name,
        logo_url: partner.logo_url
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error procesando solicitud: ' + error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
