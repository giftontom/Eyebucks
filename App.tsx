import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Storefront } from './pages/Storefront';
import { CourseDetails } from './pages/CourseDetails';
import { Checkout } from './pages/Checkout';
import { Dashboard } from './pages/Dashboard';
import { Learn } from './pages/Learn';
import { Admin } from './pages/Admin';
import { GapCheckModal } from './components/GapCheckModal';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Storefront />} />
            <Route path="/course/:id" element={<CourseDetails />} />
            <Route path="/checkout/:id" element={<Checkout />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/learn/:id" element={<Learn />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <GapCheckModal />
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;