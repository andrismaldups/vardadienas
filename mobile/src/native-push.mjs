import {Capacitor} from '@capacitor/core';
import {PushNotifications} from '@capacitor/push-notifications';
import {createPushController} from './push-controller.mjs';
if(Capacitor.isNativePlatform()){
 // No production API, account identity or payment bypass is configured here.
 const controller=createPushController({push:PushNotifications});
 window.VardadienasNativePush=Object.freeze({activate:controller.activate,status:controller.status,
  syncSettings:async()=>false,
  remindersChanged:()=>{void window.VardadienasNativeStorage.flush().then(()=>{
   const status=document.getElementById('pushActivationStatus');
   if(status)status.textContent='Atgādinājumu izvēle saglabāta ierīcē. iOS paziņojumi vēl nav pieslēgti.';
  }).catch(()=>{});}
 });
 document.addEventListener('DOMContentLoaded',()=>{
  const button=document.getElementById('activatePushButton'),status=document.getElementById('pushActivationStatus'),master=document.getElementById('remindersEnabled');
  const message='iOS paziņojumi šajā izstrādes versijā vēl nav pieslēgti. Atgādinājumu izvēles vari saglabāt ierīcē.';
  if(button){button.disabled=true;button.classList.remove('push-active-status');button.textContent='iOS paziņojumi vēl nav pieslēgti';button.addEventListener('click',event=>{event.stopImmediatePropagation();event.preventDefault();status.textContent=message;},{capture:true});}
  if(master){master.checked=false;master.disabled=true;}
  if(status)status.textContent=message;
 },{once:true});
}
