import {describe,it,expect} from 'vitest';
import {parseCsv,importVideos,exportVideos} from './cloudCsv';
describe('cloud CSV',()=>{
 it('round trips multiline titles, quoted hooks, metrics and product associations',()=>{
  const records=importVideos('title,hook,product,views,clicks,orders,commission,gmv,loggedAt\r\n"A, B\nC","say ""hello""",Desk,2000,12,2,20,50,1730000000000');
  const again=importVideos(exportVideos(records));
  expect({...again[0],id:'same'}).toEqual({...records[0],id:'same'});
 });
 it('rejects malformed or invalid input before any save',()=>{
  for(const csv of ['title\n"open','title,title\na,b','title,views\na,-1','title,views\na,1.2','title,commission\na,NaN','title,views\na,2,extra'])expect(()=>importVideos(csv)).toThrow();
 });
 it('supports BOM, CRLF and trailing blank lines',()=>expect(parseCsv('\uFEFFtitle\r\na\r\n\r\n')).toEqual([['title'],['a']]));
});
