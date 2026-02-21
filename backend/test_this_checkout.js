// Test extracting merchant from THIS specific checkout URL
const checkoutService = require('./services/checkoutService');

const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmJkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl';

async function testThisCheckout() {
  try {
    console.log('🔍 Testing THIS Specific Checkout URL:');
    console.log(checkoutUrl);
    console.log('');

    // Parse the URL
    const parsed = checkoutService.parseCheckoutUrl(checkoutUrl);
    console.log('📋 Parsed Data:');
    console.log('   Session ID:', parsed.sessionId);
    console.log('   Public Key:', parsed.publicKey ? parsed.publicKey.substring(0, 30) + '...' : 'null');

    if (!parsed.sessionId || !parsed.publicKey) {
      console.log('❌ Could not parse checkout URL');
      return;
    }

    console.log('\n🧪 Attempting to fetch checkout data...');

    try {
      // Try to fetch the actual checkout data
      const info = await checkoutService.fetchCheckoutInfo(parsed.sessionId, parsed.publicKey);

      if (info.error) {
        console.log('❌ API Error:', info.error.message);
        console.log('❌ Cannot fetch live data (rate limited or expired)');

        // Show what we know from previous fetches
        console.log('\n📊 From Previous Live Data (this same URL):');
        console.log('   Amount: $3.00 USD');
        console.log('   Email: kingmichal55@gmail.com');
        console.log('   Has account_settings: YES');
        console.log('   Status: Live checkout session');

        console.log('\n❓ What merchant name should be extracted?');
        console.log('   From account_settings.display_name');
        console.log('   This is the business name that appears on the checkout page');
        console.log('   Like cc script: acc.get(\'display_name\', \'N/A\')');

        return;
      }

      console.log('✅ Checkout data fetched successfully!');

      // Extract merchant using our logic
      const checkoutData = checkoutService.getAmountAndCurrency(info);

      console.log('\n💰 Extracted Data:');
      console.log('   Amount:', checkoutData.amount ? `$${(checkoutData.amount / 100).toFixed(2)}` : 'null');
      console.log('   Currency:', checkoutData.currency);
      console.log('   Business Name:', checkoutData.businessName || 'null');
      console.log('   Business URL:', checkoutData.businessUrl || 'null');

      console.log('\n🏪 Account Settings (if available):');
      if (info.account_settings) {
        const acc = info.account_settings;
        console.log('   display_name:', acc.display_name || 'null');
        console.log('   business_name:', acc.business_name || 'null');
        console.log('   business_profile.name:', acc.business_profile?.name || 'null');
        console.log('   business_profile.url:', acc.business_profile?.url || 'null');
      } else {
        console.log('   ❌ No account_settings in response');
      }

      console.log('\n🎯 MERCHANT FOR THIS CHECKOUT:');
      const merchant = checkoutData.businessName || 'Unknown';
      console.log(`   "${merchant}"`);
      console.log('');
      console.log('   This should appear in "「❃」 Bussiness :-" field');
      console.log('   Extracted from account_settings.display_name like cc script');

    } catch (fetchError) {
      console.log('❌ Could not fetch checkout data:', fetchError.message);
      console.log('\n💡 Based on cc script logic, the merchant should be:');
      console.log('   account_settings.display_name from the checkout session');
      console.log('   This is the business name shown to customers');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testThisCheckout();