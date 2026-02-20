// Telegram Bot Polling Script for Local Development
// This polls for updates instead of using webhooks

const https = require('https');
const http = require('http');

const BOT_TOKEN = '8268278005:AAG49bxahCC_JjC_vG-pE8lv5RqTU0Duh5M';
const API_BASE = 'http://localhost:3001';

let lastUpdateId = 0;

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

async function getUpdates() {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
    console.log(`[POLLING] Checking for updates... (last: ${lastUpdateId})`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.ok && data.result.length > 0) {
      console.log(`[POLLING] Received ${data.result.length} updates`);

      for (const update of data.result) {
        await processUpdate(update);
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
      }
    }

  } catch (error) {
    console.error('[POLLING] Error getting updates:', error.message);
  }
}

async function processUpdate(update) {
  try {
    console.log('[POLLING] Processing update:', JSON.stringify(update, null, 2));

    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;

      console.log(`[POLLING] Message from ${message.from.first_name}: ${text}`);

      // Forward the message to our webhook handler
      const webhookUrl = `${API_BASE}/api/tg/webhook`;
      const webhookData = {
        update_id: update.update_id,
        message: message
      };

      console.log('[POLLING] Forwarding to webhook:', webhookUrl);

      const response = await makeRequest(webhookUrl, {
        method: 'POST'
      }, webhookData);

      console.log('[POLLING] Webhook response:', response);

    } else {
      console.log('[POLLING] Update type not handled:', Object.keys(update));
    }

  } catch (error) {
    console.error('[POLLING] Error processing update:', error);
  }
}

async function startPolling() {
  console.log('🤖 Starting Telegram Bot Polling...');
  console.log('Bot Token:', BOT_TOKEN.substring(0, 20) + '...');
  console.log('Webhook URL:', API_BASE + '/api/tg/webhook');

  // Test webhook endpoint first
  try {
    const testResponse = await makeRequest(`${API_BASE}/api/tg/webhook`, {
      method: 'POST'
    }, { test: true });
    console.log('✅ Webhook endpoint reachable');
  } catch (error) {
    console.log('❌ Webhook endpoint not reachable:', error.message);
    return;
  }

  // Start polling loop
  while (true) {
    await getUpdates();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
  }
}

startPolling().catch(console.error);