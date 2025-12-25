# 🔥 AriesxHit Fingerprint Registration Site

> **Device Registration Portal** - Collect device fingerprints and register users for AriesxHit extension access.

## 📋 Overview

This React application serves as the registration portal for AriesxHit. Users visit this site to:
1. Register their device with a unique fingerprint
2. Submit registration information (username, email, telegram)
3. Check their approval status
4. Get notified when approved

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure backend URL
cp .env.example .env
# Edit .env and set REACT_APP_API_URL=http://localhost:3000/api

# 3. Start development server
npm start
```

Visit **http://localhost:3000** in your browser.

## 📁 Project Structure

```
fp/
├── public/              # Static files
│   └── index.html      # HTML template
├── src/
│   ├── components/     # React components
│   │   ├── RegistrationForm.jsx
│   │   ├── FingerprintCollector.jsx
│   │   ├── PendingStatus.jsx
│   │   ├── SuccessMessage.jsx
│   │   ├── ErrorMessage.jsx
│   │   └── LoadingSpinner.jsx
│   ├── config/         # Configuration
│   │   └── api-config.js
│   ├── utils/          # Utilities
│   │   ├── api.js       # API calls
│   │   ├── fingerprint.js  # Fingerprint generation
│   │   └── validators.js   # Form validation
│   ├── styles/         # CSS files
│   │   ├── global.css
│   │   ├── components.css
│   │   └── responsive.css
│   ├── App.js          # Main app component
│   └── index.js        # Entry point
├── .env.example        # Environment variables template
├── package.json        # Dependencies
└── README.md          # This file
```

## 🔌 API Integration

The site communicates with the backend API:

### Endpoints Used

1. **POST `/api/auth/register`**
   - Register new user
   - Body: `{ username, email, telegram, fingerprint_hash }`

2. **POST `/api/auth/check`**
   - Check if fingerprint exists
   - Body: `{ fingerprint_hash }`

3. **GET `/api/auth/status`**
   - Get user status by fingerprint
   - Header: `X-Fingerprint: <hash>`

## 🎨 Features

- ✅ **Custom Fingerprint Generation**
  - Uses Canvas, WebGL, Audio, Fonts, and browser APIs
  - Generates SHA-256 hash for unique device identification

- ✅ **Beautiful UI**
  - Dark theme with glassmorphism effects
  - Smooth animations and transitions
  - Responsive design (mobile + desktop)

- ✅ **Smart Status Management**
  - Auto-checks registration status
  - Auto-refreshes every 30 seconds when pending
  - Shows appropriate UI based on status

- ✅ **Form Validation**
  - Real-time validation
  - User-friendly error messages
  - Input sanitization

## 🔐 Security

- Fingerprint stored in localStorage (not sent to server until registration)
- All API calls include fingerprint in headers
- CORS protection handled by backend
- Rate limiting on backend endpoints

## 📝 Registration Flow

1. **User visits site** → Checks localStorage for existing fingerprint
2. **If fingerprint exists** → Checks backend for registration status
3. **If registered** → Shows status (pending/approved/rejected)
4. **If not registered** → Shows registration form

### Registration Steps

1. **Step 1: User Information**
   - Username (required, 3-30 chars)
   - Email (required, valid format)
   - Telegram (optional, 5-32 chars)

2. **Step 2: Fingerprint Collection**
   - Automatically collects device fingerprint
   - Shows device information
   - Generates SHA-256 hash

3. **Submit**
   - Sends registration to backend
   - Stores fingerprint in localStorage
   - Shows pending status

## 🛠️ Development

### Available Scripts

```bash
npm start      # Start development server (port 3000)
npm run build  # Build for production
npm test       # Run tests
```

### Environment Variables

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:3000/api
PORT=3000  # Optional
```

### Building for Production

```bash
npm run build
```

Output will be in `build/` directory. Deploy this folder to your web server.

## 🐛 Troubleshooting

### Port Already in Use
```bash
PORT=3001 npm start
```

### Backend Connection Issues
1. Ensure backend is running: `cd /workspace/backend && npm start`
2. Check `.env` file has correct API URL
3. Check browser console for CORS errors
4. Verify backend CORS settings allow your origin

### Fingerprint Collection Fails
- Ensure JavaScript is enabled
- Check browser console for errors
- Some browsers may block Canvas fingerprinting

## 📚 Documentation

- **Quick Start**: See `QUICK_START.md`
- **Detailed Guide**: See `STARTUP_GUIDE.md`
- **Backend API**: See `/backend/README.md`

## 🔗 Related Projects

- **Backend API**: `/backend` - Node.js/Express API server
- **Chrome Extension**: `/ext` - Browser extension
- **Admin Panel**: `/adm-panel` - React admin dashboard

## 📄 License

MIT License - See LICENSE file for details

---

**Created by:** AriesxHit Team  
**Version:** 1.0.0
