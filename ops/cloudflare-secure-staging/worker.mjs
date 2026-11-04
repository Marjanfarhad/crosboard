import {createAi} from './ai.mjs';
import {createApi, verifyIdentity, hasAccessCredential} from './api.mjs';

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
    catch (error) {
      const code=error.code??'AUTH_INVALID';
      const status=error.status??401;
      const url=new URL(request.url);
      const login=new URL('/cdn-cgi/access/login/command-app-secure-staging.caring-philodendron.workers.dev', /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER)?env.ACCESS_ISSUER:'https://frosty-frog-d5d8.cloudflareaccess.com');
      login.searchParams.set('kid',env.ACCESS_AUD);
      login.searchParams.set('redirect_url','/?command_login=1');
      const frontend=!path.startsWith('/api/')&&path!=='/api'&&['GET','HEAD'].includes(request.method);
      // One automatic sign-in attempt only. An existing but unverifiable session
      // must not bounce between the Worker and Access forever.
      if(frontend&&code==='AUTH_MISSING'&&!hasAccessCredential(request)&&!url.searchParams.has('command_login')) {
        return new Response(null,{status:302,headers:{location:login.href,'cache-control':'no-store'}});
      }
      if(frontend){
        const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        const message=status===503?'The sign-in verification service is temporarily unavailable.':'We could not finish verifying your sign-in session.';
        const logout=new URL('/cdn-cgi/access/logout',login.origin);
        return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Command sign-in help</title></head><body><main><h1>Command sign-in needs attention</h1><p>'+message+'</p><p>Your saved data has not been changed.</p><p>Support code: <strong>'+escape(code)+'</strong></p><p><a href="'+escape(login.href)+'">Try sign-in again</a></p><p><a href="'+escape(logout.href)+'">Sign out of Cloudflare</a> before trying a different account.</p></main></body></html>',{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
      }
      return json({error:status===503?'Sign-in verification is temporarily unavailable':'Authentication required',code},status);
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


