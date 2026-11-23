import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:https';
import {connect} from 'node:tls';
import {Readable} from 'node:stream';
import {startLoopbackHttps} from '../../ios-preparation/enrollment/loopback-https.mjs';
import {createRegistrationHttpHandler} from '../../ios-preparation/enrollment/registration-http.mjs';
import {setup} from '../../ios-preparation/enrollment/resume-fixture.mjs';
import {NOW} from '../../ios-preparation/enrollment/enrollment-fixture.mjs';
import {createEnrollmentTransport} from '../src/enrollment-transport.mjs';
import {createEnrollmentResumeTransport} from '../src/enrollment-resume-transport.mjs';
import {createEnrollmentResumer} from '../src/enrollment-resume.mjs';

test('Trusted loopback TLS carries a resume after an interrupted initial submission', async t => {
 const origin = 'https://ios-api.example.test';
 const scope = {bundleId: 'lv.demo.vardadienas', environment: 'Production'};
 const directory = await mkdtemp(join(tmpdir(), 'vardadienas-tls-'));
 t.after(() => rm(directory, {recursive: true, force: true}));
 execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256',
  '-nodes', '-days', '1', '-subj', '/CN=ios-api.example.test',
  '-addext', 'subjectAltName=DNS:ios-api.example.test', '-keyout', 'key.pem', '-out', 'cert.pem'],
 {cwd: directory, stdio: 'ignore'});
 const [key, cert] = await Promise.all(['key.pem', 'cert.pem'].map(name => readFile(join(directory, name))));
 let handler;
 const server = await startLoopbackHttps({origin, key, cert, handle: req => handler(req)});
 t.after(() => server.close());
 function transport(ca) {
  return (url, options) => new Promise((resolve, reject) => {
   const target = new URL(url);
   assert.equal(target.origin, origin);
   const req = request({
    host: '127.0.0.1', port: server.port, servername: target.hostname, ca,
    path: target.pathname, method: options.method, signal: options.signal,
    headers: {...options.headers, host: target.host}
   }, res => resolve(new Response(Readable.toWeb(res), {status: res.statusCode, headers: res.headers})));
   req.on('error', reject);
   req.end(options.body);
  });
 }

 const fetchTransport = transport(cert);
 const initial = createEnrollmentTransport({...scope, origin, fetchTransport});
 const admitRequest = () => true;
 const f = await setup(enrollment => {
  handler = createRegistrationHttpHandler({origin, enrollment, admitRequest});
  return initial.issueChallenge();
 });
 t.after(() => f.db.close());
 handler = createRegistrationHttpHandler({origin, enrollment: f.service, resume: f.resumer, admitRequest});

 const untrusted = createEnrollmentTransport({...scope, origin, fetchTransport: transport(undefined)});
 await assert.rejects(untrusted.issueChallenge(), /INCOMPLETE/);
 const interrupted = createEnrollmentTransport({...scope, origin, fetchTransport: (_, options) => {
  // Open the TLS connection, then cut it before sending the registration body.
  return new Promise((_, reject) => {
   const socket = connect({host: '127.0.0.1', port: server.port, servername: new URL(origin).hostname,
    ca: cert, signal: options.signal}, () => socket.destroy(Error('interrupted')));
   socket.on('error', reject);
  });
 }});
 await assert.rejects(interrupted.enroll(f.original), /INCOMPLETE/);
 assert.equal(f.count('app_installations'), 0);
 f.setNow(NOW + 300001);

 let record;
 const resumer = createEnrollmentResumer({...scope,
  transport: createEnrollmentResumeTransport({...scope, origin, fetchTransport}),
  native: {pending: async () => ({proof: f.original}), resume: async challenge => f.sign(challenge)},
  identity: {read: async () => record, store: async value => { record = value; }}
 });
 assert.deepEqual(await resumer.resume(), {resumed: true, installationId: f.original.installationId});
 assert.equal(record.installationId, f.original.installationId);
 assert.equal(f.count('app_installations'), 1);
 assert.equal(f.db.prepare('SELECT purchase_date_ms FROM apple_app_purchases').get().purchase_date_ms,
  Date.parse('2026-11-22T12:00:00Z'));
});
