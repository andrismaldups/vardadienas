import { Capacitor } from '@capacitor/core';
import { createStorage, decodeSnapshot, KEYS } from './storage-core.mjs';
import { nativeVault, HANDOFF } from './native-vault.mjs';
// Runs synchronously before theme, backup recovery and main app scripts.
const denied=()=>{throw Error('Personīgo datu krātuve nav atvērta.');};
const unavailable=Object.freeze({getItem:denied,setItem:denied,removeItem:denied,clear:denied,key:denied,get length(){return denied();}});
const legacy=window.localStorage;
let overlay,latest='saved',controller;
const inertBefore=new Map();
function paint(state){
  latest=state;
  if(!document.body){document.addEventListener('DOMContentLoaded',()=>paint(latest),{once:true});return;}
  if(!overlay){
    overlay=document.createElement('div');overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f3f7fb;color:#142c40;display:none;align-items:center;justify-content:center;padding:28px;text-align:center;font:18px system-ui;';
    document.body.append(overlay);
  }
  for(const child of document.body.children||[]){
    if(child===overlay)continue;
    if(state!=='saved'){if(!inertBefore.has(child))inertBefore.set(child,child.inert);child.inert=true;}
  }
  if(state==='saved'){for(const [child,inert] of inertBefore)child.inert=inert;inertBefore.clear();}
  overlay.replaceChildren();overlay.style.display=state==='saved'?'none':'flex';
  if(state==='saved')return;
  const content=document.createElement('div'),message=document.createElement('p');
  message.textContent=state==='saving'?'Saglabā datus…':state==='failed'?'Izmaiņas vēl nav saglabātas. Atstāj lietotni atvērtu un mēģini vēlreiz.':'Datu saglabāšanas rezultāts jāpārbauda, atverot lietotni no jauna.';
  content.append(message);overlay.append(content);
  if(state==='failed'||state==='reload'){
    const button=document.createElement('button');button.textContent=state==='failed'?'Mēģināt saglabāt vēlreiz':'Pārbaudīt saglabātos datus';
    button.addEventListener('click',()=>{if(state==='reload')location.replace('./index.html');else{paint('saving');void controller.flush().catch(()=>{});}});
    content.append(button);
  }
}
try{
  Object.defineProperty(window,'localStorage',{configurable:true,value:unavailable});
  if(!Capacitor.isNativePlatform())throw Error('Nav pieejama iOS datu krātuve.');
  const raw=sessionStorage.getItem(HANDOFF);sessionStorage.removeItem(HANDOFF);
  if(raw===null)throw Error('Vispirms jāveic datu palaišanas pārbaude.');
  const handoff=JSON.parse(raw);
  if(handoff.version!==1||!handoff.head)throw Error('Nederīga palaišanas pārbaude.');
  const initial=decodeSnapshot(handoff.text),vault=nativeVault(handoff.head);
  controller=createStorage({initial,save:vault.save,onState:paint});
  Object.defineProperty(window,'localStorage',{configurable:true,value:controller.storage});
  window.VardadienasNativeStorage=Object.freeze({flush:controller.flush,commit:controller.commit});
  // This isolated preview has no server identity/APNs. Delete native personal
  // data locally; never invoke the PWA's production-server deletion workflow.
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.getElementById('deleteMyDataButton');
    let deleting=false;
    const description=button?.previousElementSibling;
    if(description?.tagName==='P')description.textContent='Vari dzēst šīs iOS sagataves vārdus, dzimšanas dienas un atgādinājumu iestatījumus. Servera un Push piesaiste vēl nav ieslēgta.';
    button?.addEventListener('click',async event=>{
      event.stopImmediatePropagation();event.preventDefault();
      if(deleting||!confirm('Dzēst šīs iOS sagataves vārdus, dzimšanas dienas un atgādinājumu iestatījumus?'))return;
      deleting=true;button.disabled=true;
      const status=document.getElementById('deleteMyDataStatus');
      try{await window.VardadienasNativeIdentity.assertLocalDeletionAllowed();}
      catch(error){deleting=false;button.disabled=false;if(status)status.textContent='Dzēšana apturēta: '+error.message;return;}
      try{
        await controller.commit({},store=>{for(const key of KEYS)if(!['appearanceMode','designStyle'].includes(key))store.removeItem(key);});
        paint('saving');await vault.scrubInactive();
        for(const key of KEYS)if(!['appearanceMode','designStyle'].includes(key))legacy.removeItem(key);
        location.replace('./index.html');
      }catch(error){if(status)status.textContent='Datu dzēšanu nevar apstiprināt: '+error.message;paint('reload');}
    },{capture:true});
  },{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)void controller.flush().catch(()=>{});});
  window.addEventListener('pagehide',()=>{void controller.flush().catch(()=>{});});
}catch(error){
  paint('reload');window.stop();location.replace('./index.html');
  throw error;
}
