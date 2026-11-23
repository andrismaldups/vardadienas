import {createIOSPostBoundary} from './http-json-boundary.mjs';

export function createEnrollmentHttpHandler({origin, service, admitRequest, bodyTimeoutMs}) {
 return createIOSPostBoundary({
  origin, admitRequest, bodyTimeoutMs, maxBodyBytes: 229376, errorPrefix: 'ENROLLMENT',
  ready: () => typeof service?.issueChallenge === 'function' && typeof service?.enroll === 'function',
  rejectedErrors: ['INVALID_ENROLLMENT_PROOF', 'CHALLENGE_REJECTED', 'CHALLENGE_EXPIRED',
   'ATTESTATION_REJECTED', 'APP_ATTEST_VERIFICATION_FAILED', 'PURCHASE_SCOPE_MISMATCH',
   'PAID_PURCHASE_NOT_CONFIRMED', 'CHALLENGE_COMMIT_REJECTED'],
  handlers: {
   '/v1/ios/enrollment/challenge': value => {
    if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).length) throw Error('INVALID_REQUEST');
    return service.issueChallenge();
   },
   '/v1/ios/enrollment/complete': value => {
    const fields = ['challengeId', 'installationId', 'challenge', 'keyId', 'attestation', 'signedAppTransaction'];
    if (!value || Array.isArray(value) || typeof value !== 'object' ||
        Object.keys(value).length !== fields.length || !fields.every(field => typeof value[field] === 'string')) {
     throw Error('INVALID_REQUEST');
    }
    return service.enroll(value);
   }
  }
 });
}
