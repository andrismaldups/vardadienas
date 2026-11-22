import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto,createHash} from 'node:crypto';
import {encodeSnapshot,decodeSnapshot} from '../src/storage-core.mjs';
import {HEAD_KEY} from '../src/storage-vault.mjs';
import {HANDOFF} from '../src/storage-startup.mjs';
const boot=await readFile(new URL('../www/native-boot.js',import.meta.url),'utf8');
const identityCode=await readFile(new URL('../www/native-identity.js',import.meta.url),'utf8');
const pushCode=await readFile(new URL('../www/native-push.js',import.meta.url),'utf8');
const pushHtml=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const actions=await readFile(new URL('../www/native-backup.js',import.meta.url),'utf8');
const runtime=await readFile(new URL('../www/native-storage.js',import.meta.url),'utf8');
function memory(initial={}){const values=new Map(Object.entries(initial));return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function fixture({corrupt=false}={}){
 const text=encodeSnapshot({favorites:'["Andris"]',birthdays:'[]'}),head={version:1,slot:'a',sha256:createHash('sha256').update(text).digest('hex')};
 const preferences=memory({[HEAD_KEY]:JSON.stringify(head)}),files=new Map([['vardadienas/storage-a.json',corrupt?'broken':text]]),docEvents={};
 const element=()=>({hidden:false,style:{},textContent:'',classList:{remove(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(){},append(){},replaceChildren(){}});
 const nativeCalls=[];
 const elements={bootStatus:element(),bootRetry:element(),activatePushButton:element(),pushActivationStatus:element(),remindersEnabled:element(),deleteMyDataButton:element(),deleteMyDataStatus:element()};let resolveDone;
 const done=new Promise(r=>resolveDone=r);
 const status=elements.bootStatus;let message='';Object.defineProperty(status,'textContent',{get:()=>message,set:v=>{message=v;if(v.startsWith('Saglabātos datus neizdevās'))resolveDone();}});
 const ctx={console,URL,TextEncoder,crypto:{getRandomValues:v=>webcrypto.getRandomValues(v)},queueMicrotask,setTimeout,clearTimeout,
   localStorage:memory({favorites:'["STALE"]'}),sessionStorage:memory(),location:{replace:url=>{ctx.destination=url;resolveDone();}},
   document:{body:element(),hidden:false,getElementById:id=>elements[id]??null,createElement:element,addEventListener:(name,fn)=>(docEvents[name]??=[]).push(fn)},
   addEventListener(){},stop(){ctx.stopped=true;},confirm:()=>false,
   CapacitorCustomPlatform:{name:'ios'},Capacitor:{PluginHeaders:[
    {name:'Preferences',methods:['get','set'].map(name=>({name,rtype:'promise'}))},
    {name:'Filesystem',methods:['readFile','writeFile','stat','getUri','deleteFile','rmdir'].map(name=>({name,rtype:'promise'}))},
    {name:'FilePicker',methods:[{name:'pickFiles',rtype:'promise'}]},
    {name:'Share',methods:['canShare','share'].map(name=>({name,rtype:'promise'}))},
    {name:'Clipboard',methods:[{name:'write',rtype:'promise'}]},
    {name:'InstallationIdentity',methods:[{name:'read',rtype:'promise'}]}],
    nativePromise:async(plugin,method,args)=>{
     nativeCalls.push({plugin,method,args});
     if(plugin==='InstallationIdentity')return {record:ctx.identityRecord??null};
     if(plugin==='Clipboard')return {};
     if(plugin==='Share')return method==='canShare'?{value:true}:{activityType:'test'};
     if(plugin==='FilePicker'){
      const name='backup.json',path='file:///app/Library/Caches/12345678-abcd-1234-abcd-123456789abc/'+name;
      files.set(path,text);return {files:[{name,path,size:Buffer.byteLength(text)}]};
     }
     if(plugin==='Filesystem'&&method==='getUri')return {uri:'file:///app/Library/Caches'};
     if(plugin==='Filesystem'&&method==='deleteFile'){files.delete(args.path);return {};}
     if(plugin==='Filesystem'&&method==='rmdir')return {};

     if(plugin==='Preferences'){if(method==='get')return {value:preferences.getItem(args.key)};preferences.setItem(args.key,args.value);return {};}
     if(plugin==='Filesystem'){if(method==='stat'){if(files.has(args.path))return {type:'file',size:Buffer.byteLength(files.get(args.path))};const e=Error('missing');e.code='OS-PLUG-FILE-0008';throw e;}if(method==='readFile'){if(!files.has(args.path))throw Error('missing');return {data:files.get(args.path)};}files.set(args.path,args.data);return {uri:'file:///library/'+args.path};}
     throw Error('unexpected native call');
    }}
 };ctx.window=ctx;vm.createContext(ctx);return {ctx,files,preferences,elements,done,docEvents,nativeCalls};
}
test('Compiled boot hydrates only validated native data; compiled runtime installs it before app storage reads',async()=>{
 const f=fixture();vm.runInContext(boot,f.ctx);await f.done;assert.equal(f.ctx.destination,'./app.html');
 assert(f.ctx.sessionStorage.getItem(HANDOFF));vm.runInContext(runtime,f.ctx);
 assert.equal(f.ctx.localStorage.getItem('favorites'),'["Andris"]');assert.equal(f.ctx.sessionStorage.getItem(HANDOFF),null);
 f.ctx.localStorage.setItem('favorites','["Andris","Ieva"]');await f.ctx.VardadienasNativeStorage.flush();
 const head=JSON.parse(f.preferences.getItem(HEAD_KEY));assert.equal(decodeSnapshot(f.files.get(`vardadienas/storage-${head.slot}.json`)).favorites,'["Andris","Ieva"]');
});
test('Compiled boot blocks corrupt native data without loading app or rewriting the old copy',async()=>{
 const f=fixture({corrupt:true});const before=[...f.files];vm.runInContext(boot,f.ctx);await f.done;
 assert.equal(f.ctx.destination,undefined);assert.equal(f.ctx.sessionStorage.getItem(HANDOFF),null);assert.deepEqual([...f.files],before);assert.equal(f.elements.bootRetry.hidden,false);
});
test('Direct app startup without a verified handoff stops and routes through boot with storage writes denied',()=>{
 const f=fixture();assert.throws(()=>vm.runInContext(runtime,f.ctx),/palaišanas/);
 assert.equal(f.ctx.destination,'./index.html');assert.equal(f.ctx.stopped,true);assert.throws(()=>f.ctx.localStorage.setItem('favorites','[]'),/nav atvērta/);
});

test('Compiled native actions wire the selected local file and text-only share/copy through the native bridge',async()=>{
 const f=fixture();vm.runInContext(actions,f.ctx);
 const selected=await f.ctx.VardadienasNativeBackup.importFile();assert.equal(selected.name,'backup.json');assert.equal(decodeSnapshot(await selected.text()).favorites,'["Andris"]');
 assert(![...f.files.keys()].some(p=>p.includes('/Caches/')));
 await f.ctx.VardadienasNativeGreetings.shareText('Sveicu! 🎂');await f.ctx.VardadienasNativeGreetings.copyText('Rediģēts 🌷');
 const shared=f.nativeCalls.find(c=>c.plugin==='Share'&&c.method==='share');assert.equal(Object.keys(shared.args).join(','),'text');assert.equal(shared.args.text,'Sveicu! 🎂');
 const copied=f.nativeCalls.find(c=>c.plugin==='Clipboard');assert.equal(copied.args.string,'Rediģēts 🌷');
 const picked=f.nativeCalls.find(c=>c.plugin==='FilePicker');assert.equal(picked.args.readData,false);assert.equal(picked.args.limit,1);
});

test('Compiled native Push keeps unconfigured controls inactive without any native permission/token calls',async()=>{
 const f=fixture();let flushed=0;f.ctx.VardadienasNativeStorage={flush:async()=>{flushed++;}};
 vm.runInContext(pushCode,f.ctx);for(const listener of f.docEvents.DOMContentLoaded)listener();
 assert.equal(f.elements.activatePushButton.disabled,true);assert.equal(f.elements.remindersEnabled.checked,false);assert.equal(f.elements.remindersEnabled.disabled,true);
 assert.equal(await f.ctx.VardadienasNativePush.activate(),false);assert.equal(f.nativeCalls.length,0);
 // Existing PWA reminder controls still own local persistence/UI behaviour;
 // the native hook bypasses only Web Push server synchronisation.
 const start=pushHtml.indexOf('function queueTestReminderSync(){'),end=pushHtml.indexOf("activatePushButton.addEventListener('click'",start);
 vm.runInContext(pushHtml.slice(start,end),f.ctx);f.ctx.queueTestReminderSync();await new Promise(r=>setImmediate(r));
 assert.equal(flushed,1);assert(f.elements.pushActivationStatus.textContent.includes('saglabāta ierīcē'));assert.equal(f.nativeCalls.length,0);
});

test('Compiled identity boundary never exposes credentials and blocks local-only deletion of enrolled identity',async()=>{
 const f=fixture();vm.runInContext(identityCode,f.ctx);assert.deepEqual(Object.keys(f.ctx.VardadienasNativeIdentity),['assertLocalDeletionAllowed']);
 await f.ctx.VardadienasNativeIdentity.assertLocalDeletionAllowed();f.ctx.identityRecord='server-credential';
 await assert.rejects(f.ctx.VardadienasNativeIdentity.assertLocalDeletionAllowed(),/serverī/);assert.equal(f.nativeCalls.length,2);
});

test('Compiled native deletion guard preserves lists when an enrolled identity needs server revocation',async()=>{
 const f=fixture();vm.runInContext(boot,f.ctx);await f.done;vm.runInContext(identityCode,f.ctx);vm.runInContext(runtime,f.ctx);
 for(const listener of f.docEvents.DOMContentLoaded)listener();f.ctx.confirm=()=>true;f.ctx.identityRecord='enrolled';const before=[...f.files];
 await f.elements.deleteMyDataButton.listeners.click({stopImmediatePropagation(){},preventDefault(){}});
 assert.equal(f.ctx.localStorage.getItem('favorites'),'["Andris"]');assert.deepEqual([...f.files],before);assert(f.elements.deleteMyDataStatus.textContent.includes('serverī'));
});
test('Compiled native deletion still clears both copies when Keychain confirms there is no enrolled identity',async()=>{
 const f=fixture();vm.runInContext(boot,f.ctx);await f.done;vm.runInContext(identityCode,f.ctx);vm.runInContext(runtime,f.ctx);
 for(const listener of f.docEvents.DOMContentLoaded)listener();f.ctx.confirm=()=>true;
 await f.elements.deleteMyDataButton.listeners.click({stopImmediatePropagation(){},preventDefault(){}});
 assert.equal(f.ctx.destination,'./index.html');assert.equal(f.ctx.localStorage.getItem('favorites'),null);
 for(const [path,text] of f.files)if(path.startsWith('vardadienas/storage-'))assert.equal(decodeSnapshot(text).favorites,undefined);
});
