// ARIESXHIT 3DS BYPASS INJECTOR
// Based on ABUSE BYPASSER v4.1
// Injects bypass logic on ALL pages (like original ABUSE BYPASSER)

(function() {
  'use strict';

  // Inject bypass script into page context (on ALL pages)
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('scripts/autohitter/3ds-bypass-core.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Listen for logs from bypass script via postMessage
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'aries-3ds-bypass' && event.data.log) {
      // Use try-catch and don't expect response
      try {
        chrome.runtime.sendMessage({
          type: 'LOG',
          logType: event.data.log.type || 'info',
          message: event.data.log.message || '',
          url: event.data.log.url || ''
        }).catch(() => {});
      } catch(e) {
        // Extension context may be invalidated - ignore
      }
    }
  });

  console.log('[AriesxHit] 3DS injector loaded');
})();