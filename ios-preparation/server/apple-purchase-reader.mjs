/** Internal service only; no HTTP endpoint, installation linking or database writes. */
import { SignedDataVerifier, AppStoreServerAPIClient, Environment, ProductType, Order, GetTransactionHistoryVersion, Type }
  from '@apple/app-store-server-library';
import { calculatePeriods } from '../entitlements/periods.mjs';

function requireValue(condition, message) { if (!condition) throw new Error(message); }
function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 255 && value.trim() === value; }
function time(value) { return Number.isSafeInteger(value) && value >= 0 && value <= 253402300799999; }
function signedValue(value) {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= 65536, 'Invalid signed payload');
  return value;
}
function checkedConfig(config) {
  requireValue(config && validId(config.bundleId) && validId(config.renewalProductId), 'Missing static product configuration');
  requireValue([Environment.PRODUCTION, Environment.SANDBOX].includes(config.environment), 'Unsupported environment');
  requireValue(Number.isSafeInteger(config.appAppleId) && config.appAppleId > 0, 'Missing App Store app ID');
  return Object.freeze({ bundleId: config.bundleId, renewalProductId: config.renewalProductId,
    environment: config.environment, appAppleId: config.appAppleId });
}

export function createOfficialAppleVerifier(config, appleRootCertificates) {
  const c = checkedConfig(config);
  requireValue(Array.isArray(appleRootCertificates) && appleRootCertificates.length > 0 &&
    appleRootCertificates.every(cert => Buffer.isBuffer(cert) && cert.length > 0), 'Missing configured Apple DER root certificates');
  // No caller option to disable certificate revocation/expiration checks.
  return new SignedDataVerifier(appleRootCertificates, true, c.environment, c.bundleId, c.appAppleId);
}

export function createOfficialApplePurchaseReader({ config, appleRootCertificates,
  signingKey, keyId, issuerId, clock = Date.now, resolveBaseAccess }) {
  const c = checkedConfig(config);
  requireValue(typeof signingKey === 'string' && signingKey.includes('PRIVATE KEY') &&
    validId(keyId) && validId(issuerId), 'Missing server-held App Store credentials');
  const verifier = createOfficialAppleVerifier(c, appleRootCertificates);
  const apiClient = new AppStoreServerAPIClient(signingKey, keyId, issuerId, c.bundleId, c.environment);
  return createApplePurchaseReader({ config: c, verifier, apiClient, clock, resolveBaseAccess });
}

