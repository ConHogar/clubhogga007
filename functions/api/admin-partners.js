export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify Admin Secret
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const expectedSecret = env.ADMIN_SECRET || 'babeclub_dev_secret';

    if (token !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Invalid admin token' }), { status: 403 });
    }

    // 2. Extract Data
    const data = await request.json();
    
    if (!data.business_name || !data.city_id || !data.category_id || !data.validation_token) {
      return new Response(JSON.stringify({ error: 'Missing required partner fields' }), { status: 400 });
    }

    // 3. Setup Supabase headers using SERVICE_ROLE_KEY to bypass RLS
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // 4. Insert into Supabase
    const insertPayload = {
      business_name: data.business_name,
      city_id: data.city_id,
      category_id: data.category_id,
      address: data.address || null,
      instagram: data.instagram || null,
      website: data.website || null,
      description: data.description || null,
      validation_token: data.validation_token,
      logo_url: data.logo_url || null,
      active: true, // Defaulting to true
      featured: false // Defaulting to false, they can be manually updated later
    };

    const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/partners`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(insertPayload)
    });

    if (!insertRes.ok) {
      const err = await insertRes.json();
      // Handle Unique violation (e.g. Token collision)
      if (err.code === '23505') {
         return new Response(JSON.stringify({ error: 'El Validation Token ingresado ya existe. Por favor usa uno distinto.' }), { status: 409 });
      }
      return new Response(JSON.stringify({ error: 'Error agregando empresa', details: err }), { status: 500 });
    }

    const createdPartner = await insertRes.json();

    return new Response(JSON.stringify({
      success: true,
      partner: createdPartner[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
