// Test fetching real checkout data to see business_url extraction
const checkoutService = require('./services/checkoutService');

const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmJkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl';

async function testRealCheckoutData() {
  try {
    console.log('🔍 Testing real checkout data extraction...\n');

    // Parse the URL like cc script does
    const parsed = checkoutService.parseCheckoutUrl(checkoutUrl);
    console.log('📋 Parsed URL:');
    console.log('   Session ID:', parsed.sessionId);
    console.log('   Public Key:', parsed.publicKey ? parsed.publicKey.substring(0, 30) + '...' : 'null');

    if (!parsed.sessionId || !parsed.publicKey) {
      console.log('❌ Could not parse checkout URL');
      return;
    }

    // Try to fetch checkout info (this might fail due to rate limits)
    const proxy = 'p.webshare.io:80:kumldkme-rotate:uz047zho9ipr';
    console.log('\n🛡️  Using Proxy:', proxy);

    try {
      console.log('📡 Fetching checkout session data...');
      const info = await checkoutService.fetchCheckoutInfo(parsed.sessionId, parsed.publicKey, proxy);

      if (info.error) {
        console.log('❌ API Error:', info.error.message);
        return;
      }

      console.log('✅ Checkout data fetched successfully!');
      console.log('\n📊 Available Fields in Response:');
      console.log(Object.keys(info).join(', '));

      console.log('\n💰 Amount & Currency:');
      const amountData = checkoutService.getAmountAndCurrency(info);
      console.log('   Amount:', amountData.amount ? `$${(amountData.amount / 100).toFixed(2)}` : 'null');
      console.log('   Currency:', amountData.currency);
      console.log('   Business Name:', amountData.businessName || 'null');
      console.log('   Business URL:', amountData.businessUrl || 'null');

      console.log('\n🏪 Account Settings (Business Info):');
      if (info.account_settings) {
        const acc = info.account_settings;
        console.log('   display_name:', acc.display_name || 'null');
        console.log('   business_name:', acc.business_name || 'null');
        if (acc.business_profile) {
          console.log('   business_profile.name:', acc.business_profile.name || 'null');
          console.log('   business_profile.url:', acc.business_profile.url || 'null');
        }
        console.log('   business_url:', acc.business_url || 'null');
        console.log('   website:', acc.website || 'null');
      } else {
        console.log('   ❌ No account_settings found');
      }

      console.log('\n🔍 Direct Fields Check:');
      console.log('   business_url:', info.business_url || 'null');
      console.log('   customer_email:', info.customer_email || 'null');
      console.log('   status:', info.status || 'null');

      console.log('\n✅ Data extraction test completed!');

    } catch (fetchError) {
      console.log('❌ Could not fetch checkout data:', fetchError.message);
      console.log('This might be due to rate limiting or session expiration');
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRealCheckoutData();