"""Provision only the separately named staging resources; never expose tokens."""
import json
import os
from pathlib import Path
import urllib.request
import urllib.error

account = os.environ['CLOUDFLARE_ACCOUNT_ID']
token = os.environ['CLOUDFLARE_API_TOKEN']
email = os.environ.get('COMMAND_STAGING_ALLOWED_EMAIL', '').strip()
if not email or '@' not in email:
    raise SystemExit('Set repository variable COMMAND_STAGING_ALLOWED_EMAIL before provisioning.')
base = f'https://api.cloudflare.com/client/v4/accounts/{account}'

def api(path, method='GET', body=None):
    req = urllib.request.Request(base + path, method=method,
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        details = json.load(error).get('errors', [])
        summary = '; '.join(str(item.get('code')) + ': ' + str(item.get('message', ''))[:300] for item in details)
        raise SystemExit(f'Cloudflare {method} {path}: HTTP {error.code}. {summary}') from None
    if not result.get('success'):
        raise SystemExit(f'Cloudflare {method} {path} failed.')
    return result['result']

hostname = 'command-app-secure-staging.caring-philodendron.workers.dev'
# Verify Access first. Never modify an existing unrelated application's policies.
apps = api('/access/apps?per_page=1000')
matches = [app for app in apps if app.get('domain') == hostname]
if len(matches) > 1:
    raise SystemExit('Multiple matching Access applications; inspect manually.')
if matches:
    app = matches[0]
    policies = api('/access/apps/' + app['id'] + '/policies')
    # The existing staging app may also have the separately approved isolation
    # tester policy. Preserve it; reject unknown or broadened policies.
    owners = [p for p in policies if p.get('name') == 'Staging owner only']
    if (len(owners) != 1 or owners[0].get('decision') != 'allow'
            or owners[0].get('include') != [{'email': {'email': email}}]
            or owners[0].get('exclude') or owners[0].get('require')):
        raise SystemExit('Staging owner policy differs; refusing to modify Access.')
    extras = [p for p in policies if p.get('name') != 'Staging owner only']
    if (len(extras) > 1 or any(
            p.get('name') != 'Command staging isolation tester'
            or p.get('decision') != 'allow'
            or not p.get('include')
            or any(set(rule) != {'email'} for rule in p['include'])
            or p.get('exclude') or p.get('require')
            for p in extras)):
        raise SystemExit('Unexpected staging Access policy; refusing to modify Access.')
else:
    app = api('/access/apps', 'POST', {
        'name': 'Command secure staging', 'type': 'self_hosted',
        'domain': hostname, 'session_duration': '1h',
        'policies': [{'name': 'Staging owner only', 'decision': 'allow',
                      'include': [{'email': {'email': email}}]}]
    })
# Attach Access to this Worker as well as its hostname so workers.dev traffic
# is intercepted before the module's fail-closed JWT validation.
workers = api('/workers/workers?per_page=100')
staging = [worker for worker in workers if worker.get('name') == 'command-app-secure-staging']
if len(staging) != 1:
    raise SystemExit('Expected exactly one deployed staging Worker.')
expected_destinations = [
    {'type': 'public', 'uri': hostname},
    {'type': 'worker', 'worker_id': staging[0]['id']},
]
if matches:
    # A valid existing app must remain immutable during provisioning.
    # Never rewrite its policies or security configuration as a side effect.
    current = api('/access/apps/' + app['id'])
    if (current.get('type') != 'self_hosted'
            or current.get('domain') != hostname
            or current.get('session_duration') != '1h'
            or not all(d in current.get('destinations', []) for d in expected_destinations)):
        raise SystemExit('Existing staging Access configuration differs; refusing to modify it.')
    app = current
else:
    app = api('/access/apps/' + app['id'], 'PUT', {
        'name': app['name'], 'type': 'self_hosted', 'domain': hostname,
        'session_duration': '1h',
        'destinations': expected_destinations,
        'policies': app.get('policies', []),
    })
if not app.get('aud'):
    raise SystemExit('Access application audience missing; deployment stopped.')

name = 'command-secure-staging'
databases = api('/d1/database?per_page=100')
matching = [db for db in databases if db.get('name') == name]
if len(matching) > 1:
    raise SystemExit('Multiple matching staging databases; inspect manually.')
db = matching[0] if matching else api('/d1/database', 'POST', {'name': name})
db_id = db.get('uuid')
if not db_id:
    raise SystemExit('Database ID missing.')
api('/d1/database/' + db_id + '/query', 'POST', {'sql': Path('schema.sql').read_text()})
config = json.loads(Path('wrangler.example.json').read_text())
config['d1_databases'][0]['database_id'] = db_id
config['vars']['ACCESS_AUD'] = app['aud']
Path('wrangler.json').write_text(json.dumps(config, indent=2))
print('Separate staging Access policy and D1 schema configured. AI remains disabled.')
