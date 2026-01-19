# 🎓 Eyebuckz LMS - Complete Learning Management System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![Node](https://img.shields.io/badge/Node-18+-339933)

**A modern, full-stack Learning Management System built with React, TypeScript, Express, and PostgreSQL.**

[Features](#-features) • [Quick Start](#-quick-start) • [Deploy](#-deploy-to-production) • [Documentation](#-documentation)

</div>

---

## 🌟 Features

### For Students
- 📚 Browse comprehensive course catalog
- 💳 Secure payment processing (Razorpay)
- 🎥 HD video streaming with progress tracking
- ⏯️ Auto-resume from last position
- 📝 Personal notes per module
- 📊 Progress tracking dashboard
- 🏆 Course completion certificates

### For Admins
- 📈 Real-time analytics dashboard
- 🎯 Complete course management (CRUD)
- 👥 User management & role control
- 🎖️ Certificate issuance & management
- 📦 Module management with drag-drop reordering
- 💰 Revenue tracking & reporting

### Technical
- ⚡ Full-stack TypeScript
- 🔐 JWT authentication + Google OAuth
- 💾 PostgreSQL with Prisma ORM
- 🎨 Modern UI with Tailwind CSS
- 📱 Fully responsive design
- 🔒 Enterprise-grade security
- ☁️ Cloudinary video hosting
- 📧 Email notifications (Resend)
- 🛡️ Error boundaries & graceful fallbacks

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/eyebuckz-lms.git
cd eyebuckz-lms

# 2. Backend setup
cd server
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://localhost:5432/eyebuckz"
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5173"
JWT_SECRET="test-secret-key-123"
EOF

# Setup database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Start backend
npm run dev

# 3. Frontend setup (new terminal)
cd ..
npm install

# Create .env.local
echo 'VITE_API_URL=http://localhost:4000' > .env.local

# Start frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Database UI: `npm run prisma:studio` (port 5555)

**Test Accounts:**
- Admin: admin@eyebuckz.com
- User: demo@example.com

**See:** [QUICK_START.md](QUICK_START.md) for detailed setup guide.

---

## 🌐 Deploy to Production

### Option 1: Interactive Script (Recommended)

```bash
./deploy.sh
```

### Option 2: Manual Deployment (10 minutes)

1. **Deploy Backend to Railway**
   - Create PostgreSQL database
   - Deploy Node.js app from GitHub
   - Set root directory to `server`
   - Add environment variables

2. **Deploy Frontend to Vercel**
   - Import GitHub repository
   - Add `VITE_API_URL` variable
   - Deploy

3. **Configure & Test**
   - Update CORS settings
   - Run database migrations
   - Test all features

**See:** [DEPLOY_NOW.md](DEPLOY_NOW.md) for quick deployment
**Full Guide:** [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

**Deployment Cost:** $5-10/month

---

## 📁 Project Structure

```
eyebuckz-lms/
├── server/                    # Backend API
│   ├── src/
│   │   ├── routes/           # API endpoints (43 total)
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── services/         # Business logic
│   │   └── index.ts          # Express app
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (7 models)
│   │   └── seed.ts           # Test data
│   └── package.json
│
├── src/                       # Frontend
│   ├── pages/                # Route components
│   │   ├── Storefront.tsx    # Course catalog
│   │   ├── CourseDetails.tsx # Course info
│   │   ├── Checkout.tsx      # Payment flow
│   │   ├── Dashboard.tsx     # User dashboard
│   │   ├── Learn.tsx         # Video player
│   │   └── Admin.tsx         # Admin portal
│   ├── components/           # Reusable components
│   ├── context/              # React Context (Auth)
│   ├── services/             # API clients
│   └── hooks/                # Custom hooks
│
├── docs/                      # Documentation
│   ├── PHASE_2A_COMPLETE.md  # Backend foundation
│   ├── PHASE_2B_COMPLETE.md  # Payments & auth
│   ├── PHASE_4_COMPLETE.md   # Testing & polish
│   ├── PHASE_5_COMPLETE.md   # Advanced features
│   ├── USER_FLOWS.md         # User journey guides
│   ├── ACCESS_CONTROL.md     # Security docs
│   └── DATA_ARCHITECTURE.md  # Database design
│
├── QUICK_START.md            # 5-minute setup guide
├── DEPLOY_NOW.md             # Quick deployment
├── PRODUCTION_DEPLOYMENT.md  # Complete deployment guide
├── PROJECT_STATUS.md         # Current project status
├── deploy.sh                 # Interactive deployment script
└── README.md                 # This file
```

---

## 🗄️ Database Schema

**7 Core Models:**
- `User` - Authentication & profiles
- `Course` - Course metadata & pricing
- `Module` - Video lessons & content
- `Enrollment` - Student-course relationships
- `Progress` - Video progress tracking
- `Certificate` - Course completion certificates
- `Review` - Course ratings & reviews

**See:** [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md)

---

## 🔑 Environment Variables

### Backend (`server/.env`)

**Required:**
```env
DATABASE_URL="postgresql://localhost:5432/eyebuckz"
NODE_ENV=development
PORT=4000
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173
```

**Optional** (mock mode works without these):
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAILS=admin@example.com
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## 📚 Documentation

### Quick References
- [QUICK_START.md](QUICK_START.md) - 5-minute setup
- [DEPLOY_NOW.md](DEPLOY_NOW.md) - Quick deployment
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current status & roadmap

### Implementation Guides
- [docs/IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md) - Complete roadmap
- [docs/USER_FLOWS.md](docs/USER_FLOWS.md) - User journeys
- [docs/ACCESS_CONTROL.md](docs/ACCESS_CONTROL.md) - Security architecture
- [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md) - Database design

### Completion Reports
- [docs/PHASE_2A_COMPLETE.md](docs/PHASE_2A_COMPLETE.md) - Backend foundation
- [docs/PHASE_2B_COMPLETE.md](docs/PHASE_2B_COMPLETE.md) - Payments & auth
- [docs/PHASE_4_COMPLETE.md](docs/PHASE_4_COMPLETE.md) - Testing & polish
- [docs/PHASE_5_COMPLETE.md](docs/PHASE_5_COMPLETE.md) - Advanced features

### Deployment
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Complete guide
- [server/README.md](server/README.md) - Backend setup

---

## 🧪 Testing

### Run Local Development

```bash
# Start backend
cd server && npm run dev

# Start frontend (new terminal)
npm run dev

# Open Prisma Studio (new terminal)
cd server && npm run prisma:studio
```

### Test Flows

1. **Mock Payment (No API keys needed)**
   - Browse courses
   - Click "Enroll Now"
   - Complete mock payment
   - Access course content

2. **Video Learning**
   - Watch video for 30+ seconds
   - Progress auto-saves
   - Close and reopen - resumes from last position

3. **Admin Portal**
   - Login as admin@eyebuckz.com
   - Create/edit courses
   - Manage users
   - Issue certificates

---

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript 5.8
- Vite 6
- Tailwind CSS 4
- React Router 7
- Lucide Icons

### Backend
- Node.js 18+
- Express 4
- TypeScript 5.8
- Prisma ORM 6
- PostgreSQL 14+

### Integrations
- Razorpay (Payments)
- Google OAuth (Authentication)
- Cloudinary (Video hosting)
- Resend (Email)
- JWT (Sessions)

### Infrastructure
- Railway (Backend + Database)
- Vercel (Frontend)
- GitHub (Version control)

---

## 📊 Statistics

- **Codebase:** ~7,300 lines of TypeScript
- **API Endpoints:** 43 (19 public + 24 admin)
- **Database Models:** 7 with full relations
- **Documentation:** 12 comprehensive guides
- **Development Time:** ~24 hours total
- **Production Readiness:** 95%

---

## 🔐 Security

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Rate limiting
- ✅ Input validation (Joi)
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection
- ✅ Payment signature verification
- ✅ Webhook signature validation

---

## 🚦 Status

**Current Phase:** Phase 6 - Production Deployment ✅
**Production Ready:** 95%
**Status:** Ready for deployment

✅ **Complete:**
- Core features
- Backend API
- Frontend UI
- Admin portal
- Payment processing
- Video streaming
- Progress tracking
- Authentication
- Deployment infrastructure

⚠️ **Optional Enhancements:**
- Production API keys
- Monitoring setup
- Analytics integration

---

## 💰 Cost Breakdown

### Development
- **$0/month** - Works completely offline with mock data

### Production (Minimum)
- Railway: $5/month (Backend + Database)
- Vercel: $0/month (Frontend)
- **Total: $5/month** + 2% per transaction

### Production (Scaled)
- Railway Pro: $20/month
- Vercel Pro: $20/month
- Cloudinary Plus: $89/month
- Resend Pro: $20/month
- **Total: ~$149/month** + 2% per transaction

---

## 🤝 Contributing

This is a private project, but feedback and suggestions are welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

## 🆘 Support

- **Documentation:** Check `/docs` folder
- **Issues:** GitHub Issues
- **Email:** support@eyebuckz.com

---

## 🗺️ Roadmap

### Phase 6: Production Deployment ✅ (Current)
- Railway + Vercel deployment
- Complete documentation
- Interactive deployment script

### Phase 7: Post-Launch Enhancements
- User analytics (Google Analytics)
- Course search & filtering
- Reviews & ratings system
- Performance optimization
- Redis caching
- Mobile app (React Native)

### Phase 8: Advanced Features
- Discussion forums
- Live sessions
- Bulk course upload
- Subtitle support
- Multiple quality options
- Student leaderboards

---

## 🎉 Quick Links

| Link | Description |
|------|-------------|
| [Quick Start](QUICK_START.md) | 5-minute local setup |
| [Deploy Now](DEPLOY_NOW.md) | 10-minute production deployment |
| [Full Deployment Guide](PRODUCTION_DEPLOYMENT.md) | Complete deployment docs |
| [Project Status](PROJECT_STATUS.md) | Current status & roadmap |
| [User Flows](docs/USER_FLOWS.md) | User journey guides |
| [API Documentation](server/README.md) | Backend API reference |

---

<div align="center">

**Built with ❤️ using React, TypeScript, Express, and PostgreSQL**

**Ready to deploy?** Run `./deploy.sh` or see [DEPLOY_NOW.md](DEPLOY_NOW.md)

[⬆ Back to Top](#-eyebuckz-lms---complete-learning-management-system)

</div>
