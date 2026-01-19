# 🚀 Deploy Eyebuckz LMS in 10 Minutes

**Quick deployment guide** - Get your LMS live in production FAST!

---

## ⚡ Option 1: Interactive Script (Recommended)

```bash
./deploy.sh
```

Follow the interactive menu to:
1. Run pre-deployment checks
2. Build the project
3. Deploy to Railway
4. Deploy to Vercel

---

## 🎯 Option 2: Manual Deployment (Step-by-Step)

### Step 1: Push to GitHub (2 min)

```bash
git init
git add .
git commit -m "feat: Production-ready LMS"
git remote add origin https://github.com/YOUR_USERNAME/eyebuckz-lms.git
git push -u origin main
```

### Step 2: Deploy Backend to Railway (3 min)

1. **Go to:** https://railway.app
2. **Create project** → Provision PostgreSQL
3. **Add service** → Deploy from GitHub → Select repo
4. **Configure:**
   - Settings → Root Directory: `server`
   - Settings → Networking → Generate Domain
5. **Add variables:**
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=your-random-32-char-secret
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
6. **Copy backend URL** (e.g., `https://xxx.up.railway.app`)

### Step 3: Deploy Frontend to Vercel (2 min)

1. **Go to:** https://vercel.com
2. **Import project** → Select GitHub repo
3. **Add variables:**
   ```env
   VITE_API_URL=https://your-backend.up.railway.app
   ```
4. **Deploy** → Copy Vercel URL

### Step 4: Update CORS (1 min)

1. Go back to Railway → Backend → Variables
2. Update `ALLOWED_ORIGINS` with your Vercel URL
3. Auto-redeploys in ~30 seconds

### Step 5: Test (2 min)

Visit your Vercel URL:
- ✅ Homepage loads
- ✅ Can browse courses
- ✅ Mock payment works
- ✅ Video player works

**🎉 You're live!**

---

## 📋 Environment Variables Cheat Sheet

### Backend (Railway)

**Required:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=4000
JWT_SECRET=your-super-secret-key-min-32-chars
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

**Optional** (app works in mock mode without these):
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

### Frontend (Vercel)

**Required:**
```env
VITE_API_URL=https://your-backend.up.railway.app
```

**Optional:**
```env
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## 🆘 Quick Troubleshooting

### Backend won't build?
- Check Root Directory is set to `server`
- Verify `package.json` has `"postinstall": "prisma generate"`

### Frontend can't reach API?
- Verify `VITE_API_URL` in Vercel
- Check CORS: `ALLOWED_ORIGINS` in Railway includes Vercel URL
- Test backend: `curl https://your-backend.railway.app/health`

### Database connection fails?
- Use `${{Postgres.DATABASE_URL}}` in Railway variables
- Ensure PostgreSQL service is running
- Restart backend service

---

## 💰 Cost

- **Free tier:** $5/month (Railway) + $0 (Vercel) = **$5/month**
- **Paid tier:** ~$15-25/month for production scale

---

## 📚 Full Documentation

For detailed deployment guide with screenshots and troubleshooting:
- Read: **PRODUCTION_DEPLOYMENT.md**

---

## ✅ Post-Deployment Checklist

- [ ] Homepage loads
- [ ] Courses visible
- [ ] Mock payment works
- [ ] Video player plays
- [ ] Progress tracks
- [ ] Admin login works
- [ ] Backend health check passes
- [ ] No CORS errors in console

---

## 🎯 Next Steps

1. **Test thoroughly** - Go through all user flows
2. **Add API keys** - Enable real payments, OAuth, etc.
3. **Custom domain** - Configure your domain in Vercel
4. **Monitoring** - Set up UptimeRobot or Sentry
5. **Gather feedback** - Share with beta users

---

## 🚀 Deploy Commands (CLI Method)

```bash
# Install CLIs
npm i -g @railway/cli vercel

# Deploy backend
cd server
railway login
railway link
railway up

# Deploy frontend
cd ..
vercel --prod
```

---

**Ready to deploy?** Run `./deploy.sh` or follow Option 2 above!

**Need help?** Check PRODUCTION_DEPLOYMENT.md for detailed guide.

---

*Deployment time: ~10 minutes | Cost: $5/month | Difficulty: Easy*