/** verifier/apiClient/resolveBaseAccess are trusted server dependencies, never request fields. */
export function createApplePurchaseReader({ config, verifier, apiClient, clock = Date.now,
  resolveBaseAccess = async () => 'unknown' }) {
  const c = checkedConfig(config);
  requireValue(verifier && typeof verifier.verifyAndDecodeAppTransaction === 'function' &&
    typeof verifier.verifyAndDecodeTransaction === 'function', 'Missing verifier');
  requireValue(apiClient && typeof apiClient.getTransactionHistory === 'function', 'Missing authenticated Apple API client');
  requireValue(typeof clock === 'function' && typeof resolveBaseAccess === 'function', 'Invalid trusted dependency');

  async function read(signedAppTransaction) {
    const now = clock();
    requireValue(time(now), 'Invalid server time');
    const appPayload = await verifier.verifyAndDecodeAppTransaction(signedValue(signedAppTransaction));
    requireValue(appPayload && appPayload.bundleId === c.bundleId && appPayload.receiptType === c.environment &&
      appPayload.appAppleId === c.appAppleId, 'App scope mismatch');
    requireValue(validId(appPayload.appTransactionId) && time(appPayload.originalPurchaseDate) &&
      appPayload.originalPurchaseDate <= now && time(appPayload.receiptCreationDate) &&
      appPayload.receiptCreationDate <= now, 'Invalid verified app fields');

    const records = new Map(), revisions = new Set();
    let revision = null, complete = false, count = 0;
    const filter = Object.freeze({ productIds: [c.renewalProductId],
      productTypes: [ProductType.NON_RENEWABLE], sort: Order.ASCENDING });
    // Deliberately do not request revoked=false: refunds must be included.
    for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
      const page = await apiClient.getTransactionHistory(appPayload.appTransactionId, revision,
        structuredClone(filter), GetTransactionHistoryVersion.V2);
      requireValue(page && page.bundleId === c.bundleId && page.environment === c.environment &&
        page.appAppleId === c.appAppleId && typeof page.hasMore === 'boolean' &&
        Array.isArray(page.signedTransactions), 'Invalid history envelope');
      count += page.signedTransactions.length;
      requireValue(count <= 10000, 'History exceeds processing limit');
      for (const signed of page.signedTransactions) {
        const tx = await verifier.verifyAndDecodeTransaction(signedValue(signed));
        requireValue(tx && tx.bundleId === c.bundleId && tx.environment === c.environment &&
          tx.appTransactionId === appPayload.appTransactionId && tx.productId === c.renewalProductId &&
          tx.type === Type.NON_RENEWING_SUBSCRIPTION && tx.inAppOwnershipType === 'PURCHASED' &&
          tx.quantity === 1, 'Renewal scope/type mismatch');
        requireValue(validId(tx.transactionId) && time(tx.purchaseDate) &&
          tx.purchaseDate >= appPayload.originalPurchaseDate && tx.purchaseDate <= now &&
          time(tx.signedDate) && tx.signedDate >= tx.purchaseDate && tx.signedDate <= now,
          'Invalid verified transaction fields');
        const revokedAt = tx.revocationDate === undefined ? null : tx.revocationDate;
        requireValue(revokedAt === null || (time(revokedAt) && revokedAt >= tx.purchaseDate && revokedAt <= now),
          'Invalid revocation date');
        const normalized = { transactionId: tx.transactionId, appTransactionId: tx.appTransactionId,
          bundleId: tx.bundleId, environment: tx.environment, productId: tx.productId,
          purchaseDate: tx.purchaseDate, revokedAt, signedDate: tx.signedDate };
        const previous = records.get(tx.transactionId);
        if (previous) {
          requireValue(previous.purchaseDate === normalized.purchaseDate, 'Transaction purchase date changed');
          if (previous.signedDate === normalized.signedDate)
            requireValue(JSON.stringify(previous) === JSON.stringify(normalized), 'Conflicting signed transaction snapshots');
        }
        if (!previous || normalized.signedDate > previous.signedDate) records.set(tx.transactionId, normalized);
      }
      if (!page.hasMore) { complete = true; break; }
      requireValue(validId(page.revision) && !revisions.has(page.revision), 'Missing or repeated history cursor');
      revisions.add(page.revision); revision = page.revision;
    }
    requireValue(complete, 'Incomplete transaction history');
    const snapshot = {
      app: { bundleId: c.bundleId, environment: c.environment, appTransactionId: appPayload.appTransactionId,
        purchaseDate: appPayload.originalPurchaseDate, signedDate: appPayload.receiptCreationDate },
      renewals: [...records.values()], scope: c, verifiedAt: now
    };
    // Resolver returns a policy decision from trusted server state; it is NOT an Apple payload field.
    // Give it a copy to prevent accidental mutation of the verified period inputs.
    const baseState = await resolveBaseAccess(structuredClone(snapshot));
    requireValue(['active', 'revoked', 'unknown'].includes(baseState), 'Invalid base access decision');
    if (baseState === 'unknown') return { snapshot, decision: {
      status: 'pending-verification', baseAccess: false, pushActive: false, environment: c.environment
    } };
    const periods = calculatePeriods({ app: { ...snapshot.app, revoked: baseState === 'revoked' },
      renewals: snapshot.renewals, scope: c, now });
    const decision = c.environment === Environment.PRODUCTION
      ? { ...periods, environment: c.environment }
      : { ...periods, baseAccess: false, pushActive: false, status: 'sandbox',
        testPeriodStatus: periods.status, testPushActive: periods.pushActive, environment: c.environment };
    return { snapshot, decision };
  }
  return Object.freeze({ read });
}
