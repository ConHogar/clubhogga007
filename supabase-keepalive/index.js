export default {
  async scheduled(event, env, ctx) {
    const url = "https://cjewdiicnmbpdtenwqkk.supabase.co/rest/v1/keepalive?select=id&limit=1";

    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error("Supabase keepalive failed", res.status, await res.text());
    } else {
      console.log("Supabase keepalive successful", res.status);
    }
  },
  
  // Added this so you can manually test it via browser!
  async fetch(request, env, ctx) {
    await this.scheduled(null, env, ctx);
    return new Response("Keepalive manually triggered! Check Supabase logs.", { status: 200 });
  }
};
