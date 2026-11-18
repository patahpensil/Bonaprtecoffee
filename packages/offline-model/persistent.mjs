import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const hash = s => createHash('sha256').update(s).digest('hex');
const validId = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
export const sign = (key, body) => createHmac('sha256', key).update(body).digest('hex');
export class PersistentAuthority {
  #db;
  #keys;
  constructor(path, device, keys) {
    if (!validId(device)) throw new Error('invalid device');
    this.#keys = new Map(keys);
    this.#db = new DatabaseSync(path);
    this.#db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS authority (singleton INTEGER PRIMARY KEY CHECK(singleton=1), device TEXT NOT NULL, epoch INTEGER NOT NULL, seq INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, digest TEXT NOT NULL, seq INTEGER UNIQUE NOT NULL, amount INTEGER NOT NULL);");
    this.#db.prepare('INSERT OR IGNORE INTO authority VALUES (1,?,1,0)').run(device);
  }
  #authenticate(actor, body, signature) {
    const key = this.#keys.get(actor);
    if (!key || typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature) ||
        !timingSafeEqual(Buffer.from(sign(key, body), 'hex'), Buffer.from(signature, 'hex'))) throw new Error('unauthorized');
  }
  #transaction(fn) {
    this.#db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.#db.exec('COMMIT'); return result; }
    catch (error) { this.#db.exec('ROLLBACK'); throw error; }
  }
  submit(c, signature) {
    const {id, device, epoch, sequence, amount} = c;
    if (!validId(id) || !validId(device) || ![epoch,sequence,amount].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('invalid command');
    const body = JSON.stringify(['submit',id,device,epoch,sequence,amount]);
    this.#authenticate('device:'+device,body,signature);
    return this.#transaction(() => {
      const digest = hash(body);
      const previous = this.#db.prepare('SELECT * FROM receipts WHERE id=?').get(id);
      if (previous) {
        if (previous.digest !== digest) throw new Error('idempotency conflict');
        return {id,sequence,acknowledged:true};
      }
      const a = this.#db.prepare('SELECT * FROM authority').get();
      if (a.device !== device || a.epoch !== epoch) throw new Error('stale authority');
      if (sequence !== a.seq+1) throw new Error('sequence conflict');
      this.#db.prepare('INSERT INTO receipts VALUES (?,?,?,?)').run(id,digest,sequence,amount);
      this.#db.prepare('UPDATE authority SET seq=? WHERE singleton=1').run(sequence);
      return {id,sequence,acknowledged:true};
    });
  }
  handover(device, epoch, sequence, signature) {
    if (!validId(device) || !this.#keys.has('device:'+device) || !Number.isSafeInteger(epoch) || !Number.isSafeInteger(sequence)) throw new Error('invalid handover');
    this.#authenticate('admin',JSON.stringify(['handover',device,epoch,sequence]),signature);
    return this.#transaction(() => {
      const a=this.#db.prepare('SELECT * FROM authority').get();
      if(a.epoch!==epoch || a.seq!==sequence || !Number.isSafeInteger(epoch+1)) throw new Error('unreconciled authority');
      this.#db.prepare('UPDATE authority SET device=?,epoch=? WHERE singleton=1').run(device,epoch+1);
      return epoch+1;
    });
  }
  close() { this.#db.close(); }
}
