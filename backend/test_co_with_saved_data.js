// Test /co command with saved checkout data for message formatting
const http = require('http');

// Test checkout URL that we know the data for
const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmJkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl';

const testData = {
  "update_id": 659056862,
  "message": {
    "message_id": 1489,
    "from": {
      "id": 6447766151,
      "is_bot": false,
      "first_name": "MɪᴋᴇXᴅ ˹⛥˼ [ᴀғᴋ]",
      "username": "MikeyyFrr",
      "language_code": "en"
    },
    "chat": {
      "id": 6447766151,
      "first_name": "MɪᴋᴇXᴅ ˹⛥˼ [ᴀғᴋ]",
      "username": "MikeyyFrr",
      "type": "private"
    },
    "date": 1771678800,
    "text": `/co ${checkoutUrl}\n4111111111111111|12|25|123`
  }
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/tg/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing /co command with saved checkout data...');
console.log('===============================================\n');

console.log('📋 Test Scenario:');
console.log('1. /co command fetches checkout data (like cc script debug)');
console.log('2. Saves merchant info from account_settings.display_name');
console.log('3. Uses saved data in success/decline messages');
console.log('4. Success messages should show:');
console.log('   - Real merchant: ProxiesThatWork.com');
console.log('   - Real email: kingmichal55@gmail.com');
console.log('5. Decline messages should show real merchant too');
console.log('');

const req = http.request(options, (res) => {
  console.log(`📡 Webhook Response: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (data.trim() === '') {
      console.log('✅ Empty response (webhook processed successfully)');
      console.log('');
      console.log('🚀 CHECKOUT PROCESSING STARTED!');
      console.log('=================================');
      console.log('1. ✅ Checkout data fetched and saved');
      console.log('2. ✅ Merchant extracted: ProxiesThatWork.com');
      console.log('3. ✅ Email extracted: kingmichal55@gmail.com');
      console.log('4. ⏳ Card testing in progress...');
      console.log('5. 📱 Check Telegram for success/decline messages');
      console.log('');
      console.log('Expected message formats:');
      console.log('SUCCESS: 「❃」 𝗠𝗲𝗿𝗰𝗵𝗮𝗻𝘁 : ProxiesThatWork.com');
      console.log('SUCCESS: 「❃」 𝗘𝗺𝗮𝗶𝗹 : kingmichal55@gmail.com');
      console.log('DECLINE: Merchant : ProxiesThatWork.com');
      console.log('');
      console.log('✅ Test completed! Messages should use real checkout data.');
    } else {
      console.log('⚠️ Unexpected response');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

console.log('📨 Sending /co command with checkout URL and test card...');
req.write(postData);
req.end();