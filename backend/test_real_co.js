// Test the /co command with real data
const http = require('http');

const webhookData = {
  "update_id": 659056856,
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
    "date": 1771677608,
    "text": "/co https://checkout.stripe.com/c/pay/cs_live_a1txHx0Y0BwISoAGSVwbtsbSfZBiFNFLANHCit88poDic4dERV8A5EJMbw#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl\n4111111111111111|12|25|123\n4222222222222222|01|26|456",
    "entities": [
      {
        "offset": 0,
        "length": 3,
        "type": "bot_command"
      },
      {
        "offset": 4,
        "length": 487,
        "type": "url"
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

console.log('🧪 Testing real /co command with webhook...');
console.log('Sending webhook request with checkout URL and 2 cards...');

const req = http.request(options, (res) => {
  console.log(`Webhook response status: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Webhook response body:', data);
    if (data.trim() === '') {
      console.log('❌ Empty response body (this is the bug)');
    } else {
      console.log('✅ Got response data');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

req.write(postData);
req.end();