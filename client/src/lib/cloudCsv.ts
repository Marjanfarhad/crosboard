import type {CloudVideo} from './cloudWorkspace';
const columns=['title','hook','product','views','clicks','orders','commission','gmv','loggedAt'];
export function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 const input=text.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const char=input[i];
  if(quoted){if(char==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=char;continue;}
  if(char==='"'){if(field||closed)throw new Error('Invalid CSV quotes');quoted=true;}
  else if(char===','){row.push(field);field='';closed=false;}
  else if(char==='\n'||char==='\r'){if(char==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(value=>value!==''))rows.push(row);row=[];field='';closed=false;}
  else {if(closed)throw new Error('Unexpected text after CSV quote');field+=char;}
 }
 if(quoted)throw new Error('Unclosed CSV quote');
 if(field||row.length||closed){row.push(field);if(row.some(value=>value!==''))rows.push(row);}
 return rows;
}
export function importVideos(text:string):CloudVideo[]{
 const [header,...rows]=parseCsv(text);if(!header)throw new Error('CSV is empty');
 const names=header.map(name=>name.trim().toLowerCase());
 if(new Set(names).size!==names.length||!names.includes('title'))throw new Error('CSV needs unique headers including title');
 if(rows.length>1000)throw new Error('Import at most 1,000 videos at once');
 return rows.map((row,index)=>{
  if(row.length!==header.length)throw new Error(`Row ${index+2}: column count differs`);
  const get=(name:string)=>row[names.indexOf(name)]??'';
  const title=get('title').trim();if(!title)throw new Error(`Row ${index+2}: title required`);
  const metric=(name:string)=>{const n=Number(get(name)||0);if(!Number.isFinite(n)||n<0||(['views','clicks','orders'].includes(name)&&!Number.isInteger(n)))throw new Error(`Row ${index+2}: invalid ${name}`);return n;};
  const rawTime=get('loggedat');const loggedAt=rawTime?(Number.isFinite(Number(rawTime))?Number(rawTime):Date.parse(rawTime)):Date.now();
  if(!Number.isFinite(loggedAt)||loggedAt<0)throw new Error(`Row ${index+2}: invalid loggedAt`);
  return {id:crypto.randomUUID(),title,hook:get('hook'),product:get('product'),views:metric('views'),clicks:metric('clicks'),orders:metric('orders'),commission:metric('commission'),gmv:metric('gmv'),loggedAt};
 });
}
export function exportVideos(videos:CloudVideo[]):string{
 const quote=(value:unknown)=>'"'+String(value??'').replace(/"/g,'""')+'"';
 return [columns,...videos.map(video=>columns.map(key=>video[key]))].map(row=>row.map(quote).join(',')).join('\r\n');
}
