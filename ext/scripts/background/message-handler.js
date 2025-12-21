// ===================================
// MESSAGE-HANDLER.JS
// Centralized Message Handling for Background
// Location: scripts/background/message-handler.js
// ===================================

const MessageHandler = {
  // Message handlers registry
  handlers: new Map(),

  /**
   * Initialize message handler
   */
  init() {
    // Register all handlers
    this.registerHandlers();

    // Setup message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async
    });

    console.log('[MessageHandler] Initialized');
  },

  /**
   * Register all message handlers
   */
  registerHandlers() {
    // Auto Hit handlers
    this.register('START_AUTO_HIT', this.handleStartAutoHit.bind(this));
    this.register('STOP_AUTO_HIT', this.handleStopAutoHit.bind(this));
    this.register('GET_AUTO_HIT_STATE', this.handleGetAutoHitState.bind(this));

    // Bypass handlers
    this.register('START_BYPASS', this.handleStartBypass.bind(this));
    this.register('STOP_BYPASS', this.handleStopBypass.bind(this));
    this.register('GET_BYPASS_STATE', this.handleGetBypassState.bind(this));
    this.register('BYPASS_EVENT', this.handleBypassEvent.bind(this));

    // Logging handlers
    this.register('GET_LOGS', this.handleGetLogs.bind(this));
    this.register('ADD_LOG', this.handleAddLog.bind(this));
    this.register('CLEAR_LOGS', this.handleClearLogs.bind(this));

    // Stats handlers
    this.register('GET_STATS', this.handleGetStats.bind(this));
    this.register('UPDATE_STATS', this.handleUpdateStats.bind(this));
    this.register('RESET_STATS', this.handleResetStats.bind(this));

    // Stripe handlers
    this.register('STRIPE_RESPONSE', this.handleStripeResponse.bind(this));
    this.register('user_clicked_submit', this.handleUserClickedSubmit.bind(this));

    // Notification handlers
    this.register('show_notification', this.handleShowNotification.bind(this));

    // Permission handlers
    this.register('CHECK_PERMISSION', this.handleCheckPermission.bind(this));

    // Auth handlers
    this.register('TOKEN_EXPIRED', this.handleTokenExpired.bind(this));
    this.register('FORCE_LOGOUT', this.handleForceLogout.bind(this));

    console.log(`[MessageHandler] Registered ${this.handlers.size} handlers`);
  },

  /**
   * Register a message handler
   */
  register(messageType, handler) {
    this.handlers.set(messageType, handler);
  },

  /**
   * Handle incoming message
   */
  async handleMessage(message, sender, sendResponse) {
    const { type } = message;

    if (!type) {
      sendResponse({ error: 'Message type is required' });
      return;
    }

    const handler = this.handlers.get(type);

    if (!handler) {
      console.warn(`[MessageHandler] No handler for: ${type}`);
      sendResponse({ error: `Unknown message type: ${type}` });
      return;
    }

    try {
      const result = await handler(message, sender);
      sendResponse(result || { success: true });
    } catch (error) {
      console.error(`[MessageHandler] Error handling ${type}:`, error);
      sendResponse({ 
        success: false, 
        error: error.message || 'Handler error' 
      });
    }
  },

  // ==================== AUTO HIT HANDLERS ====================

  async handleStartAutoHit(message, sender) {
    // Delegate to PermissionGate
    return await PermissionGate.checkAndExecute('auto_hit', async () => {
      // Your Auto Hit start logic here
      console.log('[MessageHandler] Starting Auto Hit');
      
      // Notify popup
      this.broadcast({
        type: 'AUTO_HIT_STATE_CHANGED',
        active: true
      });

      return { success: true };
    });
  },

  async handleStopAutoHit(message, sender) {
    console.log('[MessageHandler] Stopping Auto Hit');
    
    // Notify popup
    this.broadcast({
      type: 'AUTO_HIT_STATE_CHANGED',
      active: false
    });

    return { success: true };
  },

  async handleGetAutoHitState(message, sender) {
    // Return current Auto Hit state
    return { 
      active: false, // Replace with actual state
      success: true 
    };
  },

  // ==================== BYPASS HANDLERS ====================

  async handleStartBypass(message, sender) {
    return await PermissionGate.checkAndExecute('bypass', async () => {
      console.log('[MessageHandler] Starting Bypass');
      
      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SET_BYPASS_STATE',
          active: true
        }).catch(() => {});
      }

      // Notify popup
      this.broadcast({
        type: 'BYPASS_STATE_CHANGED',
        active: true
      });

      return { success: true };
    });
  },

  async handleStopBypass(message, sender) {
    console.log('[MessageHandler] Stopping Bypass');
    
    // Notify all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SET_BYPASS_STATE',
        active: false
      }).catch(() => {});
    }

    // Notify popup
    this.broadcast({
      type: 'BYPASS_STATE_CHANGED',
      active: false
    });

    return { success: true };
  },

  async handleGetBypassState(message, sender) {
    return { 
      active: false, // Replace with actual state
      success: true 
    };
  },

  async handleBypassEvent(message, sender) {
    console.log('[MessageHandler] Bypass event:', message.data);
    
    // Log bypass event
    await this.handleAddLog({
      log: {
        type: 'success',
        message: `🔓 CVV Bypass: ${message.data.method}`,
        timestamp: Date.now()
      }
    }, sender);

    return { success: true };
  },

  // ==================== LOGGING HANDLERS ====================

  async handleGetLogs(message, sender) {
    // Return logs from storage
    const result = await chrome.storage.local.get(['logs', 'stats']);
    return {
      logs: result.logs || [],
      stats: result.stats || { hits: 0, tested: 0, declined: 0 },
      success: true
    };
  },

  async handleAddLog(message, sender) {
    const { log } = message;
    
    if (!log) {
      return { success: false, error: 'Log data required' };
    }

    // Get current logs
    const result = await chrome.storage.local.get('logs');
    const logs = result.logs || [];

    // Add new log
    logs.push(log);

    // Keep last 500 logs
    if (logs.length > 500) {
      logs.shift();
    }

    // Save
    await chrome.storage.local.set({ logs });

    // Broadcast to popup
    this.broadcast({
      type: 'LOG_UPDATE',
      logType: log.type,
      message: log.message
    });

    return { success: true };
  },

  async handleClearLogs(message, sender) {
    await chrome.storage.local.set({ logs: [] });
    
    this.broadcast({
      type: 'LOGS_CLEARED'
    });

    return { success: true };
  },

  // ==================== STATS HANDLERS ====================

  async handleGetStats(message, sender) {
    const result = await chrome.storage.local.get('stats');
    return result.stats || { hits: 0, tested: 0, declined: 0 };
  },

  async handleUpdateStats(message, sender) {
    const { stats } = message;
    await chrome.storage.local.set({ stats });
    
    this.broadcast({
      type: 'STATS_UPDATE',
      ...stats
    });

    return { success: true };
  },

  async handleResetStats(message, sender) {
    const resetStats = { hits: 0, tested: 0, declined: 0 };
    await chrome.storage.local.set({ stats: resetStats });
    
    this.broadcast({
      type: 'STATS_UPDATE',
      ...resetStats
    });

    return { success: true };
  },

  // ==================== STRIPE HANDLERS ====================

  async handleStripeResponse(message, sender) {
    const { result } = message;
    
    console.log('[MessageHandler] Stripe response:', result);

    // Log the result
    if (result.success) {
      await this.handleAddLog({
        log: {
          type: 'success',
          message: `✅ ${result.message}`,
          timestamp: Date.now()
        }
      }, sender);
    } else {
      await this.handleAddLog({
        log: {
          type: 'error',
          message: `❌ ${result.message}`,
          timestamp: Date.now()
        }
      }, sender);
    }

    return { success: true };
  },

  async handleUserClickedSubmit(message, sender) {
    console.log('[MessageHandler] User clicked submit button');
    // Store state that user manually clicked
    return { success: true };
  },

  // ==================== NOTIFICATION HANDLERS ====================

  async handleShowNotification(message, sender) {
    const { message: msg, messageType } = message;
    
    // Forward to content script
    if (sender.tab) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'show_notification',
        message: msg,
        messageType: messageType
      }).catch(() => {});
    }

    return { success: true };
  },

  // ==================== PERMISSION HANDLERS ====================

  async handleCheckPermission(message, sender) {
    const { feature } = message;
    const hasPermission = await PermissionGate.check(feature);
    
    return { 
      hasPermission,
      success: true 
    };
  },

  // ==================== AUTH HANDLERS ====================

  async handleTokenExpired(message, sender) {
    console.log('[MessageHandler] Token expired');
    
    // Broadcast to all extension pages
    this.broadcast({
      type: 'FORCE_LOGOUT',
      reason: 'Token expired'
    });

    return { success: true };
  },

  async handleForceLogout(message, sender) {
    console.log('[MessageHandler] Force logout requested');
    
    // Broadcast to all extension pages
    this.broadcast({
      type: 'FORCE_LOGOUT',
      reason: message.reason || 'Forced logout'
    });

    return { success: true };
  },

  // ==================== UTILITY METHODS ====================

  /**
   * Broadcast message to all extension pages (popup, settings, etc.)
   */
  broadcast(message) {
    chrome.runtime.sendMessage(message).catch(() => {
      // Extension context invalidated or no listeners
    });
  },

  /**
   * Send message to specific tab
   */
  sendToTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message).catch(() => {
      // Tab closed or no listener
    });
  },

  /**
   * Send message to all tabs
   */
  async sendToAllTabs(message) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      this.sendToTab(tab.id, message);
    }
  }
};

// Initialize on load
MessageHandler.init();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MessageHandler;
}