'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/user`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (provider) => {
    console.log(`Logging in with ${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/${provider}`);
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/${provider}`;
  };

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout`, {
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
