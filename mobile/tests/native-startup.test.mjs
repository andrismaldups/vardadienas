import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto,createHash} from 'node:crypto';
import {encodeSnapshot,decodeSnapshot} from '../src/storage-core.mjs';
import {HEAD_KEY} from '../src/storage-vault.mjs';
import {HANDOFF} from '../src/storage-startup.mjs';
const boot=await readFile(new URL('../www/native-boot.js',import.meta.url),'utf8');
const actions=await readFile(new URL('../www/native-backup.js',import.meta.url),'utf8');
const runtime=await readFile(new URL('../www/native-storage.js',import.meta.url),'utf8');
function memory(initial={}){const values=new Map(Object.entries(initial));return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function fixture({corrupt=false}={}){
 const text=encodeSnapshot({favorites:'["Andris"]',birthdays:'[]'}),head={version:1,slot:'a',sha256:createHash('sha256').update(text).digest('hex')};
 const preferences=memory({[HEAD_KEY]:JSON.stringify(head)}),files=new Map([['vardadienas/storage-a.json',corrupt?'broken':text]]),docEvents={};
 const element=()=>({hidden:false,style:{},textContent:'',addEventListener(){},setAttribute(){},append(){},replaceChildren(){}});
 const nativeCalls=[];
 const elements={bootStatus:element(),bootRetry:element()};let resolveDone;
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
    {name:'Clipboard',methods:[{name:'write',rtype:'promise'}]}],
    nativePromise:async(plugin,method,args)=>{
     nativeCalls.push({plugin,method,args});
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
