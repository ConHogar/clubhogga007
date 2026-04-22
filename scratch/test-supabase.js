const { readFileSync } = require('fs');

const envFile = readFileSync('/Users/NickA/10. Club Hogga/club-hogga-site/.env', 'utf-8');
const env = {};
envFile.split('\n').filter(l => l.trim() && !l.startsWith('#')).forEach(l => {
  const [k, ...v] = l.split('=');
  if (v.length > 0) env[k] = v.join('=').replace(/"/g, '').trim();
});

const url = env.SUPABASE_URL;
const key = env.SUPABASE_ANON_KEY;

async function test() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const res = await fetch(`${url}/rest/v1/partners?select=*,benefits(*)&active=eq.true`, { headers });
    const data = await res.json();
    console.log("Total ACTIVE partners fetched:", data.length || 0);
    if(data.length > 0) {
      console.log("First partner benefits:", data[0].benefits);
    } else {
        console.log("Data returned:", data);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
