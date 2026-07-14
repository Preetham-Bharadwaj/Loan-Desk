import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * ProtectedRoute
 *
 * Props:
 *   allowedRoleType      — 'customer' | 'employee'  (broad portal gate)
 *   allowedEmployeeRoles — string[]                  (fine-grained role gate)
 *
 * On access violation the user is sent back to their correct home, not /login.
 */
const ProtectedRoute = ({ children, allowedRoleType, allowedEmployeeRoles }) => {
  const { isAuthenticated, isLoading, roleType, user } = useAuth();
  const location = useLocation();

  /* ── 1. Auth loading splash ── */
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: '#f8fafc',
      }}>
        <svg style={{ width: '32px', height: '32px', color: '#2563eb', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Restoring secure session…</p>
      </div>
    );
  }

  /* ── 2. Not authenticated → login ── */
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  /* ── 3. Wrong portal type (e.g. customer trying to access /employee) ── */
  if (allowedRoleType && roleType !== allowedRoleType) {
    const fallback = roleType === 'employee' ? '/employee/dashboard' : '/customer/dashboard';
    return <Navigate to={fallback} replace />;
  }

  /* ── 4. Wrong employee role (fine-grained queue access) ── */
  if (allowedEmployeeRoles && allowedEmployeeRoles.length > 0) {
    if (roleType !== 'employee' || !allowedEmployeeRoles.includes(user?.role)) {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
