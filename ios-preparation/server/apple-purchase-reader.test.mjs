import test from 'node:test';
import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { rootCertificates } from 'node:tls';
import { createApplePurchaseReader, createOfficialAppleVerifier, createOfficialApplePurchaseReader } from './apple-purchase-reader.mjs';

const ms = value => Date.parse(value);
const NOW = ms('2028-06-01T12:00:00.000Z');
const config = { bundleId: 'test.vardadienas', renewalProductId: 'test.push.3years',
  environment: 'Production', appAppleId: 12345 };
const app = { appTransactionId: 'app-1', bundleId: config.bundleId, receiptType: 'Production',
  appAppleId: 12345, originalPurchaseDate: ms('2026-11-22T10:00:00.000Z'), receiptCreationDate: NOW };
const tx = { appTransactionId: 'app-1', transactionId: 'r1', productId: config.renewalProductId,
  bundleId: config.bundleId, environment: 'Production', type: 'Non-Renewing Subscription',
  inAppOwnershipType: 'PURCHASED', quantity: 1,
  purchaseDate: ms('2027-06-01T12:00:00.000Z'), signedDate: ms('2027-06-01T12:01:00.000Z') };
const envelope = extra => ({ bundleId: config.bundleId, appAppleId: 12345,
  environment: 'Production', hasMore: false, signedTransactions: [], ...extra });

function setup(options = {}) {
  const calls = [], resolved = [];
  const verifier = {
    async verifyAndDecodeAppTransaction(value) { calls.push(['verify-app', value]);
      if (options.appError) throw Error('Invalid Apple signature');
      return structuredClone(options.app ?? app); },
    async verifyAndDecodeTransaction(value) { calls.push(['verify-tx', value]);
      if (options.transactionError) throw Error('Invalid transaction signature');
      return structuredClone(options.transactions?.[value] ?? tx); }
  };
  const apiClient = { async getTransactionHistory(...args) {
    calls.push(['history', ...args]);
    const index = calls.filter(c => c[0] === 'history').length - 1;
    if (options.apiErrorAt === index) throw Error('Apple API unavailable');
    return structuredClone(options.pages?.[index] ?? envelope({ signedTransactions: ['tx'] }));
  } };
  const dependencies = { config: options.config ?? config, verifier, apiClient, clock: () => NOW };
  if (!options.noResolver) dependencies.resolveBaseAccess = async snapshot => {
    resolved.push(snapshot);
    if (options.resolver) return options.resolver(snapshot);
    return options.baseState ?? 'active';
  };
  return { reader: createApplePurchaseReader(dependencies), calls, resolved };
}

