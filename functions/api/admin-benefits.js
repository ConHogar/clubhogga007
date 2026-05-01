function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  const expectedSecret = env.ADMIN_SECRET;
  if (!expectedSecret) {
    return json({ error: 'Server misconfiguration' }, 503);
  }
  if (token !== expectedSecret) {
    return json({ error: 'Invalid token' }, 403);
  }
  return null;
}

function supaFetch(env, path, method = 'GET', body = null) {
  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// GET /api/admin-benefits?partner_id=xxx
export async function onRequestGet({ request, env }) {
  const authError = verifyAuth(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const partnerId = url.searchParams.get('partner_id');
  if (!partnerId) return json({ error: 'partner_id requerido' }, 400);

  const res = await supaFetch(env, `benefits?partner_id=eq.${partnerId}&order=created_at.asc`);
  if (!res.ok) {
    const err = await res.json();
    return json({ error: 'Error de base de datos', details: err }, 500);
  }

  const benefits = await res.json();
  return json({ success: true, benefits });
}

// POST /api/admin-benefits — create
export async function onRequestPost({ request, env }) {
  const authError = verifyAuth(request, env);
  if (authError) return authError;

  const body = await request.json();
  const { partner_id, title, description, discount_type, discount_value, conditions, start_date, end_date } = body;

  if (!partner_id || !title) return json({ error: 'partner_id y title son requeridos' }, 400);

  const payload = {
    partner_id,
    title,
    description: description || null,
    discount_type: discount_type || null,
    discount_value: (discount_value !== null && discount_value !== undefined && discount_value !== '') ? Number(discount_value) : null,
    conditions: conditions || null,
    start_date: start_date || null,
    end_date: end_date || null,
    active: true
  };

  const res = await supaFetch(env, 'benefits', 'POST', payload);
  if (!res.ok) {
    const err = await res.json();
    return json({ error: 'Error de base de datos', details: err }, 500);
  }

  const created = await res.json();
  return json({ success: true, benefit: created[0] });
}

// PATCH /api/admin-benefits — update
export async function onRequestPatch({ request, env }) {
  const authError = verifyAuth(request, env);
  if (authError) return authError;

  const body = await request.json();
  const { benefit_id, ...fields } = body;
  if (!benefit_id) return json({ error: 'benefit_id requerido' }, 400);

  const allowed = ['title', 'description', 'discount_type', 'discount_value', 'conditions', 'active', 'start_date', 'end_date'];
  const updatePayload = {};
  for (const key of allowed) {
    if (key in fields) updatePayload[key] = fields[key];
  }

  if (Object.keys(updatePayload).length === 0) return json({ error: 'Nada que actualizar' }, 400);

  const res = await supaFetch(env, `benefits?id=eq.${benefit_id}`, 'PATCH', updatePayload);
  if (!res.ok) {
    const err = await res.json();
    return json({ error: 'Error de base de datos', details: err }, 500);
  }

  const updated = await res.json();
  return json({ success: true, benefit: updated[0] || null });
}

// DELETE /api/admin-benefits?benefit_id=xxx
export async function onRequestDelete({ request, env }) {
  const authError = verifyAuth(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const benefitId = url.searchParams.get('benefit_id');
  if (!benefitId) return json({ error: 'benefit_id requerido' }, 400);

  const res = await supaFetch(env, `benefits?id=eq.${benefitId}`, 'DELETE');
  if (!res.ok) {
    const err = await res.json();
    return json({ error: 'Error de base de datos', details: err }, 500);
  }

  return json({ success: true });
}
