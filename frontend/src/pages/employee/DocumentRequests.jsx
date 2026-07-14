import React, { useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useApplications, useManagerDecision } from '../../hooks/useLoans';
import { Send, Clock, CheckCircle, AlertCircle, Search, Plus, X, Zap, Inbox } from 'lucide-react';
import { LoadingPage } from '../../components/ui/Primitives';

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, sans-serif' },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' },
  pageTitle: { fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0 },
  pageSubtitle: { fontSize: '13px', color: '#6B7280', margin: '4px 0 0' },
  card: { background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' },
};

const STATUS_STYLE = {
  Sent: { bg: '#FFFBEB', color: '#D97706', border: '#FEF3C7', icon: Clock },
  Received: { bg: '#F0FDF4', color: '#16A34A', border: '#DCFCE7', icon: CheckCircle },
  Overdue: { bg: '#FFF5F5', color: '#DC2626', border: '#FEE2E2', icon: AlertCircle },
};

const StatusBadge = ({ status }) => {
  const style = STATUS_STYLE[status] || STATUS_STYLE.Sent;
  const Icon = style.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
      <Icon style={{ width: '12px', height: '12px' }} />
      {status}
    </span>
  );
};

const NewRequestModal = ({ prefill, onClose, onSend, submitting }) => {
  const [appId, setAppId] = useState(prefill?.appId || '');
  const [applicant, setApplicant] = useState(prefill?.applicant || '');
  const [docType, setDocType] = useState(prefill?.docType || '');
  const [reason, setReason] = useState(prefill?.reason || '');

  const handleSend = () => {
    if (!appId || !docType || !reason) return;
    onSend({ appId, applicant, docType, reason });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.3)', zIndex: 49 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '480px', background: 'white', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>New Document Request</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Posts a live manager decision using the current backend</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}><X style={{ width: '16px', height: '16px', color: '#6B7280' }} /></button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Application ID *</label>
            <input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="e.g. LD-..." style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', outline: 'none', color: '#111827' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Applicant Name</label>
            <input value={applicant} onChange={(e) => setApplicant(e.target.value)} placeholder="Applicant full name" style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', outline: 'none', color: '#111827' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Document Required *</label>
            <input value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. Bank Statement (6 months)" style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', outline: 'none', color: '#111827' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Reason / Instructions *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain what is missing and what the applicant needs to provide..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: '#111827' }} />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '8px', justifyContent: 'flex-end', background: '#F9FAFB' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Cancel</button>
          <button disabled={submitting} onClick={handleSend} style={{ padding: '8px 16px', borderRadius: '6px', background: submitting ? '#93c5fd' : '#1E3A8A', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Send style={{ width: '13px', height: '13px' }} /> Send Request
          </button>
        </div>
      </div>
    </>
  );
};

const DocumentRequests = () => {
  const { user } = useAuth();
  const { data: apps = [], isLoading } = useApplications();
  const requestMutation = useManagerDecision();
  const [search, setSearch] = useState('');
  const [filterStatus, setStatus] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const requests = useMemo(
    () => apps
      .filter((app) => ['Additional Documents Required', 'Verification Queue', 'Credit Queue', 'Approvals Queue'].includes(app.status) || app.reviews?.manager?.decision === 'Need Documents')
      .map((app) => ({
        id: `REQ-${app.id}`,
        appId: app.id,
        applicant: app.applicantDetails?.fullName || 'Unknown',
        docType: app.reviews?.manager?.remarks?.split(':')[0] || 'Additional Documents',
        reason: app.reviews?.manager?.remarks || app.reviews?.verification?.remarks || 'Live document request recorded in the application flow.',
        sentAt: app.reviews?.manager?.decidedAt || app.updatedAt || app.submittedAt || new Date().toISOString(),
        dueBy: app.updatedAt || app.submittedAt || new Date().toISOString(),
        status: ['Approved', 'Rejected'].includes(app.status) ? 'Received' : 'Sent',
        channel: 'In-App',
      })),
    [apps]
  );

  const filtered = requests.filter((r) => {
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || r.id.toLowerCase().includes(q) || r.applicant.toLowerCase().includes(q) || r.appId.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleTemplateClick = (tpl) => {
    setPrefill({ docType: tpl.docType, reason: tpl.reason });
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setPrefill(null);
    setModalOpen(true);
  };

  const handleSend = async ({ appId, applicant, docType, reason }) => {
    await requestMutation.mutateAsync({
      id: appId,
      decisionData: {
        managerId: user?.id,
        managerName: user?.fullName,
        decision: 'need_documents',
        remarks: `${docType}: ${reason}`,
      },
    });
    setModalOpen(false);
    setPrefill(null);
  };

  if (isLoading) return <LoadingPage message="Loading document requests..." />;

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Document Requests</h1>
          <p style={S.pageSubtitle}>Live document request log created through manager decisions.</p>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', background: '#1E3A8A', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }} onClick={handleOpenNew}>
          <Plus style={{ width: '14px', height: '14px' }} />
          New Request
        </button>
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Zap style={{ width: '14px', height: '14px', color: '#1E3A8A' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Quick-Send Templates</span>
          </div>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>Templates prefill the request form</span>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { id: 'tpl-1', label: 'Missing Aadhaar', docType: 'Aadhaar Card (Front & Back)', reason: 'Aadhaar card not found in the application. Please upload a clear scan of the front and back.' },
            { id: 'tpl-2', label: 'Missing PAN', docType: 'PAN Card', reason: 'PAN card copy not uploaded. Please provide a clear scan of your PAN card.' },
            { id: 'tpl-3', label: 'Missing Salary Slip', docType: 'Salary Slip (Last 3 Months)', reason: 'Salary slip for the last 3 months is missing from the submission.' },
          ].map((tpl) => (
            <button key={tpl.id} onClick={() => handleTemplateClick(tpl)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', background: 'white', border: '1px solid #E5E7EB', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Awaiting Response', value: filtered.filter((r) => r.status === 'Sent').length, color: '#D97706' },
          { label: 'Documents Received', value: filtered.filter((r) => r.status === 'Received').length, color: '#16A34A' },
          { label: 'Overdue Requests', value: filtered.filter((r) => r.status === 'Overdue').length, color: '#DC2626' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color, marginTop: '6px', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Clarification Request Log</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#9CA3AF' }} />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '28px', paddingRight: '10px', height: '32px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', background: 'white', width: '180px', outline: 'none', color: '#111827' }} />
            </div>
            <select value={filterStatus} onChange={(e) => setStatus(e.target.value)} style={{ height: '32px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', padding: '0 8px', background: 'white', cursor: 'pointer', outline: 'none', color: '#374151' }}>
              {['All', 'Sent', 'Received', 'Overdue'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.4fr 2fr 0.9fr 0.9fr 0.9fr', padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <div>Request ID</div><div>Application</div><div>Applicant</div><div>Document Required</div><div>Sent</div><div>Due</div><div>Status</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
            <Inbox style={{ width: '32px', height: '32px', color: '#D1D5DB', margin: '0 auto 12px' }} />
            No requests match your filter.
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.4fr 2fr 0.9fr 0.9fr 0.9fr', padding: '14px 16px', borderBottom: '1px solid #E5E7EB', alignItems: 'start', fontSize: '13px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#111827' }}>{r.id}</div>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>{r.appId}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>via {r.channel}</div>
              </div>
              <div style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>{r.applicant}</div>
              <div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>{r.docType}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', lineHeight: 1.4 }}>{r.reason}</div>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{new Date(r.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
              <div style={{ fontSize: '12px', color: r.status === 'Overdue' ? '#DC2626' : '#6B7280', fontWeight: r.status === 'Overdue' ? 600 : 400 }}>
                {new Date(r.dueBy).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </div>
              <div><StatusBadge status={r.status} /></div>
            </div>
          ))
        )}
      </div>

      {modalOpen && <NewRequestModal prefill={prefill} onClose={() => { setModalOpen(false); setPrefill(null); }} onSend={handleSend} submitting={requestMutation.isPending} />}
    </div>
  );
};

export default DocumentRequests;
