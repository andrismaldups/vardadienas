import {snapshotHash} from './native-utils.mjs';
// OS authorisation, APNs registration and server activation are separate states.
export function createPushController({push,server=null,onState=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=15000}){
 let state={stage:server?'idle':'unconfigured',permission:'unknown'},handles=[],initializing=null,token=null,ack=null,pending=null,busy=false,disposed=false;
 const publish=(stage,permission=state.permission)=>{state={stage,permission};try{onState({...state});}catch{/* No token/error payload in UI state. */}};
 const alive=()=>{if(disposed)throw Error('Push controller disposed');};
 function validToken(value){if(typeof value!=='string'||!/^([a-f0-9]{2})+$/i.test(value)||value.length>4096)throw Error('Invalid APNs token');return value.toLowerCase();}
 async function listen(){
  if(initializing)return initializing;
  initializing=(async()=>{
   try{
    handles.push(await push.addListener('registration',event=>{
     if(disposed)return;
     try{token=validToken(event?.value);}
     catch{ack=null;pending?.reject(Error('Invalid APNs registration'));publish('registration-error');return;}
     pending?.resolve(token);
     if(ack&&ack!==snapshotHash(token)){
      ack=null;publish('sync-required');
      // Token rotation never inherits the previous server activation badge.
      if(!busy)queueMicrotask(()=>{if(!disposed)void activate({prompt:false}).catch(()=>{});});
     }
    }));
    handles.push(await push.addListener('registrationError',()=>{if(disposed)return;ack=null;pending?.reject(Error('APNs registration failed'));publish('registration-error');}));
    if(disposed){await Promise.allSettled(handles.map(h=>h.remove()));handles=[];}
   }catch(error){await Promise.allSettled(handles.map(h=>h.remove()));handles=[];initializing=null;throw error;}
  })();
  return initializing;
 }
 async function registration(){
  let timer;const result=new Promise((resolve,reject)=>{pending={resolve,reject};timer=setTimer(()=>reject(Error('APNs registration timeout')),timeoutMs);});
  // Attach the rejection handler before calling the native bridge.
  const registered=Promise.resolve().then(()=>push.register()).catch(error=>pending?.reject(error));
  try{return await result;}finally{clearTimer(timer);pending=null;void registered;}
 }
 async function activate({prompt=true}={}){
  alive();if(busy)throw Error('Push operation in progress');
  if(!server){publish('unconfigured');return false;}
  busy=true;
  try{
   publish('checking-access');
   const access=await server.checkAccess();alive();
   if(access?.allowed!==true){ack=null;publish('not-entitled');return false;}
   await listen();alive();
   let permission=(await push.checkPermissions()).receive;alive();
   if(permission==='prompt'||permission==='prompt-with-rationale'){
    if(!prompt){ack=null;publish('permission-required',permission);return false;}
    permission=(await push.requestPermissions()).receive;alive();
   }
   if(permission!=='granted'){ack=null;publish('permission-denied',permission);return false;}
   publish('registering',permission);await registration();alive();
   // Registration callbacks can rotate the token while the server is responding.
   for(let attempts=0;attempts<4;attempts++){
    const current=token,hash=snapshotHash(current);publish('syncing');
    const reply=await server.upsertDevice({deviceToken:current});alive();
    if(reply?.active!==true||reply.tokenHash!==hash)throw Error('Server acknowledgement mismatch');
    if(token!==current)continue;
    ack=hash;publish('active');return true;
   }
   throw Error('APNs token changed repeatedly');
  }catch(error){ack=null;if(!disposed)publish(['registering','registration-error'].includes(state.stage)?'registration-error':'sync-error');throw error;}
  finally{busy=false;}
 }
 async function dispose(){
  disposed=true;ack=null;token=null;publish('disposed');pending?.reject(Error('Push controller disposed'));
  if(initializing)await initializing.catch(()=>{});
  await Promise.allSettled(handles.map(h=>h.remove()));handles=[];
 }
 return {activate,dispose,status:()=>({...state}),configured:server!==null};
}
