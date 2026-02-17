import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { storage } from '../services/storage';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await storage.getToken();
        const savedUser = await storage.getUser();

        if (token && savedUser) {
          setUser(savedUser);
          // Optionally refresh user data
          try {
            const freshUser = await authAPI.getProfile();
            setUser(freshUser);
            await storage.setUser(freshUser);
          } catch (error) {
            console.error('Failed to refresh user profile:', error);
            // Keep using saved user if refresh fails
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        await storage.clear();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleAuthSuccess = async (authResponse: AuthResponse) => {
    const { token, user } = authResponse;
    await storage.setToken(token);
    await storage.setUser(user);
    setUser(user);
  };

  const login = async (credentials: LoginCredentials) => {
    const response = await authAPI.login(credentials);
    await handleAuthSuccess(response);
  };

  const register = async (data: RegisterData) => {
    const response = await authAPI.register(data);
    await handleAuthSuccess(response);
  };

  const logout = async () => {
    await storage.clear();
    setUser(null);
  };

  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await storage.setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
