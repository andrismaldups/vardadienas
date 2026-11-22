import test from 'node:test';import assert from 'node:assert/strict';
import {hashInstallationToken,authenticateInstallation} from './authenticate.mjs';
const token='A'.repeat(43),id='12345678-abcd-1234-abcd-123456789abc',bundleId='lv.demo.vardadienas',environment='Sandbox';
const row={id,platform:'ios',bundleId,environment,tokenHash:hashInstallationToken(token),revoked:false};
function request(patch={},headerPatch={}){return authenticateInstallation({headers:new Headers({Authorization:'Bearer '+token,'X-Installation-Id':id,...headerPatch}),lookup:async()=>({...row,...patch}),bundleId,environment});}
test('Valid scoped iOS credential authenticates without returning the secret or granting Push rights',async()=>{
 assert.deepEqual(await request(),{id,platform:'ios',bundleId,environment});assert.equal((await request()).allowed,undefined);
});
test('Wrong token, revoked identity and generic PWA records are rejected',async()=>{
 for(const patch of [{tokenHash:'f'.repeat(64)},{revoked:true},{platform:'pwa'},{platform:undefined},{tokenHash:'broken'}])await assert.rejects(request(patch),/UNAUTHORIZED/);
});
test('Foreign app/environment/installation records cannot be authenticated',async()=>{
 for(const patch of [{environment:'Production'},{bundleId:'other.app'},{id:'87654321-abcd-1234-abcd-123456789abc'}])await assert.rejects(request(patch),/UNAUTHORIZED/);
});
test('Malformed or duplicated credentials do not trigger a record lookup',async()=>{
 let called=0;for(const auth of ['Bearer x','Bearer '+token+', Bearer '+token,'Basic '+token]){
 await assert.rejects(authenticateInstallation({headers:new Headers({Authorization:auth,'X-Installation-Id':id}),lookup:async()=>{called++;},bundleId,environment}),/UNAUTHORIZED/);}assert.equal(called,0);
});
test('Unknown identity has the same public rejection as an incorrect secret',async()=>{
 await assert.rejects(authenticateInstallation({headers:new Headers({Authorization:'Bearer '+token,'X-Installation-Id':id}),lookup:async()=>null,bundleId,environment}),e=>e.message==='UNAUTHORIZED');
});

test('Credential database errors are sanitized as unavailable instead of accepting or resetting identity',async()=>{
 await assert.rejects(authenticateInstallation({headers:new Headers({Authorization:'Bearer '+token,'X-Installation-Id':id}),lookup:async()=>{throw Error(token);},bundleId,environment}),e=>e.message==='AUTHENTICATION_UNAVAILABLE');
});
