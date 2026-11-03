import { useCallback, useEffect, useRef, useState } from 'react';
export type CloudProduct = {id: string | number; name: string; price?: number; [key: string]: unknown};
export type CloudVideo = {id: string; title: string; product: string; views: number; clicks: number; orders: number; commission: number; gmv: number; loggedAt: number; [key: string]: unknown};
export type Workspace = {products: CloudProduct[]; videos: CloudVideo[]; notes?: unknown[]; reminders?: unknown[]; [key: string]: unknown};
export type Snapshot = {revision: number; data: Workspace};
export function parseSnapshot(value: unknown): Snapshot {
 const saved=value as {revision?:unknown;data?:unknown};
 if(!saved || typeof saved.revision!=='number' || !Number.isSafeInteger(saved.revision) || Number(saved.revision)<0)throw new Error('Invalid cloud revision');
 const data=saved.data===null?{}:saved.data;
 if(!data || typeof data!=='object' || Array.isArray(data))throw new Error('Invalid cloud workspace');
 const doc=data as Record<string,unknown>;
 for(const key of ['products','videos','notes','reminders'])if(doc[key]!==undefined&&!Array.isArray(doc[key]))throw new Error('Invalid cloud records');
 return {revision:Number(saved.revision),data:{...doc,products:(doc.products??[]) as CloudProduct[],videos:(doc.videos??[]) as CloudVideo[]}};
}
async function request(path:string,init:RequestInit={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error',...init});
 if(!response.ok)throw new Error(response.status===409?'Workspace changed or account switched. Reload before editing.':response.status===401?'Session expired. Sign in again.':`Cloud request failed (${response.status}).`);
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Cloud session unavailable. Sign in again.');
 return response.json();
}
export function useCloudWorkspace(enabled:boolean){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[status,setStatus]=useState('loading'),[error,setError]=useState('');
 const latest=useRef<Snapshot|null>(null),owner=useRef(''),busy=useRef(false);
 useEffect(()=>{
  if(!enabled)return;
  let cancelled=false;
  void (async()=>{try{
   const account=await request('/api/account');
   if(typeof account.userId!=='string'||!account.userId)throw new Error('Invalid cloud identity');
   const saved=parseSnapshot(await request('/api/workspace'));
   if(cancelled)return;owner.current=account.userId;latest.current=saved;setSnapshot(saved);setStatus('ready');
  }catch(cause){if(!cancelled){setError(cause instanceof Error?cause.message:'Cloud unavailable');setStatus('error');}}})();
  return ()=>{cancelled=true;owner.current='';latest.current=null;};
 },[enabled]);
 useEffect(()=>{
  if(!enabled)return;
  const warn=(event:BeforeUnloadEvent)=>{if(busy.current){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn);
 },[enabled]);
 const save=useCallback(async(update:(data:Workspace)=>Workspace)=>{
  if(!latest.current||busy.current)throw new Error('Wait for the current cloud operation');
  busy.current=true;setStatus('saving');
  const previous=latest.current;
  try{
   const data=update(structuredClone(previous.data));
   const result=await request('/api/workspace',{method:'PUT',headers:{'content-type':'application/json','x-command-account':owner.current},body:JSON.stringify({revision:previous.revision,data})});
   if(result.revision!==previous.revision+1)throw new Error('Unexpected cloud revision. Reload before editing.');
   const next={revision:result.revision,data};latest.current=next;setSnapshot(next);setStatus('ready');
  }catch(cause){setError(cause instanceof Error?cause.message:'Cloud save failed');setStatus('error');throw cause;}
  finally{busy.current=false;}
 },[]);
 return {snapshot,status,error,save};
}
export function videoTotals(videos:CloudVideo[]){
 const sum=(key:'views'|'clicks'|'orders'|'commission')=>videos.reduce((total,v)=>total+(typeof v[key]==='number'&&Number.isFinite(v[key])&&v[key]>=0?v[key]:0),0);
 const views=sum('views'),commission=sum('commission');
 return {views,commission,clicks:sum('clicks'),orders:sum('orders'),rpm:views>0?commission/views*1000:0};
}
