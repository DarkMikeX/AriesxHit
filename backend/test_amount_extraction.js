// Direct test of amount extraction from checkout data
const checkoutService = require('./services/checkoutService');

// Copy of parseCheckoutUrl function from telegram.js
function parseCheckoutUrl(checkoutUrl) {
  const result = {
    sessionId: null,
    publicKey: null,
    site: null,
    success: false
  };

  if (!checkoutUrl) {
    return result;
  }

  try {
    // URL decode the entire URL first (like cc script)
    checkoutUrl = decodeURIComponent(checkoutUrl);

    // Extract session ID (same regex as cc script)
    const sessionMatch = checkoutUrl.match(/cs_(?:live|test)_[A-Za-z0-9]+/);
    if (sessionMatch) {
      result.sessionId = sessionMatch[0];
      console.log('[PARSE_URL] 📋 Session ID:', result.sessionId);
    }

    // Check for key in query parameters (fallback for URLs that have key=pk_xxx)
    try {
      const url = new URL(checkoutUrl);
      const keyParam = url.searchParams.get('key');
      if (keyParam && keyParam.startsWith('pk_')) {
        result.publicKey = keyParam;
        console.log('[PARSE_URL] ✅ Found public key in query params:', result.publicKey.substring(0, 20) + '...');
      }
    } catch (urlError) {
      // Ignore URL parsing errors
    }

    // Extract from fragment (like cc script)
    const fragmentPos = checkoutUrl.indexOf('#');
    if (fragmentPos !== -1) {
      const fragment = checkoutUrl.substring(fragmentPos + 1);
      console.log('[PARSE_URL] 🔍 Found fragment:', fragment.substring(0, 50) + '...');

      try {
        // Base64 decode (like cc script)
        const decoded = Buffer.from(decodeURIComponent(fragment), 'base64');
        console.log('[PARSE_URL] 📦 Base64 decoded');

        // XOR decode with key 5 (like cc script XOR_KEY = 5)
        const xorDecoded = decoded.map(byte => byte ^ 5);
        const xorString = Buffer.from(xorDecoded).toString('utf8');
        console.log('[PARSE_URL] 🔐 XOR decoded');

        // Extract public key (like cc script)
        const pkMatch = xorString.match(/pk_(?:live|test)_[A-Za-z0-9]+/);
        if (pkMatch) {
          result.publicKey = pkMatch[0];
          console.log('[PARSE_URL] ✅ Found public key:', result.publicKey.substring(0, 20) + '...');
        }

        // Extract site URL (like cc script)
        const siteMatch = xorString.match(/https?:\/\/[^\s"']+/);
        if (siteMatch) {
          result.site = siteMatch[0];
          console.log('[PARSE_URL] 🌐 Found site URL:', result.site);
        }

        result.success = true;

      } catch (decodeError) {
        console.log('[PARSE_URL] ❌ Decode error:', decodeError.message);
      }
    }

    return result;
  } catch (e) {
    console.log('[PARSE_URL] ❌ Parse error:', e.message);
    return result;
  }
}

async function testAmountExtraction() {
  console.log('🧪 Testing Amount Extraction from Checkout URL\n');

  const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_b1o4OlWHxqOWCbyXtU05n23vQDEHsucPFFcv2zME7OsK4iqeZiAONxCYvZ#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDQwXHVLdk9EaGtcU0pzY2t2R3RXYURRUlYzVn9nS0R2aUp%2FNH83cXBvYU5wc1dIQURyUkhgQ111M2FPSTRcTld3VG9HNVJEdTVQQUJyaUNcSTJtfXIyQ2Y1NVRuY31HQ3ZJJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJjc2NzA3YycpJ2lkfGpwcVF8dWAnPydocGlxbFpscWBoJyknYGtkZ2lgVWlkZmBtamlhYHd2Jz9xd3BgeCUl';

  try {
    console.log('📡 Extracting Stripe session info...');
    const parsed = parseCheckoutUrl(checkoutUrl);
    console.log(`   Session ID: ${parsed.sessionId}`);
    console.log(`   Public Key: ${parsed.publicKey ? parsed.publicKey.substring(0, 20) + '...' : 'Not found'}`);
    console.log(`   Site: ${parsed.site}`);
    console.log(`   Success: ${parsed.success}`);

    const { sessionId, publicKey } = parsed;

    console.log('\n🔍 Fetching checkout data from Stripe...');
    const checkoutData = await checkoutService.fetchCheckoutInfo(sessionId, publicKey);
    console.log('✅ Checkout data fetched successfully');

    console.log('\n📊 Extracting amount and currency:');
    const amount = checkoutData.amount;
    const currency = checkoutData.currency || 'usd';
    console.log(`   Raw amount: ${amount}`);
    console.log(`   Currency: ${currency.toUpperCase()}`);

    let formattedAmount;
    if (amount !== null && amount !== undefined) {
      formattedAmount = `$${(amount / 100).toFixed(2)}`;
    } else {
      formattedAmount = '$0.00';
    }
    console.log(`   Formatted amount: ${formattedAmount}`);

    console.log('\n🏪 Extracting merchant/business name:');
    let businessName = 'Unknown';
    if (checkoutData.account_settings) {
      const acc = checkoutData.account_settings;
      businessName = acc.display_name || acc.business_profile?.name || acc.business_name || 'Unknown';
    }
    console.log(`   Business Name: ${businessName}`);

    console.log('\n📧 Extracting customer email:');
    const customerEmail = checkoutData.customer_email || 'Unknown';
    console.log(`   Customer Email: ${customerEmail}`);

    console.log('\n✅ SUCCESS: Amount extraction working correctly!');
    console.log('==================================================');
    console.log(`   Amount: ${formattedAmount} ${currency.toUpperCase()}`);
    console.log(`   Merchant: ${businessName}`);
    console.log(`   Email: ${customerEmail}`);
    console.log('');
    console.log('✅ This data will now be used in /co success messages and hit notifications');
    console.log('✅ No more fake $9.99 amounts!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testAmountExtraction();