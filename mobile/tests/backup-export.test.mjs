import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupExporter } from '../src/backup-export.mjs';
const filename = 'vardadienas-dati-2026-11-22-08-45-15.json';
const text = JSON.stringify({format:'lv.vardadienas.backup',version:1,favorites:['Mārtiņš'],birthdays:[]});
function setup(overrides={}) {
  const calls=[];
  const filesystem={writeFile:async v=>{calls.push(['write',v]);return {uri:'file:///cache/backup.json'};},
    deleteFile:async v=>calls.push(['delete',v]),rmdir:async v=>calls.push(['rmdir',v]),...overrides.filesystem};
  const share={canShare:async()=>({value:true}),share:async v=>calls.push(['share',v]),...overrides.share};
  return {calls,run:createBackupExporter({filesystem,share,directory:'CACHE',encoding:'utf8',randomId:()=> 'test-id'})};
}
test('Exports actual UTF-8 JSON as a files-only attachment, then cleans its cache',async()=>{
 const {calls,run}=setup();const result=await run({filename,text});
 assert.equal(result.bytes,Buffer.byteLength(text));assert.equal(calls[0][1].data,text);
 assert.deepEqual(calls[1],['share',{files:['file:///cache/backup.json']}]);
 assert.deepEqual(calls.map(v=>v[0]),['write','share','delete','rmdir']);
 assert.equal(calls[3][1].recursive,undefined);
});
test('Does not fall back to title-only sharing on a native failure',async()=>{
 const {calls,run}=setup({share:{share:async()=>{throw Error('cancelled');}}});
 await assert.rejects(run({filename,text}),/cancelled/);assert.equal(calls.filter(v=>v[0]==='delete').length,1);
});
test('Invalid/oversized input and unavailable sharing do not create a file',async()=>{
 const {calls,run}=setup();
 for(const data of [{filename:'../a.json',text},{filename,text:'Vārdadienu datu kopija'},
 {filename,text:'x'.repeat(5*1024*1024+1)}])await assert.rejects(run(data));
 assert.equal(calls.length,0);
 const unavailable=setup({share:{canShare:async()=>({value:false})}});
 await assert.rejects(unavailable.run({filename,text}),/nav pieejama/);assert.equal(unavailable.calls.length,0);
});
test('Write failure never opens sharing; a later attempt can succeed',async()=>{
 let fail=true;const {calls,run}=setup({filesystem:{writeFile:async()=>{if(fail)throw Error('disk full');return {uri:'file:///cache/retry.json'};}}});
 await assert.rejects(run({filename,text}),/disk full/);assert.equal(calls.length,0);fail=false;
 await run({filename,text});assert.equal(calls[0][0],'share');
});
test('Rejects remote file URI and overlapping exports',async()=>{
 const remote=setup({filesystem:{writeFile:async()=>({uri:'https://example.com/x'})}});
 await assert.rejects(remote.run({filename,text}),/vietējā/);
 let finish;const {run}=setup({share:{share:()=>new Promise(resolve=>{finish=resolve;})}});
 const first=run({filename,text});await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(run({filename,text}),/jau notiek/);finish();await first;
});
