import test from 'node:test';import assert from 'node:assert/strict';
import {createAppPurchaseProofReader} from '../src/app-purchase-proof.mjs';
const signed='header.payload.signature';
test('Purchase proof reads only signed native output and strips untrusted date/expiry flags',async()=>{
 const reader=createAppPurchaseProofReader({native:{read:async()=>({signedAppTransaction:signed,purchaseDate:Date.now(),pushActive:true})}});
 assert.deepEqual(await reader.read(),{signedAppTransaction:signed});
});
test('Restore requires explicit user action and never runs automatically after a read failure',async()=>{
 let reads=0,restores=0;const reader=createAppPurchaseProofReader({native:{read:async()=>{reads++;throw Error('offline');},refresh:async options=>{restores++;assert.equal(options.userInitiated,true);return {signedAppTransaction:signed};}}});
 await assert.rejects(reader.read(),/UNAVAILABLE/);await assert.rejects(reader.restore(),/USER_ACTION_REQUIRED/);assert.equal(restores,0);
 await reader.restore({userInitiated:true});assert.equal(reads,1);assert.equal(restores,1);
});
test('Malformed and oversized signed proofs never become purchase evidence',async()=>{
 for(const value of [null,'','decoded JSON',signed+'\n','x'.repeat(65537)]){
 const reader=createAppPurchaseProofReader({native:{read:async()=>({signedAppTransaction:value})}});await assert.rejects(reader.read(),/INVALID/);
 }
});
test('Unverified/device mismatch/unsupported outcomes propagate sanitized codes',async()=>{
 for(const code of ['PURCHASE_UNVERIFIED','PURCHASE_DEVICE_MISMATCH','PURCHASE_UNSUPPORTED']){
 const reader=createAppPurchaseProofReader({native:{read:async()=>{throw {code,message:'private payload'};}}});await assert.rejects(reader.read(),e=>e.message===code);
 }
});
test('Concurrent proof reads are rejected and failure permits retry',async()=>{
 let release;const native={read:()=>new Promise(r=>release=r)},reader=createAppPurchaseProofReader({native});const first=reader.read();await assert.rejects(reader.read(),/IN_PROGRESS/);release({signedAppTransaction:signed});await first;native.read=async()=>({signedAppTransaction:signed});await reader.read();
});
