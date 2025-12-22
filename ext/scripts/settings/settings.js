// ===================================
// SETTINGS.JS
// Settings Page Main Logic
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const isAuth = await Storage.isAuthenticated();
  if (!isAuth) {
    window.location.href = 'login.html';
    return;
  }

  // Get user data and permissions
  const userData = await Storage.getUserData();
  const permissions = await Storage.getPermissions();

  if (!userData || !permissions) {
    await Storage.clearAuth();
    window.location.href = 'login.html';
    return;
  }

  // Initialize
  initializeUI(userData, permissions);
  await loadWallpaper();
  await loadFeatureSettings();
  setupEventListeners();
  setupFeatureListeners();
});

/**
 * Initialize UI with user data
 */
function initializeUI(userData, permissions) {
  // Display username
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay) {
    usernameDisplay.textContent = userData.username || 'User';
  }

  // Display status
  const statusDisplay = document.getElementById('status-display');
  if (statusDisplay && userData.status) {
    const statusText = userData.status === 'active' ? 'Active' : userData.status;
    statusDisplay.innerHTML = `<span class="status-dot"></span> ${statusText}`;
  }

  // Display permissions
  const permissionsDisplay = document.getElementById('permissions-display');
  if (permissionsDisplay) {
    permissionsDisplay.innerHTML = '';
    
    if (permissions.auto_hit) {
      const badge = document.createElement('span');
      badge.className = 'permission-badge';
      badge.textContent = 'Auto Hit ✓';
      permissionsDisplay.appendChild(badge);
    }

    if (permissions.bypass) {
      const badge = document.createElement('span');
      badge.className = 'permission-badge';
      badge.textContent = 'Bypass ✓';
      permissionsDisplay.appendChild(badge);
    }

    if (!permissions.auto_hit && !permissions.bypass) {
      permissionsDisplay.innerHTML = '<span style="color: #666;">No permissions granted</span>';
    }
  }
}

/**
 * Load wallpaper
 */
async function loadWallpaper() {
  const wallpaperSettings = await Storage.getWallpaper();
  
  if (wallpaperSettings) {
    WallpaperManager.applyWallpaper(wallpaperSettings);
  } else {
    WallpaperManager.applyDefault();
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'popup.html';
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Preset gallery
  const presetGallery = document.getElementById('preset-gallery');
  if (presetGallery) {
    presetGallery.addEventListener('click', handlePresetClick);
  }

  // Custom URL buttons
  const previewUrlBtn = document.getElementById('preview-url-btn');
  const applyUrlBtn = document.getElementById('apply-url-btn');

  if (previewUrlBtn) {
    previewUrlBtn.addEventListener('click', handlePreviewUrl);
  }

  if (applyUrlBtn) {
    applyUrlBtn.addEventListener('click', handleApplyUrl);
  }

  // Blur slider
  const blurSlider = document.getElementById('blur-slider');
  const blurValue = document.getElementById('blur-value');

  if (blurSlider) {
    // Load current value
    const currentSettings = WallpaperManager.getCurrentSettings();
    if (currentSettings && currentSettings.blur !== undefined) {
      blurSlider.value = currentSettings.blur;
      blurValue.textContent = currentSettings.blur + '%';
    }

    blurSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      blurValue.textContent = value + '%';
      WallpaperManager.setBlur(value);
    });

    blurSlider.addEventListener('change', (e) => {
      WallpaperManager.updateBlur(e.target.value);
    });
  }

  // Darkness slider
  const darknessSlider = document.getElementById('darkness-slider');
  const darknessValue = document.getElementById('darkness-value');

  if (darknessSlider) {
    // Load current value
    const currentSettings = WallpaperManager.getCurrentSettings();
    if (currentSettings && currentSettings.darkness !== undefined) {
      darknessSlider.value = currentSettings.darkness;
      darknessValue.textContent = currentSettings.darkness + '%';
    }

    darknessSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      darknessValue.textContent = value + '%';
      WallpaperManager.setDarkness(value);
    });

    darknessSlider.addEventListener('change', (e) => {
      WallpaperManager.updateDarkness(e.target.value);
    });
  }

  // Add to favorites button
  const addToFavoritesBtn = document.getElementById('add-to-favorites-btn');
  if (addToFavoritesBtn) {
    addToFavoritesBtn.addEventListener('click', handleAddToFavorites);
  }

  // Reset button
  const resetBtn = document.getElementById('reset-wallpaper-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }

  // Load favorites
  loadFavorites();
}

