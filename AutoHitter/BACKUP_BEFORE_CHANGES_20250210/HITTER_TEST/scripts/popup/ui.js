// ===================================
// AUTO HITTER UI - Popup
// ===================================

(function () {
  'use strict';

  function parseCards(text) {
    if (!text || !text.trim()) return { valid: false, cards: [] };
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    const cards = [];
    for (const line of lines) {
      const parts = line.trim().split('|');
      const num = (parts[0] || '').replace(/\D/g, '');
      const month = (parts[1] || '12').padStart(2, '0');
      const year = (parts[2] || '28').toString().slice(-2);
      const cvv = parts[3] || '123';
      if (num.length >= 13 && num.length <= 19) {
        cards.push({ number: num, month, year, cvv });
      }
    }
    return { valid: cards.length > 0, cards };
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  const UI = {
    container: null,
    emptyEl: null,
    attemptCount: 0,
    hitsCount: 0,

    init() {
      this.container = document.getElementById('logs-content');
      this.emptyEl = document.getElementById('logs-empty');
      document.getElementById('auto-hit-toggle')?.addEventListener('click', () => this.toggle());
      document.getElementById('clear-logs-btn')?.addEventListener('click', () => this.clear());
      this.load();
      this.listen();
    },

    async load() {
      try {
        const r = await chrome.runtime.sendMessage({ type: 'GET_LOGS' });
        if (r?.logs?.length) {
          this.emptyEl?.classList.add('hidden');
          r.logs.filter((l) => l.subtype).forEach((log) => this.appendLog(log, false));
        }
        if (r?.stats) {
          this.attemptCount = r.stats.tested ?? 0;
          this.hitsCount = r.stats.hits ?? 0;
          this.updateCounts();
        }
      } catch (_) {}
    },

    listen() {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'CARD_TRYING') this.appendTrying(msg.attempt, msg.card);
        else if (msg.type === 'CARD_ERROR') this.appendError(msg.code);
        else if (msg.type === 'CARD_HIT') this.appendHit(msg.card);
        else if (msg.type === 'STATS_UPDATE') {
          this.attemptCount = msg.attempts ?? this.attemptCount;
          this.hitsCount = msg.hits ?? this.hitsCount;
          this.updateCounts();
        }
      });
    },

    appendLog(log, prepend) {
      if (!this.container) return;
      this.emptyEl?.classList.add('hidden');
      let el;
      if (log.subtype === 'trying') el = this.makeTryingEl(log.attempt, log.card);
      else if (log.subtype === 'error') el = this.makeErrorEl(log.code);
      else if (log.subtype === 'hit') el = this.makeHitEl(log.card);
      else return;
      if (prepend) this.container.insertBefore(el, this.container.firstChild);
      else this.container.appendChild(el);
    },

    appendTrying(attempt, card) {
      this.attemptCount++;
      this.updateCounts();
      this.emptyEl?.classList.add('hidden');
      this.container?.insertBefore(this.makeTryingEl(attempt, card), this.container.firstChild);
    },

    appendError(code) {
      this.emptyEl?.classList.add('hidden');
      this.container?.insertBefore(this.makeErrorEl(code), this.container.firstChild);
    },

    appendHit(card) {
      this.hitsCount++;
      this.updateCounts();
      this.emptyEl?.classList.add('hidden');
      this.container?.insertBefore(this.makeHitEl(card), this.container.firstChild);
    },

    makeTryingEl(attempt, cardStr) {
      const el = document.createElement('div');
      el.className = 'log-card-trying';
      el.innerHTML = `<div class="log-card-header"><span class="log-card-attempt">ATTEMPT: ${attempt}</span><button type="button" class="log-card-copy" data-card="${escapeHtml(cardStr)}" title="Copy">📋</button></div><div class="log-card-body"><span class="log-card-emoji">💳</span><span class="log-card-data">${escapeHtml(cardStr || '')}</span></div>`;
      el.querySelector('.log-card-copy')?.addEventListener('click', (e) => { const c = e.currentTarget.getAttribute('data-card'); if (c) navigator.clipboard.writeText(c).catch(() => {}); });
      return el;
    },

    makeErrorEl(code) {
      const el = document.createElement('div');
      el.className = 'log-card-error';
      el.innerHTML = `<span class="log-card-error-icon">!</span><span class="log-card-error-text">${escapeHtml(code || 'unknown')}</span>`;
      return el;
    },

    makeHitEl(cardStr) {
      const el = document.createElement('div');
      el.className = 'log-card-hit';
      el.innerHTML = `<div class="log-card-header"><span class="log-card-hit-label">HIT</span><button type="button" class="log-card-copy" data-card="${escapeHtml(cardStr)}" title="Copy">📋</button></div><div class="log-card-body"><span class="log-card-emoji">💳</span><span class="log-card-data">${escapeHtml(cardStr || '')}</span></div>`;
      el.querySelector('.log-card-copy')?.addEventListener('click', (e) => { const c = e.currentTarget.getAttribute('data-card'); if (c) navigator.clipboard.writeText(c).catch(() => {}); });
      return el;
    },

    updateCounts() {
      const a = document.getElementById('attempts-count');
      const h = document.getElementById('hits-count');
      if (a) a.textContent = this.attemptCount;
      if (h) h.textContent = this.hitsCount;
    },

    async clear() {
      try { await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }); } catch (_) {}
      this.container.innerHTML = '';
      const empty = document.createElement('div');
      empty.id = 'logs-empty';
      empty.className = 'panel-logs-empty';
      empty.textContent = 'Waiting for activity...';
      this.container.appendChild(empty);
      this.emptyEl = empty;
      this.attemptCount = 0;
      this.hitsCount = 0;
      this.updateCounts();
    },

    async toggle() {
      const btn = document.getElementById('auto-hit-toggle');
      const active = btn?.getAttribute('data-active') === 'true';
      if (active) {
        try { await chrome.runtime.sendMessage({ type: 'STOP_AUTO_HIT' }); } catch (_) {}
        btn?.setAttribute('data-active', 'false');
        btn.querySelector('.btn-text').textContent = 'Start Auto Hit';
        return;
      }
      const input = document.getElementById('cc-input');
      const parsed = parseCards(input?.value || '');
      if (!parsed.valid || !parsed.cards.length) {
        alert('Enter valid cards: number|month|year|cvv (one per line)');
        return;
      }
      const cards = parsed.cards.map((c) => `${c.number}|${c.month}|${c.year}|${c.cvv}`);
      try {
        await chrome.runtime.sendMessage({ type: 'START_AUTO_HIT', data: { cards } });
        btn?.setAttribute('data-active', 'true');
        btn.querySelector('.btn-text').textContent = 'Stop Auto Hit';
      } catch (e) {
        alert('Failed to start: ' + (e?.message || 'Unknown error'));
      }
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => UI.init());
  else UI.init();
})();
