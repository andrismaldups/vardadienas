import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnrollmentTransport} from '../src/enrollment-transport.mjs';
import {createEnrollmentHttpHandler} from '../../ios-preparation/enrollment/enrollment-http.mjs';
import {fixture} from '../../ios-preparation/enrollment/enrollment-fixture.mjs';

const origin = 'https://ios-api.example.test';
const scope = {bundleId: 'lv.demo.vardadienas', environment: 'Production'};

test('Initial enrollment crosses the HTTP boundary and a lost committed reply cannot create another installation', async () => {
 const f = fixture();
 try {
  const handle = createEnrollmentHttpHandler({origin, service: f.service, admitRequest: () => true});
  let lost = false;
  const transport = createEnrollmentTransport({...scope, origin, async fetchTransport(url, options) {
   const response = await handle(new Request(url, options));
   if (!lost && url.endsWith('/complete') && response.status === 200) {
    lost = true;
    throw Error('connection closed');
   }
   return response;
  }});
  const original = f.input(await transport.issueChallenge());
  await assert.rejects(transport.enroll(original), /INCOMPLETE/);
  assert.equal(lost, true);
  await assert.rejects(transport.enroll(original), /INCOMPLETE/);
  assert.equal(f.count('app_installations'), 1);
  assert.equal(f.count('apple_installation_links'), 1);
  assert.equal(f.db.prepare('SELECT purchase_date_ms FROM apple_app_purchases').get().purchase_date_ms,
   Date.parse('2026-11-22T12:00:00Z'));

  const second = f.input(await transport.issueChallenge());
  second.keyId = Buffer.alloc(32, 2).toString('base64');
  const credential = await transport.enroll(second);
  assert.equal(credential.installationId, second.installationId);
 } finally { f.db.close(); }
});

test('Initial enrollment denies admission before issuing a challenge', async () => {
 let calls = 0;
 const handle = createEnrollmentHttpHandler({origin, service: {issueChallenge() { calls++; }, enroll() { calls++; }}});
 const response = await handle(new Request(origin + '/v1/ios/enrollment/challenge', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'
 }));
 assert.equal(response.status, 503);
 assert.equal(calls, 0);
});
