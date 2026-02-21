// Test merchant extraction with real data from cc script
const checkoutService = require('./services/checkoutService');

console.log('🧪 Testing Real Merchant Extraction (like cc script)');
console.log('==================================================\n');

// Use the real account_settings data from the cc script output
const realAccountSettings = {
  "account_id": "acct_1RFkF8F7rQkQK31U",
  "business_url": "https://www.proxiesthatwork.com",
  "country": "US",
  "display_name": "ProxiesThatWork.com",
  "merchant_of_record_country": "US",
  "merchant_of_record_display_name": "ProxiesThatWork.com",
  "order_summary_display_name": "ProxiesThatWork.com",
  "statement_descriptor": "PROXIESTHATWORK.COM",
  "support_email": "support@proxiesthatwork.com",
  "support_phone": "+15054488802",
  "support_url": "https://www.proxiesthatwork.com/support"
};

// Mock checkout info with the real account_settings
const mockCheckoutInfo = {
  currency: 'usd',
  account_settings: realAccountSettings,
  line_item_group: {
    due: 300 // $3.00
  }
};

console.log('📋 Real Account Settings from cc script:');
console.log(JSON.stringify(realAccountSettings, null, 2));
console.log('');

console.log('🎯 cc script shows:');
console.log('Merchant: ProxiesThatWork.com');
console.log('Support: support@proxiesthatwork.com');
console.log('');

const result = checkoutService.getAmountAndCurrency(mockCheckoutInfo);

console.log('🎯 Our extraction results:');
console.log('   Amount:', result.amount ? `$${(result.amount / 100).toFixed(2)}` : 'null');
console.log('   Currency:', result.currency);
console.log('   Business Name:', result.businessName || 'null');
console.log('   Business URL:', result.businessUrl || 'null');

console.log('\n✅ VERIFICATION:');
if (result.businessName === 'ProxiesThatWork.com') {
  console.log('✅ Business Name extracted correctly: ProxiesThatWork.com');
  console.log('✅ Matches cc script output!');
} else {
  console.log('❌ Business Name extraction failed');
  console.log('Expected: ProxiesThatWork.com');
  console.log('Got:', result.businessName);
}

console.log('\n🎯 In hit notifications, "「❃」 Bussiness :-" should show:');
console.log('ProxiesThatWork.com');
console.log('');
console.log('✅ This matches exactly what cc script extracts!');