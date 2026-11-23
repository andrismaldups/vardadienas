import {createFixedJsonPost} from './fixed-json-post.mjs';
// Passive HTTPS transport. Configure a release-owned origin explicitly; never
// derive it from backup files, server replies, query strings or user input.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const key=/^[A-Za-z0-9+/]{43}=$/;
const exact=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(n=>Object.hasOwn(v,n));
const paths={challenge:'/v1/ios/recovery/challenge',recover:'/v1/ios/recovery/complete'};
export function createRecoveryTransport({origin=null,bundleId,environment,fetchTransport,timeoutMs=15000}){
 const http=createFixedJsonPost({origin,fetchTransport,timeoutMs,errorPrefix:'RECOVERY'});
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!['Sandbox','Production'].includes(environment))throw Error('RECOVERY_SCOPE_INVALID');
 return Object.freeze({configured:http.configured,
  async issueChallenge(keyId){
   if(typeof keyId!=='string'||!key.test(keyId))throw Error('RECOVERY_KEY_INVALID');
   const c=await http.post(paths.challenge,{keyId});
   if(!exact(c,['challengeId','installationId','bundleId','identityEnvironment','keyId','challenge','expiresAt'])||!uuid.test(c.challengeId)||!uuid.test(c.installationId)||c.bundleId!==bundleId||c.identityEnvironment!==environment||c.keyId!==keyId||typeof c.challenge!=='string'||!nonce.test(c.challenge)||!Number.isSafeInteger(c.expiresAt)||c.expiresAt<=0)throw Error('RECOVERY_CHALLENGE_INVALID');
   // Server validates expiry using its clock. Do not rely on the iPhone clock.
   return c;
  },
  async recover(input){
   const names=['challengeId','challenge','recoveryId','candidateHash','assertion'];
   if(!exact(input,names)||!uuid.test(input.challengeId)||!uuid.test(input.recoveryId)||typeof input.challenge!=='string'||!nonce.test(input.challenge)||typeof input.candidateHash!=='string'||! /^[a-f0-9]{64}$/.test(input.candidateHash)||typeof input.assertion!=='string'||input.assertion.length===0||input.assertion.length>16384||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.assertion))throw Error('RECOVERY_PROOF_INVALID');
   const ack=await http.post(paths.recover,input);
   if(!exact(ack,['installationId','recoveryId','candidateHash'])||!uuid.test(ack.installationId)||ack.recoveryId!==input.recoveryId||ack.candidateHash!==input.candidateHash)throw Error('RECOVERY_ACK_INVALID');
   return ack;
  }
 });
}
