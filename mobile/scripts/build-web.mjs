import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm, readdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(mobile, '..');
const out = join(mobile, 'www');
const hash = data => createHash('sha256').update(data).digest('hex');
const files = ['index.html', 'data-backup.js', 'design-system.css', 'name-days.json', 'icon-192.png', 'icon-512.png'];
for (const directory of ['assets', 'clean-ds-1.1']) {
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:css|js|svg|webp|png)$/.test(entry.name)) files.push(`${directory}/${entry.name}`);
  }
}
const source = await readFile(join(root, 'index.html'), 'utf8');
const sw = /if \("serviceWorker" in navigator\) \{\s*window\.addEventListener\("load", \(\) => \{\s*navigator\.serviceWorker\.register\("\.\/service-worker\.js"\);\s*\}\);\s*\}/g;
if ([...source.matchAll(sw)].length !== 1) throw Error('PWA service-worker registration changed: review native packaging transform.');
let html = source.replace(sw, '/* Offline assets are bundled in the iOS app; no PWA service worker registration. */');
html = html.replace('<link rel="manifest" href="manifest.json">', '');
// Dormant legacy design is not selectable; its missing image must not be requested at startup.
html = html.replace('<img class="lavender-top-art" src="assets/lavanda_augsa.png" alt="" aria-hidden="true" decoding="async">', '');
html = html.replace('width=device-width,initial-scale=1', 'width=device-width,initial-scale=1,viewport-fit=cover');
if (!html.includes('<meta charset="utf-8">')) throw Error('Native startup insertion point missing');
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><script src="native-preview.js"></script><script src="native-identity.js"></script><script src="native-storage.js"></script><script src="native-backup.js"></script><script src="native-push.js"></script>`);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const manifest = { sourceIndexSha256: hash(source), files: {} };
for (const file of files.sort()) {
  const data = await readFile(join(root, file));
  await mkdir(dirname(join(out, file)), { recursive: true });
  if (file === 'index.html') await writeFile(join(out, 'app.html'), html);
  else await copyFile(join(root, file), join(out, file));
  manifest.files[file] = hash(data);
}
await copyFile(join(mobile, 'src/native-preview.js'), join(out, 'native-preview.js'));
await writeFile(join(out, 'packaging-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Packaged ${files.length} existing application files locally; root PWA files unchanged.`);

await build({ entryPoints: [join(mobile, 'src/native-backup.mjs')], outfile: join(out, 'native-backup.js'), bundle: true, format: 'iife', platform: 'browser', target: 'safari15' });

await writeFile(join(out, 'index.html'), `<!doctype html><html lang="lv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Vārdadienas</title><style>body{font:18px system-ui;background:#f3f7fb;color:#142c40;max-width:40rem;margin:20vh auto;padding:24px}button{font:inherit;padding:12px}</style><script defer src="native-boot.js"></script></head><body><main><h1>Vārdadienas</h1><p id="bootStatus" role="status">Pārbauda saglabātos datus…</p><button id="bootRetry" hidden>Mēģināt vēlreiz</button></main></body></html>`);
for (const name of ['native-boot','native-identity','native-storage','native-push']) await build({entryPoints:[join(mobile, `src/${name}.mjs`)],outfile:join(out,`${name}.js`),bundle:true,format:'iife',platform:'browser',target:'safari15'});

await copyFile(join(mobile, 'THIRD_PARTY_NOTICES.txt'), join(out, 'THIRD_PARTY_NOTICES.txt'));
