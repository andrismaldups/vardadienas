const MAX_BYTES=5*1024*1024;
export function cancelled(error,message){return error?.name==='AbortError'||error?.message===message;}
export function abortError(){const error=Error('Darbība atcelta.');error.name='AbortError';return error;}
export function createGreetingActions({share,clipboard}){
 let sharing=false;
 const valid=text=>{if(typeof text!=='string'||!text.trim())throw Error('Nav apsveikuma teksta.');};
 return {
  async copyText(text){valid(text);await clipboard.write({string:text});},
  async shareText(text){
   valid(text);if(sharing)throw Error('Dalīšanās jau notiek.');sharing=true;
   try{if(!(await share.canShare()).value)throw Error('Dalīšanās šajā ierīcē nav pieejama.');
    try{await share.share({text});}catch(error){if(cancelled(error,'Share canceled'))throw abortError();throw error;}
   }finally{sharing=false;}
  }
 };
}
function ownedFile(file,cache){
 if(typeof file?.path!=='string'||typeof file.name!=='string')throw Error('Nav izvēlētā faila adreses.');
 const url=new URL(file.path),root=new URL(cache),prefix=root.pathname.replace(/\/$/,'')+'/';
 if(url.protocol!=='file:'||root.protocol!=='file:'||url.host!==root.host||url.search||url.hash||!url.pathname.startsWith(prefix))throw Error('Fails nav izvēlnes pagaidu kopija.');
 const parts=url.pathname.slice(prefix.length).split('/');
 if(parts.length!==2||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(parts[0])||decodeURIComponent(parts[1])!==file.name||/[\/\\\u0000-\u001f\u007f]/.test(file.name)||['.','..'].includes(file.name))throw Error('Nederīga izvēlētā faila adrese.');
 return {path:url.href,folder:new URL('.',url).href};
}
export function createBackupImporter({picker,filesystem,cacheDirectory,encoding}){
 let active=false;
 return async()=>{
  if(active)throw Error('Faila izvēle jau notiek.');active=true;let owned;
  try{
   let result;
   try{result=await picker.pickFiles({types:['application/json'],limit:1,readData:false});}
   catch(error){if(cancelled(error,'pickFiles canceled.'))return null;throw error;}
   if(!Array.isArray(result?.files)||result.files.length!==1)throw Error('Izvēlies vienu JSON failu.');
   const file=result.files[0];
   const cache=await filesystem.getUri({path:'',directory:cacheDirectory});owned=ownedFile(file,cache.uri);
   if(!/\.json$/i.test(file.name))throw Error('Izvēlies JSON failu.');
   if(!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_BYTES)throw Error('Nederīgs vai pārāk liels fails. Maksimums 5 MB.');
   const stat=await filesystem.stat({path:owned.path});
   if(stat.type!=='file'||stat.size!==file.size||stat.size>MAX_BYTES)throw Error('Faila izmērs ir mainījies vai nav derīgs.');
   const resultText=await filesystem.readFile({path:owned.path,encoding});
   const text=resultText.data;
   if(typeof text!=='string')throw Error('Failu neizdevās nolasīt kā UTF-8 tekstu.');
   const bytes=new TextEncoder().encode(text).length;
   // Foundation may consume the UTF-8 BOM while decoding. The shared parser
   // also accepts a retained BOM; neither representation changes backup data.
   if(bytes>MAX_BYTES||(bytes!==file.size&&!(file.size-bytes===3&&!text.startsWith('\uFEFF'))))throw Error('Failu neizdevās nolasīt kā UTF-8 tekstu.');
   return {name:file.name,size:file.size,text:async()=>text};
  }finally{
   if(owned){
    try{await filesystem.deleteFile({path:owned.path});}catch{/* OS cache cleanup remains possible. */}
    try{await filesystem.rmdir({path:owned.folder});}catch{/* No recursive deletion. */}
   }
   active=false;
  }
 };
}
