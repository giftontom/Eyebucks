import React, { createContext, useContext, ReactNode } from 'react';

interface MockAuthContextType {
  user: any;
  session: any;
  isLoading: boolean;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginDev: () => Promise<void>;
  logout: () => Promise<void>;
  updatePhoneNumber: (phone: string) => Promise<void>;
  updateProfile: (data: { name?: string }) => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

interface MockAuthProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  user?: any;
}

/**
 * Mock AuthProvider for testing.
 * Provides a fake auth context without depending on Supabase.
 */
export function MockAuthProvider({
  children,
  isAuthenticated = false,
  user = null,
}: MockAuthProviderProps) {
  const value: MockAuthContextType = {
    user: isAuthenticated ? user : null,
    session: isAuthenticated ? { access_token: 'mock-token' } : null,
    isLoading: false,
    login: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    loginDev: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    updatePhoneNumber: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
  };

  return (
    <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
  );
}

/**
 * Hook to use inside MockAuthProvider (mirrors useAuth).
 * Tests that need auth context should mock '../context/AuthContext' to use this.
 */
export function useMockAuth() {
  const ctx = useContext(MockAuthContext);
  if (!ctx) {throw new Error('useMockAuth must be used within MockAuthProvider');}
  return ctx;
}

/**
 * Create mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://via.placeholder.com/150',
    role: 'USER',
    phone_e164: null,
    phoneVerified: false,
    emailVerified: true,
    ...overrides,
  };
}

/**
 * Create mock admin user
 */
export function createMockAdmin(overrides = {}) {
  return createMockUser({
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    ...overrides,
  });
}

/**
 * Create mock course object
 */
export function createMockCourse(overrides = {}) {
  return {
    id: 'course-123',
    slug: 'test-course',
    title: 'Test Course',
    description: 'This is a test course description',
    price: 99900,
    thumbnail: 'https://via.placeholder.com/400x300',
    type: 'MODULE',
    status: 'PUBLISHED',
    features: ['Feature 1', 'Feature 2'],
    rating: 4.5,
    totalStudents: 100,
    chapters: [],
    ...overrides,
  };
}

/**
 * Create mock enrollment object
 */
export function createMockEnrollment(overrides = {}) {
  return {
    id: 'enrollment-123',
    userId: 'user-123',
    courseId: 'course-123',
    status: 'ACTIVE',
    enrolledAt: new Date().toISOString(),
    overallPercent: 0,
    completedModules: [],
    ...overrides,
  };
}

/**
 * Create mock certificate object
 */
export function createMockCertificate(overrides = {}) {
  return {
    id: 'cert-123',
    certificateNumber: 'EYE-2024-001',
    studentName: 'Test User',
    courseTitle: 'Test Course',
    issueDate: new Date().toISOString(),
    completionDate: new Date().toISOString(),
    downloadUrl: '/certificates/download/cert-123',
    ...overrides,
  };
}
