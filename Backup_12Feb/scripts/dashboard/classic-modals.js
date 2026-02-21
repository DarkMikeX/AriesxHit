// Shared Classic modals - BIN, CC, Email, Telegram, Proxy, Autofill, Settings
// Use: initClassicModals({ onLoadData, onRefreshForms })
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

  function send(type, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...data }, (r) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(r);
      });
    });
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'ax-dash-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
  }

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

  const backdrop = document.getElementById('ax-modal-backdrop');
  function openModal(id) {
    document.querySelectorAll('.ax-modal').forEach((m) => m.classList.remove('open'));
    const modal = document.getElementById('ax-modal-' + id);
    if (modal) {
      modal.classList.add('open');
      backdrop?.classList.add('open');
    }
    document.querySelectorAll('.ax-dash-menu-item').forEach((m) => m.classList.toggle('active', m.dataset.modal === id));
    document.querySelectorAll('.ax-config-menu-item').forEach((m) => m.classList.toggle('active', m.dataset.modal === id));
  }

  function closeModal() {
    document.querySelectorAll('.ax-modal').forEach((m) => m.classList.remove('open'));
    backdrop?.classList.remove('open');
    document.getElementById('ax-dash-menu')?.classList.remove('open');
    document.getElementById('ax-config-menu')?.classList.remove('open');
  }

  function addBinRow(val = '', containerEl) {
    if (!containerEl) return null;
    const wrap = document.createElement('div');
    wrap.className = 'ax-dash-bin-row';
    wrap.innerHTML = `<input type="text" class="ax-dash-input ax-bin" placeholder="BIN" value="${String(val).replace(/"/g, '&quot;')}"><button type="button" class="ax-btn-reset small ax-rm-bin">−</button>`;
    containerEl.appendChild(wrap);
    wrap.querySelector('.ax-rm-bin')?.addEventListener('click', () => wrap.remove());
    return wrap;
  }

  function refreshBinFormFromList(bins, containerEl) {
    if (!containerEl || !Array.isArray(bins) || !bins.length) return;
    const addWrap = containerEl.querySelector('.ax-dash-bin-add');
    const rows = [...containerEl.querySelectorAll('.ax-dash-bin-row')];
    rows.forEach((r) => r.remove());
    bins.forEach((b) => addBinRow(b, containerEl));
    if (addWrap) containerEl.appendChild(addWrap);
  }

  function getFormBins(containerEl) {
    if (!containerEl) return [];
    return [...containerEl.querySelectorAll('input.ax-bin')].map((i) => i.value.trim()).filter(Boolean);
  }

  window.initClassicModals = function (config) {
    const onLoadData = config.onLoadData || (() => {});
    const onRefreshForms = config.onRefreshForms || (() => {});

    function refreshFormsFromStorage() {
      chrome.storage.local.get(USER_DATA_KEYS, (s) => {
        const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val !== false; };
        const binContainer = document.getElementById('ax-dash-bin-inputs');
        if (s.savedBins?.length && binContainer) refreshBinFormFromList(s.savedBins, binContainer);
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

    backdrop?.addEventListener('click', closeModal);
    document.querySelectorAll('.ax-modal-inner').forEach((inner) => {
      inner.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('.ax-dash-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.modal || 'bin';
        openModal(id);
      });
    });
    document.querySelectorAll('.ax-config-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.modal || 'bin';
        openModal(id);
        document.getElementById('ax-config-menu')?.classList.remove('open');
      });
    });

    const binContainer = document.getElementById('ax-dash-bin-inputs');
    if (binContainer) {
      chrome.storage.local.get(['savedBins'], (r) => {
        binContainer.innerHTML = '';
        const bins = r.savedBins && r.savedBins.length ? r.savedBins : [''];
        bins.forEach((b) => addBinRow(b, binContainer));
        const addWrap = document.createElement('div');
        addWrap.className = 'ax-dash-bin-add';
        addWrap.innerHTML = '<button type="button" class="ax-btn-secondary" id="ax-dash-add-bin">+ Add BIN</button>';
        binContainer.appendChild(addWrap);
        document.getElementById('ax-dash-add-bin')?.addEventListener('click', () => addBinRow('', binContainer));
      });
    }

    document.getElementById('ax-dash-save-bin')?.addEventListener('click', () => {
      const bins = getFormBins(binContainer);
      if (!bins.length) { showToast('Enter at least one BIN'); return; }
      chrome.storage.local.set({ savedBins: bins }, () => syncUserDataToBackend());
      onLoadData();
      showToast('BIN saved');
      closeModal();
    });
    document.getElementById('ax-dash-switch-bin')?.addEventListener('click', () => {
      const formBins = getFormBins(binContainer);
      if (formBins.length < 2) { showToast('Add 2+ BINs to switch'); return; }
      send('SWITCH_BIN', { bins: formBins }).then((r) => {
        if (r?.bin) {
          showToast('Switched to: ' + r.bin);
          if (r.binList && r.binList.length) refreshBinFormFromList(r.binList, binContainer);
        } else showToast('Switch failed');
        onLoadData();
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
      onLoadData();
      showToast('BIN reset');
    });

    document.getElementById('ax-dash-save-cc')?.addEventListener('click', () => {
      const text = document.getElementById('ax-dash-cc-input')?.value?.trim() || '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
      chrome.storage.local.set({ savedCards: lines.join('\n') }, () => syncUserDataToBackend());
      onLoadData();
      showToast('Card list saved');
      closeModal();
    });
    document.getElementById('ax-dash-reset-cc')?.addEventListener('click', () => {
      const el = document.getElementById('ax-dash-cc-input');
      if (el) el.value = '';
      chrome.storage.local.set({ savedCards: '' });
      onLoadData();
      showToast('CC reset');
    });

    document.getElementById('ax-dash-save-email')?.addEventListener('click', () => {
      const v = document.getElementById('ax-dash-email')?.value?.trim();
      chrome.storage.local.set({ ax_fill_email: v || '' }, () => syncUserDataToBackend());
      onLoadData();
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
      onLoadData();
      showToast('Email reset');
    });

    document.getElementById('ax-dash-save-tg')?.addEventListener('click', () => {
      const id = document.getElementById('ax-dash-tg-id')?.value?.trim();
      chrome.storage.local.set({ ax_tg_id: id || '', ax_api_url: getTgApiBase() });
      onLoadData();
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
          chrome.storage.local.set({ ax_tg_id: tgId, ax_tg_name: data.name || 'User', ax_logged_in: true, ax_login_time: Date.now() });
          onLoadData();
        } else showToast(data.error || 'Invalid code');
      } catch (e) { showToast('Could not reach server'); }
    });
    document.getElementById('ax-dash-reset-tg')?.addEventListener('click', () => {
      const idEl = document.getElementById('ax-dash-tg-id');
      const otpEl = document.getElementById('ax-dash-tg-otp');
      if (idEl) idEl.value = '';
      if (otpEl) otpEl.value = '';
      chrome.storage.local.set({ ax_tg_id: '', ax_api_url: '' });
      onLoadData();
      showToast('Telegram reset');
    });

    document.getElementById('ax-dash-save-proxy')?.addEventListener('click', () => {
      const v = document.getElementById('ax-dash-proxy')?.value?.trim();
      const enabled = document.getElementById('ax-dash-proxy-enabled')?.checked ?? false;
      chrome.storage.local.set({ ax_proxy: v || '', ax_proxy_enabled: enabled && !!v.trim() }, () => syncUserDataToBackend());
      send('APPLY_PROXY', { proxyText: v || '', enabled: enabled && !!v.trim() }).then((r) => {
        onLoadData();
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
        onLoadData();
      });
    });
    document.getElementById('ax-dash-reset-proxy')?.addEventListener('click', () => {
      const proxyEl = document.getElementById('ax-dash-proxy');
      const enabledEl = document.getElementById('ax-dash-proxy-enabled');
      if (proxyEl) proxyEl.value = '';
      if (enabledEl) enabledEl.checked = false;
      send('APPLY_PROXY', { proxyText: '', enabled: false }).then(() => {
        chrome.storage.local.set({ ax_proxy: '', ax_proxy_enabled: false });
        onLoadData();
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
      onLoadData();
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
      const ms = document.getElementById('ax-dash-music-status');
      if (ms) ms.textContent = 'No file chosen';
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
      onLoadData();
      showToast('Settings reset');
    });

    document.getElementById('ax-dash-reset-stripe-bg')?.addEventListener('click', () => {
      const stripeBg = document.getElementById('ax-dash-stripe-bg');
      const stripeBgHex = document.getElementById('ax-dash-stripe-bg-hex');
      if (stripeBg) stripeBg.value = '#0a0a0b';
      if (stripeBgHex) stripeBgHex.value = '#0a0a0b';
    });
    document.getElementById('ax-dash-stripe-bg')?.addEventListener('input', (e) => {
      const hex = document.getElementById('ax-dash-stripe-bg-hex');
      if (hex && e.target) hex.value = e.target.value;
    });
    document.getElementById('ax-dash-stripe-bg-hex')?.addEventListener('input', (e) => {
      const picker = document.getElementById('ax-dash-stripe-bg');
      const v = (e.target?.value || '').replace(/^#?/, '#');
      if (picker && /^#[0-9A-Fa-f]{6}$/.test(v)) picker.value = v;
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

    refreshFormsFromStorage();
    if (onRefreshForms) onRefreshForms(refreshFormsFromStorage);

    return { openModal, closeModal, refreshFormsFromStorage, showToast };
  };
})();
