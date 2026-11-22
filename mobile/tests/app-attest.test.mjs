import test from 'node:test';import assert from 'node:assert/strict';import {createAttestationReader} from '../src/app-attest-enrollment.mjs';
const challenge={challengeId:'12345678-abcd-1234-abcd-123456789abc',installationId:'87654321-abcd-1234-abcd-123456789abc',bundleId:'lv.demo.vardadienas',challenge:'A'.repeat(43)};
test('App Attest reader never accepts a JS-supplied JWS and keeps support checks side-effect free',async()=>{
 const calls=[];const native={status:async()=>({supported:true}),attest:async input=>{calls.push(input);return {keyId:'key',attestation:'proof',signedAppTransaction:'native.proof.signature'};}};
 const reader=createAttestationReader({native,bundleId:challenge.bundleId});assert.deepEqual(await reader.status(),{supported:true});assert.equal(calls.length,0);
 const result=await reader.attest({...challenge,signedAppTransaction:'foreign.proof.signature'});assert.equal(calls[0].signedAppTransaction,undefined);assert.equal(result.signedAppTransaction,'native.proof.signature');
});
test('Foreign/invalid challenges are rejected before native calls',async()=>{
 const reader=createAttestationReader({bundleId:challenge.bundleId,native:{attest:()=>{throw Error('must not call');}}});
 for(const patch of [{bundleId:'other.app'},{challengeId:'../x'},{challenge:'short'}])await assert.rejects(reader.attest({...challenge,...patch}),/INVALID_CHALLENGE/);
});
test('Attestation retries and unsupported/recovery errors are sanitized; no auto key generation loop',async()=>{
 let calls=0;const reader=createAttestationReader({bundleId:challenge.bundleId,native:{attest:async()=>{calls++;throw {code:'ATTEST_RETRY_LATER',message:'private Apple error'};}}});
 await assert.rejects(reader.attest(challenge),e=>e.message==='ATTEST_RETRY_LATER');assert.equal(calls,1);
});
