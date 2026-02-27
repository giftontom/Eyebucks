import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { DashboardPage } from './DashboardPage';
import { CoursesPage } from './CoursesPage';
import { CourseEditorPage } from './CourseEditorPage';
import { UsersPage } from './UsersPage';
import { UserDetailPage } from './UserDetailPage';
import { CertificatesPage } from './CertificatesPage';
import { ContentPage } from './ContentPage';
import { PaymentsPage } from './PaymentsPage';

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
    </Route>
  </Routes>
);
