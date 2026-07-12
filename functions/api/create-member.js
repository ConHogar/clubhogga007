export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    // 0. Verificar Turnstile Anti-Spam Invisible
    const turnstileToken = data['cf-turnstile-response'];
    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: 'Validación de seguridad requerida. Por favor recarga la página.' }), { status: 400 });
    }

    const verifyData = new FormData();
    verifyData.append('secret', env.TURNSTILE_SECRET_KEY);
    verifyData.append('response', turnstileToken);
    verifyData.append('remoteip', request.headers.get('CF-Connecting-IP') || '');

    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: verifyData
    });
    const outcome = await turnstileRes.json();
    if (!outcome.success) {
      return new Response(JSON.stringify({ error: 'Fallo en la validación anti-spam o token expirado. Intenta de nuevo.' }), { status: 403 });
    }

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

    // 1. (Obsoleto) Obtener el ID de la ciudad seleccionada
    // Ya no vinculamos estrictamente a una "ciudad Hogga" al resgistro,
    // guardamos su región y comuna geográfica real.
    let city_id = null;

    // 2. Definir el link de pago según la frecuencia elegida por el socio.
    //    - monthly  (Mensual):   $3.990 / mes
    //    - semester (Semestral): $3.490 / mes  -> se cobra $20.940 cada 6 meses
    //    - annual   (Anual):     $2.990 / mes  -> se cobra $35.880 cada 12 meses
    //    Cada plan tiene su propio link de suscripción de MercadoPago (env vars).
    const FALLBACK_MP_URL = 'https://www.mercadopago.cl/ayuda/19227';
    const MP_LINKS = {
      monthly: env.MP_LINK_MONTHLY || FALLBACK_MP_URL,
      semester: env.MP_LINK_SEMESTER || FALLBACK_MP_URL,
      annual: env.MP_LINK_ANNUAL || FALLBACK_MP_URL
    };

    // Validar el plan recibido; si no es válido, usar 'monthly' por defecto.
    const plan = ['monthly', 'semester', 'annual'].includes(data.plan) ? data.plan : 'monthly';
    const checkoutUrl = MP_LINKS[plan];
    const offerType = plan;

    // 3. Insertar Miembro como 'pending'
    const memberPayload = {
      full_name: data.full_name,
      rut: data.rut,
      rut_normalized: rut_norm,
      email: data.email,
      phone: data.phone,
      city_id: city_id,
      region: data.region,
      comuna: data.comuna,
      status: 'pending', // Ahora nacen inactivos hasta que paguen
      plan: plan,
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
        // Estaba en Pending: actualizamos el plan elegido (por si cambió de opinión)
        // y le re-enviamos el link de pago correcto sin error.
        if (existing && existing.length > 0) {
          await fetch(`${env.SUPABASE_URL}/rest/v1/members?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            headers: supabaseHeaders,
            body: JSON.stringify({ plan: plan })
          });
        }
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
      offer_type: offerType
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
