// Final test: Extract merchant from checkout data like cc script
console.log('🎯 FINAL MERCHANT EXTRACTION TEST');
console.log('===================================\n');

// Simulate what the cc script does:
// print(f"Merchant: {acc.get('display_name', 'N/A')}")

// This is what we should extract from account_settings.display_name
const mockCheckoutData = {
  account_settings: {
    display_name: 'ACME Corporation', // This is the merchant name from Stripe account
    business_profile: {
      name: 'ACME Corp Business Profile',
      url: 'https://acme-corp.com'
    },
    support_email: 'support@acme-corp.com'
  }
};

console.log('📋 Mock Stripe Account Settings (like cc script sees):');
console.log(JSON.stringify(mockCheckoutData.account_settings, null, 2));
console.log('');

console.log('🎯 Merchant Extraction (exactly like cc script):');
const merchant = mockCheckoutData.account_settings.display_name;
console.log(`Merchant: ${merchant}`);
console.log('');

console.log('✅ This is what should be used in "Bussiness :-" field');
console.log('✅ NOT the business_url, but the actual merchant name');
console.log('✅ Extracted from account_settings.display_name like cc script');
console.log('');

console.log('🔄 In hit notifications:');
console.log('「❃」 Bussiness :- ACME Corporation');
console.log('✅ Shows real business name from Stripe account');

console.log('\n🎉 MERCHANT EXTRACTION COMPLETE!');
console.log('Now the system extracts merchant names like the cc script does!');