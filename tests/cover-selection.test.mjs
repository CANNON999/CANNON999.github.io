import test from 'node:test';
import assert from 'node:assert/strict';
import {bindCoverSelection} from '../src/scripts/cover-selection.ts';
test('H20: first and repeated cover clicks select previews and never follow the work link',()=>{
  const events=[],selected=[];const tabs=[0,1,2].map(()=>({addEventListener:(_,fn)=>events.push(fn)}));
  bindCoverSelection(tabs,i=>selected.push(i),()=>false);
  let prevented=0;
  for(const i of [2,2,1]) events[i]({button:0,preventDefault(){prevented++;}});
  assert.deepEqual(selected,[2,2,1]);assert.equal(prevented,3);
});
test('H21: loading blocks cover navigation and modified clicks keep native links',()=>{
  let handler,selected=0,prevented=0;
  bindCoverSelection([{addEventListener:(_,fn)=>handler=fn}],()=>selected++,()=>true);
  handler({button:0,preventDefault(){prevented++;}});assert.equal(selected,0);assert.equal(prevented,1);
  handler({button:0,ctrlKey:true,preventDefault(){prevented++;}});assert.equal(prevented,1);
});
