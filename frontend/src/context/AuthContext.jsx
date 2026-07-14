import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

/**
 * Determines whether a logged-in user is a customer or employee.
 * Relies purely on the `roleType` field returned by the auth API — never derived from UI.
 */
const getRoleType = (userData, serverRoleType) => {
  // Prefer the roleType field from the API response stored alongside user
  if (serverRoleType) return serverRoleType;
  // Fallback: employees always have a `role` field; customers never do
  return userData?.role ? 'employee' : 'customer';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [token, setToken]       = useState(null);
  const [roleType, setRoleType] = useState(null); // 'customer' | 'employee'
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken    = localStorage.getItem('loan_desk_token');
    const storedUser     = localStorage.getItem('loan_desk_user');
    const storedRoleType = localStorage.getItem('loan_desk_role_type');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setRoleType(storedRoleType || 'customer');
    }
    setIsLoading(false);
  }, []);

  /**
   * Login and restores the auth session from the backend API.
   * The API response contains:
   *   { token, roleType: 'customer' | 'employee', user: { ...fields, role?: 'Verification Officer' | ... } }
   *
   * Role is NEVER manually assignable from the frontend after this point.
   */
  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const data = await authService.login(username, password);

      const resolvedRoleType = data.roleType || getRoleType(data.user, null);

      setToken(data.token);
      setUser(data.user);
      setRoleType(resolvedRoleType);

      localStorage.setItem('loan_desk_token',     data.token);
      localStorage.setItem('loan_desk_user',      JSON.stringify(data.user));
      localStorage.setItem('loan_desk_role_type', resolvedRoleType);

      return { ...data, roleType: resolvedRoleType };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (nextUser) => {
    setUser((currentUser) => {
      const mergedUser = typeof nextUser === 'function' ? nextUser(currentUser) : { ...currentUser, ...nextUser };
      if (mergedUser) {
        localStorage.setItem('loan_desk_user', JSON.stringify(mergedUser));
      }
      return mergedUser;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRoleType(null);
    localStorage.removeItem('loan_desk_token');
    localStorage.removeItem('loan_desk_user');
    localStorage.removeItem('loan_desk_role_type');
  };

  const value = {
    user,
    token,
    roleType,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;
