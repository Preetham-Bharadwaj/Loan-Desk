import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useNotifications } from '../hooks/useLoans';
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const initials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
  { name: 'Apply Loan', path: '/customer/apply-loan', icon: FilePlus2 },
  { name: 'My Applications', path: '/customer/my-applications', icon: FileText },
  { name: 'Notifications', path: '/customer/notifications', icon: Bell, badgeKey: 'unread' },
  { name: 'Profile', path: '/customer/profile', icon: User },
];

const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: notifications = [] } = useNotifications(user?.id);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarWidth = isCollapsed ? 76 : 260;

  const SidebarContent = ({ isMobileView = false }) => {
    const showText = !isCollapsed || isMobileView;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
        {/* Brand Header */}
        <div style={{ 
          padding: '0 16px', 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: showText ? 'space-between' : 'center',
          borderBottom: '1px solid #f1f5f9' 
        }}>
          <Link to="/customer/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16,185,129,0.2)',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 22V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14M18 22V10M6 22V12M10 22V16M14 22V14M22 22H2" />
              </svg>
            </div>
            {showText && (
              <div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                  LOAN<span style={{ color: '#059669' }}>DESK</span>
                </div>
                <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '2px' }}>Customer Portal</div>
              </div>
            )}
          </Link>

          {/* Collapse toggle button on Desktop */}
          {showText && !isMobileView && (
            <button 
              onClick={() => setIsCollapsed(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px', borderRadius: '8px', color: '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <ChevronLeft style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            const badge = item.badgeKey === 'unread' ? unreadCount : null;
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
                  padding: '10px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  background: isActive ? '#0f172a' : 'transparent',
                  color: isActive ? 'white' : '#64748b',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <item.icon style={{ width: '18px', height: '18px', flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                
                {showText && <span style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? 600 : 500 }}>{item.name}</span>}
                
                {badge > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '999px',
                    position: showText ? 'static' : 'absolute',
                    top: showText ? 'auto' : '6px',
                    right: showText ? 'auto' : '6px',
                  }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Panel */}
        <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: showText ? 'space-between' : 'center',
            gap: showText ? '10px' : '0', 
            padding: '8px', 
            borderRadius: '12px', 
            background: '#f8fafc', 
            border: '1px solid #f1f5f9' 
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0
            }}>
              {initials(user?.fullName)}
            </div>
            
            {showText && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
            )}

            {showText && (
              <button
                onClick={handleLogout}
                title="Sign out"
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', 
                  padding: '6px', borderRadius: '8px', color: '#94a3b8', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Embedded CSS for responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .main-content-wrapper { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>

      {/* Desktop sidebar — collapsible */}
      <aside 
        className="desktop-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20,
          width: `${sidebarWidth}px`,
          background: 'white',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease-in-out'
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside style={{
            position: 'relative', width: '260px', background: 'white',
            zIndex: 51, boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column',
          }}>
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute', top: '14px', right: '-44px',
                background: 'white', border: 'none', cursor: 'pointer',
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <X style={{ width: '16px', height: '16px', color: '#64748b' }} />
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
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: '16px',
        }}>
          {/* Mobile hamburger menu (hidden on desktop via CSS style above) */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px', borderRadius: '8px', display: 'none', alignItems: 'center',
              color: '#64748b', justifyContent: 'center'
            }}
          >
            <Menu style={{ width: '20px', height: '20px' }} />
          </button>

          {/* Desktop expand button (visible only when collapsed) */}
          {isCollapsed && (
            <button
              className="desktop-sidebar"
              onClick={() => setIsCollapsed(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px', borderRadius: '8px', color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <ChevronRight style={{ width: '18px', height: '18px' }} />
            </button>
          )}

          <div style={{ flex: 1 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 10px', borderRadius: '999px',
              background: '#ecfdf5', border: '1px solid #a7f3d0',
              fontSize: '11px', fontWeight: 700, color: '#059669',
            }}>
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Customer Portal
            </span>
          </div>

          {/* Profile metadata info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{user?.fullName}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Welcome back</div>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '12px', flexShrink: 0,
            }}>
              {initials(user?.fullName)}
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
