import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import type { Session } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

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

function mapSupabaseUser(profile: any): User {
  return {
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    avatar: profile.avatar || '',
    phone_e164: profile.phone_e164 || null,
    role: profile.role || 'USER',
    phoneVerified: profile.phone_verified || false,
    emailVerified: profile.email_verified || false,
    google_id: profile.google_id,
    created_at: profile.created_at ? new Date(profile.created_at) : undefined,
    last_login_at: profile.last_login_at ? new Date(profile.last_login_at) : undefined,
  };
}

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

    const mappedUser = mapSupabaseUser(profile);
    setUser(mappedUser);

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
          // Retry with exponential backoff to wait for auth trigger to create profile
          const retryLoadProfile = async (userId: string, attempt = 0) => {
            const delays = [200, 400, 800, 1600, 3000];
            const result = await loadUserProfile(userId);
            if (!result && attempt < delays.length) {
              setTimeout(() => retryLoadProfile(userId, attempt + 1), delays[attempt]);
            }
          };
          retryLoadProfile(newSession.user.id);
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
   */
  const loginDev = async (isAdmin: boolean = false) => {
    const email = isAdmin ? 'admin@eyebuckz.com' : 'test@example.com';
    const password = 'dev-password-123';

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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updatePhoneNumber = async (phone: string) => {
    if (!user) return;

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      throw new Error('Invalid E.164 format. Phone must start with + and country code.');
    }

    const { error } = await supabase
      .from('users')
      .update({ phone_e164: phone })
      .eq('id', user.id);

    if (error) throw new Error('Failed to update phone number');

    setUser({ ...user, phone_e164: phone });
  };

  const updateProfile = async (data: { name?: string }) => {
    if (!user) return;

    const update: any = {};
    if (data.name !== undefined) update.name = data.name;

    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', user.id);

    if (error) throw new Error('Failed to update profile');

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
