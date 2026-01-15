import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginDev: (isAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updatePhoneNumber: (phone: string) => Promise<void>;
  isGapCheckRequired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGapCheckRequired, setIsGapCheckRequired] = useState(false);

  // Load user from backend on mount (validates JWT)
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try to get user from backend using JWT token
        const currentUser = await authService.getCurrentUser();

        if (currentUser) {
          setUser(currentUser);
          authService.saveSession(currentUser);

          // Gap Check Logic: If no phone number, set flag to true
          if (!currentUser.phone_e164) {
            setIsGapCheckRequired(true);
          }
        } else {
          // No valid session, clear local cache
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to load user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const loginWithGoogle = async (credential: string) => {
    try {
      const loggedInUser = await authService.loginWithGoogle(credential);
      setUser(loggedInUser);
      authService.saveSession(loggedInUser);

      // Gap Check Logic: If no phone number, set flag to true
      if (!loggedInUser.phone_e164) {
        setIsGapCheckRequired(true);
      }
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      throw error;
    }
  };

  const loginDev = async (isAdmin: boolean = false) => {
    try {
      const loggedInUser = await authService.loginDev(isAdmin);
      setUser(loggedInUser);
      authService.saveSession(loggedInUser);

      // Admins skip phone verification
      if (isAdmin) {
        setIsGapCheckRequired(false);
      } else if (!loggedInUser.phone_e164) {
        setIsGapCheckRequired(true);
      }
    } catch (error) {
      console.error('[AuthContext] Dev login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
    }

    setUser(null);
    setIsGapCheckRequired(false);
  };

  const updatePhoneNumber = async (phone: string) => {
    if (user) {
      await authService.updatePhone(user.id, phone);
      const updatedUser = { ...user, phone_e164: phone, phoneVerified: true };
      setUser(updatedUser);
      authService.saveSession(updatedUser);
      setIsGapCheckRequired(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      loginWithGoogle,
      loginDev,
      logout,
      updatePhoneNumber,
      isGapCheckRequired
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