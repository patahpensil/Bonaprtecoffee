import test from 'node:test';
import assert from 'node:assert/strict';
import { OfflineModel } from '../packages/offline-model/index.mjs';
const command = { id: 'order-1', epoch: 1, device: 'tablet-a', sequence: 1, amount: 25000 };
for (const boundary of ['primary-prepare', 'gateway-prepare', 'primary-commit', 'gateway-commit']) {
  test('retry at ' + boundary, () => {
    const model = new OfflineModel('tablet-a');
    assert.throws(() => model.submit(command, boundary), /interrupted/);
    assert.equal(model.submit(command).acknowledged, true);
    assert.equal(model.submit(command).acknowledged, true);
    assert.equal(model.snapshot().total, 25000n);
  });
}
test('changed payload rejected', () => {
  const model = new OfflineModel('tablet-a');
  model.submit(command);
  assert.throws(() => model.submit({ ...command, amount: 1 }), /idempotency conflict/);
});
test('stale device rejected after reconciliation', () => {
  const model = new OfflineModel('tablet-a');
  model.submit(command);
  assert.equal(model.handover('tablet-b', 1), 2);
  assert.throws(() => model.submit(command), /stale authority/);
  assert.equal(model.submit({ ...command, id: 'order-2', epoch: 2, device: 'tablet-b', sequence: 2 }).acknowledged, true);
});
test('handover blocked while incomplete', () => {
  const model = new OfflineModel('tablet-a');
  assert.throws(() => model.submit(command, 'primary-commit'));
  assert.throws(() => model.handover('tablet-b', 0), /unreconciled/);
});
test('gap and invalid money rejected', () => {
  const model = new OfflineModel('tablet-a');
  assert.throws(() => model.submit({ ...command, sequence: 2 }), /sequence conflict/);
  assert.throws(() => model.submit({ ...command, amount: 0.5 }), /invalid command/);
});
