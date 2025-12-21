// ===================================
// VALIDATORS.JS
// Input Validation Functions
// ===================================

const Validators = {
  /**
   * Validate BIN (Bank Identification Number)
   * @param {string} bin - BIN to validate
   * @returns {Object} - { valid: boolean, error: string }
   */
  validateBIN(bin) {
    if (!bin || bin.trim() === '') {
      return { valid: false, error: 'BIN cannot be empty' };
    }

    // Remove spaces
    bin = bin.trim().replace(/\s/g, '');

    // Check if only digits
    if (!/^\d+$/.test(bin)) {
      return { valid: false, error: 'BIN must contain only digits' };
    }

    // Check length (6-8 digits)
    if (bin.length < CONFIG.CARD.MIN_BIN_LENGTH || bin.length > CONFIG.CARD.MAX_BIN_LENGTH) {
      return { valid: false, error: 'BIN must be 6-8 digits' };
    }

    return { valid: true, bin: bin };
  },

  /**
   * Validate Credit Card Number using Luhn algorithm
   * @param {string} cardNumber - Card number to validate
   * @returns {boolean} - True if valid
   */
  luhnCheck(cardNumber) {
    // Remove spaces and non-digits
    cardNumber = cardNumber.replace(/\D/g, '');

    let sum = 0;
    let isEven = false;

    // Loop through values starting from the rightmost digit
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return (sum % 10) === 0;
  },

  /**
   * Validate Card data format: number|month|year|cvv
   * @param {string} cardData - Card data string
   * @returns {Object} - { valid: boolean, error: string, parsed: object }
   */
  validateCard(cardData) {
    if (!cardData || cardData.trim() === '') {
      return { valid: false, error: 'Card data cannot be empty' };
    }

    cardData = cardData.trim();

    // Check format: number|month|year|cvv
    const parts = cardData.split('|');
    
    if (parts.length < 3 || parts.length > 4) {
      return { valid: false, error: 'Invalid format. Use: number|month|year|cvv' };
    }

    const [number, month, year, cvv] = parts;

    // Validate card number
    const cleanNumber = number.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanNumber)) {
      return { valid: false, error: 'Invalid card number length' };
    }

    if (!this.luhnCheck(cleanNumber)) {
      return { valid: false, error: 'Invalid card number (Luhn check failed)' };
    }

    // Validate month (01-12)
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { valid: false, error: 'Invalid month (use 01-12)' };
    }

    // Validate year (2-4 digits)
    if (!/^\d{2,4}$/.test(year)) {
      return { valid: false, error: 'Invalid year format' };
    }

    // Validate CVV if provided (3-4 digits)
    if (cvv && !/^\d{3,4}$/.test(cvv)) {
      return { valid: false, error: 'Invalid CVV (3-4 digits)' };
    }

    return {
      valid: true,
      parsed: {
        number: cleanNumber,
        month: month.padStart(2, '0'),
        year: year.length === 2 ? '20' + year : year,
        cvv: cvv || ''
      }
    };
  },

  /**
   * Validate multiple cards (one per line)
   * @param {string} cardsText - Multi-line card data
   * @returns {Object} - { valid: boolean, cards: array, errors: array }
   */
  validateCards(cardsText) {
    if (!cardsText || cardsText.trim() === '') {
      return { valid: false, errors: ['No cards provided'] };
    }

    const lines = cardsText.trim().split('\n');
    const cards = [];
    const errors = [];

    lines.forEach((line, index) => {
      line = line.trim();
      if (line === '') return; // Skip empty lines

      const result = this.validateCard(line);
      if (result.valid) {
        cards.push(result.parsed);
      } else {
        errors.push(`Line ${index + 1}: ${result.error}`);
      }
    });

    if (cards.length === 0) {
      return { valid: false, errors: errors.length > 0 ? errors : ['No valid cards found'] };
    }

    return {
      valid: true,
      cards: cards,
      errors: errors // May have some errors but still have valid cards
    };
  },

  /**
   * Validate Proxy format
   * @param {string} proxy - Proxy string
   * @returns {Object} - { valid: boolean, error: string, parsed: object }
   */
  validateProxy(proxy) {
    if (!proxy || proxy.trim() === '') {
      return { valid: false, error: 'Proxy cannot be empty' };
    }

    proxy = proxy.trim();

    // Format: host:port or user:pass@host:port
    let match;

    // Try format: user:pass@host:port
    match = proxy.match(/^(.+):(.+)@(.+):(\d+)$/);
    if (match) {
      return {
        valid: true,
        parsed: {
          username: match[1],
          password: match[2],
          host: match[3],
          port: parseInt(match[4], 10)
        }
      };
    }

    // Try format: host:port
    match = proxy.match(/^(.+):(\d+)$/);
    if (match) {
      return {
        valid: true,
        parsed: {
          host: match[1],
          port: parseInt(match[2], 10)
        }
      };
    }

    return { valid: false, error: 'Invalid proxy format. Use: host:port or user:pass@host:port' };
  },

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid
   */
  validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Validate image URL
   * @param {string} url - Image URL to validate
   * @returns {Promise<Object>} - { valid: boolean, error: string }
   */
  async validateImageURL(url) {
    if (!this.validateURL(url)) {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Check if image loads
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({ valid: true });
      };
      
      img.onerror = () => {
        resolve({ valid: false, error: 'Failed to load image' });
      };
      
      // Set timeout
      setTimeout(() => {
        resolve({ valid: false, error: 'Image load timeout' });
      }, 5000);
      
      img.src = url;
    });
  },

  /**
   * Validate username
   * @param {string} username - Username to validate
   * @returns {Object} - { valid: boolean, error: string }
   */
  validateUsername(username) {
    if (!username || username.trim() === '') {
      return { valid: false, error: 'Username cannot be empty' };
    }

    username = username.trim();

    // 3-20 characters, alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return { valid: false, error: 'Username must be 3-20 characters (letters, numbers, underscore)' };
    }

    return { valid: true, username: username };
  },

  /**
   * Validate password
   * @param {string} password - Password to validate
   * @returns {Object} - { valid: boolean, error: string }
   */
  validatePassword(password) {
    if (!password || password.trim() === '') {
      return { valid: false, error: 'Password cannot be empty' };
    }

    if (password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }

    return { valid: true };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validators;
}