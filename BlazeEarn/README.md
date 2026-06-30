# BlazeEarn Backend — Setup Guide

## What's Included
- `server.js` — Main Express server with all API routes
- `database.js` — SQLite database setup (auto-creates all tables)
- `package.json` — All dependencies
- `.env.example` — Environment variables template

---

## Local Setup (Testing on your computer)

### Requirements
- Node.js v18+ (download from nodejs.org)

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env

# 3. Edit .env with your own values
# Change JWT_SECRET to something long and random
# Change ADMIN_PASSWORD to your own password

# 4. Start the server
npm start

# Server runs at http://localhost:3000
```

---

## Deploying to Railway (Free Hosting — Recommended)

1. Go to **railway.app** and sign up free
2. Click **New Project → Deploy from GitHub**
3. Upload this backend folder to a GitHub repo first
4. Connect the repo to Railway
5. Add environment variables in Railway dashboard:
   - `JWT_SECRET` = any long random string
   - `ADMIN_USERNAME` = admin
   - `ADMIN_PASSWORD` = your chosen password
   - `NODE_ENV` = production
6. Railway gives you a URL like `https://blazeearn-backend.railway.app`
7. Copy that URL into your frontend HTML file (replace `API_BASE_URL`)

---

## Deploying to Render (Also Free)

1. Go to **render.com** and sign up
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Set:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add environment variables same as above
6. Deploy — get your URL

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| POST | /api/auth/admin-login | Admin login |

### User (requires token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/user/profile | Get user profile |
| PUT | /api/user/profile | Update profile |
| PUT | /api/user/password | Change password |
| PUT | /api/user/data-details | Save data claim info |
| GET | /api/user/referrals | Get referral stats |

### Tasks (requires token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | Get all active tasks |
| POST | /api/tasks/:id/complete | Complete a task |

### Withdrawals (requires token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/withdrawals | Submit withdrawal |
| GET | /api/withdrawals | Get user withdrawals |

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/vendors | Get vendors list |
| GET | /api/settings/public | Get public settings |

### Admin (requires admin token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/stats | Dashboard stats |
| POST | /api/admin/coupons/generate | Generate coupons |
| GET | /api/admin/coupons | List all coupons |
| POST | /api/admin/vendors | Add vendor |
| DELETE | /api/admin/vendors/:id | Remove vendor |
| POST | /api/admin/tasks | Add task |
| DELETE | /api/admin/tasks/:id | Remove task |
| GET | /api/admin/withdrawals | List withdrawals |
| PUT | /api/admin/withdrawals/:id/approve | Approve withdrawal |
| PUT | /api/admin/withdrawals/:id/reject | Reject + refund |
| GET | /api/admin/users | List all users |
| GET | /api/admin/data-claims | Data claim submissions |
| PUT | /api/admin/settings/claim-date | Set data claim date |
| PUT | /api/admin/settings/withdrawals | Update min withdrawals |

---

## Security Features
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens (expire in 7 days for users, 12 hours for admin)
- Rate limiting (10 login attempts per 15 min, 60 API calls per min)
- Helmet.js security headers
- SQL injection protected via prepared statements
- CORS enabled

---

## After Deployment

1. Copy your deployment URL (e.g. `https://your-app.railway.app`)
2. Open `blazeearn.html`
3. Find the line: `const API_BASE_URL = 'http://localhost:3000'`
4. Replace with your deployment URL
5. All features will now be connected to the real backend!
