// ===================================
// CARD-GENERATOR.JS
// Generate Cards from BIN Patterns
// ===================================

const CardGenerator = {
  /**
   * Parse BIN input and generate card
   * Supports formats:
   * - 456789 (6-digit BIN)
   * - 456789xxxxxx (BIN with x placeholders)
   * - 456789xxxxxx|12|25 (BIN with expiry)
   * - 456789xxxxxx|12|25|xxx (BIN with expiry and CVV pattern)
   * 
   * @param {string} binInput - BIN input string
   * @returns {Object} - Generated card { number, month, year, cvv }
   */
  generateFromBin(binInput) {
    if (!binInput || typeof binInput !== 'string') {
      return null;
    }

    binInput = binInput.trim();
    
    // Split by | to get parts
    const parts = binInput.split('|');
    const binPattern = parts[0].trim();
    const expMonth = parts[1] ? parts[1].trim() : null;
    const expYear = parts[2] ? parts[2].trim() : null;
    const cvvPattern = parts[3] ? parts[3].trim() : null;

    // Generate card number
    const cardNumber = this.generateCardNumber(binPattern);
    if (!cardNumber) return null;

    // Generate or use expiry
    const month = this.generateMonth(expMonth);
    const year = this.generateYear(expYear);

    // Generate CVV
    const cvv = this.generateCvv(cvvPattern);

    return {
      number: cardNumber,
      month: month,
      year: year,
      cvv: cvv
    };
  },

  /**
   * Generate card number from pattern
   * Replaces 'x' or 'X' with random digits
   * Ensures Luhn check passes
   * 
   * @param {string} pattern - Card number pattern (e.g., "456789xxxxxx")
   * @returns {string} - Valid card number
   */
  generateCardNumber(pattern) {
    if (!pattern) return null;

    // Remove spaces and non-alphanumeric except x
    pattern = pattern.replace(/[^0-9xX]/g, '');

    // If pattern is just digits (BIN), pad with x's to 16 chars
    if (/^\d+$/.test(pattern)) {
      const padding = 16 - pattern.length;
      if (padding > 0) {
        pattern = pattern + 'x'.repeat(padding);
      }
    }

    // Must be 13-19 characters
    if (pattern.length < 13 || pattern.length > 19) {
      // Try to pad to 16
      if (pattern.length < 13) {
        pattern = pattern + 'x'.repeat(16 - pattern.length);
      } else {
        return null;
      }
    }

    // Generate number with Luhn check
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      let cardNumber = '';
      
      for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (char.toLowerCase() === 'x') {
          cardNumber += Math.floor(Math.random() * 10).toString();
        } else {
          cardNumber += char;
        }
      }

      // Validate with Luhn and fix if needed
      const validNumber = this.fixLuhn(cardNumber);
      if (validNumber) {
        return validNumber;
      }

      attempts++;
    }

    return null;
  },

  /**
   * Fix card number to pass Luhn check
   * Adjusts the last digit
   * 
   * @param {string} cardNumber - Card number to fix
   * @returns {string} - Valid card number
   */
  fixLuhn(cardNumber) {
    // Calculate what the check digit should be
    const digits = cardNumber.split('').map(Number);
    const len = digits.length;
    
    // Calculate sum without last digit
    let sum = 0;
    for (let i = 0; i < len - 1; i++) {
      let digit = digits[i];
      
      // Double every second digit from right (excluding check digit)
      if ((len - 1 - i) % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
    }

    // Calculate required check digit
    const checkDigit = (10 - (sum % 10)) % 10;
    
    // Replace last digit with correct check digit
    return cardNumber.slice(0, -1) + checkDigit.toString();
  },

  /**
   * Validate card number using Luhn algorithm
   * 
   * @param {string} cardNumber - Card number to validate
   * @returns {boolean} - True if valid
   */
  validateLuhn(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
    const len = digits.length;
    
    let sum = 0;
    for (let i = 0; i < len; i++) {
      let digit = digits[i];
      
      if ((len - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
    }

    return sum % 10 === 0;
  },

  /**
   * Generate expiry month
   * 
   * @param {string} month - Month pattern or value
   * @returns {string} - 2-digit month (01-12)
   */
  generateMonth(month) {
    if (month && /^\d{1,2}$/.test(month)) {
      const m = parseInt(month, 10);
      if (m >= 1 && m <= 12) {
        return m.toString().padStart(2, '0');
      }
    }

    // Random month
    const randomMonth = Math.floor(Math.random() * 12) + 1;
    return randomMonth.toString().padStart(2, '0');
  },

  /**
   * Generate expiry year
   * 
   * @param {string} year - Year pattern or value (2 or 4 digits)
   * @returns {string} - 2-digit year
   */
  generateYear(year) {
    const currentYear = new Date().getFullYear();
    
    if (year && /^\d{2,4}$/.test(year)) {
      let y = parseInt(year, 10);
      
      // Convert 2-digit to 4-digit
      if (y < 100) {
        y += 2000;
      }
      
      // Must be current year or future
      if (y >= currentYear) {
        return (y % 100).toString().padStart(2, '0');
      }
    }

    // Random year (current + 1 to current + 5)
    const randomYear = currentYear + Math.floor(Math.random() * 5) + 1;
    return (randomYear % 100).toString().padStart(2, '0');
  },

  /**
   * Generate CVV
   * 
   * @param {string} pattern - CVV pattern (e.g., "xxx" or "123")
   * @returns {string} - 3 or 4 digit CVV
   */
  generateCvv(pattern) {
    if (pattern && /^\d{3,4}$/.test(pattern)) {
      return pattern;
    }

    // Determine length (3 or 4 based on pattern, default 3)
    let length = 3;
    if (pattern) {
      length = pattern.replace(/[^x]/gi, '').length || 3;
      if (length < 3) length = 3;
      if (length > 4) length = 4;
    }

    // Generate random CVV
    let cvv = '';
    for (let i = 0; i < length; i++) {
      cvv += Math.floor(Math.random() * 10).toString();
    }

    return cvv;
  },

  /**
   * Generate multiple cards from BIN
   * 
   * @param {string} binInput - BIN input
   * @param {number} count - Number of cards to generate
   * @returns {Array} - Array of card objects
   */
  generateMultiple(binInput, count = 10) {
    const cards = [];
    const seen = new Set();

    for (let i = 0; i < count * 2 && cards.length < count; i++) {
      const card = this.generateFromBin(binInput);
      if (card && !seen.has(card.number)) {
        seen.add(card.number);
        cards.push(card);
      }
    }

    return cards;
  },

  /**
   * Parse multiple BIN inputs (one per line)
   * 
   * @param {string} binText - Multi-line BIN input
   * @returns {Array} - Array of parsed BIN patterns
   */
  parseBinList(binText) {
    if (!binText) return [];

    return binText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length >= 6);
  },

  /**
   * Format card for display
   * 
   * @param {Object} card - Card object
   * @returns {string} - Formatted string
   */
  formatCard(card) {
    if (!card) return '';
    return `${card.number}|${card.month}|${card.year}|${card.cvv}`;
  },

  /**
   * Mask card number for logging
   * 
   * @param {string} cardNumber - Card number
   * @returns {string} - Masked number (first 6, last 4)
   */
  maskCard(cardNumber) {
    if (!cardNumber || cardNumber.length < 10) return cardNumber;
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    return `${first6}******${last4}`;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardGenerator;
}
