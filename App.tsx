import React, { Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoadingState } from './components/states/LoadingState';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
const Storefront = lazy(() => import('./pages/Storefront').then(m => ({ default: m.Storefront })));
const Courses = lazy(() => import('./pages/Courses').then(m => ({ default: m.Courses })));

// Lazy-loaded routes (code splitting)
const CourseDetails = lazy(() => import('./pages/CourseDetails').then(m => ({ default: m.CourseDetails })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Learn = lazy(() => import('./pages/Learn').then(m => ({ default: m.Learn })));
const AdminRoutes = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminRoutes })));
const PurchaseSuccess = lazy(() => import('./pages/PurchaseSuccess').then(m => ({ default: m.PurchaseSuccess })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate').then(m => ({ default: m.VerifyCertificate })));

const PageLoader: React.FC = () => <LoadingState variant="fullscreen" size="sm" message="" />;

const App: React.FC = () => {
  return (
    <HelmetProvider>
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Suspense fallback={<PageLoader />}><Storefront /></Suspense>} />
              <Route path="/courses" element={<Suspense fallback={<PageLoader />}><Courses /></Suspense>} />
              <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
              <Route path="/course/:id" element={<Suspense fallback={<PageLoader />}><CourseDetails /></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><Privacy /></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<PageLoader />}><Terms /></Suspense>} />
              <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
              <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
              <Route path="/verify" element={<Suspense fallback={<PageLoader />}><VerifyCertificate /></Suspense>} />
              <Route path="/verify/:certificateNumber" element={<Suspense fallback={<PageLoader />}><VerifyCertificate /></Suspense>} />

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
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Notifications />
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
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
