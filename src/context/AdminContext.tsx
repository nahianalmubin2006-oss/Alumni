import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminSessionUser } from '../types';

interface AdminContextType {
  adminToken: string | null;
  adminUser: AdminSessionUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loading: boolean;
  authChecked: boolean;
  authError: string | null;
  loginAdmin: (email: string, password: string) => Promise<AdminSessionUser>;
  logoutAdmin: () => Promise<void>;
  checkAdminAuth: () => Promise<boolean>;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'alumniSphereAdminToken';

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Authenticated fetch wrapper
  const apiFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      const token = adminToken || sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      // If token expired or invalid, auto logout on 401
      if (response.status === 401 && endpoint !== '/api/admin/auth/login') {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        setAdminToken(null);
        setAdminUser(null);
      }

      return response;
    },
    [adminToken]
  );

  // Server-side auth check
  const checkAdminAuth = useCallback(async (): Promise<boolean> => {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setAdminToken(null);
      setAdminUser(null);
      setLoading(false);
      setAuthChecked(true);
      return false;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setAdminToken(token);
          setAdminUser(data.user);
          setAuthError(null);
          setLoading(false);
          setAuthChecked(true);
          return true;
        }
      }

      // If server denied or token expired, invalidate client session
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      setAdminToken(null);
      setAdminUser(null);
      setLoading(false);
      setAuthChecked(true);
      return false;
    } catch (err) {
      console.error('Failed to verify admin authentication status:', err);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      setAdminToken(null);
      setAdminUser(null);
      setLoading(false);
      setAuthChecked(true);
      return false;
    }
  }, []);

  // Check auth on initial mount
  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  // Login handler
  const loginAdmin = async (email: string, password: string): Promise<AdminSessionUser> => {
    setLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Invalid administrative credentials.';
        setAuthError(msg);
        throw new Error(msg);
      }

      if (!data.token || !data.user) {
        throw new Error('Authentication response did not contain administrative session token.');
      }

      // Store in sessionStorage (never localStorage to avoid account leakage)
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setAdminToken(data.token);
      setAdminUser(data.user);
      setAuthError(null);
      setAuthChecked(true);
      setLoading(false);

      return data.user;
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  // Logout handler
  const logoutAdmin = async (): Promise<void> => {
    const token = adminToken || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (e) {
        console.warn('Admin logout endpoint call warning:', e);
      }
    }

    // Completely wipe administrative session state
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setAdminToken(null);
    setAdminUser(null);
    setAuthError(null);
    setAuthChecked(true);
  };

  const isAuthenticated = !!adminUser && (adminUser.role === 'ADMIN' || adminUser.role === 'SUPER_ADMIN');
  const isSuperAdmin = isAuthenticated && adminUser?.role === 'SUPER_ADMIN';
  const isAdmin = isAuthenticated;

  return (
    <AdminContext.Provider
      value={{
        adminToken,
        adminUser,
        isAuthenticated,
        isSuperAdmin,
        isAdmin,
        loading,
        authChecked,
        authError,
        loginAdmin,
        logoutAdmin,
        checkAdminAuth,
        apiFetch,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
