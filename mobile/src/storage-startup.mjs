import {captureLegacy,decodeSnapshot,encodeSnapshot} from './storage-core.mjs';
export const HANDOFF='vardadienas_native_boot_v1';
// Same serialized handoff is probed before committing large snapshots. A quota
// failure must not commit data that this startup path cannot subsequently open.
export function writeHandoff(session,text,head){
 const value=JSON.stringify({version:1,text,head});
 try{session.setItem(HANDOFF,value);if(session.getItem(HANDOFF)!==value)throw Error('Palaišanas datu pārbaude neizdevās.');}
 catch(error){session.removeItem(HANDOFF);throw error;}
}
export async function prepareStartup({vault,legacy,session}){
 session.removeItem(HANDOFF);
 let text=await vault.load();
 if(text===null){text=encodeSnapshot(captureLegacy(legacy));await vault.save(text);}
 decodeSnapshot(text);writeHandoff(session,text,vault.getHead());
}
