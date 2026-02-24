import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { enrollmentsApi } from '../services/api';

interface AccessControlResult {
  hasAccess: boolean;
  isLoading: boolean;
  isEnrolled: boolean;
  isAdmin: boolean;
  checkEnrollment: () => Promise<void>;
}

/**
 * Custom hook to check if a user has access to a course
 * Uses Supabase direct queries (RLS handles auth)
 */
export const useAccessControl = (courseId: string | undefined): AccessControlResult => {
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN';

  const checkEnrollment = async () => {
    if (!user || !courseId) {
      setIsLoading(false);
      setIsEnrolled(false);
      return;
    }

    if (isAdmin) {
      setIsEnrolled(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const hasAccess = await enrollmentsApi.checkAccess(courseId);
      setIsEnrolled(hasAccess);
    } catch (error) {
      console.error('Failed to check enrollment:', error);
      setIsEnrolled(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkEnrollment();
  }, [user, courseId, isAdmin]);

  const hasAccess = isAdmin || isEnrolled;

  return {
    hasAccess,
    isLoading,
    isEnrolled,
    isAdmin,
    checkEnrollment,
  };
};
