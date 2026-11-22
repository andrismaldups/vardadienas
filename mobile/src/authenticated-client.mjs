import {validateCredential} from './installation-identity.mjs';
const MAX_RESPONSE=65536;
async function boundedJson(response){
 const length=response.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_RESPONSE))throw Error('Invalid response length');
 if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''))throw Error('JSON response required');
 if(!response.body)throw Error('Missing response');
 const reader=response.body.getReader(),parts=[];let count=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>MAX_RESPONSE)throw Error('Response too large');parts.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const data=new Uint8Array(count);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}
export function createAuthenticatedClient({origin=null,fetchTransport,identity,bundleId,environment,timeoutMs=15000}){
 let base=null;
 if(origin!==null){base=new URL(origin);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||base.port)throw Error('Trusted HTTPS origin required');}
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Invalid timeout');
 async function request(path,method,body){
  if(!base)throw Error('IOS_SERVER_UNCONFIGURED');
  let stored;try{stored=await identity.read();}catch{throw Error('IDENTITY_UNAVAILABLE');}if(!stored)throw Error('IDENTITY_REQUIRED');
  const credential=validateCredential(stored,{bundleId,environment});
  const controller=new AbortController();let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('IOS_SERVER_TIMEOUT'));},timeoutMs);});
  try{return await Promise.race([(async()=>{
   const response=await fetchTransport(new URL(path,base).href,{method,headers:{'Authorization':'Bearer '+credential.token,'X-Installation-Id':credential.installationId,'Content-Type':'application/json','Accept':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
   if(response.url&&(new URL(response.url).origin!==base.origin||new URL(response.url).pathname!==path))throw Error('Unexpected response URL');
   if(response.status===401||response.status===403)throw Error('IOS_AUTHORIZATION_REQUIRED');
   if(response.status!==200)throw Error('IOS_SERVER_REJECTED');
   return await boundedJson(response);
  })(),timeout]);}
  catch(error){if(['IOS_SERVER_TIMEOUT','IOS_AUTHORIZATION_REQUIRED','IOS_SERVER_REJECTED'].includes(error.message))throw error;throw Error('IOS_SERVER_REQUEST_FAILED');}
  finally{clearTimeout(timer);}
 }
 return {configured:base!==null,
  async checkAccess(){const result=await request('/v1/ios/access','GET');if(typeof result?.allowed!=='boolean')throw Error('IOS_SERVER_INVALID_RESPONSE');return {allowed:result.allowed};},
  async upsertDevice({deviceToken}){if(typeof deviceToken!=='string'||!/^([a-f0-9]{2})+$/.test(deviceToken)||deviceToken.length>4096)throw Error('INVALID_APNS_TOKEN');const result=await request('/v1/ios/device','PUT',{deviceToken});if(result?.active!==true||typeof result.tokenHash!=='string'||!/^[a-f0-9]{64}$/.test(result.tokenHash))throw Error('IOS_SERVER_INVALID_RESPONSE');return {active:true,tokenHash:result.tokenHash};}
 };
}
