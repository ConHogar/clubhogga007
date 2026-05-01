export async function onRequestGet({ request, env }) {
  try {
    // 1. Verify Admin Secret
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const expectedSecret = env.ADMIN_SECRET;
    if (!expectedSecret) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 503 });
    }

    if (token !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403 });
    }

    // 2. Setup Supabase headers using SERVICE_ROLE_KEY to bypass RLS
    const supabaseHeaders = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // 3. Fetch summary statistics
    // 3A. Total pending/active (Just counting all for total, active for active)
    const activeCountRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id&status=eq.active`, { 
      method: 'GET',
      headers: supabaseHeaders 
    });
    const activeData = await activeCountRes.json();
    const activeSubs = activeData.length || 0;

    const totalCountRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=id`, { 
      method: 'GET',
      headers: supabaseHeaders 
    });
    const totalData = await totalCountRes.json();
    const totalMembers = totalData.length || 0;

    // 4. Fetch the latest 100 members for the dashboard table
    const membersRes = await fetch(`${env.SUPABASE_URL}/rest/v1/members?select=*&order=created_at.desc&limit=100`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    
    if (!membersRes.ok) {
      const err = await membersRes.json();
      return new Response(JSON.stringify({ error: 'Error fetching members', details: err }), { status: 500 });
    }

    const membersList = await membersRes.json();

    // 5. Fetch Partners/Businesses
    const partnersRes = await fetch(`${env.SUPABASE_URL}/rest/v1/partners?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    
    let partnersList = [];
    if (partnersRes.ok) {
      partnersList = await partnersRes.json();
    }

    // 6. Fetch References (Cities and Categories)
    const citiesRes = await fetch(`${env.SUPABASE_URL}/rest/v1/cities?select=id,name&order=name.asc`, { method: 'GET', headers: supabaseHeaders });
    const categoriesRes = await fetch(`${env.SUPABASE_URL}/rest/v1/categories?select=id,name&order=name.asc`, { method: 'GET', headers: supabaseHeaders });
    
    let citiesList = citiesRes.ok ? await citiesRes.json() : [];
    let categoriesList = categoriesRes.ok ? await categoriesRes.json() : [];

    // 7. Fetch Validation Logs (last 500)
    const valLogsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/validation_logs?select=*&order=created_at.desc&limit=500`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    let validationLogs = valLogsRes.ok ? await valLogsRes.json() : [];

    // 7A. Fetch Benefit Uses (last 500) with joined data
    const usesListRes = await fetch(`${env.SUPABASE_URL}/rest/v1/benefit_uses?select=id,created_at,partner_id,members(full_name,rut),benefits(title)&order=created_at.desc&limit=500`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    let benefitUses = usesListRes.ok ? await usesListRes.json() : [];

    // 7A. Fetch Totals for searches and uses
    const totalValLogsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/validation_logs?select=id`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    const totalValLogs = totalValLogsRes.ok ? await totalValLogsRes.json() : [];

    const totalUsesRes = await fetch(`${env.SUPABASE_URL}/rest/v1/benefit_uses?select=id`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    const totalUses = totalUsesRes.ok ? await totalUsesRes.json() : [];

    // 8. Return aggregated data
    return new Response(JSON.stringify({
      success: true,
      stats: {
        activeSubscribers: activeSubs,
        totalRegistered: totalMembers,
        pendingMembers: totalMembers - activeSubs,
        totalSearches: totalValLogs.length,
        totalUses: totalUses.length
      },
      members: membersList,
      partners: partnersList,
      cities: citiesList,
      categories: categoriesList,
      validationLogs: validationLogs,
      benefitUses: benefitUses
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
