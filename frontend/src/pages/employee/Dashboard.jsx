import React, { useMemo } from 'react';
import { useApplications } from '../../hooks/useLoans';
import { LoadingPage } from '../../components/ui/Primitives';
import { Clock3, FileText, CheckCircle2, XCircle } from 'lucide-react';
import LoanTypeDistributionCard from '../../components/dashboard/LoanTypeDistributionCard';

const C = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E5E7EB',
  line: '#F3F4F6',
  text: '#111827',
  sub: '#4B5563',
  muted: '#6B7280',
  blue: '#1E3A8A',
  blueSoft: '#EFF6FF',
  blueLine: '#DBEAFE',
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const getSubmittedAt = (app) => app?.submittedAt || app?.timeline?.[0]?.timestamp || null;

const EmployeeDashboard = () => {
  const { data: apps = [], isLoading } = useApplications();

  const stats = useMemo(() => {
    const today = new Date();
    const IN_REVIEW_STATUSES = ['In Review', 'Submitted', 'Verification Queue', 'Verification In Progress', 'Credit Queue', 'Credit In Progress', 'Approvals Queue', 'Credit Assessment', 'Manager Review'];
    const ON_HOLD_STATUSES   = ['On Hold', 'Document Requested', 'Additional Documents Required'];
    return {
      pendingReview:     apps.filter((app) => IN_REVIEW_STATUSES.includes(app.status)).length,
      documentRequested: apps.filter((app) => ON_HOLD_STATUSES.includes(app.status)).length,
      approvedToday:     apps.filter((app) => app.status === 'Approved' && isSameDay(app.updatedAt || app.submittedAt || app.timeline?.[0]?.timestamp, today)).length,
      rejectedToday:     apps.filter((app) => app.status === 'Rejected' && isSameDay(app.updatedAt || app.submittedAt || app.timeline?.[0]?.timestamp, today)).length,
    };
  }, [apps]);

  if (isLoading) return <LoadingPage message="Loading dashboard..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: C.text }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.muted }}>
          Live operational overview backed by Supabase.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
        {[
          {
            label: 'Pending Review',
            value: stats.pendingReview,
            icon: Clock3,
            emptyMain: '✓ Queue Clear',
            emptyCaption: 'No pending applications',
          },
          {
            label: 'Document Requested',
            value: stats.documentRequested,
            icon: FileText,
            emptyMain: 'No Pending Requests',
            emptyCaption: 'Awaiting new requests',
          },
          {
            label: 'Approved Today',
            value: stats.approvedToday,
            icon: CheckCircle2,
            emptyMain: 'No Approvals',
            emptyCaption: 'Today',
          },
          {
            label: 'Rejected Today',
            value: stats.rejectedToday,
            icon: XCircle,
            emptyMain: 'No Rejections',
            emptyCaption: 'Today',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isEmpty = item.value === 0;
          return (
            <div key={item.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                <Icon style={{ width: '16px', height: '16px', color: C.muted }} />
              </div>
              {isEmpty ? (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.muted, lineHeight: 1.2 }}>{item.emptyMain}</div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: C.muted, opacity: 0.7 }}>{item.emptyCaption}</div>
                </div>
              ) : (
                <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 700, color: C.blue, lineHeight: 1 }}>{item.value}</div>
              )}
            </div>
          );
        })}
      </div>

      <LoanTypeDistributionCard />
    </div>
  );
};

export default EmployeeDashboard;
