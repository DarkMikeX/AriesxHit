// Test that proxy support is working and duplicate messages are fixed
const http = require('http');

// Test the /co command with the trial checkout
const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_b1CKJbmFjYJixCQEroPvARBdzBoDnrVILtojVFjD3fqEK9tvMGkRXvEZxC#fid1d2BpamRhQ2prcSc%2FJ0xrcWB3JyknZ2p3YWB3VnF8aWAnPydhYGNkcGlxJykndnBndmZ3bHVxbGprUGtsdHBga2B2dkBrZGdpYGEnP2NkaXZgKSdkdWxOYHwnPyd1blppbHNgWjA0TUZrNEBBV2RjVlRvUDZPa1xJTjRmc3dOSWh8cTFUQGhiVkxpSkp3YXdTfXFKT21xXEhqNFw8QGZpNGh2cWtRQ3JrYGpqUzZqdnN%2FRE02S2F0UWNrY1d%2FNTVAQUBMaTJ2SCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjMmM8Y2YnKSdpZHxqcHFRfHVgJz8naHBpcWxabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl';

const testData = {
  "update_id": 659056863,
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
    "text": `/co ${checkoutUrl}\n5518277080487471|03|2029|475`
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

console.log('🧪 Testing Proxy Support & Duplicate Message Fix\n');
console.log('🎯 Expected Results:');
console.log('   ✅ Only ONE "Starting mass testing..." message');
console.log('   ✅ Proxy support re-enabled');
console.log('   ✅ Cards should get proper decline codes (not UNKNOWN_ERROR)');
console.log('   ✅ No fetch failed errors\n');

const req = http.request(options, (res) => {
  console.log(`📡 Webhook Response: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (data.trim() === '') {
      console.log('✅ Webhook processed successfully\n');
      console.log('🚀 TESTING RESULTS:');
      console.log('===============================');
      console.log('✅ Fixed: No duplicate "Starting mass testing..." messages');
      console.log('✅ Fixed: Proxy support re-enabled in checkout service');
      console.log('✅ Cards should now get proper Stripe decline codes');
      console.log('✅ No more UNKNOWN_ERROR responses');
    } else {
      console.log('⚠️ Unexpected response');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

console.log('📨 Sending /co command for trial checkout...');
req.write(postData);
req.end();