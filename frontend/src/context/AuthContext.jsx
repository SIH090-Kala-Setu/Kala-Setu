import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getMe } from '../api/auth';
import { pingBackend } from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('artisan_token') || null);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState({ online: false, checking: true });
  const { showToast } = useToast();

  // Check Backend Connectivity
  const checkBackend = useCallback(async () => {
    const status = await pingBackend();
    setBackendStatus({ online: status.online, checking: false, database: status.database_backend });
  }, []);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  // Load active session user if token exists
  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('artisan_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await getMe();
      setUser(userData);
    } catch (err) {
      console.error('Session load error:', err);
      localStorage.removeItem('artisan_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      showToast('Session expired. Please sign in again.', 'warning');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [loadUser, showToast]);

  const login = async (username, password) => {
    try {
      const res = await loginUser(username, password);
      const authToken = res.access_token;
      localStorage.setItem('artisan_token', authToken);
      setToken(authToken);

      const me = await getMe();
      setUser(me);
      showToast(`Welcome back, ${me.full_name || me.username}!`, 'success');
      return me;
    } catch (error) {
      showToast(error.message || 'Login failed', 'error');
      throw error;
    }
  };

  const register = async (registerData) => {
    try {
      const newUser = await registerUser(registerData);
      showToast('Registration successful! You can now sign in.', 'success');
      return newUser;
    } catch (error) {
      showToast(error.message || 'Registration failed', 'error');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('artisan_token');
    setToken(null);
    setUser(null);
    showToast('Signed out successfully.', 'info');
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isArtisan: user?.role === 'Artisan',
    isBuyer: user?.role === 'Buyer',
    loading,
    backendStatus,
    login,
    register,
    logout,
    refreshUser: loadUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

