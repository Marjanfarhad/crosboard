import {useState,type FormEvent} from 'react';
import {videoTotals,type Workspace,type CloudVideo} from '../lib/cloudWorkspace';
export function CloudVideoStudio({data,saving,onSave}:{data:Workspace;saving:boolean;onSave:(update:(doc:Workspace)=>Workspace)=>Promise<void>}){
 const [error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget,fields=new FormData(form);
  const title=String(fields.get('title')??'').trim();
  if(!title){setError('Video title is required.');return;}
  const value=(name:string)=>Number(fields.get(name)||0);
  const values=['views','clicks','orders','commission','gmv'].map(value);
  if(values.some(v=>!Number.isFinite(v)||v<0)){setError('Metrics must be non-negative numbers.');return;}
  const video:CloudVideo={id:crypto.randomUUID(),title,product:String(fields.get('product')??''),views:values[0],clicks:values[1],orders:values[2],commission:values[3],gmv:values[4],loggedAt:Date.now()};
  try{await onSave(doc=>({...doc,videos:[...doc.videos,video]}));form.reset();setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Save failed. Your form has been retained.');}
 }
 return <section className="panel review-panel"><h2>Studio · cloud video log</h2>
  <form onSubmit={submit}><fieldset disabled={saving} style={{border:0,padding:0}}>
   <label htmlFor="cloud-title">Video title</label><input id="cloud-title" name="title" required maxLength={200}/>
   <label htmlFor="cloud-product">Product</label><select id="cloud-product" name="product"><option value="">No product</option>{data.products.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select>
   {['views','clicks','orders','commission','gmv'].map(key=><label key={key} style={{display:'block'}}>{key}<input name={key} type="number" min="0" step={['views','clicks','orders'].includes(key)?'1':'0.01'} defaultValue="0"/></label>)}
   <button className="primary-button" type="submit">{saving?'Saving…':'Save video to cloud'}</button>
  </fieldset>{error&&<p role="alert">{error}</p>}</form>
  <h3>Saved videos</h3>{!data.videos.length&&<p>No videos logged yet.</p>}
  <ul>{data.videos.map(v=><li key={v.id}><strong>{v.title}</strong> · {v.views} views · ${v.commission} commission · RPM ${videoTotals([v]).rpm.toFixed(2)}</li>)}</ul>
 </section>;
}
