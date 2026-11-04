// One initial real provider request. Subsequent releases reuse its recorded check.
// No user workspace, email, session cookie or API credential is logged.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAi} from './ai.mjs';
const config=JSON.parse(await readFile(new URL('./wrangler.json',import.meta.url),'utf8'));
const cloudToken=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID,key=process.env.OPENAI_API_KEY;
if(!cloudToken||!account||!key)throw new Error('Cloudflare credentials or OPENAI_API_KEY secret is missing');
const database=config.d1_databases[0];assert.equal(database.database_name,'command-secure-staging');
async function query(sql,params=[]){
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database.database_id}/query`,{method:'POST',headers:{Authorization:'Bearer '+cloudToken,'content-type':'application/json'},body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('D1 verification request failed: HTTP '+response.status);
 const body=await response.json();if(!body.success||!body.result?.[0]?.success)throw new Error('D1 verification query failed');return body.result[0];
}
const DB={prepare(sql){let params=[];return {bind(...values){params=values;return this;},async first(){return (await query(sql,params)).results[0]??null;},async run(){return query(sql,params);}};}};
const checked=await query('SELECT model FROM ai_checks WHERE model=?',['gpt-5.4-mini']);
if(checked.results.length){console.log('Initial real provider check already recorded; no paid smoke request repeated.');process.exit(0);}
const owner='command-ai-qa-'+crypto.randomUUID();
try{
 await query('INSERT INTO workspaces(owner_id,revision,document,updated_at) VALUES (?,1,?,?)',[owner,JSON.stringify({products:[{name:'Synthetic desk organizer'}],videos:[]}),Date.now()]);
 const response=await createAi()(new Request('https://app.test/api/creative',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json','x-command-account':owner},body:JSON.stringify({product:'Synthetic desk organizer'})}),{DB,AI_ENABLED:'true',OPENAI_API_KEY:key},owner);
 const body=await response.json();assert.equal(response.status,200,body.error||'Provider smoke test failed');assert.equal(body.live,true);assert.equal(typeof body.result?.summary,'string');
 await query('INSERT INTO ai_checks(model,verified_at) VALUES (?,?) ON CONFLICT(model) DO NOTHING',[body.model,Date.now()]);
 console.log('PASS: one real OpenAI structured response verified; model '+body.model+'; shared trial attempts remaining '+body.remaining+'.');
}finally{
 await query('DELETE FROM workspaces WHERE owner_id=?',[owner]);
 assert.equal((await query('SELECT owner_id FROM workspaces WHERE owner_id=?',[owner])).results.length,0);
 console.log('PASS: provider smoke fixture removed; user records unchanged.');
}
