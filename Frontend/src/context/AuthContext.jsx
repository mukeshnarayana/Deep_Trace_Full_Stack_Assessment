import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { setOnUnauthorizedCallback } from '../api/axiosClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  // Normalize user object so { id, name, role, tenant } is always clean and consistent
  const normalizeUser = (rawUser) => {
    if (!rawUser) return null;

    // Resolve tenant name gracefully if string or object
    let tenantObj = { id: rawUser.tenantId || '', name: 'Organization' };

    if (rawUser.tenant && typeof rawUser.tenant === 'object') {
      tenantObj = {
        id: rawUser.tenant.id || rawUser.tenant._id || rawUser.tenantId,
        name: rawUser.tenant.name || 'Organization',
        domain: rawUser.tenant.domain || '',
      };
    } else if (typeof rawUser.tenant === 'string') {
      tenantObj = { id: rawUser.tenantId || rawUser.tenant, name: rawUser.tenant };
    } else if (rawUser.email) {
      if (rawUser.email.toLowerCase().includes('acmebank')) {
        tenantObj = { id: rawUser.tenantId || 'acme', name: 'Acme Bank', domain: 'acmebank.com' };
      } else if (rawUser.email.toLowerCase().includes('zenretail')) {
        tenantObj = { id: rawUser.tenantId || 'zen', name: 'Zen Retail', domain: 'zenretail.io' };
      }
    }

    return {
      id: rawUser.id || rawUser._id,
      name: rawUser.name,
      email: rawUser.email,
      role: rawUser.role,
      tenantId: rawUser.tenantId,
      tenant: tenantObj,
    };
  };

  // Perform logout
  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem('auth_token')) {
        await authApi.logout();
      }
    } catch {
      // Ignore API logout failure, always clean client session
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    }
  }, []);

  // Set up 401 callback in axiosClient
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      logout();
    });
  }, [logout]);

  // Load user info from /api/auth/me on mount or token change
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const responseData = await authApi.getMe();
        if (responseData?.user) {
          setUser(normalizeUser(responseData.user));
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load user session:', err);
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  // Login handler
  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    const receivedToken = result.token;
    localStorage.setItem('auth_token', receivedToken);
    setToken(receivedToken);

    const normalized = normalizeUser(result.user);
    setUser(normalized);
    return normalized;
  }, []);

  // Role check helpers
  const hasRole = useCallback(
    (allowedRoles) => {
      if (!user) return false;
      if (!allowedRoles || allowedRoles.length === 0) return true;
      if (Array.isArray(allowedRoles)) {
        return allowedRoles.includes(user.role);
      }
      return user.role === allowedRoles;
    },
    [user]
  );

  const value = React.useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      isManager: user?.role === 'MANAGER',
      isUser: user?.role === 'USER',
      hasRole,
      login,
      logout,
      setUser,
    }),
    [user, token, loading, hasRole, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
