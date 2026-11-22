import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
import {createEnrollmentService,enrollmentContext} from './service.mjs';import {createSQLiteEnrollmentRepository} from './sqlite-repository.mjs';import {fixture,NOW} from './enrollment-fixture.mjs';
const PURCHASE=Date.parse('2026-11-22T12:00:00Z');
const config={bundleId:'lv.demo.vardadienas'};
test('Unconfigured crypto verifier cannot issue challenges or create an identity',async()=>{
 const f=fixture({deps:{verifyAttestation:null}});await assert.rejects(f.service.issueChallenge(),/NOT_CONFIGURED/);assert.equal(f.count('ios_enrollment_challenges'),0);f.db.close();
});
test('Challenge uses random server identifiers/nonce and expires after five minutes',async()=>{
 const f=fixture();const a=await f.service.issueChallenge(),b=await f.service.issueChallenge();assert.notEqual(a.challenge,b.challenge);assert.notEqual(a.installationId,b.installationId);assert.equal(Buffer.from(a.challenge,'base64url').length,32);assert.equal(a.expiresAt,NOW+300000);assert.equal(f.count('app_installations'),0);f.db.close();
});
test('Verified pipeline atomically creates scoped credentials, attested key and original purchase link',async()=>{
 const f=fixture();const c=await f.service.issueChallenge(),input=f.input(c),credential=await f.service.enroll(input);
 assert.equal(credential.installationId,c.installationId);assert.equal(Buffer.from(credential.token,'base64url').length,32);
 const stored=f.db.prepare('SELECT * FROM ios_native_credentials').get();assert.equal(stored.token_hash,createHash('sha256').update(credential.token).digest('hex'));assert(!JSON.stringify(stored).includes(credential.token));
 assert.equal(f.count('ios_appattest_keys'),1);assert.equal(f.count('apple_installation_links'),1);assert.equal(f.repository.readChallenge(c.challengeId).consumed,true);
 assert.equal(f.db.prepare('SELECT purchase_date_ms FROM apple_app_purchases').get().purchase_date_ms,PURCHASE);
 const expected=createHash('sha256').update(enrollmentContext({...input,bundleId:config.bundleId})).digest();assert.deepEqual(f.seen[0].clientDataHash,expected);f.db.close();
});
test('Expired, altered or replayed challenge does not mint a second credential',async()=>{
 const f=fixture();const c=await f.service.issueChallenge();await assert.rejects(f.service.enroll({...f.input(c),challenge:'A'.repeat(43)}),/CHALLENGE_REJECTED/);
 await f.service.enroll(f.input(c));await assert.rejects(f.service.enroll(f.input(c)),/CHALLENGE_REJECTED/);assert.equal(f.count('ios_native_credentials'),1);
 const next=await f.service.issueChallenge();f.setNow(NOW+300001);await assert.rejects(f.service.enroll(f.input(next)),/CHALLENGE_REJECTED/);assert.equal(f.count('ios_native_credentials'),1);f.db.close();
});
test('Invalid attestation, unknown or revoked purchase cannot issue credentials',async()=>{
 for(const options of [{invalidAttestation:true},{access:'unknown'},{access:'revoked'}]){const f=fixture(options);const c=await f.service.issueChallenge();await assert.rejects(f.service.enroll(f.input(c)));assert.equal(f.count('app_installations'),0);assert.equal(f.repository.readChallenge(c.challengeId).consumed,false);f.db.close();}
});
test('Duplicate attested key rolls back the ENTIRE new identity/purchase-link transaction',async()=>{
 const f=fixture();await f.service.enroll(f.input(await f.service.issueChallenge()));const next=await f.service.issueChallenge();await assert.rejects(f.service.enroll(f.input(next)));
 assert.equal(f.count('app_installations'),1);assert.equal(f.count('ios_native_credentials'),1);assert.equal(f.count('apple_installation_links'),1);assert.equal(f.repository.readChallenge(next.challengeId).consumed,false);f.db.close();
});
test('Concurrent enrollment of the same nonce commits at most one identity',async()=>{
 const f=fixture();const c=await f.service.issueChallenge();const results=await Promise.allSettled([f.service.enroll(f.input(c)),f.service.enroll(f.input(c))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.count('app_installations'),1);f.db.close();
});
test('New identity for the same verified purchase preserves the original purchase record/date',async()=>{
 const f=fixture();await f.service.enroll(f.input(await f.service.issueChallenge()));const second=f.input(await f.service.issueChallenge());second.keyId=Buffer.alloc(32,2).toString('base64');await f.service.enroll(second);
 assert.equal(f.count('app_installations'),2);assert.equal(f.count('apple_app_purchases'),1);assert.equal(f.count('apple_installation_links'),2);assert.equal(f.db.prepare('SELECT purchase_date_ms FROM apple_app_purchases').get().purchase_date_ms,PURCHASE);f.db.close();
});
test('Challenge expiry during verification is rejected without consuming nonce',async()=>{
 const f=fixture();const service=createEnrollmentService({...f.deps,verifyAttestation:async input=>{const result=await f.deps.verifyAttestation(input);f.setNow(NOW+300001);return result;}});const c=await service.issueChallenge();await assert.rejects(service.enroll(f.input(c)),/EXPIRED/);assert.equal(f.count('app_installations'),0);f.db.close();
});
test('Counter/app/environment mismatches from the verifier cannot commit',async()=>{
 const f=fixture();for(const change of [{counter:1},{appId:'OTHER.other.app'},{environment:'development'}]){const service=createEnrollmentService({...f.deps,verifyAttestation:async input=>({...await f.deps.verifyAttestation(input),...change})});const c=await service.issueChallenge();await assert.rejects(service.enroll(f.input(c)),/ATTESTATION_REJECTED/);}assert.equal(f.count('ios_native_credentials'),0);f.db.close();
});

test('Production identity cannot be configured with development attestation or Sandbox purchase scope',()=>{
 const f=fixture();for(const patch of [{attestEnvironment:'development'},{appleEnvironment:'Sandbox'}])assert.throws(()=>createEnrollmentService({...f.deps,...patch}),/PRODUCTION_ENROLLMENT_SCOPE/);f.db.close();
});
test('SQLite reference refuses disabled foreign-key checks',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=OFF');assert.throws(()=>createSQLiteEnrollmentRepository(db),/FOREIGN_KEYS_REQUIRED/);db.close();
});
