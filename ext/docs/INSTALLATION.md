# 🚀 AriesxHit - Installation Guide

Complete step-by-step guide to install and configure AriesxHit Chrome Extension.

---

## 📋 Prerequisites

### **Required:**
- Google Chrome (version 88+) or Chromium-based browser
- Basic understanding of Chrome extensions
- Text editor (VS Code recommended)

### **Optional (for full functionality):**
- Node.js (v16+) for backend API
- MongoDB or MySQL for database
- Domain for backend hosting

---

## 📦 Part 1: Chrome Extension Installation

### **Step 1: Download/Clone Repository**

```bash
# Clone from GitHub
git clone https://github.com/yourusername/ariesxhit.git

# Or download ZIP and extract
```

### **Step 2: Project Structure**

Ensure your folder structure looks like this:

```
chrome-extension/
├── manifest.json
├── popup.html
├── login.html
├── settings.html
├── blocked.html
├── assets/
│   ├── images/
│   └── styles/
└── scripts/
    ├── background/
    ├── popup/
    ├── auth/
    ├── settings/
    ├── core/
    ├── content/
    └── utils/
```

### **Step 3: Configure Backend URL**

Edit `scripts/utils/constants.js`:

```javascript
const CONFIG = {
  API: {
    BASE_URL: 'https://your-backend-api.com/api', // ← CHANGE THIS
    // ...
  }
};
```

Replace `https://your-backend-api.com/api` with your actual backend URL.

**For testing without backend:**
```javascript
BASE_URL: 'http://localhost:3000/api'
```

### **Step 4: Load Extension in Chrome**

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `chrome-extension` folder
5. Extension should now appear in your extensions list

### **Step 5: Pin Extension**

1. Click the puzzle icon (Extensions) in Chrome toolbar
2. Find "AriesxHit"
3. Click the pin icon to pin it to toolbar

---

## 🔧 Part 2: Backend API Setup (Optional but Recommended)

### **Step 1: Install Dependencies**

```bash
cd backend
npm install
```

### **Step 2: Configure Environment**

Create `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_TYPE=mongodb  # or mysql
DB_HOST=localhost
DB_PORT=27017
DB_NAME=ariesxhit
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=chrome-extension://your-extension-id

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
```

### **Step 3: Setup Database**

**For MongoDB:**
```bash
# Install MongoDB locally or use MongoDB Atlas
# Create database: ariesxhit
```

**For MySQL:**
```bash
# Create database
CREATE DATABASE ariesxhit;

# Run migrations (provided in /backend/migrations/)
```

### **Step 4: Start Backend Server**

```bash
npm start

# Or for development with auto-reload:
npm run dev
```

Server should start on: `http://localhost:3000`

### **Step 5: Verify Backend**

Test API endpoint:
```bash
curl http://localhost:3000/api/health
# Should return: {"status": "ok"}
```

---

## 👥 Part 3: Admin Panel Setup (Optional)

### **Step 1: Install Dependencies**

```bash
cd admin-panel
npm install
```

### **Step 2: Configure API URL**

Edit `admin-panel/src/config.js`:

```javascript
export const API_URL = 'http://localhost:3000/api';
```

### **Step 3: Start Admin Panel**

```bash
npm start
```

Admin panel opens at: `http://localhost:3001`

### **Step 4: Login as Admin**

Use credentials from backend `.env`:
- Username: `admin`
- Password: (set in `.env`)

---

## 🔐 Part 4: Registration Site Setup (Optional)

### **Step 1: Install Dependencies**

```bash
cd fingerprint-site
npm install
```

### **Step 2: Configure API URL**

Edit `fingerprint-site/src/config.js`:

```javascript
export const API_URL = 'http://localhost:3000/api';
```

### **Step 3: Start Registration Site**

```bash
npm start
```

Opens at: `http://localhost:3002`

---

## ✅ Part 5: Testing the Installation

### **Test 1: Extension Opens**

