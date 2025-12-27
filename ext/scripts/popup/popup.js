// ===================================
// POPUP.JS
// Main Popup Window Logic
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check authentication
    const isAuth = await Storage.isAuthenticated();
    if (!isAuth) {
      // Not logged in, redirect to login
      window.location.href = 'login.html';
      return;
    }

    // Get user data and permissions
    const userData = await Storage.getUserData();
    const permissions = await Storage.getPermissions();

    if (!userData || !permissions) {
      // Invalid session, redirect to login
      await Storage.clearAuth();
      window.location.href = 'login.html';
      return;
    }

    // Initialize UI
    initializeUI(userData, permissions);

    // Load wallpaper settings
    await loadWallpaper();

    // Load saved inputs
    await loadSavedInputs();

    // Set up event listeners
    setupEventListeners(permissions);

    // Update status bar
    updateStatusBar(userData);
  } catch (error) {
    console.error('[Popup] Initialization error:', error);
    // Redirect to login on error
    window.location.href = 'login.html';
  }
});

/**
 * Initialize UI with user data
 */
function initializeUI(userData, permissions) {
  // Update username in status bar
  const usernameStatus = document.getElementById('username-status');
  if (usernameStatus) {
    usernameStatus.textContent = userData.username || 'User';
  }

  // Check toggle permissions and update UI
  const autoHitToggle = document.getElementById('auto-hit-toggle');
  const bypassToggle = document.getElementById('bypass-toggle');

  if (!permissions.auto_hit) {
    autoHitToggle.classList.add('disabled');
    autoHitToggle.title = 'Permission Required';
  }

  if (!permissions.bypass) {
    bypassToggle.classList.add('disabled');
    bypassToggle.title = 'Permission Required';
  }

  // Log system ready
  Logger.addLog('info', 'System ready. Waiting for action...');
}

/**
 * Load wallpaper settings
 */
async function loadWallpaper() {
  try {
    const wallpaperSettings = await Storage.getWallpaper();
    
    if (wallpaperSettings && typeof WallpaperManager !== 'undefined') {
      WallpaperManager.applyWallpaper(wallpaperSettings);
    } else if (typeof WallpaperManager !== 'undefined') {
      // Apply default
      WallpaperManager.applyDefault();
    }
  } catch (error) {
    console.error('[Popup] Error loading wallpaper:', error);
  }
}

/**
 * Load saved inputs (BIN, Proxy, CC)
 */
async function loadSavedInputs() {
  try {
    const savedInputs = await Storage.getInputs();
    
    if (savedInputs) {
      const binInput = document.getElementById('bin-input');
      const proxyInput = document.getElementById('proxy-input');
      const ccInput = document.getElementById('cc-input');

      if (binInput && savedInputs.bin) {
        binInput.value = savedInputs.bin;
      }

      if (proxyInput && savedInputs.proxy) {
        proxyInput.value = savedInputs.proxy;
      }

      if (ccInput && savedInputs.cards) {
        ccInput.value = savedInputs.cards;
      }
    }
  } catch (error) {
    console.error('[Popup] Error loading saved inputs:', error);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners(permissions) {
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.location.href = 'settings.html';
    });
  }

  // Clear logs button
  const clearLogsBtn = document.getElementById('clear-logs-btn');
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (Logger && Logger.clearLogs) {
        Logger.clearLogs();
      }
    });
  }

  // Auto Hit Toggle
  const autoHitToggle = document.getElementById('auto-hit-toggle');
  if (autoHitToggle) {
    autoHitToggle.addEventListener('click', () => {
      if (!permissions.auto_hit) {
        showToast('⛔ Access Denied: Auto Hit permission required', 'error');
        return;
      }
      toggleAutoHit();
    });
  }

  // Bypass Toggle
  const bypassToggle = document.getElementById('bypass-toggle');
  if (bypassToggle) {
    bypassToggle.addEventListener('click', () => {
      if (!permissions.bypass) {
        showToast('⛔ Access Denied: Bypass permission required', 'error');
        return;
      }
      toggleBypass();
    });
  }

  // Input change listeners - save inputs
  const binInput = document.getElementById('bin-input');
  const proxyInput = document.getElementById('proxy-input');
  const ccInput = document.getElementById('cc-input');

  if (binInput) {
    binInput.addEventListener('change', saveInputs);
  }
  if (proxyInput) {
    proxyInput.addEventListener('change', saveInputs);
  }
  if (ccInput) {
    ccInput.addEventListener('change', saveInputs);
  }
}

