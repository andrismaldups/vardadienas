import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createStorage,encodeSnapshot,decodeSnapshot,captureLegacy} from '../src/storage-core.mjs';
import {createVault,HEAD_KEY} from '../src/storage-vault.mjs';
const base={favorites:'["Andris"]',birthdays:'[{"id":"p1","name":"Baiba","day":24,"month":11,"year":2001}]',designStyle:'sea-mist',reminderEveningTime:'18:00'};
const hash=async text=>createHash('sha256').update(text).digest('hex');
function fixture(){
 const data=new Map(),heads=new Map(),writes=[];
 const io={files:{exists:async p=>data.has(p),read:async p=>{if(!data.has(p))throw Error('missing file');return data.get(p);},write:async(p,t)=>{writes.push(p);data.set(p,t);}},preferences:{get:async({key})=>({value:heads.get(key)??null}),set:async({key,value})=>{heads.set(key,value);}},hash};
 return {data,heads,writes,io,vault:createVault(io)};
}
test('Native snapshot round trip preserves lists/IDs/settings; rejects protected credentials and malformed data',()=>{
 assert.deepEqual(decodeSnapshot(encodeSnapshot(base)),base);
 for(const value of [{...base,testPushSubscriptionId:'6'},{...base,favorites:'null'}, {...base,birthdays:'[{"name":"X","day":31,"month":4,"year":2000}]'}, {...base,reminderEveningTime:'25:00'}])assert.throws(()=>encodeSnapshot(value));
 assert.throws(()=>decodeSnapshot('{"format":"unknown","version":1,"values":{}}'));
});
test('Legacy migration copies personal values only, does not erase original storage, rejects interrupted deletion',()=>{
 const source={...base,vardadienas_test_installation_v1:'SECRET',testPushSubscriptionId:'6'};
 const storage={getItem:k=>source[k]??null};assert.deepEqual(captureLegacy(storage),base);assert.equal(source.testPushSubscriptionId,'6');
 source.vardadienas_test_deletion_pending_v1='pending';assert.throws(()=>captureLegacy(storage));
});
test('Absent head is first run; committed snapshot survives a fresh vault instance',async()=>{
 const f=fixture();assert.equal(await f.vault.load(),null);await f.vault.save(encodeSnapshot(base));
 assert.deepEqual(decodeSnapshot(await createVault(f.io).load()),base);assert.equal(f.writes[0],'vardadienas/storage-a.json');
});
test('Writes alternate slots and preserve the previous active copy until pointer acknowledgement',async()=>{
 const f=fixture();const first=encodeSnapshot(base),next=encodeSnapshot({...base,favorites:'["Andris","Ieva"]'});
 await f.vault.save(first);let previous;
 f.io.preferences.set=async({key,value})=>{previous=f.heads.get(key);assert.equal(f.data.get('vardadienas/storage-a.json'),first);f.heads.set(key,value);};
 await f.vault.save(next);assert.equal(JSON.parse(previous).slot,'a');assert.equal(f.vault.getHead().slot,'b');
 assert.equal(await createVault(f.io).load(),next);
});
test('Corrupt/missing committed file or malformed pointer halts startup rather than returning empty values',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));const active=f.vault.getHead().slot;
 f.data.set(`vardadienas/storage-${active}.json`,'broken');await assert.rejects(createVault(f.io).load(),/kontrolsumma/);
 f.data.clear();await assert.rejects(createVault(f.io).load(),/missing/);
 f.heads.set(HEAD_KEY,'{"slot":"../escape"}');await assert.rejects(createVault(f.io).load(),/norāde/);
});
test('Torn write/read-back mismatch never changes the active pointer',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));const old=f.heads.get(HEAD_KEY);
 f.io.files.write=async(p,t)=>f.data.set(p,t.slice(0,20));
 await assert.rejects(f.vault.save(encodeSnapshot({...base,favorites:'[]'})),/pārbaude/);
 assert.equal(f.heads.get(HEAD_KEY),old);assert.deepEqual(decodeSnapshot(await createVault(f.io).load()),base);
});
test('Disk-full failure leaves the last committed snapshot readable',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));f.io.files.write=async()=>{throw Error('disk full');};
 await assert.rejects(f.vault.save(encodeSnapshot({...base,favorites:'[]'})),/disk full/);
 assert.deepEqual(decodeSnapshot(await createVault(f.io).load()),base);
});
test('Pointer rejection preserves the previous snapshot and permits a retry',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));const set=f.io.preferences.set;
 f.io.preferences.set=async()=>{throw Error('pointer rejected');};const next=encodeSnapshot({...base,favorites:'[]'});
 await assert.rejects(f.vault.save(next),/pointer rejected/);assert.deepEqual(decodeSnapshot(await createVault(f.io).load()),base);
 f.io.preferences.set=set;await f.vault.save(next);assert.equal(await createVault(f.io).load(),next);
});
test('Lost pointer acknowledgement is reconciled without rolling data backwards',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));
 f.io.preferences.set=async({key,value})=>{f.heads.set(key,value);throw Error('ack lost');};
 const next=encodeSnapshot({...base,favorites:'[]'});await f.vault.save(next);assert.equal(await createVault(f.io).load(),next);
});
test('A stale writer refuses to overwrite a newer pointer',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));const stale=createVault({...f.io,head:f.vault.getHead()});
 await f.vault.save(encodeSnapshot({...base,favorites:'[]'}));
 await assert.rejects(stale.save(encodeSnapshot({...base,designStyle:'classic'})),/mainījusies/);
});
test('Synchronous app mutations coalesce and serial persistence catches mutations during a write',async()=>{
 const saved=[];let release;const states=[];
 const c=createStorage({initial:base,onState:s=>states.push(s),save:async text=>{saved.push(text);if(saved.length===1)await new Promise(r=>release=r);}});
 c.storage.setItem('favorites','[]');c.storage.setItem('designStyle','classic');
 const flushing=c.flush();await new Promise(r=>setImmediate(r));
 c.storage.setItem('appearanceMode','dark');release();await flushing;
 assert.equal(saved.length,2);assert.equal(decodeSnapshot(saved[0]).designStyle,'classic');assert.equal(decodeSnapshot(saved[1]).appearanceMode,'dark');assert.equal(states.at(-1),'saved');
});
test('Failed ordinary save blocks further mutations, preserves pending data and supports explicit retry',async()=>{
 let fail=true;let durable;const c=createStorage({initial:base,save:async t=>{if(fail)throw Error('disk full');durable=t;}});
 c.storage.setItem('favorites','[]');await assert.rejects(c.flush(),/disk full/);
 assert.throws(()=>c.storage.setItem('favorites','["Ieva"]'),/nav pabeigta/);assert.equal(c.storage.getItem('favorites'),'[]');
 fail=false;await c.flush();assert.equal(decodeSnapshot(durable).favorites,'[]');
});
test('Import transaction writes one final native snapshot, never a journal or partially imported list',async()=>{
 const saved=[];const c=createStorage({initial:base,save:async t=>saved.push(t)});
 await c.commit({favorites:'[]'},(s,u)=>{s.setItem('vardadienas_backup_transaction_v1',JSON.stringify({version:1,before:{favorites:s.getItem('favorites')}}));s.setItem('favorites',u.favorites);s.removeItem('vardadienas_backup_transaction_v1');});
 assert.equal(saved.length,1);assert.equal(decodeSnapshot(saved[0]).favorites,'[]');assert.equal(decodeSnapshot(saved[0]).vardadienas_backup_transaction_v1,undefined);
});
test('Uncertain import failure blocks every future write until startup rechecks native storage',async()=>{
 const states=[];const c=createStorage({initial:base,onState:s=>states.push(s),save:async()=>{throw Error('unknown acknowledgement');}});
 await assert.rejects(c.commit({favorites:'[]'},(s,u)=>s.setItem('favorites',u.favorites)),/unknown/);
 assert.equal(c.storage.getItem('favorites'),base.favorites);assert.equal(states.at(-1),'reload');
 await assert.rejects(c.flush(),/jāpārbauda/);assert.throws(()=>c.storage.setItem('designStyle','classic'));
});
test('Pending import rejects concurrent unrelated edits',async()=>{
 let release;const c=createStorage({initial:base,save:()=>new Promise(r=>release=r)});
 const saving=c.commit({favorites:'[]'},(s,u)=>s.setItem('favorites',u.favorites));await new Promise(r=>setImmediate(r));
 assert.throws(()=>c.storage.setItem('designStyle','classic'),/nav pabeigta/);release();await saving;
});

