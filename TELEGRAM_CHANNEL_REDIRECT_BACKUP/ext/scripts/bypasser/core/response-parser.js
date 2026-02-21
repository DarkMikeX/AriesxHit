// ===================================
// RESPONSE-PARSER.JS
// Stripe Response Parser & Analyzer
// Location: scripts/core/response-parser.js
// ===================================

const ResponseParser = {
  /**
   * Parse Stripe API response
   */
  parse(responseData) {
    if (!responseData || typeof responseData !== 'object') {
      return this.createResult('unknown', 'Invalid response data');
    }

    // Check for error
    if (responseData.error) {
      return this.parseError(responseData.error);
    }

    // Check payment_intent
    if (responseData.payment_intent) {
      return this.parsePaymentIntent(responseData.payment_intent);
    }

    // Check setup_intent
    if (responseData.setup_intent) {
      return this.parseSetupIntent(responseData.setup_intent);
    }

    // Check direct status
    if (responseData.status) {
      return this.parseStatus(responseData.status, responseData);
    }

    // Check charge
    if (responseData.charge) {
      return this.parseCharge(responseData.charge);
    }

    // Unknown response format
    return this.createResult('unknown', 'Unknown response format');
  },

  /**
   * Parse error object
   */
  parseError(error) {
    const code = error.decline_code || error.code || 'unknown';
    const message = error.message || 'Payment declined';
    const type = error.type || 'card_error';

    return this.createResult('declined', message, {
      code: code,
      type: type,
      param: error.param,
      declineReason: this.getDeclineReason(code)
    });
  },

  /**
   * Parse payment_intent
   */
  parsePaymentIntent(paymentIntent) {
    const status = paymentIntent.status;

    // Check for errors
    if (paymentIntent.last_payment_error) {
      return this.parseError(paymentIntent.last_payment_error);
    }

    // Parse status
    switch (status) {
      case 'succeeded':
        return this.createResult('success', 'Payment succeeded');

      case 'processing':
        return this.createResult('processing', 'Payment processing');

      case 'requires_payment_method':
        return this.createResult('declined', 'Payment method required');

      case 'requires_confirmation':
        return this.createResult('pending', 'Requires confirmation');

      case 'requires_action':
        return this.createResult('requires_action', '3D Secure authentication required', {
          nextAction: paymentIntent.next_action
        });

      case 'requires_capture':
        return this.createResult('success', 'Payment authorized (requires capture)');

      case 'canceled':
        return this.createResult('declined', 'Payment canceled');

      default:
        return this.createResult('unknown', `Unknown status: ${status}`);
    }
  },

  /**
   * Parse setup_intent
   */
  parseSetupIntent(setupIntent) {
    const status = setupIntent.status;

    switch (status) {
      case 'succeeded':
        return this.createResult('success', 'Setup succeeded');

      case 'requires_payment_method':
        return this.createResult('declined', 'Payment method required');

      case 'requires_confirmation':
        return this.createResult('pending', 'Requires confirmation');

      case 'requires_action':
        return this.createResult('requires_action', '3D Secure authentication required');

      case 'canceled':
        return this.createResult('declined', 'Setup canceled');

      default:
        return this.createResult('unknown', `Unknown status: ${status}`);
    }
  },

  /**
   * Parse status directly
   */
  parseStatus(status, data) {
    switch (status) {
      case 'succeeded':
      case 'success':
        return this.createResult('success', 'Payment succeeded');

      case 'processing':
        return this.createResult('processing', 'Payment processing');

      case 'requires_action':
      case 'requires_source_action':
        return this.createResult('requires_action', '3D Secure authentication required');

      case 'failed':
      case 'declined':
        return this.createResult('declined', 'Payment declined');

      default:
        return this.createResult('unknown', `Status: ${status}`);
    }
  },

  /**
   * Parse charge object
   */
  parseCharge(charge) {
    if (charge.paid) {
      return this.createResult('success', 'Payment succeeded');
    }

    if (charge.failure_code) {
      const reason = this.getDeclineReason(charge.failure_code);
      return this.createResult('declined', charge.failure_message || reason, {
        code: charge.failure_code
      });
    }

    return this.createResult('declined', 'Payment declined');
  },

  /**
   * Create result object
   */
  createResult(status, message, extra = {}) {
    return {
      status: status,
      message: message,
      success: status === 'success',
      declined: status === 'declined',
      needsAction: status === 'requires_action',
      processing: status === 'processing',
      timestamp: Date.now(),
      ...extra
    };
  },

  /**
   * Get human-readable decline reason
   */
  getDeclineReason(code) {
    const reasons = {
      // Generic
      'generic_decline': 'Card declined',
      'card_declined': 'Card declined',
      'call_issuer': 'Contact card issuer',
      'do_not_honor': 'Do not honor',
      'do_not_try_again': 'Do not try again',
      
      // Insufficient funds
      'insufficient_funds': 'Insufficient funds',
      'withdrawal_count_limit_exceeded': 'Withdrawal limit exceeded',
      
      // Card issues
      'card_expired': 'Card expired',
      'expired_card': 'Card expired',
      'invalid_expiry_year': 'Invalid expiry year',
      'invalid_expiry_month': 'Invalid expiry month',
      'incorrect_number': 'Incorrect card number',
      'invalid_number': 'Invalid card number',
      'incorrect_cvc': 'Incorrect CVV/CVC',
      'invalid_cvc': 'Invalid CVV/CVC',
      
      // Fraud
      'fraudulent': 'Fraudulent transaction',
      'suspected_fraud': 'Suspected fraud',
      'lost_card': 'Lost card',
      'stolen_card': 'Stolen card',
      'pickup_card': 'Pickup card',
      'restricted_card': 'Restricted card',
      
      // Processing
      'processing_error': 'Processing error',
      'issuer_not_available': 'Issuer not available',
      'try_again_later': 'Try again later',
      'reenter_transaction': 'Re-enter transaction',
      
      // Card type
      'card_not_supported': 'Card not supported',
      'currency_not_supported': 'Currency not supported',
      'transaction_not_allowed': 'Transaction not allowed',
      
      // Limits
      'approve_with_id': 'Approval required',
      'card_velocity_exceeded': 'Card velocity exceeded',
      'amount_too_large': 'Amount too large',
      'amount_too_small': 'Amount too small',
      
      // Authentication
      'authentication_required': 'Authentication required',
      'merchant_blacklist': 'Merchant blacklist',
      'new_account_information_available': 'Update account info',
      
      // Other
      'no_action_taken': 'No action taken',
      'not_permitted': 'Not permitted',
      'revocation_of_all_authorizations': 'Authorization revoked',
      'revocation_of_authorization': 'Authorization revoked',
      'service_not_allowed': 'Service not allowed',
      'stop_payment_order': 'Stop payment order',
      'testmode_decline': 'Test mode decline'
    };

    return reasons[code] || code;
  },

  /**
   * Check if response indicates success
   */
  isSuccess(responseData) {
    const result = this.parse(responseData);
    return result.success;
  },

  /**
   * Check if response indicates decline
   */
  isDeclined(responseData) {
    const result = this.parse(responseData);
    return result.declined;
  },

  /**
   * Check if response requires 3DS
   */
  requires3DS(responseData) {
    const result = this.parse(responseData);
    return result.needsAction;
  },

  /**
   * Extract decline code from response
   */
  getDeclineCode(responseData) {
    if (responseData.error) {
      return responseData.error.decline_code || responseData.error.code;
    }

    if (responseData.payment_intent && responseData.payment_intent.last_payment_error) {
      return responseData.payment_intent.last_payment_error.decline_code || 
             responseData.payment_intent.last_payment_error.code;
    }

    if (responseData.charge && responseData.charge.failure_code) {
      return responseData.charge.failure_code;
    }

    return null;
  },

  /**
   * Format result for logging
   */
  formatForLog(result) {
    if (result.success) {
      return `✅ ${result.message}`;
    }

    if (result.declined) {
      const code = result.code ? ` (${result.code})` : '';
      return `❌ ${result.message}${code}`;
    }

    if (result.needsAction) {
      return `🔐 ${result.message}`;
    }

    if (result.processing) {
      return `⏳ ${result.message}`;
    }

    return `ℹ️ ${result.message}`;
  },

  /**
   * Get color for result type
   */
  getColorClass(result) {
    if (result.success) return 'success';
    if (result.declined) return 'error';
    if (result.needsAction) return 'warning';
    if (result.processing) return 'info';
    return 'muted';
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponseParser;
}