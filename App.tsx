import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CourseDetails } from './pages/CourseDetails';
import { Login } from './pages/Login';
import { Privacy } from './pages/Privacy';
import { Storefront } from './pages/Storefront';
import { Terms } from './pages/Terms';

// Lazy-loaded routes (code splitting)
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Learn = lazy(() => import('./pages/Learn').then(m => ({ default: m.Learn })));
const AdminRoutes = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminRoutes })));
const PurchaseSuccess = lazy(() => import('./pages/PurchaseSuccess').then(m => ({ default: m.PurchaseSuccess })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Storefront />} />
              <Route path="/login" element={<Login />} />
              <Route path="/course/:id" element={<CourseDetails />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Protected Routes - Require Authentication (lazy-loaded) */}
              <Route
                path="/checkout/:id"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Checkout />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Dashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learn/:id"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Learn />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <AdminRoutes />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Profile />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/success"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <PurchaseSuccess />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Catch All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
