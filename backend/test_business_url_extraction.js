// Test business URL extraction from checkout
const checkoutService = require('./services/checkoutService');

const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl';

async function testBusinessUrlExtraction() {
  try {
    console.log('🔍 Testing business URL extraction from checkout...\n');

    // Parse the checkout URL
    const stripeInfo = checkoutService.parseCheckoutUrl(checkoutUrl);
    console.log('📋 Parsed Checkout URL:');
    console.log('   Session ID:', stripeInfo.sessionId);
    console.log('   Public Key:', stripeInfo.publicKey ? 'pk_live_51RFkF8F7rQk...' : 'null');

    // Try to fetch checkout info (this might fail due to rate limits or auth)
    const proxy = 'p.webshare.io:80:kumldkme-rotate:uz047zho9ipr';
    console.log('\n🛡️  Using Proxy:', proxy);

    try {
      console.log('📡 Fetching checkout information...');
      const info = await checkoutService.fetchCheckoutInfo(stripeInfo.sessionId, stripeInfo.publicKey, proxy);
      console.log('✅ Checkout info fetched successfully');

      const checkoutData = checkoutService.getAmountAndCurrency(info);
      console.log('\n💰 Extracted Data:');
      console.log('   Amount:', checkoutData.amount ? `$${(checkoutData.amount / 100).toFixed(2)}` : 'null');
      console.log('   Currency:', checkoutData.currency || 'null');
      console.log('   Business URL:', checkoutData.businessUrl || 'null');

      if (checkoutData.businessUrl) {
        console.log('\n✅ SUCCESS: Business URL extracted!');
        console.log('   Raw URL:', checkoutData.businessUrl);
        console.log('   Clean Name:', checkoutData.businessUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''));
      } else {
        console.log('\n❌ Business URL not found in checkout response');
        console.log('Available fields:', Object.keys(info).filter(key => !key.startsWith('_')).join(', '));
      }

    } catch (fetchError) {
      console.log('❌ Could not fetch checkout info:', fetchError.message);
      console.log('This is expected if the checkout session is expired or rate limited');
    }

  } catch (error) {
    console.error('❌ Error during business URL extraction test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBusinessUrlExtraction();