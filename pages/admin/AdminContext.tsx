import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';
import type { AdminCourse, AdminUser } from '../../types';

interface AdminContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  courses: AdminCourse[];
  users: AdminUser[];
  refreshCourses: () => Promise<void>;
  refreshUsers: (params?: { search?: string; role?: string }) => Promise<void>;
  coursesLoaded: boolean;
  usersLoaded: boolean;
}

const AdminCtx = createContext<AdminContextValue | null>(null);

export const useAdmin = () => {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast, ToastContainer } = useToast();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const refreshCourses = useCallback(async () => {
    try {
      const res = await adminApi.getCourses();
      setCourses(res.courses);
      setCoursesLoaded(true);
    } catch (err: any) {
      logger.error('Failed to fetch courses:', err);
      showToast(err?.message || 'Failed to fetch courses', 'error');
    }
  }, [showToast]);

  const refreshUsers = useCallback(async (params?: { search?: string; role?: string }) => {
    try {
      const res = await adminApi.getUsers({ ...params, limit: 100 });
      setUsers(res.users);
      setUsersLoaded(true);
    } catch (err: any) {
      logger.error('Failed to fetch users:', err);
      showToast(err?.message || 'Failed to fetch users', 'error');
    }
  }, [showToast]);

  // Load courses on mount (needed by multiple pages: certificates issue, manual enroll)
  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  return (
    <AdminCtx.Provider value={{ showToast, courses, users, refreshCourses, refreshUsers, coursesLoaded, usersLoaded }}>
      {children}
      <ToastContainer />
    </AdminCtx.Provider>
  );
};
