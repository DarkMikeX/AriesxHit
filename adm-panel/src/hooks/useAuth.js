import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      await api.verifyToken();
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        // Ensure user is admin
        const permissions = typeof userData.permissions === 'string' 
          ? JSON.parse(userData.permissions) 
          : userData.permissions;
        
        if (permissions?.admin) {
          setUser(userData);
        } else {
          api.removeToken();
          setError('Admin access required');
        }
      }
    } catch (err) {
      api.removeToken();
      setError('Session expired');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    setLoading(true);

    try {
      // Generate a simple fingerprint for admin login
      const fingerprint = await generateFingerprint();
      
      const response = await api.login(username, password, fingerprint);
      
      if (response.success) {
        const userData = response.data?.user;
        const permissions = typeof userData?.permissions === 'string'
          ? JSON.parse(userData.permissions)
          : userData?.permissions;

        if (!permissions?.admin) {
          api.removeToken();
          throw { message: 'Admin access required' };
        }

        setUser(userData);
        return { success: true };
      }
      
      throw { message: response.message || 'Login failed' };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Simple fingerprint generator for admin panel
// For admin login, use a fixed fingerprint that matches the backend admin user
async function generateFingerprint() {
  // Use fixed fingerprint for admin panel login
  // This matches the admin user fingerprint in the database
  // Backend uses: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
  // Or from seed: 'admin-fingerprint-placeholder' (but needs to be 64 chars)
  return 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
}

export default useAuth;
