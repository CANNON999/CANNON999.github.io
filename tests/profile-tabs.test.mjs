import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { profileSections, profileSection, profileKeyIndex } from '../src/lib/profile-tabs.ts';
import { canOpenHub } from '../src/lib/project-hub.ts';
const source=stripTypeScriptTypes(readFileSync(new URL('../src/scripts/profile-tabs.ts',import.meta.url),'utf8')).replace(/^import[^;]+;/gm,'').replace('export function','function');
function fixture(hash='',motionOff=false) {
  const tabs=profileSections.map(({id})=>({dataset:{profileTab:id},attrs:{},events:{},tabIndex:0,
    setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.events[k]=v;},focus(){focused=id;}}));
  const animations=[];
  const panels=profileSections.map(({id})=>({id,hidden:false,animate(frames,options){const a={id,frames,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(a);return a;}}));
  const pane={scrollTop:0};let focused='';const events={};
  const shell={dataset:{},querySelectorAll:s=>s==='[data-profile-tab]'?tabs:panels,querySelector:()=>pane};
  const location={hash};let entries=0;
  const context=vm.createContext({matchMedia:()=>({matches:motionOff}),profileSection,profileKeyIndex,canOpenHub,location,history:{replaceState:(_,__,url)=>{location.hash=url;entries++;}},window:{addEventListener:(k,v)=>events[k]=v}});
  vm.runInContext(source,context);const api=context.createProfileTabs(shell);
  function click(id,extra={}) {let prevented=false;tabs.find(t=>t.dataset.profileTab===id).events.click({button:0,...extra,preventDefault(){prevented=true;}});return prevented;}
  return {api,tabs,panels,pane,location,events,click,animations,state:()=>({focused,entries,active:panels.filter(p=>!p.hidden).map(p=>p.id)})};
}
test('PF01: default, direct and invalid chapters always produce one visible panel',()=>{
  for(const [hash,want] of [['','education'],['#games','games'],['#missing','education'],['#%E0%A4','education']]){
    const f=fixture(hash);assert.deepEqual(f.state().active,[want]);
    assert.equal(f.tabs.filter(t=>t.tabIndex===0).length,1);
    assert.equal(f.tabs.find(t=>t.tabIndex===0).attrs['aria-selected'],'true');
  }
});
test('PF02: chapter changes preserve independent scroll positions without adding history',()=>{
  const f=fixture();f.pane.scrollTop=125;f.click('projects');assert.equal(f.pane.scrollTop,0);
  f.pane.scrollTop=640;f.click('games');f.pane.scrollTop=320;
  f.click('projects');assert.equal(f.pane.scrollTop,640);
  f.click('education');assert.equal(f.pane.scrollTop,125);assert.equal(f.location.hash,'#education');
});
test('PF03: keyboard roving focus wraps, Home/End work, vertical reading remains native',()=>{
  const f=fixture();const fire=(i,key)=>{let prevented=false;f.tabs[i].events.keydown({key,preventDefault(){prevented=true;}});return prevented;};
  assert.equal(fire(0,'ArrowLeft'),true);assert.equal(f.state().focused,'games');
  fire(5,'Home');assert.deepEqual(f.state().active,['education']);
  fire(0,'End');assert.deepEqual(f.state().active,['games']);
  assert.equal(fire(5,'ArrowDown'),false);assert.equal(fire(5,'PageDown'),false);
});
test('PF04: modified tab links and skip-to-content preserve browser behavior',()=>{
  const f=fixture();assert.equal(f.click('games',{metaKey:true}),false);assert.deepEqual(f.state().active,['education']);
  f.location.hash='#games';f.events.hashchange();assert.deepEqual(f.state().active,['games']);
  f.location.hash='#main-content';f.events.hashchange();assert.deepEqual(f.state().active,['games']);
});

test('PF05: chapter transitions are cancellable and respect reduced motion',()=>{
  const f=fixture();assert.equal(f.animations.length,0);f.click('projects');assert.equal(f.animations[0].id,'projects');f.click('games');assert.equal(f.animations[0].cancelled,true);assert.equal(f.animations.at(-1).id,'games');
  const quiet=fixture('',true);quiet.click('games');assert.equal(quiet.animations.length,0);
});
