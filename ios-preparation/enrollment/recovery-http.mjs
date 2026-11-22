// Deployment-neutral Request/Response adapter, NOT a Worker export or D1 binding.
// The deployment must inject a trusted ingress/rate-limit gate; absent gate fails closed.
const routes=new Set(['/v1/ios/recovery/challenge','/v1/ios/recovery/complete']);
const exact=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(n=>Object.hasOwn(v,n));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const nonce=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
export function createRecoveryHttpHandler({origin,service,admitRequest=null,bodyTimeoutMs=5000}){
 const base=new URL(origin);if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash||!Number.isSafeInteger(bodyTimeoutMs)||bodyTimeoutMs<1||bodyTimeoutMs>10000)throw Error('RECOVERY_HTTP_CONFIGURATION');
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 return async function handle(request){
  const url=new URL(request.url);
  if(url.origin!==base.origin||url.search||url.hash||!routes.has(url.pathname))return reply(404,{error:'NOT_FOUND'});
  if(request.method!=='POST')return reply(405,{error:'METHOD_NOT_ALLOWED'});
  if(typeof admitRequest!=='function'||typeof service?.issueChallenge!=='function'||typeof service?.recover!=='function')return reply(503,{error:'RECOVERY_UNAVAILABLE'});
  // No reflected CORS origins, cookies or bearer token required for recovery:
  // possession is proved by the existing App Attest private key.
  try{if(await admitRequest(request)!==true)return reply(429,{error:'RECOVERY_TRY_LATER'});}catch{return reply(503,{error:'RECOVERY_UNAVAILABLE'});}
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||request.headers.has('content-encoding'))return reply(415,{error:'JSON_REQUIRED'});
  const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>24576))return reply(413,{error:'REQUEST_TOO_LARGE'});
  let reader,timer;
  let value;
  try{
   if(!request.body)return reply(400,{error:'INVALID_REQUEST'});
   reader=request.body.getReader();
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{void reader.cancel().catch(()=>{});reject(Error('BODY_TIMEOUT'));},bodyTimeoutMs);});
   value=await Promise.race([(async()=>{const parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>24576)throw Error('BODY_TOO_LARGE');parts.push(value);}const data=new Uint8Array(size);let n=0;for(const p of parts){data.set(p,n);n+=p.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));})(),timeout]);
  }catch{if(reader)void reader.cancel().catch(()=>{});return reply(400,{error:'INVALID_REQUEST'});}finally{clearTimeout(timer);if(reader)reader.releaseLock();}
  try{
   if(url.pathname.endsWith('/challenge')){
    if(!exact(value,['keyId'])||typeof value.keyId!=='string'||! /^[A-Za-z0-9+/]{43}=$/.test(value.keyId))return reply(400,{error:'INVALID_REQUEST'});
    return reply(200,await service.issueChallenge(value.keyId));
   }
   if(!exact(value,['challengeId','challenge','recoveryId','candidateHash','assertion'])||!uuid.test(value.challengeId)||!uuid.test(value.recoveryId)||typeof value.challenge!=='string'||!nonce.test(value.challenge)||typeof value.candidateHash!=='string'||! /^[a-f0-9]{64}$/.test(value.candidateHash)||typeof value.assertion!=='string'||value.assertion.length===0||value.assertion.length>16384||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.assertion))return reply(400,{error:'INVALID_REQUEST'});
   return reply(200,await service.recover(value));
  }catch(error){return /^RECOVERY_(REJECTED|ASSERTION_REJECTED|COMMIT_REJECTED)$/.test(error?.message??'')?reply(400,{error:'RECOVERY_REJECTED'}):reply(503,{error:'RECOVERY_UNAVAILABLE'});}
 };
}
