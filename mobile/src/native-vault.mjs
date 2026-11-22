import {snapshotHash} from './native-utils.mjs';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { createVault } from './storage-vault.mjs';
import {writeHandoff,HANDOFF} from './storage-startup.mjs';
export {HANDOFF};
export function nativeVault(head=null){
  return createVault({head,preferences:Preferences,preflight:(text,next)=>{writeHandoff(sessionStorage,text,next);sessionStorage.removeItem(HANDOFF);},files:{
    exists:async path=>{try{await Filesystem.stat({path,directory:Directory.Library});return true;}catch(error){if(['OS-PLUG-FILE-0008','OS-PLUG-FILE-0011'].includes(error.code))return false;throw error;}},
    read:async path=>(await Filesystem.readFile({path,directory:Directory.Library,encoding:Encoding.UTF8})).data,
    write:async(path,data)=>{await Filesystem.writeFile({path,data,directory:Directory.Library,encoding:Encoding.UTF8,recursive:true});}
  },hash:snapshotHash});
}
