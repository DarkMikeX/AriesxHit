# AriesxHit - Auto Hitter

Stripe Auto Hitter extension for card checking on billing & checkout pages.

## Structure

```
ext/
├── manifest.json
├── popup.html
├── assets/
│   ├── images/icons/     # Extension icons
│   └── styles/
│       ├── autohitter.css
│       └── popup.css
└── scripts/
    ├── autohitter/       # Active - Auto Hitter
    │   ├── tg-config.js
    │   ├── background.js
    │   ├── core.js       # Injected into page
    │   ├── form-injector.js
    │   ├── auto-fill.js
    │   └── panel-ui.js   # In-page panel
    ├── popup/
    │   └── ui.js
    └── bypasser/         # For future use - not loaded
        ├── core/
        └── content/
```

## Load Extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select `ext` folder

## OTP Login (Telegram)

For Telegram OTP login and hit notifications:
1. Run the backend: `cd backend && npm start`
2. See **`docs/OTP_LOGIN_GUIDE.md`** for the full setup and usage steps
