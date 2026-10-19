const assert=require('node:assert/strict');
const r=require('../wave-rules.js');
assert.deepEqual(Array.from({length:6},(_,i)=>r.threshold(i)),[0,500,1250,2250,3500,5000]);
for(let stage=0;stage<100;stage++){
  const start=r.threshold(stage),cost=500+250*stage;
  assert.equal(r.state(start).stage,stage);
  assert.equal(r.state(start).progress,0);
  assert.equal(r.state(start).baseOrange,stage%2===1);
  assert.equal(r.state(start+cost-1).stage,stage);
  assert.equal(r.state(start+cost).stage,stage+1);
  assert.equal(r.state(start).cost,cost);
}
assert.equal(r.state(250).progress,.5);
assert.equal(r.state(875).progress,.5);
assert.equal(r.state(50).progress,.1,'the same earnings now raise water five times more slowly');
for(const total of [0,1,99,100,249,250,1e6,1e12,Number.MAX_SAFE_INTEGER]){
  const s=r.state(total);
  assert.ok(s.progress>=0&&s.progress<1);
  assert.ok(s.start<=total&&r.threshold(s.stage+1)>total);
  assert.deepEqual(r.state(total),s,'saved cumulative income deterministically restores the same stage');
}
assert.equal(r.frequency(0),.12);assert.equal(r.frequency(-100),.12);
assert.ok(Math.abs(r.frequency(4)-.81)<1e-10);assert.equal(r.frequency(8),1.5);assert.equal(r.frequency(100),1.5);
console.log('PASS: increasing wave costs, exact boundaries, alternating palettes, large-income/save restoration and bounded click-speed frequency.');
