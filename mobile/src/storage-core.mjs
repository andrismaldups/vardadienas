// Native snapshot format is private to this app; portable backups remain format v1.
export const SNAPSHOT_FORMAT = 'lv.vardadienas.native';
export const MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024;
export const KEYS = Object.freeze(['favorites','birthdays','birthdaySortMode','appearanceMode','designStyle',
  'remindersEnabled','reminderTime','reminderEvening','reminderMorning','reminderEveningTime','reminderMorningTime',
  'reminderTarget','reminderBirthdays','testBirthdaySyncQueueV1','testBirthdaySyncInitializedV1',
  'vardadienas_test_favorites_queue_v1','vardadienas_import_reminders_pending_v1','vardadienas_backup_transaction_v1']);
const allowed = new Set(KEYS);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function validName(v) { return typeof v === 'string' && v.trim().length > 0 && v.length <= 200 && !/[\u0000-\u001f\u007f]/.test(v); }
function person(p) {
  if (!object(p) || !validName(p.name) || (p.id !== undefined && (typeof p.id !== 'string' || !p.id)) || !Number.isInteger(p.day) ||
      !Number.isInteger(p.month) || p.month < 1 || p.month > 12 ||
      (p.year !== null && p.year !== undefined && (!Number.isInteger(p.year) || p.year < 1 || p.year > 9999))) return false;
  const y = p.year ?? 2000, leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return p.day >= 1 && p.day <= [31,leap?29:28,31,30,31,30,31,31,30,31,30,31][p.month-1];
}
export function validateValues(values) {
  if (!object(values)) throw Error('Nederīga datu krātuve.');
  for (const [key,value] of Object.entries(values)) {
    if (!allowed.has(key) || typeof value !== 'string') throw Error('Neatļauts datu krātuves ieraksts.');
    if (key === 'favorites') { const v=JSON.parse(value); if (!Array.isArray(v)||v.length>10000||!v.every(validName)) throw Error('Nederīgs vārdu saraksts.'); }
    if (key === 'birthdays') { const v=JSON.parse(value); if (!Array.isArray(v)||v.length>10000||!v.every(person)) throw Error('Nederīgs dzimšanas dienu saraksts.'); }
    if (['remindersEnabled','reminderEvening','reminderMorning','reminderBirthdays','testBirthdaySyncInitializedV1'].includes(key) && !['true','false'].includes(value)) throw Error('Nederīgs iestatījums.');
    if (['reminderTime','reminderEveningTime','reminderMorningTime'].includes(key) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw Error('Nederīgs atgādinājuma laiks.');
    if (key==='birthdaySortMode' && !['alpha','date'].includes(value)) throw Error('Nederīga kārtošana.');
    if (key==='appearanceMode' && !['auto','light','dark'].includes(value)) throw Error('Nederīgs izskats.');
    if (key==='designStyle' && !['classic','festive-s1','ds11','sea-mist','cherry','sun','nature-d3'].includes(value)) throw Error('Nederīgs dizains.');
    if (key==='reminderTarget' && !['all','favorites'].includes(value)) throw Error('Nederīga atgādinājumu izvēle.');
    if (key.endsWith('queue_v1') || key==='testBirthdaySyncQueueV1') { if(!Array.isArray(JSON.parse(value))) throw Error('Nederīga izmaiņu rinda.'); }
    if (key==='vardadienas_backup_transaction_v1') {
      const j=JSON.parse(value);
      if(!object(j)||j.version!==1||!object(j.before)||Object.entries(j.before).some(([k,v])=>!allowed.has(k)||k==='vardadienas_backup_transaction_v1'||(v!==null&&typeof v!=='string'))) throw Error('Nederīgs importa atjaunošanas ieraksts.');
      const before=Object.fromEntries(Object.entries(j.before).filter(([,v])=>v!==null));validateValues(before);
    }
  }
  return {...values};
}
export function encodeSnapshot(values) {
  const text=JSON.stringify({format:SNAPSHOT_FORMAT,version:1,values:validateValues(values)});
  if(new TextEncoder().encode(text).length>MAX_SNAPSHOT_BYTES) throw Error('Datu krātuve pārsniedz izmēra robežu.');
  return text;
}
export function decodeSnapshot(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SNAPSHOT_BYTES) throw Error('Nederīgs datu krātuves izmērs.');
  const v=JSON.parse(text);
  if(!object(v)||v.format!==SNAPSHOT_FORMAT||v.version!==1) throw Error('Neatbalstīta datu krātuves versija.');
  return validateValues(v.values);
}
export function captureLegacy(storage) {
  if(storage.getItem('vardadienas_test_deletion_pending_v1')!==null)throw Error('Iepriekšējā datu dzēšana nav pabeigta.');
  const values={};for(const key of KEYS){const v=storage.getItem(key);if(v!==null)values[key]=v;}
  return validateValues(values);
}
// Synchronous compatibility surface for existing app scripts. Native persistence is serial.
export function createStorage({initial,save,onState=()=>{}}) {
  let values=validateValues(initial),persisted=encodeSnapshot(values),running=null,blocked=false,transaction=false;
  let batch=false,fatal=false;
  const notify=state=>{try{onState(state);}catch{/* UI cannot break persistence. */}};
  function change(key,value) {
    if(!allowed.has(key)) throw Error('Šis ieraksts nav personīgo datu krātuvē.');
    if(blocked||transaction&&!batch) throw Error('Datu saglabāšana nav pabeigta.');
    const next={...values};if(value===null)delete next[key];else next[key]=String(value);
    // Journal replay may temporarily mix old/new values; each field must still be valid.
    encodeSnapshot(next);values=next;
    if(!batch){notify('saving');queueMicrotask(()=>{void flush().catch(()=>{});});}
  }
  async function flush() {
    if(fatal) throw Error('Datu krātuve jāpārbauda no jauna. Aizver un atver lietotni.');
    if(transaction) throw Error('Imports vēl tiek saglabāts.');
    if(running)return running;
    if(encodeSnapshot(values)===persisted){blocked=false;notify('saved');return;}
    running=(async()=>{
      try {
        while(encodeSnapshot(values)!==persisted){const next=encodeSnapshot(values);await save(next);persisted=next;}
        blocked=false;notify('saved');
      }catch(error){blocked=true;notify('failed');throw error;}
      finally{running=null;}
    })();
    return running;
  }
  const storage={
    getItem:key=>Object.hasOwn(values,key)?values[key]:null,
    setItem:(key,value)=>change(String(key),value),removeItem:key=>change(String(key),null),
    clear:()=>{throw Error('Personīgo datu dzēšanai izmanto lietotnes dzēšanas darbību.');},
    key:i=>Object.keys(values)[i]??null,get length(){return Object.keys(values).length;}
  };
  async function commit(updates,commitExisting) {
    await flush();const before={...values};transaction=true;batch=true;notify('saving');
    try {
      commitExisting(storage,updates);batch=false;
      const next=encodeSnapshot(values);await save(next);persisted=next;notify('saved');
    }catch(error){values=before;blocked=true;fatal=true;notify('reload');throw error;}
    finally{batch=false;transaction=false;}
  }
  return {storage,flush,commit,snapshot:()=>encodeSnapshot(values)};
}
