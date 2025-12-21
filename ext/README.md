# 🔥 AriesxHit - Auto Checker v2.0

> **Stripe Auto Checker with CVV Bypass - Permission-Based Access Control**

A professional Chrome extension for Stripe payment testing with advanced features including device fingerprinting, permission-based access control, and customizable UI.

---

## 📋 Features

### 🔐 **Security & Authentication**
- **Triple Authentication**: Username + Password + Device Fingerprint
- **Device Fingerprinting**: SHA-256 hash prevents account sharing
- **JWT Token System**: Secure session management
- **Permission-Based Access**: Admin controls who can use which features
- **User Approval Workflow**: All users must be approved by admin

### ⚡ **Core Functionality**
- **Auto Hit Mode**: Automatically test multiple cards on Stripe checkouts
  - BIN generation support
  - Card list rotation (up to 10 cards)
  - Auto-retry on decline
  - Live logging of attempts
  
- **Bypass Mode**: CVV removal from Stripe requests
  - Intercepts Fetch/XHR/SendBeacon
  - Removes CVV parameters automatically
  - Works with JSON and URL-encoded formats

### 🎨 **User Interface**
- **Dark Glassy Theme**: Cyberpunk-inspired UI with glassmorphism
- **Live Logs**: Real-time feedback with color-coded messages
- **Wallpaper Customization**:
  - 10 preset wallpapers
  - Custom URL support
  - Blur intensity control (0-100%)
  - Darkness overlay control (0-100%)
  - Favorites system (save up to 10)

### 🔍 **Stripe Detection**
- Automatic checkout page detection
- Submit button tracking
- Multi-frame support
- Visual notifications

---

## 📁 Project Structure

```
chrome-extension/
├── manifest.json
├── popup.html
├── login.html
├── settings.html
├── blocked.html
│
├── assets/
│   ├── images/icons/
│   ├── wallpapers/
│   └── styles/
│       ├── popup.css
│       ├── login.css
│       ├── settings.css
│       └── common.css
│
└── scripts/
    ├── background/
    │   └── background.js          # Service worker with permission gates
    │
    ├── popup/
    │   ├── popup.js               # Main popup logic
    │   ├── toggles.js             # Auto Hit/Bypass toggles
    │   ├── logger.js              # Live logs
    │   ├── inputs.js              # BIN/Proxy/CC inputs
    │   └── wallpaper.js           # Wallpaper manager
    │
    ├── auth/
    │   └── login.js               # Login handler
    │
    ├── settings/
    │   └── settings.js            # Settings page logic
    │
    ├── core/
    │   └── bypass.js              # CVV bypass engine
    │
    ├── content/
    │   ├── stripe-detector.js     # Detect Stripe pages
    │   ├── form-injector.js       # Inject bypass script
    │   ├── auto-fill.js           # Auto-fill forms
    │   └── response-interceptor.js # Response handling
    │
    └── utils/
        ├── constants.js           # Configuration
        ├── validators.js          # Input validation
        ├── storage.js             # Chrome storage wrapper
        ├── formatters.js          # Data formatting
        ├── api-client.js          # Backend API
        └── crypto.js              # Fingerprinting & SHA-256
```

---

## 🚀 Installation

### 1. **Clone Repository**
```bash
git clone https://github.com/yourusername/ariesxhit.git
cd ariesxhit/chrome-extension
```

### 2. **Update Backend URL**
Edit `scripts/utils/constants.js`:
```javascript
API: {
  BASE_URL: 'https://your-backend-api.com/api', // Change this
  // ...
}
```

### 3. **Load Extension**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

---

## 🔧 Configuration

### **Backend API Setup**
The extension requires a backend API for authentication. See `/backend` folder for Node.js implementation.

