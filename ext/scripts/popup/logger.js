// ===================================
// LOGGER.JS
// Live Logs Display System
// Colored logs: YELLOW=trying, RED=error, GREEN=success
// ===================================

const Logger = {
  maxLogs: 100,
  logsContainer: null,

  /**
   * Initialize logger
   */
  init() {
    this.logsContainer = document.getElementById('logs-content');
    if (!this.logsContainer) {
      console.error('Logs container not found');
      return;
    }

    // Load existing logs from background
    this.loadLogs();

    // Listen for real-time log updates
    this.setupMessageListener();
  },

  /**
   * Setup listener for real-time log updates
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, respond) => {
      if (msg.type === 'LOG_UPDATE') {
        this.addLogDirect(msg.logType, msg.message);
      }
    });
  },

  /**
   * Load logs from background script
   */
  loadLogs() {
    chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
      if (response && response.logs) {
        this.renderLogs(response.logs);
      }
    });
  },

  /**
   * Add log directly (from real-time updates)
   */
  addLogDirect(type, message) {
    if (!this.logsContainer) {
      this.init();
    }

    const logEntry = this.createLogEntry(type, message);
    
    // Add to top of logs
    if (this.logsContainer.firstChild) {
      this.logsContainer.insertBefore(logEntry, this.logsContainer.firstChild);
    } else {
      this.logsContainer.appendChild(logEntry);
    }

    // Keep only last maxLogs entries
    while (this.logsContainer.children.length > this.maxLogs) {
      this.logsContainer.removeChild(this.logsContainer.lastChild);
    }

    // Auto-scroll to top
    this.logsContainer.scrollTop = 0;
  },

  /**
   * Add a new log entry
   * @param {string} type - Log type: info, success, error, warning, trying
   * @param {string} message - Log message
   */
  addLog(type, message) {
    // Send to background first
    chrome.runtime.sendMessage({
      type: 'ADD_LOG_ENTRY',
      logType: type,
      message: message
    });
  },

  /**
   * Create log entry element
   * Colors: trying=YELLOW, error=RED, success=GREEN, warning=ORANGE, info=default
   */
  createLogEntry(type, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = Formatters.formatTime();

    const text = document.createElement('span');
    text.className = `log-text log-text-${type}`;
    text.textContent = message;

    // Apply inline styles for guaranteed coloring
    switch(type) {
      case 'trying':
        text.style.color = '#FFD700'; // Yellow
        text.style.fontWeight = 'bold';
        break;
      case 'error':
        text.style.color = '#FF4444'; // Red
        text.style.fontWeight = 'bold';
        break;
      case 'success':
        text.style.color = '#00FF88'; // Green
        text.style.fontWeight = 'bold';
        break;
      case 'warning':
        text.style.color = '#FFA500'; // Orange
        break;
      default:
        text.style.color = '#AAAAAA'; // Gray/default
    }

    entry.appendChild(time);
    entry.appendChild(text);

    return entry;
  },

  /**
   * Render multiple logs
   */
  renderLogs(logs) {
    if (!this.logsContainer) return;

    this.logsContainer.innerHTML = '';

    if (!logs || logs.length === 0) {
      this.addLogDirect('info', 'System ready. Waiting for action...');
      return;
    }

    // Show last 100 logs in reverse order (newest first)
    const recentLogs = logs.slice(-this.maxLogs).reverse();
    
    recentLogs.forEach(log => {
      const entry = this.createLogEntry(log.type, log.message);
      this.logsContainer.appendChild(entry);
    });
  },

  /**
   * Clear all logs
   */
  clearLogs() {
    if (!this.logsContainer) return;

    // Clear display
    this.logsContainer.innerHTML = '';
    
    // Add default message
    this.addLogDirect('info', 'Logs cleared. System ready...');

    // Clear from background
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
  },

  /**
   * Log card attempt - YELLOW
   */
  logCardAttempt(card) {
    this.addLog('trying', `Trying Card :- ${card}`);
  },

  /**
   * Log response
   */
  logResponse(responseCode, isSuccess = false) {
    const message = `Response: ${Formatters.formatResponseCode(responseCode)}`;
    const type = isSuccess ? 'success' : 'error';
    this.addLog(type, message);
  },

  /**
   * Log hit detection - GREEN
   */
  logHit(cardMasked) {
    this.addLog('success', `🎉 HIT DETECTED: ${cardMasked}`);
  },

  /**
   * Log decline - RED
   */
  logDecline(cardMasked, reason) {
    this.addLog('error', `❌ Declined: ${reason}`);
  },

  /**
   * Log error - RED
   */
  logError(error) {
    this.addLog('error', `❌ Error: ${error}`);
  },

  /**
   * Log info
   */
  logInfo(message) {
    this.addLog('info', message);
  },

  /**
   * Log warning
   */
  logWarning(message) {
    this.addLog('warning', `⚠️ ${message}`);
  },

  /**
   * Log bypass event
   */
  logBypass(url) {
    this.addLog('success', `🔓 Bypass Active`);
  },

  /**
   * Log Stripe detection
   */
  logStripeDetection(url) {
    this.addLog('info', `🎯 Stripe checkout detected`);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Logger.init());
} else {
  Logger.init();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}
