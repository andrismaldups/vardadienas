import test from 'node:test';import assert from 'node:assert/strict';
import {validateCredential,createIdentityStore} from '../src/installation-identity.mjs';
import {createAuthenticatedClient} from '../src/authenticated-client.mjs';
const scope={bundleId:'lv.demo.vardadienas',environment:'Sandbox'};
const record={version:1,installationId:'12345678-abcd-1234-abcd-123456789abc',token:'A'.repeat(43),...scope};
const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
function store(){let value=null,calls=0;const native={read:async()=>({record:value}),store:async({record})=>{calls++;value=record;return {stored:true};}};return {native,get calls(){return calls;},setRaw:v=>value=v,store:createIdentityStore({native,...scope})};}
test('Scoped native identity storage is idempotent and confirms a read after writing',async()=>{
 const f=store();assert.equal(await f.store.read(),null);await f.store.store(record);assert.deepEqual(await f.store.read(),record);await f.store.store(record);assert.equal(f.calls,1);
 await assert.rejects(f.store.store({...record,token:'B'.repeat(42)+'A'}),/CONFLICT/);assert.equal(f.calls,1);
});
test('Corrupt native identity is never replaced by provisioning defaults',async()=>{
 const f=store();f.setRaw('{broken');await assert.rejects(f.store.read(),/RECOVERY/);await assert.rejects(f.store.store(record),/RECOVERY/);assert.equal(f.calls,0);
});
test('Credential validation rejects foreign scope, placeholder identity, malformed secrets and extra fields',()=>{
 for(const patch of [{environment:'Production'},{bundleId:'other.app'},{version:2},{installationId:'../other'},{token:'x'},{token:'A'.repeat(42)+'B'},{active:true}])assert.throws(()=>validateCredential({...record,...patch},scope));
 assert.throws(()=>validateCredential({...record,bundleId:'lv.example.preview'},{...scope,bundleId:'lv.example.preview'}));
});
test('A failed native write or read-back cannot be reported as a saved identity',async()=>{
 const f=store();f.native.store=async()=>({stored:true});await assert.rejects(f.store.store(record),/UNCONFIRMED/);assert.equal(await f.store.read(),null);
});
test('Unconfigured client never reads credentials or uses the network',async()=>{
 const client=createAuthenticatedClient({...scope,fetchTransport:()=>{throw Error('network must not run');},identity:{read:()=>{throw Error('keychain must not run');}}});
 assert.equal(client.configured,false);await assert.rejects(client.checkAccess(),/UNCONFIGURED/);
});
test('HTTPS client uses only fixed endpoints, scoped Bearer auth and no browser cookies/redirects',async()=>{
 const calls=[];const client=createAuthenticatedClient({...scope,origin:'https://api.example.test',identity:{read:async()=>record},fetchTransport:async(url,options)=>{calls.push({url,options});return response(url.endsWith('/access')?{allowed:true}:{active:true,tokenHash:'f'.repeat(64)});}});
 assert.deepEqual(await client.checkAccess(),{allowed:true});await client.upsertDevice({deviceToken:'ab'.repeat(32)});
 assert.equal(calls[0].url,'https://api.example.test/v1/ios/access');assert.equal(calls[0].options.headers.Authorization,'Bearer '+record.token);
 assert.equal(calls[1].options.method,'PUT');assert.equal(calls[1].options.credentials,'omit');assert.equal(calls[1].options.redirect,'error');assert.equal(calls[1].options.cache,'no-store');assert.deepEqual(JSON.parse(calls[1].options.body),{deviceToken:'ab'.repeat(32)});
});
test('HTTP, user-info, extra paths, query strings and non-default ports cannot configure an origin',()=>{
 for(const origin of ['http://api.example.test','https://user:secret@api.example.test','https://api.example.test/path','https://api.example.test/?token=x','https://api.example.test:8443'])assert.throws(()=>createAuthenticatedClient({...scope,origin}));
});
test('Missing/foreign credentials do not reach the network or trigger automatic identity reset',async()=>{
 let called=false;for(const credential of [null,{...record,environment:'Production'}]){
 const client=createAuthenticatedClient({...scope,origin:'https://api.example.test',identity:{read:async()=>credential},fetchTransport:async()=>{called=true;}});await assert.rejects(client.checkAccess());}assert.equal(called,false);
});
test('Authorization failures are sanitized and do not retry or wipe stored credentials',async()=>{
 let requests=0;const client=createAuthenticatedClient({...scope,origin:'https://api.example.test',identity:{read:async()=>record},fetchTransport:async()=>{requests++;return new Response(record.token,{status:401});}});
 await assert.rejects(client.checkAccess(),error=>error.message==='IOS_AUTHORIZATION_REQUIRED'&&!error.message.includes(record.token));assert.equal(requests,1);
});
test('Response streaming and UTF-8 JSON are bounded before returning data',async()=>{
 for(const result of [new Response('x'.repeat(65537),{headers:{'Content-Type':'application/json'}}),new Response('{}',{headers:{'Content-Type':'text/html'}}),response({allowed:'yes'})]){
 const client=createAuthenticatedClient({...scope,origin:'https://api.example.test',identity:{read:async()=>record},fetchTransport:async()=>result});await assert.rejects(client.checkAccess());}
});
test('Network exception text cannot leak tokens and stalled requests time out without retries',async()=>{
 const base={...scope,origin:'https://api.example.test',identity:{read:async()=>record}};
 const failed=createAuthenticatedClient({...base,fetchTransport:async()=>{throw Error(record.token);}});await assert.rejects(failed.checkAccess(),e=>e.message==='IOS_SERVER_REQUEST_FAILED');
 const stalled=createAuthenticatedClient({...base,timeoutMs:5,fetchTransport:()=>new Promise(()=>{})});await assert.rejects(stalled.checkAccess(),/TIMEOUT/);
});

