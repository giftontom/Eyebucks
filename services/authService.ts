import { User } from '../types';

const USER_KEY = 'eyebuckz_user';
const SESSION_TOKEN_KEY = 'eyebuckz_session_token';

// Simulating a backend database of sessions
// In a real app, this would be Redis or Postgres
let MOCK_SERVER_SESSION_STORE: Record<string, string> = {}; 

export const authService = {
  login: async (): Promise<User> => {
    // Simulating Google OAuth response delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: 'u_123',
          name: 'Demo User',
          email: 'demo@example.com',
          avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200',
          role: 'USER',
          google_id: 'g_12345',
          // Intentionally leaving phone_e164 undefined to trigger "Gap Check"
        };
        
        // Generate a new session token
        const newToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // SERVER SIDE SIMULATION: Invalidate old sessions for this user
        // We store the "valid" token for this user ID. Any other token is now invalid.
        MOCK_SERVER_SESSION_STORE[mockUser.id] = newToken;
        localStorage.setItem(SESSION_TOKEN_KEY, newToken);

        resolve(mockUser);
      }, 800);
    });
  },

  adminLogin: async (): Promise<User> => {
     return new Promise((resolve) => {
      setTimeout(() => {
        const adminUser: User = {
          id: 'admin_1',
          name: 'Admin User',
          email: 'admin@eyebuckz.com',
          phone_e164: '+1234567890', // Admin has phone
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
          role: 'ADMIN',
        };
        const newToken = `token_${Date.now()}_admin`;
        MOCK_SERVER_SESSION_STORE[adminUser.id] = newToken;
        localStorage.setItem(SESSION_TOKEN_KEY, newToken);
        
        resolve(adminUser);
      }, 500);
     });
  },

  updatePhone: async (userId: string, phone: string): Promise<void> => {
    // Simulate server-side E.164 validation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (e164Regex.test(phone)) {
           resolve();
        } else {
           reject(new Error("Invalid E.164 format"));
        }
      }, 500);
    });
  },

  checkSession: (): User | null => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // Simulates the API call middleware that checks if the session is still valid
  validateSessionToken: async (userId: string): Promise<boolean> => {
    const currentClientToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const validServerToken = MOCK_SERVER_SESSION_STORE[userId];
    
    // If the server has a different token than the client, the session is invalid (concurrent login)
    if (validServerToken && currentClientToken !== validServerToken) {
        return false;
    }
    return true;
  },

  saveSession: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
};