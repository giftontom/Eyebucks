import { Course, CourseType, SalesData, Certificate } from './types';

/**
 * IMAGE IMPLEMENTATION DOCS:
 * --------------------------
 * 1. Source: All thumbnails use high-resolution Unsplash images.
 * 2. Format: 'https://images.unsplash.com/photo-[ID]?auto=format&fit=crop&q=80&w=1000'
 *    - w=1000: Ensures high enough resolution for Retina displays on course cards.
 *    - q=80: optimizing for quality/size balance.
 * 3. Subject Matter Matching:
 *    - Masterclass: Filmmaking set/camera gear (General)
 *    - Scripting: Notebook/writing/planning (Pre-production)
 *    - Cinematography: Camera lens/shooting (Production)
 *    - Editing: Timeline/Software Interface (Post-production)
 */

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1-masterclass',
    slug: 'complete-content-creation-masterclass',
    title: 'Complete Content Creation Masterclass',
    description: 'A step-by-step content creation masterclass that covers the complete workflow—from generating strong ideas and planning content to shooting, editing, posting, and growing across digital platforms. Designed to bring clarity, consistency, and direction to the content creation process.',
    price: 14999,
    // Image: Film Set / Production - Verified ID
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000',
    type: CourseType.BUNDLE,
    status: 'PUBLISHED',
    features: ['7-Module System', 'Niche Selection Framework', 'Monetization Roadmap'],
    rating: 5.0,
    totalStudents: 4200,
    reviews: [
      { id: 'r1', user: 'Jordan P.', rating: 5, comment: 'Finally a course that covers the BUSINESS side too.', date: '3 days ago' },
      { id: 'r2', user: 'Sarah K.', rating: 5, comment: 'The monetization module paid for the course in a week.', date: '1 week ago' }
    ],
    chapters: [
      { id: 'm1', title: 'Module 1: Selecting Niche & Creating Visual Identity', duration: '45:00', durationSeconds: 2700, isCompleted: true, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'm2', title: 'Module 2: Selecting Content & Creating Engaging Scripts', duration: '55:00', durationSeconds: 3300, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'm3', title: 'Module 3: Shooting (Fundamentals of Cinematography)', duration: '60:00', durationSeconds: 3600, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'm4', title: 'Module 4: Creator Focused Editing Workflow', duration: '90:00', durationSeconds: 5400, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'm5', title: 'Module 5: Posting & Marketing Strategy', duration: '40:00', durationSeconds: 2400, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'm6', title: 'Module 6: Ways to Monetise', duration: '35:00', durationSeconds: 2100, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'm7', title: 'Module 7: Equipment Suggestions for Creators', duration: '25:00', durationSeconds: 1500, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
    ]
  },
  {
    id: 'c2-scripting',
    slug: 'scripting-content-creation',
    title: 'Content Selection & Engaging Scripts',
    description: 'Learn how to identify viral topics and write scripts that hook viewers instantly. Master the pre-production phase.',
    price: 3499,
    // Image: Coffee & Notebook / Planning - Verified ID
    thumbnail: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=1000',
    type: CourseType.MODULE,
    status: 'PUBLISHED',
    features: ['Viral Hook Templates', 'Story Structure', 'Notion Content Calendar'],
    rating: 4.8,
    reviews: [],
    chapters: [
      { id: 'sc1', title: 'Finding Your Content Pillars', duration: '15:00', durationSeconds: 900, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'sc2', title: 'The Psychology of a Hook', duration: '12:30', durationSeconds: 750, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'sc3', title: 'Scripting Frameworks (Edu vs Ent)', duration: '20:00', durationSeconds: 1200, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'sc4', title: 'Using AI for Ideation', duration: '10:00', durationSeconds: 600, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
    ]
  },
  {
    id: 'c3-cinematography',
    slug: 'fundamentals-of-cinematography',
    title: 'Shooting: Fundamentals of Cinematography',
    description: 'Move beyond auto mode. Understand lighting, composition, and camera settings to create cinematic footage on any device.',
    price: 3999,
    // Image: Camera Lens Close Up - Verified ID
    thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1000',
    type: CourseType.MODULE,
    status: 'PUBLISHED',
    features: ['Lighting Guide', 'Camera Settings Cheat Sheet', 'Mobile Filmmaking'],
    rating: 4.9,
    reviews: [],
    chapters: [
      { id: 'sh1', title: 'Exposure Triangle Explained', duration: '18:00', durationSeconds: 1080, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'sh2', title: 'Composition: Rule of Thirds & Depth', duration: '14:00', durationSeconds: 840, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'sh3', title: 'Lighting: Key, Fill, Back', duration: '22:00', durationSeconds: 1320, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'sh4', title: 'Audio: The 50% Rule', duration: '12:00', durationSeconds: 720, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
    ]
  },
  {
    id: 'c4-editing',
    slug: 'creator-editing-workflow',
    title: 'Creator Focused Editing Workflow',
    description: 'Speed up your post-production. Learn efficient cutting, pacing for retention, and how to repurpose content for different platforms.',
    price: 3999,
    // Image: Editing Workspace / Code / Monitor - Verified ID
    thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1000',
    type: CourseType.MODULE,
    status: 'PUBLISHED',
    features: ['Project Files', 'Transition Presets', 'Color Grading Basics'],
    rating: 4.7,
    reviews: [],
    chapters: [
      { id: 'ed1', title: 'Project Organization & Binning', duration: '10:00', durationSeconds: 600, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'ed2', title: 'The J-Cut and L-Cut Technique', duration: '08:00', durationSeconds: 480, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'ed3', title: 'Pacing for Retention', duration: '15:00', durationSeconds: 900, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
      { id: 'ed4', title: 'Export Settings for Social Media', duration: '08:00', durationSeconds: 480, isCompleted: false, videoUrl: 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4' },
    ]
  }
];

export const MOCK_SALES_DATA: SalesData[] = [
  { date: 'Mon', amount: 12000 },
  { date: 'Tue', amount: 18500 },
  { date: 'Wed', amount: 15000 },
  { date: 'Thu', amount: 24000 },
  { date: 'Fri', amount: 32000 },
  { date: 'Sat', amount: 45000 },
  { date: 'Sun', amount: 38000 },
];

export const MOCK_CERTIFICATES: Certificate[] = [
  { id: 'cert_1', courseTitle: 'Complete Content Creation Masterclass', studentName: 'Demo User', issueDate: '2024-02-15', downloadUrl: '#' },
  { id: 'cert_2', courseTitle: 'Creator Editing Workflow', studentName: 'Jane Doe', issueDate: '2024-02-10', downloadUrl: '#' },
];