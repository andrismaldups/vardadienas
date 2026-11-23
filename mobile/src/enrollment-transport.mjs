import {createFixedJsonPost} from './fixed-json-post.mjs';
import {validateCredential} from './installation-identity.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const fields = ['challengeId', 'installationId', 'challenge', 'keyId', 'attestation', 'signedAppTransaction'];

export function createEnrollmentTransport({bundleId, environment, ...options}) {
 const http = createFixedJsonPost({...options, maxRequestBytes: 229376, errorPrefix: 'ENROLLMENT'});
 if (typeof bundleId !== 'string' || !/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId) ||
     bundleId.startsWith('lv.example.') || !['Sandbox', 'Production'].includes(environment)) throw Error('ENROLLMENT_SCOPE_INVALID');
 return Object.freeze({
  configured: http.configured,
  async issueChallenge() {
   const result = await http.post('/v1/ios/enrollment/challenge', {});
   if (!result || Object.keys(result).length !== 5 || result.bundleId !== bundleId ||
       !uuid.test(result.challengeId) || !uuid.test(result.installationId) ||
       typeof result.challenge !== 'string' || !nonce.test(result.challenge) ||
       !Number.isSafeInteger(result.expiresAt) || result.expiresAt <= 0) throw Error('ENROLLMENT_CHALLENGE_INVALID');
   return result;
  },
  async enroll(proof) {
   if (!proof || !fields.every(field => typeof proof[field] === 'string') ||
       !uuid.test(proof.challengeId) || !uuid.test(proof.installationId) || !nonce.test(proof.challenge) ||
       proof.attestation.length > 131072 || proof.signedAppTransaction.length > 65536) throw Error('ENROLLMENT_PROOF_INVALID');
   const payload = Object.fromEntries(fields.map(field => [field, proof[field]]));
   const result = await http.post('/v1/ios/enrollment/complete', payload);
   try {
    const credential = validateCredential(result, {bundleId, environment});
    if (credential.installationId !== payload.installationId) throw Error();
    return credential;
   } catch { throw Error('ENROLLMENT_CREDENTIAL_INVALID'); }
  }
 });
}
