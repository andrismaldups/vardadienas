// Deployment-neutral strict JSON boundary, not a Worker/D1 entry point.
export function createIOSPostBoundary({origin,handlers,ready,admitRequest=null,bodyTimeoutMs=5000,maxBodyBytes=24576,errorPrefix,rejectedErrors=[]}){
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash||!Number.isSafeInteger(bodyTimeoutMs)||bodyTimeoutMs<1||bodyTimeoutMs>10000||!Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<1||maxBodyBytes>229376)throw Error(errorPrefix+'_HTTP_CONFIGURATION');
 const rejected=new Set(rejectedErrors);
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 return async function handle(request){
  const url=new URL(request.url);
  if(url.origin!==base.origin||url.search||url.hash||!Object.hasOwn(handlers,url.pathname))return reply(404,{error:'NOT_FOUND'});
  if(request.method!=='POST')return reply(405,{error:'METHOD_NOT_ALLOWED'});
  if(typeof admitRequest!=='function'||!ready())return reply(503,{error:errorPrefix+'_UNAVAILABLE'});
  try{if(await admitRequest(request)!==true)return reply(429,{error:errorPrefix+'_TRY_LATER'});}catch{return reply(503,{error:errorPrefix+'_UNAVAILABLE'});}
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||request.headers.has('content-encoding'))return reply(415,{error:'JSON_REQUIRED'});
  const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBodyBytes))return reply(413,{error:'REQUEST_TOO_LARGE'});
  let reader,timer,value;
  try{
   if(!request.body)return reply(400,{error:'INVALID_REQUEST'});
   reader=request.body.getReader();
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{void reader.cancel().catch(()=>{});reject(Error('BODY_TIMEOUT'));},bodyTimeoutMs);});
   value=await Promise.race([(async()=>{const parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBodyBytes)throw Error('BODY_TOO_LARGE');parts.push(value);}const data=new Uint8Array(size);let n=0;for(const p of parts){data.set(p,n);n+=p.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));})(),timeout]);
  }catch{if(reader)void reader.cancel().catch(()=>{});return reply(400,{error:'INVALID_REQUEST'});}finally{clearTimeout(timer);if(reader)reader.releaseLock();}
  try{return reply(200,await handlers[url.pathname](value));}
  catch(error){if(error?.message==='INVALID_REQUEST')return reply(400,{error:'INVALID_REQUEST'});return rejected.has(error?.message)?reply(400,{error:errorPrefix+'_REJECTED'}):reply(503,{error:errorPrefix+'_UNAVAILABLE'});}
 };
}
