// Runs the API handler against live staging D1. JWT signing/certificate lookup
// are test fixtures, not verification of deployed Cloudflare Access or browser UI.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createApi} from './api.mjs';
const config=JSON.parse(await readFile(new URL('./wrangler.json',import.meta.url),'utf8'));
const token=process.env.CLOUDFLARE_API_TOKEN, account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!account)throw new Error('Cloudflare credentials unavailable');
const database=config.d1_databases[0];
assert.equal(database.database_name,'command-secure-staging');
async function query(sql,params=[]){
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database.database_id}/query`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`D1 request failed: HTTP ${response.status}`);
 const body=await response.json();
 if(!body.success||!body.result?.[0]?.success)throw new Error('D1 query failed');
 return body.result[0];
}
const DB={prepare(sql){let values=[];return {bind(...params){values=params;return this;},async first(){return (await query(sql,values)).results[0]??null;},async run(){return query(sql,values);}};}};
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'isolated-live-storage-test'};
const env={DB,ACCESS_ISSUER:'https://qa.cloudflareaccess.com',ACCESS_AUD:'live-storage-fixture'};
const api=()=>createApi(async()=>Response.json({keys:[jwk]}));
const prefix='command-qa-'+crypto.randomUUID(), owners=[prefix+'-a',prefix+'-b'];
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
async function call(owner,method='GET',data,revision=0,handler=api()){
 const signed=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({sub:owner,iss:env.ACCESS_ISSUER,aud:[env.ACCESS_AUD],exp:Math.floor(Date.now()/1000)+300});
 const jwt=signed+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(signed))).toString('base64url');
 return handler(new Request('https://staging.test/api/workspace',{method,headers:{'Cf-Access-Jwt-Assertion':jwt,origin:'https://staging.test','content-type':'application/json','x-command-account':owner},...(method==='PUT'?{body:JSON.stringify({revision,data})}:{})}),env);
}
try{
 for(const owner of owners)assert.deepEqual(await (await call(owner)).json(),{revision:0,data:null});
 const dataA={products:[{id:'qa-product',name:'Synthetic QA product'}],videos:[{id:'qa-video',views:2000,commission:20}]};
 const dataB={products:[],videos:[{id:'other-qa-video',views:10,commission:0}]};
 assert.equal((await call(owners[0],'PUT',dataA)).status,200);
 assert.equal((await (await call(owners[1])).json()).data,null);
 assert.equal((await call(owners[1],'PUT',dataB)).status,200);
 // New handler instance uses fresh token and a remote read, without in-memory data.
 assert.deepEqual((await (await call(owners[0],'GET',undefined,0,api())).json()).data,dataA);
 assert.deepEqual((await (await call(owners[1])).json()).data,dataB);
 assert.equal((await call(owners[0],'PUT',dataA,0)).status,409);
 assert.equal((await call(owners[0],'PUT',{...dataA,notes:['updated']},1)).status,200);
 assert.deepEqual((await (await call(owners[1])).json()).data,dataB);
 console.log('PASS: live D1 persistence, fresh-handler reload, two synthetic account isolation, revision conflict, and update.');
 console.log('LIMIT: Access identity provider and browser UI are not exercised; certificates are test fixtures.');
}finally{
 await query('DELETE FROM workspaces WHERE owner_id IN (?, ?)',owners);
 const rows=await query('SELECT owner_id FROM workspaces WHERE owner_id IN (?, ?)',owners);
 assert.equal(rows.results.length,0);
 console.log('PASS: only this run’s synthetic records removed and cleanup verified.');
}
