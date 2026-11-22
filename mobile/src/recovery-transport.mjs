// Passive HTTPS transport. Configure a release-owned origin explicitly; never
// derive it from backup files, server replies, query strings or user input.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const key=/^[A-Za-z0-9+/]{43}=$/;
const exact=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(n=>Object.hasOwn(v,n));
const paths={challenge:'/v1/ios/recovery/challenge',recover:'/v1/ios/recovery/complete'};
export function createRecoveryTransport({origin=null,bundleId,environment,fetchTransport,timeoutMs=15000}){
 let base=null;
 if(origin!==null){base=new URL(origin);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||base.port)throw Error('RECOVERY_ORIGIN_INVALID');}
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('RECOVERY_TIMEOUT_INVALID');
 if(typeof bundleId!=='string'||!/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(bundleId)||bundleId.startsWith('lv.example.')||!['Sandbox','Production'].includes(environment))throw Error('RECOVERY_SCOPE_INVALID');
 async function request(route,body){
  if(!base)throw Error('RECOVERY_NOT_CONFIGURED');
  const controller=new AbortController();let timer,reader;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();if(reader)void reader.cancel().catch(()=>{});reject(Error('RECOVERY_TIMEOUT'));},timeoutMs);});
  try{return await Promise.race([(async()=>{
   const url=new URL(paths[route],base).href;
   const response=await fetchTransport(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
   // Reject redirected responses even when a custom transport silently followed.
   if(response.redirected||(response.url&&response.url!==url)||response.status!==200)throw Error('RECOVERY_RESPONSE_REJECTED');
   const length=response.headers.get('content-length');
   if(length!==null&&(!/^\d+$/.test(length)||Number(length)>8192))throw Error('RECOVERY_RESPONSE_REJECTED');
   if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??'')||!response.body)throw Error('RECOVERY_RESPONSE_REJECTED');
   reader=response.body.getReader();const parts=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192)throw Error('RECOVERY_RESPONSE_REJECTED');parts.push(value);}}
   catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();reader=null;}
   const data=new Uint8Array(size);let offset=0;for(const p of parts){data.set(p,offset);offset+=p.byteLength;}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
  })(),deadline]);}
  catch{throw Error('RECOVERY_REQUEST_INCOMPLETE');}
  finally{clearTimeout(timer);controller.abort();}
 }
 return Object.freeze({configured:base!==null,
  async issueChallenge(keyId){
   if(typeof keyId!=='string'||!key.test(keyId))throw Error('RECOVERY_KEY_INVALID');
   const c=await request('challenge',{keyId});
   if(!exact(c,['challengeId','installationId','bundleId','identityEnvironment','keyId','challenge','expiresAt'])||!uuid.test(c.challengeId)||!uuid.test(c.installationId)||c.bundleId!==bundleId||c.identityEnvironment!==environment||c.keyId!==keyId||typeof c.challenge!=='string'||!nonce.test(c.challenge)||!Number.isSafeInteger(c.expiresAt)||c.expiresAt<=0)throw Error('RECOVERY_CHALLENGE_INVALID');
   // Server validates expiry using its clock. Do not rely on the iPhone clock.
   return c;
  },
  async recover(input){
   const names=['challengeId','challenge','recoveryId','candidateHash','assertion'];
   if(!exact(input,names)||!uuid.test(input.challengeId)||!uuid.test(input.recoveryId)||typeof input.challenge!=='string'||!nonce.test(input.challenge)||typeof input.candidateHash!=='string'||! /^[a-f0-9]{64}$/.test(input.candidateHash)||typeof input.assertion!=='string'||input.assertion.length===0||input.assertion.length>16384||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.assertion))throw Error('RECOVERY_PROOF_INVALID');
   const ack=await request('recover',input);
   if(!exact(ack,['installationId','recoveryId','candidateHash'])||!uuid.test(ack.installationId)||ack.recoveryId!==input.recoveryId||ack.candidateHash!==input.candidateHash)throw Error('RECOVERY_ACK_INVALID');
   return ack;
  }
 });
}
