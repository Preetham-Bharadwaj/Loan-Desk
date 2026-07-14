import React, { useMemo, useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, RotateCcw, Download } from 'lucide-react';
import { useApplications } from '../../hooks/useLoans';
import { LoadingPage } from '../../components/ui/Primitives';

const STATUS_STYLE = {
  Approved: { bg: '#F0FDF4', color: '#16A34A', border: '#DCFCE7', icon: CheckCircle },
  Rejected: { bg: '#FFF5F5', color: '#DC2626', border: '#FEE2E2', icon: XCircle },
  Escalated: { bg: '#F5F3FF', color: '#7C3AED', border: '#E9D5FF', icon: RotateCcw },
  'Need Documents': { bg: '#FFFBEB', color: '#D97706', border: '#FEF3C7', icon: Clock },
};

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, sans-serif' },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' },
  pageTitle: { fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0 },
  pageSubtitle: { fontSize: '13px', color: '#6B7280', margin: '4px 0 0' },
  card: { background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' },
  tHead: { display: 'grid', gridTemplateColumns: '1fr 1.2fr 0.8fr 1fr 0.7fr 0.7fr 1.2fr 2fr 1fr', padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tRow: { display: 'grid', gridTemplateColumns: '1fr 1.2fr 0.8fr 1fr 0.7fr 0.7fr 1.2fr 2fr 1fr', padding: '14px 16px', borderBottom: '1px solid #E5E7EB', alignItems: 'start', fontSize: '13px' },
};

const DecisionBadge = ({ decision }) => {
  const s = STATUS_STYLE[decision] || STATUS_STYLE['Need Documents'];
  const Icon = s.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      <Icon style={{ width: '12px', height: '12px' }} />
      {decision}
    </span>
  );
};

const DecisionHistory = () => {
  const { data: apps = [], isLoading } = useApplications();
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('All');

  const allDecisions = useMemo(() => {
    return apps
      .filter((a) => a.reviews?.manager?.decision)
      .map((a) => ({
        appId: a.id,
        applicant: a.applicantDetails?.fullName || 'Unknown',
        loanType: a.loanType || 'Unknown',
        amount: a.amount,
        decision: String(a.reviews.manager.decision).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        remarks: a.reviews.manager.remarks || '—',
        decidedAt: a.reviews.manager.decidedAt || a.updatedAt || a.submittedAt || new Date().toISOString(),
        cibil: a.reviews.credit?.creditScore,
        dti: a.reviews.credit?.dtiRatio,
        riskLevel: a.reviews.credit?.riskLevel || 'N/A',
      }));
  }, [apps]);

  const filtered = allDecisions.filter((d) => {
    const matchDec = decisionFilter === 'All' || d.decision === decisionFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || d.appId?.toLowerCase().includes(q) || d.applicant?.toLowerCase().includes(q);
    return matchDec && matchSearch;
  });

  const summaryCards = [
    { label: 'Approved', value: allDecisions.filter((d) => d.decision === 'Approved').length, color: '#16A34A' },
    { label: 'Rejected', value: allDecisions.filter((d) => d.decision === 'Rejected').length, color: '#DC2626' },
    { label: 'Escalated', value: allDecisions.filter((d) => d.decision === 'Escalated').length, color: '#7C3AED' },
    { label: 'Pending Docs', value: allDecisions.filter((d) => d.decision === 'Need Documents').length, color: '#D97706' },
  ].filter((card) => card.value > 0);

  if (isLoading) return <LoadingPage message="Loading decision history..." />;

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Decision Sign-off History</h1>
          <p style={S.pageSubtitle}>Live manager decisions sourced from loan_decisions and audit_logs.</p>
        </div>
        <button type="button" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', background: 'white', border: '1px solid #E5E7EB', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Download style={{ width: '13px', height: '13px' }} />
          Export Report
        </button>
      </div>

      {summaryCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${summaryCards.length}, 1fr)`, gap: '12px' }}>
          {summaryCards.map(({ label, value, color }) => (
            <div key={label} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color, marginTop: '6px', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        <div style={S.cardHead}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            Authorized Decisions - {allDecisions.length} total
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#9CA3AF' }} />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '28px', paddingRight: '10px', height: '32px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', background: 'white', width: '160px', outline: 'none', color: '#111827' }} />
            </div>
            <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)} style={{ height: '32px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', padding: '0 8px', background: 'white', cursor: 'pointer', outline: 'none', color: '#374151' }}>
              {['All', 'Approved', 'Rejected', 'Escalated', 'Need Documents'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={S.tHead}>
          <div>Application</div>
          <div>Applicant</div>
          <div>Type</div>
          <div>Amount</div>
          <div>CIBIL</div>
          <div>DTI</div>
          <div>Risk</div>
          <div>Remarks</div>
          <div>Decision</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>No decisions match your filter.</div>
        ) : filtered.map((d) => (
          <div key={d.appId} style={S.tRow} onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#111827' }}>{d.appId}</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{new Date(d.decidedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
            <div style={{ fontWeight: 600, color: '#374151' }}>{d.applicant}</div>
            <div style={{ color: '#475569' }}>{d.loanType}</div>
            <div style={{ fontWeight: 700, color: '#111827' }}>INR {Number(d.amount || 0).toLocaleString('en-IN')}</div>
            <div style={{ fontWeight: 700, color: d.cibil >= 750 ? '#16A34A' : d.cibil >= 650 ? '#D97706' : '#DC2626' }}>{d.cibil || '—'}</div>
            <div style={{ color: d.dti > 40 ? '#DC2626' : '#6B7280', fontWeight: d.dti > 40 ? 600 : 400 }}>{d.dti ? `${d.dti}%` : '—'}</div>
            <div>{d.riskLevel && d.riskLevel !== 'N/A' ? <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: d.riskLevel === 'Low' ? '#F0FDF4' : d.riskLevel === 'High' ? '#FFF5F5' : '#FFFBEB', color: d.riskLevel === 'Low' ? '#16A34A' : d.riskLevel === 'High' ? '#DC2626' : '#D97706', border: `1px solid ${d.riskLevel === 'Low' ? '#DCFCE7' : d.riskLevel === 'High' ? '#FEE2E2' : '#FEF3C7'}` }}>{d.riskLevel}</span> : <span style={{ color: '#6B7280', fontSize: '12px' }}>N/A</span>}</div>
            <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: 1.4, fontStyle: 'italic' }}>"{d.remarks}"</div>
            <div><DecisionBadge decision={d.decision} /></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecisionHistory;
