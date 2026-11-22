import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {createEnrollmentService,enrollmentContext} from './service.mjs';import {createSQLiteEnrollmentRepository} from './sqlite-repository.mjs';import {createApplePurchaseReader} from '../server/apple-purchase-reader.mjs';
export const NOW=Date.parse('2028-01-01T00:00:00Z'),PURCHASE=Date.parse('2026-11-22T12:00:00Z');
const config={bundleId:'lv.demo.vardadienas',environment:'Production',appAppleId:12345,renewalProductId:'lv.demo.push.3years'};
export function fixture(options={}){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const name of ['../server/existing-schema.fixture.sql','../server/apple-purchases.schema.draft.sql','schema.draft.sql'])db.exec(readFileSync(new URL(name,import.meta.url),'utf8'));
 let now=NOW;const repository=createSQLiteEnrollmentRepository(db),seen=[];
 const purchaseReader=createApplePurchaseReader({config,clock:()=>now,resolveBaseAccess:async()=>options.access??'active',verifier:{verifyAndDecodeAppTransaction:async()=>({bundleId:config.bundleId,receiptType:'Production',appAppleId:12345,appTransactionId:'app-original',originalPurchaseDate:PURCHASE,receiptCreationDate:NOW}),verifyAndDecodeTransaction:async()=>{throw Error('not used');}},apiClient:{getTransactionHistory:async()=>({bundleId:config.bundleId,environment:'Production',appAppleId:12345,hasMore:false,signedTransactions:[]})}});
 const verifyAttestation=async input=>{seen.push(input);if(options.invalidAttestation)throw Error('Apple verifier rejected');return {keyId:input.keyId,appId:input.appId,environment:input.environment,counter:0,publicKeyPem:options.publicKeyPem??'-----BEGIN PUBLIC KEY-----\nTEST-DOUBLE\n-----END PUBLIC KEY-----'};};
 const deps={bundleId:config.bundleId,identityEnvironment:'Production',appleEnvironment:'Production',attestEnvironment:'production',appIdPrefix:'ABCDEFGHIJ',repository,purchaseReader,verifyAttestation,clock:()=>now};
 const service=createEnrollmentService({...deps,...options.deps});
 const input=challenge=>({...challenge,keyId:Buffer.alloc(32,1).toString('base64'),attestation:Buffer.from('attestation TEST DOUBLE').toString('base64'),signedAppTransaction:'header.payload.signature'});
 return {db,repository,deps,service,input,seen,setNow:value=>now=value,count:table=>db.prepare('SELECT count(*) n FROM '+table).get().n};
}
