import { LogIn, ArrowRight, CheckCircle2, Shield, Zap, Star } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

export const Login: React.FC = () => {
  const { user, loginDev, loginWithGoogle, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Get the return path from location state
  const returnTo = (location.state as any)?.returnTo || '/';

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate(returnTo, { replace: true });
    }
  }, [user, navigate, returnTo]);

  // Show loading during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (isAdmin: boolean = false) => {
    setIsLoading(true);
    setError('');
    try {
      await loginDev(isAdmin);
      // Navigation will happen automatically via useEffect when user changes
    } catch (error) {
      logger.error('Login failed:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      // Supabase handles redirect - user state updates via onAuthStateChange
    } catch (error) {
      logger.error('Google login failed:', error);
      setError(error instanceof Error ? error.message : 'Google login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">

        {/* Left Side - Value Proposition */}
        <div className="hidden lg:block">
          <div className="space-y-8">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <span className="font-bold text-xl">E</span>
                </div>
                <span className="text-2xl font-bold">Eyebuckz</span>
              </Link>
              <h1 className="text-5xl font-black text-neutral-900 mb-4 leading-tight">
                Welcome to Your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-800">
                  Filmmaking Journey
                </span>
              </h1>
              <p className="text-lg text-neutral-600 leading-relaxed">
                Join thousands of creators mastering the art of visual storytelling.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 mb-1">Track Your Progress</h3>
                  <p className="text-sm text-neutral-600">Auto-save progress across all devices. Pick up where you left off.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Zap className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 mb-1">Instant Access</h3>
                  <p className="text-sm text-neutral-600">Stream courses immediately after enrollment. No waiting.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Star className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 mb-1">Premium Content</h3>
                  <p className="text-sm text-neutral-600">Learn from industry professionals with real-world experience.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" className="w-10 h-10 rounded-full border-2 border-white object-cover" alt="Student 1" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" className="w-10 h-10 rounded-full border-2 border-white object-cover" alt="Student 2" />
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" className="w-10 h-10 rounded-full border-2 border-white object-cover" alt="Student 3" />
                <div className="w-10 h-10 rounded-full border-2 border-white bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                  +10K
                </div>
              </div>
              <div className="text-sm text-neutral-600">
                <span className="font-bold text-neutral-900">10,000+</span> students already learning
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full">
          <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 p-8 md:p-12">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8">
              <Link to="/" className="inline-flex items-center gap-2 group">
                <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <span className="font-bold">E</span>
                </div>
                <span className="text-xl font-bold">Eyebuckz</span>
              </Link>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">Sign in to continue</h2>
              <p className="text-neutral-600">
                {returnTo !== '/' && <span className="text-brand-600 font-medium">Login required to access this page</span>}
                {returnTo === '/' && 'Access your enrolled courses and track your progress'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Google OAuth via Supabase */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white hover:bg-neutral-50 text-neutral-900 py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-md border border-neutral-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed group mb-4"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Dev mode buttons */}
            {import.meta.env.VITE_DEV_LOGIN === 'true' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-neutral-400 font-bold">Dev Mode</span>
                  </div>
                </div>

                <button
                  onClick={() => handleLogin(false)}
                  disabled={isLoading}
                  className="w-full bg-black hover:bg-neutral-800 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed group mb-3"
                >
                  <LogIn size={24} />
                  Login as User (Dev)
                </button>

                <button
                  onClick={() => handleLogin(true)}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Shield size={24} />
                  Login as Admin (Dev)
                </button>
              </>
            )}

            {/* Security Badge */}
            <div className="mt-8 pt-8 border-t border-neutral-200">
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
                <Shield size={16} className="text-green-600" />
                <span>Secure authentication powered by Supabase</span>
              </div>
            </div>

            {/* Back to Home Link */}
            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-sm text-neutral-500 hover:text-neutral-900 transition inline-flex items-center gap-1 group"
              >
                <span>←</span>
                <span className="group-hover:underline">Back to homepage</span>
              </Link>
            </div>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-neutral-500 mt-6 max-w-md mx-auto">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-brand-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
