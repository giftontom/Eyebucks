# 🚀 Eyebuckz LMS - Production Deployment Guide

**Last Updated:** January 19, 2026
**Estimated Time:** 45-60 minutes
**Difficulty:** Intermediate

---

## 📋 Quick Navigation

- [Prerequisites](#prerequisites)
- [Step 1: Database (Railway)](#step-1-database-setup)
- [Step 2: Backend (Railway)](#step-2-backend-deployment)
- [Step 3: Frontend (Vercel)](#step-3-frontend-deployment)
- [Step 4: Configuration](#step-4-final-configuration)
- [Step 5: Verification](#step-5-verification)
- [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Accounts (Free Tiers Available)
- [ ] **GitHub** - Code repository
- [ ] **Railway** - Database + Backend hosting
- [ ] **Vercel** - Frontend hosting

### Optional API Keys (for full functionality)
- [ ] **Razorpay** - Payment processing (Test mode free)
- [ ] **Google OAuth** - Social login
- [ ] **Cloudinary** - Video hosting
- [ ] **Resend** - Email notifications

**Note:** The app works in mock mode without optional keys!

---

## 🗄️ Step 1: Database Setup

### 1.1 Create Railway Account

1. Go to **https://railway.app**
2. Click **"Start a New Project"**
3. Sign up with GitHub

### 1.2 Provision PostgreSQL

1. Click **"+ New Project"**
2. Select **"Provision PostgreSQL"**
3. Wait 30 seconds for provisioning

### 1.3 Get Database URL

1. Click on the **PostgreSQL** service
2. Go to **"Variables"** tab
3. Copy the value of **`DATABASE_URL`**
4. Save it in a secure note - format:
   ```
   postgresql://user:password@host:port/database
   ```

✅ **Checkpoint:** You have a working PostgreSQL database URL

---

## 🔧 Step 2: Backend Deployment

### 2.1 Push Code to GitHub

```bash
cd /Users/apple/Documents/Project\ Eybuckz/Eyebucks

# Initialize git (if not done)
git init
git add .
git commit -m "feat: Production-ready LMS"

# Create GitHub repo and push
# (Create repo at github.com first, then:)
git remote add origin https://github.com/YOUR_USERNAME/eyebuckz-lms.git
git branch -M main
git push -u origin main
```

### 2.2 Deploy Backend to Railway

1. In Railway dashboard, click **"+ New"**
2. Select **"Deploy from GitHub repo"**
3. Connect GitHub account (if needed)
4. Select your `eyebuckz-lms` repository
5. Railway will detect Node.js project

### 2.3 Configure Service

1. Click on the deployed service
2. Go to **"Settings"** → **"General"**
3. Set **Root Directory** to: `server`
4. Click **"Save"**

### 2.4 Add Environment Variables

Go to **"Variables"** tab and add:

**Required Variables:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=4000
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHAR_STRING
ALLOWED_ORIGINS=https://your-app.vercel.app
```

**Optional Variables** (for full functionality):
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAILS=admin@yourdomain.com
```

**Pro Tip:** Use `${{Postgres.DATABASE_URL}}` to auto-reference your database!

### 2.5 Generate Domain

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://eyebuckz-api.up.railway.app`)
4. Save this URL - you'll need it for frontend

### 2.6 Verify Deployment

```bash
# Test health endpoint
curl https://your-backend.up.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-19...","database":"connected"}
```

✅ **Checkpoint:** Backend is deployed and database is connected

---

## 🎨 Step 3: Frontend Deployment

### 3.1 Deploy to Vercel

1. Go to **https://vercel.com**
2. Sign up with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your `eyebuckz-lms` repository

### 3.2 Configure Build Settings

Vercel will auto-detect Vite. Verify:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 3.3 Add Environment Variables

In **"Configure Project"** → **"Environment Variables"**:

```env
VITE_API_URL=https://your-backend.up.railway.app
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

**Important:** Replace `your-backend.up.railway.app` with your actual Railway backend URL!

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Once complete, copy your Vercel URL (e.g., `https://eyebuckz.vercel.app`)

✅ **Checkpoint:** Frontend is deployed

---

## ⚙️ Step 4: Final Configuration

### 4.1 Update Backend CORS

1. Go back to **Railway** → Your backend service
2. Go to **"Variables"** tab
3. Update **`ALLOWED_ORIGINS`**:
   ```env
   ALLOWED_ORIGINS=https://eyebuckz.vercel.app
   ```
4. Railway will automatically redeploy

### 4.2 Run Database Migrations

In Railway, click your backend service → **"..."** menu → **"Run Command"**:

```bash
npm run prisma:migrate:deploy
```

Wait for migrations to complete.

### 4.3 Seed Initial Data (Optional)

To add demo courses and admin user:

```bash
# From your local terminal:
DATABASE_URL="postgresql://..." npm run prisma:seed
```

Or use Railway CLI:
```bash
railway link  # Link to your project
railway run npm run prisma:seed
```

### 4.4 Configure Custom Domain (Optional)

**For Vercel (Frontend):**
1. Go to Vercel → Project → **"Settings"** → **"Domains"**
2. Add your domain (e.g., `eyebuckz.com`)
3. Update DNS records as instructed
4. Wait for SSL certificate (~10 minutes)

**For Railway (Backend):**
1. Go to Railway → Service → **"Settings"** → **"Networking"**
2. Add custom domain (e.g., `api.eyebuckz.com`)
3. Update DNS with provided CNAME
4. Update frontend `VITE_API_URL` to new domain

✅ **Checkpoint:** All services configured

---

## ✨ Step 5: Verification

### 5.1 Test Core Features

1. **Visit your Vercel URL**
   ```
   https://eyebuckz.vercel.app
   ```

2. **Test Authentication**
   - Click "Get Started" or "Sign In"
   - If Google OAuth configured: Test Google login
   - If not: Mock mode will work

3. **Test Course Browsing**
   - View course catalog
   - Click on a course
   - Check course details page

4. **Test Payment (Mock Mode)**
   - Click "Enroll Now"
   - Complete mock payment
   - Verify enrollment success
   - Check dashboard for enrolled course

5. **Test Video Player**
   - Access enrolled course
   - Play video
   - Test progress tracking
   - Check notes functionality

6. **Test Admin Portal** (if seeded)
   - Login as admin (admin@eyebuckz.com)
   - Check dashboard statistics
   - Test course management
   - Test user management

### 5.2 Check Backend Health

```bash
# Health check
curl https://your-backend.up.railway.app/health

# List courses
curl https://your-backend.up.railway.app/api/courses

# Check database
curl https://your-backend.up.railway.app/api/courses | jq '.'
```

### 5.3 Monitor Logs

**Railway Logs:**
1. Go to Railway → Backend service
2. Click **"Deployments"** tab
3. Click latest deployment
4. View real-time logs

**Vercel Logs:**
1. Go to Vercel → Project
2. Click **"Deployments"**
3. Click latest deployment
4. View function logs

✅ **Success!** Your LMS is live in production!

---

## 🔑 API Keys Setup (Optional)

### Razorpay (Payment Processing)

1. Go to **https://razorpay.com** → Sign up
2. Complete KYC verification
3. Go to **Settings** → **API Keys**
4. Generate Test mode keys
5. Add to Railway variables:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```

### Google OAuth (Social Login)

1. Go to **https://console.cloud.google.com**
2. Create new project → **"Eyebuckz LMS"**
3. Enable **Google+ API**
4. Create **OAuth 2.0 Client ID**
5. Add authorized origins:
   ```
   https://eyebuckz.vercel.app
   https://your-backend.up.railway.app
   ```
6. Add authorized redirect URIs:
   ```
   https://your-backend.up.railway.app/api/auth/google/callback
   ```
7. Copy **Client ID**
8. Add to Railway and Vercel:
   ```env
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   ```

### Cloudinary (Video Hosting)

1. Go to **https://cloudinary.com** → Sign up
2. Dashboard → **Settings** → **Access Keys**
3. Copy credentials
4. Add to Railway:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=xxxxx
   CLOUDINARY_API_SECRET=xxxxx
   ```

### Resend (Email Notifications)

1. Go to **https://resend.com** → Sign up
2. Verify your domain (or use Resend subdomain)
3. Create **API Key**
4. Add to Railway:
   ```env
   RESEND_API_KEY=re_xxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

---

## 🚨 Troubleshooting

### Problem: Backend Build Fails

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
# Ensure package.json has:
"scripts": {
  "postinstall": "prisma generate"
}
```

### Problem: Database Connection Fails

**Error:** `Can't reach database server`

**Solution:**
1. Check `DATABASE_URL` format
2. Ensure Railway PostgreSQL is running
3. Try `${{Postgres.DATABASE_URL}}` reference
4. Restart backend service

### Problem: CORS Error on Frontend

**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Solution:**
1. Check Railway `ALLOWED_ORIGINS` includes Vercel URL
2. Remove trailing slashes
3. Redeploy backend
4. Clear browser cache

### Problem: API Requests Return 404

**Error:** `GET https://your-backend.up.railway.app/api/courses 404`

**Solution:**
1. Verify `ROOT_DIRECTORY=server` in Railway settings
2. Check backend is deployed successfully
3. View Railway deployment logs
4. Ensure build completed

### Problem: Frontend Shows White Screen

**Error:** Blank page, no errors

**Solution:**
1. Check Vercel deployment logs
2. Verify `VITE_API_URL` is set correctly
3. Open browser console for errors
4. Test backend health endpoint
5. Clear browser cache and hard reload

### Problem: Payments Fail

**Error:** `Razorpay is not defined`

**Solution:**
1. Mock mode should work without keys
2. Check `RAZORPAY_KEY_ID` is set
3. Verify Razorpay script loads
4. Check browser console for errors

---

## 📊 Monitoring & Maintenance

### Set Up Uptime Monitoring

Use **UptimeRobot** (free):
1. Go to https://uptimerobot.com
2. Add monitor for: `https://your-backend.up.railway.app/health`
3. Add monitor for: `https://eyebuckz.vercel.app`
4. Set alert email

### Check Logs Regularly

**Railway:**
- Monitor for error spikes
- Check database connection issues
- Watch for memory/CPU usage

**Vercel:**
- Monitor build failures
- Check function execution times
- Watch bandwidth usage

### Database Backups

Railway provides automatic backups:
- Daily snapshots (7-day retention)
- Manual backups: Railway → PostgreSQL → **"Backups"**

### Update Dependencies

Monthly maintenance:
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Test locally
npm run dev

# Deploy
git add . && git commit -m "chore: Update dependencies"
git push
```

---

## 💰 Cost Breakdown

### Free Tier (Perfect for Beta)

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| Railway (Backend) | Trial | $0 | $5 credit/month, then $5/mo |
| Railway (PostgreSQL) | Shared | $0 | Included with backend |
| Vercel | Hobby | $0 | Unlimited deployments |
| Cloudinary | Free | $0 | 25GB storage |
| Resend | Free | $0 | 3,000 emails/month |
| **Total** | | **$5/mo** | After trial |

### Paid (Production Scale)

| Service | Plan | Cost | Features |
|---------|------|------|----------|
| Railway (Backend) | Hobby | $10/mo | 8GB RAM, priority |
| Railway (PostgreSQL) | Hobby | $5/mo | Dedicated DB |
| Vercel | Pro | $20/mo | Custom domains |
| Cloudinary | Plus | $89/mo | 190GB bandwidth |
| **Total** | | **~$124/mo** | + 2% transaction fee |

---

## 🎉 Next Steps

1. **Share with beta users** - Get feedback
2. **Monitor performance** - Watch for errors
3. **Gather analytics** - Track user behavior
4. **Add features** - Reviews, search, recommendations
5. **Scale infrastructure** - Upgrade as needed

---

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Prisma Docs:** https://prisma.io/docs
- **Project README:** `/README.md`
- **Quick Start:** `/QUICK_START.md`
- **Project Status:** `/PROJECT_STATUS.md`

---

## ✅ Deployment Checklist

**Pre-Deployment:**
- [ ] Code pushed to GitHub
- [ ] All tests passing locally
- [ ] Environment variables documented

**Database:**
- [ ] Railway PostgreSQL provisioned
- [ ] Database URL copied
- [ ] Migrations applied
- [ ] Data seeded (optional)

**Backend:**
- [ ] Railway service created
- [ ] Root directory set to `server`
- [ ] Environment variables added
- [ ] Domain generated
- [ ] Health check passing

**Frontend:**
- [ ] Vercel project created
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] Can access homepage

**Configuration:**
- [ ] Backend CORS updated with Vercel URL
- [ ] API keys configured (optional)
- [ ] Custom domain setup (optional)
- [ ] SSL certificates active

**Verification:**
- [ ] User authentication working
- [ ] Course browsing functional
- [ ] Payment flow tested
- [ ] Video player working
- [ ] Admin portal accessible (if seeded)

**Monitoring:**
- [ ] Uptime monitoring configured
- [ ] Error tracking setup (optional)
- [ ] Logs monitored
- [ ] Backups verified

---

**🚀 Your Eyebuckz LMS is now live!**

Production URL: `https://eyebuckz.vercel.app`
API URL: `https://your-backend.up.railway.app`
Status: **Ready for Beta Testing**

---

*Last Updated: January 19, 2026*
*Version: 1.0.0*
