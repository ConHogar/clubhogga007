import urllib.request
import json
import re

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
key = env.get("SUPABASE_ANON_KEY")

req = urllib.request.Request(f"{url}/rest/v1/partners?select=*,benefits(*)")
req.add_header('apikey', key)
req.add_header('Authorization', f'Bearer {key}')

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print("Total partners fetched:", len(data))
        if len(data) > 0:
            print("First partner:", json.dumps(data[0], indent=2))
except Exception as e:
    print(e)
