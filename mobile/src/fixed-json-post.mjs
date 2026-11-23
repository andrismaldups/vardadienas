// Shared bounded POST reader. Only trusted client modules choose fixed paths.
export function createFixedJsonPost({origin=null,fetchTransport,timeoutMs=15000,maxRequestBytes=24576,errorPrefix}){
 let base=null;
 if(origin!==null){base=new URL(origin);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||base.port)throw Error(errorPrefix+'_ORIGIN_INVALID');}
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Number.isSafeInteger(maxRequestBytes)||maxRequestBytes<1||maxRequestBytes>229376)throw Error(errorPrefix+'_TIMEOUT_INVALID');
 return Object.freeze({configured:base!==null,async post(path,body){
  if(!base)throw Error(errorPrefix+'_NOT_CONFIGURED');
  if(typeof path!=='string'||! /^\/v1\/ios\/[a-z/-]+$/.test(path)||path.includes('//')||path.includes('..'))throw Error(errorPrefix+'_PATH_INVALID');
  const serialized=JSON.stringify(body);if(new TextEncoder().encode(serialized).byteLength>maxRequestBytes)throw Error(errorPrefix+'_PROOF_INVALID');
  const controller=new AbortController();let timer,reader;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();if(reader)void reader.cancel().catch(()=>{});reject(Error('deadline'));},timeoutMs);});
  try{return await Promise.race([(async()=>{
   const url=new URL(path,base).href;
   const response=await fetchTransport(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:serialized,signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
   if(controller.signal.aborted){if(response.body)void response.body.cancel().catch(()=>{});throw Error('deadline');}
   if(response.redirected||(response.url&&response.url!==url)||response.status!==200)throw Error('response');
   const length=response.headers.get('content-length');
   if(length!==null&&(!/^\d+$/.test(length)||Number(length)>8192))throw Error('length');
   if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??'')||!response.body)throw Error('type');
   reader=response.body.getReader();const parts=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192)throw Error('size');parts.push(value);}}
   catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();reader=null;}
   const data=new Uint8Array(size);let offset=0;for(const p of parts){data.set(p,offset);offset+=p.byteLength;}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
  })(),deadline]);}
  catch{throw Error(errorPrefix+'_REQUEST_INCOMPLETE');}
  finally{clearTimeout(timer);controller.abort();}
 }});
}
