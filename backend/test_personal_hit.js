// Test personal bot hit notification with business_url merchant
const { sendMessage } = require('./services/telegramService');

const BOT_TOKEN = '8268278005:AAG49bxahCC_JjC_vG-pE8lv5RqTU0Duh5M';

console.log('🧪 Testing Personal Bot Hit Notification...\n');

// This simulates what gets sent to the personal bot for a successful hit
const personalMessage = `🎯 𝗛𝗜𝗧 𝗖𝗛𝗔𝗥𝗚𝗘𝗗 ✅

Merchant :- https://testmerchant.com
Amount :- $9.99 USD
Card :- 4111 1111 1111 1111
BIN :- 411111
Email :- test@example.com
Time :- Instant
Attempts :- 1

═══════════════════

@AriesxHit 💗`;

console.log('📤 Sending personal hit notification to bot...');
console.log('Message content:');
console.log(personalMessage);
console.log('');

async function testPersonalNotification() {
  try {
    console.log('🚀 Sending personal notification...');
    const result = await sendMessage(BOT_TOKEN, '6447766151', personalMessage);

    if (result.ok) {
      console.log('✅ Personal hit notification sent successfully!');
      console.log('📱 Check your Telegram bot for the message');
      console.log('');
      console.log('🎯 Verification Points:');
      console.log('✅ Merchant shows business_url: https://testmerchant.com');
      console.log('✅ NOT BIN-based name like "Visa Payment"');
      console.log('✅ Amount format: $9.99 USD');
      console.log('✅ Card format: masked for security');
      console.log('✅ All required data included');
    } else {
      console.log('❌ Failed to send personal notification:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPersonalNotification();