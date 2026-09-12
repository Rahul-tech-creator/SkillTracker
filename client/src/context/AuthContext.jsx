import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import {
  getSessionToken,
  getSessionUser,
  saveSession,
  clearSession,
} from '../utils/sessionManager';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getSessionUser());
  const [token, setToken] = useState(() => getSessionToken());
  const [loading, setLoading] = useState(true);

  // Sync token and load fresh user profile from backend
  useEffect(() => {
    const checkAuth = async () => {
      const activeToken = getSessionToken();
      if (activeToken) {
        setToken(activeToken);
        try {
          const res = await authService.getMe();
          if (res.data?.success) {
            setUser(res.data.user);
            saveSession(activeToken, res.data.user);
          }
        } catch (err) {
          console.warn('Session check failed or expired:', err.message);
          logout();
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for global unauthorized events
    const handleUnauthorized = () => {
      clearSession();
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    const res = await authService.login({ username, password });
    if (res.data?.success) {
      const { token: newToken, user: userData } = res.data;
      saveSession(newToken, userData);
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      clearSession();
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      if (res.data?.success) {
        setUser(res.data.user);
        saveSession(token, res.data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'ADMIN',
        isProvider: user?.role === 'PROVIDER',
        isTrainee: user?.role === 'TRAINEE',
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
