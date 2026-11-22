import test from 'node:test';
import assert from 'node:assert/strict';
import { addThreeCalendarYearsUTC, calculatePeriods } from './periods.mjs';

const ms = value => Date.parse(value);
const initial = ms('2026-11-22T10:00:00.000Z');
const scope = { bundleId: 'test.vardadienas', environment: 'Production', renewalProductId: 'test.push.3years' };
const app = { ...scope, appTransactionId: 'app-1', purchaseDate: initial, revoked: false };
const renewal = (id, date, extra = {}) => ({ ...scope, appTransactionId: 'app-1', productId: scope.renewalProductId,
  transactionId: id, purchaseDate: ms(date), revokedAt: null, ...extra });
const run = (renewals = [], now = initial, appOverrides = {}) => calculatePeriods({ app: { ...app, ...appOverrides }, renewals, scope, now });
const firstEnd = ms('2029-11-22T10:00:00.000Z');

test('Paid download grants base rights and exactly three calendar years', () => {
  const result = run();
  assert.equal(result.baseAccess, true); assert.equal(result.pushActive, true);
  assert.equal(result.pushExpiresAt, firstEnd); assert.equal(result.periods.length, 1);
});
test('Expiration stops Push without locking base features', () => {
  assert.equal(run([], firstEnd - 1).pushActive, true);
  const result = run([], firstEnd);
  assert.equal(result.pushActive, false); assert.equal(result.baseAccess, true); assert.equal(result.status, 'expired');
});
test('Reinstallation and later evaluation do not restart the paid period', () => {
  assert.equal(run([], initial + 86400000).pushExpiresAt, firstEnd);
});
test('Early renewal preserves remaining purchased time', () => {
  const result = run([renewal('r1', '2028-01-01T00:00:00.000Z')], ms('2028-01-02T00:00:00.000Z'));
  assert.equal(result.periods[1].start, firstEnd);
  assert.equal(result.pushExpiresAt, ms('2032-11-22T10:00:00.000Z'));
});
test('Late renewal starts at purchase, without backdating a paid period', () => {
  const date = '2030-02-01T09:30:00.000Z';
  const result = run([renewal('r1', date)], ms(date));
  assert.equal(result.periods[1].start, ms(date));
  assert.equal(result.pushExpiresAt, ms('2033-02-01T09:30:00.000Z'));
});
test('Duplicate deliveries cannot extend a transaction twice', () => {
  const r = renewal('r1', '2028-01-01T00:00:00.000Z');
  assert.deepEqual(run([r, { ...r }], ms('2028-01-02T00:00:00.000Z')), run([r], ms('2028-01-02T00:00:00.000Z')));
});
test('Out of order history yields the same entitlement', () => {
  const a = renewal('r1', '2028-01-01T00:00:00.000Z'), b = renewal('r2', '2030-01-01T00:00:00.000Z');
  const now = ms('2030-02-01T00:00:00.000Z');
  assert.deepEqual(run([b, a], now), run([a, b], now));
});
test('Refunded renewal is removed and later periods are recomputed', () => {
  const a = renewal('r1', '2028-01-01T00:00:00.000Z', { revokedAt: ms('2028-02-01T00:00:00.000Z') });
  const b = renewal('r2', '2030-01-01T00:00:00.000Z');
  assert.deepEqual(run([a, b], b.purchaseDate), run([b], b.purchaseDate));
});
test('Revoked initial app purchase never grants base or Push access', () => {
  const result = run([], initial, { revoked: true });
  assert.equal(result.baseAccess, false); assert.equal(result.pushActive, false); assert.equal(result.status, 'revoked');
});
test('Missing verified access state fails closed', () => assert.throws(() => run([], initial, { revoked: undefined })));
test('Conflicting snapshots of the same transaction require reconciliation', () => {
  const a = renewal('r1', '2028-01-01T00:00:00.000Z');
  assert.throws(() => run([a, { ...a, revokedAt: a.purchaseDate }], a.purchaseDate), /Conflicting/);
});
test('Renewal cannot belong to another app, account, product or environment', () => {
  for (const extra of [{ appTransactionId: 'someone-else' }, { bundleId: 'other.app' },
    { productId: 'wrong-product' }, { environment: 'Sandbox' }]) {
    assert.throws(() => run([renewal('r1', '2026-11-22T10:00:00.000Z', extra)]), /scope/);
  }
});
test('Initial app must match expected bundle and environment', () => {
  assert.throws(() => run([], initial, { bundleId: 'wrong' }), /scope/);
  assert.throws(() => run([], initial, { environment: 'Sandbox' }), /scope/);
});
test('Future and pre-app renewal dates are rejected', () => {
  assert.throws(() => run([renewal('r1', '2027-01-01T00:00:00.000Z')]));
  assert.throws(() => run([renewal('r1', '2026-01-01T00:00:00.000Z')]));
  assert.throws(() => run([], initial - 1));
});
test('Invalid timestamp and revocation chronology are rejected', () => {
  for (const date of [NaN, Infinity, '123', -1, 0.5]) assert.throws(() => addThreeCalendarYearsUTC(date));
  assert.throws(() => run([renewal('r1', '2026-11-22T10:00:00.000Z', { revokedAt: initial - 1 })]));
  assert.throws(() => run([renewal('r1', '2026-11-22T10:00:00.000Z', { revokedAt: initial + 1 })]));
});
test('Leap day clamps to February 28 while preserving UTC time', () => {
  assert.equal(addThreeCalendarYearsUTC(ms('2028-02-29T12:34:56.789Z')), ms('2031-02-28T12:34:56.789Z'));
});
test('Calendar years account for leap years instead of fixed day counts', () => {
  assert.equal(addThreeCalendarYearsUTC(ms('2027-03-01T12:00:00.000Z')), ms('2030-03-01T12:00:00.000Z'));
});
test('Input data remains unchanged', () => {
  const r = renewal('r1', '2026-11-22T10:00:00.000Z');
  const before = JSON.stringify([app, r, scope]); run([r]);
  assert.equal(JSON.stringify([app, r, scope]), before);
});
