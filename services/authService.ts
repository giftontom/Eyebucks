/**
 * Auth Service - Supabase Version
 * Thin wrapper that delegates to Supabase Auth + user profile queries
 * Kept for backward compatibility with components that import authService
 */
import { supabase } from './supabase';
import { User } from '../types';

const USER_KEY = 'eyebuckz_user';

export const authService = {
  /**
   * Login with Google OAuth (delegates to Supabase Auth)
   * Note: In the Supabase version, Google login is handled by AuthContext.loginWithGoogle()
   * This method is kept for backward compatibility but shouldn't be called directly
   */
  loginWithGoogle: async (_credential: string): Promise<User> => {
    // Supabase handles Google OAuth redirect flow - this is a no-op
    throw new Error('Use AuthContext.loginWithGoogle() for Supabase OAuth flow');
  },

  /**
   * Dev login (delegates to Supabase email/password)
   */
  loginDev: async (_isAdmin: boolean = false): Promise<User> => {
    throw new Error('Use AuthContext.loginDev() for Supabase dev login');
  },

  /**
   * Update user phone number
   */
  updatePhone: async (userId: string, phone: string): Promise<void> => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      throw new Error('Invalid E.164 format. Phone must start with + and country code.');
    }

    const { error } = await supabase
      .from('users')
      .update({ phone_e164: phone, phone_verified: true })
      .eq('id', userId);

    if (error) throw new Error('Failed to update phone number');
  },

  /**
   * Get current user from Supabase Auth + profile
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !profile) return null;

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar || '',
        phone_e164: profile.phone_e164,
        role: profile.role,
        phoneVerified: profile.phone_verified,
        emailVerified: profile.email_verified,
        google_id: profile.google_id,
        created_at: profile.created_at ? new Date(profile.created_at) : undefined,
        last_login_at: profile.last_login_at ? new Date(profile.last_login_at) : undefined,
      };
    } catch (error) {
      console.error('[Auth] Failed to get current user:', error);
      return null;
    }
  },

  checkSession: (): User | null => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  saveSession: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(USER_KEY);
  },
};
