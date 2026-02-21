// Popup launcher - open selected dashboard or login
(function () {
  'use strict';

  const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  function getDashboardUrl(dash) {
    const base = chrome.runtime.getURL('');
    if (dash === '2') return base + 'dashboard2.html';
    if (dash === '3') return base + 'dashboard3.html';
    return base + 'dashboard.html';
  }

  chrome.storage.local.get(['ax_logged_in', 'ax_tg_id', 'ax_login_time', 'ax_selected_dashboard'], (s) => {
    const loggedIn = s.ax_logged_in && s.ax_tg_id;
    const loginTime = Number(s.ax_login_time) || 0;
    const expired = loginTime > 0 && (Date.now() - loginTime > SESSION_TTL_MS);
    const needsLogin = !loggedIn || expired;

    const url = needsLogin
      ? chrome.runtime.getURL('dashboard.html')
      : getDashboardUrl(s.ax_selected_dashboard || '1');

    chrome.tabs.create({ url }, () => {
      window.close();
    });
  });
})();
