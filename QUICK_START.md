# 🚀 Eyebuckz LMS - Quick Start Guide

Get your Eyebuckz LMS running in **5 minutes**.

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or Supabase account)
- Git

---

## 🏃 Quick Setup (5 minutes)

### 1. Clone & Install (1 min)

```bash
cd server
npm install
```

### 2. Database Setup (2 min)

**Option A: Supabase (Easiest)**

1. Go to [supabase.com](https://supabase.com) → New Project
2. Get connection string: Settings > Database > Connection String (Transaction pooler)
3. Create `server/.env`:

```env
DATABASE_URL="your_supabase_connection_string_here"
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173"
JWT_SECRET="test-secret-key-12345678901234567890"
```

**Option B: Local PostgreSQL**

```bash
createdb eyebuckz
```

Create `server/.env`:
```env
DATABASE_URL="postgresql://localhost:5432/eyebuckz"
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173"
JWT_SECRET="test-secret-key-12345678901234567890"
```

### 3. Setup Database (1 min)

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Start Backend (10 sec)

```bash
npm run dev
```

✅ Backend running on http://localhost:4000

### 5. Start Frontend (10 sec)

New terminal:

```bash
cd ..
echo "VITE_API_URL=http://localhost:4000" > .env.local
npm run dev
```

✅ Frontend running on http://localhost:5173

---

## 🧪 Test It Works

1. Open http://localhost:5173
2. Click "Continue with Google" (mock login)
3. Go to "Browse Courses"
4. Click a course → Enroll → Complete Payment
5. Check Dashboard → See your enrollment
6. Click course → Watch video
7. Progress auto-saves every 30 seconds ✅

---

## 📊 View Database

```bash
cd server
npm run prisma:studio
```

Opens GUI at http://localhost:5555

---

## 🧑‍💻 Test Users

**Admin:**
- Email: admin@eyebuckz.com
- ID: `admin_test`
- Access: All courses

**Demo User:**
- Email: demo@example.com
- ID: `user_test`
- Enrolled: Complete Masterclass

---

## 🔧 Common Issues

### Backend won't start

```bash
# Check database connection
cd server
npm run prisma:studio
```

### Frontend can't connect

Check `.env.local` has:
```env
VITE_API_URL=http://localhost:4000
```

### Port already in use

Change port in `server/.env`:
```env
PORT=4001
```

And update frontend `.env.local`:
```env
VITE_API_URL=http://localhost:4001
```

---

## 📚 Full Documentation

- Backend setup: `/server/README.md`
- Migration guide: `/docs/BACKEND_MIGRATION_GUIDE.md`
- Implementation guide: `/docs/IMPLEMENTATION_GUIDE.md`
- Phase 2A summary: `/docs/PHASE_2A_COMPLETE.md`

---

## ⏭️ Next: Phase 2B (Payment Integration)

Follow: `/docs/IMPLEMENTATION_GUIDE.md#phase-2b-payment-integration-week-2`

---

**Need help?** Check the docs above or review server logs in terminal.
