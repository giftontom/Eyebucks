# 🔄 Backend Migration Guide

## Overview

This guide explains how to migrate from the localStorage-based services to the backend API.

---

## 📋 Migration Checklist

### Backend Setup

- [ ] Install server dependencies: `cd server && npm install`
- [ ] Set up PostgreSQL database (local or Supabase)
- [ ] Create `server/.env` file with DATABASE_URL
- [ ] Run migrations: `npm run prisma:migrate`
- [ ] Generate Prisma client: `npm run prisma:generate`
- [ ] Seed database: `npm run prisma:seed`
- [ ] Start server: `npm run dev` (runs on port 4000)

### Frontend Setup

- [ ] Add `VITE_API_URL=http://localhost:4000` to root `.env.local`
- [ ] Replace old service files with new API versions
- [ ] Update components to use async/await
- [ ] Test end-to-end flow

---

## 🚀 Step 1: Backend Setup

### Install Dependencies

```bash
cd server
npm install
```

### Set Up Database

**Option A: Supabase (Recommended)**

1. Go to [https://supabase.com](https://supabase.com) and create a project
2. Go to Settings > Database
3. Copy the "Transaction" pooler connection string
4. Create `server/.env`:

```env
DATABASE_URL="postgresql://postgres.xxxxx:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
JWT_SECRET="your-super-secret-key-here"
```

**Option B: Local PostgreSQL**

```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Linux

# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start  # Linux

# Create database
createdb eyebuckz

# Create .env
DATABASE_URL="postgresql://localhost:5432/eyebuckz"
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173"
JWT_SECRET="your-super-secret-key-here"
```

### Run Migrations & Seed

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with test data
npm run prisma:seed
```

Expected output:
```
✅ Created users: Admin User, Demo User
✅ Created 4 courses with modules
✅ Created test enrollment for demo user
🎉 Database seeding completed successfully!
```

### Start Server

```bash
npm run dev
```

Server should start on `http://localhost:4000`

Test it:
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok","timestamp":"...","environment":"development"}
```

---

## 🔧 Step 2: Frontend Migration

### Add Environment Variable

Create or update `/Eyebucks/.env.local`:

```env
VITE_API_URL=http://localhost:4000
```

### Replace Service Files

```bash
# Backup old files (optional)
mv services/enrollmentService.ts services/enrollmentService.old.ts
mv services/progressService.ts services/progressService.old.ts

# Use new API versions
mv services/enrollmentService.new.ts services/enrollmentService.ts
mv services/progressService.new.ts services/progressService.ts
```

---

## 📝 Step 3: Update Components

The new services are **async**, so components need to use `async/await`.

### Example: Dashboard.tsx

**Before (localStorage):**
```typescript
const enrollments = enrollmentService.getUserEnrollments(user.id);
```

**After (API):**
```typescript
const enrollments = await enrollmentService.getUserEnrollments(user.id);
```

**Full Update:**

```typescript
// Update useEffect to handle async
useEffect(() => {
  const loadEnrollments = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const enrollments = await enrollmentService.getUserEnrollments(user.id);

      const courses = enrollments
        .map(enrollment => {
          const course = MOCK_COURSES.find(c => c.id === enrollment.courseId);
          if (!course) return null;

          return {
            ...course,
            enrollmentId: enrollment.id,
            progress: enrollment.progress.overallPercent,
            enrolledAt: enrollment.enrolledAt,
            lastAccessedAt: enrollment.lastAccessedAt
          };
        })
        .filter(Boolean);

      setEnrolledCourses(courses);
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  loadEnrollments();
}, [user]);
```

### Example: Checkout.tsx

**Before:**
```typescript
enrollmentService.enrollUser({
  userId: user!.id,
  courseId: course!.id,
  paymentId,
  orderId,
  amount: course!.price
});
```

**After:**
```typescript
await enrollmentService.enrollUser({
  userId: user!.id,
  courseId: course!.id,
  paymentId,
  orderId,
  amount: course!.price
});
```

### Example: Learn.tsx

**Before:**
```typescript
const hasAccess = enrollmentService.hasAccess(user.id, id);
```

**After:**
```typescript
const hasAccess = await enrollmentService.hasAccess(user.id, id);
```

**Full Update:**

```typescript
// ACCESS CONTROL: Check enrollment before allowing access
useEffect(() => {
  const checkAccess = async () => {
    if (!user) {
      alert('Please login to access this course');
      navigate('/');
      return;
    }

    if (!id) {
      navigate('/');
      return;
    }

    setIsLoading(true);

    try {
      // Check enrollment (now async)
      const enrolled = await enrollmentService.hasAccess(user.id, id);

      if (!enrolled) {
        const shouldPurchase = window.confirm(
          'You need to purchase this course to access it. Go to checkout?'
        );
        if (shouldPurchase) {
          navigate(`/checkout/${id}`);
        } else {
          navigate('/');
        }
        return;
      }

      // Update last accessed time
      await enrollmentService.updateLastAccess(user.id, id);
      setHasAccess(true);
    } catch (error) {
      console.error('Error checking access:', error);
      alert('Error checking course access. Please try again.');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  checkAccess();
}, [user, id, navigate]);
```

---

## 🧪 Step 4: Testing

### Test Backend Endpoints

```bash
# Get all courses
curl http://localhost:4000/api/courses

# Get user enrollments (use test user ID from seed)
curl -H "x-user-id: user_test" \
     -H "x-user-email: demo@example.com" \
     -H "x-user-role: USER" \
     http://localhost:4000/api/enrollments/user/user_test

# Check access
curl http://localhost:4000/api/enrollments/check/user_test/c1-masterclass

# Get progress stats
curl -H "x-user-id: user_test" \
     http://localhost:4000/api/progress/user_test/c1-masterclass/stats
```

### Test Frontend Flow

1. **Start both servers:**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev

   # Terminal 2: Frontend
   cd .. && npm run dev
   ```

2. **Test enrollment flow:**
   - Go to http://localhost:5173
   - Login (mock Google auth)
   - Browse to a course
   - Click "Enroll"
   - Complete mock payment
   - Verify enrollment appears in Dashboard

3. **Test progress tracking:**
   - Go to Dashboard
   - Click on enrolled course
   - Watch video for 30+ seconds
   - Check that progress is saved (look for toast notification)
   - Refresh page and verify resume position

4. **Test completion:**
   - Watch module to 95%+
   - Verify "Module Completed!" notification
   - Check Dashboard shows updated progress percentage

---

## 🐛 Troubleshooting

### Backend won't start

**Error:** `PrismaClientInitializationError`
- **Solution:** Check DATABASE_URL in `.env`
- **Solution:** Run `npm run prisma:generate`

**Error:** `Port 4000 already in use`
- **Solution:** Change PORT in `.env` to 4001
- **Solution:** Update VITE_API_URL in frontend `.env.local`

### Frontend can't connect to backend

**Error:** `Failed to fetch`
- **Solution:** Verify backend is running on correct port
- **Solution:** Check CORS settings in server `index.ts`
- **Solution:** Verify VITE_API_URL in `.env.local`

### Enrollment not working

**Error:** `No active enrollment found`
- **Solution:** Check that user is logged in
- **Solution:** Verify enrollment was created (check Prisma Studio)
- **Solution:** Check x-user-id header is being sent

### Progress not saving

**Error:** `Progress not persisting`
- **Solution:** Check network tab for API calls
- **Solution:** Verify authentication headers
- **Solution:** Check server logs for errors

---

## 📊 Verify Migration

Use Prisma Studio to view database:

```bash
cd server
npm run prisma:studio
```

Opens GUI at `http://localhost:5555`

Check:
- ✅ Users table has test users
- ✅ Courses table has 4 courses
- ✅ Modules table has 19 modules
- ✅ Enrollments table has test enrollment
- ✅ Progress table shows saved progress

---

## 🔄 Rollback (If Needed)

If you need to rollback to localStorage:

```bash
# Restore old services
mv services/enrollmentService.old.ts services/enrollmentService.ts
mv services/progressService.old.ts services/progressService.ts

# Remove .env.local
rm .env.local
```

---

## ✅ Success Criteria

Migration is complete when:

- [ ] Backend runs without errors
- [ ] Frontend connects to backend successfully
- [ ] Login works
- [ ] Course browsing works
- [ ] Enrollment creation works
- [ ] Progress tracking works (auto-save every 30s)
- [ ] Module completion works
- [ ] Dashboard shows correct enrollment data
- [ ] Video resume position works

---

## 🎯 Next Steps

After successful migration:

1. **Phase 2B:** Integrate real Razorpay payment
2. **Phase 2C:** Add Google OAuth authentication
3. **Phase 3:** Add email notifications
4. **Phase 4:** Add certificate generation
5. **Deploy:** Deploy to production

---

## 📞 Support

If you encounter issues:

1. Check server logs in terminal
2. Check browser console for errors
3. Check network tab for failed requests
4. Review this guide thoroughly
5. Check the server README.md

---

*Last updated: Phase 2A - Backend Foundation Complete*
