import {Capacitor,registerPlugin} from '@capacitor/core';
import {createRecoveryTransport} from './recovery-transport.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
// Explicit injected transport only. No default origin, fetch or startup invocation.
export function createIdentityRecovery({native,transport,bundleId,environment}){
 let busy=false;
 return {async recover(){
  if(!transport||transport.configured===false||typeof transport.issueChallenge!=='function'||typeof transport.recover!=='function')throw Error('RECOVERY_NOT_CONFIGURED');
  if(busy)throw Error('RECOVERY_BUSY');busy=true;
  try{
   const {keyId}=await native.recoveryKey();
   if(typeof keyId!=='string'||keyId.length>128||keyId.length===0)throw Error('RECOVERY_KEY_INVALID');
   const c=await transport.issueChallenge(keyId);
   if(!c||!uuid.test(c.challengeId)||!uuid.test(c.installationId)||c.bundleId!==bundleId||c.identityEnvironment!==environment||c.keyId!==keyId||!nonce.test(c.challenge))throw Error('RECOVERY_CHALLENGE_INVALID');
   // The native bridge generates/persists the candidate before signing. It never
   // accepts a JS token/hash and only returns a hash plus assertion.
   const p=await native.recoveryAssertion({challengeId:c.challengeId,installationId:c.installationId,bundleId,identityEnvironment:environment,keyId,challenge:c.challenge});
   if(!p||!uuid.test(p.recoveryId)||typeof p.candidateHash!=='string'||! /^[a-f0-9]{64}$/.test(p.candidateHash)||typeof p.assertion!=='string'||p.assertion.length===0||p.assertion.length>16384)throw Error('RECOVERY_PROOF_INVALID');
   const ack=await transport.recover({challengeId:c.challengeId,challenge:c.challenge,recoveryId:p.recoveryId,candidateHash:p.candidateHash,assertion:p.assertion});
   if(!ack||ack.installationId!==c.installationId||ack.recoveryId!==p.recoveryId||ack.candidateHash!==p.candidateHash)throw Error('RECOVERY_ACK_INVALID');
   const saved=await native.finishRecovery({installationId:ack.installationId,recoveryId:ack.recoveryId,candidateHash:ack.candidateHash});
   if(saved?.stored!==true)throw Error('RECOVERY_SAVE_UNCONFIRMED');
   return {recovered:true,installationId:c.installationId};
  }catch(error){
   // Never echo native/transport errors which may contain private response data.
   const code=error?.message;
   if(typeof code==='string'&&/^RECOVERY_(KEY_INVALID|CHALLENGE_INVALID|PROOF_INVALID|ACK_INVALID|SAVE_UNCONFIRMED)$/.test(code))throw Error(code);
   throw Error('RECOVERY_INCOMPLETE');
  }finally{busy=false;}
 }};
}
export function createNativeIdentityRecovery(options){
 if(!Capacitor.isNativePlatform())throw Error('RECOVERY_NATIVE_REQUIRED');
 const transport=options.transport??createRecoveryTransport(options);
 return createIdentityRecovery({...options,transport,native:registerPlugin('InstallationIdentity')});
}