test('Verified initial paid download plus renewal reaches period calculator', async () => {
  const { reader, calls } = setup(); const result = await reader.read('signed-app');
  assert.equal(result.decision.pushActive, true);
  assert.equal(result.decision.pushExpiresAt, ms('2032-11-22T10:00:00.000Z'));
  const call = calls.find(c => c[0] === 'history');
  assert.equal(call[1], 'app-1'); assert.equal(call[2], null); assert.equal(call[4], 'v2');
  assert.deepEqual(call[3].productIds, [config.renewalProductId]);
  assert.equal('revoked' in call[3], false);
});
test('No IAPs still allows initial paid-app period when base purchase is confirmed', async () => {
  const result = await setup({ pages: [envelope()] }).reader.read('signed-app');
  assert.equal(result.decision.pushExpiresAt, ms('2029-11-22T10:00:00.000Z'));
});
test('Bad app signature cannot query history or resolve rights', async () => {
  const h = setup({ appError: true }); await assert.rejects(h.reader.read('bad'), /signature/);
  assert.equal(h.calls.some(c => c[0] === 'history'), false); assert.equal(h.resolved.length, 0);
});
test('Bad transaction signature prevents partial grant', async () => {
  const h = setup({ transactionError: true }); await assert.rejects(h.reader.read('signed-app'), /signature/);
  assert.equal(h.resolved.length, 0);
});
test('Every page is fetched using the returned revision', async () => {
  const h = setup({ pages: [envelope({ hasMore: true, revision: 'cursor-1', signedTransactions: ['tx'] }), envelope()] });
  const r = await h.reader.read('signed-app');
  assert.equal(h.calls.filter(c => c[0] === 'history')[1][2], 'cursor-1');
  assert.equal(r.snapshot.renewals.length, 1);
});
test('An error on a later page prevents a partial history grant', async () => {
  const h = setup({ pages: [envelope({ hasMore: true, revision: 'c1', signedTransactions: ['tx'] })], apiErrorAt: 1 });
  await assert.rejects(h.reader.read('signed-app'), /unavailable/); assert.equal(h.resolved.length, 0);
});
test('Missing and repeated history cursors are rejected', async () => {
  await assert.rejects(setup({ pages: [envelope({ hasMore: true })] }).reader.read('signed-app'), /cursor/);
  const page = envelope({ hasMore: true, revision: 'same' });
  await assert.rejects(setup({ pages: [page, page] }).reader.read('signed-app'), /cursor/);
});
test('Missing completion flag and wrong history envelope cannot grant rights', async () => {
  for (const extra of [{ hasMore: undefined }, { environment: 'Sandbox' }, { bundleId: 'other' }, { appAppleId: 999 }])
    await assert.rejects(setup({ pages: [envelope(extra)] }).reader.read('signed-app'), /envelope/);
});
test('App identity/environment cannot be supplied by the wrong signed app', async () => {
  for (const extra of [{ receiptType: 'Sandbox' }, { bundleId: 'other' }, { appAppleId: 999 }])
    await assert.rejects(setup({ app: { ...app, ...extra } }).reader.read('signed-app'), /scope/);
});
test('Invalid and future app dates fail before querying history', async () => {
  for (const extra of [{ originalPurchaseDate: NOW + 1 }, { receiptCreationDate: NaN }, { appTransactionId: '' }])
    await assert.rejects(setup({ app: { ...app, ...extra } }).reader.read('signed-app'), /fields/);
});
test('Wrong account, product, app, environment or purchase type is rejected', async () => {
  for (const extra of [{ appTransactionId: 'other' }, { productId: 'other' }, { bundleId: 'other' },
    { environment: 'Sandbox' }, { type: 'Consumable' }, { quantity: 2 }, { inAppOwnershipType: 'FAMILY_SHARED' }])
    await assert.rejects(setup({ transactions: { tx: { ...tx, ...extra } } }).reader.read('signed-app'), /scope/);
});
test('History beyond hard page limit cannot grant rights', async () => {
  const pages = Array.from({ length: 100 }, (_, i) => envelope({ hasMore: true, revision: 'c' + i }));
  await assert.rejects(setup({ pages }).reader.read('signed-app'), /Incomplete/);
});
test('Identical duplicate transaction is counted once', async () => {
  const result = await setup({ pages: [envelope({ signedTransactions: ['tx', 'tx'] })] }).reader.read('signed-app');
  assert.equal(result.snapshot.renewals.length, 1); assert.equal(result.decision.periods.length, 2);
});
test('Newer signed revocation wins over older history on any page order', async () => {
  const refund = { ...tx, signedDate: NOW, revocationDate: NOW - 1 };
  for (const signedTransactions of [['tx', 'refund'], ['refund', 'tx']]) {
    const result = await setup({ pages: [envelope({ signedTransactions })], transactions: { tx, refund } }).reader.read('signed-app');
    assert.equal(result.snapshot.renewals[0].revokedAt, NOW - 1);
    assert.equal(result.decision.periods.length, 1);
  }
});
test('Equal-signed-time conflicting transaction versions are rejected', async () => {
  const refund = { ...tx, revocationDate: tx.signedDate };
  await assert.rejects(setup({ pages: [envelope({ signedTransactions: ['tx','refund'] })],
    transactions: { tx, refund } }).reader.read('signed-app'), /Conflicting/);
});
test('Default unresolved initial purchase never grants base access or Push', async () => {
  const result = await setup({ noResolver: true }).reader.read('signed-app');
  assert.equal(result.decision.status, 'pending-verification');
  assert.equal(result.decision.baseAccess, false); assert.equal(result.decision.pushActive, false);
});
test('Revoked base purchase disables rights and invalid resolver output throws', async () => {
  const result = await setup({ baseState: 'revoked' }).reader.read('signed-app');
  assert.equal(result.decision.status, 'revoked'); assert.equal(result.decision.pushActive, false);
  await assert.rejects(setup({ baseState: true }).reader.read('signed-app'), /decision/);
});
test('Resolver cannot mutate the verified purchase inputs', async () => {
  const result = await setup({ resolver: snapshot => { snapshot.app.purchaseDate = 0; snapshot.renewals.length = 0; return 'active'; } }).reader.read('signed-app');
  assert.equal(result.snapshot.app.purchaseDate, app.originalPurchaseDate); assert.equal(result.decision.periods.length, 2);
});
test('Sandbox result is explicitly barred from production Push', async () => {
  const h = setup({ config: { ...config, environment: 'Sandbox' }, app: { ...app, receiptType: 'Sandbox' },
    pages: [envelope({ environment: 'Sandbox' })] });
  const result = await h.reader.read('signed-app');
  assert.equal(result.decision.pushActive, false); assert.equal(result.decision.baseAccess, false);
  assert.equal(result.decision.testPushActive, true); assert.equal(result.decision.status, 'sandbox');
});
test('Payload size cap applies before verification', async () => {
  const h = setup(); await assert.rejects(h.reader.read('a'.repeat(65537)), /payload/); assert.equal(h.calls.length, 0);
});
test('Static configuration and root certificates are mandatory', () => {
  assert.throws(() => setup({ config: { ...config, appAppleId: undefined } }), /app ID/);
  assert.throws(() => createOfficialAppleVerifier(config, []), /certificates/);
  assert.throws(() => createOfficialAppleVerifier(config, ['client-supplied-root']), /certificates/);
  assert.throws(() => createOfficialApplePurchaseReader({ config, appleRootCertificates: [] }), /credentials/);
});
test('Actual Apple library rejects malformed and unsigned data (no network or real purchase)', async () => {
  // Public non-Apple certificate is ONLY a construction fixture for negative tests.
  // Never use the OS trust store as production Apple root configuration.
  const verifier = createOfficialAppleVerifier(config, [new X509Certificate(rootCertificates[0]).raw]);
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(app)).toString('base64url');
  for (const input of ['not-a-jws', `${header}.${payload}.`]) {
    await assert.rejects(verifier.verifyAndDecodeAppTransaction(input));
    await assert.rejects(verifier.verifyAndDecodeTransaction(input));
  }
});
