# 🚀 Eyebuckz LMS - Production Deployment Guide

This guide walks you through deploying Eyebuckz LMS from development to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Mode Switching](#quick-mode-switching)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Deployment Options](#deployment-options)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

Before deploying to production, ensure you have:

- ✅ A production-ready domain (e.g., `eyebuckz.com`)
- ✅ Google Cloud Console account
- ✅ Production PostgreSQL database (Supabase, Railway, or AWS RDS)
- ✅ Razorpay account (with live mode enabled)
- ✅ SSL certificate (most hosting platforms provide this automatically)

---

## 🔄 Quick Mode Switching

### Using the Mode Switcher Script

The easiest way to switch between development and production:

```bash
# Switch to development mode
./switch-mode.sh dev

# Switch to production mode
./switch-mode.sh prod

# Check current mode
./switch-mode.sh status
```

### Manual Mode Switching

If you prefer manual control:

**Development Mode:**
```bash
# Frontend
cp .env.development .env

# Backend
cp server/.env.development server/.env
```

**Production Mode:**
```bash
# Frontend
cp .env.production .env

# Backend
cp server/.env.production server/.env
```

---

## 🔐 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"**
3. Name it: `Eyebuckz LMS` (or your preferred name)
4. Click **"Create"**

### Step 2: Enable Google+ API

1. Navigate to **APIs & Services** → **Library**
2. Search for **"Google+ API"**
3. Click **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **"External"** (unless you have Google Workspace)
3. Fill in the required fields:
   - **App name:** Eyebuckz LMS
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Click **"Save and Continue"**
5. **Scopes:** Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
6. Click **"Save and Continue"**
7. **Test users:** Add your email (optional for production, required for testing)
8. Click **"Save and Continue"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**
3. Choose **"Web application"**
4. Configure:
   - **Name:** Eyebuckz LMS Web Client
   - **Authorized JavaScript origins:**
     ```
     https://eyebuckz.com
     https://www.eyebuckz.com
     http://localhost:3000  (for local testing)
     ```
   - **Authorized redirect URIs:**
     ```
     https://eyebuckz.com/login
     https://www.eyebuckz.com/login
     http://localhost:3000/login  (for local testing)
     ```
5. Click **"Create"**
6. **Copy the credentials:**
   - `Client ID` (looks like: `1234567890-abc123.apps.googleusercontent.com`)
   - `Client Secret` (looks like: `GOCSPX-abc123xyz`)

### Step 5: Update Environment Variables

Add these to your production environment:

**Backend (.env or hosting platform):**
```bash
GOOGLE_CLIENT_ID="1234567890-abc123.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123xyz"
```

**Frontend (.env or hosting platform):**
```bash
VITE_GOOGLE_CLIENT_ID="1234567890-abc123.apps.googleusercontent.com"
```

⚠️ **Important:** Both frontend and backend must use the **same** `GOOGLE_CLIENT_ID`!

---

## 🗄️ Database Setup

### Option 1: Supabase (Recommended - Free Tier Available)

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Create a new project:
   - **Name:** eyebuckz-lms
   - **Database Password:** Generate a strong password
   - **Region:** Choose closest to your users
4. Wait for database to be created (~2 minutes)
5. Go to **Settings** → **Database**
6. Copy the **Connection String** (Transaction mode):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
7. Update `DATABASE_URL` in your backend `.env.production`:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

8. **Run migrations:**
   ```bash
   # Switch to production mode first
   ./switch-mode.sh prod

   # Run migrations
   cd server
   npm run prisma:migrate
   ```

### Option 2: Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Provision PostgreSQL"**
3. Copy the **PostgreSQL Connection URL**
4. Update `DATABASE_URL` in `.env.production`
5. Run migrations (same as above)

### Option 3: Heroku Postgres

1. Install Heroku CLI
2. Create app: `heroku create eyebuckz-lms`
3. Add PostgreSQL: `heroku addons:create heroku-postgresql:mini`
4. Get database URL: `heroku config:get DATABASE_URL`
5. Update `.env.production` and run migrations

---

## ⚙️ Environment Configuration

### Backend Environment Variables

Create `server/.env.production` with these values:

```bash
# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PORT=4000

# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/eyebuckz"

# ============================================
# JWT SECRETS
# ============================================
# Generate with: openssl rand -base64 32
JWT_SECRET="your-super-strong-jwt-secret-min-32-chars"
SESSION_SECRET="your-super-strong-session-secret-min-32-chars"

# ============================================
# GOOGLE OAUTH
# ============================================
GOOGLE_CLIENT_ID="1234567890-abc123.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123xyz"

# ============================================
# RAZORPAY (LIVE MODE)
# ============================================
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your_live_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# ============================================
# CORS & SECURITY
# ============================================
ALLOWED_ORIGINS="https://eyebuckz.com,https://www.eyebuckz.com,https://api.eyebuckz.com"

# ============================================
# ADMIN EMAILS
# ============================================
ADMIN_EMAILS="owner@eyebuckz.com,admin@eyebuckz.com"
```

### Frontend Environment Variables

Create `.env.production` with these values:

```bash
# API URL
VITE_API_URL=https://api.eyebuckz.com

# App URL
VITE_APP_URL=https://eyebuckz.com

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com

# Razorpay Key ID (Live Mode)
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx

# Environment
NODE_ENV=production
```

### Generate Strong Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate SESSION_SECRET
openssl rand -base64 32
```

---

## 🌐 Deployment Options

### Option 1: Railway (Full Stack - Recommended)

**Deploy Backend:**

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Add environment variables from `server/.env.production`
6. Deploy

**Deploy Frontend:**

1. Click **"+ New"** → **"GitHub Repo"** (same repo)
2. Configure:
   - **Root Directory:** `.` (root)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run preview` (or use Vercel for frontend)
3. Add environment variables from `.env.production`
4. Deploy

**Get URLs:**
- Backend: `https://your-backend-name.up.railway.app`
- Update `VITE_API_URL` in frontend to this URL

### Option 2: Vercel (Frontend) + Railway (Backend)

**Deploy Backend to Railway:**
(Same as above)

**Deploy Frontend to Vercel:**

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts:
   - **Root Directory:** `.`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables in Vercel dashboard
5. Deploy: `vercel --prod`

### Option 3: Heroku (Full Stack)

**Deploy Backend:**

```bash
# Login to Heroku
heroku login

# Create app
heroku create eyebuckz-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="your-secret"
heroku config:set GOOGLE_CLIENT_ID="your-client-id"
# ... (set all env vars)

# Deploy
git subtree push --prefix server heroku main

# Run migrations
heroku run npm run prisma:migrate
```

**Deploy Frontend:**

Use Vercel (easiest) or Netlify for the frontend.

### Option 4: DigitalOcean App Platform

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **"Create"** → **"Apps"**
3. Connect GitHub repository
4. Configure backend:
   - **Type:** Web Service
   - **Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Run Command:** `npm start`
5. Configure frontend:
   - **Type:** Static Site
   - **Directory:** `.`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Add environment variables
7. Deploy

---

## ✅ Post-Deployment Checklist

### Security

- [ ] ✅ All `.env` files added to `.gitignore`
- [ ] ✅ Strong secrets generated (min 32 characters)
- [ ] ✅ HTTPS enabled on all domains
- [ ] ✅ CORS configured with production domains only
- [ ] ✅ Rate limiting enabled
- [ ] ✅ Helmet security headers enabled
- [ ] ✅ Database connection uses SSL

### Functionality

- [ ] ✅ Google OAuth login works
- [ ] ✅ JWT tokens are being generated and validated
- [ ] ✅ Sessions are being tracked in database
- [ ] ✅ Admin emails can access admin panel
- [ ] ✅ Regular users cannot access admin panel
- [ ] ✅ Course enrollment works
- [ ] ✅ Razorpay payment integration works (test in live mode)
- [ ] ✅ Video progress tracking works
- [ ] ✅ Phone verification works

### Performance

- [ ] ✅ Frontend assets are minified
- [ ] ✅ Images are optimized
- [ ] ✅ Database has proper indexes
- [ ] ✅ API response times < 500ms
- [ ] ✅ Frontend loads in < 3 seconds

### Monitoring

- [ ] ✅ Set up error tracking (Sentry recommended)
- [ ] ✅ Set up uptime monitoring
- [ ] ✅ Database backups configured
- [ ] ✅ Logs are being collected

---

## 🐛 Troubleshooting

### Google OAuth Not Working

**Problem:** "Error 400: redirect_uri_mismatch"

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add your production URL to **Authorized redirect URIs**:
   ```
   https://yourdomain.com/login
   ```
4. Make sure there are no trailing slashes

---

**Problem:** "Google Sign-In button not appearing"

**Solution:**
1. Check that `VITE_GOOGLE_CLIENT_ID` is set in frontend environment
2. Check browser console for errors
3. Verify you're using the same Client ID on frontend and backend
4. Clear browser cache and try again

---

### JWT Token Issues

**Problem:** "Session expired" or "Invalid token" errors

**Solution:**
1. Verify `JWT_SECRET` matches on backend
2. Check token expiration time (default: 15 minutes for access token)
3. Ensure refresh token is being stored in HTTPOnly cookie
4. Check if clock skew between client and server

---

**Problem:** "Token refresh failing"

**Solution:**
1. Check that cookies are being sent with `credentials: 'include'`
2. Verify `ALLOWED_ORIGINS` includes your frontend domain
3. Check `sameSite` cookie settings (should be `lax` or `none` for cross-domain)
4. Ensure HTTPS is enabled in production

---

### Database Connection Issues

**Problem:** "Cannot connect to database"

**Solution:**
1. Verify `DATABASE_URL` format:
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```
2. Add `?sslmode=require` for cloud databases (Supabase, Railway)
3. Check database firewall rules (whitelist your server IP)
4. Verify database credentials are correct

---

**Problem:** "Migrations failing in production"

**Solution:**
1. Run migrations manually:
   ```bash
   npx prisma migrate deploy
   ```
2. Check database user has permissions to create tables
3. Verify Prisma schema matches your database

---

### CORS Errors

**Problem:** "Access-Control-Allow-Origin" errors in browser

**Solution:**
1. Update `ALLOWED_ORIGINS` in backend `.env`:
   ```bash
   ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
   ```
2. Ensure `credentials: true` in CORS config
3. Frontend must use `credentials: 'include'` in fetch calls
4. Check that no trailing slashes in CORS origins

---

### Razorpay Integration Issues

**Problem:** "Invalid API key" or "Key/Secret mismatch"

**Solution:**
1. Verify you're using **LIVE** mode keys, not TEST mode
2. Check that `RAZORPAY_KEY_ID` matches between frontend and backend
3. Verify `RAZORPAY_KEY_SECRET` is correct
4. Go to Razorpay Dashboard → Settings → API Keys to regenerate if needed

---

### Admin Access Issues

**Problem:** "User cannot access admin panel"

**Solution:**
1. Check `ADMIN_EMAILS` environment variable:
   ```bash
   ADMIN_EMAILS="owner@eyebuckz.com,admin@eyebuckz.com"
   ```
2. Verify user's email exactly matches (case-sensitive)
3. Logout and login again after adding to ADMIN_EMAILS
4. Check user role in database:
   ```sql
   SELECT id, email, role FROM "User" WHERE email = 'your-email@example.com';
   ```

---

### Session Management Issues

**Problem:** "User getting logged out frequently"

**Solution:**
1. Check access token expiry (default: 15 minutes)
2. Verify refresh token is being stored correctly
3. Check auto-refresh logic in `apiClient.ts`
4. Increase session limit if needed (default: 3 concurrent sessions)

---

**Problem:** "Too many sessions" error

**Solution:**
1. Use logout-all endpoint to clear old sessions:
   ```bash
   POST /api/auth/logout-all
   ```
2. Check session cleanup logic in `sessionService.ts`
3. Increase `MAX_SESSIONS_PER_USER` if needed

---

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review backend logs for error details
3. Check browser console for frontend errors
4. Contact support at support@eyebuckz.com

---

## 🔒 Security Best Practices

1. **Secrets Management:**
   - Never commit `.env` files to Git
   - Use hosting platform environment variables
   - Rotate secrets every 90 days

2. **Database Security:**
   - Use SSL connections
   - Whitelist server IPs only
   - Regular backups (daily recommended)
   - Keep Prisma and PostgreSQL updated

3. **API Security:**
   - Rate limiting enabled (5 login attempts per 15 min)
   - Helmet headers configured
   - CORS restricted to production domains only
   - JWT tokens with short expiry

4. **User Data:**
   - Passwords never stored (OAuth only)
   - Phone numbers encrypted
   - PII data minimized
   - GDPR compliance considerations

---

## 📈 Performance Optimization

1. **Frontend:**
   ```bash
   # Build with production optimizations
   npm run build

   # Analyze bundle size
   npm run build -- --analyze
   ```

2. **Backend:**
   - Enable PostgreSQL connection pooling
   - Add database indexes on frequently queried fields
   - Cache course data with Redis (optional)

3. **CDN:**
   - Use Cloudflare or similar CDN for static assets
   - Enable caching headers
   - Compress images (WebP format)

---

## 🚀 Going Live Checklist

Final steps before making your site public:

- [ ] ✅ Switch to production mode: `./switch-mode.sh prod`
- [ ] ✅ All environment variables configured
- [ ] ✅ Database migrations run successfully
- [ ] ✅ Google OAuth working with production domain
- [ ] ✅ SSL certificate installed and working
- [ ] ✅ DNS records pointing to hosting platform
- [ ] ✅ Admin accounts tested
- [ ] ✅ Test course purchase flow end-to-end
- [ ] ✅ Error tracking configured (Sentry)
- [ ] ✅ Analytics configured (Google Analytics)
- [ ] ✅ Backup strategy in place
- [ ] ✅ Monitoring alerts configured

---

## 🎉 Congratulations!

Your Eyebuckz LMS is now live in production! 🚀

**Next Steps:**
- Monitor error logs for the first 24 hours
- Test all critical user flows
- Gather user feedback
- Plan regular maintenance windows for updates

**Maintenance Schedule:**
- Weekly: Review error logs and performance metrics
- Monthly: Security updates and dependency patches
- Quarterly: Rotate JWT secrets
- Annually: Review and optimize database indexes

---

*Last updated: January 2025*