test('Startup never migrates stale WebView data over a committed native snapshot',async()=>{
 const {prepareStartup,HANDOFF}=await import('../src/storage-startup.mjs');const f=fixture();await f.vault.save(encodeSnapshot(base));
 const session=new Map();const storage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 await prepareStartup({vault:createVault(f.io),legacy:{getItem:()=>{throw Error('legacy must not be read');}},session:storage});
 assert.deepEqual(decodeSnapshot(JSON.parse(session.get(HANDOFF)).text),base);assert.equal(f.writes.length,1);
});
test('Startup read failure cannot create a handoff or write an empty replacement',async()=>{
 const {prepareStartup,HANDOFF}=await import('../src/storage-startup.mjs');let writes=0;const session=new Map([[HANDOFF,'stale']]);
 const storage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 await assert.rejects(prepareStartup({vault:{load:async()=>{throw Error('read failed');},save:async()=>writes++},legacy:{getItem:()=>null},session:storage}),/read failed/);
 assert.equal(writes,0);assert.equal(session.has(HANDOFF),false);
});
test('Startup handoff capacity is checked before committing a snapshot',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));const old=f.heads.get(HEAD_KEY);
 const vault=createVault({...f.io,head:f.vault.getHead(),preflight:()=>{throw Error('session quota');}});
 await assert.rejects(vault.save(encodeSnapshot({...base,favorites:'[]'})),/session quota/);assert.equal(f.heads.get(HEAD_KEY),old);assert.equal(f.writes.length,1);
});

