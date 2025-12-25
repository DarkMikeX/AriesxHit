// ===================================
// VALIDATORS.JS
// Input Validation Functions
// ===================================

const Validators = {
  /**
   * Validate BIN (Bank Identification Number)
   * Now supports extended patterns:
   * - 456789 (6-digit BIN)
   * - 456789xxxxxxxxxx (BIN with x placeholders)
   * - 456789xxxxxxxxxx|12|25 (BIN with expiry)
   * - 456789xxxxxxxxxx|12|25|xxx (BIN with expiry and CVV pattern)
   * 
   * @param {string} bin - BIN to validate (can be multi-line)
   * @returns {Object} - { valid: boolean, error: string, bins: array }
   */
  validateBIN(bin) {
    if (!bin || bin.trim() === '') {
      return { valid: false, error: 'BIN cannot be empty' };
    }

    // Check if multi-line
    const lines = bin.trim().split('\n');
    const validBins = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const result = this.validateSingleBIN(line);
      if (result.valid) {
        validBins.push(result.bin);
      } else {
        errors.push(`Line ${i + 1}: ${result.error}`);
      }
    }

    if (validBins.length === 0) {
      return { 
        valid: false, 
        error: errors.length > 0 ? errors[0] : 'No valid BINs found' 
      };
    }

    return { valid: true, bin: validBins[0], bins: validBins };
  },

  /**
   * Validate a single BIN pattern
   * Supports any length from 6 to 16 characters
   * Examples:
   * - 456789 (6-digit BIN - will pad with x's)
   * - 4567891234567890 (full 16-digit card pattern)
   * - 456789xxxxxxxxxx (BIN with x placeholders)
   * - 456789xxxxxxxxxx|12|25 (with expiry)
   * - 456789xxxxxxxxxx|12|25|xxx (with expiry and CVV)
   * 
   * @param {string} binPattern - BIN pattern
   * @returns {Object} - { valid: boolean, error: string, bin: string }
   */
  validateSingleBIN(binPattern) {
    if (!binPattern || binPattern.trim() === '') {
      return { valid: false, error: 'BIN pattern cannot be empty' };
    }

    binPattern = binPattern.trim();

    // Split by | to get parts
    const parts = binPattern.split('|');
    const binPart = parts[0].trim();
    const expMonth = parts[1] ? parts[1].trim() : null;
    const expYear = parts[2] ? parts[2].trim() : null;
    const cvvPattern = parts[3] ? parts[3].trim() : null;

    // Clean BIN part - keep digits and x/X
    const cleanedBin = binPart.replace(/[^0-9xX]/g, '');

    // Must be at least 6 characters, max 16
    if (cleanedBin.length < 6) {
      return { valid: false, error: 'BIN must be at least 6 characters' };
    }

    if (cleanedBin.length > 16) {
      return { valid: false, error: 'BIN cannot exceed 16 characters' };
    }

    // At least first 4 characters should have digits
    const firstFour = cleanedBin.substring(0, Math.min(4, cleanedBin.length));
    const digitCount = (firstFour.match(/\d/g) || []).length;
    if (digitCount < 4 && cleanedBin.length >= 4) {
      return { valid: false, error: 'First 4 characters should be digits' };
    }

    // Validate expiry month if provided
    if (expMonth !== null && expMonth !== '') {
      if (!/^\d{1,2}$/.test(expMonth)) {
        return { valid: false, error: 'Invalid month format (use 01-12)' };
      }
      const month = parseInt(expMonth, 10);
      if (month < 1 || month > 12) {
        return { valid: false, error: 'Month must be 01-12' };
      }
    }

    // Validate expiry year if provided
    if (expYear !== null && expYear !== '') {
      if (!/^\d{2,4}$/.test(expYear)) {
        return { valid: false, error: 'Invalid year format (use YY or YYYY)' };
      }
    }

    // Validate CVV pattern if provided
    if (cvvPattern !== null && cvvPattern !== '') {
      const cleanedCvv = cvvPattern.replace(/[^0-9xX]/g, '');
      if (cleanedCvv.length < 3 || cleanedCvv.length > 4) {
        return { valid: false, error: 'CVV pattern must be 3-4 characters' };
      }
    }

    return { valid: true, bin: binPattern };
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

    // Normalize year to 2-digit format (Stripe API expects 2-digit years)
    let normalizedYear = year;
    if (year.length === 4) {
      normalizedYear = year.slice(-2);
    }

    return {
      valid: true,
      parsed: {
        number: cleanNumber,
        month: month.padStart(2, '0'),
        year: normalizedYear, // Always 2-digit for Stripe API compatibility
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
   * Must match backend validation: 8+ chars with at least 1 letter and 1 number
   * @param {string} password - Password to validate
   * @returns {Object} - { valid: boolean, error: string }
   */
  validatePassword(password) {
    if (!password || password.trim() === '') {
      return { valid: false, error: 'Password cannot be empty' };
    }

    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
      return { valid: false, error: 'Password must be less than 128 characters' };
    }

    // Check for at least one letter and one number (matching backend validation)
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      return { valid: false, error: 'Password must contain at least one letter and one number' };
    }

    return { valid: true };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validators;
}