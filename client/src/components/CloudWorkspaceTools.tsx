import {useRef,useState,type FormEvent} from 'react';
import {exportVideos,importVideos} from '../lib/cloudCsv';
import type {Workspace} from '../lib/cloudWorkspace';
type Item={id:string;title:string;body?:string;postedAt?:number;completed?:boolean};
const items=(values:unknown[]|undefined)=> (values??[]).filter((v):v is Item=>!!v&&typeof v==='object'&&'id' in v&&typeof v.id==='string'&&'title' in v&&typeof v.title==='string');
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function CloudWorkspaceTools({page,data,disabled,onSave}:{page:string;data:Workspace;disabled:boolean;onSave:(update:(doc:Workspace)=>Workspace)=>Promise<void>}){
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[editing,setEditing]=useState<Item|null>(null);
 const importInput=useRef<HTMLInputElement>(null);
 async function save(update:(doc:Workspace)=>Workspace){try{await onSave(update);setError('');setMessage('Saved to cloud.');return true;}catch(cause){setError(cause instanceof Error?cause.message:'Save failed');return false;}}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget,fields=new FormData(form),title=String(fields.get('title')??'').trim();if(!title){setError('Title is required.');return;}
  if(page==='Creative'){
   const note={...editing,id:editing?.id??crypto.randomUUID(),title,body:String(fields.get('body')??'')};
   if(await save(doc=>({...doc,notes:editing?(doc.notes??[]).map(v=>v&&typeof v==='object'&&'id'in v&&v.id===editing.id?note:v):[...(doc.notes??[]),note]}))){setEditing(null);form.reset();}
  }else if(await save(doc=>({...doc,reminders:[...(doc.reminders??[]),{id:crypto.randomUUID(),title,postedAt:Date.now()}]})))form.reset();
 }
 return <section className="panel review-panel"><h2>{page}</h2>{error&&<p role="alert">{error}</p>}<p role="status">{message}</p>
  {page==='Connect'?<p>TikTok OAuth is not configured. Use Studio or CSV to log verified metrics.</p>:page==='Data'?<>
   <p>Exports contain your account data. CSV import appends new videos; existing records are retained.</p>
   <button className="outline-button" onClick={()=>download('command-videos.csv',exportVideos(data.videos),'text/csv')}>Export video CSV</button>
   <button className="outline-button" onClick={()=>download('command-workspace.json',JSON.stringify(data,null,2),'application/json')}>Download workspace backup</button>
   <label htmlFor="cloud-csv">Import video CSV</label><input ref={importInput} id="cloud-csv" type="file" accept=".csv,text/csv" disabled={disabled} onChange={async event=>{
    const file=event.currentTarget.files?.[0];if(!file)return;
    try{if(file.size>250000)throw new Error('Choose a CSV smaller than 250 KB');const videos=importVideos(await file.text());if(!videos.length)throw new Error('No video rows found');
     if(confirm(`Append ${videos.length} videos to this cloud workspace?`))await save(doc=>({...doc,videos:[...doc.videos,...videos]}));
    }catch(cause){setError(cause instanceof Error?cause.message:'Invalid CSV');}finally{if(importInput.current)importInput.current.value='';}
   }}/>

   <button className="outline-button" disabled={disabled} onClick={()=>location.assign('/cdn-cgi/access/logout')}>Sign out</button>
  </>:<>
   {page==='Reminders'&&<p>Reminders appear in this workspace 24 hours after posting. Email and push delivery are not configured.</p>}
   <form key={editing?.id??page} onSubmit={submit}><fieldset disabled={disabled} style={{border:0,padding:0}}><label htmlFor="cloud-item-title">Title</label><input id="cloud-item-title" name="title" required defaultValue={editing?.title??''}/>
    {page==='Creative'&&<><label htmlFor="cloud-note-body">Script or notes</label><textarea id="cloud-note-body" name="body" defaultValue={editing?.body??''}/></>}
    <button type="submit" className="primary-button">{editing?'Save changes':page==='Creative'?'Save idea':'Set 24-hour reminder'}</button>
    {editing&&<button type="button" onClick={()=>setEditing(null)}>Cancel edit</button>}
   </fieldset></form>
   <ul>{items(page==='Creative'?data.notes:data.reminders).map(item=><li key={item.id}><strong>{item.title}</strong>{page==='Creative'?<p style={{whiteSpace:'pre-wrap'}}>{item.body}</p>:<p>{item.completed?'Marked as logged':Date.now()-Number(item.postedAt??0)>=86400000?'Ready to log metrics':'Waiting for 24-hour check'}</p>}
    {page==='Creative'?<button disabled={disabled} onClick={()=>setEditing(item)}>Edit idea</button>:<button disabled={disabled||item.completed} onClick={()=>void save(doc=>({...doc,reminders:(doc.reminders??[]).map(v=>v&&typeof v==='object'&&'id'in v&&v.id===item.id?{...v,completed:true}:v)}))}>Mark logged</button>}

   </li>)}</ul>
  </>}
 </section>;
}
