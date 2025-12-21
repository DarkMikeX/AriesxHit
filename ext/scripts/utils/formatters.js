// ===================================
// FORMATTERS.JS
// Data Formatting Functions
// ===================================

const Formatters = {
  /**
   * Format card number with spaces (4 digits groups)
   * @param {string} cardNumber - Raw card number
   * @returns {string} - Formatted card number
   */
  formatCardNumber(cardNumber) {
    // Remove all non-digits
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Add space every 4 digits
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  },

  /**
   * Mask card number (show first 6 and last 4)
   * @param {string} cardNumber - Card number
   * @returns {string} - Masked card number
   */
  maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 10) {
      return cleaned;
    }
    
    const first6 = cleaned.substring(0, 6);
    const last4 = cleaned.substring(cleaned.length - 4);
    const masked = first6 + '...' + last4;
    
    return masked;
  },

  /**
   * Format timestamp to HH:MM:SS
   * @param {Date} date - Date object
   * @returns {string} - Formatted time
   */
  formatTime(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  },

  /**
   * Format date to YYYY-MM-DD
   * @param {Date} date - Date object
   * @returns {string} - Formatted date
   */
  formatDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },

  /**
   * Format datetime to YYYY-MM-DD HH:MM:SS
   * @param {Date} date - Date object
   * @returns {string} - Formatted datetime
   */
  formatDateTime(date = new Date()) {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  },

  /**
   * Format expiry date (MM/YY)
   * @param {string} month - Month
   * @param {string} year - Year
   * @returns {string} - Formatted expiry
   */
  formatExpiry(month, year) {
    const mm = String(month).padStart(2, '0');
    const yy = year.length === 4 ? year.substring(2) : year;
    
    return `${mm}/${yy}`;
  },

  /**
   * Format BIN (add spaces)
   * @param {string} bin - BIN number
   * @returns {string} - Formatted BIN
   */
  formatBIN(bin) {
    const cleaned = bin.replace(/\D/g, '');
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  },

  /**
   * Format response code to readable text
   * @param {string} code - Response code
   * @returns {string} - Readable text
   */
  formatResponseCode(code) {
    const responses = {
      'success': 'Success',
      'generic_decline': 'Generic Decline',
      'insufficient_funds': 'Insufficient Funds',
      'card_expired': 'Card Expired',
      'incorrect_cvc': 'Invalid CVV',
      'do_not_honor': 'Do Not Honor',
      'fraudulent': 'Fraudulent',
      'lost_card': 'Lost Card',
      'stolen_card': 'Stolen Card',
      'incorrect_number': 'Invalid Number',
      'processing_error': 'Processing Error',
      'card_declined': 'Card Declined',
      'invalid_expiry': 'Invalid Expiry',
      'card_not_supported': 'Card Not Supported'
    };
    
    return responses[code] || code;
  },

  /**
   * Format log entry
   * @param {string} type - Log type (info, success, error, warning)
   * @param {string} message - Log message
   * @returns {Object} - Formatted log entry
   */
  formatLogEntry(type, message) {
    return {
      time: this.formatTime(),
      type: type,
      message: message,
      timestamp: Date.now()
    };
  },

  /**
   * Format card for display in logs
   * @param {Object} card - Card object
   * @returns {string} - Formatted string
   */
  formatCardForLog(card) {
    const masked = this.maskCardNumber(card.number);
    return `${masked}|${card.month}|${card.year}|${card.cvv || 'XXX'}`;
  },

  /**
   * Format proxy for display
   * @param {Object} proxy - Proxy object
   * @returns {string} - Formatted proxy
   */
  formatProxy(proxy) {
    if (proxy.username && proxy.password) {
      return `${proxy.username}:****@${proxy.host}:${proxy.port}`;
    }
    return `${proxy.host}:${proxy.port}`;
  },

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Format percentage
   * @param {number} value - Value
   * @param {number} total - Total
   * @returns {string} - Formatted percentage
   */
  formatPercentage(value, total) {
    if (total === 0) return '0%';
    
    const percentage = (value / total) * 100;
    return `${Math.round(percentage)}%`;
  },

  /**
   * Format duration (milliseconds to readable)
   * @param {number} ms - Milliseconds
   * @returns {string} - Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated text
   */
  truncate(text, maxLength = 50) {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  },

  /**
   * Capitalize first letter
   * @param {string} text - Text to capitalize
   * @returns {string} - Capitalized text
   */
  capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  /**
   * Format number with commas
   * @param {number} num - Number to format
   * @returns {string} - Formatted number
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Formatters;
}