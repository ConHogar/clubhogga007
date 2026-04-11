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

    // 2. Parse and validate
    const data = await request.json();
    const { full_name, rut, email, phone, status, valid_until } = data;

    if (!full_name || !rut) {
      return new Response(JSON.stringify({ error: 'Nombre y RUT son obligatorios.' }), { status: 400 });
    }

    const rut_normalized = rut.replace(/[\.\-]/g, '').toUpperCase();

    // 3. Insert into Supabase using service_role key (bypasses RLS)
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const payload = {
      full_name,
      rut,
      rut_normalized,
      email: email || null,
      phone: phone || null,
      status: status || 'active',
      valid_until: valid_until || null,
      accepted_terms_at: new Date().toISOString(),
      accepted_privacy_at: new Date().toISOString(),
    };

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/members`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.code === '23505') {
        return new Response(JSON.stringify({ error: 'Ya existe un socio con ese RUT.' }), { status: 409 });
      }
      return new Response(JSON.stringify({ error: 'Error al crear socio.', details: err }), { status: 500 });
    }

    const created = await res.json();
    return new Response(JSON.stringify({ success: true, member: created[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
