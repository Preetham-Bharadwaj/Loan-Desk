import React, { useMemo, useState } from 'react';
import { BarChart3, Search, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { useApplications } from '../../hooks/useLoans';
import { LoadingPage } from '../../components/ui/Primitives';

const RISK_STYLE = {
  Low: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', bar: '#22c55e' },
  Medium: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', bar: '#f59e0b' },
  High: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', bar: '#ef4444' },
};

const CibilGauge = ({ score }) => {
  const pct = Math.round(((score - 300) / 600) * 100);
  const color = score >= 750 ? '#22c55e' : score >= 650 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: '14px', color }}>{score || '—'}</div>
      <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '999px', marginTop: '4px', overflow: 'hidden', width: '56px' }}>
        <div style={{ height: '100%', width: `${Math.max(0, pct)}%`, background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
};

const RiskBadge = ({ risk }) => {
  const s = RISK_STYLE[risk] || RISK_STYLE.Medium;
  return (
    <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {risk} Risk
    </span>
  );
};

const RiskReports = () => {
  const { data: apps = [], isLoading } = useApplications();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');

  const liveReports = useMemo(
    () => apps
      .filter((a) => a.reviews?.credit?.riskLevel)
      .map((a) => ({
        id: `RPT-${a.id}`,
        appId: a.id,
        applicant: a.applicantDetails?.fullName || 'Unknown',
        loanType: a.loanType || 'Unknown',
        amount: a.amount,
        cibil: a.reviews.credit.creditScore,
        dti: a.reviews.credit.dtiRatio,
        risk: a.reviews.credit.riskLevel,
        recommendation: a.reviews.credit.remarks?.split('.')[0] || '—',
        analyst: a.reviews.credit.officerName || 'Credit Officer',
        date: a.reviews.credit.assessedAt || a.updatedAt || a.submittedAt || new Date().toISOString(),
      })),
    [apps]
  );

  const filtered = liveReports.filter((r) => {
    const matchRisk = riskFilter === 'All' || r.risk === riskFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || r.id?.toLowerCase().includes(q) || r.applicant?.toLowerCase().includes(q) || r.appId?.toLowerCase().includes(q);
    return matchRisk && matchSearch;
  });

  const lowCount = liveReports.filter((r) => r.risk === 'Low').length;
  const medCount = liveReports.filter((r) => r.risk === 'Medium').length;
  const highCount = liveReports.filter((r) => r.risk === 'High').length;
  const avgCibil = liveReports.length ? Math.round(liveReports.reduce((s, r) => s + (r.cibil || 0), 0) / liveReports.length) : '—';

  if (isLoading) return <LoadingPage message="Loading risk reports..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Credit Risk Reports</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>Live credit assessment registry sourced from Supabase.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Low Risk Files', value: lowCount, icon: CheckCircle, color: '#059669', bg: '#f0fdf4' },
          { label: 'Medium Risk Files', value: medCount, icon: Activity, color: '#d97706', bg: '#fffbeb' },
          { label: 'High Risk Files', value: highCount, icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Avg CIBIL Score', value: avgCibil, icon: BarChart3, color: '#2563eb', bg: '#eff6ff' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: bg, border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon style={{ width: '20px', height: '20px', color, opacity: 0.8, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color, marginTop: '2px', lineHeight: 1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            Risk Assessment Registry - {liveReports.length} entries
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#94a3b8' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ paddingLeft: '28px', paddingRight: '10px', height: '32px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', background: 'white', width: '160px', outline: 'none' }} />
            </div>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={{ height: '32px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', padding: '0 8px', background: 'white', cursor: 'pointer' }}>
              {['All', 'Low', 'Medium', 'High'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1.2fr 0.8fr 1fr 0.7fr 0.7fr 1.2fr 0.9fr', padding: '9px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
          <div>Report ID</div><div>Application</div><div>Applicant</div><div>Loan Type</div><div>Amount</div><div>CIBIL</div><div>DTI</div><div>Recommendation</div><div>Risk</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No reports match your filter.</div>
        ) : filtered.map((r) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1.2fr 0.8fr 1fr 0.7fr 0.7fr 1.2fr 0.9fr', padding: '13px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: '12px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, color: '#0f172a' }}>{r.id}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>{r.appId}</div>
            <div style={{ fontWeight: 600, color: '#334155' }}>{r.applicant}</div>
            <div style={{ color: '#475569' }}>{r.loanType}</div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>INR {Number(r.amount || 0).toLocaleString('en-IN')}</div>
            <CibilGauge score={r.cibil || 0} />
            <div style={{ color: r.dti > 40 ? '#dc2626' : '#64748b', fontWeight: r.dti > 40 ? 700 : 400 }}>{r.dti ? `${r.dti}%` : '—'}</div>
            <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.3 }}>{r.recommendation || '—'}</div>
            <RiskBadge risk={r.risk} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskReports;
