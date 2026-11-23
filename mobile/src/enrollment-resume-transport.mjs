import {createFixedJsonPost} from './fixed-json-post.mjs';import {validateCredential} from './installation-identity.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const key=/^[A-Za-z0-9+/]{43}=$/;
const base64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const exact=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(n=>Object.hasOwn(v,n));
const names=['challengeId','installationId','challenge','keyId','attestation','signedAppTransaction','resumeChallengeId','resumeChallenge','assertion'];
export function createEnrollmentResumeTransport({origin=null,bundleId,environment,fetchTransport,timeoutMs=15000}){
 const http=createFixedJsonPost({origin,fetchTransport,timeoutMs,maxRequestBytes:229376,errorPrefix:'RESUME'});
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!['Sandbox','Production'].includes(environment))throw Error('RESUME_SCOPE_INVALID');
 return Object.freeze({configured:http.configured,
  async issueChallenge(input){
   if(!exact(input,['originalChallengeId','keyId'])||!uuid.test(input.originalChallengeId)||typeof input.keyId!=='string'||!key.test(input.keyId))throw Error('RESUME_PROOF_INVALID');
   const c=await http.post('/v1/ios/enrollment/resume/challenge',input);
   if(!exact(c,['resumeChallengeId','originalChallengeId','installationId','bundleId','identityEnvironment','keyId','resumeChallenge','expiresAt'])||!uuid.test(c.resumeChallengeId)||!uuid.test(c.installationId)||c.originalChallengeId!==input.originalChallengeId||c.bundleId!==bundleId||c.identityEnvironment!==environment||c.keyId!==input.keyId||typeof c.resumeChallenge!=='string'||!nonce.test(c.resumeChallenge)||!Number.isSafeInteger(c.expiresAt)||c.expiresAt<=0)throw Error('RESUME_CHALLENGE_INVALID');
   return c;
  },
  async resume(input){
   if(!exact(input,names)||!uuid.test(input.challengeId)||!uuid.test(input.installationId)||!uuid.test(input.resumeChallengeId)||typeof input.challenge!=='string'||!nonce.test(input.challenge)||typeof input.resumeChallenge!=='string'||!nonce.test(input.resumeChallenge)||typeof input.keyId!=='string'||!key.test(input.keyId)||typeof input.attestation!=='string'||!input.attestation||input.attestation.length>131072||!base64.test(input.attestation)||typeof input.signedAppTransaction!=='string'||input.signedAppTransaction.length>65536||! /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(input.signedAppTransaction)||typeof input.assertion!=='string'||!input.assertion||input.assertion.length>16384||!base64.test(input.assertion))throw Error('RESUME_PROOF_INVALID');
   const result=await http.post('/v1/ios/enrollment/resume/complete',input);
   let credential;try{credential=validateCredential(result,{bundleId,environment});}catch{throw Error('RESUME_CREDENTIAL_INVALID');}
   if(credential.installationId!==input.installationId)throw Error('RESUME_CREDENTIAL_INVALID');
   return credential;
  }
 });
}
