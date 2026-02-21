// Test sending HTML message directly
const { sendMessage } = require('./services/telegramService');

const BOT_TOKEN = '8268278005:AAG49bxahCC_JjC_vG-pE8lv5RqTU0Duh5M';

async function testHTMLMessage() {
  console.log('🧪 Testing HTML message...');

  const longMessage = `🔥 <b>ARIESXHIT CHECKOUT TESTER</b> 🔥\n` +
    `═══════════════════════════════════════\n\n` +
    `🎯 <b>Target:</b> Stripe Checkout\n` +
    `💳 <b>Cards Loaded:</b> 2\n` +
    `🔗 <b>Checkout URL:</b> https://checkout.stripe.com/c/pay/cs_live_...\n` +
    `🛡️ <b>Proxy:</b> p.webshare.io:80\n\n` +
    `⚡ <b>Starting mass testing...</b>\n` +
    `📊 <b>Results will be sent individually</b>\n\n` +
    `═══════════════════════════════════════`;

  console.log('Message length:', longMessage.length);

  try {
    console.log('Sending HTML message...');
    const result = await sendMessage(BOT_TOKEN, '6447766151', longMessage);

    console.log('HTML message result:', result);

    if (result.ok) {
      console.log('✅ HTML message sent successfully!');
    } else {
      console.log('❌ HTML message failed:', result.error);
    }

  } catch (error) {
    console.error('❌ HTML test failed with exception:', error.message);
    console.error('Stack:', error.stack);
  }
}

testHTMLMessage();