/**
 * Handle preset click
 */
async function handlePresetClick(e) {
  const presetItem = e.target.closest('.preset-item');
  if (!presetItem) return;

  const presetName = presetItem.getAttribute('data-preset');
  if (!presetName) return;

  try {
    await WallpaperManager.changePreset(presetName);
    
    // Update active state
    document.querySelectorAll('.preset-item').forEach(item => {
      item.classList.remove('active');
    });
    presetItem.classList.add('active');

    showToast('✅ Wallpaper applied', 'success');
  } catch (error) {
    console.error('Error applying preset:', error);
    showToast('❌ Failed to apply wallpaper', 'error');
  }
}

/**
 * Handle preview URL
 */
async function handlePreviewUrl() {
  const urlInput = document.getElementById('custom-url-input');
  const urlPreview = document.getElementById('url-preview');
  const previewImg = document.getElementById('url-preview-img');

  const url = urlInput.value.trim();

  if (!url) {
    showToast('⚠️ Please enter a URL', 'error');
    return;
  }

  // Validate URL
  const validation = await Validators.validateImageURL(url);
  
  if (!validation.valid) {
    showToast('❌ ' + validation.error, 'error');
    urlPreview.style.display = 'none';
    return;
  }

  // Show preview
  previewImg.src = url;
  urlPreview.style.display = 'block';
  showToast('✅ Preview loaded', 'success');
}

/**
 * Handle apply URL
 */
async function handleApplyUrl() {
  const urlInput = document.getElementById('custom-url-input');
  const url = urlInput.value.trim();

  if (!url) {
    showToast('⚠️ Please enter a URL', 'error');
    return;
  }

  try {
    await WallpaperManager.changeCustom(url);
    showToast('✅ Custom wallpaper applied', 'success');
  } catch (error) {
    console.error('Error applying custom wallpaper:', error);
    showToast('❌ ' + error.message, 'error');
  }
}

/**
 * Handle add to favorites
 */
async function handleAddToFavorites() {
  const currentSettings = WallpaperManager.getCurrentSettings();
  
  if (!currentSettings || currentSettings.type !== 'custom' || !currentSettings.url) {
    showToast('⚠️ No custom wallpaper applied', 'error');
    return;
  }

  try {
    const favorites = await Storage.getFavorites();
    
    // Check if already in favorites
    if (favorites.includes(currentSettings.url)) {
      showToast('ℹ️ Already in favorites', 'info');
      return;
    }

    // Check max favorites
    if (favorites.length >= CONFIG.WALLPAPER.MAX_FAVORITES) {
      showToast('⚠️ Maximum ' + CONFIG.WALLPAPER.MAX_FAVORITES + ' favorites allowed', 'error');
      return;
    }

    // Add to favorites
    favorites.push(currentSettings.url);
    await Storage.setFavorites(favorites);

    // Reload favorites list
    loadFavorites();

    showToast('✅ Added to favorites', 'success');
  } catch (error) {
    console.error('Error adding to favorites:', error);
    showToast('❌ Failed to add to favorites', 'error');
  }
}

/**
 * Load favorites list
 */