test('Explicit personal deletion scrubs the previous private copy and prevents legacy resurrection',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));
 const empty=encodeSnapshot({designStyle:base.designStyle});await f.vault.save(empty);await f.vault.scrubInactive();
 assert.equal(f.data.get('vardadienas/storage-a.json'),empty);assert.equal(f.data.get('vardadienas/storage-b.json'),empty);
 assert.equal(await createVault(f.io).load(),empty);
});
test('Failure to scrub the previous copy is reported instead of confirming full deletion',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));const empty=encodeSnapshot({});await f.vault.save(empty);
 f.io.files.write=async()=>{throw Error('scrub failed');};await assert.rejects(f.vault.scrubInactive(),/scrub failed/);
 assert.equal(await createVault(f.io).load(),empty);
});

test('Missing pointer with surviving data files is never treated as an empty installation',async()=>{
 const f=fixture();await f.vault.save(encodeSnapshot(base));f.heads.delete(HEAD_KEY);
 await assert.rejects(createVault(f.io).load(),/bez krātuves norādes/);assert.equal(f.writes.length,1);
});
test('Failure checking file existence cannot authorise first-run migration',async()=>{
 const f=fixture();f.io.files.exists=async()=>{throw Error('permission denied');};
 await assert.rejects(f.vault.load(),/permission denied/);assert.equal(f.writes.length,0);
});

test('Portable checksum matches SHA-256 without relying on crypto.subtle; cache IDs use random bytes',async()=>{
 const {snapshotHash,temporaryId}=await import('../src/native-utils.mjs');
 for(const text of ['', 'abc', 'Mārtiņš 🎂', encodeSnapshot(base)])assert.equal(snapshotHash(text),await hash(text));
 const id=temporaryId({getRandomValues:bytes=>{bytes.fill(42);return bytes;}});assert.equal(id,'2a'.repeat(16));
});
