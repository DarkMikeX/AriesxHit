// Test extracting merchant from checkout data like cc script
const checkoutService = require('./services/checkoutService');

const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl';

async function testMerchantExtraction() {
  try {
    console.log('🔍 Testing Merchant Extraction from Checkout Data...\n');

    // Parse the URL
    const parsed = checkoutService.parseCheckoutUrl(checkoutUrl);
    console.log('📋 Parsed URL:');
    console.log('   Session ID:', parsed.sessionId);
    console.log('   Public Key:', parsed.publicKey ? parsed.publicKey.substring(0, 30) + '...' : 'null');

    // Try to fetch real checkout data
    const proxy = 'p.webshare.io:80:kumldkme-rotate:uz047zho9ipr';
    console.log('\n🛡️  Using Proxy:', proxy);

    console.log('📡 Fetching checkout session data...');

    try {
      const info = await checkoutService.fetchCheckoutInfo(parsed.sessionId, parsed.publicKey, proxy);

      if (info.error) {
        console.log('❌ API Error:', info.error.message);
        return;
      }

      console.log('✅ Checkout data fetched successfully!');
      console.log('\n🏪 MERCHANT EXTRACTION (like cc script):');

      if (info.account_settings) {
        const acc = info.account_settings;
        console.log('📊 Account Settings Found:');

        // Extract merchant like cc script does
        const merchant = acc.display_name || acc.business_name ||
                        (acc.business_profile && acc.business_profile.name) || 'Unknown';

        console.log('🎯 Merchant (like cc script):', merchant);
        console.log('   display_name:', acc.display_name || 'null');
        console.log('   business_name:', acc.business_name || 'null');
        console.log('   business_profile.name:', acc.business_profile?.name || 'null');

        console.log('\n🔗 Business URLs:');
        console.log('   business_profile.url:', acc.business_profile?.url || 'null');
        console.log('   business_url:', acc.business_url || 'null');
        console.log('   website:', acc.website || 'null');

      } else {
        console.log('❌ No account_settings found in checkout data');
      }

      console.log('\n📋 All Available Fields:');
      console.log(Object.keys(info).filter(key => !key.startsWith('_')).join(', '));

      console.log('\n✅ Merchant extraction test completed!');
      console.log('🎯 The merchant should be:', info.account_settings?.display_name || 'Unknown');

    } catch (fetchError) {
      console.log('❌ Could not fetch checkout data:', fetchError.message);
      console.log('Using mock data for demonstration...\n');

      // Show what the extraction should look like
      const mockAccountSettings = {
        display_name: 'Real Merchant Business Name',
        business_profile: {
          name: 'Merchant Profile Name',
          url: 'https://merchantwebsite.com'
        },
        support_email: 'support@merchant.com'
      };

      const merchant = mockAccountSettings.display_name;
      console.log('🎯 Mock Merchant Extraction:');
      console.log('   From account_settings.display_name:', merchant);
      console.log('   This is what cc script extracts as "Merchant"');
    }

  } catch (error) {
    console.error('❌ Error during merchant extraction test:', error.message);
  }
}

testMerchantExtraction();