# Pull Request: Fix Registration Errors

## Title
```
fix: Fix registration errors - field name mismatch and rate limiting
```

## Description
```markdown
## 🐛 Bug Fixes

### Issues Fixed:
1. **400 Bad Request Error** - Field name mismatch between frontend and backend
2. **429 Too Many Requests** - Rate limiting too strict for registration

### Changes:

#### Frontend (`fp/src/utils/api.js`):
- ✅ Changed `fingerprint_hash` → `fingerprintHash` in `registerUser()` function
- ✅ Changed `fingerprint_hash` → `fingerprintHash` in `checkExistingRegistration()` function
- Frontend now sends correct field name matching backend expectations

#### Backend (`backend/middleware/rateLimiter.js`):
- ✅ Increased register rate limit: **3 → 10 attempts/hour**
- ✅ Added `skipFailedRequests: true` - validation errors no longer count toward limit
- More lenient for development and testing

### Files Changed:
- `fp/src/utils/api.js` - Fixed API request field names (2 changes)
- `backend/middleware/rateLimiter.js` - Increased rate limits

### Testing:
- ✅ Registration requests now send correct field format
- ✅ Rate limiting allows more attempts for testing
- ✅ Failed validation attempts don't consume rate limit quota

### Impact:
- Users can now successfully register without 400 errors
- Rate limiting is more reasonable for development/testing
- Better error handling for validation failures

---

**Commit:** `94050a34`
**Branch:** `cursor/repository-content-reading-76b8` → `main`
```

## Create PR via GitHub Web UI

**Direct Link:**
👉 https://github.com/DarkMikeX/AriesxHit/compare/main...cursor/repository-content-reading-76b8

**Steps:**
1. Click the link above
2. Click "Create pull request"
3. Copy/paste the title and description above
4. Click "Create pull request"

## Create PR via GitHub CLI

```bash
gh pr create \
  --base main \
  --head cursor/repository-content-reading-76b8 \
  --title "fix: Fix registration errors - field name mismatch and rate limiting" \
  --body-file PR_REGISTRATION_FIX.md
```

---

## Changes Summary

**Commit:** `94050a34`
- Fixed field name mismatch (fingerprint_hash → fingerprintHash)
- Increased rate limit (3 → 10 attempts/hour)
- Added skipFailedRequests option

**Files Changed:**
- `fp/src/utils/api.js` (2 lines changed)
- `backend/middleware/rateLimiter.js` (3 lines changed)
