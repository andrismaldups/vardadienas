import {Capacitor,registerPlugin} from '@capacitor/core';import {createEnrollmentResumeTransport} from './enrollment-resume-transport.mjs';import {validateCredential} from './installation-identity.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
// Passive coordinator; no startup call, HTTP origin or automatic key reset.
export function createEnrollmentResumer({native,transport,identity,bundleId,environment}){
 let busy=false;
 return {async resume(){
  if(!transport||transport.configured===false||typeof transport.issueChallenge!=='function'||typeof transport.resume!=='function')throw Error('RESUME_NOT_CONFIGURED');
  if(busy)throw Error('RESUME_BUSY');busy=true;
  try{
   const cached=await native.pending(),p=cached?.proof;
   if(p===null)return {resumed:false};
   if(!p||p.bundleId!==bundleId||!uuid.test(p.challengeId)||!uuid.test(p.installationId)||typeof p.keyId!=='string'||! /^[A-Za-z0-9+/]{43}=$/.test(p.keyId)||typeof p.challenge!=='string'||!nonce.test(p.challenge)||typeof p.attestation!=='string'||p.attestation.length===0||p.attestation.length>131072||typeof p.signedAppTransaction!=='string'||p.signedAppTransaction.length===0||p.signedAppTransaction.length>65536)throw Error('RESUME_CACHE_INVALID');
   const existing=await identity.read();
   if(existing){const c=validateCredential(existing,{bundleId,environment});if(c.installationId!==p.installationId)throw Error('RESUME_IDENTITY_CONFLICT');return {resumed:true,installationId:c.installationId};}
   const c=await transport.issueChallenge({originalChallengeId:p.challengeId,keyId:p.keyId});
   if(!c||!uuid.test(c.resumeChallengeId)||c.originalChallengeId!==p.challengeId||c.installationId!==p.installationId||c.bundleId!==bundleId||c.identityEnvironment!==environment||c.keyId!==p.keyId||typeof c.resumeChallenge!=='string'||!nonce.test(c.resumeChallenge))throw Error('RESUME_CHALLENGE_INVALID');
   // Native reads/hashes its own cached attestation/JWS, never JS-supplied proof.
   const proof=await native.resume({resumeChallengeId:c.resumeChallengeId,originalChallengeId:c.originalChallengeId,installationId:c.installationId,bundleId,identityEnvironment:environment,keyId:c.keyId,resumeChallenge:c.resumeChallenge});
   if(!proof||['challengeId','installationId','challenge','keyId','attestation','signedAppTransaction'].some(k=>proof[k]!==p[k])||proof.resumeChallengeId!==c.resumeChallengeId||proof.resumeChallenge!==c.resumeChallenge||typeof proof.assertion!=='string'||proof.assertion.length===0||proof.assertion.length>16384)throw Error('RESUME_PROOF_INVALID');
   const payload=Object.fromEntries(['challengeId','installationId','challenge','keyId','attestation','signedAppTransaction','resumeChallengeId','resumeChallenge','assertion'].map(k=>[k,proof[k]]));
   const credential=validateCredential(await transport.resume(payload),{bundleId,environment});
   if(credential.installationId!==p.installationId)throw Error('RESUME_IDENTITY_CONFLICT');
   await identity.store(credential);
   const confirmed=await identity.read();if(!confirmed||validateCredential(confirmed,{bundleId,environment}).token!==credential.token||confirmed.installationId!==credential.installationId)throw Error('RESUME_SAVE_UNCONFIRMED');
   return {resumed:true,installationId:credential.installationId};
  }catch(error){if(/^RESUME_(CACHE_INVALID|IDENTITY_CONFLICT|CHALLENGE_INVALID|PROOF_INVALID|SAVE_UNCONFIRMED)$/.test(error?.message??''))throw Error(error.message);throw Error('RESUME_INCOMPLETE');}
  finally{busy=false;}
 }};
}
export function createNativeEnrollmentResumer(options){
 if(!Capacitor.isNativePlatform())throw Error('RESUME_NATIVE_REQUIRED');
 const transport=options.transport??createEnrollmentResumeTransport(options);
 return createEnrollmentResumer({...options,transport,native:registerPlugin('AppAttestEnrollment')});
}
