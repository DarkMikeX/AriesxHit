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
      console.log('🔗 API URL:', status.api_url);
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
        console.log('❌ You need to log in to the extension first!');
        console.log('   1. Click the AriesxHit extension icon');
        console.log('   2. Click "Login with Telegram"');
        console.log('   3. Complete the OTP verification');
      } else {
        console.log('✅ You are logged in!');
        if (!status.tg_hits_enabled) {
          console.log('⚠️  Hit notifications are disabled in settings');
        }
        console.log('📱 Hit notifications should work now');
      }
    } else {
      console.log('❌ Could not get extension status. Make sure AriesxHit extension is installed and enabled.');
    }
  });
} else {
  console.log('❌ Chrome extension API not available. Make sure you\'re running this in a Chrome browser with the AriesxHit extension installed.');
}