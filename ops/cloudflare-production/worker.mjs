import { createWorker } from '../cloudflare-secure-staging/worker.mjs';

const issuerKeys = 'https://frosty-frog-d5d8.cloudflareaccess.com/cdn-cgi/access/certs';
const appKeys = 'https://command-app-production.caring-philodendron.workers.dev/cdn-cgi/access/certs';

export async function fetchProductionKeys(url, options, request = fetch) {
  if (url !== issuerKeys) throw new Error('Unexpected Access issuer');
  for (const endpoint of [issuerKeys, appKeys]) {
    try {
      const response = await request(endpoint, {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout?.(4000),
      });
      if (!response.ok) continue;
      const { keys } = await response.json();
      if (Array.isArray(keys) && keys.some(key => key?.kty === 'RSA' && key.n && key.e)) {
        return Response.json({ keys });
      }
    } catch {
      // The verifier fails closed when both trusted Access endpoints are unavailable.
    }
  }
  throw new Error('Access signing keys unavailable');
}

export default {
  fetch(request, env) {
    const readKeys = async (url, options) => {
      if (url !== issuerKeys) throw new Error('Unexpected Access issuer');
      let snapshot;
      try {
        snapshot = await env.DB.prepare(
          'SELECT keys_json FROM access_public_keys WHERE issuer = ? AND refreshed_at BETWEEN ? AND ?'
        ).bind(issuerKeys, Date.now() - 3600000, Date.now()).first();
        if (snapshot) return Response.json({ keys: JSON.parse(snapshot.keys_json) });
      } catch {
        // The issuer endpoints also work when the database is unavailable.
      }
      return fetchProductionKeys(url, options);
    };
    return createWorker(readKeys).fetch(request, env);
  },
};
