// ===================================
// CARD-PROCESSOR.JS
// Card Data Processing & Generation
// Location: scripts/core/card-processor.js
// ===================================

const CardProcessor = {
  /**
   * Parse card string format: number|month|year|cvv
   */
  parseCard(cardString) {
    if (!cardString || typeof cardString !== 'string') {
      return null;
    }

    const parts = cardString.trim().split('|');
    
    if (parts.length < 3) {
      return null;
    }

    return {
      number: parts[0].trim(),
      month: parts[1].trim().padStart(2, '0'),
      year: parts[2].trim(),
      cvv: parts[3] ? parts[3].trim() : ''
    };
  },

  /**
   * Parse multiple cards (one per line)
   */
  parseCards(cardsText) {
    if (!cardsText || typeof cardsText !== 'string') {
      return [];
    }

    const lines = cardsText.trim().split('\n');
    const cards = [];

    lines.forEach(line => {
      const card = this.parseCard(line);
      if (card) {
        cards.push(card);
      }
    });

    return cards;
  },

  /**
   * Generate card from BIN
   */
  async generateFromBIN(bin) {
    try {
      // Remove spaces and validate
      const cleanBIN = bin.replace(/\s/g, '');
      
      if (!/^\d{6,8}$/.test(cleanBIN)) {
        throw new Error('Invalid BIN format');
      }

      // Call card generation API
      const url = `http://193.203.162.2:1490/check?bin=${encodeURIComponent(cleanBIN)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain'
        }
      });

      if (!response.ok) {
        throw new Error('Card generation failed');
      }

      const cardData = await response.text();
      const card = this.parseCard(cardData);

      if (!card) {
        throw new Error('Invalid card data received');
      }

      return card;
    } catch (error) {
      console.error('[CardProcessor] Error generating card:', error);
      return null;
    }
  },

  /**
   * Generate random card number from BIN
   */
  generateCardNumber(bin) {
    // Pad BIN to 15 digits with random numbers
    let cardNumber = bin;
    
    while (cardNumber.length < 15) {
      cardNumber += Math.floor(Math.random() * 10);
    }

    // Calculate Luhn check digit
    const checkDigit = this.calculateLuhnCheckDigit(cardNumber);
    cardNumber += checkDigit;

    return cardNumber;
  },

  /**
   * Calculate Luhn check digit
   */
  calculateLuhnCheckDigit(cardNumber) {
    let sum = 0;
    let isEven = true;

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

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  },

  /**
   * Validate card number using Luhn algorithm
   */
  validateCardNumber(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return false;
    }

    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\D/g, '');

    if (!/^\d{13,19}$/.test(cleaned)) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

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
   * Get card brand from number
   */
  getCardBrand(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, '');

    const brands = {
      visa: /^4/,
      mastercard: /^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/,
      amex: /^3[47]/,
      discover: /^(6011|622|64|65)/,
      dinersclub: /^(36|38|30[0-5])/,
      jcb: /^35/,
      unionpay: /^62/,
      maestro: /^(5018|5020|5038|6304|6759|676[1-3])/
    };

    for (const [brand, pattern] of Object.entries(brands)) {
      if (pattern.test(cleaned)) {
        return brand;
      }
    }

    return 'unknown';
  },

  /**
   * Format card number with spaces
   */
  formatCardNumber(cardNumber, brand = null) {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (!brand) {
      brand = this.getCardBrand(cleaned);
    }

    // Different spacing for different brands
    if (brand === 'amex') {
      // Amex: 4-6-5
      return cleaned.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else if (brand === 'dinersclub') {
      // Diners: 4-6-4
      return cleaned.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3');
    } else {
      // Most cards: 4-4-4-4
      return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    }
  },

  /**
   * Mask card number (show first 6 and last 4)
   */
  maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 10) {
      return cleaned;
    }

    const first6 = cleaned.substring(0, 6);
    const last4 = cleaned.substring(cleaned.length - 4);
    
    return `${first6}...${last4}`;
  },

  /**
   * Generate random expiry date (future)
   */
  generateExpiry() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Random month
    const month = Math.floor(Math.random() * 12) + 1;
    
    // Random year (1-5 years in future)
    const yearOffset = Math.floor(Math.random() * 5) + 1;
    let year = currentYear + yearOffset;

    // If same year, make sure month is in future
    if (year === currentYear && month <= currentMonth) {
      year++;
    }

    return {
      month: month.toString().padStart(2, '0'),
      year: year.toString()
    };
  },

  /**
   * Generate random CVV
   */
  generateCVV(length = 3) {
    let cvv = '';
    for (let i = 0; i < length; i++) {
      cvv += Math.floor(Math.random() * 10);
    }
    return cvv;
  },

  /**
   * Generate complete random card from BIN
   */
  generateCompleteCard(bin) {
    const number = this.generateCardNumber(bin);
    const expiry = this.generateExpiry();
    const brand = this.getCardBrand(number);
    const cvvLength = brand === 'amex' ? 4 : 3;
    const cvv = this.generateCVV(cvvLength);

    return {
      number: number,
      month: expiry.month,
      year: expiry.year,
      cvv: cvv,
      brand: brand
    };
  },

  /**
   * Validate card data object
   */
  validateCard(card) {
    const errors = [];

    // Validate number
    if (!card.number || !this.validateCardNumber(card.number)) {
      errors.push('Invalid card number');
    }

    // Validate month
    const month = parseInt(card.month, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      errors.push('Invalid month');
    }

    // Validate year
    const year = parseInt(card.year, 10);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(year) || year < currentYear) {
      errors.push('Card expired');
    }

    // Validate CVV (optional)
    if (card.cvv && !/^\d{3,4}$/.test(card.cvv)) {
      errors.push('Invalid CVV');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Format card for display
   */
  formatForDisplay(card) {
    const masked = this.maskCardNumber(card.number);
    const expiry = `${card.month}/${card.year.slice(-2)}`;
    const cvv = card.cvv || 'XXX';
    
    return `${masked} | ${expiry} | ${cvv}`;
  },

  /**
   * Format card for logging
   */
  formatForLog(card) {
    return `${card.number}|${card.month}|${card.year}|${card.cvv || ''}`;
  },

  /**
   * Serialize card to string
   */
  serialize(card) {
    return `${card.number}|${card.month}|${card.year}|${card.cvv || ''}`;
  },

  /**
   * Clone card object
   */
  clone(card) {
    return {
      number: card.number,
      month: card.month,
      year: card.year,
      cvv: card.cvv,
      brand: card.brand
    };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardProcessor;
}