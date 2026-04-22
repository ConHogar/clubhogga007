export async function onRequestGet({ env }) {
  try {
    // We will use the SERVICE_ROLE key here. It accesses public data reliably via REST API bypassing restrictive RLS policies.
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    // Parallel fetch: partners, cities, categories
    // We fetch partners with their nested benefits
    const [partnersRes, citiesRes, categoriesRes] = await Promise.all([
      fetch(`${env.SUPABASE_URL}/rest/v1/partners?select=id,business_name,city_id,category_id,address,instagram,website,logo_url,description,featured,google_maps_url,benefits(id,title,description,discount_type,discount_value,conditions,active)&active=eq.true`, { headers: supabaseHeaders }),
      fetch(`${env.SUPABASE_URL}/rest/v1/cities?select=*&active=eq.true&order=name.asc`, { headers: supabaseHeaders }),
      fetch(`${env.SUPABASE_URL}/rest/v1/categories?select=*&active=eq.true&order=name.asc`, { headers: supabaseHeaders })
    ]);

    if (!partnersRes.ok || !citiesRes.ok || !categoriesRes.ok) {
      throw new Error('Supabase fetch failed');
    }

    let partners = await partnersRes.json();
    const cities = await citiesRes.json();
    const categories = await categoriesRes.json();

    // We want to return ALL active partners. For the benefits inside them, we only keep active ones.
    const activePartners = partners.map(partner => {
      if (partner.benefits && Array.isArray(partner.benefits)) {
        partner.benefits = partner.benefits.filter(b => b.active === true);
      } else {
        partner.benefits = [];
      }
      return partner;
    });

    // Return the sanitized JSON data with Cache-Control for fast loading!
    return new Response(JSON.stringify({ 
      partners: activePartners, 
      cities, 
      categories 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
