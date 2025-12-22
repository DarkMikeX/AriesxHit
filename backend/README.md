# 🚀 AriesxHit Backend API

Backend API server for AriesxHit Auto Checker - A permission-based access control system with device fingerprinting.

## 📋 Features

- ✅ **Triple Authentication**: Username + Password + Device Fingerprint
- ✅ **Permission System**: Auto Hit & Bypass permission management
- ✅ **Admin Panel**: Approve/reject users, manage permissions
- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **Rate Limiting**: Prevent brute force attacks
- ✅ **Session Management**: Track active user sessions
- ✅ **Security Logging**: Track all login attempts
- ✅ **SQLite Database**: Lightweight, file-based database

## 🛠️ Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Security**: helmet, cors, express-rate-limit

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
NODE_ENV=development
PORT=3000
HOST=localhost
JWT_SECRET=your-super-secret-key-change-this
DATABASE_PATH=./database/ariesxhit.db
```

### 3. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login with credentials | Public |
| POST | `/api/auth/logout` | Logout user | Private |
| GET | `/api/auth/verify` | Verify JWT token | Private |
| GET | `/api/auth/me` | Get current user | Private |

### Admin

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/users` | Get all users | Admin |
| GET | `/api/admin/users/pending` | Get pending users | Admin |
| GET | `/api/admin/users/active` | Get active users | Admin |
| GET | `/api/admin/users/:id` | Get single user | Admin |
| POST | `/api/admin/users/:id/approve` | Approve user | Admin |
| POST | `/api/admin/users/:id/reject` | Reject user | Admin |
| POST | `/api/admin/users/:id/block` | Block user | Admin |
| POST | `/api/admin/users/:id/unblock` | Unblock user | Admin |
| PUT | `/api/admin/users/:id/permissions` | Update permissions | Admin |
| GET | `/api/admin/stats` | Get statistics | Admin |
| GET | `/api/admin/login-attempts` | Get login logs | Admin |

### Users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users/me` | Get profile | Private |
| GET | `/api/users/permissions` | Get permissions | Private |

## 📝 API Usage Examples

### Register New User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "fingerprintHash": "58af44a9672f56a8b8e3d5c4b1234567890abcdef1234567890abcdef12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Waiting for admin approval.",
  "data": {
    "id": 2,
    "username": "john_doe",
    "status": "pending"
  }
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123",
  "fingerprintHash": "58af44a9672f56a8b8e3d5c4b1234567890abcdef1234567890abcdef12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "username": "john_doe",
      "status": "active",
      "permissions": {
        "auto_hit": true,
        "bypass": false
      }
    }
  }
}
```

### Approve User (Admin)

```bash
POST /api/admin/users/2/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "password": "SecurePass123",
  "permissions": {
    "auto_hit": true,
    "bypass": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "user": {
      "id": 2,
      "username": "john_doe",
      "status": "active",
      "permissions": {
        "auto_hit": true,
        "bypass": true
      }
    }
  }
}
```

## 🔐 Security Features

### Rate Limiting
- 100 requests per 15 minutes per IP
- 5 failed login attempts per 15 minutes per username
- 10 failed login attempts per 15 minutes per IP

### Password Requirements
- Minimum 8 characters
- At least one letter
- At least one number

### Device Fingerprinting
- SHA-256 hash required
- One device per user account
- Prevents account sharing

### JWT Tokens
- 24-hour expiration
- Secure with HS256 algorithm
- Stored in session database

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  fingerprint_hash TEXT UNIQUE,
  password_hash TEXT,
  status TEXT DEFAULT 'pending',
  permissions TEXT DEFAULT '{}',
  created_at DATETIME,
  approved_at DATETIME,
  last_login DATETIME
)
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  token TEXT UNIQUE,
  expires_at DATETIME,
  created_at DATETIME
)
```

### Login Attempts Table
```sql
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY,
  username TEXT,
  fingerprint_hash TEXT,
  ip_address TEXT,
  success INTEGER,
  error_message TEXT,
  attempted_at DATETIME
)
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `localhost` |
| `JWT_SECRET` | JWT signing key | Required |
| `JWT_EXPIRES_IN` | Token expiration | `24h` |
| `DATABASE_PATH` | SQLite database file | `./database/ariesxhit.db` |
| `ADMIN_PASSWORD` | Default admin password | `admin123` |

## 🚀 Deployment

### Production Checklist

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Change `ADMIN_PASSWORD`
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Set up HTTPS/SSL
- [ ] Configure reverse proxy (nginx)
- [ ] Set up process manager (PM2)
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure logging

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name ariesxhit-api

# Save process list
pm2 save

# Set up startup script
pm2 startup
```

## 🐛 Troubleshooting

### Database locked error
```bash
# Close all connections and restart
rm database/*.db-shm database/*.db-wal
npm start
```

### Port already in use
```bash
# Change port in .env
PORT=3001
```

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

AriesxHit Team

---

**⚠️ Security Notice**: This is a testing tool. Use responsibly and only on authorized systems.
