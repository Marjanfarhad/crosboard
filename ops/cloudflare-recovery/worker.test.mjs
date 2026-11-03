import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const req = (path, method='GET', body) => new Request('https://example.test'+path,{method,...(body ? {body:JSON.stringify(body),headers:{'content-type':'application/json'}}:{})});
test('missing assets return explicit 503 instead of exception',async()=>{
 for(const env of [undefined,{}, {ASSETS:{}}]){
  const r=await worker.fetch(req('/'),env);
  assert.equal(r.status,503); assert.equal((await r.json()).code,'ASSETS_NOT_CONFIGURED');
 }
});
test('health reports mock mode and missing configuration honestly',async()=>{
 const r=await worker.fetch(req('/api/health'),{}); assert.equal(r.status,503);
 assert.deepEqual(await r.json(),{ok:false,aiConfigured:false,model:'mock',mock:true,assetsConfigured:false,authenticationConfigured:false,persistenceConfigured:false});
});
test('configured asset binding receives original request',async()=>{
 const request=req('/index.html'); let received;
 const r=await worker.fetch(request,{ASSETS:{fetch:async input=>{received=input;return new Response('asset');}}});
 assert.equal(received,request); assert.equal(await r.text(),'asset');
});
test('existing mock APIs and validation preserved',async()=>{
 assert.equal((await worker.fetch(req('/api/creative'),{})).status,405);
 assert.equal((await worker.fetch(req('/api/creative','POST',{}),{})).status,400);
 const r=await worker.fetch(req('/api/creative','POST',{product:'Synthetic product'}),{});
 assert.equal(r.status,200); assert.equal((await r.json()).model,'mock');
 assert.equal((await worker.fetch(req('/api/next-recommendation','POST',{videos:[]}),{})).status,400);
 assert.equal((await worker.fetch(req('/api/missing'),{})).status,404);
});
