// ===================================
// Telegram Bot & Auth Config
// Set your backend URL here – users never see this. All TG flows use this.
// ===================================

const TGConfig = {
  BOT_URL: 'https://98b2-103-173-243-124.ngrok-free.app',  // Change to your production URL when deploying
  BOT_USERNAME: 'AriesxHitBot',      // Your bot username (without @) for Get Token link
  ENDPOINTS: {
    SEND_OTP: '/api/tg/send-otp',
    VERIFY: '/api/tg/verify',
    NOTIFY_HIT: '/api/tg/notify-hit',
  },
  getUrl(path) {
    return this.BOT_URL + path;
  },
};
