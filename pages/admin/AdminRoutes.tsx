import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import { LoadingState } from '../../components/states/LoadingState';
import { AdminLayout } from './AdminLayout';

const AuditLogPage = lazy(() => import('./AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const CertificatesPage = lazy(() => import('./CertificatesPage').then(m => ({ default: m.CertificatesPage })));
const ContentPage = lazy(() => import('./ContentPage').then(m => ({ default: m.ContentPage })));
const CouponsPage = lazy(() => import('./CouponsPage').then(m => ({ default: m.CouponsPage })));
const CourseEditorPage = lazy(() => import('./CourseEditorPage').then(m => ({ default: m.CourseEditorPage })));
const CoursesPage = lazy(() => import('./CoursesPage').then(m => ({ default: m.CoursesPage })));
const DashboardPage = lazy(() => import('./DashboardPage').then(m => ({ default: m.DashboardPage })));
const DigitalAssetEditorPage = lazy(() => import('./DigitalAssetEditorPage').then(m => ({ default: m.DigitalAssetEditorPage })));
const DigitalAssetsPage = lazy(() => import('./DigitalAssetsPage').then(m => ({ default: m.DigitalAssetsPage })));
const PaymentsPage = lazy(() => import('./PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const ReviewsPage = lazy(() => import('./ReviewsPage').then(m => ({ default: m.ReviewsPage })));
const SettingsPage = lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })));
const UserDetailPage = lazy(() => import('./UserDetailPage').then(m => ({ default: m.UserDetailPage })));
const UsersPage = lazy(() => import('./UsersPage').then(m => ({ default: m.UsersPage })));

const AdminPageLoader: React.FC = () => <LoadingState variant="inline" size="sm" message="" />;

export const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<Suspense fallback={<AdminPageLoader />}><DashboardPage /></Suspense>} />
      <Route path="courses" element={<Suspense fallback={<AdminPageLoader />}><CoursesPage /></Suspense>} />
      <Route path="courses/new" element={<Suspense fallback={<AdminPageLoader />}><CourseEditorPage /></Suspense>} />
      <Route path="courses/:courseId" element={<Suspense fallback={<AdminPageLoader />}><CourseEditorPage /></Suspense>} />
      <Route path="digital-assets" element={<Suspense fallback={<AdminPageLoader />}><DigitalAssetsPage /></Suspense>} />
      <Route path="digital-assets/new" element={<Suspense fallback={<AdminPageLoader />}><DigitalAssetEditorPage /></Suspense>} />
      <Route path="digital-assets/:assetId" element={<Suspense fallback={<AdminPageLoader />}><DigitalAssetEditorPage /></Suspense>} />
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
