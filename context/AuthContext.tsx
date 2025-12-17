import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  adminLogin: () => Promise<void>;
  logout: () => void;
  updatePhoneNumber: (phone: string) => Promise<void>;
  isGapCheckRequired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGapCheckRequired, setIsGapCheckRequired] = useState(false);

  useEffect(() => {
    const storedUser = authService.checkSession();
    if (storedUser) {
      setUser(storedUser);
      if (!storedUser.phone_e164) {
        setIsGapCheckRequired(true);
      }
    }
  }, []);

  // Concurrent Session Enforcement (Module 5)
  // Periodically check if the session token is still valid on the server
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(async () => {
        const isValid = await authService.validateSessionToken(user.id);
        if (!isValid) {
            alert("You have been logged out because your account was accessed from another device.");
            logout();
        }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  const login = async () => {
    const loggedInUser = await authService.login();
    setUser(loggedInUser);
    authService.saveSession(loggedInUser);
    
    // Gap Check Logic: If no phone number, set flag to true
    if (!loggedInUser.phone_e164) {
      setIsGapCheckRequired(true);
    }
  };

  const adminLogin = async () => {
     const admin = await authService.adminLogin();
     setUser(admin);
     authService.saveSession(admin);
     setIsGapCheckRequired(false);
  }

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsGapCheckRequired(false);
  };

  const updatePhoneNumber = async (phone: string) => {
    if (user) {
      await authService.updatePhone(user.id, phone);
      const updatedUser = { ...user, phone_e164: phone };
      setUser(updatedUser);
      authService.saveSession(updatedUser);
      setIsGapCheckRequired(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, logout, updatePhoneNumber, isGapCheckRequired }}>
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