Required endpoints:
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify` - Token verification
- `GET /api/users/me` - Get user data

### **Admin Panel Setup**
The admin panel is used to approve users and set permissions. See `/admin-panel` folder for React implementation.

### **Registration Site Setup**
Users register via a separate site that collects device fingerprints. See `/fingerprint-site` folder.

---

## 📖 Usage

### **1. User Registration**
1. User visits registration site
2. Enters desired username
3. System collects device fingerprint automatically
4. Request sent to backend as "PENDING"
5. User waits for admin approval

### **2. Admin Approval**
1. Admin logs into admin panel
2. Views pending users
3. Approves user and sets:
   - Password
   - Permissions (Auto Hit, Bypass)
4. User status changes to "ACTIVE"

### **3. Login**
1. User opens extension
2. Enters username + password
3. System verifies:
   - Credentials
   - Device fingerprint
   - Account status
4. If approved, user can access features

### **4. Using Auto Hit**
1. Navigate to Stripe checkout page
2. Open extension popup
3. Enter either:
   - **BIN**: `456789` (generates cards)
   - **Card List**: One card per line
     ```
     4111111111111111|12|2025|123
     4222222222222222|01|2026|456
     ```
4. (Optional) Enter proxy: `192.168.1.1:8080`
5. Click "Auto Hit" toggle
6. Extension detects page and injects cards automatically
7. Live logs show:
   - Card attempts
   - Responses
   - Hits/Declines

### **5. Using Bypass Mode**
1. Click "Bypass" toggle
2. CVV removal activates
3. All Stripe requests will have CVV removed
4. Useful for testing CVV-optional flows

---

## 🔐 Permission System

### **Permission Types**
- **Auto Hit**: Allows card testing functionality
- **Bypass**: Allows CVV removal functionality

### **Access Control**
```javascript
// Example: Check if user has permission
const permissions = await Storage.getPermissions();

if (permissions.auto_hit) {
  // User can use Auto Hit
} else {
  // Show "Access Denied"
}
```

### **Permission Gates**
All features are locked behind permission checks:
- Background script validates before executing
- UI disables buttons if no permission
- Blocked page shown if account not approved

---

## 🎨 Customization

### **Wallpaper Presets**
10 built-in presets:
- Cyber City
- Anime Sunset
- Abstract Waves
- Dark Matter
- Neon Lights
- Matrix Rain
- Purple Galaxy
- Blue Circuit
- Red Horizon
- Green Code

### **Custom Wallpapers**
1. Go to Settings
2. Enter image URL
3. Click "Preview" to test
4. Click "Apply" to set
5. Adjust blur and darkness sliders
6. Save to favorites (up to 10)

---

## 📊 Logging System

### **Log Types**
- **Info** (Grey): System messages
- **Success** (Green): Successful operations, hits
- **Error** (Red): Failures, declines
- **Warning** (Yellow): Warnings

### **Log Format**
```
HH:MM:SS Message text
```

### **Features**
- Real-time updates
- Last 100 entries shown
- Auto-scroll to top
- Clear logs button
- Persistent storage (500 entries)

---

## 🛠️ Development

### **Testing**
1. Load extension in Chrome
2. Open DevTools (F12)
3. Check console for logs: `[AriesxHit]`
4. Test on: `https://checkout.stripe.com/test`

### **Debug Mode**
Check console logs:
```javascript
console.log('[AriesxHit] Your message here');
```

### **Storage Inspection**
```javascript
// In DevTools console
chrome.storage.local.get(null, console.log);
```

---

## ⚠️ Legal Disclaimer

**This tool is for authorized testing only.**

✅ **Legitimate Use:**
- Testing your own payment systems
- Quality assurance for e-commerce sites
- Security research (with permission)
- Educational purposes (controlled environment)

❌ **Illegal Use:**
- Testing stolen credit cards
- Unauthorized access to payment systems
- Fraudulent transactions
- Any illegal activities

**By using this extension, you agree to:**
- Only test on systems you own or have permission to test
- Follow all applicable laws and regulations
- Not use for fraudulent purposes
- Take full responsibility for your actions

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📞 Support

For issues or questions:
- GitHub Issues: [github.com/yourusername/ariesxhit/issues](https://github.com)
- Email: support@yourproject.com
- Telegram: @yourusername

---

## 🎯 Roadmap

- [x] Basic authentication
- [x] Auto Hit functionality
- [x] Bypass mode (CVV removal)
- [x] Wallpaper customization
- [x] Live logging
- [ ] Multi-gateway support (PayPal, Square, etc.)
- [ ] Advanced analytics
- [ ] Team collaboration features
- [ ] API access

---

## 💡 Tips

1. **Use Proxy**: Always use proxy for testing
2. **Clear Logs**: Regularly clear logs to save space
3. **Check Permissions**: Ensure you have required permissions
4. **Update Backend URL**: Don't forget to update API endpoint
5. **Backup Favorites**: Export favorite wallpapers

---

## 🔥 Credits

**Created by:** AriesxHit Team  
**Version:** 2.0.0  
**Last Updated:** 2024

---

**⭐ Star this repo if you found it useful!**