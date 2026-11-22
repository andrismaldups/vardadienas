import test from 'node:test';
import assert from 'node:assert/strict';
import {createGreetingActions,createBackupImporter} from '../src/native-actions.mjs';
const name='vardadienas-dati-2026-11-22-08-45-15.json',folder='12345678-abcd-1234-abcd-123456789abc';
const path=`file:///app/Library/Caches/${folder}/${name}`,cache='file:///app/Library/Caches';
const text='\uFEFF'+JSON.stringify({format:'lv.vardadienas.backup',version:1,favorites:['Mārtiņš'],birthdays:[]});
function fixture({file={},pickerError,read=text,statSize}={}){
 const calls=[];const selected={name,path,size:Buffer.byteLength(text),...file};
 const filesystem={getUri:async options=>{calls.push(['uri',options]);return {uri:cache};},
 stat:async options=>{calls.push(['stat',options]);return {type:'file',size:statSize??selected.size};},
 readFile:async options=>{calls.push(['read',options]);return {data:read};},deleteFile:async options=>calls.push(['delete',options]),rmdir:async options=>calls.push(['rmdir',options])};
 const picker={pickFiles:async options=>{calls.push(['pick',options]);if(pickerError)throw pickerError;return {files:[selected]};}};
 return {calls,filesystem,picker,run:createBackupImporter({picker,filesystem,cacheDirectory:'CACHE',encoding:'utf8'})};
}
test('Native picker requests one JSON without Base64; reads only the selected cache copy and cleans up',async()=>{
 const f=fixture();const result=await f.run();assert.deepEqual(f.calls[0],['pick',{types:['application/json'],limit:1,readData:false}]);
 assert.equal(await result.text(),text);assert.equal(result.size,Buffer.byteLength(text));assert.equal(result.name,name);
 assert.deepEqual(f.calls.map(c=>c[0]),['pick','uri','stat','read','delete','rmdir']);assert.equal(f.calls.at(-1)[1].recursive,undefined);
});
test('Picker cancellation returns no file; permission errors remain errors',async()=>{
 const f=fixture({pickerError:Error('pickFiles canceled.')});assert.equal(await f.run(),null);assert.equal(f.calls.length,1);
 await assert.rejects(fixture({pickerError:Error('permission denied')}).run(),/permission denied/);
});
test('Oversized or non-JSON selections are rejected before reading, then their own copy is cleaned',async()=>{
 for(const file of [{size:5*1024*1024+1},{size:-1},{size:NaN},{name:'backup.txt',path:path.replace(name,'backup.txt')}]){
 const f=fixture({file});await assert.rejects(f.run());assert(!f.calls.some(c=>c[0]==='read'));assert(f.calls.some(c=>c[0]==='delete'));
 }
});
test('External, private Library and malformed paths are neither read nor deleted',async()=>{
 for(const p of ['https://example.com/data.json','file:///app/Library/storage-a.json',`file:///app/Library/Caches/no-uuid/${name}`,path+'?query=1',path.replace(name,'different.json')]){
 const f=fixture({file:{path:p}});await assert.rejects(f.run());assert(!f.calls.some(c=>['stat','read','delete','rmdir'].includes(c[0])));
 }
});
test('Changed metadata or invalid decoded UTF-8 cannot reach preview',async()=>{
 const changed=fixture({statSize:2});await assert.rejects(changed.run(),/mainījies/);assert(!changed.calls.some(c=>c[0]==='read'));
 const invalid=fixture({read:'different'});await assert.rejects(invalid.run(),/UTF-8/);assert(invalid.calls.some(c=>c[0]==='delete'));
});
test('Failed file reads still clean only the copied file, and a subsequent picker attempt is allowed',async()=>{
 const f=fixture();f.filesystem.readFile=async()=>{throw Error('read failed');};await assert.rejects(f.run(),/read failed/);
 assert(f.calls.some(c=>c[0]==='delete'));f.filesystem.readFile=async()=>({data:text});assert(await f.run());
});
test('Concurrent picker requests are rejected without opening a second system sheet',async()=>{
 const f=fixture();let release;f.picker.pickFiles=()=>new Promise(r=>release=r);
 const first=f.run();await assert.rejects(f.run(),/jau notiek/);release({files:[]});await assert.rejects(first,/vienu/);
});
test('Greeting actions share text only and write text only on explicit copy',async()=>{
 const calls=[];const actions=createGreetingActions({share:{canShare:async()=>({value:true}),share:async v=>calls.push(['share',v])},clipboard:{write:async v=>calls.push(['copy',v])}});
 const value='Mārtiņ, sveicieni! 🌷\nLai izdodas!';await actions.shareText(value);await actions.copyText(value);
 assert.deepEqual(calls,[['share',{text:value}],['copy',{string:value}]]);
 await assert.rejects(actions.shareText('  '));await assert.rejects(actions.copyText(null));
});
test('Native share cancellation is a quiet AbortError; share failure never writes clipboard',async()=>{
 let copied=false;const actions=createGreetingActions({share:{canShare:async()=>({value:true}),share:async()=>{throw Error('Share canceled');}},clipboard:{write:async()=>{copied=true;}}});
 await assert.rejects(actions.shareText('Sveicu!'),error=>error.name==='AbortError');assert.equal(copied,false);
});
test('Unavailable sharing, native clipboard failure and overlapping shares are reported without fallback',async()=>{
 const unavailable=createGreetingActions({share:{canShare:async()=>({value:false})},clipboard:{write:async()=>{throw Error('copy failed');}}});
 await assert.rejects(unavailable.shareText('Sveicu!'),/nav pieejama/);await assert.rejects(unavailable.copyText('Sveicu!'),/copy failed/);
 let release;const action=createGreetingActions({share:{canShare:async()=>({value:true}),share:()=>new Promise(r=>release=r)},clipboard:{}});
 const first=action.shareText('Sveicu!');await new Promise(r=>setImmediate(r));await assert.rejects(action.shareText('Atkal'),/jau notiek/);release();await first;
});

test('Native UTF-8 decoding may retain or consume the three-byte BOM without changing imported JSON',async()=>{
 const f=fixture({read:text.slice(1)});const result=await f.run();assert.equal(await result.text(),text.slice(1));
});
