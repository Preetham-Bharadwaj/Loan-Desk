import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import {
  LayoutDashboard,
  FileText,
  History,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const initials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'E';

const ROLE_BADGE = {
  'Loan Officer':         { bg: '#E0F2FE', text: '#0369A1' },
};

const navItems = [
  { name: 'Dashboard',    path: '/employee/dashboard',  icon: LayoutDashboard },
  { name: 'Applications', path: '/employee/applications', icon: FileText },
  { name: 'Audit Logs',   path: '/employee/audit-logs',   icon: History },
  { name: 'Settings',     path: '/employee/settings',     icon: SettingsIcon },
];

const EmployeeLayout = () => {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const roleBadge = ROLE_BADGE[user?.role] || { bg: '#F3F4F6', text: '#374151' };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebarWidth = isCollapsed ? 76 : 260;

  const SidebarContent = ({ isMobileView = false }) => {
    const showText = !isCollapsed || isMobileView;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
        {/* Brand Header */}
        <div style={{ 
          padding: '0 16px', 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: showText ? 'space-between' : 'center',
          borderBottom: '1px solid #E5E7EB' 
        }}>
          <Link to="/employee/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#1E3A8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 22V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14M18 22V10M6 22V12M10 22V16M14 22V14M22 22H2" />
              </svg>
            </div>
            {showText && (
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1E3A8A', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                  Loan<span style={{ color: '#2563EB' }}>Desk</span>
                </div>
                <div style={{ fontSize: '8px', color: '#6B7280', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '2px' }}>Loan Officer</div>
              </div>
            )}
          </Link>

          {showText && !isMobileView && (
            <button 
              onClick={() => setIsCollapsed(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px', borderRadius: '6px', color: '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <ChevronLeft style={{ width: '16px', height: '16px', color: '#6B7280' }} />
            </button>
          )}
        </div>

        {/* Role Indicator Info */}
        {showText && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '999px',
              background: roleBadge.bg, border: '1px solid #E5E7EB',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleBadge.text }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: roleBadge.text }}>
                {user?.role ?? 'Staff'}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={!showText ? item.name : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: showText ? 'flex-start' : 'center',
                  gap: showText ? '12px' : '0',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  background: isActive ? '#F1F5F9' : 'transparent',
                  color: isActive ? '#1E3A8A' : '#4B5563',
                  borderLeft: showText && isActive ? '3px solid #1E3A8A' : '3px solid transparent',
                  position: 'relative'
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#111827'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4B5563'; }}}
              >
                <item.icon style={{ width: '16px', height: '16px', flexShrink: 0, color: isActive ? '#1E3A8A' : '#6B7280' }} />
                
                {showText && <span style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? 600 : 500 }}>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Panel */}
        <div style={{ padding: '12px', borderTop: '1px solid #E5E7EB' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: showText ? 'space-between' : 'center',
            gap: showText ? '10px' : '0', 
            padding: '8px', 
            borderRadius: '8px', 
            background: '#F9FAFB', 
            border: '1px solid #E5E7EB' 
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111827',
              fontWeight: 700,
              fontSize: '11px',
              flexShrink: 0,
              border: '1px solid #D1D5DB',
            }}>
              {initials(user?.fullName)}
            </div>
            
            {showText && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName}
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email || user?.id}
                </div>
              </div>
            )}

            {showText && (
              <button
                onClick={handleLogout}
                title="Sign out"
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', 
                  padding: '6px', borderRadius: '6px', color: '#6B7280', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7280'; }}
              >
                <LogOut style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .main-content-wrapper { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside 
        className="desktop-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20,
          width: `${sidebarWidth}px`,
          background: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease-in-out'
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside style={{
            position: 'relative', width: '260px', background: '#FFFFFF',
            zIndex: 51, borderRight: '1px solid #E5E7EB',
            display: 'flex', flexDirection: 'column',
          }}>
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute', top: '16px', right: '-40px',
                background: 'white', border: '1px solid #E5E7EB', cursor: 'pointer',
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <X style={{ width: '16px', height: '16px', color: '#6B7280' }} />
            </button>
            <SidebarContent isMobileView={true} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className="main-content-wrapper" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          marginLeft: `${sidebarWidth}px`,
          transition: 'margin-left 0.2s ease-in-out'
        }}
      >
        {/* Top bar header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 10,
          height: '64px', background: 'white',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: '16px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}>
          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '6px', color: '#6B7280',
              display: 'none', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Menu style={{ width: '20px', height: '20px' }} />
          </button>

          {/* Desktop expand button */}
          {isCollapsed && (
            <button
              className="desktop-sidebar"
              onClick={() => setIsCollapsed(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px', borderRadius: '6px', color: '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <ChevronRight style={{ width: '18px', height: '18px' }} />
            </button>
          )}

      

          {/* Right side information status */}
         
        </header>

        {/* Page content main wrapper */}
        <main style={{ flex: 1, padding: '32px', maxWidth: '1280px', width: '100%', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployeeLayout;
