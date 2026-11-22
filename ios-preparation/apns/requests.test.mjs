import test from 'node:test';import assert from 'node:assert/strict';
import {buildAlertRequest,interpretResponse} from './requests.mjs';
const input={environment:'sandbox',bundleId:'lv.demo.vardadienas',deviceToken:'ab'.repeat(48),providerJwt:'header.payload.signature',title:'Vārdadienas',body:'Šodien svin Mārtiņš! 🎂',expiresAt:0,collapseId:'nameday-2026-11-22-morning'};
test('Alert request separates environments, binds topic and uses variable-length token',()=>{
 const r=buildAlertRequest(input);assert.equal(r.origin,'https://api.sandbox.push.apple.com');assert.equal(r.headers['apns-topic'],input.bundleId);assert.equal(r.headers['apns-push-type'],'alert');assert.equal(r.headers['apns-expiration'],'0');assert.equal(JSON.parse(r.body).aps.alert.body,input.body);
 assert.equal(buildAlertRequest({...input,environment:'production'}).origin,'https://api.push.apple.com');
});
test('Malformed scope, token, provider header and placeholder bundle cannot be prepared',()=>{
 for(const patch of [{environment:'test'},{bundleId:'lv.example.vardadienas.preview'},{deviceToken:'../escape'},{deviceToken:'abc'},{providerJwt:'header.payload.signature\r\nInjected: 1'},{expiresAt:-1},{collapseId:'x'.repeat(65)}])assert.throws(()=>buildAlertRequest({...input,...patch}));
});
test('Payload byte limits and safe collapse identifiers are enforced',()=>{
 assert.throws(()=>buildAlertRequest({...input,body:'🎂'.repeat(1024)}),/4096/);assert.throws(()=>buildAlertRequest({...input,collapseId:'ā'.repeat(33)}),/collapse/);
});
test('APNs success is acceptance, not confirmation of delivery',()=>assert.deepEqual(interpretResponse({status:200}),{accepted:true,delivered:false,retry:false,invalidateToken:false}));
test('Retryable errors never invalidate a token',()=>{for(const status of [429,500,503])assert.deepEqual(interpretResponse({status}),{accepted:false,retry:true,invalidateToken:false});});
test('410 invalidates only a registration not newer than the Apple timestamp',()=>{
 const base={status:410,body:{reason:'Unregistered',timestamp:1000}};
 assert.equal(interpretResponse({...base,registeredAt:1000}).invalidateToken,true);assert.equal(interpretResponse({...base,registeredAt:1001}).invalidateToken,false);
 for(const value of [undefined,-1,'1000'])assert.equal(interpretResponse({...base,registeredAt:value}).invalidateToken,false);
 assert.equal(interpretResponse({status:410,registeredAt:100,body:{reason:'Unregistered'}}).invalidateToken,false);
});
test('Environment/topic/authentication errors do not delete records or retry forever',()=>{for(const status of [400,403,404,405,413])assert.deepEqual(interpretResponse({status,body:{reason:'BadDeviceToken'}}),{accepted:false,retry:false,invalidateToken:false});});
