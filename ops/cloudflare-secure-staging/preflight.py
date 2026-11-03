"""Read-only Cloudflare checks. Never print credentials or response bodies."""
import json
import os
import urllib.error
import urllib.request

token = os.environ.get('CLOUDFLARE_API_TOKEN')
account = os.environ.get('CLOUDFLARE_ACCOUNT_ID')
if not token or not account:
    raise SystemExit('Cloudflare token or account ID is missing.')

for label, path in [
    ('Token verification', '/user/tokens/verify'),
    ('Account access', f'/accounts/{account}'),
    ('D1 listing', f'/accounts/{account}/d1/database'),
    ('Access application listing', f'/accounts/{account}/access/apps'),
    ('Worker listing', f'/accounts/{account}/workers/scripts'),
]:
    request = urllib.request.Request('https://api.cloudflare.com/client/v4' + path,
                                     headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
        if not payload.get('success'):
            raise SystemExit(label + ' failed. Check token scope and account selection.')
        print(label + ': passed')
    except urllib.error.HTTPError as error:
        raise SystemExit(f'{label}: HTTP {error.code}. Check token permissions and account selection.') from None

print('Read-only preflight passed. No resources created or deployed.')
