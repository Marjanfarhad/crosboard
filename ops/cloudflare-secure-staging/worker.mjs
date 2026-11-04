import {createAi} from './ai.mjs';
import {createApi, verifyIdentity} from './api.mjs';

const json = (body, status) => Response.json(body, {status, headers: {'cache-control': 'no-store'}});

export function createWorker(fetchKeys = fetch, providerFetch = fetch) {
  const api = createApi(fetchKeys);
  const ai = createAi(providerFetch);
  return {async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (!env.DB || !env.ACCESS_ISSUER || !env.ACCESS_AUD || typeof env.ASSETS?.fetch !== 'function') {
      return json({error: 'Service not configured', aiConfigured: false}, 503);
    }
    // Authenticate assets too, including direct workers.dev and preview requests.
    let owner;
    try { owner = await verifyIdentity(request, env, fetchKeys); }
    catch {
      if (!path.startsWith('/api/') && path !== '/api' && ['GET', 'HEAD'].includes(request.method) &&
          /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER)) {
        const login = new URL('/cdn-cgi/access/login/command-app-secure-staging.caring-philodendron.workers.dev', env.ACCESS_ISSUER);
        login.searchParams.set('kid', env.ACCESS_AUD);
        login.searchParams.set('redirect_url', '/');
        return new Response(null, {status: 302, headers: {location: login.href, 'cache-control': 'no-store'}});
      }
      return json({error: 'Authentication required'}, 401);
    }
    if (path === '/api/health') return json({ok: true, aiConfigured: env.AI_ENABLED === 'true' && !!env.OPENAI_API_KEY, storageVerified: false}, 200);
    if (['/api/creative','/api/next-recommendation','/api/ai/status'].includes(path)) return ai(request, env, owner);
    if (path === '/api' || path.startsWith('/api/')) return api(request, env);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('cache-control', 'private, no-store');
    headers.set('x-content-type-options', 'nosniff');
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  }};
}

export default createWorker();

