import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useApplications, useNotifications } from '../../hooks/useLoans';
import { Badge, LoadingPage, StatCard } from '../../components/ui/Primitives';
import { FileText, CheckCircle, XCircle, Clock, Bell, ArrowRight, FilePlus2 } from 'lucide-react';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: applications = [], isLoading: appsLoading } = useApplications({ customerId: user?.id });
  const { data: notifications = [], isLoading: notifsLoading } = useNotifications(user?.id);

  const stats = useMemo(() => {
    const approved = applications.filter((app) => app.status === 'Approved').length;
    const rejected = applications.filter((app) => app.status === 'Rejected').length;
    const inProgress = applications.filter((app) => !['Approved', 'Rejected'].includes(app.status)).length;
    return {
      total: applications.length,
      approved,
      rejected,
      inProgress,
    };
  }, [applications]);

  const recentApplications = useMemo(
    () => [...applications].sort((a, b) => new Date(b.submittedAt || b.updatedAt || 0) - new Date(a.submittedAt || a.updatedAt || 0)).slice(0, 5),
    [applications]
  );

  const recentNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)).slice(0, 5),
    [notifications]
  );

  if (appsLoading || notifsLoading) return <LoadingPage message="Loading your dashboard..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '28px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', color: '#93c5fd', textTransform: 'uppercase' }}>
            Customer Portal
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800 }}>
            Welcome back, {user?.fullName || 'Customer'}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '13px' }}>
            Your applications, notifications, and status updates are live from Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/customer/apply-loan')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <FilePlus2 style={{ width: '16px', height: '16px' }} />
          Apply For a Loan
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        <StatCard title="Total Applications" value={stats.total} icon={FileText} description="All loan requests" />
        <StatCard title="Approved Applications" value={stats.approved} icon={CheckCircle} description="Approved by manager" />
        <StatCard title="Rejected Applications" value={stats.rejected} icon={XCircle} description="Closed as rejected" />
        <StatCard title="Applications In Progress" value={stats.inProgress} icon={Clock} description="Active workflow cases" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
        <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Recent Applications</h2>
            <button type="button" onClick={() => navigate('/customer/my-applications')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {recentApplications.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No applications submitted yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Application ID', 'Loan Type', 'Amount', 'Status'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #e2e8f0' }}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700 }}>{app.id}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>{app.loanType}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155' }}>INR {Number(app.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}><Badge status={app.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell style={{ width: '16px', height: '16px', color: '#2563eb' }} />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Recent Notifications</h2>
          </div>
          <div style={{ display: 'grid' }}>
            {recentNotifications.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No notifications yet.
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div key={notif.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{notif.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: 1.5 }}>{notif.message}</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <Badge status={notif.read ? 'Read' : 'Unread'} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CustomerDashboard;