/**
 * Toggle Auto Hit
 */
function toggleAutoHit() {
  const toggle = document.getElementById('auto-hit-toggle');
  if (!toggle) {
    console.error('[Popup] Auto Hit toggle not found');
    return;
  }
  const isActive = toggle.getAttribute('data-active') === 'true';

  if (isActive) {
    // Stop Auto Hit
    stopAutoHit();
  } else {
    // Start Auto Hit
    startAutoHit();
  }
}

/**
 * Start Auto Hit
 */
async function startAutoHit() {
  const toggle = document.getElementById('auto-hit-toggle');
  if (!toggle) {
    console.error('[Popup] Auto Hit toggle not found');
    return;
  }
  
  // Validate inputs
  const validation = validateInputs();
  if (!validation.valid) {
    showToast('⚠️ ' + validation.error, 'error');
    return;
  }

  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'START_AUTO_HIT',
    data: {
      bin: validation.data.bin,
      proxy: validation.data.proxy,
      cards: validation.data.cards
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error sending message:', chrome.runtime.lastError);
      Logger.addLog('error', 'Failed to communicate with background script');
      showToast('❌ Communication error', 'error');
      return;
    }
    
    if (response && response.success) {
      if (toggle) {
        toggle.setAttribute('data-active', 'true');
      }
      updateModeStatus('Auto Hit Active');
      Logger.addLog('success', 'Auto Hit started');
      showToast('✅ Auto Hit Started', 'success');
    } else {
      const error = response?.error || 'Failed to start Auto Hit';
      Logger.addLog('error', error);
      showToast('❌ ' + error, 'error');
    }
  });
}

/**
 * Stop Auto Hit
 */
function stopAutoHit() {
  const toggle = document.getElementById('auto-hit-toggle');

  chrome.runtime.sendMessage({
    type: 'STOP_AUTO_HIT'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error sending message:', chrome.runtime.lastError);
      return;
    }
    
    if (toggle) {
      toggle.setAttribute('data-active', 'false');
    }
    updateModeStatus('Idle');
    Logger.addLog('info', 'Auto Hit stopped');
    showToast('🛑 Auto Hit Stopped', 'info');
  });
}

/**
 * Toggle Bypass
 */
function toggleBypass() {
  const toggle = document.getElementById('bypass-toggle');
  if (!toggle) {
    console.error('[Popup] Bypass toggle not found');
    return;
  }
  const isActive = toggle.getAttribute('data-active') === 'true';

  if (isActive) {
    // Stop Bypass
    stopBypass();
  } else {
    // Start Bypass
    startBypass();
  }
}

/**
 * Start Bypass (CVV Bypass)
 */
function startBypass() {
  const toggle = document.getElementById('bypass-toggle');
  
  // Get BIN list from input
  const binInput = document.getElementById('bin-input');
  const binText = binInput ? binInput.value.trim() : '';
  const bins = binText 
    ? binText.split('\n').map(b => b.trim()).filter(b => {
        const cleaned = b.split('|')[0].replace(/[^0-9xX]/g, '');
        return cleaned.length >= 6;
      })
    : [];

  chrome.runtime.sendMessage({
    type: 'START_BYPASS',
    data: {
      bins: bins
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error sending message:', chrome.runtime.lastError);
      Logger.addLog('error', 'Failed to communicate with background script');
      showToast('❌ Communication error', 'error');
      return;
    }
    
    if (response && response.success) {
      if (toggle) {
        toggle.setAttribute('data-active', 'true');
      }
      Logger.addLog('success', 'Bypass mode enabled');
      showToast('✅ Bypass Enabled (CVV Removal)', 'success');
    } else {
      const error = response?.error || 'Failed to start Bypass';
      Logger.addLog('error', error);
      showToast('❌ ' + error, 'error');
    }
  });
}

