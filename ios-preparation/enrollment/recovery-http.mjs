import {createIOSPostBoundary} from './http-json-boundary.mjs';
// Deployment-neutral Request/Response adapter, NOT a Worker export or D1 binding.
// The deployment must inject a trusted ingress/rate-limit gate; absent gate fails closed.
const exact=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(n=>Object.hasOwn(v,n));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
export function createRecoveryHttpHandler({origin,service,admitRequest=null,bodyTimeoutMs=5000}){
 return createIOSPostBoundary({origin,admitRequest,bodyTimeoutMs,errorPrefix:'RECOVERY',
  ready:()=>typeof service?.issueChallenge==='function'&&typeof service?.recover==='function',
  rejectedErrors:['RECOVERY_REJECTED','RECOVERY_ASSERTION_REJECTED','RECOVERY_COMMIT_REJECTED'],
  handlers:{
   '/v1/ios/recovery/challenge':async value=>{
    if(!exact(value,['keyId'])||typeof value.keyId!=='string'||! /^[A-Za-z0-9+/]{43}=$/.test(value.keyId))throw Error('INVALID_REQUEST');
    return service.issueChallenge(value.keyId);
   },
   '/v1/ios/recovery/complete':async value=>{
    if(!exact(value,['challengeId','challenge','recoveryId','candidateHash','assertion'])||!uuid.test(value.challengeId)||!uuid.test(value.recoveryId)||typeof value.challenge!=='string'||!nonce.test(value.challenge)||typeof value.candidateHash!=='string'||! /^[a-f0-9]{64}$/.test(value.candidateHash)||typeof value.assertion!=='string'||value.assertion.length===0||value.assertion.length>16384||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.assertion))throw Error('INVALID_REQUEST');
    return service.recover(value);
   }
  }
 });
}
