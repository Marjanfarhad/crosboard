import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from './worker.mjs';

const pair = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk = {...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function request(path, authenticated = false) {
  const headers = {};
  if (authenticated) {
    const data = encode({alg:'RS256',kid:'test'})+'.'+encode({sub:'tester',iss:'https://qa.cloudflareaccess.com',aud:['app'],exp:Math.floor(Date.now()/1000)+600});
    headers['Cf-Access-Jwt-Assertion'] = data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url');
  }
  return new Request('https://staging.test'+path,{headers});
}
const worker = createWorker(async () => Response.json({keys:[jwk]}));
function fixture() {
  let assetCalls = 0;
  return {get assetCalls(){return assetCalls;}, env:{DB:{},ACCESS_ISSUER:'https://qa.cloudflareaccess.com',ACCESS_AUD:'app',ASSETS:{async fetch(){assetCalls++;return new Response('frontend',{headers:{'cache-control':'public, max-age=86400'}});}}}};
}
test('anonymous root, nested assets and APIs fail closed without fetching assets',async()=>{
  const f=fixture();
  for(const path of ['/', '/assets/app.js','/dashboard','/api/account','/api/workspace']) {
    const response=await worker.fetch(await request(path),f.env);
    assert.equal(response.status,401);
    assert.equal(response.headers.get('location'),null);
  }
  assert.equal(f.assetCalls,0);
});
test('authenticated frontend responses cannot retain public caching',async()=>{
  const f=fixture(), response=await worker.fetch(await request('/',true),f.env);
  assert.equal(response.status,200);
  assert.equal(await response.text(),'frontend');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('AI stays disabled for authenticated users and health does not claim storage verification',async()=>{
  const f=fixture();
  for(const path of ['/api/creative','/api/next-recommendation']) assert.equal((await worker.fetch(await request(path,true),f.env)).status,503);
  const health=await (await worker.fetch(await request('/api/health',true),f.env)).json();
  assert.equal(health.aiConfigured,false);
  assert.equal(health.storageVerified,false);
});
test('missing asset binding blocks access instead of exposing a partial app',async()=>{
  const f=fixture();delete f.env.ASSETS;
  assert.equal((await worker.fetch(await request('/',true),f.env)).status,503);
});

test('a rejected Access assertion cannot restart the login flow',async()=>{
  const f=fixture();
  const invalid=new Request('https://staging.test/',{headers:{'Cf-Access-Jwt-Assertion':'invalid'}});
  const response=await worker.fetch(invalid,f.env);
  assert.equal(response.status,401);
  assert.equal(response.headers.get('location'),null);
  assert.equal(f.assetCalls,0);
});
