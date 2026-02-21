// Test both /co command formats
const http = require('http');

// Test format 1: URL and cards on same line
const testFormat1 = {
  "update_id": 659056858,
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
    "date": 1771678693,
    "text": "/co https://checkout.stripe.com/c/pay/cs_live_a1txHx0Y0BwISoAGSVwbtsbSfZBiFNFLANHCit88poDic4dERV8A5EJMbw#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl 379363037405821|02|28|2989 379363037147860|05|27|6227",
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

// Test format 2: URL on first line, cards on separate lines
const testFormat2 = {
  "update_id": 659056859,
  "message": {
    "message_id": 1490,
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
    "date": 1771678694,
    "text": "/co https://checkout.stripe.com/c/pay/cs_live_a1GzWn9pfqI1Ng4hQ11aDwX0vPhLIlR48CTV0oYWDEVAJBGgh3ucjQ5Pdf#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmRkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl\n379363037076960|01|2027|4996\n379363037569253|06|2031|7905\n379363037074361|03|2028|8166\n379363037367450|08|2027|2075\n379363037872764|05|2030|2336\n379363037365876|02|2027|2597\n379363037878167|07|2026|5506\n379363037363277|04|2029|5767\n379363037876369|09|2028|8676\n379363037169674|06|2031|8937",
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

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/tg/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(testFormat1))
  }
};

console.log('🧪 Testing /co command with both formats...\n');

function testFormat(testData, formatName) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`📡 ${formatName} - Webhook response status: ${res.statusCode}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`${formatName} - Response body length: ${data.length}`);
        if (data.trim() === '') {
          console.log(`✅ ${formatName} - Empty response (expected for webhooks)`);
        } else {
          console.log(`⚠️ ${formatName} - Got response data`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ ${formatName} - Request failed: ${e.message}`);
      resolve();
    });

    req.write(JSON.stringify(testData));
    req.end();
  });
}

async function runTests() {
  console.log('Test 1: Single line format (/co <url> <card1> <card2>)');
  await testFormat(testFormat1, 'Format 1');

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\nTest 2: Multi-line format (/co <url> \\n <card1> \\n <card2>)');
  await testFormat(testFormat2, 'Format 2');

  console.log('\n✅ Both format tests completed!');
}

runTests();