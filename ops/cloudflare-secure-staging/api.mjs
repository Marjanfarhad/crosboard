// Staging foundation. Identity comes only from a verified Cloudflare Access JWT.
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const decode = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const parse = value => JSON.parse(new TextDecoder().decode(decode(value)));
export class AccessIdentityError extends Error {
  constructor(code,status=401){super(code);this.code=code;this.status=status;}
}
export function hasAccessCredential(request){
  return !!request.headers.get('Cf-Access-Jwt-Assertion') || /(?:^|;)\s*CF_Authorization=/.test(request.headers.get('cookie')??'');
}
function credentials(request){
  const assertion=request.headers.get('Cf-Access-Jwt-Assertion');
  if(assertion)return [assertion];
  return (request.headers.get('cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith('CF_Authorization=')).slice(0,5).map(value=>{
    let token=value.slice('CF_Authorization='.length);
    if(token.startsWith('"')&&token.endsWith('"'))token=token.slice(1,-1);
    try{return decodeURIComponent(token);}catch{return '';}
  });
}
export async function verifyIdentity(request,env,fetchKeys=fetch) {
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER??'') || !env.ACCESS_AUD)throw new AccessIdentityError('AUTH_CONFIG',503);
  const tokens=credentials(request);if(!tokens.length)throw new AccessIdentityError('AUTH_MISSING');
  const verified=new Set();let failure=new AccessIdentityError('AUTH_INVALID');
  let signingKeys;
  for(const token of tokens){try{
    if(!token||token.length>16384)throw new AccessIdentityError('AUTH_INVALID');
    const parts=token.split('.');if(parts.length!==3)throw new AccessIdentityError('AUTH_INVALID');
    let header,claims;try{header=parse(parts[0]);claims=parse(parts[1]);}catch{throw new AccessIdentityError('AUTH_INVALID');}
    if(!header||!claims||header.alg!=='RS256'||typeof header.kid!=='string'||header.crit!==undefined)throw new AccessIdentityError('AUTH_INVALID');
    if(claims.iss!==env.ACCESS_ISSUER)throw new AccessIdentityError('AUTH_ISSUER');
    if(!(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(env.ACCESS_AUD))throw new AccessIdentityError('AUTH_AUDIENCE');
    const now=Math.floor(Date.now()/1000);
    if(typeof claims.exp!=='number'||claims.exp<=now)throw new AccessIdentityError('AUTH_EXPIRED');
    if(claims.nbf!==undefined&&(typeof claims.nbf!=='number'||claims.nbf>now))throw new AccessIdentityError('AUTH_NOT_YET_VALID');
    if(typeof claims.sub!=='string'||!claims.sub||claims.sub.length>256)throw new AccessIdentityError('AUTH_INVALID');
    if(!signingKeys){
      try{
        const response=await fetchKeys(env.ACCESS_ISSUER+'/cdn-cgi/access/certs',{redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw new Error('keys');
        signingKeys=(await response.json()).keys;
        if(!Array.isArray(signingKeys))throw new Error('keys');
      }catch{throw new AccessIdentityError('AUTH_KEYS_UNAVAILABLE',503);}
    }
    const jwk=signingKeys.find(key=>key.kid===header.kid&&key.kty==='RSA');
    if(!jwk)throw new AccessIdentityError('AUTH_SIGNING_KEY');
    try{
      const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
      if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw new Error('signature');
    }catch{throw new AccessIdentityError('AUTH_SIGNATURE');}
    verified.add(claims.sub);
  }catch(error){failure=error instanceof AccessIdentityError?error:new AccessIdentityError('AUTH_INVALID');}}
  if(verified.size>1)throw new AccessIdentityError('AUTH_AMBIGUOUS');
  if(verified.size===1)return [...verified][0];
  throw failure;
}
export function createApi(fetchKeys=fetch) {
 return async (request,env) => {
  if(!env.DB || !env.ACCESS_ISSUER || !env.ACCESS_AUD) return json({error:'Service not configured'},503);
  let owner;
  try{owner=await verifyIdentity(request,env,fetchKeys);}catch(error){return json({error:error.status===503?'Sign-in verification is temporarily unavailable':'Authentication required',code:error.code??'AUTH_INVALID'},error.status??401);}
  const path=new URL(request.url).pathname;
  if(path==='/api/account'&&request.method==='GET')return json({userId:owner});
  if(path!=='/api/workspace')return json({error:'Not found'},404);
  try {
   if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT revision, document FROM workspaces WHERE owner_id=?').bind(owner).first();
    return json(row?{revision:row.revision,data:JSON.parse(row.document)}:{revision:0,data:null});
   }
   if(request.method!=='PUT')return json({error:'Method not allowed'},405);
   if(request.headers.get('x-command-account')!==owner)return json({error:'Account changed; reload before saving'},409);
   if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Origin rejected'},403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
   const reader=request.body?.getReader();let chunks=[],length=0;
   if(!reader)return json({error:'Body required'},400);
   while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>262144){await reader.cancel();return json({error:'Body too large'},413);}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'Invalid JSON'},400);}
   if(!body || !Number.isSafeInteger(body.revision)||body.revision<0||!body.data||typeof body.data!=='object'||Array.isArray(body.data))return json({error:'Invalid workspace'},400);
   // No client-controlled owner is used in any storage query.
   const result=body.revision===0
    ? await env.DB.prepare('INSERT INTO workspaces(owner_id,revision,document,updated_at) VALUES (?,1,?,?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,JSON.stringify(body.data),Date.now()).run()
    : await env.DB.prepare('UPDATE workspaces SET revision=revision+1,document=?,updated_at=? WHERE owner_id=? AND revision=?').bind(JSON.stringify(body.data),Date.now(),owner,body.revision).run();
   if(result.meta.changes!==1)return json({error:'Workspace changed; reload before saving'},409);
   return json({revision:body.revision+1});
  }catch{return json({error:'Storage unavailable'},503);}
 };
}
export default {fetch:createApi()};


