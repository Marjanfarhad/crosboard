const origin = 'https://command-app-secure-staging.caring-philodendron.workers.dev';
const callback = origin + '/api/tiktok/callback';
const headers = {'cache-control':'no-store','referrer-policy':'no-referrer'};
const reply = (message, status) => new Response(message, {status, headers});

export async function handleTikTok(request, env, owner, providerFetch = globalThis.fetch.bind(globalThis)) {
  const url = new URL(request.url);
  if (url.origin !== origin || env.TIKTOK_OAUTH_ENABLED !== 'true' ||
      !env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) return reply('TikTok OAuth is not configured.', 503);
  if (request.method !== 'GET') return reply('Method not allowed.', 405);

  try {
    if (url.pathname === '/api/tiktok/connect') {
      const state = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO tiktok_oauth_states (owner_id, state, expires_at) VALUES (?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET state=excluded.state, expires_at=excluded.expires_at'
      ).bind(owner, state, Date.now() + 300_000).run();
      const authorize = new URL('https://www.tiktok.com/v2/auth/authorize/');
      authorize.search = new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_KEY, redirect_uri: callback,
        response_type: 'code', scope: 'user.info.basic', state,
      }).toString();
      return new Response(null, {status:302, headers:{...headers, location:authorize.href}});
    }

    const state = url.searchParams.get('state');
    if (!state || !/^[a-f0-9-]{36}$/.test(state)) return reply('Invalid TikTok authorization state.', 400);
    const attempt = await env.DB.prepare(
      'DELETE FROM tiktok_oauth_states WHERE owner_id=? AND state=? AND expires_at>? RETURNING owner_id'
    ).bind(owner, state, Date.now()).first();
    if (!attempt) return reply('TikTok authorization expired or already used.', 400);
    if (url.searchParams.has('error')) return reply('TikTok authorization was declined.', 400);
    const code = url.searchParams.get('code');
    if (!code || code.length > 4096) return reply('TikTok authorization code is missing or invalid.', 400);

    const token = await providerFetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(10000),
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY, client_secret:env.TIKTOK_CLIENT_SECRET,
        code, grant_type:'authorization_code', redirect_uri:callback}),
    });
    if (!token.ok) return reply('TikTok token exchange failed.', 502);
    const credentials = await token.json();
    if (typeof credentials.access_token !== 'string' || !credentials.access_token ||
        typeof credentials.open_id !== 'string' || !credentials.open_id) return reply('TikTok returned an invalid token response.', 502);
    const profile = await providerFetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id', {
      redirect:'error', signal:AbortSignal.timeout(10000),
      headers:{authorization:'Bearer ' + credentials.access_token},
    });
    if (!profile.ok) return reply('TikTok profile verification failed.', 502);
    const result = await profile.json();
    if (result.error?.code !== 'ok' || result.data?.user?.open_id !== credentials.open_id) {
      return reply('TikTok profile verification failed.', 502);
    }
    return reply('TikTok OAuth test passed. Profile identity verified. Return to Command Staging to continue.', 200);
  } catch {
    return reply('TikTok OAuth test could not complete.', 503);
  }
}
