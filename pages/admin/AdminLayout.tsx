import { Loader2 } from 'lucide-react';
import React from 'react';
import { Outlet , Link } from 'react-router-dom';

import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';

import { AdminProvider } from './AdminContext';
import { AdminSidebar } from './components/AdminSidebar';

export const AdminLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen t-bg">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-brand-600 mx-auto mb-4" />
          <p className="t-text-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-screen t-bg">
        <div className="text-center p-8 t-card rounded-xl t-border border">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--status-danger-text)' }}>Access Denied</h1>
          <p className="t-text-2 mb-4">You do not have permission to view this area.</p>
          <Link to="/" className="text-brand-600 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider>
      <div className="flex min-h-screen t-bg-alt">
        <AdminSidebar />
        <main className="flex-1 p-4 pt-16 lg:pt-8 lg:p-8 overflow-auto min-w-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </AdminProvider>
  );
};
