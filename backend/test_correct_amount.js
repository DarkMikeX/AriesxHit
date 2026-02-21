// Test with the CORRECT amount extracted from the checkout URL
const checkoutService = require('./services/checkoutService');

const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_b1o4OlWHxqOWCbyXtU05n23vQDEHsucPFFcv2zME7OsK4iqeZiAONxCYvZ#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDQwXHVLdk9EaGtcU0pzY2t2R3RXYURRUlYzVn9nS0R2aUp%2FNH83cXBvYU5wc1dIQURyUkhgQ111M2FPSTRcTld3VG9HNVJEdTVQQUJyaUNcSTJtfXIyQ2Y1NVRuY31HQ3ZJJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJjc2NzA3YycpJ2lkfGpwcVF8dWAnPydocGlxbFpscWBoJyknYGtkZ2lgVWlkZmBtamlhYHd2Jz9xd3BgeCUl';

async function testCorrectAmount() {
  console.log('🎯 Testing CORRECT Amount Extraction from Checkout URL');
  console.log('===================================================\n');

  console.log('📋 From cc script output for this URL:');
  console.log('Amount: 0 (0.00 USD)');
  console.log('Currency: USD');
  console.log('Merchant: Replit');
  console.log('Email: itzmi3xel@gmail.com');
  console.log('');

  // Parse the URL
  const parsed = checkoutService.parseCheckoutUrl(checkoutUrl);
  console.log('🔍 Parsed URL:');
  console.log('   Session ID:', parsed.sessionId);
  console.log('   Public Key:', parsed.publicKey ? parsed.publicKey.substring(0, 30) + '...' : 'null');

  if (!parsed.sessionId || !parsed.publicKey) {
    console.log('❌ Could not parse checkout URL');
    return;
  }

  console.log('\n🧪 Fetching real checkout data...');

  try {
    const info = await checkoutService.fetchCheckoutInfo(parsed.sessionId, parsed.publicKey);

    if (info.error) {
      console.log('❌ API Error:', info.error.message);
      console.log('Using data from cc script output...\n');

      // Use the real data from cc script
      console.log('💰 CORRECT Amount from cc script: 0.00 USD');
      console.log('🏪 CORRECT Merchant: Replit');
      console.log('📧 CORRECT Email: itzmi3xel@gmail.com');

      const hitData = {
        userId: '6447766151',
        userName: 'Test User',
        card: '4111111111111111',
        bin: '411111',
        binMode: false,
        amount: '0.00', // CORRECT amount from cc script
        currency: 'USD',
        attempts: 1,
        timeTaken: '2.5s',
        merchant: 'Replit', // CORRECT merchant from cc script
        businessUrl: 'https://replit.com/',
        currentUrl: checkoutUrl,
        email: 'itzmi3xel@gmail.com', // CORRECT email from cc script
        status: 'CHARGED',
        timestamp: new Date().toISOString()
      };

      console.log('\n🎯 CORRECT Hit Data:');
      console.log('Amount: $0.00 USD (not $9.99!)');
      console.log('Merchant: Replit');
      console.log('Email: itzmi3xel@gmail.com');

      return;
    }

    // Extract data from API response
    const checkoutData = checkoutService.getAmountAndCurrency(info);

    console.log('\n💰 Extracted Data:');
    console.log('   Amount:', checkoutData.amount ? `$${(checkoutData.amount / 100).toFixed(2)}` : 'null');
    console.log('   Currency:', checkoutData.currency || 'null');
    console.log('   Business Name:', checkoutData.businessName || 'null');

    console.log('\n✅ VERIFICATION:');
    console.log('cc script shows: Amount: 0 (0.00 USD)');
    console.log('Our extraction:', checkoutData.amount ? `$${(checkoutData.amount / 100).toFixed(2)} USD` : 'null');

    if (checkoutData.amount === 0) {
      console.log('✅ CORRECT: Amount is 0.00 USD as shown in cc script!');
    } else if (checkoutData.amount === null) {
      console.log('⚠️ Amount is null (subscription/pay-what-you-want checkout)');
      console.log('cc script shows 0.00 USD for this type of checkout');
    } else {
      console.log('❌ Amount mismatch with cc script');
    }

  } catch (fetchError) {
    console.log('❌ Could not fetch checkout data:', fetchError.message);
    console.log('\n📊 Based on cc script, this checkout should show:');
    console.log('   Amount: $0.00 USD');
    console.log('   Merchant: Replit');
    console.log('   Email: itzmi3xel@gmail.com');
  }
}

testCorrectAmount();