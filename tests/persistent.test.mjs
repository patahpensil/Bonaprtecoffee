import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PersistentAuthority, sign } from '../packages/offline-model/persistent.mjs';
test('persistent receipt, shared database fencing and authenticated handover', () => {
 const dir=mkdtempSync(join(tmpdir(),'bonaparte-'));
 const keys=[['device:a','test-a'],['device:b','test-b'],['admin','test-admin']];
 const path=join(dir,'ledger.db');
 let a,b;
 try {
  a=new PersistentAuthority(path,'a',keys);
  b=new PersistentAuthority(path,'b',keys);
  const c={id:'one',device:'a',epoch:1,sequence:1,amount:100};
  const sig=sign('test-a',JSON.stringify(['submit','one','a',1,1,100]));
  assert.throws(()=>a.submit(c,'bad'),/unauthorized/);
  assert.equal(a.submit(c,sig).acknowledged,true);
  assert.throws(()=>b.submit({...c,id:'other'},sign('test-a',JSON.stringify(['submit','other','a',1,1,100]))),/sequence conflict/);
  a.close(); a=null;
  a=new PersistentAuthority(path,'a',keys);
  assert.equal(a.submit(c,sig).acknowledged,true);
  assert.throws(()=>b.handover('b',1,1,'bad'),/unauthorized/);
  assert.equal(b.handover('b',1,1,sign('test-admin',JSON.stringify(['handover','b',1,1]))),2);
  assert.equal(a.submit(c,sig).acknowledged,true);
  assert.throws(()=>a.submit({...c,id:'two',sequence:2},sign('test-a',JSON.stringify(['submit','two','a',1,2,100]))),/stale authority/);
 } finally {a?.close();b?.close();rmSync(dir,{recursive:true,force:true});}
});
