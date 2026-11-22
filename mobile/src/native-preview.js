/* Local packaged preview. No production server or payment integration yet. */
(function () {
  'use strict';
  const localFetch = window.fetch.bind(window);
  window.fetch = function (input, options) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url,
      window.location.href);
    // Comparing protocol + host also handles WKWebView's non-HTTP capacitor scheme.
    if (url.protocol !== window.location.protocol || url.host !== window.location.host) {
      return Promise.reject(new Error('iOS preview: remote server integration is not configured.'));
    }
    return localFetch(input, options);
  };
  window.VardadienasPlatform = Object.freeze({
    runtime: 'capacitor-preview',
    native: window.Capacitor?.isNativePlatform?.() === true,
    remoteSync: false,
    storePurchases: false,
    nativePush: false
  });
})();
