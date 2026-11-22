import {verifyAttestation} from 'node-app-attest';
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createAppAttestVerifier} from './attestation-verifier.mjs';
const config={bundleId:'lv.demo.vardadienas',appIdPrefix:'ABCDEFGHIJ',environment:'production'};
const context=Buffer.from('test challenge context'),clientDataHash=createHash('sha256').update(context).digest();
const base={attestation:Buffer.from('invalid Apple attestation'),clientData:context,clientDataHash,keyId:Buffer.alloc(32).toString('base64'),appId:'ABCDEFGHIJ.lv.demo.vardadienas',environment:'production'};
test('Actual pinned CBOR/Apple-chain verification path rejects malformed attestation',async()=>{
 await assert.rejects(createAppAttestVerifier(config)(base),e=>e.message==='APP_ATTEST_VERIFICATION_FAILED');
 assert.throws(()=>verifyAttestation({attestation:base.attestation,challenge:context,keyId:base.keyId,bundleIdentifier:config.bundleId,teamIdentifier:config.appIdPrefix,allowDevelopmentEnvironment:false}));
});
test('Verifier rejects scope switches, oversized input and double-hash context mistakes',async()=>{
 const verify=createAppAttestVerifier(config);
 for(const patch of [{environment:'development'},{appId:'OTHER.other.app'},{attestation:Buffer.alloc(98305)},{clientDataHash:Buffer.alloc(32)}])await assert.rejects(verify({...base,...patch}),/VERIFICATION_FAILED/);
});
test('No placeholder bundle, missing prefix or client-selected environment can configure verification',()=>{
 for(const patch of [{bundleId:'lv.example.preview'},{appIdPrefix:''},{environment:'any'}])assert.throws(()=>createAppAttestVerifier({...config,...patch}));
});
