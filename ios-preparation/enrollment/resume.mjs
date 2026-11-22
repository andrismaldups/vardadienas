import {randomUUID,randomBytes,createHash} from 'node:crypto';import {verifyBoundAssertion} from './assertion-verifier.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
export function resumeContext({resumeChallengeId,originalChallengeId,installationId,bundleId,identityEnvironment,resumeChallenge,keyId,attestation,signedAppTransaction}){
 return Buffer.from(['vardadienas.enroll.resume.v1',resumeChallengeId,originalChallengeId,installationId,bundleId,identityEnvironment,resumeChallenge,keyId,hash(attestation),hash(signedAppTransaction)].join('\n'));
}
export function createEnrollmentResumeService({enrollmentService,repository,bundleId,appIdPrefix,identityEnvironment,clock=Date.now}){
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||! /^[A-Z0-9]{10}$/.test(appIdPrefix)||!['Sandbox','Production'].includes(identityEnvironment))throw Error('RESUME_CONFIGURATION');
 const ready=()=>{if(typeof enrollmentService?.assertConfigured!=='function')throw Error('RESUME_NOT_CONFIGURED');enrollmentService.assertConfigured();if(typeof enrollmentService?.verifyForResume!=='function'||!['readChallenge','readResumeChallenge','insertResumeChallenge','commitEnrollment'].every(n=>typeof repository?.[n]==='function'))throw Error('RESUME_NOT_CONFIGURED');};
 const now=()=>{const t=clock();if(!Number.isSafeInteger(t)||t<0)throw Error('INVALID_SERVER_TIME');return t;};
 const valid=c=>c&&!c.consumed&&c.bundleId===bundleId&&c.appId===appIdPrefix+'.'+bundleId&&c.identityEnvironment===identityEnvironment;
 async function issueChallenge({originalChallengeId,keyId}){
  ready();if(!uuid.test(originalChallengeId)||typeof keyId!=='string'||! /^[A-Za-z0-9+/]{43}=$/.test(keyId))throw Error('RESUME_REJECTED');
  const original=await repository.readChallenge(originalChallengeId);if(!valid(original))throw Error('RESUME_REJECTED');
  const c={challengeId:randomUUID(),originalChallengeId,keyId,nonceHash:null,expiresAt:now()+300000},challenge=randomBytes(32).toString('base64url');c.nonceHash=hash(challenge);await repository.insertResumeChallenge(c);
  return {resumeChallengeId:c.challengeId,originalChallengeId,installationId:original.installationId,bundleId,identityEnvironment,keyId,resumeChallenge:challenge,expiresAt:c.expiresAt};
 }
 async function resume(input){
  ready();if(!input||!uuid.test(input.resumeChallengeId)||!nonce.test(input.resumeChallenge))throw Error('RESUME_REJECTED');
  input=structuredClone(input);const r=await repository.readResumeChallenge(input.resumeChallengeId),start=now();
  if(!r||r.consumed||r.expiresAt<=start||r.originalChallengeId!==input.challengeId||r.keyId!==input.keyId||r.nonceHash!==hash(input.resumeChallenge))throw Error('RESUME_REJECTED');
  // Original proof remains bound to its original server nonce. Expiry is relaxed
  // ONLY for proof verification; a fresh signed resume nonce authorizes commit.
  const verified=await enrollmentService.verifyForResume(input),c=verified.challenge;
  if(!valid(c)||c.installationId!==input.installationId)throw Error('RESUME_REJECTED');
  let counter;try{counter=verifyBoundAssertion({assertion:input.assertion,clientData:resumeContext({...input,originalChallengeId:c.challengeId,bundleId,identityEnvironment}),publicKeyPem:verified.attested.publicKeyPem,bundleId,appIdPrefix,counter:0});}catch{throw Error('RESUME_ASSERTION_REJECTED');}
  const commitTime=now();if(commitTime<start||commitTime>=r.expiresAt)throw Error('RESUME_EXPIRED');
  const token=randomBytes(32).toString('base64url');
  const result=await repository.commitEnrollment({...verified,attested:{...verified.attested,counter},nonceHash:c.nonceHash,commitTime,credentialHash:hash(token),resume:{challengeId:r.challengeId,nonceHash:r.nonceHash}});
  if(result?.committed!==true||result.installationId!==c.installationId)throw Error('RESUME_COMMIT_UNCONFIRMED');
  return {version:1,installationId:c.installationId,token,bundleId,environment:identityEnvironment};
 }
 return {issueChallenge,resume};
}
