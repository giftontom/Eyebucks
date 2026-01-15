# 🚀 Phase 2B Setup Guide: Payment Integration & OAuth

Complete guide to setting up Razorpay payments and Google OAuth for Eyebuckz LMS.

---

## Overview

Phase 2B adds:
- ✅ Real Razorpay payment integration
- ✅ Google OAuth authentication
- ✅ Mock mode fallback (works without API keys)
- ✅ Automatic enrollment after payment
- ✅ Payment verification & webhooks

---

## 📋 Prerequisites

- Phase 2A completed (backend running)
- Google account (for OAuth setup)
- Razorpay account (optional - has mock mode)

---

## Part 1: Google OAuth Setup (15 min)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select existing project
3. Name: **"Eyebuckz LMS"**
4. Click **"Create"**

### Step 2: Enable Google OAuth

1. In the sidebar: **APIs & Services > OAuth consent screen**
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**

**Fill in required fields:**
- App name: `Eyebuckz LMS`
- User support email: Your email
- Developer contact: Your email
- Click **"Save and Continue"**

**Scopes:**
- Skip this step (click "Save and Continue")

**Test users:**
- Add your email address
- Click **"Save and Continue"**

### Step 3: Create OAuth Credentials

1. Sidebar: **APIs & Services > Credentials**
2. Click **"+ Create Credentials"** > **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Eyebuckz LMS Web`

**Authorized JavaScript origins:**
```
http://localhost:5173
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:5173
http://localhost:3000
```

5. Click **"Create"**
6. **Copy the Client ID** (starts with `xxxxx.apps.googleusercontent.com`)

### Step 4: Configure Frontend

Add to `/Eyebucks/.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

---

## Part 2: Razorpay Setup (10 min)

### Option A: Mock Mode (No Setup Required) ✅

**The system works in mock mode without Razorpay!**

If you don't set up Razorpay, payments will work in mock mode:
- Creates fake order IDs
- Simulates payment success
- Creates enrollments automatically
- Perfect for development

**To use mock mode:** Just skip Razorpay setup entirely!

### Option B: Real Razorpay (Recommended for Testing)

### Step 1: Create Razorpay Account

