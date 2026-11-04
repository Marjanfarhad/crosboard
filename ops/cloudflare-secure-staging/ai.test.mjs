import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createAi} from './ai.mjs';
const advice={summary:'One variation.',evidence:'Two logs; no causal conclusion.',hook:'Watch this.',experiment:'Change a hook.',caution:'No guaranteed sales.',confidence:'low'};
function fixture(provider){
 const sql=new DatabaseSync(':memory:');const schema=readFileSync(new URL('./schema.sql',import.meta.url),'utf8');sql.exec(schema);
 const env={AI_ENABLED:'true',OPENAI_API_KEY:'fake-test-key',DB:{prepare(query){let args=[];return {bind(...values){args=values;return this;},async first(){return sql.prepare(query).get(...args)??null;},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}};}};}}};
 sql.prepare('INSERT INTO workspaces VALUES (?,1,?,0)').run('a',JSON.stringify({products:[{name:'Desk'}],videos:[{title:'Private A one',views:2000,commission:20},{title:'Private A two',views:1000,commission:2}]}));
 let calls=0,received;
 const api=createAi(async(url,init)=>{calls++;received=JSON.parse(init.body);assert.equal(url,'https://api.openai.com/v1/responses');return provider?provider():Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(advice)}]}]});});
 const request=(owner='a',body={},origin='https://app.test',path='/api/next-recommendation')=>api(new Request('https://app.test'+path,{method:'POST',headers:{origin,'content-type':'application/json','x-command-account':owner},body:JSON.stringify(body)}),env,owner);
 return {sql,env,request,api,schema,get calls(){return calls;},get received(){return received;}};
}
test('verified owner data only, bounded generation and no client-metric injection',async()=>{
 const f=fixture();const response=await f.request('a',{videos:[{title:'injected client metrics',views:9999999}]});assert.equal(response.status,200);
 assert.equal(f.received.model,'gpt-5.4-mini');assert.equal(f.received.store,false);assert.equal(f.received.max_output_tokens,600);assert.deepEqual(f.received.reasoning,{effort:'none'});
 assert.match(f.received.input,/Private A one/);assert.doesNotMatch(f.received.input,/injected client metrics/);assert.equal((await response.json()).remaining,9);
 assert.equal((await f.request('b')).status,400);assert.equal(f.calls,1);f.sql.close();
});
test('origin and account switch cannot consume budget',async()=>{
 const f=fixture();assert.equal((await f.request('a',{},'https://evil.test')).status,403);
 const request=new Request('https://app.test/api/creative',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json','x-command-account':'b'},body:'{"product":"Desk"}'});
 assert.equal((await f.api(request,f.env,'a')).status,409);assert.equal(f.calls,0);f.sql.close();
});
test('atomic ten-attempt limit survives schema reapplication',async()=>{
 const f=fixture();const responses=await Promise.all(Array.from({length:12},()=>f.request()));
 assert.equal(responses.filter(r=>r.status===200).length,10);assert.equal(responses.filter(r=>r.status===429).length,2);assert.equal(f.calls,10);
 f.sql.exec(f.schema);assert.equal((await f.request()).status,429);assert.equal(f.calls,10);f.sql.close();
});
test('disabled AI, missing product and oversized input never call OpenAI',async()=>{
 const f=fixture();f.env.AI_ENABLED='false';assert.equal((await f.request()).status,503);f.env.AI_ENABLED='true';
 assert.equal((await f.request('a',{product:'Not saved'},'https://app.test','/api/creative')).status,400);
 assert.equal((await f.request('a',{text:'x'.repeat(5000)})).status,413);assert.equal(f.calls,0);f.sql.close();
});
test('provider failures do not retry, return fallback or expose raw errors',async()=>{
 const f=fixture(()=>Response.json({error:{message:'private provider detail'}},{status:429}));const response=await f.request();assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private provider detail/);assert.equal(f.calls,1);assert.equal(f.sql.prepare('SELECT used FROM ai_limits').get().used,1);f.sql.close();
});
test('incomplete and malformed output are rejected',async()=>{
 for(const payload of [{status:'incomplete',output:[]},{status:'completed',output:[{content:[{type:'output_text',text:'not JSON'}]}]}]){const f=fixture(()=>Response.json(payload));assert.equal((await f.request()).status,502);assert.equal(f.calls,1);f.sql.close();}
});

test('saved product creative generation returns live result, while missing usage controls fail closed',async()=>{
 const f=fixture();assert.equal((await f.request('a',{product:'Desk'},'https://app.test','/api/creative')).status,200);
 f.sql.exec('DROP TABLE ai_limits');assert.equal((await f.request()).status,503);assert.equal(f.calls,1);f.sql.close();
});
