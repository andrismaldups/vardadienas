import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf("  const greetingCopy=document.getElementById('greetingCopy');"),html.indexOf("  greetingResultText.addEventListener('input',resizeGreetingResult);"));
function fixture(){
 const events={},calls=[],buttons={greetingCopy:{textContent:'Kopēt',addEventListener:(_,fn)=>events.copy=fn},greetingShare:{addEventListener:(_,fn)=>events.share=fn}};
 const ctx={greetingResultText:{value:'Mārtiņ, daudz laimes! 🎂\nLai jauka diena!'},document:{getElementById:id=>buttons[id]},navigator:{clipboard:{writeText:async v=>calls.push(['webcopy',v])}},isSecureContext:true,
 alert:v=>calls.push(['alert',v]),setTimeout:()=>1,clearTimeout(){},VardadienasNativeGreetings:{copyText:async v=>calls.push(['nativecopy',v]),shareText:async v=>calls.push(['nativeshare',v])}};
 ctx.window=ctx;vm.runInNewContext(code,ctx);return {ctx,events,calls,buttons};
}
test('Greeting buttons use the native hooks and current edited text with emoji/newlines',async()=>{
 const f=fixture();f.ctx.greetingResultText.value+='\nRediģēts';await f.events.share();await f.events.copy();
 assert.equal(f.calls[0][0],'nativeshare');assert.equal(f.calls[0][1],f.ctx.greetingResultText.value);assert.equal(f.calls[1][0],'nativecopy');assert.equal(f.buttons.greetingCopy.textContent,'Nokopēts ✓');
});
test('Cancelling native greeting sharing causes no alert or implicit clipboard write',async()=>{
 const f=fixture();f.ctx.VardadienasNativeGreetings.shareText=async()=>{const e=Error('cancel');e.name='AbortError';throw e;};await f.events.share();assert.equal(f.calls.length,0);
});
test('Native greeting failure offers explicit Copy without silently writing the clipboard',async()=>{
 const f=fixture();f.ctx.VardadienasNativeGreetings.shareText=async()=>{throw Error('share failed');};await f.events.share();assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],'alert');
 f.ctx.VardadienasNativeGreetings.copyText=async()=>{throw Error('copy failed');};await f.events.copy();assert.equal(f.buttons.greetingCopy.textContent,'Neizdevās kopēt');assert.equal(f.calls.length,1);
});
test('Empty greeting does not invoke native actions; PWA still uses its existing browser APIs',async()=>{
 const f=fixture();f.ctx.greetingResultText.value=' ';await f.events.share();await f.events.copy();assert.equal(f.calls.length,0);
 delete f.ctx.VardadienasNativeGreetings;f.ctx.greetingResultText.value='Sveicu!';f.ctx.navigator.share=async v=>f.calls.push(['webshare',v.text]);await f.events.share();await f.events.copy();
 assert.deepEqual(f.calls,[['webshare','Sveicu!'],['webcopy','Sveicu!']]);
});