/**
 * Stop Bypass
 */
function stopBypass() {
  const toggle = document.getElementById('bypass-toggle');

  chrome.runtime.sendMessage({
    type: 'STOP_BYPASS'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error sending message:', chrome.runtime.lastError);
      return;
    }
    
    if (toggle) {
      toggle.setAttribute('data-active', 'false');
    }
    Logger.addLog('info', 'Bypass mode disabled');
    showToast('🛑 Bypass Disabled', 'info');
  });
}

/**
 * Validate inputs
 */
function validateInputs() {
  const binInput = document.getElementById('bin-input');
  const proxyInput = document.getElementById('proxy-input');
  const ccInput = document.getElementById('cc-input');

  const bin = binInput ? binInput.value.trim() : '';
  const proxy = proxyInput ? proxyInput.value.trim() : '';
  const cards = ccInput ? ccInput.value.trim() : '';

  // Must have either BIN or cards
  if (!bin && !cards) {
    return { valid: false, error: 'Please enter BIN or card list' };
  }

  // Cannot have both
  if (bin && cards) {
    return { valid: false, error: 'Please use either BIN or card list, not both' };
  }

  let validatedData = {};

  // Validate BIN if provided
  if (bin) {
    const binValidation = Validators.validateBIN(bin);
    if (!binValidation.valid) {
      return { valid: false, error: binValidation.error };
    }
    validatedData.bin = binValidation.bin;
  }

  // Validate cards if provided
  if (cards) {
    const cardsValidation = Validators.validateCards(cards);
    if (!cardsValidation.valid) {
      return { valid: false, error: cardsValidation.errors[0] };
    }
    validatedData.cards = cardsValidation.cards;
  }

  // Validate proxy if provided
  if (proxy) {
    const proxyValidation = Validators.validateProxy(proxy);
    if (!proxyValidation.valid) {
      return { valid: false, error: proxyValidation.error };
    }
    validatedData.proxy = proxyValidation.parsed;
  }

  return { valid: true, data: validatedData };
}

/**
 * Save inputs to storage
 */
async function saveInputs() {
  const binInput = document.getElementById('bin-input');
  const proxyInput = document.getElementById('proxy-input');
  const ccInput = document.getElementById('cc-input');

  await Storage.setInputs({
    bin: binInput ? binInput.value.trim() : '',
    proxy: proxyInput ? proxyInput.value.trim() : '',
    cards: ccInput ? ccInput.value.trim() : ''
  });
}

/**
 * Update status bar
 */
function updateStatusBar(userData) {
  const usernameStatus = document.getElementById('username-status');
  const hitsCount = document.getElementById('hits-count');

  if (usernameStatus) {
    usernameStatus.textContent = userData.username || 'User';
  }

  // Get hits from storage or background
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error getting stats:', chrome.runtime.lastError);
      return;
    }
    
    if (response && hitsCount) {
      hitsCount.textContent = response.hits || 0;
    }
  });
}

/**
 * Update mode status
 */
function updateModeStatus(mode) {
  const modeStatus = document.getElementById('mode-status');
  if (modeStatus) {
    modeStatus.textContent = mode;
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#00ff88' : '#00d9ff'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOG_UPDATE') {
    Logger.addLog(message.logType, message.message);
  }

  if (message.type === 'STATS_UPDATE') {
    const hitsCount = document.getElementById('hits-count');
    if (hitsCount) {
      hitsCount.textContent = message.hits || 0;
    }
  }

  if (message.type === 'MODE_UPDATE') {
    updateModeStatus(message.mode);
  }
});