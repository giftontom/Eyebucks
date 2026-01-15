import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, ArrowRight, CheckCircle2, Shield, Zap, Star } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export const Login: React.FC = () => {
  const { user, loginDev, loginWithGoogle, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Detect if we're in production mode (Google OAuth configured)
  const isProductionMode = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
      console.error('Login failed:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }
      await loginWithGoogle(credentialResponse.credential);
      // Navigation will happen automatically via useEffect when user changes
    } catch (error) {
      console.error('Google login failed:', error);
      setError(error instanceof Error ? error.message : 'Google login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
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

            {/* Conditional Login Buttons: Production vs Development */}
            {isProductionMode ? (
              <>
                {/* PRODUCTION MODE - Real Google OAuth */}
                <div className="flex flex-col items-center gap-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap
                    theme="filled_black"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    logo_alignment="left"
                  />
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-neutral-500">
                    Secure authentication powered by Google OAuth 2.0
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* DEVELOPMENT MODE - Dev Login Buttons */}
                <button
                  onClick={() => handleLogin(false)}
                  disabled={isLoading}
                  className="w-full bg-black hover:bg-neutral-800 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed group mb-3"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn size={24} />
                      Login as User (Dev)
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleLogin(true)}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Shield size={24} />
                      Login as Admin (Dev)
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="mt-6 text-center">
                  <p className="text-sm text-neutral-500">
                    Development mode: JWT-based authentication with mock Google OAuth
                  </p>
                </div>
              </>
            )}

            {/* Security Badge */}
            <div className="mt-8 pt-8 border-t border-neutral-200">
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
                <Shield size={16} className="text-green-600" />
                <span>Secure authentication powered by Google</span>
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
            <a href="#" className="text-brand-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};
