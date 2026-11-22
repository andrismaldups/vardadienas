import test from 'node:test';import assert from 'node:assert/strict';import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {createRecoveryTransport} from '../src/recovery-transport.mjs';import {createIdentityRecovery} from '../src/identity-recovery.mjs';
import {createRecoveryHttpHandler} from '../../ios-preparation/enrollment/recovery-http.mjs';import {fixture} from '../../ios-preparation/enrollment/recovery-fixture.mjs';
const scope={bundleId:'lv.demo.vardadienas',environment:'Production'},origin='https://ios-api.example.test';
const keyId=Buffer.alloc(32,1).toString('base64'),id='12345678-abcd-4234-abcd-123456789abc';
const challenge={challengeId:id,installationId:id,bundleId:scope.bundleId,identityEnvironment:'Production',keyId,challenge:'A'.repeat(43),expiresAt:123456};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const make=(fetchTransport,extra={})=>createRecoveryTransport({...scope,origin,fetchTransport,...extra});
test('No configured origin means no network or credential read',async()=>{let calls=0;const t=make(()=>{calls++;},{origin:null});assert.equal(t.configured,false);await assert.rejects(t.issueChallenge(keyId),/NOT_CONFIGURED/);assert.equal(calls,0);let nativeCalls=0;const coordinator=createIdentityRecovery({...scope,transport:t,native:{recoveryKey:()=>{nativeCalls++;}}});await assert.rejects(coordinator.recover(),/NOT_CONFIGURED/);assert.equal(nativeCalls,0);});
test('Only fixed HTTPS origin, final bundle, environment and bounded timeout can be configured',()=>{for(const bad of ['http://api.test','https://user:pass@api.test','https://api.test/path','https://api.test/?x=1','https://api.test/#x','https://api.test:8443'])assert.throws(()=>make(null,{origin:bad}));for(const extra of [{environment:'other'},{bundleId:'lv.example.preview'},{timeoutMs:0},{timeoutMs:30001}])assert.throws(()=>make(null,extra));});
test('Challenge POST omits auth/cookies and accepts no URL chosen by response',async()=>{let sent;const t=make(async(url,options)=>{sent={url,options};return json(challenge);});assert.deepEqual(await t.issueChallenge(keyId),challenge);assert.equal(sent.url,origin+'/v1/ios/recovery/challenge');assert.equal(sent.options.method,'POST');assert.equal(sent.options.redirect,'error');assert.equal(sent.options.credentials,'omit');assert.equal(sent.options.cache,'no-store');assert(!('Authorization' in sent.options.headers));assert.deepEqual(JSON.parse(sent.options.body),{keyId});});
test('Redirects, changed URL including query, oversized/invalid UTF-8/HTML and non-200 fail closed',async()=>{
 const changed=json(challenge);Object.defineProperty(changed,'url',{value:origin+'/v1/ios/recovery/challenge?token=private'});
 const redirected=json(challenge);Object.defineProperty(redirected,'redirected',{value:true});
 for(const response of [changed,redirected,new Response('{}',{status:401}),new Response('x'.repeat(8193),{headers:{'Content-Type':'application/json'}}),new Response(new Uint8Array([255]),{headers:{'Content-Type':'application/json'}}),new Response('{}',{headers:{'Content-Type':'text/html'}})])await assert.rejects(make(async()=>response).issueChallenge(keyId),e=>e.message==='RECOVERY_REQUEST_INCOMPLETE');
});
test('Foreign/extra response fields and ack mismatches cannot be accepted',async()=>{for(const patch of [{bundleId:'other.app'},{identityEnvironment:'Sandbox'},{keyId:'other'},{origin:'https://evil.test'},{expiresAt:'123'}])await assert.rejects(make(async()=>json({...challenge,...patch})).issueChallenge(keyId),/CHALLENGE_INVALID/);const input={challengeId:id,challenge:challenge.challenge,recoveryId:id,candidateHash:'b'.repeat(64),assertion:'YWJj'};await assert.rejects(make(async()=>json({installationId:id,recoveryId:id,candidateHash:'c'.repeat(64)})).recover(input),/ACK_INVALID/);});
test('Stalled fetch and stalled response stream time out once, without revealing raw errors',async()=>{let calls=0;await assert.rejects(make(async()=>{calls++;throw Error('private token');}).issueChallenge(keyId),e=>e.message==='RECOVERY_REQUEST_INCOMPLETE');assert.equal(calls,1);await assert.rejects(make(()=>new Promise(()=>{}),{timeoutMs:5}).issueChallenge(keyId),/INCOMPLETE/);let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true;}});await assert.rejects(make(async()=>new Response(body,{headers:{'Content-Type':'application/json'}}),{timeoutMs:5}).issueChallenge(keyId),/INCOMPLETE/);assert.equal(cancelled,true);});
test('Recovery through Request/Response adapter verifies real ECDSA, retries lost reply and keeps original identity',async()=>{
 const f=fixture();try{
  const token=randomBytes(32).toString('base64url'),candidateHash=createHash('sha256').update(token).digest('hex'),recoveryId=randomUUID();let counter=0,saved=0,lose=true;
  const handler=createRecoveryHttpHandler({origin,service:f.service,admitRequest:async()=>true});
  const transport=make(async(url,options)=>{const response=await handler(new Request(url,options));if(lose&&url.endsWith('/complete')&&response.status===200){lose=false;throw Error('response lost after DB commit');}return response;});
  const native={recoveryKey:async()=>({keyId:f.keyId}),recoveryAssertion:async c=>{const signed=f.sign(c,++counter,{candidateHash,recoveryId});return {recoveryId,candidateHash,assertion:signed.assertion};},finishRecovery:async ack=>{assert.equal(ack.candidateHash,candidateHash);saved++;return {stored:true};}};
  const recover=()=>createIdentityRecovery({...scope,native,transport}).recover();
  await assert.rejects(recover(),/INCOMPLETE/);assert.equal(saved,0);assert.equal(f.credential(),candidateHash);
  assert.deepEqual(await recover(),{recovered:true,installationId:f.id});assert.equal(saved,1);assert.equal(f.db.prepare('SELECT count(*) n FROM app_installations').get().n,1);assert.equal(f.db.prepare('SELECT counter FROM ios_appattest_keys').get().counter,2);
 }finally{f.db.close();}
});
test('Late completion response after timeout never promotes pending Keychain credentials',async()=>{
 let release,saved=0;const recoveryId=randomUUID(),candidateHash='b'.repeat(64);
 const transport=make(async url=>url.endsWith('/challenge')?json(challenge):new Promise(resolve=>release=()=>resolve(json({installationId:id,recoveryId,candidateHash}))),{timeoutMs:5});
 const native={recoveryKey:async()=>({keyId}),recoveryAssertion:async()=>({recoveryId,candidateHash,assertion:'YWJj'}),finishRecovery:async()=>{saved++;return {stored:true};}};
 await assert.rejects(createIdentityRecovery({...scope,transport,native}).recover(),/INCOMPLETE/);release();await new Promise(r=>setImmediate(r));assert.equal(saved,0);
});
