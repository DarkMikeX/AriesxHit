// Check AriesxHit extension login status
// Run this in browser console (F12) on any webpage

console.log('🔍 Checking AriesxHit Extension Login Status...\n');

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.sendMessage({ type: 'DEBUG_LOGIN_STATUS' }, (response) => {
    if (response && response.ok && response.status) {
      const status = response.status;
      console.log('📊 Login Status Results:');
      console.log('========================');
      console.log('✅ Logged In:', status.is_logged_in ? 'YES' : 'NO');
      console.log('🆔 Telegram ID:', status.telegram_id || 'Not set');
      console.log('👤 Name:', status.telegram_name || 'Not set');
      console.log('🔗 API URL: https://api.mikeyyfrr.me');
      console.log('📤 Hit Notifications:', status.tg_hits_enabled ? 'ENABLED' : 'DISABLED');
      console.log('📸 Auto Screenshot:', status.auto_screenshot ? 'YES' : 'NO');
      console.log('📤 Screenshot to TG:', status.screenshot_tg ? 'YES' : 'NO');
      console.log('📧 Email:', status.email || 'Not set');

      if (status.last_error) {
        console.log('❌ Last Error:', status.last_error);
      }

      console.log('\n🎯 RECOMMENDATIONS:');
      console.log('==================');

      if (!status.is_logged_in) {
        console.log('❌ CRITICAL: You need to log in to the extension first!');
        console.log('   STEP 1: Click the AriesxHit extension icon in your browser');
        console.log('   STEP 2: Click "Login with Telegram" button');
        console.log('   STEP 3: Complete the OTP verification process');
        console.log('   STEP 4: Try hitting again - notifications should work');
        console.log('');
        console.log('💡 If you don\'t see a login option, the extension may not be properly installed');
      } else {
        console.log('✅ You are logged in!');
        if (!status.tg_hits_enabled) {
          console.log('⚠️  Hit notifications are disabled in extension settings');
          console.log('   Go to extension settings to enable hit notifications');
        } else {
          console.log('📱 Hit notifications should work now');
          console.log('   If still not working, check browser console for detailed errors');
        }
      }

      console.log('\n🔧 DEBUGGING STEPS:');
      console.log('===================');
      console.log('1. Open browser Developer Tools (F12)');
      console.log('2. Go to Console tab');
      console.log('3. Look for [CARD_HIT] messages when you hit');
      console.log('4. Check if it says "NOTIFICATION SENT SUCCESSFULLY"');
      console.log('5. If you see errors, share them for troubleshooting');

    } else {
      console.log('❌ Could not communicate with AriesxHit extension.');
      console.log('   Make sure:');
      console.log('   1. AriesxHit extension is installed');
      console.log('   2. Extension is enabled');
      console.log('   3. You\'re on a webpage (not extension page)');
      console.log('   4. Try refreshing the page');
    }
  });
} else {
  console.log('❌ Chrome extension API not available.');
  console.log('   This script must be run in Google Chrome browser.');
  console.log('   Make sure AriesxHit extension is installed and enabled.');
}