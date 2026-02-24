# 🔧 Supabase + Cloudinary Integration Setup

## ⚠️ SECURITY WARNING
The credentials you shared are now **COMPROMISED**. Follow these steps to secure your account:

### Step 1: Rotate Credentials (CRITICAL - Do This First!)

#### Supabase:
1. Go to https://supabase.com/dashboard/project/rlvceclvzzvuaxjpotlg
2. Navigate to **Settings** → **API**
3. Click **Reset** next to "anon/public" key
4. Generate new service_role key
5. Copy the new keys

#### Cloudinary:
1. Go to https://console.cloudinary.com/settings/security
2. Click **Generate New API Secret**
3. Copy the new secret

---

## Step 2: Get Supabase Database Password

1. Go to https://supabase.com/dashboard/project/rlvceclvzzvuaxjpotlg
2. Navigate to **Settings** → **Database**
3. Scroll to **Connection String**
4. Click **URI** tab
5. Copy the password from the connection string

**Or generate a new password:**
- Click **Reset Database Password**
- Copy the new password
- Update your `.env` file

---

## Step 3: Update Environment Variables

### Backend (`/server/.env`):

```bash
# Replace YOUR_DATABASE_PASSWORD with actual password from Supabase
DATABASE_URL="postgresql://postgres.rlvceclvzzvuaxjpotlg:YOUR_DATABASE_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

# After rotating Cloudinary credentials, update these:
CLOUDINARY_CLOUD_NAME="dgpbpirmf"
CLOUDINARY_API_KEY="NEW_API_KEY_HERE"
CLOUDINARY_API_SECRET="NEW_API_SECRET_HERE"
```

---

## Step 4: Migrate Database to Supabase

Once you have the correct `DATABASE_URL`, run:

```bash
cd server

# Generate Prisma client with new connection
npm run prisma:generate

# Run migrations to create tables in Supabase
npm run prisma:migrate

# Seed the database with test data
npm run prisma:seed
```

---

## Step 5: Test Cloudinary Integration

```bash
# Start the backend
cd server
npm run dev

# In another terminal, test video upload
curl -X POST http://localhost:4000/api/admin/videos/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/path/to/test-video.mp4"
```

---

## Step 6: Verify Everything Works

### Check Supabase Connection:
```bash
# In server directory
npx prisma studio
```

This should open Prisma Studio connected to Supabase.

### Check Cloudinary:
1. Upload a test video through Admin Portal
2. Check Cloudinary Dashboard: https://console.cloudinary.com/console/media_library
3. Video should appear in `eyebuckz/videos` folder

---

## Troubleshooting

### Database Connection Fails:
```
Error: P1001: Can't reach database server
```

**Fix:**
1. Check if DATABASE_URL has correct password
2. Verify Supabase project is not paused
3. Check your IP is whitelisted (Supabase allows all by default)

### Cloudinary Upload Fails:
```
Error: Invalid API credentials
```

**Fix:**
1. Verify CLOUDINARY_API_SECRET is correct
2. Make sure API key matches cloud name
3. Check Cloudinary account is active

---

## Production Checklist

Before deploying:

- [ ] Rotate all credentials shown in this conversation
- [ ] Use environment variables (never commit credentials)
- [ ] Enable Supabase connection pooling
- [ ] Set up Cloudinary signed URLs for videos
- [ ] Add rate limiting for upload endpoints
- [ ] Configure Cloudinary auto-backup

---

## Next Steps

After setup is complete:

1. **Test Full Flow:**
   - Admin login → Create course → Upload video → Publish
   - User login → Purchase course → Watch video

2. **Monitor Usage:**
   - Supabase: https://supabase.com/dashboard/project/rlvceclvzzvuaxjpotlg/database/usage
   - Cloudinary: https://console.cloudinary.com/console/usage

3. **Set Up Alerts:**
   - Supabase: Database size > 80% (free tier: 500MB)
   - Cloudinary: Bandwidth > 80% (free tier: 25GB/month)

---

## Cost Estimates

### Free Tier Limits:
- **Supabase:** 500MB database, 2GB bandwidth
- **Cloudinary:** 25GB bandwidth, 25GB storage

### When to Upgrade:
- Supabase: ~1,000 users or 500MB data
- Cloudinary: ~100 video courses (avg 5 videos each, 100MB/video)

**Estimated Monthly Cost at 500 users:**
- Supabase Pro: $25/month
- Cloudinary: $99/month (or use HLS with CDN like Bunny.net for $10/month)

---

## Support

If you encounter issues:
1. Check Supabase logs: Project → Logs → Database
2. Check Cloudinary activity log: Settings → Activity
3. Check backend logs: `npm run dev` output
