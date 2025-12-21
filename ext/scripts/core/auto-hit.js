// ===================================
// AUTO-HIT.JS
// Auto Hit Core Engine
// Location: scripts/core/auto-hit.js
// ===================================

const AutoHit = {
  // State
  active: false,
  cardList: [],
  currentIndex: 0,
  bin: null,
  proxy: null,
  stats: {
    total: 0,
    hits: 0,
    declined: 0,
    tested: 0
  },
  
  // Settings
  retryDelay: 2000, // 2 seconds between retries
  maxRetries: 3,
  
  /**
   * Initialize Auto Hit
   */
  init(config) {
    this.cardList = config.cards || [];
    this.bin = config.bin || null;
    this.proxy = config.proxy || null;
    this.currentIndex = 0;
    
    // Reset stats
    this.stats = {
      total: this.cardList.length || 0,
      hits: 0,
      declined: 0,
      tested: 0
    };
    
    console.log('[AutoHit] Initialized with:', {
      mode: this.bin ? 'BIN' : 'Card List',
      cards: this.cardList.length,
      bin: this.bin,
      proxy: this.proxy ? 'Yes' : 'No'
    });
  },

  /**
   * Start Auto Hit
   */
  start() {
    if (this.active) {
      console.log('[AutoHit] Already active');
      return false;
    }

    if (!this.bin && this.cardList.length === 0) {
      console.error('[AutoHit] No BIN or cards provided');
      return false;
    }

    this.active = true;
    console.log('[AutoHit] Started');
    
    return true;
  },

  /**
   * Stop Auto Hit
   */
  stop() {
    if (!this.active) {
      return false;
    }

    this.active = false;
    console.log('[AutoHit] Stopped');
    
    return true;
  },

  /**
   * Get next card
   */
  async getNextCard() {
    // BIN mode
    if (this.bin) {
      return await this.generateCardFromBIN();
    }

    // Card list mode
    if (this.currentIndex >= this.cardList.length) {
      console.log('[AutoHit] No more cards');
      return null;
    }

    const card = this.cardList[this.currentIndex];
    this.currentIndex++;
    
    return card;
  },

  /**
   * Generate card from BIN
   */
  async generateCardFromBIN() {
    try {
      const card = await CardProcessor.generateFromBIN(this.bin);
      
      if (!card) {
        console.error('[AutoHit] Failed to generate card from BIN');
        return null;
      }

      return card;
    } catch (error) {
      console.error('[AutoHit] Error generating card:', error);
      return null;
    }
  },

  /**
   * Process card test
   */
  async processCard(card) {
    if (!this.active) {
      return null;
    }

    console.log('[AutoHit] Testing card:', CardProcessor.maskCardNumber(card.number));
    
    this.stats.tested++;
    
    return {
      card: card,
      masked: CardProcessor.maskCardNumber(card.number),
      index: this.currentIndex - 1,
      total: this.stats.total
    };
  },

  /**
   * Handle response
   */
  handleResponse(result) {
    if (!result) return;

    if (result.success) {
      this.stats.hits++;
      console.log('[AutoHit] Hit detected!');
      
      // Stop on hit
      this.stop();
    } else {
      this.stats.declined++;
      console.log('[AutoHit] Card declined:', result.message);
    }
  },

  /**
   * Should retry
   */
  shouldRetry() {
    return this.active && 
           (this.bin || this.currentIndex < this.cardList.length);
  },

  /**
   * Get progress
   */
  getProgress() {
    if (this.bin) {
      return {
        mode: 'BIN',
        tested: this.stats.tested,
        hits: this.stats.hits,
        declined: this.stats.declined
      };
    }

    return {
      mode: 'List',
      current: this.currentIndex,
      total: this.cardList.length,
      tested: this.stats.tested,
      hits: this.stats.hits,
      declined: this.stats.declined,
      percentage: Math.round((this.currentIndex / this.cardList.length) * 100)
    };
  },

  /**
   * Get stats
   */
  getStats() {
    return { ...this.stats };
  },

  /**
   * Is active
   */
  isActive() {
    return this.active;
  },

  /**
   * Reset
   */
  reset() {
    this.active = false;
    this.currentIndex = 0;
    this.stats = {
      total: this.cardList.length || 0,
      hits: 0,
      declined: 0,
      tested: 0
    };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoHit;
}