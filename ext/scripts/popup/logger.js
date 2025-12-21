// ===================================
// LOGGER.JS
// Live Logs Display System
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
   * Add a new log entry
   * @param {string} type - Log type: info, success, error, warning
   * @param {string} message - Log message
   */
  addLog(type, message) {
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

    // Send to background for storage
    chrome.runtime.sendMessage({
      type: 'ADD_LOG',
      log: { type, message, timestamp: Date.now() }
    });
  },

  /**
   * Create log entry element
   */
  createLogEntry(type, message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = Formatters.formatTime();

    const text = document.createElement('span');
    text.className = `log-text ${type === 'success' ? 'hit-detected' : type}`;
    text.textContent = message;

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
      this.addLog('info', 'System ready. Waiting for action...');
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
    this.addLog('info', 'Logs cleared. System ready...');

    // Clear from background
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
  },

  /**
   * Log card attempt
   */
  logCardAttempt(cardMasked) {
    this.addLog('info', `Trying: ${cardMasked}`);
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
   * Log hit detection
   */
  logHit(cardMasked) {
    this.addLog('success', `✨ Hit Detected: ${cardMasked}`);
  },

  /**
   * Log decline
   */
  logDecline(cardMasked, reason) {
    this.addLog('error', `Declined: ${cardMasked} - ${reason}`);
  },

  /**
   * Log error
   */
  logError(error) {
    this.addLog('error', `Error: ${error}`);
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
    this.addLog('success', `🔓 Bypass: CVV removed from request`);
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