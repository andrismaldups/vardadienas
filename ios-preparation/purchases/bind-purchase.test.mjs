import {authenticateInstallation,hashInstallationToken} from '../identity/authenticate.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createApplePurchaseReader} from '../server/apple-purchase-reader.mjs';
import {createPurchaseBindingService} from './bind-purchase.mjs';
const id='12345678-abcd-1234-abcd-123456789abc',otherId='87654321-abcd-1234-abcd-123456789abc';
const NOW=Date.parse('2028-11-22T12:00:00Z'),PURCHASE=Date.parse('2026-11-22T12:00:00Z');
const config={bundleId:'lv.demo.vardadienas',environment:'Production',appAppleId:12345,renewalProductId:'lv.demo.push.3years'};
async function fixture(options={}){
 let now=NOW;const writes=[],links=new Map(),purchases=new Map(),consumed=new Set();let nonce=0;
 const reader=createApplePurchaseReader({config,clock:()=>now,resolveBaseAccess:async()=>options.baseAccess??'active',
 verifier:{verifyAndDecodeAppTransaction:async()=>{if(options.badSignature)throw Error('signature rejected');return {bundleId:config.bundleId,receiptType:'Production',appAppleId:12345,appTransactionId:'original-app-purchase',originalPurchaseDate:PURCHASE,receiptCreationDate:NOW};},verifyAndDecodeTransaction:async()=>{throw Error('no renewal fixture');}},
 apiClient:{getTransactionHistory:async()=>({bundleId:config.bundleId,environment:'Production',appAppleId:12345,hasMore:false,signedTransactions:[]})}});
 const authenticate=async installationId=>authenticateInstallation({headers:new Headers({Authorization:'Bearer '+'A'.repeat(43),'X-Installation-Id':installationId}),lookup:async()=>({id:installationId,platform:'ios',bundleId:config.bundleId,environment:'Production',tokenHash:hashInstallationToken('A'.repeat(43)),revoked:false}),bundleId:config.bundleId,environment:'Production'});
 const installation=await authenticate(id);
 const repository={commitVerifiedBinding:async plan=>{
  if(consumed.has(plan.binding.nonceId))throw Error('nonce consumed');
  const existing=links.get(plan.installation.id),key=plan.snapshot.app.appTransactionId;
  if(existing&&existing!==key)throw Error('purchase reassignment requires recovery');
  const previous=purchases.get(key);if(previous&&previous.purchaseDate!==plan.snapshot.app.purchaseDate)throw Error('original purchase date changed');
  // Test double for the required atomic transaction, not a deployed DB adapter.
  const linked=plan.decision.status!=='revoked';
  purchases.set(key,structuredClone(plan.snapshot.app));if(linked)links.set(plan.installation.id,key);consumed.add(plan.binding.nonceId);writes.push(plan);return {linked};
 }};
 const verifyDeviceBinding=async({installation,appJwsHash})=>({verified:true,installationId:installation.id,appJwsHash,bundleId:config.bundleId,identityEnvironment:'Production',nonceId:'nonce-'+(++nonce),expiresAt:now+60000});
 const deps={bundleId:config.bundleId,identityEnvironment:'Production',appleEnvironment:'Production',purchaseReader:reader,repository,verifyDeviceBinding,clock:()=>now};
 return {deps,reader,repository,writes,links,purchases,installation,authenticate,setNow:value=>now=value,service:createPurchaseBindingService({...deps,...options.deps}),request:{installation,signedAppTransaction:'header.payload.signature',evidence:{opaque:'device assertion'}}};
}
test('Verified purchase binds using original Apple date and does not return raw proof/transaction IDs',async()=>{
 const f=await fixture();const result=await f.service.bind(f.request);assert.equal(result.linked,true);assert.equal(result.pushActive,true);assert.equal(result.pushExpiresAt,Date.parse('2029-11-22T12:00:00Z'));assert.equal(f.writes[0].snapshot.app.purchaseDate,PURCHASE);assert(!JSON.stringify(result).includes('original-app-purchase'));
});
test('Reinstall/new identity and repeated linking do not restart the initial three-year period',async()=>{
 const f=await fixture();const first=await f.service.bind(f.request);f.setNow(Date.parse('2030-01-01T00:00:00Z'));
 const later=await f.service.bind({...f.request,installation:await f.authenticate(otherId)});assert.equal(later.pushExpiresAt,first.pushExpiresAt);assert.equal(later.pushActive,false);assert.equal(later.status,'expired');assert.equal(f.purchases.size,1);assert.equal(f.links.size,2);
 const again=await f.service.bind(f.request);assert.equal(again.pushExpiresAt,first.pushExpiresAt);assert.equal(f.purchases.size,1);
});
test('Unconfigured device binding rejects before reading Apple history or storing anything',async()=>{
 const f=await fixture();const service=createPurchaseBindingService({...f.deps,verifyDeviceBinding:undefined});await assert.rejects(service.bind(f.request),/NOT_CONFIGURED/);assert.equal(f.writes.length,0);
});
test('Foreign authenticated scope and client date/active flags cannot grant a binding',async()=>{
 const f=await fixture();await assert.rejects(f.service.bind({...f.request,installation:{...f.installation,platform:'pwa'}}),/IDENTITY_REQUIRED/);
 const result=await f.service.bind({...f.request,purchaseDate:Date.now(),pushActive:true,expiresAt:9999999999999});assert.equal(result.pushExpiresAt,Date.parse('2029-11-22T12:00:00Z'));
});
test('Device proof for another identity or JWS is rejected',async()=>{
 const f=await fixture();for(const patch of [{installationId:otherId},{appJwsHash:'0'.repeat(64)},{verified:false},{expiresAt:NOW-1}]){
 const service=createPurchaseBindingService({...f.deps,verifyDeviceBinding:async args=>({...await f.deps.verifyDeviceBinding(args),...patch})});await assert.rejects(service.bind(f.request),/BINDING_REJECTED/);}assert.equal(f.writes.length,0);
});
test('Invalid Apple signature never reaches a binding write',async()=>{
 const f=await fixture({badSignature:true});await assert.rejects(f.service.bind(f.request),/signature/);assert.equal(f.writes.length,0);
});
test('Unknown paid-app validity is pending and revoked purchase grants no new link or Push',async()=>{
 const pending=await fixture({baseAccess:'unknown'});assert.deepEqual(await pending.service.bind(pending.request),{linked:false,status:'pending-verification',baseAccess:false,pushActive:false});assert.equal(pending.writes.length,0);
 const revoked=await fixture({baseAccess:'revoked'});const r=await revoked.service.bind(revoked.request);assert.equal(r.linked,false);assert.equal(r.baseAccess,false);assert.equal(r.pushActive,false);
});
test('A challenge expiring while Apple is being read cannot be committed',async()=>{
 const f=await fixture();const service=createPurchaseBindingService({...f.deps,purchaseReader:{read:async proof=>{const result=await f.reader.read(proof);f.setNow(NOW+61000);return result;}}});await assert.rejects(service.bind(f.request),/EXPIRED/);assert.equal(f.writes.length,0);
});
test('Missing repository or failure to confirm the write does not report a successful link',async()=>{
 const f=await fixture();await assert.rejects(createPurchaseBindingService({...f.deps,repository:null}).bind(f.request),/NOT_CONFIGURED/);
 await assert.rejects(createPurchaseBindingService({...f.deps,repository:{commitVerifiedBinding:async()=>({})}}).bind(f.request),/UNCONFIRMED/);
});
test('Verified but wrong Apple scope is rejected before repository transaction',async()=>{
 const f=await fixture();const service=createPurchaseBindingService({...f.deps,appleEnvironment:'Sandbox'});await assert.rejects(service.bind(f.request),/SCOPE_MISMATCH/);assert.equal(f.writes.length,0);
});

