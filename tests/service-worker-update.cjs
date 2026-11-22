'use strict';
// Lifecycle and network mocks: run with node tests/service-worker-update.cjs.
const fs = require('node:fs');
const path = require('node:path');
const runTests = async function(source){
 const URL=class {constructor(url,base=''){this.href=/^https?:/.test(url)?url:base+url.replace(/^\.\//,'');this.origin=this.href.match(/^https?:\/\/[^/]+/)[0];}};
 const results=[];const ok=(v,m)=>{if(!v)throw Error(m);};const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
 function setup({failInstall=false,holdInstall=false,offline=false,networkStatus=200}={}){
  const listeners={},deleted=[],saved=[],requests=[],calls=[];let release;
  const cacheNames=["vardadienas-v18","vardadienas-v19","vardadienas-v20","another-app-v1","vardadienas-user-data"];
  const cacheData=new Map(cacheNames.map(k=>[k,new Map()]));
  cacheData.get("vardadienas-v20").set("https://example.test/app/index.html","current-offline");
  cacheData.get("another-app-v1").set("https://example.test/app/foreign.html","wrong-app");
  const caches={
   async open(name){if(!cacheData.has(name))cacheData.set(name,new Map());return{
    async addAll(items){requests.push(...items);calls.push("precache");if(holdInstall)await new Promise(r=>release=r);if(failInstall)throw Error("download failed");calls.push("precache-complete");},
    async put(req,r){saved.push(req.url);cacheData.get(name).set(req.url,r);},
    async match(req){return cacheData.get(name).get(req.url);}
   };},
   async keys(){return [...cacheData.keys()];},
   async delete(k){deleted.push(k);cacheData.delete(k);return true;}
  };
  const self={location:{origin:"https://example.test"},addEventListener(t,f){listeners[t]=f;},async skipWaiting(){calls.push("skipWaiting");},clients:{async claim(){calls.push("claim");}},registration:{async showNotification(){}}};
  class Request {constructor(url,opts){this.url=new URL(url,"https://example.test/app/").href;this.cache=opts?.cache;}}
  class Response {constructor(body,opts={}){this.body=body;this.status=opts.status??200;}}
  const forbidden=new Proxy({}, {get(){throw Error("User storage must not be touched");}});
  new Function("self","caches","fetch","URL","Request","Response","localStorage","indexedDB",source)(self,caches,async()=>{if(offline)throw Error("offline");return {ok:networkStatus===200,status:networkStatus,clone(){return this;}};},URL,Request,Response,forbidden,forbidden);
  async function dispatch(type,extra={}){let promises=[],response;listeners[type]({waitUntil(p){promises.push(p);},respondWith(p){response=p;},...extra});if(response!==undefined)response=await response;await Promise.all(promises);return response;}
  return{dispatch,listeners,calls,requests,deleted,saved,cacheData,release:()=>release?.()};
 }
 let h=setup({holdInstall:true});let p=h.dispatch("install");await tick();ok(!h.calls.includes("skipWaiting"),"Activated before offline files ready");h.release();await p;ok(h.calls.indexOf("skipWaiting")>h.calls.indexOf("precache-complete"),"Activation order");ok(h.requests.length>20&&h.requests.every(r=>r.cache==="reload"),"Must bypass stale HTTP cache");results.push("Installation waits for all fresh offline assets");
 h=setup({failInstall:true});let failed=false;try{await h.dispatch("install");}catch{failed=true;}ok(failed&&!h.calls.includes("skipWaiting")&&h.cacheData.has("vardadienas-v19"),"Failed install replaced old version");results.push("Failed installation retains previous offline version");
 h=setup();await h.dispatch("activate");ok(h.deleted.length===2&&h.deleted.includes("vardadienas-v18")&&h.deleted.includes("vardadienas-v19"),"Cache deletion scope");ok(h.cacheData.has("another-app-v1")&&h.cacheData.has("vardadienas-user-data")&&h.cacheData.has("vardadienas-v20"),"Unrelated data removed");ok(h.calls.includes("claim"),"Clients not claimed");results.push("Activation deletes only old application version caches");
 h=setup({offline:true});let r=await h.dispatch("fetch",{request:{method:"GET",url:"https://example.test/app/index.html"}});ok(r==="current-offline","Offline current version unavailable");r=await h.dispatch("fetch",{request:{method:"GET",url:"https://example.test/app/foreign.html"}});ok(r.status===503,"Used unrelated cache");results.push("Offline reads use only the active application cache");
 h=setup();r=await h.dispatch("fetch",{request:{method:"GET",url:"https://api.other.test/settings"}});ok(r===undefined&&h.saved.length===0,"External API intercepted");r=await h.dispatch("fetch",{request:{method:"POST",url:"https://example.test/app/settings"}});ok(r===undefined,"POST intercepted");results.push("API and mutation requests remain outside offline caching");
 h=setup();r=await h.dispatch("fetch",{request:{method:"GET",url:"https://example.test/app/index.html"}});ok(r.status===200&&h.saved.length===1,"Online response not cached");results.push("Successful online files refresh the active offline cache");
 h=setup({networkStatus:404});r=await h.dispatch("fetch",{request:{method:"GET",url:"https://example.test/app/index.html"}});ok(r.status===404&&h.saved.length===0,"Bad response overwrote good offline files");results.push("HTTP errors cannot overwrite good cached files");
 return results;
};
runTests(fs.readFileSync(path.join(__dirname, '../service-worker.js'), 'utf8')).then(results => {
  for (const result of results) console.log('PASS '+result);
  console.log('Service worker checks: '+results.length);
}).catch(error => { console.error(error); process.exitCode=1; });
