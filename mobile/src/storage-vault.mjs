import { decodeSnapshot } from './storage-core.mjs';
export const HEAD_KEY='vardadienas_native_head_v1';
const path=slot=>`vardadienas/storage-${slot}.json`;
const parseHead=raw=>{
  if(raw===null)return null;
  const h=JSON.parse(raw);
  if(h.version!==1||!['a','b'].includes(h.slot)||!/^([a-f0-9]){64}$/.test(h.sha256))throw Error('Nederīga datu krātuves norāde.');
  return h;
};
export function createVault({files,preferences,hash,head:initial=null,preflight=()=>{}}) {
  let head=initial,attempt=null;
  async function read(h){const text=await files.read(path(h.slot));if(await hash(text)!==h.sha256)throw Error('Datu krātuves kontrolsumma nesakrīt.');decodeSnapshot(text);return text;}
  async function load(){
    const raw=(await preferences.get({key:HEAD_KEY})).value;head=parseHead(raw);
    if(head)return await read(head);
    // Missing metadata is not proof of a new installation if a data file exists.
    if(await files.exists(path('a'))||await files.exists(path('b')))throw Error('Atrasti dati bez krātuves norādes. Automātiska atiestate apturēta.');
    return null;
  }
  async function save(text){
    decodeSnapshot(text);
    const current=parseHead((await preferences.get({key:HEAD_KEY})).value);
    if(JSON.stringify(current)!==JSON.stringify(head)){
      // A lost acknowledgement may mean the previous write actually committed.
      if(attempt&&JSON.stringify(current)===JSON.stringify(attempt)){await read(current);head=current;attempt=null;}
      else throw Error('Datu krātuve mainījusies. Atver lietotni no jauna.');
    }
    const digest=await hash(text);
    if(head?.sha256===digest){await read(head);return;}
    const next={version:1,slot:head?.slot==='a'?'b':'a',sha256:digest};
    await preflight(text,next);
    await files.write(path(next.slot),text);
    const checked=await files.read(path(next.slot));
    if(checked!==text||await hash(checked)!==digest)throw Error('Datu ierakstīšanas pārbaude neizdevās.');
    attempt=next;
    try{
      await preferences.set({key:HEAD_KEY,value:JSON.stringify(next)});
      const ack=parseHead((await preferences.get({key:HEAD_KEY})).value);
      if(JSON.stringify(ack)!==JSON.stringify(next))throw Error('Datu saglabāšanas apstiprinājums nav saņemts.');
    }catch(error){
      // Never roll the pointer backwards after an ambiguous acknowledgement.
      const ack=parseHead((await preferences.get({key:HEAD_KEY})).value);
      if(JSON.stringify(ack)!==JSON.stringify(next))throw error;
      await read(next);
    }
    head=next;attempt=null;
  }
  async function scrubInactive(){
    const current=parseHead((await preferences.get({key:HEAD_KEY})).value);
    if(!head||JSON.stringify(current)!==JSON.stringify(head))throw Error('Datu dzēšanas stāvoklis ir mainījies.');
    const text=await read(head),inactive=head.slot==='a'?'b':'a';
    await files.write(path(inactive),text);
    if(await files.read(path(inactive))!==text)throw Error('Iepriekšējās datu kopijas tīrīšana nav apstiprināta.');
  }
  return {load,save,scrubInactive,getHead:()=>head};
}
