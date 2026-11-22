/**
 * Internal, deterministic period calculator. NOT an Apple receipt verifier.
 * Only a trusted adapter may supply the complete, verified purchase history.
 * Never expose this function directly as a client-facing entitlement endpoint.
 */
const MAX_TIMESTAMP = Date.UTC(9999, 11, 31, 23, 59, 59, 999);
function timestamp(value, field) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIMESTAMP)
    throw new TypeError(`Invalid ${field}`);
  return value;
}
function identifier(value, field) {
  if (typeof value !== 'string' || !value || value.length > 255 || value.trim() !== value)
    throw new TypeError(`Invalid ${field}`);
  return value;
}
export function addThreeCalendarYearsUTC(value) {
  const date = new Date(timestamp(value, 'period start'));
  const year = date.getUTCFullYear() + 3;
  if (year > 9999) throw new RangeError('Period exceeds supported calendar');
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCFullYear(year);
  date.setUTCMonth(month);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

export function calculatePeriods({ app, renewals, scope, now }) {
  timestamp(now, 'server time');
  if (!app || !scope || !Array.isArray(renewals)) throw new TypeError('Missing history or scope');
  const bundleId = identifier(scope.bundleId, 'bundle ID');
  const productId = identifier(scope.renewalProductId, 'renewal product ID');
  if (!['Production', 'Sandbox'].includes(scope.environment)) throw new TypeError('Invalid environment');
  const appTransactionId = identifier(app.appTransactionId, 'app transaction ID');
  const purchaseDate = timestamp(app.purchaseDate, 'app purchase date');
  if (app.bundleId !== bundleId || app.environment !== scope.environment)
    throw new TypeError('App scope mismatch');
  if (purchaseDate > now) throw new TypeError('Future app purchase');
  // A revoked app purchase must never be upgraded into a perpetual base right.
  if (typeof app.revoked !== 'boolean') throw new TypeError('Missing verified app access state');
  const unique = new Map();
  for (const record of renewals) {
    if (!record || record.appTransactionId !== appTransactionId || record.bundleId !== bundleId ||
        record.environment !== scope.environment || record.productId !== productId)
      throw new TypeError('Renewal scope mismatch');
    const id = identifier(record.transactionId, 'transaction ID');
    const date = timestamp(record.purchaseDate, 'renewal purchase date');
    if (date < purchaseDate || date > now) throw new TypeError('Renewal outside purchase history');
    const revokedAt = record.revokedAt === null ? null : timestamp(record.revokedAt, 'revocation date');
    if (revokedAt !== null && (revokedAt < date || revokedAt > now))
      throw new TypeError('Invalid revocation chronology');
    const normalized = { transactionId: id, purchaseDate: date, revokedAt };
    const existing = unique.get(id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(normalized))
      throw new TypeError('Conflicting snapshots: reconcile verified transaction state first');
    unique.set(id, normalized);
  }
  let end = addThreeCalendarYearsUTC(purchaseDate);
  const periods = [{ kind: 'initial', start: purchaseDate, end }];
  const ordered = [...unique.values()].sort((a, b) => a.purchaseDate - b.purchaseDate ||
    (a.transactionId < b.transactionId ? -1 : a.transactionId > b.transactionId ? 1 : 0));
  for (const renewal of ordered) {
    if (renewal.revokedAt !== null) continue;
    const start = Math.max(end, renewal.purchaseDate);
    end = addThreeCalendarYearsUTC(start);
    periods.push({ kind: 'renewal', transactionId: renewal.transactionId, start, end });
  }
  return {
    baseAccess: !app.revoked,
    pushActive: !app.revoked && now < end,
    pushExpiresAt: end,
    status: app.revoked ? 'revoked' : now < end ? 'active' : 'expired',
    periods
  };
}
