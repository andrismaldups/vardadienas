import {Capacitor,registerPlugin} from '@capacitor/core';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function createAttestationReader({native,bundleId}){
 let busy=false;
 return {
  status:()=>native.status(),
  async attest(challenge){
   if(!challenge||!uuid.test(challenge.challengeId)||!uuid.test(challenge.installationId)||challenge.bundleId!==bundleId||!/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(challenge.challenge))throw Error('ATTEST_INVALID_CHALLENGE');
   if(busy)throw Error('ATTEST_BUSY');busy=true;
   try{
    const result=await native.attest({challengeId:challenge.challengeId,installationId:challenge.installationId,bundleId,challenge:challenge.challenge});
    if(typeof result?.keyId!=='string'||typeof result.attestation!=='string'||typeof result.signedAppTransaction!=='string')throw Error('ATTEST_INVALID');
    return {challengeId:challenge.challengeId,installationId:challenge.installationId,challenge:challenge.challenge,keyId:result.keyId,attestation:result.attestation,signedAppTransaction:result.signedAppTransaction};
   }catch(error){const code=error?.code;if(['ATTEST_UNSUPPORTED','ATTEST_RETRY_LATER','ATTEST_RECOVERY_REQUIRED','ATTEST_BUSY','ATTEST_INVALID'].includes(code))throw Error(code);throw Error('ATTEST_UNAVAILABLE');}
   finally{busy=false;}
  }
 };
}
export function createNativeAttestationReader({bundleId}){
 if(!Capacitor.isNativePlatform())throw Error('ATTEST_NATIVE_REQUIRED');
 return createAttestationReader({native:registerPlugin('AppAttestEnrollment'),bundleId});
}
