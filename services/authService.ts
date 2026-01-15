import { User } from '../types';
import { apiClient } from './apiClient';

const USER_KEY = 'eyebuckz_user';

export const authService = {
  /**
   * Login with Google OAuth credential
   * Exchanges Google token for JWT and creates session
   */
  loginWithGoogle: async (credential: string): Promise<User> => {
    try {
      // In development mode without Google Client ID, use mock credentials
      const isDevelopmentMode = !import.meta.env.VITE_GOOGLE_CLIENT_ID;

      let authData;
      if (isDevelopmentMode && !credential) {
        // Development mode: use mock credentials
        authData = {
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200',
          sub: 'google_dev_' + Date.now()
        };
        console.log('[Auth] Development mode: Using mock Google credentials');
      } else {
        // Production mode: send Google credential to backend
        authData = {
          credential
        };
      }

      // Call backend API to create/login user
      const response = await apiClient.googleAuth(authData as any);

      if (!response.success || !response.user) {
        throw new Error('Authentication failed');
      }

      console.log('[Auth] User logged in:', response.user.id);

      return response.user;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  },

  /**
   * Login with mock development credentials
   * For development only - bypasses Google OAuth
   */
  loginDev: async (isAdmin: boolean = false): Promise<User> => {
    try {
      const mockCredentials = {
        email: isAdmin ? 'admin@eyebuckz.com' : 'test@example.com',
        name: isAdmin ? 'Admin User' : 'Test User',
        picture: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200',
        sub: `google_dev_${isAdmin ? 'admin' : 'user'}_${Date.now()}`
      };

      const response = await apiClient.googleAuth(mockCredentials);

      if (!response.success || !response.user) {
        throw new Error('Development login failed');
      }

      console.log('[Auth] Dev login successful:', response.user.id);

      return response.user;
    } catch (error) {
      console.error('[Auth] Dev login failed:', error);
      throw error;
    }
  },

  /**
   * Update user phone number (persists to backend)
   */
  updatePhone: async (userId: string, phone: string): Promise<void> => {
    try {
      // Validate E.164 format locally first
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      if (!e164Regex.test(phone)) {
        throw new Error('Invalid E.164 format. Phone must start with + and country code.');
      }

      // Call backend API to persist phone number
      const response = await apiClient.updatePhone(userId, phone);

      if (!response.success) {
        throw new Error('Failed to update phone number');
      }

      console.log('[Auth] Phone updated for user:', userId);
    } catch (error) {
      console.error('[Auth] Phone update failed:', error);
      throw error;
    }
  },

  /**
   * Get current user from backend
   * Validates JWT token and returns user data
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.user) {
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('[Auth] Failed to get current user:', error);
      return null;
    }
  },

  /**
   * Check if there's a stored user in localStorage
   * Note: This is just a cache, real auth is JWT-based
   */
  checkSession: (): User | null => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  /**
   * Save user to localStorage (cache only)
   */
  saveSession: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Logout user and clear session
   * Invalidates tokens on backend
   */
  logout: async () => {
    try {
      // Call backend logout endpoint
      await apiClient.logout();
    } catch (error) {
      console.error('[Auth] Logout API call failed:', error);
    }

    // Clear local storage regardless of API call success
    localStorage.removeItem(USER_KEY);
    console.log('[Auth] User logged out');
  }
};
