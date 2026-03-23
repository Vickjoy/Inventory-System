// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ========================
  // Rehydrate on page refresh
  // ========================
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Restore from localStorage immediately so UI doesn't flash
          const userData = JSON.parse(storedUser);
          setUser(userData);

          // Verify token still valid by hitting /users/me/
          const freshUser = await api.getCurrentUser();

          const mergedUser = {
            ...freshUser,
            // Prefer role from fresh response, fallback to stored, fallback to 'staff'
            role: freshUser.role || userData.role || 'staff',
          };

          setUser(mergedUser);
          localStorage.setItem('user', JSON.stringify(mergedUser));
        } catch (error) {
          console.error('Session restore failed:', error);
          clearAuth();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // ========================
  // Clear all auth state
  // ========================
  const clearAuth = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // ========================
  // Login
  // ========================
  const login = async (username, password) => {
    try {
      const data = await api.login({ username, password });

      // Guard: if access token missing, treat as failed login
      if (!data?.access) {
        return {
          success: false,
          error: data?.detail || 'Invalid credentials. Please try again.',
        };
      }

      // Store tokens
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      // -------------------------------------------------------
      // Build user object
      // CASE 1: Backend returns data.user (CustomTokenObtainPairSerializer is active)
      // CASE 2: Backend doesn't return data.user yet — fall back to /users/me/
      // -------------------------------------------------------
      let userData;

      if (data.user && data.user.id) {
        // CustomTokenObtainPairSerializer is working correctly
        userData = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email || '',
          first_name: data.user.first_name || '',
          last_name: data.user.last_name || '',
          role: data.user.role || 'staff',
          is_staff: data.user.is_staff || false,
          is_superuser: data.user.is_superuser || false,
        };
      } else {
        // Fallback: fetch user info separately from /users/me/
        console.warn(
          'Login response did not include user object. ' +
          'Check that CustomTokenObtainPairSerializer is active in views.py. ' +
          'Falling back to /users/me/'
        );
        const freshUser = await api.getCurrentUser();
        userData = {
          id: freshUser.id,
          username: freshUser.username,
          email: freshUser.email || '',
          first_name: freshUser.first_name || '',
          last_name: freshUser.last_name || '',
          role: freshUser.role || 'staff',
          is_staff: freshUser.is_staff || false,
          is_superuser: freshUser.is_superuser || false,
        };
      }

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true, role: userData.role };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred. Please try again.',
      };
    }
  };

  // ========================
  // Logout
  // ========================
  const logout = () => {
    clearAuth();
  };

  // ========================
  // Role helpers
  // Use these anywhere in the app to show/hide UI
  // ========================
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  // ========================
  // Context value
  // ========================
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    isStaff,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;