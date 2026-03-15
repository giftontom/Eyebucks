import { useState, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { enrollmentsApi } from '../services/api';
import { logger } from '../utils/logger';

interface AccessControlResult {
  hasAccess: boolean;
  isLoading: boolean;
  isEnrolled: boolean;
  isAdmin: boolean;
  checkEnrollment: () => Promise<void>;
}

/**
 * Checks whether the current user has access to a course.
 *
 * ADMIN users are granted access immediately without an enrollment check. For non-admin
 * users, calls `enrollmentsApi.checkAccess()` to verify an active enrollment exists.
 * Re-checks when the user or courseId changes.
 *
 * @param courseId - UUID of the course to check access for. Pass `undefined` to skip
 *   the check (returns `hasAccess: false, isLoading: false`).
 * @returns Object with:
 *   - `hasAccess` — `true` if the user is an admin or has an active enrollment
 *   - `isLoading` — `true` while the enrollment check is in progress
 *   - `isEnrolled` — `true` if the user has an active enrollment (false for admins)
 *   - `isAdmin` — `true` if the user's role is `ADMIN`
 *   - `checkEnrollment` — imperative function to re-run the enrollment check
 *
 * @example
 * ```tsx
 * const { hasAccess, isLoading } = useAccessControl(courseId);
 * if (!isLoading && !hasAccess) return <EnrollmentGate courseId={courseId} />;
 * ```
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
      logger.error('Failed to check enrollment:', error);
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
