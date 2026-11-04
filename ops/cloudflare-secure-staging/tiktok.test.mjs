import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import {handleTikTok} from './tiktok.mjs';

test('TikTok callback is account-bound, single-use and keeps tokens server-side', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE tiktok_oauth_states (owner_id TEXT PRIMARY KEY,state TEXT NOT NULL,expires_at INTEGER NOT NULL)');
    const env = {
      TIKTOK_OAUTH_ENABLED:'true',
      TIKTOK_CLIENT_KEY:'fixture',
      TIKTOK_CLIENT_SECRET:'fixture',
      DB:{prepare(sql) {
        return {bind(...args) {
          return {run:() => db.prepare(sql).run(...args), first:() => db.prepare(sql).get(...args)};
        }};
      }},
    };
    const origin = 'https://command-app-secure-staging.caring-philodendron.workers.dev';
    const calls = [];
    const provider = async (url, options) => {
      calls.push(new URL(url).pathname);
      if (calls.length === 1) {
        assert.equal(options.body.get('redirect_uri'), origin + '/api/tiktok/callback');
        return Response.json({access_token:'fixture-token',open_id:'fixture-id'});
      }
      assert.equal(options.headers.authorization, 'Bearer fixture-token');
      return Response.json({error:{code:'ok'},data:{user:{open_id:'fixture-id'}}});
    };
    const run = (path, owner, bindings = env) =>
      handleTikTok(new Request(origin + path), bindings, owner, provider);

    assert.equal((await run('/api/tiktok/connect', 'owner', {})).status, 503);
    const start = await run('/api/tiktok/connect', 'owner');
    assert.equal(start.status, 302);
    const authorize = new URL(start.headers.get('location'));
    assert.equal(authorize.searchParams.get('scope'), 'user.info.basic');
    const callback = '/api/tiktok/callback?code=fixture&state=' + authorize.searchParams.get('state');
    assert.equal((await run(callback, 'other')).status, 400);
    assert.deepEqual(calls, []);

    const response = await run(callback, 'owner');
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), /fixture-token|fixture-id/);
    assert.equal((await run(callback, 'owner')).status, 400);
    assert.deepEqual(calls, ['/v2/oauth/token/', '/v2/user/info/']);
  } finally {
    db.close();
  }
});
