import test from 'node:test';
import assert from 'node:assert/strict';
import { WheelBurstNavigator, PacedWheelSteps } from '../src/scripts/wheel-burst.ts';

const pixel = y => ({deltaX:0,deltaY:y,deltaMode:0});
const line = y => ({deltaX:0,deltaY:y,deltaMode:1});
function trace(values, event, interval=16) {
  const nav=new WheelBurstNavigator();
  return values.map((delta,i)=>nav.push(event(delta),delta,1000+i*interval).steps).filter(Boolean);
}
test('W20: spaced mouse detents each select exactly one item',()=>{
  assert.deepEqual(trace([48,48,48,-48],()=>line(3),220),[1,1,1,-1]);
  assert.deepEqual(trace([100,100,100],pixel,250),[1,1,1]);
});
test('W21: forceful line-wheel burst admits at most five, then resets after release',()=>{
  const n=new WheelBurstNavigator();
  assert.equal(n.push(line(30),480,1000).steps,5);
  for(let i=1;i<30;i++) assert.equal(n.push(line(3),48,1000+i*16).steps,0);
  assert.equal(n.push(line(3),48,1700).steps,1);
});
test('W22: Chromium pixel mouse detents accelerate without overrunning five items',()=>{
  assert.deepEqual(trace([100,100,100,100,100,100,100],pixel,35),[1,1,1,1,1]);
  assert.deepEqual(trace([120,360,120,120,120],pixel,35),[1,3,1]);
});
test('W23: hard, sustained, fractional and horizontal touchpad swipes advance once',()=>{
  const hard=[12,40,120,240,210,170,90,35,20,9,4,2];
  assert.deepEqual(trace(hard,pixel),[1]);
  assert.deepEqual(trace(Array(70).fill(12),pixel),[1]);
  assert.deepEqual(trace(Array(40).fill(120),delta=>({deltaX:delta,deltaY:0,deltaMode:0})),[1]);
  assert.deepEqual(trace(Array(40).fill(12.5),pixel),[1]);
  assert.deepEqual(trace([480],pixel),[1]); // Ambiguous single event is conservative.
});
test('W24: touchpad fresh impulse and reversal remain responsive',()=>{
  const swipe=[12,24,42,36,28,20,14,9,5,3,2,1];
  assert.deepEqual(trace([...swipe,...swipe,...swipe.map(x=>-x)],pixel),[1,1,-1]);
  assert.deepEqual(trace([...swipe,-1,1,-2,.5],pixel),[1]);
});
test('W25: pace is one item per 140ms and reverse cancels queued travel',()=>{
  const queue=new PacedWheelSteps(); queue.add(5);
  const results=[];
  for(let t=0;t<=700;t+=20) { const step=queue.take(t); if(step) results.push({step,t}); }
  assert.deepEqual(results.map(x=>x.t),[0,140,280,420,560]);
  assert.equal(queue.delay(700),null);
  queue.reset();queue.add(5);assert.equal(queue.take(1000),1);
  queue.add(-1);assert.equal(queue.take(1020),-1);assert.equal(queue.delay(1020),null);
});
test('W26: click/key/Hub reset discards pending movement and stale gesture state',()=>{
  const n=new WheelBurstNavigator(),q=new PacedWheelSteps();
  q.add(n.push(line(30),480,1000).steps);assert.equal(q.take(1000),1);
  n.reset();q.reset();assert.equal(q.take(1500),0);
  assert.equal(n.push(line(3),48,1510).steps,1);
});
test('W27: invalid samples and page-mode input have safe bounds',()=>{
  const n=new WheelBurstNavigator();
  for(const delta of [NaN,Infinity,.2]) assert.equal(n.push(pixel(delta),delta,1000).steps,0);
  assert.equal(n.push({deltaX:0,deltaY:1,deltaMode:2},862,1000).steps,1);
});
test('W28: a recognized mouse burst stays capped through accelerated variable deltas',()=>{
  const nav=new WheelBurstNavigator();let total=0;
  for (const [i,y] of [120,240,600,231.5,400,120].entries()) total+=nav.push(pixel(y),y,1000+i*32).steps;
  assert.equal(total,5);
});
