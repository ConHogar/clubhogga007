export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    
    if (!data.rut || !data.email) {
      return new Response(JSON.stringify({ error: 'RUT y Correo son obligatorios.' }), { status: 400 });
    }
    const rut_norm = data.rut.replace(/[\.\-]/g, '').toUpperCase();
    
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // 1. Obtener el ID de la ciudad seleccionada
    let city_id = null;
    if (data.city_slug) {
      const cityRes = await fetch(`${env.SUPABASE_URL}/rest/v1/cities?select=id&slug=eq.${data.city_slug}`, { headers: supabaseHeaders });
      const cities = await cityRes.json();
      if (cities && cities.length > 0) city_id = cities[0].id;
    }

    // 2. Definir precio contando los socios activos
    // Para no gastar memoria, tomamos solo hasta 150 registros. Si hay 150, ya llegamos al limite.
    const countRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id&status=eq.active&limit=150`, { headers: supabaseHeaders });
    const actives = await countRes.json();
    const isLaunchOffer = (actives && actives.length < 150);

    // Links estáticos de suscripción de MercadoPago cargados desde variables de entorno
    const MP_LAUNCH_URL = env.MP_LINK_LAUNCH || 'https://www.mercadopago.cl/ayuda/19227'; // URL por defecto si falta
    const MP_REGULAR_URL = env.MP_LINK_REGULAR || 'https://www.mercadopago.cl/ayuda/19227';

    const checkoutUrl = isLaunchOffer ? MP_LAUNCH_URL : MP_REGULAR_URL;

    // 3. Insertar Miembro como 'pending'
    const memberPayload = {
      full_name: data.full_name,
      rut: data.rut,
      rut_normalized: rut_norm,
      email: data.email,
      phone: data.phone,
      city_id: city_id,
      status: 'pending', // Ahora nacen inactivos hasta que paguen
      marketing_opt_in: data.marketing_opt_in || false,
      accepted_terms_at: new Date().toISOString(),
      accepted_privacy_at: new Date().toISOString()
    };

    const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(memberPayload)
    });

    if (insertRes.status === 409) {
      // Intentar actualizar a este miembro si existe y esta en pending (por si abandonó el pago antes)
      const existingRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id,status&rut_normalized=eq.${rut_norm}`, { headers: supabaseHeaders });
      const existing = await existingRes.json();
      
      if (existing && existing.length > 0 && existing[0].status === 'active') {
        return new Response(JSON.stringify({ error: 'Esta cuenta ya existe y tiene una membresía activa.' }), { status: 400 });
      } else {
        // Estaba en Pending, le re-enviamos el link de pago sin error
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Usuario ya existía en estado inicial. Redirigiendo al pago...', 
          payment_url: checkoutUrl 
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    if (!insertRes.ok) {
      const err = await insertRes.json();
      return new Response(JSON.stringify({ error: 'Error interno: ' + err.message }), { status: 500 });
    }

    const createdMember = await insertRes.json();

    return new Response(JSON.stringify({ 
      success: true, 
      member_id: createdMember[0].id,
      payment_url: checkoutUrl,
      is_launch_offer: isLaunchOffer
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
