import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { DualLedger, mac } from '../packages/offline-model/dual-ledger.mjs';

const admin='a'.repeat(32), device='b'.repeat(32), next='c'.repeat(32);
function fixture(fn){
 const dir=mkdtempSync(join(tmpdir(),'dual-ledger-'));
 const p=join(dir,'primary.db'), m=join(dir,'mirror.db');
 DualLedger.provision(p,m,'outlet-a','tablet','owner',admin,device);
 try {fn(p,m);} finally {rmSync(dir,{recursive:true,force:true});}
}
const cmd={id:'order',device:'tablet',epoch:1,sequence:1,amount:100};
const signature=mac(device,'outlet-a','submit',['device:tablet',1,'order',1,1,100]);
test('scope, duplicate, shared authority and rotation',()=>fixture((p,m)=>{
 const a=new DualLedger(p,m,'outlet-a'), b=new DualLedger(p,m,'outlet-a');
 try {
  assert.throws(()=>a.submit(cmd,mac(device,'outlet-b','submit',['device:tablet',1,'order',1,1,100])),/unauthorized/);
  a.submit(cmd,signature); assert.equal(b.submit(cmd,signature).acknowledged,true);
  const s=a.state(), fields=[s.epoch,s.seq,s.tip,'tablet',next,Date.now()+60000];
  assert.throws(()=>a.administer('owner','rotate',fields,'bad'),/unauthorized/);
  a.administer('owner','rotate',fields,mac(admin,'outlet-a','rotate',['admin:owner',1,...fields]));
  assert.throws(()=>b.submit(cmd,signature),/unauthorized/);
  assert.equal(b.submit(cmd,mac(next,'outlet-a','submit',['device:tablet',2,'order',1,1,100])).acknowledged,true);
  assert.throws(()=>a.administer('owner','rotate',fields,mac(admin,'outlet-a','rotate',['admin:owner',1,...fields])),/unreconciled/);
 } finally {a.close();b.close();}
}));
test('mirror mismatch fails closed',()=>fixture((p,m)=>{
 const a=new DualLedger(p,m,'outlet-a');a.submit(cmd,signature);a.close();
 const db=new DatabaseSync(m);db.exec('DELETE FROM events');db.close();
 assert.throws(()=>new DualLedger(p,m,'outlet-a'),/journal mismatch/);
}));
test('process kill after acknowledgement preserves both journals',()=>fixture((p,m)=>{
 const url=new URL('../packages/offline-model/dual-ledger.mjs',import.meta.url).href;
 const script='import {DualLedger} from '+JSON.stringify(url)+'; const a=new DualLedger('+JSON.stringify(p)+','+JSON.stringify(m)+',"outlet-a"); a.submit('+JSON.stringify(cmd)+','+JSON.stringify(signature)+'); process.kill(process.pid,"SIGKILL");';
 const child=spawnSync(process.execPath,['--input-type=module','-e',script]);
 assert.equal(child.signal,'SIGKILL');
 const a=new DualLedger(p,m,'outlet-a');
 try {assert.equal(a.state().seq,1);assert.equal(a.submit(cmd,signature).acknowledged,true);} finally {a.close();}
}));
