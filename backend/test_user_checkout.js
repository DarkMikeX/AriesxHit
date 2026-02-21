// Test the checkout with user's provided URL and cards
const http = require('http');

const webhookData = {
  "update_id": 659056860,
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
    "text": "/co https://checkout.stripe.com/c/pay/cs_live_a1XK8oN2e4zucEF2eFwPFFPF23vQgYv2xQIOMl1x6uswpprDt0wFxpOZcn#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl\n379363037256984|07|2026|5338\n379363037749095|04|2029|5599\n379363037254385|09|2028|8508\n379363037747495|06|2031|8769\n379363037050502|03|2028|9030\n379363037545899|08|2027|2939\n379363037058901|05|2030|3200\n379363037543290|10|2029|6109\n379363037056301|07|2026|6370\n379363037549495|12|2031|9279",
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

console.log('🧪 Testing checkout with user-provided data...');
console.log('Checkout URL: https://checkout.stripe.com/c/pay/cs_live_a1XK8oN2e4zucEF2eFwPFFPF23vQgYv2xQIOMl1x6uswpprDt0wFxpOZcn');
console.log('Cards: 10 cards provided');
console.log('Proxy: p.webshare.io:80:kumldkme-rotate:uz047zho9ipr');
console.log('');

const req = http.request(options, (res) => {
  console.log(`📡 Webhook response status: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📨 Webhook response body:', data);

    if (data.trim() === '') {
      console.log('✅ Empty response (expected for webhooks) - checkout processing started in background');
      console.log('');
      console.log('🎯 Checkout testing initiated!');
      console.log('📊 Results will be sent to Telegram bot individually for each card');
      console.log('⏳ Processing 10 cards through proxy...');
    } else {
      try {
        const jsonResponse = JSON.parse(data);
        console.log('✅ Parsed response:', JSON.stringify(jsonResponse, null, 2));
      } catch (e) {
        console.log('⚠️ Response is not valid JSON');
      }
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

req.write(postData);
req.end();