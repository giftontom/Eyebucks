import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login'
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Small delay to prevent flash of redirect
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-brand-600 mx-auto mb-4" />
          <p className="text-neutral-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login with return path
    return <Navigate to={redirectTo} state={{ returnTo: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};
