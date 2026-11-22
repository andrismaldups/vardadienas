import {verifyAssertion} from 'node-app-attest';import {decodeSequence} from 'cbor2';
// Shared verifier for existing-key recovery and pre-commit enrollment resume.
export function verifyBoundAssertion({assertion,clientData,publicKeyPem,bundleId,appIdPrefix,counter}){
 if(typeof assertion!=='string'||assertion.length===0||assertion.length>16384||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(assertion))throw Error('ASSERTION_REJECTED');
 try{
  const bytes=Buffer.from(assertion,'base64'),decoded=[...decodeSequence(bytes,{maxDepth:8})];
  if(decoded.length!==1||!(decoded[0]?.authenticatorData instanceof Uint8Array)||decoded[0].authenticatorData.length!==37||!(decoded[0]?.signature instanceof Uint8Array)||decoded[0].signature.length===0||decoded[0].signature.length>144)throw Error();
  const next=verifyAssertion({assertion:bytes,payload:clientData,publicKey:publicKeyPem,bundleIdentifier:bundleId,teamIdentifier:appIdPrefix,signCount:counter}).signCount;
  if(!Number.isSafeInteger(next)||next<=counter)throw Error();return next;
 }catch{throw Error('ASSERTION_REJECTED');}
}
