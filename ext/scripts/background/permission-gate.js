// ===================================
// PERMISSION-GATE.JS
// Permission Validation & Access Control
// Location: scripts/background/permission-gate.js
// ===================================

const PermissionGate = {
  // Cache permissions for faster access
  permissionsCache: null,
  cacheExpiry: null,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  /**
   * Check if user has specific permission
   */
  async check(feature) {
    try {
      const permissions = await this.getPermissions();

      if (!permissions) {
        console.warn('[PermissionGate] No permissions found');
        return false;
      }

      const hasPermission = permissions[feature] === true;

      console.log(`[PermissionGate] Check ${feature}:`, hasPermission);

      return hasPermission;

    } catch (error) {
      console.error('[PermissionGate] Check error:', error);
      return false;
    }
  },

  /**
   * Get user permissions from storage
   */
  async getPermissions() {
    // Check cache first
    if (this.permissionsCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.permissionsCache;
    }

    // Get from storage
    const result = await chrome.storage.local.get('permissions');
    
    if (!result || !result.permissions) {
      return null;
    }

    // Cache it
    this.permissionsCache = result.permissions;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;

    return result.permissions;
  },

  /**
   * Refresh permissions from backend (optional)
   */
  async refresh() {
    try {
      // Clear cache
      this.clearCache();

      // Fetch fresh permissions from backend if available
      // const userData = await APIClient.getUserData();
      // if (userData && userData.permissions) {
      //   await chrome.storage.local.set({ permissions: userData.permissions });
      //   this.permissionsCache = userData.permissions;
      // }

      console.log('[PermissionGate] Permissions refreshed');
      return await this.getPermissions();

    } catch (error) {
      console.error('[PermissionGate] Refresh error:', error);
      return null;
    }
  },

  /**
   * Clear permissions cache
   */
  clearCache() {
    this.permissionsCache = null;
    this.cacheExpiry = null;
  },

  /**
   * Check permission and execute function if allowed
   */
  async checkAndExecute(feature, fn) {
    const hasPermission = await this.check(feature);

    if (!hasPermission) {
      console.warn(`[PermissionGate] Access denied for: ${feature}`);
      
      return {
        success: false,
        error: 'NO_PERMISSION',
        message: `You don't have permission to use ${feature}`
      };
    }

    try {
      const result = await fn();
      return result || { success: true };
    } catch (error) {
      console.error(`[PermissionGate] Execution error for ${feature}:`, error);
      
      return {
        success: false,
        error: 'EXECUTION_ERROR',
        message: error.message
      };
    }
  },

  /**
   * Get all user permissions
   */
  async getAll() {
    return await this.getPermissions();
  },

  /**
   * Check multiple permissions at once
   */
  async checkMultiple(features) {
    const permissions = await this.getPermissions();
    
    if (!permissions) {
      return features.reduce((acc, feature) => {
        acc[feature] = false;
        return acc;
      }, {});
    }

    return features.reduce((acc, feature) => {
      acc[feature] = permissions[feature] === true;
      return acc;
    }, {});
  },

  /**
   * Verify user has ANY of the specified permissions
   */
  async hasAny(features) {
    const permissions = await this.getPermissions();
    
    if (!permissions) {
      return false;
    }

    return features.some(feature => permissions[feature] === true);
  },

  /**
   * Verify user has ALL of the specified permissions
   */
  async hasAll(features) {
    const permissions = await this.getPermissions();
    
    if (!permissions) {
      return false;
    }

    return features.every(feature => permissions[feature] === true);
  },

  /**
   * Get user's permission level/role
   */
  async getPermissionLevel() {
    const permissions = await this.getPermissions();
    
    if (!permissions) {
      return 'none';
    }

    // Check permission combinations
    const hasAutoHit = permissions.auto_hit === true;
    const hasBypass = permissions.bypass === true;

    if (hasAutoHit && hasBypass) {
      return 'full';
    } else if (hasAutoHit || hasBypass) {
      return 'partial';
    } else {
      return 'restricted';
    }
  },

  /**
   * Validate user status
   */
  async validateUserStatus() {
    try {
      const result = await chrome.storage.local.get('user_data');
      
      if (!result || !result.user_data) {
        return {
          valid: false,
          reason: 'NO_USER_DATA'
        };
      }

      const userData = result.user_data;

      // Check account status
      if (userData.status === 'blocked') {
        return {
          valid: false,
          reason: 'ACCOUNT_BLOCKED',
          message: 'Your account has been blocked'
        };
      }

      if (userData.status === 'pending') {
        return {
          valid: false,
          reason: 'ACCOUNT_PENDING',
          message: 'Your account is pending approval'
        };
      }

      if (userData.status !== 'active') {
        return {
          valid: false,
          reason: 'ACCOUNT_INACTIVE',
          message: 'Your account is not active'
        };
      }

      return {
        valid: true,
        userData: userData
      };

    } catch (error) {
      console.error('[PermissionGate] Validation error:', error);
      return {
        valid: false,
        reason: 'VALIDATION_ERROR',
        error: error.message
      };
    }
  },

  /**
   * Full permission check with user status validation
   */
  async fullCheck(feature) {
    // First validate user status
    const statusCheck = await this.validateUserStatus();
    
    if (!statusCheck.valid) {
      return {
        allowed: false,
        reason: statusCheck.reason,
        message: statusCheck.message
      };
    }

    // Then check specific permission
    const hasPermission = await this.check(feature);

    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'NO_PERMISSION',
        message: `You don't have permission to use ${feature}`
      };
    }

    return {
      allowed: true,
      userData: statusCheck.userData
    };
  },

  /**
   * Request permission from admin (placeholder for future implementation)
   */
  async requestPermission(feature, reason) {
    console.log(`[PermissionGate] Permission request: ${feature}`, reason);
    
    // This would send request to backend
    // For now, just log it
    
    return {
      success: true,
      message: 'Permission request sent to administrator',
      pending: true
    };
  },

  /**
   * Get permission details
   */
  async getDetails() {
    const permissions = await this.getPermissions();
    const level = await this.getPermissionLevel();
    const status = await this.validateUserStatus();

    return {
      permissions: permissions,
      level: level,
      status: status,
      features: {
        auto_hit: permissions?.auto_hit || false,
        bypass: permissions?.bypass || false,
        wallpaper: true, // Always available
        settings: true   // Always available
      }
    };
  },

  /**
   * Listen for permission updates
   */
  setupPermissionListener() {
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.permissions) {
        console.log('[PermissionGate] Permissions updated');
        this.clearCache();
        
        // Broadcast permission change
        chrome.runtime.sendMessage({
          type: 'PERMISSIONS_UPDATED',
          permissions: changes.permissions.newValue
        }).catch(() => {});
      }
    });
  },

  /**
   * Initialize permission gate
   */
  init() {
    this.setupPermissionListener();
    console.log('[PermissionGate] Initialized');
  }
};

// Initialize on load
PermissionGate.init();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PermissionGate;
}