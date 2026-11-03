import {describe,it,expect} from 'vitest';
import {parseSnapshot,videoTotals,type CloudVideo} from './cloudWorkspace';
describe('cloud document compatibility',()=>{
 it('preserves notes, reminders and unknown fields without importing demo records',()=>{
  const data={products:[{id:'p',name:'Product',price:2}],videos:[],notes:[{body:'keep'}],reminders:[1],future:{keep:true}};
  expect(parseSnapshot({revision:3,data})).toEqual({revision:3,data});
  expect(parseSnapshot({revision:0,data:null}).data).toEqual({products:[],videos:[]});
 });
 it('rejects invalid revisions and malformed collections',()=>{
  expect(()=>parseSnapshot({revision:-1,data:{}})).toThrow();
  expect(()=>parseSnapshot({revision:0,data:{videos:'wrong'}})).toThrow();
 });
 it('computes RPM from commission and protects zero views',()=>{
  expect(videoTotals([{views:2000,commission:20} as CloudVideo]).rpm).toBe(10);
  expect(videoTotals([{views:0,commission:20} as CloudVideo]).rpm).toBe(0);
 });
});
