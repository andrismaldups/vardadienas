(function(){
  const status=document.getElementById('pushActivationStatus');
  const button=document.getElementById('activatePushButton');
  if(!button)return;
  const message='DESIGN TEST: paziņojumi ir atspējoti, lai aizsargātu esošos TEST abonementus.';
  function lock(){
    if(!button.disabled)button.disabled=true;
    if(button.textContent!=='Paziņojumi DESIGN TEST nav pieejami')button.textContent='Paziņojumi DESIGN TEST nav pieejami';
    if(status && status.textContent!==message)status.textContent=message;
  }
  button.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();lock();},true);
  lock();
  /* Legacy status refresh can change the button asynchronously; re-lock after mutations. */
  new MutationObserver(lock).observe(button,{attributes:true,attributeFilter:['disabled'],childList:true});
})();

