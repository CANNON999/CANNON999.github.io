import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installPageTransitions } from '../src/scripts/page-transitions.ts';
function fixture({url='https://site.test/',native=true,reduced=false,paused=false,brokenStorage=false,record}={}) {
  const events={}, dataset={}, jobs=new Map(), animations=[], assigned=[];let id=0,skips=0;
  const store=new Map(record?[['cannon-page-transition',JSON.stringify(record)]]:[]);
  const storage={getItem:k=>{if(brokenStorage)throw Error();return store.get(k)||null;},setItem:(k,v)=>{if(brokenStorage)throw Error();store.set(k,v);},removeItem:k=>store.delete(k)};
  const window={addEventListener:(k,v)=>events[k]=v,...(native?{onpageswap:null,onpagereveal:null}:{})};
  const location={href:url,origin:new URL(url).origin,pathname:new URL(url).pathname,search:new URL(url).search,assign:v=>assigned.push(v)};
  const main={animate:(frames,options)=>{const anim={frames,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(anim);return anim;}};
  vm.runInNewContext(`(${installPageTransitions.toString()})()`,{window,document:{documentElement:{dataset},querySelector:()=>main},location,URL,Date,matchMedia:()=>({matches:reduced,addEventListener(){}}),localStorage:{getItem:()=>paused?'paused':null},sessionStorage:storage,setTimeout:(fn,ms)=>{jobs.set(++id,{fn,ms});return id;},clearTimeout:id=>jobs.delete(id)});
  function click(href,extra={}) {let prevented=false;events.click({button:0,target:{closest:()=>({href:new URL(href,url).href,target:extra.target||'',hasAttribute:()=>extra.download||false})},...extra,preventDefault(){prevented=true;}});return prevented;}
  return {events,dataset,click,jobs,animations,assigned,store,vt:{skipTransition:()=>skips++,ready:Promise.resolve(),finished:Promise.resolve()},skips:()=>skips,flush:()=>{for(const j of jobs.values())j.fn();jobs.clear();}};
}
test('T01: native navigation selects section/profile/detail choreography without delaying the link',()=>{
  for(const [url,to,want] of [['/','/works/','section-forward'],['/works/','/','section-back'],['/','/about/','profile-in'],['/about/','/','profile-out'],['/works/','/works/abyss/','detail-in'],['/works/abyss/','/','detail-out']]){
    const f=fixture({url:'https://site.test'+url});assert.equal(f.click(to),false);assert.equal(f.dataset.pageTransition,want);assert.equal(f.jobs.size,0);
  }
});
test('T02: handled tiles, modified clicks, same-page hashes, external, download and mail links remain native',()=>{
  for(const [url,extra] of [['/about/',{defaultPrevented:true}],['/about/',{metaKey:true}],['/about/',{button:1}],['/#profile',{}],['https://other.test/',{}],['/about/',{target:'_blank'}],['/file.pdf',{}],['/about/',{download:true}],['mailto:a@example.com',{}]]){
    const f=fixture({native:false});assert.equal(f.click(url,extra),false);assert.equal(f.jobs.size,0);assert.equal(f.store.size,0);
  }
});
test('T03: fallback navigation is bounded, last intent wins and pagehide cancels pending work',()=>{
  const f=fixture({native:false});assert.equal(f.click('/about/'),true);assert.equal([...f.jobs.values()][0].ms,120);
  f.click('/works/');assert.equal(f.jobs.size,1);assert.equal(f.animations[0].cancelled,true);f.flush();assert.deepEqual(f.assigned,['https://site.test/works/']);
  f.click('/about/');f.events.pagehide();assert.equal(f.jobs.size,0);assert.equal(f.animations.at(-1).cancelled,true);
});
test('T04: reduced motion, paused preference and storage failure never break navigation',()=>{
  for(const option of [{reduced:true},{paused:true}]){
    const f=fixture({...option,native:false});assert.equal(f.click('/about/'),false);assert.equal(f.animations.length,0);f.events.pagereveal({viewTransition:f.vt});assert.equal(f.skips(),1);
  }
  const f=fixture({brokenStorage:true});assert.doesNotThrow(()=>f.click('/about/'));f.events.pageshow({persisted:true});
});
test('T05: browser-back reveal uses actual navigation path, fallback restores without replaying startup',()=>{
  const f=fixture({url:'https://site.test/about/',record:{from:'https://site.test/',to:'https://site.test/about/',at:Date.now()}});
  f.events.pageshow({persisted:false});assert.equal(f.store.size,1);f.events.pagereveal({viewTransition:f.vt});assert.equal(f.dataset.pageTransition,'profile-in');assert.equal(f.store.size,0);assert.equal(f.animations.length,0);
  const b=fixture({native:false});b.events.pageshow({persisted:true});assert.equal(b.animations.length,1);b.dataset.startup='pending';b.events.pageshow({persisted:true});assert.equal(b.animations.length,1);
});
test('T06: a rejected native snapshot falls back to an entrance and is handled',async()=>{
  const f=fixture();f.events.pagereveal({viewTransition:{ready:Promise.reject(Error('viewport resized')),finished:Promise.resolve(),skipTransition(){}}});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(f.dataset.pageTransitionState,'fallback');assert.equal(f.animations.length,1);
  const old=fixture();old.events.pageswap({viewTransition:{ready:Promise.reject(Error('document hidden')),skipTransition(){}}});await new Promise(resolve=>setImmediate(resolve));
});
