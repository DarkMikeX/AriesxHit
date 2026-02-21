// Test the sendMessage function directly
const { sendMessage } = require('./services/telegramService');

const BOT_TOKEN = '8268278005:AAG49bxahCC_JjC_vG-pE8lv5RqTU0Duh5M';

async function testSendMessage() {
  console.log('🧪 Testing sendMessage function\n');

  try {
    console.log('Testing sendMessage to chat 6447766151...');
    const result = await sendMessage(BOT_TOKEN, '6447766151', '🧪 <b>Test Message</b>\n\nThis is a test from the backend server.');

    console.log('sendMessage result:', result);

    if (result.ok) {
      console.log('✅ Message sent successfully!');
    } else {
      console.log('❌ Message failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSendMessage();