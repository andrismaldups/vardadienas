import { Capacitor } from '@capacitor/core';
import {prepareStartup} from './storage-startup.mjs';
import { nativeVault, HANDOFF } from './native-vault.mjs';
const status=document.getElementById('bootStatus'),retry=document.getElementById('bootRetry');
async function boot(){
  retry.hidden=true;status.textContent='Pārbauda saglabātos datus…';
  try{
    sessionStorage.removeItem(HANDOFF);
    if(!Capacitor.isNativePlatform())throw Error('Šī pakete paredzēta iOS lietotnei.');
    await prepareStartup({vault:nativeVault(),legacy:localStorage,session:sessionStorage});
    location.replace('./app.html');
  }catch(error){
    // Neither missing bridge nor corrupt/missing committed data authorises a reset.
    status.textContent='Saglabātos datus neizdevās atvērt. Esošie dati nav atiestatīti. '+error.message;
    retry.hidden=false;
  }
}
retry.addEventListener('click',()=>void boot());void boot();
