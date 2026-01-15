# 🚀 Production Setup Guide

Complete guide for deploying Eyebuckz LMS to production with all required APIs and services configured.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup (PostgreSQL)](#database-setup)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Razorpay Payment Gateway](#razorpay-payment-gateway)
5. [Cloudinary Video CDN](#cloudinary-video-cdn)
6. [Resend Email Service](#resend-email-service)
7. [Environment Configuration](#environment-configuration)
8. [Backend Deployment (Railway)](#backend-deployment)
9. [Frontend Deployment (Vercel)](#frontend-deployment)
10. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

- GitHub account (for code hosting & deployments)
- Domain name (optional but recommended)
- Credit card for service signups (most have free tiers)

**Estimated Setup Time:** 60-90 minutes

---

## Database Setup

### Option 1: Supabase (Recommended - Free Tier)

1. **Create Account**: Go to [https://supabase.com](https://supabase.com)
2. **Create New Project**:
   - Project Name: `eyebuckz-lms`
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
3. **Get Connection String**:
   - Go to Settings → Database
   - Copy "Connection string" (Pooler mode)
   - Replace `[YOUR-PASSWORD]` with your database password
4. **Run Migrations**:
   ```bash
   cd server
   DATABASE_URL="your_connection_string" npx prisma migrate deploy
   ```

### Option 2: Railway PostgreSQL

1. Go to [https://railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy `DATABASE_URL` from Variables tab
4. Run migrations as shown above

---

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create New Project → Name: `Eyebuckz LMS`
3. Enable **Google+ API**:
   - APIs & Services → Library
   - Search "Google+ API" → Enable

### 2. Create OAuth 2.0 Credentials

1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Configure Consent Screen (External):
   - App name: `Eyebuckz`
   - User support email: `your@email.com`
   - Developer contact: `your@email.com`
3. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Eyebuckz Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     https://yourdomain.com
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000
     https://yourdomain.com
     ```

### 3. Copy Credentials

- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxx`

---

## Razorpay Payment Gateway

### 1. Create Account

1. Sign up at [https://dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Complete KYC verification (required for live mode)

### 2. Get API Keys

#### Test Mode (Development):
- Settings → API Keys → Generate Test Key
- Copy:
  - `Key ID`: `rzp_test_xxxxx`
  - `Key Secret`: `xxxxx`

#### Live Mode (Production):
- Settings → API Keys → Generate Live Key
- Copy:
  - `Key ID`: `rzp_live_xxxxx`
  - `Key Secret`: `xxxxx`

### 3. Setup Webhooks

1. Settings → Webhooks → Add New Webhook
2. Webhook URL: `https://your-api.com/api/checkout/razorpay-webhook`
3. Active Events:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
4. Secret: Auto-generated (copy this!)

---

## Cloudinary Video CDN

### 1. Create Account

Sign up at [https://cloudinary.com](https://cloudinary.com) (Free tier: 25GB storage, 25GB bandwidth/month)

### 2. Get Credentials

Dashboard → Settings → Product Environment Credentials:
- **Cloud Name**: `your_cloud_name`
- **API Key**: `xxxxx`
- **API Secret**: `xxxxx`

### 3. Configure Upload Presets

1. Settings → Upload → Add upload preset
2. Preset name: `eyebuckz_videos`
3. Signing Mode: **Signed**
4. Folder: `eyebuckz/videos`
5. Format: Auto
6. Resource Type: Video

### 4. Enable Video Streaming

Settings → Security → Enable:
- ✅ **Signed URLs** (Secure video access)
- ✅ **Adaptive Bitrate Streaming (HLS)**

---

## Resend Email Service

### 1. Create Account

Sign up at [https://resend.com](https://resend.com) (Free tier: 3,000 emails/month)

### 2. Verify Domain (Optional but Recommended)

1. Domains → Add Domain → Enter your domain
2. Add DNS records (provided by Resend):
   ```
   Type: TXT
   Name: @
   Value: [provided by Resend]
   ```

### 3. Create API Key

1. API Keys → Create API Key
2. Name: `Eyebuckz Production`
3. Permissions: **Sending access**
4. Copy API Key: `re_xxxxx` (save immediately - shown once!)

### 4. Set From Email

- With domain: `noreply@yourdomain.com`
- Without domain: Use Resend's shared domain

---

## Environment Configuration

### Frontend (.env.local)

Create `/Eyebucks/.env.local`:

```bash
# Application
VITE_APP_NAME=Eyebuckz
VITE_APP_URL=https://yourdomain.com
VITE_API_URL=https://your-api.railway.app

# Google OAuth
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# Razorpay
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx

# Disable mock mode in production
VITE_MOCK_PAYMENT=false
VITE_DEBUG_MODE=false

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Backend (/server/.env)

Create `/server/.env`:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/eyebuckz?schema=public"

# Server
PORT=4000
NODE_ENV=production

# CORS (Your frontend domains)
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# JWT/Session (Generate with: openssl rand -base64 32)
JWT_SECRET="your_secure_jwt_secret_32_chars"
SESSION_SECRET="your_secure_session_secret_32_chars"

# Google OAuth
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"

# Razorpay
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Resend
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Application URL
APP_URL="https://yourdomain.com"

# Admin (Comma-separated)
ADMIN_EMAILS="admin@yourdomain.com,owner@yourdomain.com"
```

---

## Backend Deployment (Railway)

### 1. Setup Railway

1. Sign up at [https://railway.app](https://railway.app) with GitHub
2. Create New Project → Deploy from GitHub repo
3. Select your backend repository/folder

### 2. Configure Build

Railway should auto-detect the build command, but verify:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `/server` (if monorepo)

### 3. Add Environment Variables

In Railway dashboard → Variables tab, add all variables from `/server/.env`

### 4. Set Custom Domain (Optional)

- Settings → Domains → Add Custom Domain
- Add CNAME record: `api.yourdomain.com` → `railway.app`

### 5. Deploy

- Click "Deploy" → Railway will build and deploy
- Copy the deployment URL: `https://your-project.railway.app`

---

## Frontend Deployment (Vercel)

### 1. Setup Vercel

1. Sign up at [https://vercel.com](https://vercel.com) with GitHub
2. Import Project → Select your repository

### 2. Configure Build

- **Framework Preset**: Vite
- **Root Directory**: `/` (or `/Eyebucks` if monorepo)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3. Add Environment Variables

In Vercel dashboard → Settings → Environment Variables, add all from `.env.local`

### 4. Set Custom Domain

- Settings → Domains → Add Domain
- Follow Vercel's DNS setup instructions

### 5. Deploy

- Click "Deploy" → Vercel will build and deploy
- Your site: `https://yourdomain.vercel.app` or custom domain

---

## Post-Deployment Checklist

### ✅ Backend Verification

- [ ] Health check: `https://your-api.com/health` returns `{"status": "ok"}`
- [ ] Database connected (no migration errors in logs)
- [ ] CORS configured (frontend can make requests)
- [ ] Razorpay webhook receiving events (test payment)
- [ ] Cloudinary uploads working (try uploading video)
- [ ] Resend emails sending (try enrollment)

### ✅ Frontend Verification

- [ ] Site loads without errors
- [ ] Google OAuth login works
- [ ] Razorpay payment flow completes
- [ ] Video playback works (HLS streaming)
- [ ] Email notifications received
- [ ] Certificate generation works

### ✅ Security

- [ ] All `.env` files added to `.gitignore`
- [ ] No API keys in frontend code
- [ ] HTTPS enabled on both frontend & backend
- [ ] Razorpay webhook signature validation working
- [ ] CORS only allows your domain

### ✅ Performance

- [ ] Lighthouse score > 90 (run on Chrome DevTools)
- [ ] Video streaming quality selector works
- [ ] Images optimized and lazy-loaded
- [ ] API response times < 500ms

### ✅ Monitoring (Recommended)

- [ ] Setup error tracking: [Sentry](https://sentry.io)
- [ ] Setup uptime monitoring: [UptimeRobot](https://uptimerobot.com)
- [ ] Setup analytics: Google Analytics or PostHog
- [ ] Setup logging: Railway logs + CloudWatch

---

## Troubleshooting

### Google OAuth "redirect_uri_mismatch"

**Problem**: OAuth fails with redirect URI error

**Solution**:
1. Check authorized redirect URIs in Google Console
2. Ensure they match your deployed URL exactly (include/exclude trailing slash)
3. Clear browser cache and try again

### Razorpay Webhook Not Receiving Events

**Problem**: Payments succeed but database not updated

**Solution**:
1. Verify webhook URL is publicly accessible
2. Check webhook secret matches `.env`
3. Review Railway logs for webhook errors
4. Test webhook with Razorpay dashboard webhook tester

### Cloudinary Video Not Playing

**Problem**: Video player shows loading spinner forever

**Solution**:
1. Check Cloudinary API keys are correct
2. Verify signed URL generation is working (check backend logs)
3. Ensure HLS streaming is enabled in Cloudinary settings
4. Check browser console for CORS errors

### Database Migration Fails

**Problem**: `prisma migrate deploy` fails with connection error

**Solution**:
1. Verify `DATABASE_URL` format is correct
2. Check database is accessible (not behind firewall)
3. Try connection pooling URL (Supabase: use "Pooler" connection string)
4. Increase timeout: `connect_timeout=10` in connection string

### Build Fails on Vercel/Railway

**Problem**: Deployment fails during build step

**Solution**:
1. Check Node.js version matches local (20.x recommended)
2. Clear build cache and retry
3. Check for missing dependencies in `package.json`
4. Review build logs for specific error messages

---

## Support

**Need help?**

- 📧 Email: support@eyebuckz.com
- 💬 GitHub Issues: [Create Issue](https://github.com/yourusername/eyebuckz-lms/issues)
- 📖 Documentation: See `/docs` folder

---

## Cost Estimate (Monthly)

| Service | Free Tier | Paid Tier (if needed) |
|---------|-----------|----------------------|
| **Supabase** | 500MB DB, 2GB transfer | $25/month (8GB DB) |
| **Railway** | $5 credit/month | $20/month (8GB RAM) |
| **Vercel** | 100GB bandwidth | $20/month (1TB bandwidth) |
| **Cloudinary** | 25GB storage | $89/month (155GB) |
| **Resend** | 3,000 emails | $20/month (50k emails) |
| **Razorpay** | Free (2% fee) | 2% transaction fee |
| **Total** | **~$5/month** | **~$174/month** |

Most startups can run on free tiers for the first 100-500 users!

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
