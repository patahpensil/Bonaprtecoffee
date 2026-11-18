import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { realpathSync, statSync } from 'node:fs';

const digest = value => createHash('sha256').update(value).digest('hex');
const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const integer = n => Number.isSafeInteger(n) && n >= 0;
export const mac = (key, scope, action, fields) => createHmac('sha256', key).update(JSON.stringify([scope,action,...fields])).digest('hex');

// Single-host experiment: SQLite rollback super-journal, not distributed consensus.
export class DualLedger {
  #db;
  #scope;
  #transaction(fn) {
    this.#db.exec('BEGIN IMMEDIATE');
    try { const result=fn(); this.#db.exec('COMMIT'); return result; }
    catch (error) { if(this.#db.isTransaction) this.#db.exec('ROLLBACK'); throw error; }
  }
  static provision(primary, mirror, scope, device, admin, adminKey, deviceKey) {
    if (![scope,device,admin].every(valid) || ![adminKey,deviceKey].every(k=>typeof k==='string'&&k.length>=32)) throw new Error('invalid provisioning');
    const db=new DatabaseSync(primary);
    try {
      db.prepare('ATTACH DATABASE ? AS mirror').run(mirror);
      db.exec('PRAGMA main.journal_mode=DELETE; PRAGMA mirror.journal_mode=DELETE; PRAGMA main.synchronous=FULL; PRAGMA mirror.synchronous=FULL; BEGIN IMMEDIATE');
      db.exec('CREATE TABLE main.authority(scope TEXT NOT NULL, device TEXT NOT NULL, epoch INTEGER NOT NULL, seq INTEGER NOT NULL, tip TEXT NOT NULL); CREATE TABLE main.keys(actor TEXT PRIMARY KEY, secret TEXT NOT NULL, version INTEGER NOT NULL, expires INTEGER NOT NULL); CREATE TABLE main.events(seq INTEGER PRIMARY KEY, body TEXT NOT NULL, tip TEXT NOT NULL); CREATE TABLE mirror.events(seq INTEGER PRIMARY KEY, body TEXT NOT NULL, tip TEXT NOT NULL); CREATE TABLE mirror.identity(scope TEXT NOT NULL)');
      db.prepare('INSERT INTO main.authority VALUES (?,?,1,0,?)').run(scope,device,'0'.repeat(64));
      db.prepare('INSERT INTO mirror.identity VALUES (?)').run(scope);
      const expiry=Date.now()+86400000;
      db.prepare('INSERT INTO main.keys VALUES (?,?,1,?)').run('admin:'+admin,adminKey,expiry);
      db.prepare('INSERT INTO main.keys VALUES (?,?,1,?)').run('device:'+device,deviceKey,expiry);
      db.exec('COMMIT');
    } finally {db.close();}
  }
  constructor(primary, mirror, scope) {
    const a=realpathSync(primary), b=realpathSync(mirror);
    const sa=statSync(a), sb=statSync(b);
    if(a===b || (sa.dev===sb.dev && sa.ino===sb.ino)) throw new Error('same storage file');
    this.#scope=scope;
    this.#db=new DatabaseSync(a);
    try {
      this.#db.prepare('ATTACH DATABASE ? AS mirror').run(b);
      this.#db.exec('PRAGMA busy_timeout=5000; PRAGMA main.journal_mode=DELETE; PRAGMA mirror.journal_mode=DELETE; PRAGMA main.synchronous=FULL; PRAGMA mirror.synchronous=FULL');
      this.#transaction(()=>this.#verify());
    } catch(e){this.#db.close();throw e;}
  }
  #verify() {
    const a=this.#db.prepare('SELECT * FROM main.authority').get();
    if(a.scope!==this.#scope || this.#db.prepare('SELECT scope FROM mirror.identity').get().scope!==this.#scope) throw new Error('scope mismatch');
    const rows=this.#db.prepare('SELECT * FROM main.events ORDER BY seq').all();
    const other=this.#db.prepare('SELECT * FROM mirror.events ORDER BY seq').all();
    let tip='0'.repeat(64);
    if(rows.length!==other.length || rows.length!==a.seq) throw new Error('journal mismatch');
    for(let i=0;i<rows.length;i++){
      const r=rows[i]; tip=digest(JSON.stringify([tip,r.body]));
      if(r.seq!==i+1 || r.tip!==tip || JSON.stringify(r)!==JSON.stringify(other[i])) throw new Error('journal mismatch');
    }
    if(tip!==a.tip) throw new Error('journal mismatch');
    return a;
  }
  #auth(actor, action, fields, signature) {
    const k=this.#db.prepare('SELECT * FROM main.keys WHERE actor=?').get(actor);
    if(!k || k.expires<=Date.now() || typeof signature!=='string' || !/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(mac(k.secret,this.#scope,action,[actor,k.version,...fields]),'hex'))) throw new Error('unauthorized');
  }
  #append(a, body) {
    const seq=a.seq+1;
    if(!integer(seq)) throw new Error('sequence exhausted');
    const tip=digest(JSON.stringify([a.tip,body]));
    for(const schema of ['main','mirror']) this.#db.prepare('INSERT INTO '+schema+'.events VALUES (?,?,?)').run(seq,body,tip);
    this.#db.prepare('UPDATE main.authority SET seq=?,tip=?').run(seq,tip);
    return {seq,tip};
  }
  submit(c, signature) {
    const {id,device,epoch,sequence,amount}=c;
    if(!valid(id)||!valid(device)||![epoch,sequence,amount].every(n=>integer(n)&&n>0)) throw new Error('invalid command');
    return this.#transaction(()=>{
      const a=this.#verify();
      this.#auth('device:'+device,'submit',[id,epoch,sequence,amount],signature);
      const body=JSON.stringify(['submit',id,device,epoch,sequence,amount]);
      const prior=this.#db.prepare("SELECT body FROM main.events WHERE json_extract(body,'$[0]')='submit' AND json_extract(body,'$[1]')=?").get(id);
      if(prior){if(prior.body!==body) throw new Error('idempotency conflict');return {acknowledged:true,sequence};}
      if(a.device!==device||a.epoch!==epoch) throw new Error('stale authority');
      if(sequence!==a.seq+1) throw new Error('sequence conflict');
      this.#append(a,body);
      return {acknowledged:true,sequence};
    });
  }
  administer(admin, action, fields, signature) {
    if(!valid(admin)||!Array.isArray(fields)) throw new Error('invalid admin');
    return this.#transaction(()=>{
      const a=this.#verify();
      this.#auth('admin:'+admin,action,fields,signature);
      const [epoch,seq,tip,target,secret,expires]=fields;
      if(epoch!==a.epoch||seq!==a.seq||tip!==a.tip||!valid(target)) throw new Error('unreconciled authority');
      if(action==='handover'){
        if(fields.length!==4||!this.#db.prepare('SELECT actor FROM main.keys WHERE actor=? AND expires>?').get('device:'+target,Date.now())||!integer(epoch+1)) throw new Error('invalid target');
        this.#db.prepare('UPDATE main.authority SET device=?,epoch=?').run(target,epoch+1);
      } else if(action==='rotate'){
        if(fields.length!==6||typeof secret!=='string'||secret.length<32||!integer(expires)||expires<=Date.now()) throw new Error('invalid key');
        this.#db.prepare('INSERT INTO main.keys VALUES (?,?,1,?) ON CONFLICT(actor) DO UPDATE SET secret=excluded.secret,version=version+1,expires=excluded.expires').run('device:'+target,secret,expires);
      } else if(action==='revoke'){
        if(fields.length!==4) throw new Error('invalid revoke');
        this.#db.prepare('UPDATE main.keys SET expires=0 WHERE actor=?').run('device:'+target);
      } else throw new Error('invalid action');
      return this.#append(a,JSON.stringify([action,admin,epoch,seq,tip,target,action==='rotate'?expires:null]));
    });
  }
  state(){return this.#transaction(()=>this.#verify());}
  close(){this.#db.close();}
}
