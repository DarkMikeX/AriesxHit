// ===================================
// PROFILE.JS
// User Profile Display & Management
// Location: scripts/settings/profile.js
// ===================================

const Profile = {
  userData: null,
  permissions: null,

  /**
   * Initialize profile display
   */
  async init() {
    await this.loadUserData();
    this.render();
    this.setupEventListeners();
  },

  /**
   * Load user data from storage
   */
  async loadUserData() {
    try {
      this.userData = await Storage.getUserData();
      this.permissions = await Storage.getPermissions();

      console.log('[Profile] User data loaded:', this.userData);
    } catch (error) {
      console.error('[Profile] Error loading user data:', error);
    }
  },

  /**
   * Render profile information
   */
  render() {
    this.renderUsername();
    this.renderStatus();
    this.renderPermissions();
    this.renderStats();
  },

  /**
   * Render username
   */
  renderUsername() {
    const usernameDisplay = document.getElementById('username-display');
    if (!usernameDisplay) return;

    if (this.userData && this.userData.username) {
      usernameDisplay.textContent = this.userData.username;
    } else {
      usernameDisplay.textContent = 'Guest';
    }
  },

  /**
   * Render account status
   */
  renderStatus() {
    const statusDisplay = document.getElementById('status-display');
    if (!statusDisplay) return;

    if (!this.userData || !this.userData.status) {
      statusDisplay.innerHTML = '<span class="status-dot"></span> Unknown';
      statusDisplay.className = 'profile-value status-badge';
      return;
    }

    const status = this.userData.status;
    const statusText = this.formatStatus(status);
    const statusClass = this.getStatusClass(status);

    statusDisplay.innerHTML = `<span class="status-dot"></span> ${statusText}`;
    statusDisplay.className = `profile-value status-badge ${statusClass}`;
  },

  /**
   * Render permissions
   */
  renderPermissions() {
    const permissionsDisplay = document.getElementById('permissions-display');
    if (!permissionsDisplay) return;

    permissionsDisplay.innerHTML = '';

    if (!this.permissions) {
      permissionsDisplay.innerHTML = '<span style="color: #666;">No permissions data</span>';
      return;
    }

    const permissionList = [
      { key: 'auto_hit', label: 'Auto Hit' },
      { key: 'bypass', label: 'Bypass' }
    ];

    let hasAnyPermission = false;

    permissionList.forEach(perm => {
      if (this.permissions[perm.key] === true) {
        const badge = document.createElement('span');
        badge.className = 'permission-badge';
        badge.textContent = `${perm.label} ✓`;
        permissionsDisplay.appendChild(badge);
        hasAnyPermission = true;
      }
    });

    if (!hasAnyPermission) {
      permissionsDisplay.innerHTML = '<span style="color: #666;">No permissions granted</span>';
    }
  },

  /**
   * Render user stats
   */
  renderStats() {
    const statsContainer = document.getElementById('user-stats');
    if (!statsContainer) return;

    // Get stats from storage
    chrome.storage.local.get('stats', (result) => {
      const stats = result.stats || { hits: 0, tested: 0, declined: 0 };

      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total Tests:</span>
          <span class="stat-value">${stats.tested}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Hits:</span>
          <span class="stat-value success">${stats.hits}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Declined:</span>
          <span class="stat-value danger">${stats.declined}</span>
        </div>
      `;
    });
  },

  /**
   * Format status text
   */
  formatStatus(status) {
    const statusMap = {
      'active': 'Active',
      'pending': 'Pending Approval',
      'blocked': 'Blocked',
      'inactive': 'Inactive'
    };

    return statusMap[status] || status;
  },

  /**
   * Get status CSS class
   */
  getStatusClass(status) {
    const classMap = {
      'active': 'active',
      'pending': 'pending',
      'blocked': 'blocked',
      'inactive': 'inactive'
    };

    return classMap[status] || '';
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-profile-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }

    // Copy username button
    const copyUsernameBtn = document.getElementById('copy-username-btn');
    if (copyUsernameBtn) {
      copyUsernameBtn.addEventListener('click', () => this.copyUsername());
    }

    // View full profile button
    const viewProfileBtn = document.getElementById('view-profile-btn');
    if (viewProfileBtn) {
      viewProfileBtn.addEventListener('click', () => this.showFullProfile());
    }
  },

  /**
   * Refresh profile data
   */
  async refresh() {
    console.log('[Profile] Refreshing...');

    try {
      // Show loading state
      const refreshBtn = document.getElementById('refresh-profile-btn');
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
      }

      // Reload data
      await this.loadUserData();
      this.render();

      // Show success
      this.showToast('Profile refreshed', 'success');

      // Reset button
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      }

    } catch (error) {
      console.error('[Profile] Refresh error:', error);
      this.showToast('Failed to refresh profile', 'error');
    }
  },

  /**
   * Copy username to clipboard
   */
  async copyUsername() {
    if (!this.userData || !this.userData.username) {
      this.showToast('No username to copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.userData.username);
      this.showToast('Username copied!', 'success');
    } catch (error) {
      console.error('[Profile] Copy error:', error);
      this.showToast('Failed to copy username', 'error');
    }
  },

  /**
   * Show full profile modal
   */
  showFullProfile() {
    const modal = this.createProfileModal();
    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
    }, 10);
  },

  /**
   * Create profile modal
   */
  createProfileModal() {
    const modal = document.createElement('div');
    modal.id = 'profile-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: rgba(20, 20, 30, 0.95);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 16px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    content.innerHTML = `
      <h2 style="margin-bottom: 20px; color: #FFD700;">User Profile</h2>
      
      <div style="margin-bottom: 15px;">
        <strong>Username:</strong> ${this.userData?.username || 'N/A'}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Status:</strong> ${this.formatStatus(this.userData?.status || 'unknown')}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Permissions:</strong>
        <ul style="margin-top: 5px; padding-left: 20px;">
          <li>Auto Hit: ${this.permissions?.auto_hit ? '✅' : '❌'}</li>
          <li>Bypass: ${this.permissions?.bypass ? '✅' : '❌'}</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Account Created:</strong> ${this.userData?.created_at || 'N/A'}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Last Login:</strong> ${this.userData?.last_login || 'N/A'}
      </div>
      
      <button id="close-modal-btn" style="
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        border: none;
        border-radius: 8px;
        color: #0a0a0f;
        font-weight: 600;
        cursor: pointer;
        margin-top: 20px;
      ">Close</button>
    `;

    modal.appendChild(content);

    // Close button
    const closeBtn = content.querySelector('#close-modal-btn');
    closeBtn.addEventListener('click', () => {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
      }
    });

    return modal;
  },

  /**
   * Get user info
   */
  getUserInfo() {
    return {
      username: this.userData?.username,
      status: this.userData?.status,
      permissions: this.permissions,
      hasAutoHit: this.permissions?.auto_hit === true,
      hasBypass: this.permissions?.bypass === true
    };
  },

  /**
   * Check if user has permission
   */
  hasPermission(feature) {
    if (!this.permissions) return false;
    return this.permissions[feature] === true;
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    if (!toast || !toastMessage) {
      console.log(message);
      return;
    }

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Profile.init());
} else {
  Profile.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Profile;
}