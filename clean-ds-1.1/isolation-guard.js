/* DESIGN TEST only. The existing TEST server and its D1 data must never be touched
   by this experimental PWA. Keep this before every application script. */
(function(){
  const protectedOrigin='https://vardadienas-push-test.andris-maldups.workers.dev';
  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    let url;
    try{url=new URL(typeof input==='string'?input:input.url,location.href);}
    catch(error){return Promise.reject(error);}
    if(url.origin===protectedOrigin){
      return Promise.reject(new Error('DESIGN TEST: savienojums ar esošo TEST serveri ir atspējots.'));
    }
    return originalFetch(input,init);
  };
  window.DESIGN_TEST_ISOLATED=true;
})();
