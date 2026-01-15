# Eyebuckz LMS - Backend API

Express + TypeScript + Prisma + PostgreSQL backend for Eyebuckz LMS.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Set Up Database

#### Option A: Local PostgreSQL

Install PostgreSQL locally, then create a database:

```bash
createdb eyebuckz
```

#### Option B: Supabase (Recommended for Development)

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string from Settings > Database
4. Use the "Transaction" pooler connection string

### 3. Configure Environment

Create `.env` file in `/server`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/eyebuckz"
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
```

### 4. Run Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Seed Database

```bash
npm run prisma:seed
```

This creates:
- 2 test users (admin@eyebuckz.com, demo@example.com)
- 4 courses with 19 modules
- 1 test enrollment

### 6. Start Server

```bash
npm run dev
```

Server runs on `http://localhost:4000`

## 📁 Project Structure

```
server/
├── src/
│   ├── index.ts              # Express app entry
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   └── errorHandler.ts  # Error handling
│   ├── routes/
│   │   ├── courses.ts        # Course endpoints
│   │   ├── enrollments.ts   # Enrollment endpoints
│   │   ├── progress.ts      # Progress tracking
│   │   ├── checkout.ts      # Payment endpoints
│   │   └── auth.ts          # Auth endpoints
│   └── utils/
│       └── db.ts            # Prisma client
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
└── package.json
```

## 🔧 Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run prisma:generate   # Generate Prisma Client
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio (GUI)
npm run prisma:seed       # Seed database
```

## 📡 API Endpoints

### Courses
- `GET /api/courses` - List all published courses
- `GET /api/courses/:id` - Get course details
- `GET /api/courses/:id/modules` - Get course modules

### Enrollments
- `POST /api/enrollments` - Create enrollment
- `GET /api/enrollments/user/:userId` - Get user enrollments
- `GET /api/enrollments/check/:userId/:courseId` - Check access
- `PATCH /api/enrollments/:id/access` - Update last access

### Progress
- `POST /api/progress` - Save progress
- `GET /api/progress/:userId/:courseId` - Get progress
- `PATCH /api/progress/complete` - Mark module complete

### Checkout (Phase 2)
- `POST /api/checkout/create-order` - Create Razorpay order
- `POST /api/checkout/verify` - Verify payment
- `POST /api/checkout/webhook` - Razorpay webhook handler

## 🧪 Testing

### Test Users

**Admin:**
- Email: admin@eyebuckz.com
- ID: admin_test
- Role: ADMIN

**Demo User:**
- Email: demo@example.com
- ID: user_test
- Role: USER
- Has 1 enrollment (Complete Masterclass)

### Test with cURL

```bash
# Get all courses
curl http://localhost:4000/api/courses

# Get user enrollments
curl http://localhost:4000/api/enrollments/user/user_test

# Check access
curl http://localhost:4000/api/enrollments/check/user_test/c1-masterclass
```

## 🔐 Authentication

Currently using mock authentication via headers:

```bash
curl -H "x-user-id: user_test" \
     -H "x-user-email: demo@example.com" \
     -H "x-user-role: USER" \
     http://localhost:4000/api/progress/user_test/c1-masterclass
```

In production, replace with JWT tokens.

## 📊 Database Management

### View data with Prisma Studio

```bash
npm run prisma:studio
```

Opens GUI at `http://localhost:5555`

### Reset database

```bash
npx prisma migrate reset
npm run prisma:seed
```

## 🚧 Next Steps

- [ ] Implement JWT authentication
- [ ] Add Razorpay payment integration
- [ ] Add email notifications (Resend)
- [ ] Add rate limiting
- [ ] Add request validation (Zod)
- [ ] Add unit tests (Jest/Vitest)
- [ ] Deploy to production
