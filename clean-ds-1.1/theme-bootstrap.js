(function(){
  const KEY='appearanceMode';
  const DESIGN_KEY='designStyle';
  let design='classic';
  try{const saved=localStorage.getItem(DESIGN_KEY);if(['classic','festive-s1','ds11'].includes(saved))design=saved;}catch(e){}
  document.documentElement.dataset.design=design;
  function syncDs11(){if(!document.body)return;const active=document.documentElement.dataset.design==='ds11';document.body.classList.toggle('ds-app',active);if(active)document.body.dataset.mode=document.documentElement.dataset.theme||'light';else delete document.body.dataset.mode;/* Component identity stays in HTML; theme switching only changes the theme state. */}
  const allowed=['light','dark','auto'];
  let mode='auto';
  try{const saved=localStorage.getItem(KEY);if(allowed.includes(saved))mode=saved;}catch(e){}
  const media=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  function apply(){document.documentElement.dataset.theme=mode==='auto'?(media&&media.matches?'dark':'light'):mode;document.documentElement.style.colorScheme=document.documentElement.dataset.theme;if(document.body&&document.documentElement.dataset.design==='ds11')document.body.dataset.mode=document.documentElement.dataset.theme;}
  apply();
  function init(){
    syncDs11();
    document.querySelectorAll('input[name="designStyle"]').forEach(input=>{
      input.checked=input.value===design;
      input.addEventListener('change',()=>{if(!input.checked)return;design=input.value;document.documentElement.dataset.design=design;syncDs11();try{localStorage.setItem(DESIGN_KEY,design);}catch(e){}});
    });
    document.querySelectorAll('input[name="appearanceMode"]').forEach(input=>{
      input.checked=input.value===mode;
      input.addEventListener('change',()=>{if(!input.checked)return;mode=input.value;try{localStorage.setItem(KEY,mode);}catch(e){}apply();});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  if(media){if(media.addEventListener)media.addEventListener('change',()=>{if(mode==='auto')apply();});else if(media.addListener)media.addListener(()=>{if(mode==='auto')apply();});}
})();

