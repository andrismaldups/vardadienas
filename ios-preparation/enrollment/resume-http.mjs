import {createIOSPostBoundary} from './http-json-boundary.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const key=/^[A-Za-z0-9+/]{43}=$/;
const base64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const exact=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(n=>Object.hasOwn(v,n));
const names=['challengeId','installationId','challenge','keyId','attestation','signedAppTransaction','resumeChallengeId','resumeChallenge','assertion'];
export function createEnrollmentResumeHttpHandler({origin,service,admitRequest=null,bodyTimeoutMs=5000}){
 return createIOSPostBoundary({origin,admitRequest,bodyTimeoutMs,maxBodyBytes:229376,errorPrefix:'RESUME',
  ready:()=>typeof service?.issueChallenge==='function'&&typeof service?.resume==='function',
  rejectedErrors:['RESUME_REJECTED','RESUME_ASSERTION_REJECTED','RESUME_EXPIRED','RESUME_COMMIT_REJECTED','INVALID_ENROLLMENT_PROOF','CHALLENGE_REJECTED','ATTESTATION_REJECTED','APP_ATTEST_VERIFICATION_FAILED','PURCHASE_SCOPE_MISMATCH','PAID_PURCHASE_NOT_CONFIRMED','CHALLENGE_COMMIT_REJECTED','PURCHASE_RECONCILIATION_REQUIRED','RENEWAL_RECONCILIATION_REQUIRED'],
  handlers:{
   '/v1/ios/enrollment/resume/challenge':async value=>{
    if(!exact(value,['originalChallengeId','keyId'])||!uuid.test(value.originalChallengeId)||typeof value.keyId!=='string'||!key.test(value.keyId))throw Error('INVALID_REQUEST');
    return service.issueChallenge(value);
   },
   '/v1/ios/enrollment/resume/complete':async value=>{
    if(!exact(value,names)||!uuid.test(value.challengeId)||!uuid.test(value.installationId)||!uuid.test(value.resumeChallengeId)||typeof value.challenge!=='string'||!nonce.test(value.challenge)||typeof value.resumeChallenge!=='string'||!nonce.test(value.resumeChallenge)||typeof value.keyId!=='string'||!key.test(value.keyId)||typeof value.attestation!=='string'||!value.attestation||value.attestation.length>131072||!base64.test(value.attestation)||typeof value.signedAppTransaction!=='string'||value.signedAppTransaction.length>65536||! /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.signedAppTransaction)||typeof value.assertion!=='string'||!value.assertion||value.assertion.length>16384||!base64.test(value.assertion))throw Error('INVALID_REQUEST');
    return service.resume(value);
   }
  }
 });
}
