
export enum CourseType {
  BUNDLE = 'BUNDLE',
  MODULE = 'MODULE'
}

export type CourseStatus = 'PUBLISHED' | 'DRAFT';

export interface Module {
  id: string;
  title: string;
  duration: string;
  durationSeconds: number;
  isCompleted: boolean;
  videoUrl: string; 
  isFreePreview?: boolean;
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  heroVideoId?: string;
  type: CourseType;
  status: CourseStatus;
  chapters: Module[]; // Renamed in concept, keeping property name for compatibility or updating if refactoring
  features: string[];
  rating?: number;
  totalStudents?: number;
  reviews?: Review[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone_e164?: string;
  avatar: string;
  role: 'USER' | 'ADMIN';
  google_id?: string;
}

// Database-backed session simulation
export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  lastAccessedAt: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  paymentId?: string;
  orderId?: string;
  amount: number;
  expiresAt?: string | null;
  progress: {
    completedModules: string[];
    currentModule: string | null;
    overallPercent: number;
    totalWatchTime: number;
  };
}

export interface Progress {
  userId: string;
  moduleId: string;
  timestamp: number;
  completed: boolean;
}

export interface SalesData {
  date: string;
  amount: number;
}

export interface Certificate {
  id: string;
  courseTitle: string;
  studentName: string;
  issueDate: string;
  downloadUrl: string;
}
