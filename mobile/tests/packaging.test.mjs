import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(mobile, '..'), out = join(mobile, 'www');
const text = path => readFile(path, 'utf8');
const source = await text(join(root, 'index.html'));
const html = await text(join(out, 'app.html'));
const bootHtml = await text(join(out, 'index.html'));
const manifest = JSON.parse(await text(join(out, 'packaging-manifest.json')));
const hash = value => createHash('sha256').update(value).digest('hex');

test('All packaged data, libraries and styles match their existing source bytes', async () => {
  for (const [file, digest] of Object.entries(manifest.files)) {
    assert.equal(hash(await readFile(join(root, file))), digest, file);
    if (file !== 'index.html') assert.equal(hash(await readFile(join(out, file))), digest, file);
  }
  assert.equal(hash(source), manifest.sourceIndexSha256);
});
test('Every HTML script/image/stylesheet reference resolves to a bundled local file', async () => {
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (reference.startsWith('#')) continue;
    assert.ok(!/^(?:https?:)?\/\//.test(reference), reference);
    await access(join(out, reference.split(/[?#]/)[0]));
  }
});
test('Selectable themes have their local images; old inactive rules are identified', async () => {
  const inactive = new Set(['assets/d3-nakts-mezs-fons.svg','assets/d3-nakts-mezs-dekoracijas.svg',
    'clean-ds-1.1/assets/lavanda_augsa.png','clean-ds-1.1/assets/lavanda_apaksa.png','clean-ds-1.1/assets/lavanda_interesanti.png']);
  const seen = new Set();
  for (const file of Object.keys(manifest.files).filter(f => f.endsWith('.css'))) {
    const css = await text(join(out, file));
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)/g)) {
      const value = match[1];
      if (/^(?:data:|#|%23)/.test(value)) continue;
      const resolved = resolve(dirname(join(out, file)), value.split('?')[0]);
      try { await access(resolved); } catch (error) {
        const relative = resolved.slice(out.length + 1);
        assert.ok(inactive.has(relative), `Missing active asset ${file}: ${value}`); seen.add(relative);
      }
    }
  }
  assert.equal(seen.size, 5);
  assert.ok(!/name="designStyle" value="(?:nature-d3|lavender)"/.test(html));
});
test('Greeting and all other functional inline scripts are unchanged', () => {
  const scripts = value => [...value.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
  const before = scripts(source), after = scripts(html);
  assert.equal(before.length, after.length);
  for (let i = 0; i < before.length; i++) {
    if (!before[i].includes('navigator.serviceWorker.register')) assert.equal(after[i], before[i]);
    new vm.Script(after[i]);
  }
});
test('Native package does not register a PWA service worker or depend on a remote start URL', async () => {
  assert.ok(!html.includes('navigator.serviceWorker.register'));
  const config = JSON.parse(await text(join(mobile, 'capacitor.config.json')));
  assert.equal(config.webDir, 'www'); assert.equal(config.server?.url, undefined);
  const files = await readdir(out);
  for (const excluded of ['service-worker.js','manifest.json','ios-preparation','node_modules','.git'])
    assert.ok(!files.includes(excluded), excluded);
  assert.ok(!Object.keys(manifest.files).some(f => /server|apple-purchase|package-lock/.test(f)));
});
test('Network guard loads before app code and CSP denies remote connections', () => {
  assert.ok(html.indexOf('native-preview.js') < html.indexOf('data-backup.js'));
  assert.ok(html.indexOf('native-storage.js') < html.indexOf('data-backup.js'));
  assert.ok(bootHtml.includes('native-boot.js'));
  assert.ok(!bootHtml.includes('data-backup.js'));
  assert.ok(!bootHtml.includes('name-days.json'));
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('native-preview.js'));
  assert.ok(html.includes("connect-src 'self'")); assert.ok(html.includes('viewport-fit=cover'));
});

async function guard() {
  const calls = [], window = { location: { href: 'capacitor://localhost/index.html', protocol: 'capacitor:', host: 'localhost' },
    fetch: async (...args) => { calls.push(args); return { ok: true }; }, Capacitor: { isNativePlatform: () => true } };
  vm.runInNewContext(await text(join(out, 'native-preview.js')), { window, URL });
  return { window, calls };
}
test('Native preview blocks production/API requests without invoking the transport', async () => {
  const { window, calls } = await guard();
  for (const url of ['https://vardadienas-push.andris-maldups.workers.dev/api/installations',
    'https://localhost/api', 'capacitor://localhost.evil.test/api'])
    await assert.rejects(window.fetch(url, { method: 'POST' }), /not configured/);
  assert.equal(calls.length, 0);
});
test('Local resources are still available and no purchase/Push capability is falsely advertised', async () => {
  const { window, calls } = await guard();
  assert.equal((await window.fetch('./name-days.json')).ok, true);
  assert.equal(calls.length, 1); assert.equal(window.VardadienasPlatform.native, true);
  assert.equal(window.VardadienasPlatform.remoteSync, false);
  assert.equal(window.VardadienasPlatform.storePurchases, false);
  assert.equal(window.VardadienasPlatform.nativePush, false);
});
test('Generated Xcode project uses the same provisional identifier and pinned runtime', async () => {
  const config = JSON.parse(await text(join(mobile, 'capacitor.config.json')));
  const project = await text(join(mobile, 'ios/App/App.xcodeproj/project.pbxproj'));
  const spm = await text(join(mobile, 'ios/App/CapApp-SPM/Package.swift'));
  assert.ok(project.includes(config.appId)); assert.ok(spm.includes('exact: "8.6.2"'));
  assert.ok(!project.includes('DEVELOPMENT_TEAM ='));
});

test('APNs callback bridge is wired but no placeholder identity is granted a Push signing entitlement',async()=>{
 const delegate=await text(join(mobile,'ios/App/App/AppDelegate.swift'));
 assert(delegate.includes('.capacitorDidRegisterForRemoteNotifications'));assert(delegate.includes('.capacitorDidFailToRegisterForRemoteNotifications'));
 const config=JSON.parse(await text(join(mobile,'capacitor.config.json')));assert.deepEqual(config.plugins.PushNotifications.presentationOptions,['banner','list','sound']);
 const project=await text(join(mobile,'ios/App/App.xcodeproj/project.pbxproj'));assert(!project.includes('PushDevelopment.entitlements.example'));
});

test('Keychain plugin is included in Swift sources and both controller entry points use its bridge',async()=>{
 const project=await text(join(mobile,'ios/App/App.xcodeproj/project.pbxproj'));
 for(const file of ['InstallationIdentityPlugin.swift','IdentityBridgeViewController.swift']){
  assert(project.includes(file+' in Sources'));await access(join(mobile,'ios/App/App',file));
 }
 const native=await text(join(mobile,'ios/App/App/InstallationIdentityPlugin.swift'));
 assert(native.includes('kSecAttrAccessibleWhenUnlockedThisDeviceOnly'));assert(native.includes('kSecAttrSynchronizable as String: false'));assert(!native.includes('SecItemDelete('));assert.equal(native.split('SecItemUpdate(').length-1,1);assert(native.indexOf('SecItemUpdate(')>native.indexOf('@objc func finishRecovery'));assert(native.includes('SecRandomCopyBytes'));assert(native.includes('generateAssertion(key'));assert(native.includes('ios-recovery-v1'));assert(native.includes('try pending() == value'));assert(native.includes('value.candidateHash == candidateHash'));
 assert((await text(join(mobile,'ios/App/App/SceneDelegate.swift'))).includes('IdentityBridgeViewController()'));
 assert((await text(join(mobile,'ios/App/App/Base.lproj/Main.storyboard'))).includes('customClass="IdentityBridgeViewController"'));
 assert(html.indexOf('native-identity.js')<html.indexOf('native-storage.js'));
});

test('StoreKit proof bridge uses verified, device-bound AppTransaction and explicit refresh only',async()=>{
 const plugin=await text(join(mobile,'ios/App/App/AppPurchaseProofPlugin.swift'));
 const native=await text(join(mobile,'ios/App/App/VerifiedAppPurchase.swift'));assert(plugin.includes('VerifiedAppPurchase.read(refresh: refresh)'));
 assert(native.includes('case .verified(let app)'));assert(native.includes('case .unverified:'));assert(native.includes('result.jwsRepresentation'));
 assert(native.includes('AppStore.deviceVerificationID'));assert(native.includes('app.deviceVerificationNonce.uuidString.lowercased() + device.uuidString.lowercased()'));assert(native.includes('SHA384.hash'));
 assert(plugin.includes('call.getBool("userInitiated") == true'));assert(plugin.includes('#available(iOS 16.0, *)'));
 assert(!native.includes('.purchase('));assert(!native.includes('print('));
 assert((await text(join(mobile,'ios/App/App/IdentityBridgeViewController.swift'))).includes('registerPluginInstance(AppPurchaseProofPlugin())'));
 assert((await text(join(mobile,'ios/App/App.xcodeproj/project.pbxproj'))).includes('AppPurchaseProofPlugin.swift in Sources'));
 assert.equal(JSON.parse(await text(join(mobile,'capacitor.config.json'))).loggingBehavior,'none');
});

test('Native App Attest binds server nonce to an internally read StoreKit proof; development entitlement stays unlinked',async()=>{
 const native=await text(join(mobile,'ios/App/App/AppAttestEnrollmentPlugin.swift'));
 assert(native.includes('VerifiedAppPurchase.read()'));assert(!native.includes('call.getString("signedAppTransaction")'));
 assert(native.includes('service.attestKey(key, clientDataHash: hash)'));assert(native.includes('deviceError.code == .serverUnavailable'));
 assert(native.includes('vardadienas.enroll.v1'));assert(native.includes('jwsHash'));assert(native.includes('vardadienas.enroll.resume.v1'));assert(native.includes('kSecAttrAccessibleWhenUnlockedThisDeviceOnly'));assert(native.includes('kSecAttrSynchronizable as String: false'));assert(native.includes('try self.saveProof(proof)'));assert(native.indexOf('try self.saveProof(proof)')<native.lastIndexOf('call.resolve(proof.result)'));assert(!native.includes('removeObject(forKey: self.keyName)'));assert(native.includes('try loadProof() == value'));
 const project=await text(join(mobile,'ios/App/App.xcodeproj/project.pbxproj'));assert(project.includes('AppAttestEnrollmentPlugin.swift in Sources'));assert(project.includes('VerifiedAppPurchase.swift in Sources'));assert(!project.includes('AppAttestDevelopment.entitlements.example'));
});
