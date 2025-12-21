# 📁 AriesxHit - File Locations Guide

## ✅ Correct File Structure

```
propaganda-auto-checker/
│
├── chrome-extension/
│   │
│   ├── manifest.json                    ✅ CREATED
│   ├── popup.html                       ✅ CREATED
│   ├── login.html                       ✅ CREATED
│   ├── settings.html                    ✅ CREATED
│   ├── blocked.html                     ✅ CREATED
│   │
│   ├── assets/
│   │   ├── images/icons/
│   │   ├── wallpapers/
│   │   └── styles/
│   │       ├── popup.css                ✅ CREATED
│   │       ├── login.css                ✅ CREATED
│   │       ├── settings.css             ✅ CREATED
│   │       └── common.css               ✅ CREATED
│   │
│   └── scripts/
│       │
│       ├── background/
│       │   └── background.js            ✅ CREATED
│       │
│       ├── popup/
│       │   ├── popup.js                 ✅ CREATED
│       │   ├── logger.js                ✅ CREATED
│       │   └── wallpaper.js             ✅ CREATED
│       │
│       ├── auth/
│       │   └── login.js                 ✅ CREATED
│       │
│       ├── settings/
│       │   └── settings.js              ✅ CREATED
│       │
│       ├── core/
│       │   └── bypass.js                ✅ CREATED (NEW!)
│       │
│       ├── content/
│       │   ├── stripe-detector.js       ✅ CREATED
│       │   └── form-injector.js         ✅ CREATED (NEW!)
│       │
│       └── utils/
│           ├── constants.js             ✅ CREATED
│           ├── validators.js            ✅ CREATED
│           ├── storage.js               ✅ CREATED
│           ├── formatters.js            ✅ CREATED
│           ├── api-client.js            ✅ CREATED
│           └── crypto.js                ✅ CREATED
```

---

## 🆕 NEW FILES CREATED (2)

### 1. **`scripts/core/bypass.js`** ✅
- **Purpose:** Core CVV bypass engine
- **Runs in:** Page context (injected)
- **Contains:**
  - Fetch interception
  - XHR interception
  - SendBeacon interception
  - CVV removal logic
  - Stripe request detection
  - Message handling

### 2. **`scripts/content/form-injector.js`** ✅
- **Purpose:** Injects bypass.js and handles communication
- **Runs in:** Content script context
- **Contains:**
  - Script injection
  - Message passing (page ↔ background)
  - Auto-fill card forms
  - Click submit button
  - Bypass state control

---

## 🔄 How They Work Together

```
Page Context                Content Script               Background Script
────────────                ──────────────               ─────────────────

bypass.js                   form-injector.js             background.js
  │                              │                            │
  │ 1. Intercepts requests       │                            │
  │ 2. Removes CVV                │                            │
  │ 3. Sends postMessage ─────────►                           │
  │                              │                            │
  │                              │ 4. Receives message        │
  │                              │ 5. Sends to background ────►
  │                              │                            │
  │                              │                            │ 6. Logs event
  │                              │                            │ 7. Updates stats
  │                              │                            │
  │                              │ ◄──────────────────────────┤ 8. Toggle bypass
  │ ◄────────────────────────────┤                            │
  │ 9. Activates/deactivates     │                            │
```

---

## 📋 File Descriptions

### **Core Engine**
| File | Location | Purpose |
|------|----------|---------|
| `bypass.js` | `scripts/core/` | CVV removal from Stripe requests |

### **Content Scripts**
| File | Location | Purpose |
|------|----------|---------|
| `stripe-detector.js` | `scripts/content/` | Detect Stripe checkout pages |
| `form-injector.js` | `scripts/content/` | Inject bypass script + auto-fill |

### **Background**
| File | Location | Purpose |
|------|----------|---------|
| `background.js` | `scripts/background/` | Service worker + permission gates |

---

## 🔧 Manifest.json Updates

### Web Accessible Resources
```json
"web_accessible_resources": [
  {
    "resources": [
      "assets/images/*",
      "assets/wallpapers/*",
      "scripts/core/bypass.js"  // ← ADDED
    ],
    "matches": ["<all_urls>"]
  }
]
```

### Content Scripts
```json
"content_scripts": [
  {
    "matches": [
      "*://checkout.stripe.com/*",
      "*://buy.stripe.com/*",
      "*://*/*cs_live*",
      "*://*/*"
    ],
    "js": [
      "scripts/content/stripe-detector.js",
      "scripts/content/form-injector.js"  // ← UPDATED
    ],
    "run_at": "document_start",
    "all_frames": true
  }
]
```

---

## ✅ Files Summary

**Total Files Created: 27/140+**

### By Category:
- **HTML:** 5 files
- **CSS:** 4 files
- **JavaScript Utils:** 6 files
- **JavaScript Main:** 5 files
- **Background:** 1 file
- **Content Scripts:** 2 files
- **Core Engine:** 1 file
- **Config:** 1 file (manifest)
- **Documentation:** 2 files

---

## 📝 Important Notes

1. **`bypass.js` MUST be in `scripts/core/`** because:
   - It runs in page context (not content script)
   - Needs to be web accessible
   - Loaded via `chrome.runtime.getURL()`

2. **`form-injector.js` MUST be in `scripts/content/`** because:
   - It's a content script
   - Defined in manifest.json
   - Bridges page ↔ background

3. **Never confuse these:**
   - ❌ `bypass-injector.js` (old combined file - DELETE THIS)
   - ✅ `bypass.js` (core engine)
   - ✅ `form-injector.js` (content script)

---

## 🚀 Next Steps

Still need to create:
- [ ] `toggles.js` - Auto Hit/Bypass toggle handlers
- [ ] `inputs.js` - BIN/Proxy/CC input handlers
- [ ] `auto-fill.js` - Advanced auto-fill logic
- [ ] `response-interceptor.js` - Response handling
- [ ] Backend API (30+ files)
- [ ] Admin Panel (35+ files)
- [ ] Registration Site (15+ files)