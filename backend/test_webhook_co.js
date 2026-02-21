// Test the webhook directly with a /co command
const https = require('https');
const http = require('http');

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          resolve({ raw: body, error: e.message, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testWebhookCo() {
  console.log('🧪 Testing Webhook /co Command\n');

  const webhookData = {
    "update_id": 659056855,
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
      "date": 1771620915,
      "text": "/co https://checkout.stripe.com/c/pay/cs_live_a1txHx0Y0BwISoAGSVwbtsbSfZBiFNFLANHCit88poDic4dERV8A5EJMbw#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl\n379363037405821|02|28|2989\n379363037147860|05|27|6227",
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

  try {
    console.log('Sending webhook request...');
    const response = await makeRequest('http://localhost:3001/api/tg/webhook', {
      method: 'POST'
    }, webhookData);

    console.log('Webhook response:', response);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWebhookCo();