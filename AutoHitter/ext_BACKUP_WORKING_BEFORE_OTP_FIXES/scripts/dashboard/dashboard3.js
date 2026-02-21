// AriesxHit Dashboard 3 - Layout / ariesxhitter style
(function () {
  'use strict';

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
    const overlay = document.getElementById('ax3-login-overlay');
    const app = document.getElementById('ax3-app');
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
      if (s.ax_selected_dashboard !== '3') {
        chrome.storage.local.set({ ax_selected_dashboard: '3' }, () => {});
      }
      overlay.style.display = 'none';
      app.style.display = 'flex';
      loadData();
    });
  }

  function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('ax3-clock-time');
    const dateEl = document.getElementById('ax3-clock-date');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function maskCard(card) {
    if (!card || card.includes('*')) return card || '****';
    const v = card.slice(0, 4) + card.slice(-4);
    return v.slice(0, 4) + '••••••••' + v.slice(-4);
  }

  function formatDistanceToNow(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + ' min ago';
    const h = Math.floor(min / 60);
    if (h < 24) return h + ' hour' + (h > 1 ? 's' : '') + ' ago';
    const d = Math.floor(h / 24);
    return d + ' day' + (d > 1 ? 's' : '') + ' ago';
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
      const dotEl = document.getElementById('ax3-status-dot');
      const statusEl = document.getElementById('ax3-status-text');
      const activeEl = document.getElementById('ax3-active');
      if (dotEl) {
        dotEl.className = 'ax3-status-dot' + (active ? ' pulse-glow' : ' paused');
      }
      if (statusEl) statusEl.textContent = active ? 'Active' : 'Paused';
      if (activeEl) {
        activeEl.textContent = active ? 'Active' : 'Paused';
        activeEl.className = 'ax3-status-val ' + (active ? 'green' : 'red');
      }
      chrome.storage.local.get(['savedBins', 'savedCards', 'ax_mode', 'ax_proxy', 'ax_fill_email', 'ax_proxy_enabled'], (s) => {
        const binEl = document.getElementById('ax3-bin');
        const ccEl = document.getElementById('ax3-cc');
        const proxyEl = document.getElementById('ax3-proxy');
        const emailEl = document.getElementById('ax3-email');
        const modeEl = document.getElementById('ax3-mode');
        if (modeEl) modeEl.textContent = (s.ax_mode || 'BIN').toUpperCase();
        if (binEl) binEl.textContent = active && binList.length ? binList[0] : (s.savedBins?.length ? s.savedBins[0] : '--');
        const cardCount = active && cardList.length ? cardList.length : ((s.savedCards || '').trim().split(/\r?\n/).filter(Boolean).length);
        if (ccEl) ccEl.textContent = cardCount ? cardCount + ' cards' : '--';
        if (proxyEl) {
          const raw = (s.ax_proxy || '').trim();
          const enabled = s.ax_proxy_enabled === true;
          const count = raw ? raw.split(/\r?\n/).filter(Boolean).length : 0;
          proxyEl.textContent = count ? (enabled ? count + ' proxy ON' : count + ' proxy') : '--';
        }
        if (emailEl) emailEl.textContent = (s.ax_fill_email || '').trim() || '--';
      });
    });
    chrome.storage.local.get(['ax_last_hit', 'ax_tg_id'], (s) => {
      const lastEl = document.getElementById('ax3-last-hit');
      const tgEl = document.getElementById('ax3-tg');
      const tgTextEl = document.getElementById('ax3-tg-text');
      if (lastEl) lastEl.textContent = s.ax_last_hit || '--';
      if (tgEl) {
        tgEl.textContent = s.ax_tg_id ? 'Connected' : 'Disconnected';
        tgEl.className = 'ax3-status-val ' + (s.ax_tg_id ? 'green' : 'red');
      }
      if (tgTextEl) tgTextEl.textContent = s.ax_tg_id ? 'Connected' : 'Disconnected';
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderLogs(logs) {
    const el = document.getElementById('ax3-logs');
    const countEl = document.getElementById('ax3-logs-count');
    if (!el) return;
    const entries = logs.filter((l) => l.type === 'log').slice(-50).reverse();
    if (countEl) countEl.textContent = entries.length + ' entries';
    if (!entries.length) {
      el.innerHTML = '<div class="ax3-empty-logs"><div class="icon">◉</div><p>No logs yet. Waiting for transactions...</p></div>';
      return;
    }
    el.innerHTML = entries.map((e) => {
      const status = e.subtype === 'hit' ? 'success' : e.subtype === 'error' ? 'error' : 'info';
      const cardStr = e.card || '';
      const masked = maskCard(cardStr);
      let msg = '';
      if (e.subtype === 'trying') msg = 'Trying card';
      else if (e.subtype === 'hit') msg = 'Payment completed';
      else if (e.subtype === 'error') msg = (e.decline_code || e.code || 'declined') + ' - decline';
      const ts = e.ts || Date.now();
      const timeStr = formatDistanceToNow(ts);
      return `<div class="ax3-log-entry fade-in-up"><div style="flex:1;min-width:0;"><div class="ax3-log-card">${escapeHtml(masked)}</div><div class="ax3-log-msg">${escapeHtml(msg)}</div></div><div class="ax3-log-right"><span class="ax3-log-badge ${status}">${status}</span><span class="ax3-log-time">${escapeHtml(timeStr)}</span></div></div>`;
    }).join('');
  }

  function renderStats(stats) {
    const hits = Number(stats.hits) || 0;
    const tested = Math.max(Number(stats.tested) || 0, hits);
    const declined = Number(stats.declined) || 0;
    const rate = tested > 0 ? ((hits / tested) * 100) : 0;
    const ratePct = rate.toFixed(1);
    const hitsEl = document.getElementById('ax3-stat-hits');
    const declinesEl = document.getElementById('ax3-stat-declines');
    const attemptsEl = document.getElementById('ax3-stat-attempts');
    const rateEl = document.getElementById('ax3-stat-rate');
    const fillEl = document.getElementById('ax3-rate-fill');
    const pieEl = document.getElementById('ax3-mini-pie');
    if (hitsEl) hitsEl.textContent = hits;
    if (declinesEl) declinesEl.textContent = declined;
    if (attemptsEl) attemptsEl.textContent = tested;
    if (rateEl) rateEl.textContent = ratePct + '%';
    if (fillEl) fillEl.style.width = ratePct + '%';
    if (pieEl) {
      pieEl.style.setProperty('--pie-success', rate + '%');
      pieEl.style.background = 'conic-gradient(#10b981 0% ' + rate + '%, #ef4444 ' + rate + '% 100%)';
    }
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
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 24px;background:rgba(0,0,0,0.9);color:#fff;border-radius:10px;font-size:14px;z-index:9999;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
  }

  document.getElementById('ax3-change-dash')?.addEventListener('click', () => {
    chrome.storage.local.set({ ax_selected_dashboard: '' }, () => {
      window.location.href = chrome.runtime.getURL('dashboard.html');
    });
  });

  document.getElementById('ax3-logout')?.addEventListener('click', () => {
    chrome.storage.local.set({ ax_logged_in: false, ax_tg_id: '', ax_login_time: 0 }, () => {
      window.location.href = chrome.runtime.getURL('dashboard.html');
    });
  });

  let ax3Modals;
  document.getElementById('ax3-settings')?.addEventListener('click', (e) => {
    const menu = document.getElementById('ax-config-menu');
    if (menu) menu.classList.toggle('open');
    e.stopPropagation();
  });
  document.addEventListener('click', () => document.getElementById('ax-config-menu')?.classList.remove('open'));
  document.getElementById('ax-config-menu')?.addEventListener('click', (e) => e.stopPropagation());

  if (typeof initClassicModals === 'function') {
    ax3Modals = initClassicModals({
      onLoadData: loadData,
      onRefreshForms: (refresh) => { if (refresh) refresh(); }
    });
  }
  document.querySelectorAll('.ax3-config-nav').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modal || 'bin';
      if (ax3Modals && ax3Modals.openModal) ax3Modals.openModal(id);
    });
  });

  document.getElementById('ax3-clear-logs')?.addEventListener('click', () => {
    send('CLEAR_LOGS_ONLY').then(() => { loadData(); showToast('Logs cleared'); });
  });

  document.getElementById('ax3-reset-stats')?.addEventListener('click', () => {
    send('CLEAR_LOGS').then(() => { loadData(); showToast('Stats reset'); });
  });

  document.getElementById('ax3-copy-logs')?.addEventListener('click', () => {
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

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CARD_TRYING' || msg.type === 'CARD_ERROR' || msg.type === 'CARD_HIT' || msg.type === 'STATS_UPDATE') {
      loadData();
    }
  });
})();
