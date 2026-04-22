import urllib.request
import json

env_file = "/Users/NickA/10. Club Hogga/club-hogga-site/.env"
env = {}
with open(env_file) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            key, val = line.split('=', 1)
            env[key] = val.replace('"', '').strip()

url = env.get("SUPABASE_URL")
key = env.get("SUPABASE_SERVICE_ROLE_KEY")

payload = { "description": "This is a test description update" }
req = urllib.request.Request(f"{url}/rest/v1/partners?id=eq.4779e9b6-9bec-4734-a34e-f5987c1a9c5b", method='PATCH')
req.add_header('apikey', key)
req.add_header('Authorization', f'Bearer {key}')
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req, data=json.dumps(payload).encode()) as res:
        print(res.read().decode())
except Exception as e:
    print(e)
