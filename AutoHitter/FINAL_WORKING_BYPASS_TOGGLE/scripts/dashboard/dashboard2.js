// AriesxHit Dashboard 2 - Professional Layout
(function () {
  'use strict';

  const getTgApiBase = () => (typeof TGConfig !== 'undefined' ? TGConfig.BOT_URL : 'http://localhost:3000').replace(/\/$/, '');
  const getBotUsername = () => (typeof TGConfig !== 'undefined' ? TGConfig.BOT_USERNAME : 'AriesxHitBot') || 'AriesxHitBot';

  function send(type, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...data }, (r) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(r);
      });
    });
  }

  const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

  function checkLogin() {
    const overlay = document.getElementById('ax2-login-overlay');
    const app = document.getElementById('ax2-app');
    chrome.storage.local.get(['ax_tg_id', 'ax_logged_in', 'ax_selected_dashboard', 'ax_login_time'], (s) => {
      const loginTime = Number(s.ax_login_time) || 0;
      const expired = loginTime > 0 && (Date.now() - loginTime > SESSION_TTL_MS);
      if (!s.ax_logged_in || !s.ax_tg_id || expired) {
        if (expired) chrome.storage.local.set({ ax_logged_in: false });
        overlay.style.display = 'flex';
        app.style.display = 'none';
        setTimeout(() => { window.location.href = chrome.runtime.getURL('dashboard.html'); }, 1500);
        return;
      }
      if (s.ax_selected_dashboard !== '2') {
        chrome.storage.local.set({ ax_selected_dashboard: '2' }, () => {});
      }
      overlay.style.display = 'none';
      app.style.display = 'flex';
      loadData();
    });
  }

  function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('ax2-clock-time');
    const dateEl = document.getElementById('ax2-clock-date');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
      const statusEl = document.getElementById('ax2-status-active');
      const dotEl = document.getElementById('ax2-status-dot');
      if (statusEl) statusEl.textContent = active ? 'Active' : 'Paused';
      if (dotEl) {
        dotEl.className = 'status-dot' + (active ? '' : ' paused');
      }
      chrome.storage.local.get(['savedBins', 'savedCards', 'ax_mode', 'ax_proxy', 'ax_fill_email', 'ax_proxy_enabled'], (s) => {
        const binEl = document.getElementById('ax2-setting-bin');
        const ccEl = document.getElementById('ax2-setting-cc');
        const proxyEl = document.getElementById('ax2-setting-proxy');
        const emailEl = document.getElementById('ax2-setting-email');
        const modeEl = document.getElementById('ax2-status-mode');
        if (modeEl) modeEl.textContent = (s.ax_mode || 'BIN').toUpperCase();
        if (binEl) binEl.textContent = active && binList.length ? binList[0] : (s.savedBins?.length ? s.savedBins[0] : '(No BIN)');
        const cardCount = active && cardList.length ? cardList.length : ((s.savedCards || '').trim().split(/\r?\n/).filter(Boolean).length);
        if (ccEl) ccEl.textContent = cardCount ? cardCount + ' cards' : '(No CC list)';
        if (proxyEl) {
          const raw = (s.ax_proxy || '').trim();
          const enabled = s.ax_proxy_enabled === true;
          const count = raw ? raw.split(/\r?\n/).filter(Boolean).length : 0;
          proxyEl.textContent = count ? (enabled ? count + ' proxy ON' : count + ' proxy') : '—';
        }
        if (emailEl) emailEl.textContent = (s.ax_fill_email || '').trim() || '—';
      });
    });
    chrome.storage.local.get(['ax_last_hit', 'ax_tg_id', 'ax_last_tg_notify_error'], (s) => {
      const lastEl = document.getElementById('ax2-last-hit');
      const tgEl = document.getElementById('ax2-status-tg');
      if (lastEl) lastEl.textContent = s.ax_last_hit || '--';
      if (tgEl) {
        tgEl.textContent = s.ax_tg_id ? 'Connected' : 'Not Connected';
        tgEl.className = 'status-value status-badge ' + (s.ax_tg_id ? 'status-success' : 'status-error');
      }
      const notifyEl = document.getElementById('ax2-tg-notify');
      if (notifyEl) notifyEl.textContent = s.ax_last_tg_notify_error || '--';
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderLogs(logs) {
    const el = document.getElementById('ax2-logs');
    if (!el) return;
    const entries = logs.filter((l) => l.type === 'log').slice(-50).reverse();
    if (!entries.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon" style="font-size:48px;">📋</div><p>No logs yet. Activity will appear here.</p></div>';
      return;
    }
    el.innerHTML = entries.map((e, idx) => {
      const cls = e.subtype === 'hit' ? 'success' : e.subtype === 'error' ? 'error' : 'info';
      const cardStr = e.card || '';
      let text = '';
      if (e.subtype === 'trying') text = 'Trying Card: ' + (cardStr || '');
      else if (e.subtype === 'hit') text = 'Success: Payment completed successfully!';
      else if (e.subtype === 'error') text = 'Decline: ' + (e.decline_code || e.code || 'unknown');
      const ts = e.ts || Date.now();
      const copyBtn = cardStr ? `<button type="button" class="log-action-button" data-card="${escapeHtml(cardStr)}" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>` : '';
      const delBtn = `<button type="button" class="log-action-button" data-clear="1" title="Remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
      return `<div class="log-card log-${cls}"><div class="log-accent log-accent-${cls}"></div><div class="log-content"><p class="log-message">${escapeHtml(text)}</p><span class="log-timestamp">${new Date(ts).toLocaleTimeString()}</span></div><div class="log-actions">${copyBtn}${delBtn}</div></div>`;
    }).join('');
    el.querySelectorAll('.log-action-button[data-card]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const card = btn.dataset.card;
        if (card) copyToClipboard(card);
      });
    });
    el.querySelectorAll('.log-action-button[data-clear]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        send('CLEAR_LOGS_ONLY').then(() => loadData());
      });
    });
  }

  function renderStats(stats) {
    const hits = Number(stats.hits) || 0;
    const tested = Math.max(Number(stats.tested) || 0, hits);
    const declined = Number(stats.declined) || 0;
    const hitsEl = document.getElementById('ax2-stat-hits');
    const declinesEl = document.getElementById('ax2-stat-declines');
    const attemptsEl = document.getElementById('ax2-stat-attempts');
    const rateEl = document.getElementById('ax2-stat-rate');
    if (hitsEl) hitsEl.textContent = hits;
    if (declinesEl) declinesEl.textContent = declined;
    if (attemptsEl) attemptsEl.textContent = tested;
    if (rateEl) rateEl.textContent = tested > 0 ? Math.round((hits / tested) * 100) + '%' : '—';
  }

  function copyToClipboard(text) {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);

    try {
      // Select and copy the text
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      if (successful) {
        showToast('Copied successfully!');
      } else {
        showToast('Copy failed - try again');
      }
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('Copy failed - try again');
    } finally {
      // Clean up
      document.body.removeChild(textArea);
    }
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 24px;background:rgba(0,0,0,0.9);color:#fff;border-radius:10px;font-size:14px;z-index:9999;animation:fadeIn 0.3s ease;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
  }

  document.getElementById('ax2-change-dash')?.addEventListener('click', () => {
    chrome.storage.local.set({ ax_selected_dashboard: '' }, () => {
      window.location.href = chrome.runtime.getURL('dashboard.html');
    });
  });

  document.getElementById('ax2-logout')?.addEventListener('click', () => {
    chrome.storage.local.set({ ax_logged_in: false, ax_tg_id: '', ax_login_time: 0 }, () => {
      window.location.href = chrome.runtime.getURL('dashboard.html');
    });
  });

  document.getElementById('ax2-tg')?.addEventListener('click', () => {
    window.open('https://t.me/' + getBotUsername(), '_blank');
  });

  let ax2Modals;
  document.getElementById('ax2-settings')?.addEventListener('click', (e) => {
    const menu = document.getElementById('ax-config-menu');
    if (menu) menu.classList.toggle('open');
    e.stopPropagation();
  });
  document.addEventListener('click', () => document.getElementById('ax-config-menu')?.classList.remove('open'));
  document.getElementById('ax-config-menu')?.addEventListener('click', (e) => e.stopPropagation());

  const sidebar = document.getElementById('ax2-sidebar');
  const sidebarToggle = document.getElementById('ax2-sidebar-toggle');
  let sidebarExpanded = false;
  sidebar?.addEventListener('mouseenter', () => { sidebarExpanded = true; sidebar?.classList.add('expanded'); });
  sidebar?.addEventListener('mouseleave', () => { sidebarExpanded = false; sidebar?.classList.remove('expanded'); });
  sidebarToggle?.addEventListener('click', () => {
    sidebarExpanded = !sidebarExpanded;
    sidebar?.classList.toggle('expanded', sidebarExpanded);
  });

  document.getElementById('ax2-clear-logs')?.addEventListener('click', () => {
    send('CLEAR_LOGS_ONLY').then(() => { loadData(); showToast('Logs cleared'); });
  });

  document.getElementById('ax2-reset-stats')?.addEventListener('click', () => {
    send('CLEAR_LOGS').then(() => { loadData(); showToast('Stats reset'); });
  });

  document.getElementById('ax2-copy-cards')?.addEventListener('click', () => {
    send('GET_LOGS').then((r) => {
      const logs = r?.logs || [];
      const cards = logs.filter((l) => l.subtype === 'hit' && l.card).map((l) => l.card);
      if (cards.length) {
        copyToClipboard(cards.join('\n'));
      } else {
        showToast('No cards to copy');
      }
    });
  });

  setInterval(updateClock, 1000);
  updateClock();
  checkLogin();

  if (typeof initClassicModals === 'function') {
    ax2Modals = initClassicModals({
      onLoadData: loadData,
      onRefreshForms: (refresh) => { if (refresh) refresh(); }
    });
  }
  document.querySelectorAll('.ax-config-nav').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modal || 'bin';
      if (ax2Modals && ax2Modals.openModal) ax2Modals.openModal(id);
    });
  });

  // Bypass Toggle Functionality
  const bypassToggle = document.getElementById('ax-bypass-master-toggle');
  const bypassLabel = document.getElementById('ax-bypass-status-text');

  if (bypassToggle && bypassLabel) {
    // Load initial state from storage
    chrome.storage.local.get(['ax_bypass_enabled'], (result) => {
      const enabled = result.ax_bypass_enabled !== false;
      bypassToggle.checked = enabled;
      bypassLabel.textContent = enabled ? 'ON' : 'OFF';
      updateBypassUI(enabled);
    });

    // Handle toggle changes
    bypassToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      bypassLabel.textContent = enabled ? 'ON' : 'OFF';
      updateBypassUI(enabled);

      // Save to storage
      chrome.storage.local.set({ ax_bypass_enabled: enabled });

      // Send message to background script to control bypass
      chrome.runtime.sendMessage({
        type: 'TOGGLE_BYPASS',
        enabled: enabled
      });
    });
  }

  function updateBypassUI(enabled) {
    const container = document.querySelector('.ax-bypass-toggle-container');
    if (container) {
      if (enabled) {
        container.style.borderColor = 'rgba(96, 165, 250, 0.4)';
        container.style.boxShadow = 'var(--glow-blue)';
      } else {
        container.style.borderColor = 'rgba(248, 113, 113, 0.4)';
        container.style.boxShadow = '0 0 20px rgba(248, 113, 113, 0.3)';
      }
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CARD_TRYING' || msg.type === 'CARD_ERROR' || msg.type === 'CARD_HIT' || msg.type === 'STATS_UPDATE') {
      loadData();
    }
  });
})();
