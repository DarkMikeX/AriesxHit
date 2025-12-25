// ===================================
// LOGGER.JS
// ONLY shows: Trying Card + Response
// Colors: YELLOW=trying, RED=error, GREEN=success
// ===================================

const Logger = {
  maxLogs: 100,
  logsContainer: null,

  init() {
    this.logsContainer = document.getElementById('logs-content');
    if (!this.logsContainer) return;

    this.loadLogs();
    this.setupMessageListener();
  },

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'LOG_UPDATE') {
        // ONLY show trying, error, success logs in main display
        if (['trying', 'error', 'success'].includes(msg.logType)) {
          this.addLogDirect(msg.logType, msg.message);
        }
      }
    });
  },

  /**
   * Public method to add logs (called from popup.js and other scripts)
   * @param {string} type - Log type: 'info', 'trying', 'error', 'success', 'warning'
   * @param {string} message - Log message
   */
  addLog(type, message) {
    // Send to background script for storage
    chrome.runtime.sendMessage({ 
      type: 'ADD_LOG', 
      logType: type, 
      message: message 
    }).catch(() => {});
    
    // For card-related logs (trying, error, success), also display directly
    if (['trying', 'error', 'success'].includes(type)) {
      this.addLogDirect(type, message);
    }
    
    // For info/warning logs, log to console for debugging
    if (type === 'info') {
      console.log('[AriesxHit]', message);
    } else if (type === 'warning') {
      console.warn('[AriesxHit]', message);
    }
  },

  loadLogs() {
    chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
      if (response?.logs) {
        // Filter to only show trying, error, success
        const filtered = response.logs.filter(l => 
          ['trying', 'error', 'success'].includes(l.type)
        );
        this.renderLogs(filtered);
      }
    });
  },

  addLogDirect(type, message) {
    if (!this.logsContainer) return;

    const entry = this.createLogEntry(type, message);
    
    if (this.logsContainer.firstChild) {
      this.logsContainer.insertBefore(entry, this.logsContainer.firstChild);
    } else {
      this.logsContainer.appendChild(entry);
    }

    while (this.logsContainer.children.length > this.maxLogs) {
      this.logsContainer.removeChild(this.logsContainer.lastChild);
    }

    this.logsContainer.scrollTop = 0;
  },

  createLogEntry(type, message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.cssText = 'padding: 4px 0; display: flex; gap: 8px; border-left: 3px solid; padding-left: 8px; margin: 2px 0;';

    // Time
    const time = document.createElement('span');
    time.className = 'log-time';
    time.style.cssText = 'color: #707070; flex-shrink: 0; font-size: 11px;';
    const now = new Date();
    time.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;

    // Text
    const text = document.createElement('span');
    text.className = 'log-text';
    text.textContent = message;

    // Apply colors
    switch(type) {
      case 'trying':
        text.style.cssText = 'color: #FFD700; font-weight: bold;'; // YELLOW
        entry.style.borderColor = '#FFD700';
        break;
      case 'error':
        text.style.cssText = 'color: #FF4444; font-weight: bold;'; // RED
        entry.style.borderColor = '#FF4444';
        break;
      case 'success':
        text.style.cssText = 'color: #00FF88; font-weight: bold;'; // GREEN
        entry.style.borderColor = '#00FF88';
        break;
    }

    entry.appendChild(time);
    entry.appendChild(text);
    return entry;
  },

  renderLogs(logs) {
    if (!this.logsContainer) return;
    this.logsContainer.innerHTML = '';

    if (!logs || logs.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: #707070; text-align: center; padding: 20px;';
      empty.textContent = 'Waiting for cards...';
      this.logsContainer.appendChild(empty);
      return;
    }

    logs.slice(-this.maxLogs).reverse().forEach(log => {
      const entry = this.createLogEntry(log.type, log.message);
      this.logsContainer.appendChild(entry);
    });
  },

  clearLogs() {
    if (!this.logsContainer) return;
    
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, (response) => {
      if (response && response.success) {
        this.logsContainer.innerHTML = '';
        const empty = document.createElement('div');
        empty.style.cssText = 'color: #707070; text-align: center; padding: 20px;';
        empty.textContent = 'Logs cleared. Waiting for cards...';
        this.logsContainer.appendChild(empty);
      }
    });
  }
};

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Logger.init());
} else {
  Logger.init();
}
