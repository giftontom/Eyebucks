import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { LoadingState } from './states/LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login'
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." variant="fullscreen" />;
  }

  if (!user) {
    // Redirect to login with return path
    return <Navigate to={redirectTo} state={{ returnTo: location.pathname + location.search }} replace />;
  }

  // Phone gate is now enforced only on /checkout, not on every protected route.
  return <>{children}</>;
};
