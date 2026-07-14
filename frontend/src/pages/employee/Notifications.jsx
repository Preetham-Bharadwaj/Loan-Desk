import React, { useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useDeleteNotification, useMarkNotificationRead, useNotifications } from '../../hooks/useLoans';
import { LoadingPage } from '../../components/ui/Primitives';
import { Bell, Check, Trash2, Inbox } from 'lucide-react';

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, sans-serif' },
  pageTitle: { fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0 },
  pageSub: { fontSize: '13px', color: '#6B7280', margin: '4px 0 0' },
  card: { background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
};

const EmployeeNotifications = () => {
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();
  const [filter, setFilter] = useState('All');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    if (filter === 'Unread') return notifications.filter((n) => !n.read);
    return notifications;
  }, [filter, notifications]);

  const markAllRead = () => {
    notifications.filter((n) => !n.read).forEach((n) => markReadMutation.mutate(n.id));
  };

  if (isLoading) return <LoadingPage message="Loading notifications..." />;

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={S.pageTitle}>Notifications</h1>
          <p style={S.pageSub}>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ height: '36px', minWidth: '150px', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '0 10px', background: 'white' }}>
            {['All', 'Unread'].map((item) => <option key={item}>{item}</option>)}
          </select>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #E5E7EB', background: 'white', color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Check style={{ width: '12px', height: '12px' }} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total', value: notifications.length },
          { label: 'Unread', value: unreadCount },
          { label: 'Read', value: notifications.length - unreadCount },
        ].map((item) => (
          <div key={item.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1E3A8A', marginTop: '6px', lineHeight: 1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Inbox style={{ width: '32px', height: '32px', color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#4B5563', fontSize: '14px', margin: '0 0 4px' }}>No notifications</p>
            <p style={{ color: '#9CA3AF', fontSize: '12px', margin: 0 }}>You're all caught up. New alerts will appear here.</p>
          </div>
        ) : (
          filtered.map((notif, idx) => (
            <div
              key={notif.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '16px 20px',
                borderBottom: idx < filtered.length - 1 ? '1px solid #E5E7EB' : 'none',
                background: notif.read ? 'white' : '#F9FAFB',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={(e) => e.currentTarget.style.background = notif.read ? 'white' : '#F9FAFB'}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell style={{ width: '16px', height: '16px', color: '#1E3A8A' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: notif.read ? 600 : 700, color: '#111827' }}>{notif.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>{new Date(notif.timestamp || notif.createdAt || Date.now()).toLocaleString()}</span>
                    {!notif.read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1E3A8A', flexShrink: 0 }} />}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '3px', lineHeight: 1.5 }}>{notif.message}</div>
                {notif.applicationId && <div style={{ fontSize: '10px', color: '#1E3A8A', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>{notif.applicationId}</div>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!notif.read && (
                  <button onClick={() => markReadMutation.mutate(notif.id)} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }} title="Mark as read">
                    <Check style={{ width: '14px', height: '14px' }} />
                  </button>
                )}
                <button onClick={() => deleteMutation.mutate(notif.id)} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }} title="Delete notification">
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmployeeNotifications;
