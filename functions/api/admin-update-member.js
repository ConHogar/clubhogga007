export async function onRequestPatch({ request, env }) {
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
    const { member_id, status, valid_until } = body;

    if (!member_id) {
      return new Response(JSON.stringify({ error: 'member_id requerido' }), { status: 400 });
    }

    // 3. Build update payload — only include explicitly provided fields
    const updatePayload = {};
    const allowed = ['active', 'pending', 'inactive'];
    if (status !== undefined) {
      if (!allowed.includes(status)) {
        return new Response(JSON.stringify({ error: 'Estado inválido' }), { status: 400 });
      }
      updatePayload.status = status;
    }
    if (valid_until !== undefined) {
      updatePayload.valid_until = valid_until; // ISO string or null
    }

    if (Object.keys(updatePayload).length === 0) {
      return new Response(JSON.stringify({ error: 'Nada que actualizar' }), { status: 400 });
    }

    // 4. Update Supabase
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${member_id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updatePayload)
    });

    if (!res.ok) {
      const err = await res.json();
      return new Response(JSON.stringify({ error: 'Error de base de datos', details: err }), { status: 500 });
    }

    const updated = await res.json();
    return new Response(JSON.stringify({ success: true, member: updated[0] || null }), {
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
