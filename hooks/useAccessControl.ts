import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { enrollmentService } from '../services/enrollmentService';

interface AccessControlResult {
  hasAccess: boolean;
  isLoading: boolean;
  isEnrolled: boolean;
  isAdmin: boolean;
  checkEnrollment: () => Promise<void>;
}

/**
 * Custom hook to check if a user has access to a course
 * @param courseId - The ID of the course to check access for
 * @returns Object containing access status and loading state
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

    // Admins always have access
    if (isAdmin) {
      setIsEnrolled(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const hasAccess = await enrollmentService.checkAccess(user.id, courseId);
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
    checkEnrollment
  };
};
