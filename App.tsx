import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Storefront } from './pages/Storefront';
import { CourseDetails } from './pages/CourseDetails';
import { Checkout } from './pages/Checkout';
import { Dashboard } from './pages/Dashboard';
import { Learn } from './pages/Learn';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { PurchaseSuccess } from './pages/PurchaseSuccess';
import { GapCheckModal } from './components/GapCheckModal';

const App: React.FC = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const AppContent = () => (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Storefront />} />
              <Route path="/login" element={<Login />} />
              <Route path="/course/:id" element={<CourseDetails />} />

              {/* Protected Routes - Require Authentication */}
              <Route
                path="/checkout/:id"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learn/:id"
                element={
                  <ProtectedRoute>
                    <Learn />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/success"
                element={
                  <ProtectedRoute>
                    <PurchaseSuccess />
                  </ProtectedRoute>
                }
              />

              {/* Catch All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <GapCheckModal />
          </Layout>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );

  // Wrap with GoogleOAuthProvider only in production mode (when VITE_GOOGLE_CLIENT_ID is set)
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppContent />
      </GoogleOAuthProvider>
    );
  }

  // Development mode - no GoogleOAuthProvider wrapper needed
  return <AppContent />;
};

export default App;