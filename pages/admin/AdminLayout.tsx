import { Loader2 } from 'lucide-react';
import React from 'react';
import { Outlet , Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import { AdminProvider } from './AdminContext';
import { AdminSidebar } from './components/AdminSidebar';

export const AdminLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-brand-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200">
          <h1 className="text-2xl font-bold mb-4 text-red-500">Access Denied</h1>
          <p className="text-slate-500 mb-4">You do not have permission to view this area.</p>
          <Link to="/" className="text-brand-600 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex-1 p-4 pt-16 lg:pt-8 lg:p-8 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </AdminProvider>
  );
};