1. Click AriesxHit extension icon
2. Should see login page
3. No errors in console (F12)

### **Test 2: Login (Without Backend)**

Extension will work in **"offline mode"** without backend:
- Login page will show
- But authentication won't work
- Settings and UI will function

### **Test 3: Login (With Backend)**

1. Register a test user via registration site
2. Admin approves user in admin panel
3. User logs in via extension
4. Should see main popup interface

### **Test 4: Stripe Detection**

1. Navigate to: `https://checkout.stripe.com/test`
2. Extension should detect Stripe page
3. Notification should appear

### **Test 5: Auto Hit (Basic)**

1. Open extension popup
2. Enter BIN: `456789`
3. Click "Auto Hit" toggle
4. Should turn yellow/active

---

## 🐛 Troubleshooting

### **Issue: Extension won't load**

**Solution:**
- Check manifest.json for syntax errors
- Ensure all file paths are correct
- Check Chrome console for errors

### **Issue: "Failed to fetch" errors**

**Solution:**
- Backend not running
- CORS not configured properly
- Wrong API URL in constants.js

### **Issue: Login fails**

**Solution:**
- Backend not running
- Database not connected
- Wrong credentials
- Fingerprint mismatch

### **Issue: Auto Hit not working**

**Solution:**
- Not on Stripe checkout page
- Debugger permission denied
- No cards/BIN provided
- Permission not granted by admin

### **Issue: Bypass not working**

**Solution:**
- Bypass toggle not enabled
- Not on Stripe page
- Bypass permission not granted
- Script injection blocked

---

## 📝 Configuration Options

### **Change Extension Name**

Edit `manifest.json`:
```json
{
  "name": "Your Custom Name",
  "description": "Your custom description"
}
```

### **Change Extension Icon**

Replace files in `assets/images/icons/`:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

### **Change Wallpaper Presets**

Edit `scripts/config/wallpaper-presets.js` to add/modify presets.

### **Change Default Settings**

Edit `scripts/utils/constants.js`:
```javascript
WALLPAPER: {
  DEFAULT_BLUR: 60,        // Change default blur
  DEFAULT_DARKNESS: 50,    // Change default darkness
  MAX_FAVORITES: 10        // Change max favorites
}
```

---

## 🔄 Updating the Extension

### **Step 1: Pull Updates**

```bash
git pull origin main
```

### **Step 2: Reload Extension**

1. Go to `chrome://extensions/`
2. Find AriesxHit
3. Click refresh icon

Or click "Update" button if available.

---

## 🗑️ Uninstallation

### **Remove Extension**

1. Go to `chrome://extensions/`
2. Find AriesxHit
3. Click "Remove"
4. Confirm removal

### **Clean Up Data**

Extension data is stored in:
- Chrome storage (cleared on removal)
- Backend database (must delete manually)

To clear backend data:
```bash
# MongoDB
db.users.deleteMany({})

# MySQL
DELETE FROM users;
```

---

## 🆘 Getting Help

### **Documentation**
- README.md - Overview
- INSTALLATION.md - This file
- API.md - API documentation

### **Support Channels**
- GitHub Issues: [Report bugs](https://github.com/yourusername/ariesxhit/issues)
- Email: support@yourproject.com
- Telegram: @yourusername

### **Debug Mode**

Enable detailed logging:

Edit `scripts/utils/constants.js`:
```javascript
DEBUG: true  // Add this line
```

Then check console for detailed logs.

---

## ✨ Next Steps

After installation:

1. **Register Users**: Use registration site
2. **Approve Users**: Use admin panel
3. **Test Features**: Test Auto Hit and Bypass
4. **Customize UI**: Change wallpapers and settings
5. **Deploy Backend**: Deploy to production server

---

## 📄 License

MIT License - See LICENSE file for details.

---

**Installation complete!** 🎉

You can now use AriesxHit for authorized Stripe payment testing.

Remember: Only use on systems you own or have permission to test.