test('A client-supplied copy of the authenticated identity cannot replace the internal server context',async()=>{
 const f=await fixture();await assert.rejects(f.service.bind({...f.request,installation:{...f.installation}}),/IDENTITY_REQUIRED/);assert.equal(f.writes.length,0);
});
test('Consumed device challenge cannot be replayed into a second commit',async()=>{
 const f=await fixture();const service=createPurchaseBindingService({...f.deps,verifyDeviceBinding:async args=>({...await f.deps.verifyDeviceBinding(args),nonceId:'single-use'})});
 await service.bind(f.request);await assert.rejects(service.bind(f.request),/nonce consumed/);assert.equal(f.writes.length,1);
});

test('Sandbox linking cannot grant production base or Push flags even if a trusted adapter regresses',async()=>{
 const f=await fixture();const service=createPurchaseBindingService({...f.deps,appleEnvironment:'Sandbox',purchaseReader:{read:async jws=>{const result=structuredClone(await f.reader.read(jws));result.snapshot.app.environment='Sandbox';result.snapshot.scope.environment='Sandbox';result.decision.environment='Sandbox';result.decision.status='sandbox';return result;}}});
 const result=await service.bind(f.request);assert.equal(result.linked,true);assert.equal(result.baseAccess,false);assert.equal(result.pushActive,false);
});
