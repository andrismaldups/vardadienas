/* Vārdadienas portable backup format v1. No installation or push credentials. */
(function (root) {
  'use strict';
  const FORMAT = 'lv.vardadienas.backup';
  const VERSION = 1;
  const MAX_BYTES = 5 * 1024 * 1024;
  const MAX_RECORDS = 10000;
  const JOURNAL_KEY = 'vardadienas_backup_transaction_v1';
  const REMINDER_PENDING_KEY = 'vardadienas_import_reminders_pending_v1';
  const ALLOWED_KEYS = new Set(['favorites','birthdays','birthdaySortMode','appearanceMode','designStyle',
    'reminderEvening','reminderMorning','reminderEveningTime','reminderMorningTime','reminderTarget','reminderBirthdays',
    'testBirthdaySyncQueueV1','testBirthdaySyncInitializedV1','vardadienas_test_favorites_queue_v1',REMINDER_PENDING_KEY]);
  const DESIGNS = {classic:'classic',gold:'festive-s1',nature:'ds11',sea:'sea-mist',cherry:'cherry',sun:'sun'};
  const fail = message => { throw new Error(message); };
  const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const choose = (value, values, label) => values.includes(value) ? value : fail('Nederīga izvēle: '+label+'.');
  const bool = (value, label) => typeof value === 'boolean' ? value : fail('Nederīga vērtība: '+label+'.');
  function name(value) {
    if (typeof value !== 'string') fail('Ieraksta vārdam jābūt tekstam.');
    const text = value.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!text || text.length > 200 || /[\u0000-\u001f\u007f]/.test(text)) fail('Nederīgs vai pārāk garš vārds.');
    return text;
  }
  const nameKey = text => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('lv-LV');
  const personKey = p => JSON.stringify([nameKey(p.name),p.day,p.month,p.year ?? null]);
  function person(value) {
    if (!object(value)) fail('Nederīgs dzimšanas dienas ieraksts.');
    const year=value.year, month=value.month, day=value.day;
    if (year!==null && (!Number.isInteger(year)||year<1||year>9999)) fail('Nederīgs dzimšanas gads.');
    if (!Number.isInteger(month)||month<1||month>12||!Number.isInteger(day)) fail('Nederīgs dzimšanas datums.');
    const y=year??2000, leap=y%4===0&&(y%100!==0||y%400===0);
    const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if (day<1||day>days[month-1]) fail('Nederīgs dzimšanas datums.');
    return {name:name(value.name),day,month,year};
  }
  function period(value) {
    if (!object(value)||typeof value.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) fail('Nederīgs atgādinājuma laiks.');
    return {enabled:bool(value.enabled,'atgādinājuma izvēle'),time:value.time};
  }
  function settings(value) {
    if (!object(value)||!object(value.appearance)||!object(value.reminders)) fail('Failā nav derīgu iestatījumu.');
    const a=value.appearance,r=value.reminders;
    return {
      appearance:{design:choose(a.design,Object.keys(DESIGNS),'dizains'),mode:choose(a.mode,['auto','light','dark'],'krāsu režīms')},
      birthdaySort:choose(value.birthdaySort,['alpha','date'],'dzimšanas dienu secība'),
      reminders:{previousDay:period(r.previousDay),sameDay:period(r.sameDay),nameDays:choose(r.nameDays,['all','favorites'],'vārdadienas'),birthdays:bool(r.birthdays,'dzimšanas dienas'),timeZone:choose(r.timeZone,['Europe/Riga'],'laika josla')}
    };
  }
  function validate(value) {
    if (!object(value)||value.format!==FORMAT) fail('Šis nav Vārdadienu datu eksporta fails.');
    if (value.version!==VERSION) fail('Šī faila formāta versija vēl netiek atbalstīta.');
    if (typeof value.exportedAt!=='string'||!Number.isFinite(Date.parse(value.exportedAt))) fail('Nederīgs eksporta datums.');
    if (!Array.isArray(value.favorites)||!Array.isArray(value.birthdays)||value.favorites.length>MAX_RECORDS||value.birthdays.length>MAX_RECORDS) fail('Nederīgs vai pārāk liels ierakstu saraksts.');
    return {format:FORMAT,version:VERSION,exportedAt:value.exportedAt,favorites:value.favorites.map(name),birthdays:value.birthdays.map(person),settings:settings(value.settings)};
  }
  function parse(text) {
    if (typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES) fail('Fails pārsniedz 5 MB ierobežojumu.');
    let value;try{value=JSON.parse(text.replace(/^\uFEFF/,''));}catch(_error){fail('Failā nav derīga JSON teksta.');}
    return validate(value);
  }
  function merge(current, incoming, canonicalNames, makeId) {
    const nextNames=[...current.favorites],nextPeople=current.birthdays.map(p=>({...p}));
    const names=new Set(nextNames.map(nameKey)),people=new Set(nextPeople.map(personKey));
    const addedNames=[],addedPeople=[];
    for(const raw of incoming.favorites){
      const canonical=canonicalNames.get(nameKey(raw));
      if(!canonical)fail('Vārds “'+raw+'” nav šīs versijas vārdadienu sarakstā. Imports nav veikts.');
      if(!names.has(nameKey(canonical))){names.add(nameKey(canonical));nextNames.push(canonical);addedNames.push(canonical);}
    }
    for(const p of incoming.birthdays){
      const key=personKey(p);
      if(!people.has(key)){people.add(key);const record={...p,id:makeId()};nextPeople.push(record);addedPeople.push(record);}
    }
    if(nextNames.length>MAX_RECORDS||nextPeople.length>MAX_RECORDS)fail('Apvienotajā sarakstā ir pārāk daudz ierakstu.');
    return {favorites:nextNames,birthdays:nextPeople,addedNames,addedPeople,skippedNames:incoming.favorites.length-addedNames.length,skippedPeople:incoming.birthdays.length-addedPeople.length};
  }
  function restore(storage,before){
    for(const [key,value] of Object.entries(before))value===null?storage.removeItem(key):storage.setItem(key,value);
    storage.removeItem(JOURNAL_KEY);
  }
  function recover(storage){
    const raw=storage.getItem(JOURNAL_KEY);if(raw===null)return false;
    const journal=JSON.parse(raw);
    if(!object(journal)||journal.version!==1||!object(journal.before)||Object.entries(journal.before).some(([key,value])=>!ALLOWED_KEYS.has(key)||(value!==null&&typeof value!=='string')))fail('Iepriekšējā importa atjaunošanas ieraksts nav derīgs.');
    restore(storage,journal.before);return true;
  }
  function commit(storage,updates){
    if(storage.getItem(JOURNAL_KEY)!==null)fail('Vispirms jāpabeidz iepriekšējā importa atjaunošana. Pārlādē aplikāciju.');
    const before={};
    for(const [key,value] of Object.entries(updates)){
      if(!ALLOWED_KEYS.has(key)||typeof value!=='string')fail('Nederīga importa saglabāšanas darbība.');
      before[key]=storage.getItem(key);
    }
    storage.setItem(JOURNAL_KEY,JSON.stringify({version:1,before}));
    try{
      for(const [key,value] of Object.entries(updates))storage.setItem(key,value);
      storage.removeItem(JOURNAL_KEY);
    }catch(error){
      try{restore(storage,before);}catch(_rollbackError){fail('Krātuves kļūda. Aizver un atver aplikāciju, lai atjaunotu iepriekšējos datus.');}
      fail('Datus neizdevās saglabāt ierīcē. Iepriekšējie dati ir atjaunoti.');
    }
  }
  const api={FORMAT,VERSION,MAX_BYTES,MAX_RECORDS,JOURNAL_KEY,REMINDER_PENDING_KEY,DESIGNS,parse,validate,merge,commit,recover,nameKey,personKey};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.VardadienasBackup=Object.freeze(api);
  if(typeof document==='undefined')return;
  let recoveryError='';
  try{recover(localStorage);}catch(error){recoveryError=error.message;}
  function init(){
    const $=id=>document.getElementById(id);
    if(!$('backupExport'))return;
    const status=$('backupStatus'),preview=$('backupPreview'),fileInput=$('backupFile'),applySettings=$('backupApplySettings');
    let pending=null,reading=0,busy=false,reminderRetry=false;
    const canonicalNames=new Map(Object.values(DATA).flatMap(groups=>groups.flat()).map(n=>[nameKey(n),n]));
    const report=message=>{status.textContent=message;};
    function available(){
      if(recoveryError)fail(recoveryError+' Pārlādē aplikāciju; imports un eksports šobrīd apturēts.');
      if(deletionSyncBlocked()||pushActivationInProgress)fail('Lūdzu pabeidz datu dzēšanu vai paziņojumu aktivizēšanu.');
    }
    function currentSettings(){
      const design=localStorage.getItem('designStyle')||'classic';
      return settings({appearance:{design:Object.keys(DESIGNS).find(key=>DESIGNS[key]===design)||(design==='nature-d3'?'nature':'classic'),mode:localStorage.getItem('appearanceMode')||'auto'},birthdaySort:localStorage.getItem('birthdaySortMode')==='alpha'?'alpha':'date',reminders:{previousDay:{enabled:$('reminderEvening').checked,time:$('reminderEveningTime').value},sameDay:{enabled:$('reminderMorning').checked,time:$('reminderMorningTime').value},nameDays:document.querySelector('input[name="reminderTarget"]:checked')?.value||'favorites',birthdays:$('reminderBirthdays').checked,timeZone:'Europe/Riga'}});
    }
    function makeBackup(){
      return validate({format:FORMAT,version:VERSION,exportedAt:new Date().toISOString(),favorites:[...favorites],birthdays:birthdays.map(p=>({name:p.name,day:p.day,month:p.month,year:p.year??null})),settings:currentSettings()});
    }
    function download(blob,filename){
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }
    $('backupExport').addEventListener('click',async()=>{
      if(busy)return;
      try{
        available();if(root.VardadienasNativeStorage)await root.VardadienasNativeStorage.flush();const data=makeBackup(),text=JSON.stringify(data,null,2)+'\n';
        if(new TextEncoder().encode(text).length>MAX_BYTES)fail('Eksporta fails pārsniedz 5 MB ierobežojumu.');
        const blob=new Blob([text],{type:'application/json;charset=utf-8'}),filename='vardadienas-dati-'+data.exportedAt.slice(0,19).replace(/[:T]/g,'-')+'.json';
        if(root.VardadienasNativeBackup){
          busy=true;report('Izvēlies “Saglabāt Failos”. Fails: '+filename+' ('+blob.size+' baiti).');
          try{await root.VardadienasNativeBackup.exportFile({text,filename});report('Datu fails nodots iPhone dalīšanās izvēlnei: '+filename+'.');}
          finally{busy=false;}
          return;
        }
        if(typeof File!=='undefined'&&navigator.share&&navigator.canShare){
          const file=new File([blob],filename,{type:'application/json'});
          if(navigator.canShare({files:[file]})){
            busy=true;report('Izvēlies “Saglabāt Failos”. Fails: '+filename+' ('+blob.size+' baiti).');
            try{await navigator.share({files:[file]});report('Datu fails nodots izvēlētajai lietotnei: '+filename+' ('+blob.size+' baiti).');return;}
            catch(error){if(error.name==='AbortError'){report('Eksports atcelts.');return;}}
            finally{busy=false;}
          }
        }
        download(blob,filename);report('Eksporta fails nodots lejupielādei: '+filename+' ('+blob.size+' baiti). Saglabā to savā ierīcē.');
      }catch(error){report(error.message);}
    });
    $('backupImport').addEventListener('click',()=>{try{available();if(!busy){fileInput.value='';fileInput.click();}}catch(error){report(error.message);}});
    fileInput.addEventListener('change',async()=>{
      const serial=++reading;pending=null;preview.hidden=true;
      const file=fileInput.files?.[0];if(!file)return;
      try{
        available();if(file.size>MAX_BYTES)fail('Fails pārsniedz 5 MB ierobežojumu.');
        const parsed=parse(await file.text());if(serial!==reading)return;
        available();pending=parsed;$('backupFileName').textContent=(file.name||'Datu kopija')+' · '+new Date(parsed.exportedAt).toLocaleString('lv-LV');showPreview();preview.scrollIntoView?.({block:'nearest'});report('Fails pārbaudīts. Pirms importa apskati kopsavilkumu.');
      }catch(error){if(serial===reading){pending=null;report(error.message);}}
    });
    function plan(){return merge({favorites,birthdays},pending,canonicalNames,birthdayId);}
    function showPreview(){
      const p=plan();
      $('backupFileSummary').textContent='Failā: '+pending.favorites.length+' vārdi un '+pending.birthdays.length+' dzimšanas dienas. Pievienos: '+p.addedNames.length+' vārdus un '+p.addedPeople.length+' dzimšanas dienas. Izlaidīs atkārtojumus: '+p.skippedNames+' vārdi un '+p.skippedPeople+' dzimšanas dienas.';
      $('backupSettingsSummary').textContent='Failā saglabātie iestatījumi: '+{classic:'Klasika',gold:'Zelts',nature:'Daba',sea:'Jūra',cherry:'Ķirši',sun:'Saule'}[pending.settings.appearance.design]+', '+{auto:'automātisks',light:'gaišs',dark:'tumšs'}[pending.settings.appearance.mode]+' režīms; iepriekšējā dienā '+pending.settings.reminders.previousDay.time+' ('+(pending.settings.reminders.previousDay.enabled?'jā':'nē')+'), svētku dienā '+pending.settings.reminders.sameDay.time+' ('+(pending.settings.reminders.sameDay.enabled?'jā':'nē')+'); '+(pending.settings.reminders.nameDays==='all'?'visas vārdadienas':'tikai Mani vārdi')+'; dzimšanas dienas '+(pending.settings.reminders.birthdays?'jā':'nē')+'.';
      preview.hidden=false;
    }
    $('backupCancel').addEventListener('click',()=>{++reading;pending=null;preview.hidden=true;fileInput.value='';report('Imports atcelts. Dati nav mainīti.');});
    function settingsUpdates(s){
      const r=s.reminders;return {designStyle:DESIGNS[s.appearance.design],appearanceMode:s.appearance.mode,birthdaySortMode:s.birthdaySort,
        reminderEvening:String(r.previousDay.enabled),reminderMorning:String(r.sameDay.enabled),reminderEveningTime:r.previousDay.time,reminderMorningTime:r.sameDay.time,reminderTarget:r.nameDays,reminderBirthdays:String(r.birthdays),[REMINDER_PENDING_KEY]:JSON.stringify(r)};
    }
    function updateTime(id,value){
      const select=$(id);restoreReminderTime(select,value);
      const wrapper=select.closest('.reminder-time-control');if(!wrapper)return;
      const trigger=wrapper.querySelector('.reminder-time-trigger');if(trigger)trigger.textContent=select.options[select.selectedIndex]?.textContent||value;
      wrapper.querySelectorAll('[role="option"]').forEach(item=>item.setAttribute('aria-selected',String(item.dataset.value===value)));
    }
    function applyPreferences(s){
      const a=s.appearance,r=s.reminders;
      for(const [group,value] of [['designStyle',DESIGNS[a.design]],['appearanceMode',a.mode]]){
        const input=Array.from(document.querySelectorAll('input[name="'+group+'"]')).find(input=>input.value===value);
        if(input){input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}
      }
      $('reminderEvening').checked=r.previousDay.enabled;$('reminderMorning').checked=r.sameDay.enabled;
      updateTime('reminderEveningTime',r.previousDay.time);updateTime('reminderMorningTime',r.sameDay.time);
      $('reminderBirthdays').checked=r.birthdays;
      document.querySelectorAll('input[name="reminderTarget"]').forEach(input=>{input.checked=input.value===r.nameDays;});
      setBirthdaySortMode(s.birthdaySort);
    }
    $('backupConfirm').addEventListener('click',async()=>{
      if(busy||!pending)return;
      busy=true;$('backupConfirm').disabled=true;
      try{
        available();const p=plan(),updates={favorites:JSON.stringify(p.favorites),birthdays:JSON.stringify(p.birthdays)};
        // Commit lists and their durable server queues together, without exporting device identity.
        let fq=readTestFavoritesQueue();
        for(const n of p.addedNames){fq=fq.filter(item=>item.name!==n);fq.push({method:'POST',name:n});}
        let bq=readBirthdayQueue();
        for(const b of p.addedPeople)bq.push({method:'POST',id:b.id,person:{...b}});
        updates[TEST_FAVORITES_QUEUE_KEY]=JSON.stringify(fq);updates[BIRTHDAY_QUEUE_KEY]=JSON.stringify(bq);updates[BIRTHDAY_INITIALIZED_KEY]='true';
        if(applySettings.checked)Object.assign(updates,settingsUpdates(pending.settings));
        if(root.VardadienasNativeStorage)await root.VardadienasNativeStorage.commit(updates,commit);else commit(localStorage,updates);
        favorites=p.favorites;birthdays=p.birthdays;
        if(applySettings.checked){applyPreferences(pending.settings);$('backupSyncStatus').textContent=navigator.onLine===false?'Dati saglabāti ierīcē. Servera sinhronizāciju atkārtosim pēc savienojuma atjaunošanas.':'';}
        closeBirthdayForm();closeFavoriteAdd();renderFavorites();renderBirthdays();renderBirthdayHome();
        pending=null;preview.hidden=true;fileInput.value='';
        report('Imports pabeigts. Pievienoti '+p.addedNames.length+' vārdi un '+p.addedPeople.length+' dzimšanas dienas. Esošie ieraksti saglabāti. Atgādinājumu ieslēgšanas stāvoklis šajā ierīcē nav mainīts.');
        void flushTestFavoritesQueue();void flushBirthdayQueue();void retryReminders();
      }catch(error){report(error.message);}
      finally{busy=false;$('backupConfirm').disabled=false;}
    });
    function reminderSnapshot(){return JSON.stringify({enabled:$('remindersEnabled').checked,...currentSettings().reminders});}
    async function retryReminders(){
      if(reminderRetry||deletionSyncBlocked()||navigator.onLine===false||!localStorage.getItem(REMINDER_PENDING_KEY))return;
      // On a fresh device preferences are used when the user activates its own subscription.
      if(!Number.isSafeInteger(Number(localStorage.getItem('testPushSubscriptionId')))||Number(localStorage.getItem('testPushSubscriptionId'))<=0){localStorage.removeItem(REMINDER_PENDING_KEY);return;}
      if(!('serviceWorker' in navigator))return;
      reminderRetry=true;
      try{
        while(reminderSyncInProgress>0&&!deletionSyncBlocked())await new Promise(resolve=>setTimeout(resolve,100));
        if(deletionSyncBlocked())return;
        const snapshot=reminderSnapshot();const synced=await syncTestReminderSettings();
        if(synced&&snapshot===reminderSnapshot())localStorage.removeItem(REMINDER_PENDING_KEY);
        $('backupSyncStatus').textContent=synced?'Importētie atgādinājumu iestatījumi sinhronizēti šai ierīcei.':'Iestatījumi saglabāti ierīcē. Paziņojumus šajā ierīcē var aktivizēt sadaļā Atgādinājumi.';
      }catch(error){$('backupSyncStatus').textContent='Atgādinājumu iestatījumi saglabāti ierīcē. Sinhronizāciju atkārtosim, kad būs savienojums.';}
      finally{reminderRetry=false;}
    }
    for(const event of ['online','focus'])window.addEventListener(event,()=>{void retryReminders();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void retryReminders();});
    if(recoveryError){$('deleteMyDataButton').disabled=true;report(recoveryError+' Pārlādē aplikāciju, lai atjaunotu iepriekšējos datus.');}
    void retryReminders();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof globalThis==='undefined'?window:globalThis);
