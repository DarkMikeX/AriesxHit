// Test business name extraction from checkout data (like cc script)
const checkoutService = require('./services/checkoutService');

console.log('🧪 Testing Business Name Extraction (like cc script)...\n');

// Mock checkout info with account_settings (like what we saw in logs)
const mockCheckoutInfo = {
  currency: 'usd',
  account_settings: {
    display_name: 'Test Business Name',
    business_profile: {
      name: 'Test Business Profile Name',
      url: 'https://testbusiness.com'
    },
    support_email: 'support@testbusiness.com'
  },
  line_item_group: {
    due: 300, // $3.00
    currency: 'usd'
  }
};

console.log('📋 Mock Checkout Info:');
console.log('   Account Settings:', JSON.stringify(mockCheckoutInfo.account_settings, null, 2));
console.log('');

const result = checkoutService.getAmountAndCurrency(mockCheckoutInfo);

console.log('🎯 Extraction Results:');
console.log('   Amount:', result.amount ? `$${(result.amount / 100).toFixed(2)}` : 'null');
console.log('   Currency:', result.currency);
console.log('   Business URL:', result.businessUrl || 'null');
console.log('   Business Name:', result.businessName || 'null');

if (result.businessName) {
  console.log('\n✅ SUCCESS: Business name extracted like cc script!');
  console.log('   Business Name:', result.businessName);
} else {
  console.log('\n❌ Business name not found');
}

console.log('\n🔍 Priority order (like cc script):');
console.log('   1. account_settings.display_name');
console.log('   2. account_settings.business_profile.name');
console.log('   3. account_settings.business_name');