async function loadFavorites() {
  const favoritesList = document.getElementById('favorites-list');
  if (!favoritesList) return;

  const favorites = await Storage.getFavorites();

  if (!favorites || favorites.length === 0) {
    favoritesList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <p>No favorites saved yet</p>
      </div>
    `;
    return;
  }

  favoritesList.innerHTML = '';

  favorites.forEach((url, index) => {
    const item = document.createElement('div');
    item.className = 'favorite-item';

    const urlSpan = document.createElement('span');
    urlSpan.className = 'favorite-url';
    urlSpan.textContent = url;
    urlSpan.title = url;

    const actions = document.createElement('div');
    actions.className = 'favorite-actions';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'favorite-btn';
    applyBtn.textContent = 'Apply';
    applyBtn.onclick = () => applyFavorite(url);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'favorite-btn delete';
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => deleteFavorite(index);

    actions.appendChild(applyBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(urlSpan);
    item.appendChild(actions);

    favoritesList.appendChild(item);
  });
}

/**
 * Apply favorite
 */
async function applyFavorite(url) {
  try {
    await WallpaperManager.changeCustom(url);
    showToast('✅ Favorite applied', 'success');
  } catch (error) {
    console.error('Error applying favorite:', error);
    showToast('❌ Failed to apply favorite', 'error');
  }
}

/**
 * Delete favorite
 */
async function deleteFavorite(index) {
  try {
    const favorites = await Storage.getFavorites();
    favorites.splice(index, 1);
    await Storage.setFavorites(favorites);

    loadFavorites();
    showToast('✅ Favorite removed', 'success');
  } catch (error) {
    console.error('Error deleting favorite:', error);
    showToast('❌ Failed to delete favorite', 'error');
  }
}

/**
 * Handle reset
 */
async function handleReset() {
  if (!confirm('Reset wallpaper to default?')) {
    return;
  }

  try {
    await WallpaperManager.reset();
    
    // Reset sliders
    const blurSlider = document.getElementById('blur-slider');
    const blurValue = document.getElementById('blur-value');
    const darknessSlider = document.getElementById('darkness-slider');
    const darknessValue = document.getElementById('darkness-value');

    if (blurSlider) {
      blurSlider.value = CONFIG.WALLPAPER.DEFAULT_BLUR;
      blurValue.textContent = CONFIG.WALLPAPER.DEFAULT_BLUR + '%';
    }

    if (darknessSlider) {
      darknessSlider.value = CONFIG.WALLPAPER.DEFAULT_DARKNESS;
      darknessValue.textContent = CONFIG.WALLPAPER.DEFAULT_DARKNESS + '%';
    }

    // Clear custom URL input
    const urlInput = document.getElementById('custom-url-input');
    if (urlInput) {
      urlInput.value = '';
    }

    // Hide preview
    const urlPreview = document.getElementById('url-preview');
    if (urlPreview) {
      urlPreview.style.display = 'none';
    }

    // Clear active preset
    document.querySelectorAll('.preset-item').forEach(item => {
      item.classList.remove('active');
    });

    showToast('✅ Wallpaper reset to default', 'success');
  } catch (error) {
    console.error('Error resetting wallpaper:', error);
    showToast('❌ Failed to reset wallpaper', 'error');
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }

  try {
    // Call logout API
    await APIClient.logout();
  } catch (error) {
    console.error('Logout API error:', error);
    // Continue with local logout even if API fails
  }

  // Clear local data
  await Storage.clearAuth();

  // Redirect to login
  window.location.href = 'login.html';
}

/**
 * Load feature settings from storage
 */
async function loadFeatureSettings() {
  try {
    const result = await chrome.storage.local.get([
      'settings_cvcModifier',
      'settings_customCvc',
      'settings_remove3dsFingerprint',
      'settings_removePaymentAgent',
      'settings_removeZipCode',
      'settings_blockAnalytics'
    ]);

    // CVC Modifier
    const cvcSelect = document.getElementById('cvc-modifier-select');
    if (cvcSelect) {
      cvcSelect.value = result.settings_cvcModifier || 'generate';
      toggleCustomCvcRow(cvcSelect.value === 'custom');
    }

    // Custom CVC
    const customCvcInput = document.getElementById('custom-cvc-input');
    if (customCvcInput && result.settings_customCvc) {
      customCvcInput.value = result.settings_customCvc;
    }

    // Remove Payment Agent
    const removeAgentToggle = document.getElementById('remove-agent-toggle');
    if (removeAgentToggle) {
      removeAgentToggle.checked = result.settings_removePaymentAgent === true;
    }

    // 3DS Bypass
    const threeDsBypassToggle = document.getElementById('3ds-bypass-toggle');
    if (threeDsBypassToggle) {
      threeDsBypassToggle.checked = result.settings_remove3dsFingerprint !== false;
    }

    // Remove Zip Code
    const removeZipToggle = document.getElementById('remove-zip-toggle');
    if (removeZipToggle) {
      removeZipToggle.checked = result.settings_removeZipCode === true;
    }

    // Block Analytics
    const blockAnalyticsToggle = document.getElementById('block-analytics-toggle');
    if (blockAnalyticsToggle) {
      blockAnalyticsToggle.checked = result.settings_blockAnalytics === true;
    }

    console.log('[Settings] Feature settings loaded');
  } catch (error) {
    console.error('[Settings] Error loading feature settings:', error);
  }
}

/**
 * Setup feature setting listeners
 */
function setupFeatureListeners() {
  // CVC Modifier Select
  const cvcSelect = document.getElementById('cvc-modifier-select');
  if (cvcSelect) {
    cvcSelect.addEventListener('change', async (e) => {
      const value = e.target.value;
      await saveFeatureSetting('cvcModifier', value);
      toggleCustomCvcRow(value === 'custom');
      showToast(`✅ CVC Modifier: ${value}`, 'success');
    });
  }

  // Custom CVC Input
  const customCvcInput = document.getElementById('custom-cvc-input');
  if (customCvcInput) {
    customCvcInput.addEventListener('input', debounce(async (e) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
      e.target.value = value;
      if (value.length >= 3) {
        await saveFeatureSetting('customCvc', value);
        showToast(`✅ Custom CVC: ${value}`, 'success');
      }
    }, 500));
  }

  // Remove Payment Agent Toggle
  const removeAgentToggle = document.getElementById('remove-agent-toggle');
  if (removeAgentToggle) {
    removeAgentToggle.addEventListener('change', async (e) => {
      await saveFeatureSetting('removePaymentAgent', e.target.checked);
      showToast(`${e.target.checked ? '✅' : '⏹️'} Remove Payment Agent: ${e.target.checked ? 'ON' : 'OFF'}`, 'success');
    });
  }

  // 3DS Bypass Toggle
  const threeDsBypassToggle = document.getElementById('3ds-bypass-toggle');
  if (threeDsBypassToggle) {
    threeDsBypassToggle.addEventListener('change', async (e) => {
      await saveFeatureSetting('remove3dsFingerprint', e.target.checked);
      showToast(`${e.target.checked ? '✅' : '⏹️'} 3D Bypass: ${e.target.checked ? 'ON' : 'OFF'}`, 'success');
    });
  }

  // Remove Zip Code Toggle
  const removeZipToggle = document.getElementById('remove-zip-toggle');
  if (removeZipToggle) {
    removeZipToggle.addEventListener('change', async (e) => {
      await saveFeatureSetting('removeZipCode', e.target.checked);
      showToast(`${e.target.checked ? '✅' : '⏹️'} Remove Zip Code: ${e.target.checked ? 'ON' : 'OFF'}`, 'success');
    });
  }

  // Block Analytics Toggle
  const blockAnalyticsToggle = document.getElementById('block-analytics-toggle');
  if (blockAnalyticsToggle) {
    blockAnalyticsToggle.addEventListener('change', async (e) => {
      await saveFeatureSetting('blockAnalytics', e.target.checked);
      showToast(`${e.target.checked ? '✅' : '⏹️'} Block Analytics: ${e.target.checked ? 'ON' : 'OFF'}`, 'success');
    });
  }
}

/**
 * Save feature setting to storage and notify background
 */
async function saveFeatureSetting(key, value) {
  try {
    // Save to storage
    const storageKey = `settings_${key}`;
    await chrome.storage.local.set({ [storageKey]: value });

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { [key]: value }
    }).catch(() => {});

    console.log(`[Settings] Saved ${key}:`, value);
  } catch (error) {
    console.error('[Settings] Error saving setting:', error);
  }
}

/**
 * Toggle custom CVC input row visibility
 */
function toggleCustomCvcRow(show) {
  const customCvcRow = document.getElementById('custom-cvc-row');
  if (customCvcRow) {
    customCvcRow.style.display = show ? 'flex' : 'none';
  }
}

/**
 * Debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}