import test from 'node:test';
import assert from 'node:assert/strict';
import {allocate,cashSettlement} from '../packages/settlement/allocation.mjs';

test('allocation conserves value and respects every line balance exhaustively',()=>{
  for(let a=0n;a<=8n;a++) for(let b=0n;b<=8n;b++) for(let c=0n;c<=8n;c++) for(let n=0n;n<=a+b+c;n++){
    const entries=[{id:'a',weight:a},{id:'b',weight:b},{id:'c',weight:c}];
    const result=allocate(n,entries);
    assert.equal(result.reduce((s,r)=>s+r.amount,0n),n);
    result.forEach((r,i)=>assert.ok(r.amount>=0n && r.amount<=entries[i].weight));
    assert.deepEqual(result,allocate(n,[...entries].reverse()));
  }
});
test('stable tie break',()=>assert.deepEqual(allocate(1n,[{id:'b',weight:1n},{id:'a',weight:1n}]),[{id:'a',amount:1n},{id:'b',amount:0n}]));
test('large integer precision',()=>assert.deepEqual(allocate(9007199254740993n,[{id:'a',weight:9007199254740993n}]),[{id:'a',amount:9007199254740993n}]));
test('invalid allocation inputs rejected',()=>{
  for(const [n,entries] of [[-1n,[{id:'a',weight:1n}]],[1n,[]],[2n,[{id:'a',weight:1n}]],[0n,[{id:'a',weight:-1n}]],[0n,[{id:'a',weight:1n},{id:'a',weight:1n}]],[1,[{id:'a',weight:1n}]]]) assert.throws(()=>allocate(n,entries));
});
test('cash change excluded from settlement',()=>assert.deepEqual(cashSettlement(50000n,20000n,30000n),{settlement:20000n,change:10000n,remaining:30000n}));
test('invalid cash settlement rejected',()=>{for(const args of [[100n,101n,101n],[100n,50n,49n],[100n,0n,100n],[-1n,1n,1n],[100,50n,50n]]) assert.throws(()=>cashSettlement(...args));});