test('Authenticated client and real server auth distinguish paid rights from possession of installation identity',async()=>{
 const {authenticateInstallation,hashInstallationToken}=await import('../../ios-preparation/identity/authenticate.mjs');
 const {createPushController}=await import('../src/push-controller.mjs');const {snapshotHash}=await import('../src/native-utils.mjs');
 let allowed=false,registrations=0;const callbacks={};
 const serverRow={id:record.installationId,platform:'ios',...scope,tokenHash:hashInstallationToken(record.token),revoked:false};
 const client=createAuthenticatedClient({...scope,origin:'https://api.example.test',identity:{read:async()=>record},fetchTransport:async(url,options)=>{
  await authenticateInstallation({headers:new Headers(options.headers),lookup:async()=>serverRow,...scope});
  return response(url.endsWith('/access')?{allowed}:{active:true,tokenHash:snapshotHash(JSON.parse(options.body).deviceToken)});
 }});
 const push={addListener:async(name,fn)=>{callbacks[name]=fn;return {remove:async()=>{}};},checkPermissions:async()=>({receive:'granted'}),register:async()=>{registrations++;callbacks.registration({value:'ab'.repeat(32)});}};
 const controller=createPushController({push,server:client});assert.equal(await controller.activate(),false);assert.equal(registrations,0);
 allowed=true;assert.equal(await controller.activate(),true);assert.equal(registrations,1);await controller.dispose();
});

test('Identity-storage errors and unexpected response origins never disclose credential content',async()=>{
 const base={...scope,origin:'https://api.example.test'};
 const failed=createAuthenticatedClient({...base,identity:{read:async()=>{throw Error(record.token);}}});await assert.rejects(failed.checkAccess(),e=>e.message==='IDENTITY_UNAVAILABLE');
 const redirected=response({allowed:true});Object.defineProperty(redirected,'url',{value:'https://evil.test/v1/ios/access'});
 const client=createAuthenticatedClient({...base,identity:{read:async()=>record},fetchTransport:async()=>redirected});await assert.rejects(client.checkAccess(),e=>e.message==='IOS_SERVER_REQUEST_FAILED');
});
