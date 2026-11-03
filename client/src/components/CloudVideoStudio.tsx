import {useState,type FormEvent} from 'react';
import {videoTotals,type Workspace,type CloudVideo} from '../lib/cloudWorkspace';
export function CloudVideoStudio({data,saving,onSave}:{data:Workspace;saving:boolean;onSave:(update:(doc:Workspace)=>Workspace)=>Promise<void>}){
 const [error,setError]=useState(''),[editingId,setEditingId]=useState<string|null>(null);
 const editing=data.videos.find(v=>v.id===editingId);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget,fields=new FormData(form);
  const title=String(fields.get('title')??'').trim();
  if(!title){setError('Video title is required.');return;}
  const value=(name:string)=>Number(fields.get(name)||0);
  const values=['views','clicks','orders','commission','gmv'].map(value);
  if(values.some(v=>!Number.isFinite(v)||v<0)||values.slice(0,3).some(v=>!Number.isInteger(v))){setError('Counts must be whole numbers; all metrics must be non-negative.');return;}
  const video:CloudVideo={...editing,id:editing?.id??crypto.randomUUID(),title,product:String(fields.get('product')??''),views:values[0],clicks:values[1],orders:values[2],commission:values[3],gmv:values[4],loggedAt:editing?.loggedAt??Date.now()};
  try{await onSave(doc=>({...doc,videos:editing?doc.videos.map(v=>v.id===editing.id?video:v):[...doc.videos,video]}));form.reset();setEditingId(null);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Save failed. Your form has been retained.');}
 }
 return <section className="panel review-panel"><h2>{editing?'Edit video':'Studio · cloud video log'}</h2>
  <form key={editingId??'new'} onSubmit={submit}><fieldset disabled={saving} style={{border:0,padding:0}}>
   <label htmlFor="cloud-title">Video title</label><input id="cloud-title" name="title" required maxLength={200} defaultValue={editing?.title??''}/>
   <label htmlFor="cloud-product">Product</label><select id="cloud-product" name="product" defaultValue={editing?.product??''}><option value="">No product</option>{editing?.product&&!data.products.some(p=>p.name===editing.product)&&<option value={editing.product}>{editing.product}</option>}{data.products.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select>
   {(['views','clicks','orders','commission','gmv'] as const).map(key=><label key={key} style={{display:'block'}}>{key}<input name={key} type="number" min="0" step={['views','clicks','orders'].includes(key)?'1':'0.01'} defaultValue={editing?.[key]??0}/></label>)}
   <button className="primary-button" type="submit">{saving?'Saving…':editing?'Save changes':'Save video to cloud'}</button>
   {editing&&<button type="button" onClick={()=>setEditingId(null)}>Cancel edit</button>}
  </fieldset>{error&&<p role="alert">{error}</p>}</form>
  <h3>Saved videos</h3>{!data.videos.length&&<p>No videos logged yet.</p>}
  <ul>{data.videos.map(v=><li key={v.id}><strong>{v.title}</strong> · {v.views} views · ${v.commission} commission · RPM ${videoTotals([v]).rpm.toFixed(2)} <button disabled={saving} onClick={()=>setEditingId(v.id)}>Edit video</button></li>)}</ul>
 </section>;
}
