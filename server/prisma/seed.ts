import { PrismaClient, CourseType, CourseStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in dev only!)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Clearing existing data...');
    await prisma.progress.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.review.deleteMany();
    await prisma.module.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create test users
  console.log('👤 Creating test users...');
  const adminUser = await prisma.user.create({
    data: {
      id: 'admin_test',
      name: 'Admin User',
      email: 'admin@eyebuckz.com',
      phoneE164: '+15551234567',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      role: 'ADMIN'
    }
  });

  const testUser = await prisma.user.create({
    data: {
      id: 'user_test',
      name: 'Demo User',
      email: 'demo@example.com',
      phoneE164: '+15559876543',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
      role: 'USER'
    }
  });

  console.log(`✅ Created users: ${adminUser.name}, ${testUser.name}`);

  // Create courses
  console.log('📚 Creating courses and modules...');

  // Course 1: Complete Masterclass
  const course1 = await prisma.course.create({
    data: {
      id: 'c1-masterclass',
      slug: 'complete-content-creation-masterclass',
      title: 'Complete Content Creation Masterclass',
      description: 'A step-by-step content creation masterclass that covers the complete workflow—from generating strong ideas and planning content to shooting, editing, posting, and growing across digital platforms. Designed to bring clarity, consistency, and direction to the content creation process.',
      price: 14999,
      thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000',
      type: CourseType.BUNDLE,
      status: CourseStatus.PUBLISHED,
      rating: 5.0,
      totalStudents: 4200,
      features: ['7-Module System', 'Niche Selection Framework', 'Monetization Roadmap'],
      publishedAt: new Date(),
      modules: {
        create: [
          { id: 'm1', title: 'Module 1: Selecting Niche & Creating Visual Identity', duration: '45:00', durationSeconds: 2700, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 1 },
          { id: 'm2', title: 'Module 2: Selecting Content & Creating Engaging Scripts', duration: '55:00', durationSeconds: 3300, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 2 },
          { id: 'm3', title: 'Module 3: Shooting (Fundamentals of Cinematography)', duration: '60:00', durationSeconds: 3600, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 3 },
          { id: 'm4', title: 'Module 4: Creator Focused Editing Workflow', duration: '90:00', durationSeconds: 5400, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 4 },
          { id: 'm5', title: 'Module 5: Posting & Marketing Strategy', duration: '40:00', durationSeconds: 2400, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 5 },
          { id: 'm6', title: 'Module 6: Ways to Monetise', duration: '35:00', durationSeconds: 2100, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 6 },
          { id: 'm7', title: 'Module 7: Equipment Suggestions for Creators', duration: '25:00', durationSeconds: 1500, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 7 }
        ]
      }
    }
  });

  // Course 2: Scripting
  const course2 = await prisma.course.create({
    data: {
      id: 'c2-scripting',
      slug: 'scripting-content-creation',
      title: 'Content Selection & Engaging Scripts',
      description: 'Learn how to identify viral topics and write scripts that hook viewers instantly. Master the pre-production phase.',
      price: 3499,
      thumbnail: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=1000',
      type: CourseType.MODULE,
      status: CourseStatus.PUBLISHED,
      rating: 4.8,
      features: ['Viral Hook Templates', 'Story Structure', 'Notion Content Calendar'],
      publishedAt: new Date(),
      modules: {
        create: [
          { id: 'sc1', title: 'Finding Your Content Pillars', duration: '15:00', durationSeconds: 900, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 1 },
          { id: 'sc2', title: 'The Psychology of a Hook', duration: '12:30', durationSeconds: 750, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 2 },
          { id: 'sc3', title: 'Scripting Frameworks (Edu vs Ent)', duration: '20:00', durationSeconds: 1200, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 3 },
          { id: 'sc4', title: 'Using AI for Ideation', duration: '10:00', durationSeconds: 600, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 4 }
        ]
      }
    }
  });

  // Course 3: Cinematography
  const course3 = await prisma.course.create({
    data: {
      id: 'c3-cinematography',
      slug: 'fundamentals-of-cinematography',
      title: 'Shooting: Fundamentals of Cinematography',
      description: 'Move beyond auto mode. Understand lighting, composition, and camera settings to create cinematic footage on any device.',
      price: 3999,
      thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1000',
      type: CourseType.MODULE,
      status: CourseStatus.PUBLISHED,
      rating: 4.9,
      features: ['Lighting Guide', 'Camera Settings Cheat Sheet', 'Mobile Filmmaking'],
      publishedAt: new Date(),
      modules: {
        create: [
          { id: 'sh1', title: 'Exposure Triangle Explained', duration: '18:00', durationSeconds: 1080, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 1 },
          { id: 'sh2', title: 'Composition: Rule of Thirds & Depth', duration: '14:00', durationSeconds: 840, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 2 },
          { id: 'sh3', title: 'Lighting: Key, Fill, Back', duration: '22:00', durationSeconds: 1320, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 3 },
          { id: 'sh4', title: 'Audio: The 50% Rule', duration: '12:00', durationSeconds: 720, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 4 }
        ]
      }
    }
  });

  // Course 4: Editing
  const course4 = await prisma.course.create({
    data: {
      id: 'c4-editing',
      slug: 'creator-editing-workflow',
      title: 'Creator Focused Editing Workflow',
      description: 'Speed up your post-production. Learn efficient cutting, pacing for retention, and how to repurpose content for different platforms.',
      price: 3999,
      thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1000',
      type: CourseType.MODULE,
      status: CourseStatus.PUBLISHED,
      rating: 4.7,
      features: ['Project Files', 'Transition Presets', 'Color Grading Basics'],
      publishedAt: new Date(),
      modules: {
        create: [
          { id: 'ed1', title: 'Project Organization & Binning', duration: '10:00', durationSeconds: 600, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 1 },
          { id: 'ed2', title: 'The J-Cut and L-Cut Technique', duration: '08:00', durationSeconds: 480, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 2 },
          { id: 'ed3', title: 'Pacing for Retention', duration: '15:00', durationSeconds: 900, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 3 },
          { id: 'ed4', title: 'Export Settings for Social Media', duration: '08:00', durationSeconds: 480, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4', orderIndex: 4 }
        ]
      }
    }
  });

  console.log(`✅ Created 4 courses with modules`);

  // Create test enrollment for demo user
  console.log('📝 Creating test enrollment...');
  await prisma.enrollment.create({
    data: {
      userId: testUser.id,
      courseId: course1.id,
      status: 'ACTIVE',
      amount: course1.price,
      paymentId: 'test_payment_001',
      orderId: 'test_order_001',
      completedModules: [],
      currentModule: null,
      overallPercent: 0,
      totalWatchTime: 0
    }
  });

  console.log('✅ Created test enrollment for demo user');

  console.log('🎉 Database seeding completed successfully!');
  console.log(`
📊 Summary:
  - Users: 2 (1 admin, 1 regular)
  - Courses: 4
  - Modules: 19
  - Enrollments: 1
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
