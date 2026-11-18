import { createHash } from 'node:crypto';

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class OfflineModel {
  #epoch = 1;
  #device;
  #primary = new Map();
  #gateway = new Map();
  #sequence = 0;
  constructor(device) {
    if (typeof device !== 'string' || !device) throw new Error('invalid device');
    this.#device = device;
  }
  submit(command, failAt = '') {
    const { id, epoch, device, sequence, amount } = command;
    if (epoch !== this.#epoch || device !== this.#device) throw new Error('stale authority');
    if (typeof id !== 'string' || !id || !Number.isSafeInteger(sequence) || sequence < 1 ||
        !Number.isSafeInteger(amount) || amount < 1) throw new Error('invalid command');
    const hash = digest([id, epoch, device, sequence, amount]);
    const previous = this.#primary.get(id);
    if (previous && previous.hash !== hash) throw new Error('idempotency conflict');
    if (previous?.state === 'COMMITTED' && this.#gateway.get(id)?.state === 'COMMITTED') {
      return { id, sequence, acknowledged: true };
    }
    if (sequence !== this.#sequence + 1) throw new Error('sequence conflict');
    if ([...this.#primary.entries()].some(([key, record]) => key !== id && (record.state !== 'COMMITTED' || this.#gateway.get(key)?.state !== 'COMMITTED'))) {
      throw new Error('pending recovery');
    }
    const record = { hash, sequence, amount, state: 'PREPARED' };
    if (!previous) this.#primary.set(id, { ...record });
    if (failAt === 'primary-prepare') throw new Error('interrupted');
    if (!this.#gateway.has(id)) this.#gateway.set(id, { ...record });
    if (failAt === 'gateway-prepare') throw new Error('interrupted');
    this.#primary.get(id).state = 'COMMITTED';
    if (failAt === 'primary-commit') throw new Error('interrupted');
    this.#gateway.get(id).state = 'COMMITTED';
    this.#sequence = sequence;
    if (failAt === 'gateway-commit') throw new Error('interrupted');
    return { id, sequence, acknowledged: true };
  }
  handover(device, expectedSequence) {
    if (typeof device !== 'string' || !device || expectedSequence !== this.#sequence ||
        this.#primary.size !== this.#sequence ||
        [...this.#primary.entries()].some(([id, record]) =>
          record.state !== 'COMMITTED' || this.#gateway.get(id)?.state !== 'COMMITTED')) {
      throw new Error('unreconciled authority');
    }
    this.#device = device;
    this.#epoch++;
    return this.#epoch;
  }
  snapshot() {
    return { epoch: this.#epoch, sequence: this.#sequence,
      total: [...this.#primary.entries()].filter(([id, r]) => r.state === 'COMMITTED' &&
        this.#gateway.get(id)?.state === 'COMMITTED').reduce((sum, [, r]) => sum + BigInt(r.amount), 0n) };
  }
}
