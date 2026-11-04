import {useEffect,useRef,useState} from 'react';
import type {Workspace} from '../lib/cloudWorkspace';
type Advice={summary:string;evidence:string;hook:string;experiment:string;caution:string;confidence:'low'|'medium'};
type Status={enabled:boolean;model:string;remaining:number;limit:number};
export function CloudAiPanel({mode,data,userId,disabled}:{mode:'creative'|'next';data:Workspace;userId:string;disabled:boolean}){
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<Advice|null>(null),[product,setProduct]=useState('');
 const inFlight=useRef(false);
 useEffect(()=>{let cancelled=false;setResult(null);setStatus(null);setError('');
  void fetch('/api/ai/status',{credentials:'same-origin',cache:'no-store',redirect:'error'}).then(async response=>{const value=await response.json();if(!response.ok)throw new Error(value.error||'Live AI unavailable');if(!cancelled)setStatus(value);}).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:'Live AI unavailable');});
  return ()=>{cancelled=true;};
 },[userId]);
 async function generate(){
  if(inFlight.current||!status||status.remaining<=0)return;
  inFlight.current=true;setBusy(true);setError('');setResult(null);
  try{
   const response=await fetch(mode==='creative'?'/api/creative':'/api/next-recommendation',{method:'POST',credentials:'same-origin',redirect:'error',headers:{'content-type':'application/json','x-command-account':userId},body:JSON.stringify(mode==='creative'?{product}:{})});
   const value=await response.json();if(!response.ok)throw new Error(value.error||'AI request failed');
   if(value.live!==true||!value.result)throw new Error('A live result was not confirmed');
   setResult(value.result);setStatus(previous=>previous?{...previous,remaining:value.remaining}:previous);
  }catch(cause){setError(cause instanceof Error?cause.message:'AI request failed. No automatic retry was made.');
   try{const response=await fetch('/api/ai/status',{credentials:'same-origin',cache:'no-store',redirect:'error'});if(response.ok)setStatus(await response.json());}catch{/* Preserve the original generation failure. */}
  }finally{inFlight.current=false;setBusy(false);}
 }
 const missing=mode==='creative'?!product:data.videos.length<2;
 return <section className="panel review-panel"><h2>{mode==='creative'?'AI creative draft':'AI next-video experiment'}</h2>
  <p>Uses saved records from your account. Suggestions are drafts for review, not promises of sales. Selected account metrics are sent to OpenAI when you press Generate.</p>
  {status&&<p role="status">Model: {status.model} · {status.remaining} of {status.limit} shared trial attempts remaining.</p>}
  {mode==='creative'&&<><label htmlFor="ai-product">Saved product for AI draft</label><select id="ai-product" value={product} disabled={busy||disabled} onChange={event=>setProduct(event.target.value)}><option value="">Choose a saved product</option>{data.products.map(item=><option key={item.id} value={item.name}>{item.name}</option>)}</select></>}
  {mode==='next'&&data.videos.length<2&&<p>Log at least two videos to generate a recommendation.</p>}
  <button className="primary-button" disabled={disabled||busy||!status?.enabled||status.remaining<=0||missing} onClick={()=>void generate()}>{busy?'Generating…':mode==='creative'?'Generate AI draft':'Generate AI recommendation'}</button>
  {error&&<p role="alert">{error}</p>}
  {result&&<article aria-label="Live AI result"><p><strong>Live OpenAI result · {result.confidence} confidence</strong></p><h3>Suggestion</h3><p>{result.summary}</p><h3>Evidence</h3><p>{result.evidence}</p><h3>Hook</h3><p>{result.hook}</p><h3>Experiment</h3><p>{result.experiment}</p><h3>Limitations</h3><p>{result.caution}</p><p>This result is not automatically saved or published. Review it before copying it into your notes.</p></article>}
 </section>;
}
