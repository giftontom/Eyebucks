import React from 'react';
import { Routes, Route } from 'react-router-dom';

import { AdminLayout } from './AdminLayout';
import { CertificatesPage } from './CertificatesPage';
import { ContentPage } from './ContentPage';
import { CourseEditorPage } from './CourseEditorPage';
import { CoursesPage } from './CoursesPage';
import { DashboardPage } from './DashboardPage';
import { PaymentsPage } from './PaymentsPage';
import { ReviewsPage } from './ReviewsPage';
import { UserDetailPage } from './UserDetailPage';
import { UsersPage } from './UsersPage';

export const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="courses" element={<CoursesPage />} />
      <Route path="courses/new" element={<CourseEditorPage />} />
      <Route path="courses/:courseId" element={<CourseEditorPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="users/:userId" element={<UserDetailPage />} />
      <Route path="certificates" element={<CertificatesPage />} />
      <Route path="content" element={<ContentPage />} />
      <Route path="payments" element={<PaymentsPage />} />
      <Route path="reviews" element={<ReviewsPage />} />
    </Route>
  </Routes>
);
