import {verifyAttestation} from 'node-app-attest';
import {decodeSequence} from 'cbor2';
import {X509Certificate,createHash,createPublicKey,timingSafeEqual} from 'node:crypto';
// Third-party implementation pinned in package-lock, not an Apple SDK. Adds
// bounded CBOR/certificate-time/chain-order checks and exact environment scope.
export function createAppAttestVerifier({bundleId,appIdPrefix,environment,clock=Date.now}){
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!/^[A-Z0-9]{10}$/.test(appIdPrefix)||!['production','development'].includes(environment))throw Error('INVALID_ATTEST_VERIFIER_CONFIG');
 return async input=>{
  try{
   if(!Buffer.isBuffer(input.attestation)||input.attestation.length>98304||!Buffer.isBuffer(input.clientData)||input.clientData.length>8192||!Buffer.isBuffer(input.clientDataHash)||input.clientDataHash.length!==32||input.appId!==appIdPrefix+'.'+bundleId||input.environment!==environment)throw Error('scope');
   const expected=createHash('sha256').update(input.clientData).digest();if(!timingSafeEqual(expected,input.clientDataHash))throw Error('hash');
   const decoded=[...decodeSequence(input.attestation,{maxDepth:16})];
   if(decoded.length!==1||!Array.isArray(decoded[0]?.attStmt?.x5c)||decoded[0].attStmt.x5c.length!==2)throw Error('CBOR');
   const certificates=decoded[0].attStmt.x5c.map(cert=>new X509Certificate(cert));
   const now=clock();if(!Number.isSafeInteger(now)||now<0||certificates.some(cert=>!Number.isFinite(Date.parse(cert.validFrom))||!Number.isFinite(Date.parse(cert.validTo))||now<Date.parse(cert.validFrom)||now>Date.parse(cert.validTo)))throw Error('certificate time');
   if(certificates[0].ca||!certificates[1].ca||!certificates[0].checkIssued(certificates[1]))throw Error('chain order');
   // Library hashes the raw context once. Passing clientDataHash here instead
   // would hash twice and fail Apple's certificate nonce validation.
   const result=verifyAttestation({attestation:input.attestation,challenge:input.clientData,keyId:input.keyId,bundleIdentifier:bundleId,teamIdentifier:appIdPrefix,allowDevelopmentEnvironment:environment==='development'});
   if(result.keyId!==input.keyId||result.environment!==environment)throw Error('verified scope');
   const key=createPublicKey(result.publicKey);if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('key type');
   return {keyId:result.keyId,appId:appIdPrefix+'.'+bundleId,environment,counter:0,publicKeyPem:result.publicKey};
  }catch{throw Error('APP_ATTEST_VERIFICATION_FAILED');}
 };
}
