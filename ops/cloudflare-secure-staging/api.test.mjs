import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createApi,verifyIdentity} from './api.mjs';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
async function token(sub,extra={}){
 const data=encode({alg:'RS256',kid:'test'})+'.'+encode({sub,iss:'https://qa.cloudflareaccess.com',aud:['qa-app'],exp:Math.floor(Date.now()/1000)+600,...extra});
 return data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url');
}
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const env={ACCESS_ISSUER:'https://qa.cloudflareaccess.com',ACCESS_AUD:'qa-app',DB:{prepare(query){let args=[];return {bind(...v){args=v;return this;},async first(){return sql.prepare(query).get(...args)??null;},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}};}};}}};
 const api=createApi(async()=>Response.json({keys:[jwk]}));
 async function call(jwt,method='GET',body,origin='https://app.test'){
  return api(new Request('https://app.test/api/workspace',{method,headers:{...(jwt?{'Cf-Access-Jwt-Assertion':jwt}:{}),'content-type':'application/json','x-command-account':jwt&&jwt.split('.').length===3?JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')).sub:'',origin},...(body?{body:JSON.stringify(body)}:{})}),env);
 }
 return {call,env,sql,api};
}
test('Access session cookies require the same signature, issuer and audience verification',async()=>{
 const f=fixture();
 const keys=async()=>Response.json({keys:[jwk]});
 const cookieRequest=value=>new Request('https://app.test/',{headers:{cookie:'CF_Authorization='+value}});
 assert.equal(await verifyIdentity(cookieRequest(await token('a')),f.env,keys),'a');
 for(const value of ['forged',await token('a',{aud:['wrong']}),await token('a',{exp:1})]){
  await assert.rejects(verifyIdentity(cookieRequest(value),f.env,keys));
 }
 const valid=await token('a');
 await assert.rejects(verifyIdentity(cookieRequest(valid.slice(0,-10)+'AAAAAAAAAA'),f.env,keys));
 f.sql.close();
});
test('real signed tokens scope storage and preserve independent accounts',async()=>{
 const f=fixture(),a=await token('a'),b=await token('b');
 assert.equal((await f.call(a,'PUT',{revision:0,data:{owner_id:'b',videos:[1]}})).status,200);
 assert.equal((await (await f.call(b)).json()).data,null);
 assert.equal((await f.call(b,'PUT',{revision:0,data:{videos:[2]}})).status,200);
 assert.deepEqual((await (await f.call(a)).json()).data.videos,[1]);
 assert.equal((await f.call(a,'PUT',{revision:1,data:{videos:[3]}})).status,200);
 assert.equal((await f.call(a,'PUT',{revision:1,data:{videos:[4]}})).status,409);
 assert.deepEqual((await (await f.call(b)).json()).data.videos,[2]);f.sql.close();
});
test('missing, expired, wrong-audience and forged identities are rejected',async()=>{
 const f=fixture();for(const t of [null,'forged',await token('a',{exp:1}),await token('a',{aud:['other']})])assert.equal((await f.call(t)).status,401);
 const t=await token('a');assert.equal((await f.call(t.slice(0,-10)+'AAAAAAAAAA')).status,401);f.sql.close();
});
test('cross-origin writes and oversized documents rejected',async()=>{
 const f=fixture(),t=await token('a');assert.equal((await f.call(t,'PUT',{revision:0,data:{}},'https://evil.test')).status,403);
 assert.equal((await f.call(t,'PUT',{revision:0,data:{x:'a'.repeat(270000)}})).status,413);f.sql.close();
});
test('missing bindings and database failures fail closed',async()=>{
 const f=fixture(),t=await token('a');assert.equal((await f.api(new Request('https://app.test/api/workspace'),{})).status,503);
 f.sql.exec('DROP TABLE workspaces');assert.equal((await f.call(t)).status,503);f.sql.close();
});

test('an account switch cannot save a previous account document',async()=>{
 const f=fixture();
 const response=await f.api(new Request('https://app.test/api/workspace',{
  method:'PUT',headers:{'Cf-Access-Jwt-Assertion':await token('b'),'content-type':'application/json',origin:'https://app.test','x-command-account':'a'},
  body:JSON.stringify({revision:0,data:{videos:['private-a']}})
 }),f.env);
 assert.equal(response.status,409);
 assert.equal((await (await f.call(await token('b'))).json()).data,null);
 f.sql.close();
});

