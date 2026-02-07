// AriesxHit Dashboard
(function () {
  'use strict';

  const getTgApiBase = () => (typeof TGConfig !== 'undefined' ? TGConfig.BOT_URL : 'http://localhost:3000').replace(/\/$/, '');
  const getBotUsername = () => (typeof TGConfig !== 'undefined' ? TGConfig.BOT_USERNAME : 'AriesxHitBot') || 'AriesxHitBot';

  const USER_DATA_KEYS = [
    'savedBins', 'savedCards', 'ax_fill_email', 'ax_proxy', 'ax_proxy_enabled', 'ax_mode',
    'ax_autodelay', 'ax_random_names', 'ax_random_addr', 'ax_fill_name', 'ax_fill_street1',
    'ax_fill_street2', 'ax_fill_locality', 'ax_fill_card_mask', 'ax_fill_expiry_mask', 'ax_fill_cvv_mask',
    'ax_tg_hits', 'ax_auto_screenshot', 'ax_screenshot_tg', 'ax_screenshot_format', 'ax_blur_email_screenshot',
    'ax_screenshot_keybind', 'ax_remove_payment_agent', 'ax_stripe_bg_color',
  ];

  async function syncUserDataToBackend() {
    const s = await new Promise((r) => chrome.storage.local.get(['ax_tg_id', ...USER_DATA_KEYS], r));
    if (!s.ax_tg_id) return;
    const data = {};
    USER_DATA_KEYS.forEach((k) => { if (s[k] !== undefined) data[k] = s[k]; });
    try {
      await fetch(getTgApiBase() + '/api/tg/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: s.ax_tg_id, data }),
      });
    } catch (_) {}
  }

  async function loadUserDataFromBackend(tgId) {
    try {
      const res = await fetch(getTgApiBase() + '/api/tg/user-data?tg_id=' + encodeURIComponent(tgId));
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok || !json.data || typeof json.data !== 'object') return;
      const data = json.data;
      const toSet = {};
      USER_DATA_KEYS.forEach((k) => { if (data[k] !== undefined && data[k] !== null) toSet[k] = data[k]; });
      if (Object.keys(toSet).length) {
        chrome.storage.local.set(toSet, () => refreshFormsFromStorage());
      }
    } catch (_) {}
  }

  function refreshFormsFromStorage() {
    chrome.storage.local.get(USER_DATA_KEYS, (s) => {
      const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
      const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val !== false; };
      if (s.savedBins?.length) refreshBinFormFromList(s.savedBins);
      set('ax-dash-cc-input', s.savedCards);
      set('ax-dash-email', s.ax_fill_email);
      set('ax-dash-proxy', s.ax_proxy);
      setCheck('ax-dash-proxy-enabled', s.ax_proxy_enabled);
      set('ax-dash-autodelay', s.ax_autodelay ?? 7);
      setCheck('ax-dash-random-names', s.ax_random_names);
      setCheck('ax-dash-random-addr', s.ax_random_addr);
      setCheck('ax-dash-tg-hits', s.ax_tg_hits);
      setCheck('ax-dash-auto-screenshot', s.ax_auto_screenshot !== false);
      set('ax-dash-autofill-name', s.ax_fill_name || '');
      set('ax-dash-autofill-street1', s.ax_fill_street1 || '152 Forest Avenue');
      set('ax-dash-autofill-street2', s.ax_fill_street2 || '');
      set('ax-dash-autofill-locality', s.ax_fill_locality || '');
      set('ax-dash-autofill-card', s.ax_fill_card_mask || '0000000000000000');
      set('ax-dash-autofill-expiry', s.ax_fill_expiry_mask || '09/29');
      set('ax-dash-autofill-cvv', s.ax_fill_cvv_mask || '000');
      setCheck('ax-dash-screenshot-tg', s.ax_screenshot_tg);
      set('ax-dash-screenshot-format', s.ax_screenshot_format || '');
      setCheck('ax-dash-blur-email', s.ax_blur_email_screenshot);
      setCheck('ax-dash-remove-agent', s.ax_remove_payment_agent === true);
      const c = (s.ax_stripe_bg_color || '#0a0a0b').replace(/^#?/, '#');
      const stripeBg = document.getElementById('ax-dash-stripe-bg');
      const stripeBgHex = document.getElementById('ax-dash-stripe-bg-hex');
      if (stripeBg) stripeBg.value = c;
      if (stripeBgHex) stripeBgHex.value = c;
    });
  }

  function send(type, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...data }, (r) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(r);
      });
    });
  }

  function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('ax-clock-time');
    const dateEl = document.getElementById('ax-clock-date');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  const selectorOverlay = document.getElementById('ax-selector-overlay');
  const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

  function checkLogin() {
    const overlay = document.getElementById('ax-login-overlay');
    const botLink = document.getElementById('ax-login-otp-bot');
    if (botLink) botLink.setAttribute('href', 'https://t.me/' + getBotUsername());
    chrome.storage.local.get(['ax_tg_id', 'ax_logged_in', 'ax_selected_dashboard', 'ax_login_time'], (s) => {
      const loginTime = Number(s.ax_login_time) || 0;
      const expired = loginTime > 0 && (Date.now() - loginTime > SESSION_TTL_MS);
      if (!s.ax_logged_in || !s.ax_tg_id || expired) {
        if (expired) chrome.storage.local.set({ ax_logged_in: false });
        overlay?.classList.remove('hidden');
        selectorOverlay?.classList.add('hidden');
        return;
      }
      overlay?.classList.add('hidden');
      const dash = s.ax_selected_dashboard || '';
      if (dash === '2') {
        window.location.href = chrome.runtime.getURL('dashboard2.html');
        return;
      }
      if (dash === '3') {
        window.location.href = chrome.runtime.getURL('dashboard3.html');
        return;
      }
      if (!dash) {
        selectorOverlay?.classList.remove('hidden');
      } else {
        selectorOverlay?.classList.add('hidden');
      }
    });
  }

  function setupDashboardSelector() {
    selectorOverlay?.querySelectorAll('.ax-selector-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const id = opt.dataset.dashboard || '1';
        chrome.storage.local.set({ ax_selected_dashboard: id }, () => {
          if (id === '2') {
            window.location.href = chrome.runtime.getURL('dashboard2.html');
          } else if (id === '3') {
            window.location.href = chrome.runtime.getURL('dashboard3.html');
          } else {
            selectorOverlay?.classList.add('hidden');
          }
        });
      });
    });
  }

  function loadData() {
    send('GET_LOGS').then((r) => {
      if (!r) return;
      const logs = r.logs || [];
      const stats = r.stats || { hits: 0, tested: 0, declined: 0 };
      renderLogs(logs);
      renderStats(stats);
    });
    send('GET_STATE').then((r) => {
      if (!r) return;
      const active = r.autoHitActive ?? false;
      const binList = r.binList || [];
      const cardList = r.cardList || [];
      const statusEl = document.getElementById('ax-status-active');
      if (statusEl) {
        statusEl.textContent = active ? 'Active' : 'Paused';
        statusEl.className = 'ax-dash-badge ' + (active ? 'green' : 'red');
      }
      chrome.storage.local.get(['savedBins', 'savedCards', 'ax_mode', 'ax_proxy', 'ax_fill_email', 'ax_proxy_enabled'], (s) => {
        const binEl = document.getElementById('ax-setting-bin');
        const ccEl = document.getElementById('ax-setting-cc');
        const proxyEl = document.getElementById('ax-setting-proxy');
        const modeEl = document.getElementById('ax-status-mode');
        if (modeEl) modeEl.textContent = (s.ax_mode || 'BIN').toUpperCase();
        if (binEl) binEl.textContent = active && binList.length ? binList[0] : (s.savedBins?.length ? s.savedBins[0] : '(No BIN configured)');
        const cardCount = active && cardList.length ? cardList.length : ((s.savedCards || '').trim().split(/\r?\n/).filter(Boolean).length);
        if (ccEl) ccEl.textContent = cardCount ? cardCount + ' cards' : '(No CC list configured)';
        if (proxyEl) {
          const raw = (s.ax_proxy || '').trim();
          const enabled = s.ax_proxy_enabled === true;
          const count = raw ? raw.split(/\r?\n/).filter(Boolean).length : 0;
          proxyEl.textContent = count ? (enabled ? count + ' proxy(ies) ON' : count + ' proxy(ies)') : '—';
        }
        const emailEl = document.getElementById('ax-setting-email');
        if (emailEl) emailEl.textContent = (s.ax_fill_email || '').trim() || '—';
      });
    });
    chrome.storage.local.get(['ax_last_hit', 'ax_tg_id', 'ax_last_tg_notify_error'], (s) => {
      if (s.ax_last_hit) {
        const lastEl = document.getElementById('ax-last-hit');
        if (lastEl) lastEl.textContent = s.ax_last_hit;
      }
      const tgEl = document.getElementById('ax-status-tg');
      if (tgEl) {
        tgEl.textContent = s.ax_tg_id ? 'Connected' : 'Not Connected';
        tgEl.className = 'ax-dash-badge ' + (s.ax_tg_id ? 'green' : 'red');
      }
      const warnEl = document.getElementById('ax-tg-notify-warn');
      const errEl = document.getElementById('ax-tg-notify-error');
      if (warnEl && errEl) {
        if (s.ax_last_tg_notify_error) {
          errEl.textContent = s.ax_last_tg_notify_error;
          warnEl.classList.remove('hidden');
        } else {
          warnEl.classList.add('hidden');
        }
      }
    });
  }

  function renderLogs(logs) {
    const el = document.getElementById('ax-dash-logs');
    if (!el) return;
    const entries = logs.filter((l) => l.type === 'log').slice(-50).reverse();
    el.innerHTML = entries.map((e) => {
      const cls = e.subtype === 'hit' ? 'ax-dash-log-success' : e.subtype === 'error' ? 'ax-dash-log-decline' : 'ax-dash-log-trying';
      let text = '';
      const cardStr = e.card || '';
      const copyBtn = cardStr ? `<button type="button" class="ax-dash-log-copy" data-card="${escapeHtml(cardStr)}" title="Copy">📋</button>` : '';
      if (e.subtype === 'trying') text = 'Trying Card: ' + (cardStr || '');
      else if (e.subtype === 'hit') text = 'Success: Payment completed successfully!' + (cardStr ? ' ' : '');
      else if (e.subtype === 'error') text = 'Decline: ' + (e.decline_code || e.code || 'unknown') + (cardStr ? ' ' : '');
      return `<div class="ax-dash-log-entry ${cls}"><span class="ax-dash-log-text">${escapeHtml(text)}</span>${copyBtn}</div>`;
    }).join('') || '<div class="ax-dash-log-entry ax-dash-log-empty">No logs yet. Open a Stripe checkout page to start.</div>';
    el.querySelectorAll('.ax-dash-log-copy').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.dataset.card;
        if (card) {
          copyToClipboard(card).then(() => showToast('Copied'));
        }
      });
    });
  }

  function renderStats(stats) {
    const hits = Number(stats.hits) || 0;
    const tested = Math.max(Number(stats.tested) || 0, hits);
    const declined = Number(stats.declined) || 0;
    const hitsEl = document.getElementById('ax-stat-hits');
    const declinesEl = document.getElementById('ax-stat-declines');
    const attemptsEl = document.getElementById('ax-stat-attempts');
    const rateEl = document.getElementById('ax-stat-rate');
    if (hitsEl) hitsEl.textContent = hits;
    if (declinesEl) declinesEl.textContent = declined;
    if (attemptsEl) attemptsEl.textContent = tested;
    if (rateEl) {
      if (tested > 0) {
        const rate = Math.round((hits / tested) * 100);
        rateEl.textContent = rate + '%';
        rateEl.classList.remove('ax-stat-empty');
      } else {
        rateEl.textContent = '—';
        rateEl.classList.add('ax-stat-empty');
      }
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function copyToClipboard(text) {
    return new Promise((resolve, reject) => {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(resolve).catch(() => {
          // Fallback to old method
          fallbackCopy(text);
          resolve();
        });
      } else {
        // Fallback for older browsers/extensions
        fallbackCopy(text);
        resolve();
      }
    });
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      console.warn('Fallback copy failed:', err);
    }

    document.body.removeChild(textArea);
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'ax-dash-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
  }

  const backdrop = document.getElementById('ax-modal-backdrop');
  function openModal(id) {
    document.querySelectorAll('.ax-modal').forEach((m) => m.classList.remove('open'));
    const modal = document.getElementById('ax-modal-' + id);
    if (modal) {
      modal.classList.add('open');
      backdrop.classList.add('open');
    }
    document.querySelectorAll('.ax-dash-menu-item').forEach((m) => m.classList.toggle('active', m.dataset.modal === id));
  }
  function closeModal() {
    document.querySelectorAll('.ax-modal').forEach((m) => m.classList.remove('open'));
    backdrop.classList.remove('open');
    document.getElementById('ax-dash-menu')?.classList.remove('open');
  }
  backdrop?.addEventListener('click', closeModal);
  document.querySelectorAll('.ax-modal-inner').forEach((inner) => {
    inner.addEventListener('click', (e) => e.stopPropagation());
  });

  const hoverBtn = document.getElementById('ax-dash-hover-btn');
  const dashMenu = document.getElementById('ax-dash-menu');
  hoverBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dashMenu?.classList.toggle('open');
  });
  document.addEventListener('click', () => dashMenu?.classList.remove('open'));
  dashMenu?.addEventListener('click', (e) => e.stopPropagation());
  dashMenu?.querySelectorAll('.ax-dash-menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.dataset.modal || 'bin';
      openModal(id);
    });
  });

  document.getElementById('ax-clear-logs')?.addEventListener('click', () => {
    send('CLEAR_LOGS_ONLY').then(() => { loadData(); showToast('Logs cleared'); });
  });
  document.getElementById('ax-reset-stats')?.addEventListener('click', () => {
    send('CLEAR_LOGS').then(() => { loadData(); showToast('Stats reset'); });
  });
  document.getElementById('ax-toggle-vis')?.addEventListener('click', () => {
    document.querySelector('.ax-dash-settings-list')?.classList.toggle('masked');
  });
  document.getElementById('ax-copy-cards')?.addEventListener('click', () => {
    send('GET_LOGS').then((r) => {
      const logs = r?.logs || [];
      const cards = logs.filter((l) => l.subtype === 'hit' && l.card).map((l) => l.card);
      if (cards.length) {
        copyToClipboard(cards.join('\n')).then(() => showToast('Copied ' + cards.length + ' card(s)'));
      }
    });
  });

  const binContainer = document.getElementById('ax-dash-bin-inputs');
  function addBinRow(val = '', containerEl = binContainer) {
    if (!containerEl) return null;
    const wrap = document.createElement('div');
    wrap.className = 'ax-dash-bin-row';
    wrap.innerHTML = `<input type="text" class="ax-dash-input ax-bin" placeholder="BIN" value="${String(val).replace(/"/g, '&quot;')}"><button type="button" class="ax-dash-btn red small ax-rm-bin">−</button>`;
    containerEl.appendChild(wrap);
    wrap.querySelector('.ax-rm-bin')?.addEventListener('click', () => wrap.remove());
    return wrap;
  }
  function refreshBinFormFromList(bins) {
    if (!binContainer || !Array.isArray(bins) || !bins.length) return;
    const addWrap = binContainer.querySelector('.ax-dash-bin-add');
    const rows = [...binContainer.querySelectorAll('.ax-dash-bin-row')];
    rows.forEach((r) => r.remove());
    bins.forEach((b) => addBinRow(b, binContainer));
    if (addWrap) binContainer.appendChild(addWrap);
  }
  function getFormBins() {
    if (!binContainer) return [];
    return [...binContainer.querySelectorAll('input.ax-bin')].map((i) => i.value.trim()).filter(Boolean);
  }
  chrome.storage.local.get(['savedBins'], (r) => {
    if (!binContainer) return;
    binContainer.innerHTML = '';
    const bins = r.savedBins && r.savedBins.length ? r.savedBins : [''];
    bins.forEach((b) => addBinRow(b, binContainer));
    const addWrap = document.createElement('div');
    addWrap.className = 'ax-dash-bin-add';
    addWrap.innerHTML = '<button type="button" class="ax-btn-secondary" id="ax-dash-add-bin">+ Add BIN</button>';
    binContainer.appendChild(addWrap);
    document.getElementById('ax-dash-add-bin')?.addEventListener('click', () => addBinRow('', binContainer));
  });

  document.getElementById('ax-dash-save-bin')?.addEventListener('click', () => {
    const bins = getFormBins();
    if (!bins.length) { showToast('Enter at least one BIN'); return; }
    chrome.storage.local.set({ savedBins: bins }, () => syncUserDataToBackend());
    loadData();
    showToast('BIN saved');
    closeModal();
  });
  document.getElementById('ax-dash-switch-bin')?.addEventListener('click', () => {
    const formBins = getFormBins();
    if (formBins.length < 2) { showToast('Add 2+ BINs to switch'); return; }
    send('SWITCH_BIN', { bins: formBins }).then((r) => {
      if (r?.bin) {
        showToast('Switched to: ' + r.bin);
        if (r.binList && r.binList.length) refreshBinFormFromList(r.binList);
      } else showToast('Switch failed');
      loadData();
    });
  });
  document.getElementById('ax-dash-reset-bin')?.addEventListener('click', () => {
    chrome.storage.local.set({ savedBins: [] });
    if (binContainer) {
      const addWrap = binContainer.querySelector('.ax-dash-bin-add');
      [...binContainer.querySelectorAll('.ax-dash-bin-row')].forEach((r) => r.remove());
      addBinRow('', binContainer);
      if (addWrap) binContainer.appendChild(addWrap);
    }
    loadData();
    showToast('BIN reset');
  });

  document.getElementById('ax-dash-save-cc')?.addEventListener('click', () => {
    const text = document.getElementById('ax-dash-cc-input')?.value?.trim() || '';
    const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
    chrome.storage.local.set({ savedCards: lines.join('\n') }, () => syncUserDataToBackend());
    loadData();
    showToast('Card list saved');
    closeModal();
  });
  document.getElementById('ax-dash-reset-cc')?.addEventListener('click', () => {
    const el = document.getElementById('ax-dash-cc-input');
    if (el) el.value = '';
    chrome.storage.local.set({ savedCards: '' });
    loadData();
    showToast('CC reset');
  });

  document.getElementById('ax-dash-save-email')?.addEventListener('click', () => {
    const v = document.getElementById('ax-dash-email')?.value?.trim();
    chrome.storage.local.set({ ax_fill_email: v || '' }, () => syncUserDataToBackend());
    loadData();
    showToast('Email saved');
    closeModal();
  });
  document.getElementById('ax-dash-generate-email')?.addEventListener('click', () => {
    const r = Math.random().toString(36).slice(2, 10);
    const doms = ['gmail.com', 'outlook.com', 'yahoo.com'];
    const el = document.getElementById('ax-dash-email');
    if (el) el.value = r + '@' + doms[Math.floor(Math.random() * doms.length)];
  });
  document.getElementById('ax-dash-reset-email')?.addEventListener('click', () => {
    const el = document.getElementById('ax-dash-email');
    if (el) el.value = '';
    chrome.storage.local.set({ ax_fill_email: '' });
    loadData();
    showToast('Email reset');
  });

  document.getElementById('ax-dash-save-tg')?.addEventListener('click', () => {
    const id = document.getElementById('ax-dash-tg-id')?.value?.trim();
    chrome.storage.local.set({ ax_tg_id: id || '', ax_api_url: getTgApiBase() });
    loadData();
    showToast('Telegram saved');
    closeModal();
  });
  document.getElementById('ax-dash-send-code')?.addEventListener('click', async () => {
    const tgId = document.getElementById('ax-dash-tg-id')?.value?.trim();
    if (!tgId) { showToast('Enter Telegram ID first'); return; }
    try {
      const res = await fetch(getTgApiBase() + '/api/tg/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: tgId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) showToast('OTP sent! Check your Telegram.');
      else showToast(data.error || 'Failed to send OTP');
    } catch (e) { showToast('Could not reach server'); }
  });
  document.getElementById('ax-dash-verify-tg')?.addEventListener('click', async () => {
    const tgId = document.getElementById('ax-dash-tg-id')?.value?.trim();
    const token = document.getElementById('ax-dash-tg-otp')?.value?.trim();
    if (!tgId || !token) { showToast('Enter Telegram ID and OTP'); return; }
    try {
      const res = await fetch(getTgApiBase() + '/api/tg/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: tgId, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        showToast('Verified!');
        chrome.storage.local.set({ ax_tg_id: tgId, ax_tg_name: data.name || 'User' });
        loadData();
      } else showToast(data.error || 'Invalid code');
    } catch (e) { showToast('Could not reach server'); }
  });
  document.getElementById('ax-dash-reset-tg')?.addEventListener('click', () => {
    const idEl = document.getElementById('ax-dash-tg-id');
    const otpEl = document.getElementById('ax-dash-tg-otp');
    if (idEl) idEl.value = '';
    if (otpEl) otpEl.value = '';
    chrome.storage.local.set({ ax_tg_id: '', ax_api_url: '' });
    loadData();
    showToast('Telegram reset');
  });

  document.getElementById('ax-dash-save-proxy')?.addEventListener('click', () => {
    const v = document.getElementById('ax-dash-proxy')?.value?.trim();
    const enabled = document.getElementById('ax-dash-proxy-enabled')?.checked ?? false;
    chrome.storage.local.set({ ax_proxy: v || '', ax_proxy_enabled: enabled && !!v.trim() }, () => syncUserDataToBackend());
    send('APPLY_PROXY', { proxyText: v || '', enabled: enabled && !!v.trim() }).then((r) => {
      loadData();
      if (r?.enabled && r?.count) showToast('Proxy applied (' + r.count + ')');
      else if (!r?.enabled) showToast('Proxy disabled');
      else showToast('Proxy saved');
      closeModal();
    });
  });
  document.getElementById('ax-dash-rotate-proxy')?.addEventListener('click', () => {
    send('ROTATE_PROXY').then((r) => {
      if (r?.proxy && r?.count > 1) showToast('Rotated to proxy ' + (r.index + 1) + '/' + r.count);
      else if (r?.count <= 1) showToast('Only one proxy');
      else showToast('No proxies');
      loadData();
    });
  });
  document.getElementById('ax-dash-reset-proxy')?.addEventListener('click', () => {
    const proxyEl = document.getElementById('ax-dash-proxy');
    const enabledEl = document.getElementById('ax-dash-proxy-enabled');
    if (proxyEl) proxyEl.value = '';
    if (enabledEl) enabledEl.checked = false;
    send('APPLY_PROXY', { proxyText: '', enabled: false }).then(() => {
      chrome.storage.local.set({ ax_proxy: '', ax_proxy_enabled: false });
      loadData();
      showToast('Proxy reset');
    });
  });

  document.getElementById('ax-dash-save-autofill')?.addEventListener('click', () => {
    const delay = parseInt(document.getElementById('ax-dash-autodelay')?.value || '7', 10);
    chrome.storage.local.set({
      ax_autodelay: Math.max(1, Math.min(30, delay)),
      ax_random_names: document.getElementById('ax-dash-random-names')?.checked ?? true,
      ax_random_addr: document.getElementById('ax-dash-random-addr')?.checked ?? true,
      ax_fill_name: document.getElementById('ax-dash-autofill-name')?.value?.trim() || '',
      ax_fill_street1: document.getElementById('ax-dash-autofill-street1')?.value?.trim() || '152 Forest Avenue',
      ax_fill_street2: document.getElementById('ax-dash-autofill-street2')?.value?.trim() || '',
      ax_fill_locality: document.getElementById('ax-dash-autofill-locality')?.value?.trim() || '',
      ax_fill_card_mask: (document.getElementById('ax-dash-autofill-card')?.value?.trim().replace(/\D/g, '') || '0000000000000000').slice(0, 16),
      ax_fill_expiry_mask: document.getElementById('ax-dash-autofill-expiry')?.value?.trim() || '09/29',
      ax_fill_cvv_mask: (document.getElementById('ax-dash-autofill-cvv')?.value?.trim().replace(/\D/g, '') || '000').slice(0, 4),
    }, () => syncUserDataToBackend());
    showToast('Autofill saved');
    closeModal();
  });
  document.getElementById('ax-dash-reset-autofill')?.addEventListener('click', () => {
    document.getElementById('ax-dash-autodelay').value = '7';
    document.getElementById('ax-dash-random-names').checked = true;
    document.getElementById('ax-dash-random-addr').checked = true;
    document.getElementById('ax-dash-autofill-name').value = '';
    document.getElementById('ax-dash-autofill-street1').value = '152 Forest Avenue';
    document.getElementById('ax-dash-autofill-street2').value = '';
    document.getElementById('ax-dash-autofill-locality').value = '';
    document.getElementById('ax-dash-autofill-card').value = '0000000000000000';
    document.getElementById('ax-dash-autofill-expiry').value = '09/29';
    document.getElementById('ax-dash-autofill-cvv').value = '000';
    chrome.storage.local.set({
      ax_autodelay: 7,
      ax_random_names: true,
      ax_random_addr: true,
      ax_fill_name: '', ax_fill_street1: '152 Forest Avenue', ax_fill_street2: '', ax_fill_locality: '',
      ax_fill_card_mask: '0000000000000000', ax_fill_expiry_mask: '09/29', ax_fill_cvv_mask: '000',
    });
    showToast('Autofill reset');
  });

  document.getElementById('ax-dash-save-settings')?.addEventListener('click', () => {
    const fmt = document.getElementById('ax-dash-screenshot-format')?.value?.trim();
    const bgMusicOn = document.getElementById('ax-dash-bg-music')?.checked === true;
    const customMusic = document.getElementById('ax-dash-custom-music')?.dataset?.dataUrl || '';
    chrome.storage.local.set({
      ax_tg_hits: document.getElementById('ax-dash-tg-hits')?.checked ?? true,
      ax_auto_screenshot: document.getElementById('ax-dash-auto-screenshot')?.checked ?? true,
      ax_screenshot_tg: document.getElementById('ax-dash-screenshot-tg')?.checked ?? false,
      ax_screenshot_format: fmt || 'ARIESxHit_{timestamp}',
      ax_blur_email_screenshot: document.getElementById('ax-dash-blur-email')?.checked ?? false,
      ax_screenshot_keybind: document.getElementById('ax-dash-screenshot-keybind')?.value?.trim() || '',
      ax_remove_payment_agent: document.getElementById('ax-dash-remove-agent')?.checked ?? false,
      ax_background_music: bgMusicOn,
      ax_custom_music_data: customMusic,
      ax_stripe_bg_color: (document.getElementById('ax-dash-stripe-bg-hex')?.value?.trim() || document.getElementById('ax-dash-stripe-bg')?.value || '#0a0a0b').replace(/^#?/, '#'),
    }, () => syncUserDataToBackend());
    loadData();
    showToast('Settings saved');
    closeModal();
  });
  document.getElementById('ax-dash-reset-settings')?.addEventListener('click', () => {
    document.getElementById('ax-dash-tg-hits').checked = true;
    document.getElementById('ax-dash-auto-screenshot').checked = true;
    document.getElementById('ax-dash-screenshot-tg').checked = false;
    document.getElementById('ax-dash-screenshot-format').value = '';
    document.getElementById('ax-dash-blur-email').checked = false;
    const kb = document.getElementById('ax-dash-screenshot-keybind');
    if (kb) { kb.value = ''; kb.placeholder = 'Click to set keybind'; kb.dataset.key = ''; }
    document.getElementById('ax-dash-remove-agent').checked = false;
    document.getElementById('ax-dash-bg-music').checked = false;
    const musicInput = document.getElementById('ax-dash-custom-music');
    if (musicInput) { musicInput.value = ''; delete musicInput.dataset.dataUrl; }
    document.getElementById('ax-dash-music-status').textContent = 'No file chosen';
    const statusItalic = document.getElementById('ax-dash-music-status-italic');
    if (statusItalic) statusItalic.textContent = 'No custom music set';
    const stripeBg = document.getElementById('ax-dash-stripe-bg');
    const stripeBgHex = document.getElementById('ax-dash-stripe-bg-hex');
    if (stripeBg) stripeBg.value = '#0a0a0b';
    if (stripeBgHex) stripeBgHex.value = '#0a0a0b';
    chrome.storage.local.set({
      ax_tg_hits: true, ax_auto_screenshot: true, ax_screenshot_tg: false,
      ax_screenshot_format: '', ax_blur_email_screenshot: false, ax_screenshot_keybind: '',
      ax_remove_payment_agent: false, ax_background_music: false, ax_custom_music_data: '',
      ax_stripe_bg_color: '#0a0a0b',
    });
    loadData();
    showToast('Settings reset');
  });

  document.getElementById('ax-dash-choose-music')?.addEventListener('click', () => {
    document.getElementById('ax-dash-custom-music')?.click();
  });
  document.getElementById('ax-dash-custom-music')?.addEventListener('change', (e) => {
    const file = e.target?.files?.[0];
    const status = document.getElementById('ax-dash-music-status');
    const statusItalic = document.getElementById('ax-dash-music-status-italic');
    if (!file) {
      if (status) status.textContent = 'No file chosen';
      if (statusItalic) statusItalic.textContent = 'No custom music set';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      e.target.dataset.dataUrl = dataUrl;
      if (status) status.textContent = file.name;
      if (statusItalic) statusItalic.textContent = 'Custom music ready';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('ax-dash-settings')?.addEventListener('click', () => openModal('settings'));

  document.getElementById('ax-dash-switch-dash')?.addEventListener('click', () => {
    chrome.storage.local.set({ ax_selected_dashboard: '' }, () => {
      selectorOverlay?.classList.remove('hidden');
    });
  });

  document.getElementById('ax-dash-logout')?.addEventListener('click', () => {
    chrome.storage.local.set({ ax_logged_in: false, ax_tg_id: '', ax_login_time: 0 }, () => {
      document.getElementById('ax-login-overlay')?.classList.remove('hidden');
      selectorOverlay?.classList.add('hidden');
    });
  });

  document.querySelector('.ax-dash-tg')?.addEventListener('click', () => {
    window.open('https://t.me/' + getBotUsername(), '_blank');
  });

  function setLoginMsg(text, type) {
    const el = document.getElementById('ax-login-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'ax-login-msg ' + (type === 'success' ? 'ax-login-msg-success' : type === 'error' ? 'ax-login-msg-error' : 'ax-login-msg-info');
  }

  document.getElementById('ax-login-verify')?.addEventListener('click', async () => {
    const code = (document.getElementById('ax-login-code')?.value || '').trim().toUpperCase();
    if (!code || code.length !== 12) {
      setLoginMsg('Enter a valid 12-character code', 'error');
      return;
    }
    setLoginMsg('Verifying...', 'info');
    try {
      const res = await fetch(getTgApiBase() + '/api/tg/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.tg_id) {
        chrome.storage.local.set({
          ax_tg_id: data.tg_id,
          ax_logged_in: true,
          ax_login_time: Date.now(),
          ax_tg_name: data.name || 'User',
        });
        loadUserDataFromBackend(data.tg_id);
        setLoginMsg('Logged in!', 'success');
        document.getElementById('ax-login-overlay')?.classList.add('hidden');
        chrome.storage.local.get(['ax_selected_dashboard'], (ds) => {
          if (!ds.ax_selected_dashboard) {
            selectorOverlay?.classList.remove('hidden');
          } else if (ds.ax_selected_dashboard === '2') {
            window.location.href = chrome.runtime.getURL('dashboard2.html');
          } else if (ds.ax_selected_dashboard === '3') {
            window.location.href = chrome.runtime.getURL('dashboard3.html');
          }
        });
        loadData();
      } else {
        setLoginMsg(data.error || 'Invalid or expired token', 'error');
      }
    } catch (e) {
      setLoginMsg('Failed to connect. Check backend URL.', 'error');
    }
  });

  setInterval(updateClock, 1000);
  updateClock();
  setupDashboardSelector();
  checkLogin();
  loadData();
  refreshFormsFromStorage();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CARD_TRYING' || msg.type === 'CARD_ERROR' || msg.type === 'CARD_HIT' || msg.type === 'STATS_UPDATE') {
      loadData();
    }
  });
})();
