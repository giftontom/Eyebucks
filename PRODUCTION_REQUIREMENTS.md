# 📋 Production Requirements Checklist

This document lists everything you need to provide for a **perfect production deployment** of Eyebuckz LMS.

---

## 🎯 Quick Overview

**Total Items to Provide:** 15
**Estimated Setup Time:** 2-4 hours
**Cost:** Free tier available for most services

---

## ✅ What You Need to Provide

### 1️⃣ **Domain Name** (REQUIRED)

**What:** Your production website domain

**Example:**
- `eyebuckz.com`
- `learn.eyebuckz.com`
- `courses.yourname.com`

**Where to Get:**
- [Namecheap](https://namecheap.com) - $8-12/year
- [GoDaddy](https://godaddy.com) - $10-15/year
- [Cloudflare](https://cloudflare.com) - $9-10/year

**What I Need:**
```
Production Domain: _____________________ (e.g., eyebuckz.com)
```

---

### 2️⃣ **Google OAuth Credentials** (REQUIRED)

**What:** OAuth 2.0 Client ID and Client Secret for user authentication

**Where to Get:** [Google Cloud Console](https://console.cloud.google.com/)

**Steps:**
1. Create a Google Cloud Project
2. Enable Google+ API
3. Configure OAuth consent screen
4. Create OAuth 2.0 Web Application credentials
5. Add authorized origins and redirect URIs

**What I Need:**
```
GOOGLE_CLIENT_ID: _____________________________________
GOOGLE_CLIENT_SECRET: _________________________________
```

**Format:**
- Client ID: `1234567890-abc123xyz.apps.googleusercontent.com`
- Client Secret: `GOCSPX-abc123xyz789`

**Detailed Guide:** See `DEPLOYMENT_GUIDE.md` Section 3

---

### 3️⃣ **Production Database** (REQUIRED)

**What:** PostgreSQL database connection URL

**Where to Get (Choose ONE):**

**Option A: Supabase (Recommended - FREE tier)**
- URL: [supabase.com](https://supabase.com)
- Free tier: 500MB database, unlimited API requests
- Create project → Get connection string

**Option B: Railway**
- URL: [railway.app](https://railway.app)
- Free tier: $5 credit/month
- Provision PostgreSQL → Copy connection URL

**Option C: Heroku Postgres**
- URL: [heroku.com](https://heroku.com)
- Mini plan: $5/month
- Add-on: `heroku-postgresql:mini`

**What I Need:**
```
DATABASE_URL: postgresql://___________________________
```

**Format:**
```
postgresql://username:password@host:5432/database_name
```

**Example:**
```
postgresql://postgres:mypassword@db.abc123.supabase.co:5432/postgres
```

---

### 4️⃣ **Razorpay Live API Keys** (REQUIRED for payments)

**What:** Payment gateway credentials for accepting course payments

**Where to Get:** [Razorpay Dashboard](https://dashboard.razorpay.com/)

**Steps:**
1. Sign up for Razorpay account
2. Complete KYC verification (required for live mode)
3. Switch to **LIVE mode** (not TEST mode)
4. Go to Settings → API Keys
5. Generate live keys

**What I Need:**
```
RAZORPAY_KEY_ID: rzp_live_____________________
RAZORPAY_KEY_SECRET: _________________________
RAZORPAY_WEBHOOK_SECRET: ____________________
```

**Important:**
- ⚠️ Must be **LIVE** keys (start with `rzp_live_`)
- ⚠️ TEST keys (`rzp_test_`) won't work in production
- ⚠️ Complete KYC before going live

**KYC Requirements:**
- Business PAN card
- Bank account details
- Business address proof
- Director/Owner ID proof

---

### 5️⃣ **Admin Email Addresses** (REQUIRED)

**What:** Email addresses that should have admin access

**Format:** Comma-separated list

**What I Need:**
```
ADMIN_EMAILS: _________________________________________
```

**Example:**
```
owner@eyebuckz.com,admin@eyebuckz.com,yourname@gmail.com
```

**Note:**
- Only these emails can access `/admin` panel
- Anyone logging in with these emails gets ADMIN role
- At least one email required

---

### 6️⃣ **Backend Hosting Platform** (REQUIRED)

**What:** Where your API server will run

**Where to Deploy (Choose ONE):**

**Option A: Railway (Recommended - Easiest)**
- URL: [railway.app](https://railway.app)
- Free tier: $5 credit/month
- GitHub integration: Auto-deploy on push
- Built-in PostgreSQL

**Option B: Heroku**
- URL: [heroku.com](https://heroku.com)
- Eco plan: $5/month
- CLI-based deployment
- Established platform

**Option C: DigitalOcean App Platform**
- URL: [digitalocean.com](https://digitalocean.com)
- Basic plan: $5/month
- Good performance
- More control

**What I Need:**
```
Backend Hosting Platform: ______________ (Railway/Heroku/DigitalOcean)
Backend URL (after deployment): https://api._______________.com
```

---

### 7️⃣ **Frontend Hosting Platform** (REQUIRED)

**What:** Where your React app will be hosted

**Where to Deploy (Choose ONE):**

**Option A: Vercel (Recommended - FREE)**
- URL: [vercel.com](https://vercel.com)
- Free tier: Unlimited bandwidth
- Auto SSL certificates
- Best for React/Vite apps
- GitHub integration

**Option B: Netlify**
- URL: [netlify.com](https://netlify.com)
- Free tier: 100GB bandwidth/month
- Auto SSL
- Good for static sites

**Option C: Railway**
- URL: [railway.app](https://railway.app)
- $5/month (same as backend)
- All-in-one platform

**What I Need:**
```
Frontend Hosting Platform: ______________ (Vercel/Netlify/Railway)
Frontend URL (after deployment): https://_______________.com
```

---

### 8️⃣ **SSL Certificate** (AUTO-PROVIDED)

**What:** HTTPS encryption for secure connections

**Status:** ✅ **Automatic** - All hosting platforms provide free SSL

**No Action Required**
- Vercel/Netlify: Auto SSL via Let's Encrypt
- Railway: Auto SSL
- Heroku: Auto SSL
- Just ensure you're using `https://` in production

---

### 9️⃣ **Error Tracking Service** (OPTIONAL - Recommended)

**What:** Track and monitor errors in production

**Where to Get:**

**Option A: Sentry (Recommended - FREE tier)**
- URL: [sentry.io](https://sentry.io)
- Free tier: 5,000 errors/month
- Real-time error alerts
- Source map support

**What I Need (if using Sentry):**
```
SENTRY_DSN: https://_____________________________
```

**Setup Time:** 10 minutes

---

### 🔟 **Analytics Service** (OPTIONAL - Recommended)

**What:** Track user behavior and page views

**Where to Get:**

**Option A: Google Analytics (FREE)**
- URL: [analytics.google.com](https://analytics.google.com)
- Create property → Get Measurement ID

**What I Need (if using GA):**
```
VITE_GA_MEASUREMENT_ID: G-__________________
```

**Setup Time:** 5 minutes

---

### 1️⃣1️⃣ **Email Service** (OPTIONAL - For notifications)

**What:** Send transactional emails (purchase confirmations, password resets)

**Where to Get:**

**Option A: Resend (Recommended - FREE tier)**
- URL: [resend.com](https://resend.com)
- Free tier: 3,000 emails/month
- Developer-friendly API

**Option B: SendGrid**
- URL: [sendgrid.com](https://sendgrid.com)
- Free tier: 100 emails/day

**What I Need (if using Resend):**
```
RESEND_API_KEY: re_______________________________
RESEND_FROM_EMAIL: noreply@_____________________.com
```

**Setup Time:** 15 minutes
**Requires:** Domain verification

---

### 1️⃣2️⃣ **SMS Service** (OPTIONAL - For OTP verification)

**What:** Send SMS for phone verification

**Where to Get:**

**Option A: Twilio**
- URL: [twilio.com](https://twilio.com)
- Pay-as-you-go: ~$0.0075/SMS
- Free trial: $15 credit

**What I Need (if using Twilio):**
```
TWILIO_ACCOUNT_SID: AC_____________________________
TWILIO_AUTH_TOKEN: ________________________________
TWILIO_PHONE_NUMBER: +1_________________________
```

**Setup Time:** 20 minutes
**Cost:** $0.0075 per SMS

---

### 1️⃣3️⃣ **Uptime Monitoring** (OPTIONAL - Recommended)

**What:** Get alerts when your site goes down

**Where to Get:**

**Option A: UptimeRobot (FREE)**
- URL: [uptimerobot.com](https://uptimerobot.com)
- Free tier: 50 monitors
- 5-minute checks
- Email/SMS alerts

**What I Need:**
- Just add your domain: `https://eyebuckz.com`

**Setup Time:** 5 minutes

---

### 1️⃣4️⃣ **GitHub Repository** (REQUIRED for auto-deploy)

**What:** Git repository for version control and CI/CD

**Status:** Assuming you already have this

**What I Need:**
```
GitHub Repository URL: https://github.com/___________/___________
```

**For Auto-Deploy:**
- Connect to Railway/Vercel/Netlify
- Push to `main` branch → Auto deployment

---

### 1️⃣5️⃣ **Admin User Details** (REQUIRED)

**What:** Your admin account information

**What I Need:**
```
Admin Name: _______________________________________
Admin Email: ______________________________________
Admin Phone (E.164): ______________________________
```

**Phone Format (E.164):**
- India: `+91XXXXXXXXXX`
- USA: `+1XXXXXXXXXX`
- UK: `+44XXXXXXXXXX`

---

## 📊 Priority Levels

### 🔴 **CRITICAL** (Can't deploy without these)

1. ✅ Domain Name
2. ✅ Google OAuth Credentials
3. ✅ Production Database
4. ✅ Razorpay Live Keys
5. ✅ Admin Emails
6. ✅ Backend Hosting Platform
7. ✅ Frontend Hosting Platform

### 🟡 **IMPORTANT** (Highly recommended)

8. ✅ Error Tracking (Sentry)
9. ✅ Analytics (Google Analytics)
10. ✅ Uptime Monitoring

### 🟢 **OPTIONAL** (Nice to have)

11. ✅ Email Service (for notifications)
12. ✅ SMS Service (for OTP)

---

## 💰 Cost Breakdown

### Free Tier Option (Total: $0/month)

- Domain: $10/year (~$1/month)
- Google OAuth: FREE
- Database: Supabase FREE tier
- Razorpay: FREE (2% transaction fee)
- Backend: Railway $5 credit/month (covers basic usage)
- Frontend: Vercel FREE
- Error Tracking: Sentry FREE tier
- Analytics: Google Analytics FREE
- Uptime Monitoring: UptimeRobot FREE

**Total:** ~$1/month for domain only!

### Paid Tier Option (Total: ~$20/month)

- Domain: $10/year (~$1/month)
- Database: Railway PostgreSQL ($5/month)
- Backend: Railway ($5/month)
- Frontend: Vercel FREE
- Email Service: Resend Paid ($20/month for 50k emails)
- SMS Service: Twilio Pay-as-you-go (~$5/month)
- Other services: FREE tiers

**Total:** ~$20-40/month depending on usage

---

## 📝 Information Collection Form

Fill this out and share with me:

```
============================================
EYEBUCKZ LMS - PRODUCTION CREDENTIALS
============================================

1. DOMAIN
   Domain: ________________________________

2. GOOGLE OAUTH
   Client ID: ____________________________
   Client Secret: ________________________

3. DATABASE
   Platform: [ ] Supabase [ ] Railway [ ] Heroku
   Connection URL: _______________________

4. RAZORPAY
   Key ID: rzp_live______________________
   Key Secret: ___________________________
   Webhook Secret: _______________________

5. ADMIN
   Admin Emails: _________________________

6. HOSTING
   Backend Platform: _____________________
   Frontend Platform: ____________________

7. OPTIONAL SERVICES (Leave blank if not using)
   Sentry DSN: ___________________________
   GA Measurement ID: ____________________
   Resend API Key: _______________________
   Resend From Email: ____________________
   Twilio Account SID: ___________________
   Twilio Auth Token: ____________________
   Twilio Phone: _________________________

8. GITHUB
   Repository URL: _______________________

============================================
```

---

## 🚀 Deployment Steps (Once You Provide Above)

Once you provide all the credentials, I will:

1. ✅ Update environment variables
2. ✅ Configure OAuth redirect URIs
3. ✅ Set up production database schema
4. ✅ Deploy backend to hosting platform
5. ✅ Deploy frontend to hosting platform
6. ✅ Configure DNS records
7. ✅ Set up error tracking
8. ✅ Configure analytics
9. ✅ Test complete flow
10. ✅ Go live! 🎉

**Estimated Time:** 1-2 hours after you provide credentials

---

## 📞 Support

If you need help getting any of these:

1. **Google OAuth:** See `DEPLOYMENT_GUIDE.md` Section 3
2. **Database Setup:** See `DEPLOYMENT_GUIDE.md` Section 4
3. **Razorpay KYC:** Contact Razorpay support
4. **General Questions:** Create GitHub issue or contact support

---

## 🎯 Minimum to Get Started

If you want to start with the absolute minimum:

**Bare Minimum (3 items):**
1. Domain name
2. Google OAuth credentials
3. Production database

**I can:**
- Use mock Razorpay (testing only, no real payments)
- Deploy to free tiers
- Skip optional services initially

**You can add later:**
- Real payment gateway
- Error tracking
- Email/SMS services

---

## ✅ Ready to Deploy?

Once you have the CRITICAL items (1-7), let me know and I'll:

1. Guide you through any missing setup
2. Configure all credentials
3. Deploy to production
4. Test everything
5. Hand over a fully working production system

**Just say:** "I have the credentials ready" and share the filled form above!

---

*Last Updated: January 2025*
