// ===================================
// DEFAULT-SETTINGS.JS
// Default Extension Settings
// ===================================

const DEFAULT_SETTINGS = {
  // CVC Modifier Options: 'remove', 'generate', 'nothing', 'custom'
  cvcModifier: 'generate',
  customCvc: '',
  
  // 3D Secure Options
  remove3dsFingerprint: true,
  removePaymentAgent: false,
  removeZipCode: false,
  blockAnalytics: false,
  
  // Notification Settings
  showStripeDetection: true,
  show3dsDetection: true,
  
  // Auto Hit Settings
  autoHitDelay: 2000,  // ms between attempts
  maxRetries: 3,
  
  // Card Generation
  defaultExpiryMonth: null,  // null = random
  defaultExpiryYear: null,   // null = random (current year + 1-5)
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_SETTINGS;
}
