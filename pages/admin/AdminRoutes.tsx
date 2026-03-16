import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import { AdminLayout } from './AdminLayout';

const AuditLogPage = lazy(() => import('./AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const CertificatesPage = lazy(() => import('./CertificatesPage').then(m => ({ default: m.CertificatesPage })));
const ContentPage = lazy(() => import('./ContentPage').then(m => ({ default: m.ContentPage })));
const CouponsPage = lazy(() => import('./CouponsPage').then(m => ({ default: m.CouponsPage })));
const CourseEditorPage = lazy(() => import('./CourseEditorPage').then(m => ({ default: m.CourseEditorPage })));
const CoursesPage = lazy(() => import('./CoursesPage').then(m => ({ default: m.CoursesPage })));
const DashboardPage = lazy(() => import('./DashboardPage').then(m => ({ default: m.DashboardPage })));
const PaymentsPage = lazy(() => import('./PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const ReviewsPage = lazy(() => import('./ReviewsPage').then(m => ({ default: m.ReviewsPage })));
const SettingsPage = lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })));
const UserDetailPage = lazy(() => import('./UserDetailPage').then(m => ({ default: m.UserDetailPage })));
const UsersPage = lazy(() => import('./UsersPage').then(m => ({ default: m.UsersPage })));

const AdminPageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<Suspense fallback={<AdminPageLoader />}><DashboardPage /></Suspense>} />
      <Route path="courses" element={<Suspense fallback={<AdminPageLoader />}><CoursesPage /></Suspense>} />
      <Route path="courses/new" element={<Suspense fallback={<AdminPageLoader />}><CourseEditorPage /></Suspense>} />
      <Route path="courses/:courseId" element={<Suspense fallback={<AdminPageLoader />}><CourseEditorPage /></Suspense>} />
      <Route path="users" element={<Suspense fallback={<AdminPageLoader />}><UsersPage /></Suspense>} />
      <Route path="users/:userId" element={<Suspense fallback={<AdminPageLoader />}><UserDetailPage /></Suspense>} />
      <Route path="certificates" element={<Suspense fallback={<AdminPageLoader />}><CertificatesPage /></Suspense>} />
      <Route path="content" element={<Suspense fallback={<AdminPageLoader />}><ContentPage /></Suspense>} />
      <Route path="payments" element={<Suspense fallback={<AdminPageLoader />}><PaymentsPage /></Suspense>} />
      <Route path="reviews" element={<Suspense fallback={<AdminPageLoader />}><ReviewsPage /></Suspense>} />
      <Route path="coupons" element={<Suspense fallback={<AdminPageLoader />}><CouponsPage /></Suspense>} />
      <Route path="settings" element={<Suspense fallback={<AdminPageLoader />}><SettingsPage /></Suspense>} />
      <Route path="audit-log" element={<Suspense fallback={<AdminPageLoader />}><AuditLogPage /></Suspense>} />
    </Route>
  </Routes>
);
