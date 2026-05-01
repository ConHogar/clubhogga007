export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify Admin Secret
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (token !== env.ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403 });
    }

    const { member_id, email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email requerido para sincronizar' }), { status: 400 });
    }

    if (!env.MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'Falta Token de MP en el servidor' }), { status: 500 });
    }

    // 2. Fetch MP subscriptions by email
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(email)}`, {
      headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) {
      return new Response(JSON.stringify({ error: 'Error consultando MercadoPago' }), { status: 502 });
    }

    const mpData = await mpRes.json();
    const subscriptions = mpData.results || [];

    // Find the active (authorized) subscription
    const activeSub = subscriptions.find(s => s.status === 'authorized');

    if (!activeSub) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No se encontró suscripción activa en MercadoPago para este email.' 
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const nextPaymentDateStr = activeSub.next_payment_date;
    if (!nextPaymentDateStr) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Suscripción encontrada pero sin fecha de próximo cobro.' 
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Update Supabase valid_until
    // We set valid_until to the MP next_payment_date
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    const updatePayload = {
      status: 'active',
      valid_until: nextPaymentDateStr,
      payment_status: 'authorized'
    };

    const patchRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${member_id}`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updatePayload)
    });

    if (!patchRes.ok) {
      return new Response(JSON.stringify({ error: 'Error actualizando base de datos' }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      new_valid_until: nextPaymentDateStr,
      message: 'Sincronizado exitosamente con MercadoPago'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
