import React, { createContext, useContext, useState, useEffect } from 'react';

import { mapUserProfile } from '../services/api/users.api';
import { supabase } from '../services/supabase';
import { analytics } from '../utils/analytics';
import { logger } from '../utils/logger';

import type { User } from '../types';
import type { UserUpdate } from '../types/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (isAdmin?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginDev: (isAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updatePhoneNumber: (phone: string) => Promise<void>;
  updateProfile: (data: { name?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user profile from Supabase
  const loadUserProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logger.error('[AuthContext] Failed to load user profile:', error);
      return null;
    }

    const mappedUser = mapUserProfile(profile);
    setUser(mappedUser);
    analytics.identify(mappedUser.id, { email: mappedUser.email, role: mappedUser.role });

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    return mappedUser;
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get existing session
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession?.user) {
          setSession(existingSession);
          await loadUserProfile(existingSession.user.id);
        }
      } catch (error) {
        logger.error('[AuthContext] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // Enforce single-session: invalidate all other sessions for this user.
          // Await with 3s timeout — network failure is lenient (log + continue),
          // but a business-logic rejection signs the user out.
          try {
            const enforcePromise = supabase.functions.invoke('session-enforce');
            const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
              setTimeout(() => resolve({ error: { message: 'timeout' } }), 3000)
            );
            const { error: enforceError } = await Promise.race([enforcePromise, timeoutPromise]) as { error?: { message?: string } };
            if (enforceError) {
              const msg = enforceError.message || '';
              if (msg === 'timeout' || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
                logger.warn('[AuthContext] Session enforce timed out — proceeding with caution');
              } else {
                logger.error('[AuthContext] Session enforce rejected login:', enforceError);
                await supabase.auth.signOut();
                return;
              }
            }
          } catch (enforceErr) {
            // Lenient: unexpected throws (e.g. cold-start Edge Function error) should not block login
            logger.error('[AuthContext] Session enforce threw:', enforceErr);
          }

          // Retry with exponential backoff to wait for auth trigger to create profile
          const retryLoadProfile = async (userId: string): Promise<void> => {
            const delays = [200, 400, 800, 1600, 3000];
            for (let attempt = 0; attempt < delays.length; attempt++) {
              const result = await loadUserProfile(userId);
              if (result) { return; }
              if (attempt < delays.length) {
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
              }
            }
            logger.error('[AuthContext] Failed to load user profile after all retries. User ID:', userId);
          };
          retryLoadProfile(newSession.user.id).catch(err =>
            logger.error('[AuthContext] retryLoadProfile threw:', err)
          );
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login with Google OAuth via Supabase
   */
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      logger.error('[AuthContext] Google login failed:', error);
      throw error;
    }
  };

  /**
   * Development mode login (uses Supabase email/password as fallback)
   * Only works in development builds — no-op in production.
   */
  const loginDev = async (isAdmin: boolean = false) => {
    if (!import.meta.env.DEV) { return; }
    const email = isAdmin ? import.meta.env.VITE_DEV_ADMIN_EMAIL : import.meta.env.VITE_DEV_USER_EMAIL;
    const password = import.meta.env.VITE_DEV_PASSWORD;
    if (!email || !password) {
      throw new Error('Dev credentials not configured. Set VITE_DEV_ADMIN_EMAIL, VITE_DEV_USER_EMAIL, VITE_DEV_PASSWORD in .env.local');
    }

    // Try to sign in first
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If user doesn't exist, sign up
    if (error?.message?.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: isAdmin ? 'Admin User' : 'Test User',
            full_name: isAdmin ? 'Admin User' : 'Test User',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (isAdmin ? 'Admin' : 'Demo'),
          },
        },
      });

      if (signUpError) {
        logger.error('[AuthContext] Dev signup failed:', signUpError);
        throw signUpError;
      }
      data = signUpData;
    } else if (error) {
      logger.error('[AuthContext] Dev login failed:', error);
      throw error;
    }

    if (data?.session?.user) {
      setSession(data.session);
      await loadUserProfile(data.session.user.id);

      // Set admin role if needed (for dev mode)
      if (isAdmin) {
        await supabase
          .from('users')
          .update({ role: 'ADMIN' })
          .eq('id', data.session.user.id);

        // Reload profile to reflect admin role
        await loadUserProfile(data.session.user.id);
      }

    }
  };

  const logout = async () => {
    analytics.reset();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updatePhoneNumber = async (phone: string) => {
    if (!user) {return;}

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      throw new Error('Invalid E.164 format. Phone must start with + and country code.');
    }

    const { error } = await supabase
      .from('users')
      .update({ phone_e164: phone })
      .eq('id', user.id);

    if (error) {throw new Error('Failed to update phone number');}

    setUser({ ...user, phone_e164: phone });
  };

  const updateProfile = async (data: { name?: string }) => {
    if (!user) {return;}

    const update: UserUpdate = {};
    if (data.name !== undefined) {update.name = data.name;}

    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', user.id);

    if (error) {throw new Error('Failed to update profile');}

    setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      login: loginWithGoogle,
      loginWithGoogle,
      loginDev,
      logout,
      updatePhoneNumber,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
