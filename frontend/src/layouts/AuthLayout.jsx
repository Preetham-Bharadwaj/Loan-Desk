import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import QuickDemoLoginSection from '../components/auth/QuickDemoLoginSection';

/**
 * AuthLayout — Clean, professional, light-themed banking login shell.
 * White background. No gradients. No glassmorphism. Enterprise minimal.
 */
const AuthLayout = () => {
  const { isAuthenticated, roleType } = useAuth();

  // Already logged in → redirect to correct portal
  if (isAuthenticated) {
    if (roleType === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    }
    return <Navigate to="/customer/dashboard" replace />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',       /* slate-100 — subtle off-white */
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
    }}>

      {/* Brand header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          {/* Logo mark */}
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M3 22V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" />
              <path d="M18 22V10M6 22V12M10 22V16M14 22V14M22 22H2" />
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '22px', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1,
            }}>
              Loan<span style={{ color: '#2563eb' }}>Desk</span>
            </div>
            <div style={{
              fontSize: '10px', color: '#94a3b8', fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px',
            }}>
              Enterprise Banking
            </div>
          </div>
        </div>
      </div>

      {/* Login card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '32px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
      }}>
        <Outlet />
      </div>

      <QuickDemoLoginSection />

      {/* Trust badges */}
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['SOC 2 Compliant', '256-bit TLS', 'RBI Regulated'].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            {item}
          </div>
        ))}
      </div>

      <p style={{ marginTop: '16px', fontSize: '11px', color: '#cbd5e1', textAlign: 'center' }}>
        &copy; {new Date().getFullYear()} Loan Desk Systems. All rights reserved.
      </p>
    </div>
  );
};

export default AuthLayout;
