import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminSessionUser } from '../types';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { isSuperAdminEmail } from './AuthContext';

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
  sendAdminPasswordReset: (email: string) => Promise<void>;
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
    let token = sessionStorage.getItem(TOKEN_STORAGE_KEY);

    // If no session token, check if Firebase Auth has an active super admin user
    if (!token && auth.currentUser?.emailVerified && auth.currentUser.email && isSuperAdminEmail(auth.currentUser.email)) {
      try {
        const exchangeRes = await fetch('/api/admin/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: await auth.currentUser.getIdToken(),
          }),
        });
        if (exchangeRes.ok) {
          const exchangeData = await exchangeRes.json();
          if (exchangeData.token && exchangeData.user) {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, exchangeData.token);
            token = exchangeData.token;
            setAdminToken(exchangeData.token);
            setAdminUser(exchangeData.user);
            setAuthError(null);
            setLoading(false);
            setAuthChecked(true);
            return true;
          }
        }
      } catch (e) {}
    }

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

  // Check auth on initial mount & synchronize on Firebase auth changes
  useEffect(() => {
    checkAdminAuth();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser?.emailVerified && fbUser.email && isSuperAdminEmail(fbUser.email)) {
        const currentToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
        if (!currentToken) {
          try {
            const exchangeRes = await fetch('/api/admin/auth/firebase-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: await fbUser.getIdToken(),
              }),
            });
            if (exchangeRes.ok) {
              const exchangeData = await exchangeRes.json();
              if (exchangeData.token && exchangeData.user) {
                sessionStorage.setItem(TOKEN_STORAGE_KEY, exchangeData.token);
                setAdminToken(exchangeData.token);
                setAdminUser(exchangeData.user);
                setAuthError(null);
              }
            }
          } catch (e) {}
        }
      }
    });

    return () => unsub();
  }, [checkAdminAuth]);

  // Login handler
  const loginAdmin = async (email: string, password: string): Promise<AdminSessionUser> => {
    setLoading(true);
    setAuthError(null);

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Try server admin login
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json();

      if (res.ok && data.token && data.user) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        setAdminToken(data.token);
        setAdminUser(data.user);
        setAuthError(null);
        setAuthChecked(true);
        setLoading(false);
        return data.user;
      }
    } catch (serverErr) {
      console.warn('Server admin login attempt warning, attempting Firebase auth verification...');
    }

    // 2. If server auth failed, try Firebase Auth
    try {
      const fbUserCred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      // Firebase sign-in proves identity only; the server decides whether this identity has an admin role.
      if (fbUserCred.user) {
        // Exchange with backend to obtain admin session
        const exchangeRes = await fetch('/api/admin/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: await fbUserCred.user.getIdToken(),
          }),
        });

        if (exchangeRes.ok) {
          const exchangeData = await exchangeRes.json();
          if (exchangeData.token && exchangeData.user) {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, exchangeData.token);
            setAdminToken(exchangeData.token);
            setAdminUser(exchangeData.user);
            setAuthError(null);
            setAuthChecked(true);
            setLoading(false);
            return exchangeData.user;
          }
        }

        throw new Error('Firebase authentication succeeded, but the secure admin session could not be established. Please try again.');
      }
    } catch (fbErr: any) {
      console.warn('Firebase auth attempt error:', fbErr?.code || fbErr?.message);
    }

    setLoading(false);
    const msg = 'Invalid administrative credentials. Please verify your email and password.';
    setAuthError(msg);
    throw new Error(msg);
  };

  const sendAdminPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
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

  const isAuthenticated = !!adminUser && ['ADMIN', 'SUPER_ADMIN', 'CO_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN'].includes(adminUser.role);
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
        sendAdminPasswordReset,
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
