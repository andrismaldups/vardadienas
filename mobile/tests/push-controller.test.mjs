import test from 'node:test';import assert from 'node:assert/strict';
import {createPushController} from '../src/push-controller.mjs';import {snapshotHash} from '../src/native-utils.mjs';
function fixture(options={}){
 const callbacks={},calls=[],states=[];let current='ab'.repeat(48);
 const push={addListener:async(name,callback)=>{calls.push(name);callbacks[name]=callback;return {remove:async()=>{calls.push('remove:'+name);delete callbacks[name];}};},
 checkPermissions:async()=>{calls.push('check');return {receive:options.permission??'granted'};},
 requestPermissions:async()=>{calls.push('request');return {receive:options.requested??'granted'};},
 register:async()=>{calls.push('register');callbacks.registration({value:current});}};
 const server={checkAccess:async()=>{calls.push('access');return {allowed:true};},upsertDevice:async({deviceToken})=>{calls.push('upsert');return {active:true,tokenHash:snapshotHash(deviceToken)};}};
 const controller=createPushController({push,server,onState:s=>states.push(s),...options});
 return {push,server,callbacks,calls,states,controller,setToken:value=>{current=value;}};
}
test('Unconfigured native build never requests permission, registers APNs or fabricates activation',async()=>{
 const f=fixture({server:null});assert.equal(await f.controller.activate(),false);assert.deepEqual(f.calls,[]);assert.equal(f.controller.status().stage,'unconfigured');
});
test('Expired/unverified access prevents OS permission and registration work',async()=>{
 const f=fixture();f.server.checkAccess=async()=>({allowed:false});assert.equal(await f.controller.activate(),false);assert.deepEqual(f.calls,[]);assert.equal(f.controller.status().stage,'not-entitled');
});
test('Listeners precede registration and only a matching server acknowledgement activates',async()=>{
 const f=fixture();assert.equal(await f.controller.activate(),true);assert.deepEqual(f.calls,['access','registration','registrationError','check','register','upsert']);assert.equal(f.controller.status().stage,'active');
 for(const state of f.states){assert(!JSON.stringify(state).includes('abab'));assert.deepEqual(Object.keys(state).sort(),['permission','stage']);}await f.controller.dispose();
});
test('Permission is requested only when needed and allowed by an explicit activation',async()=>{
 const f=fixture({permission:'prompt'});await f.controller.activate();assert(f.calls.includes('request'));await f.controller.dispose();
 const background=fixture({permission:'prompt'});assert.equal(await background.controller.activate({prompt:false}),false);assert(!background.calls.includes('request'));assert(!background.calls.includes('register'));await background.controller.dispose();
});
test('Denied permission does not register or upsert, including a declined first request',async()=>{
 for(const options of [{permission:'denied'},{permission:'prompt',requested:'denied'}]){const f=fixture(options);assert.equal(await f.controller.activate(),false);assert(!f.calls.includes('register'));assert(!f.calls.includes('upsert'));assert.equal(f.controller.status().stage,'permission-denied');await f.controller.dispose();}
});
test('Register promise resolution without a token is not success; timeout is retryable',async()=>{
 let tick;const f=fixture({setTimer:fn=>{tick=fn;return 1;},clearTimer:()=>{}});f.push.register=async()=>{};
 const waiting=f.controller.activate();await new Promise(r=>setImmediate(r));tick();await assert.rejects(waiting,/timeout/);assert.equal(f.controller.status().stage,'registration-error');
 f.push.register=async()=>f.callbacks.registration({value:'CD'.repeat(64)});assert.equal(await f.controller.activate(),true);await f.controller.dispose();
});
test('Native registration errors and malformed tokens cannot activate',async()=>{
 for(const callback of ['error','invalid']){const f=fixture();f.push.register=async()=>callback==='error'?f.callbacks.registrationError({error:'raw private native error'}):f.callbacks.registration({value:'not-a-token'});await assert.rejects(f.controller.activate());assert(!f.calls.includes('upsert'));assert.equal(f.controller.status().stage,'registration-error');await f.controller.dispose();}
});
test('Server failure or acknowledgement for another token leaves no active badge',async()=>{
 const f=fixture();f.server.upsertDevice=async()=>({active:true,tokenHash:'0'.repeat(64)});await assert.rejects(f.controller.activate(),/acknowledgement/);assert.equal(f.controller.status().stage,'sync-error');await f.controller.dispose();
});
test('Rotation while syncing cannot activate a stale token; newest token is acknowledged first',async()=>{
 const f=fixture();const tokens=[];f.server.upsertDevice=async({deviceToken})=>{tokens.push(deviceToken);if(tokens.length===1)f.callbacks.registration({value:'cd'.repeat(48)});return {active:true,tokenHash:snapshotHash(deviceToken)};};
 await f.controller.activate();assert.deepEqual(tokens,['ab'.repeat(48),'cd'.repeat(48)]);assert.equal(f.states.filter(s=>s.stage==='active').length,1);await f.controller.dispose();
});
test('Rotation after activation loses the old acknowledgement and resynchronizes without another permission prompt',async()=>{
 const f=fixture();await f.controller.activate();f.setToken('ef'.repeat(48));f.callbacks.registration({value:'ef'.repeat(48)});assert.equal(f.controller.status().stage,'sync-required');
 await new Promise(r=>setImmediate(r));assert.equal(f.controller.status().stage,'active');assert.equal(f.calls.filter(c=>c==='upsert').length,2);assert(!f.calls.includes('request'));await f.controller.dispose();
});
test('Concurrent activation is rejected; disposing removes only owned listeners',async()=>{
 const f=fixture();let release;f.server.checkAccess=()=>new Promise(r=>release=r);const first=f.controller.activate();await assert.rejects(f.controller.activate(),/in progress/);release({allowed:true});await first;await f.controller.dispose();assert.equal(f.calls.filter(c=>c.startsWith('remove:')).length,2);await assert.rejects(f.controller.activate(),/disposed/);
});
test('Dispose rejects pending registration and late callbacks cannot enable notifications',async()=>{
 const f=fixture();f.push.register=async()=>{};const running=f.controller.activate();await new Promise(r=>setImmediate(r));const late=f.callbacks.registration;await f.controller.dispose();await assert.rejects(running,/disposed/);late({value:'ab'.repeat(48)});assert(!f.calls.includes('upsert'));assert(!f.states.some(s=>s.stage==='active'));
});
test('Listener setup failure cleans up the first handle',async()=>{
 const f=fixture();const add=f.push.addListener;f.push.addListener=async(name,callback)=>{if(name==='registrationError')throw Error('bridge error');return add(name,callback);};
 await assert.rejects(f.controller.activate(),/bridge error/);assert.equal(f.calls.filter(c=>c.startsWith('remove:')).length,1);await f.controller.dispose();
});