1. Go to [Razorpay.com](https://razorpay.com/)
2. Click **"Sign Up"**
3. Complete registration
4. Verify email and phone

### Step 2: Get API Keys

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sidebar: **Settings > API Keys**
3. Click **"Generate Test Key"**
4. Click **"Download Key Details"** (save securely!)

You'll get:
- **Key ID:** `rzp_test_xxxxxxxxxxxxx`
- **Key Secret:** `xxxxxxxxxxxxxxxxxxxxx`

### Step 3: Configure Backend

Add to `/server/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
```

### Step 4: Set Up Webhook (Optional)

1. Dashboard: **Settings > Webhooks**
2. Click **"+ Add New Webhook"**
3. Webhook URL: `https://your-domain.com/api/checkout/webhook`
4. Active Events:
   - `payment.captured`
   - `payment.failed`
5. Secret: Generate random string
6. Click **"Create Webhook"**

Add to `/server/.env`:
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 5: Test Cards

**Test Mode Cards:**

**Success:**
- Card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failure:**
- Card: `4000 0000 0000 0002`

---

## Part 3: Update Frontend Files

### Step 1: Replace Service Files

```bash
# Backup old files
mv services/enrollmentService.ts services/enrollmentService.old.ts
mv services/progressService.ts services/progressService.old.ts
mv pages/Checkout.tsx pages/Checkout.old.tsx

# Use new API versions
mv services/enrollmentService.new.ts services/enrollmentService.ts
mv services/progressService.new.ts services/progressService.ts
mv pages/Checkout.new.tsx pages/Checkout.tsx
```

### Step 2: Install Google OAuth Library (Optional)

For real Google OAuth integration:

```bash
npm install @react-oauth/google
```

---

## Part 4: Environment Variables Checklist

### Backend (`/server/.env`)

```env
# Required
DATABASE_URL="postgresql://..."
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173"
JWT_SECRET="your-secret-key-here"

# Optional - Mock mode works without these
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Optional - Mock auth works without this
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Admin emails (comma-separated)
ADMIN_EMAILS=admin@eyebuckz.com,owner@eyebuckz.com
```

### Frontend (`/Eyebucks/.env.local`)

```env
# Required
VITE_API_URL=http://localhost:4000

# Optional - Mock auth works without this
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## Part 5: Testing

### Test 1: Mock Payment (No Razorpay)

1. Start backend: `cd server && npm run dev`
2. Start frontend: `cd .. && npm run dev`
3. Go to http://localhost:5173
4. Login (mock auth)
5. Browse course → Click "Enroll"
6. Fill form → Click "Pay"
7. Should see "Mock payment mode"
8. Wait 2 seconds → Payment success
9. Redirects to Dashboard
10. ✅ Course appears in "My Studio"

### Test 2: Real Razorpay Payment

**Prerequisites:** Razorpay keys configured

1. Same steps as above
2. When you click "Pay", Razorpay modal opens
3. Use test card: `4111 1111 1111 1111`
4. CVV: `123`, Expiry: `12/25`
5. Click "Pay"
6. Payment processes → Success
7. Redirects to Dashboard
8. ✅ Course appears with enrollment

### Test 3: Google OAuth (With Google Client ID)

1. Click "Continue with Google"
2. Google login popup opens
3. Select your test account
4. Grant permissions
5. Redirects back to app
6. ✅ Logged in with Google profile

### Test 4: Payment Webhook (Production Only)

1. Make real payment
2. Check server logs for webhook event
3. Verify enrollment created
4. ✅ User receives access

---

## 🐛 Troubleshooting

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Check Authorized redirect URIs in Google Console
- Must exactly match: `http://localhost:5173`

**Error: "invalid_client"**
- Check VITE_GOOGLE_CLIENT_ID in `.env.local`
- Restart frontend after changing env vars

**OAuth popup blocked**
- Allow popups in browser
- Use mock auth as fallback

### Razorpay Issues

**"Payment gateway not configured"**
- Razorpay keys missing → Using mock mode
- This is normal! Mock mode works fine

**"Invalid API key"**
- Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
- Ensure using test keys (start with `rzp_test_`)

**Payment modal doesn't open**
- Check browser console for errors
- Ensure Razorpay script loaded
- Try refreshing page

**Webhook not working**
- For local development, use ngrok
- `ngrok http 4000`
- Update webhook URL in Razorpay dashboard

### General Issues

**"Failed to fetch"**
- Backend not running
- Check http://localhost:4000/health
- Verify VITE_API_URL in `.env.local`

**"Enrollment already exists"**
- User already owns course
- Check Dashboard
- Clear database: `npm run prisma:migrate reset`

---

## 📊 Verify Setup

### Backend Health Check

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

### Frontend Connection

```bash
curl http://localhost:5173
```

Should load the homepage.

### Database Check

```bash
cd server
npm run prisma:studio
```

Check:
- Users table has entries
- Enrollments table shows test data
- Progress table tracks watch time

---

## 🎯 Success Criteria

Phase 2B is complete when:

- [ ] Backend has all auth & checkout endpoints
- [ ] Frontend loads Razorpay script
- [ ] Mock payment creates enrollment
- [ ] Real Razorpay payment works (if configured)
- [ ] Google OAuth login works (if configured)
- [ ] Enrollment appears in Dashboard
- [ ] Video player remains accessible after enrollment
- [ ] Progress tracking still works

---

## 🔒 Security Notes

### For Development:
- ✅ Mock mode is safe and convenient
- ✅ Test keys are fine for local development
- ✅ localhost URLs are acceptable

### For Production:
- 🔴 Never commit real API keys to Git
- 🔴 Use environment variables only
- 🔴 Enable webhook signature verification
- 🔴 Use live/production Razorpay keys
- 🔴 Update Google OAuth URLs to production domain
- 🔴 Add rate limiting
- 🔴 Enable HTTPS only

---

## 📁 Files Created in Phase 2B

### Backend:
```
server/src/routes/
├── checkout.ts (NEW) - Razorpay endpoints
└── auth.ts (NEW) - Google OAuth endpoints
```

### Frontend:
```
hooks/
└── useScript.ts (NEW) - Script loading hook

pages/
└── Checkout.new.tsx (NEW) - Real payment integration

services/
├── apiClient.ts (UPDATED) - Added auth & checkout methods
├── enrollmentService.new.ts (NEW) - API-based
└── progressService.new.ts (NEW) - API-based
```

---

## ⏭️ Next: Phase 2C (Optional Enhancements)

After Phase 2B, consider:

1. **Email Notifications** (Resend/SendGrid)
   - Send enrollment confirmation
   - Send payment receipts
   - Send completion certificates

2. **Certificate Generation**
   - Auto-generate PDF certificates
   - Store in Cloudinary/S3
   - Send via email

3. **Video CDN** (Cloudinary)
   - Upload course videos
   - Signed URLs for security
   - Adaptive bitrate streaming

---

## 📞 Support

### Resources:
- [Razorpay Docs](https://razorpay.com/docs/)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [React OAuth Google](https://www.npmjs.com/package/@react-oauth/google)

### Quick Links:
- Razorpay Dashboard: https://dashboard.razorpay.com/
- Google Cloud Console: https://console.cloud.google.com/
- Prisma Studio: `npm run prisma:studio`

---

*Phase 2B - Payment Integration Complete!* ✅
