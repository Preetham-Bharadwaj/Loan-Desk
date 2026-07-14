import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplications } from '../../hooks/useLoans';
import { Badge, LoadingPage } from '../../components/ui/Primitives';
import { Search, Filter, ArrowUpDown, ChevronRight, ChevronLeft } from 'lucide-react';

const C = {
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

const STATUS_OPTIONS = ['All Statuses', 'In Review', 'On Hold', 'Approved', 'Rejected'];

// Maps each filter label to the backend status values returned by the API
const STATUS_FILTER_MAP = {
  'In Review': ['In Review', 'Submitted', 'Verification Queue', 'Verification In Progress', 'Credit Queue', 'Credit In Progress', 'Approvals Queue', 'Credit Assessment', 'Manager Review'],
  'On Hold':   ['On Hold', 'Document Requested', 'Additional Documents Required'],
  'Approved':  ['Approved'],
  'Rejected':  ['Rejected'],
};
const SORT_OPTIONS = ['Newest', 'Oldest', 'Amount High to Low', 'Amount Low to High'];

const Queue = () => {
  const navigate = useNavigate();
  const { data: apps = [], isLoading } = useApplications();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Statuses');
  const [sort, setSort] = useState('Newest');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const rows = useMemo(() => {
    let list = [...apps];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((app) =>
        [app.id, app.applicantDetails?.fullName, app.loanType, app.status, app.reviews?.verification?.officerName, app.reviews?.credit?.officerName, app.reviews?.manager?.managerName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (status !== 'All Statuses') {
      const allowed = STATUS_FILTER_MAP[status] || [status];
      list = list.filter((app) => allowed.includes(app.status));
    }

    list.sort((a, b) => {
      const aTime = new Date(a.submittedAt || a.timeline?.[0]?.timestamp || 0).getTime();
      const bTime = new Date(b.submittedAt || b.timeline?.[0]?.timestamp || 0).getTime();
      if (sort === 'Oldest') return aTime - bTime;
      if (sort === 'Amount High to Low') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sort === 'Amount Low to High') return Number(a.amount || 0) - Number(b.amount || 0);
      return bTime - aTime;
    });

    return list;
  }, [apps, search, status, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (isLoading) return <LoadingPage message="Loading applications..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: 'Inter, sans-serif' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: C.text }}>Applications</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.muted }}>Live queue with search, sorting, filtering, and pagination.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '12px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.muted }} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search applications" style={{ width: '100%', height: '36px', paddingLeft: '32px', paddingRight: '12px', borderRadius: '6px', border: `1px solid ${C.border}`, background: '#F9FAFB', color: C.text, outline: 'none', fontSize: '13px' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <Filter style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.muted }} />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ height: '36px', minWidth: '220px', paddingLeft: '32px', paddingRight: '10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.white, color: C.text, outline: 'none', fontSize: '13px' }}>
            {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div style={{ position: 'relative' }}>
          <ArrowUpDown style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.muted }} />
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} style={{ height: '36px', minWidth: '190px', paddingLeft: '32px', paddingRight: '10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.white, color: C.text, outline: 'none', fontSize: '13px' }}>
            {SORT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <section style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                {['Application ID', 'Applicant', 'Loan Type', 'Requested Amount', 'Submitted Date', 'Status', 'Assigned Officer', 'Action'].map((head) => (
                  <th key={head} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>
                    No applications found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((app) => (
                  <tr key={app.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: C.text }}>{app.id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{app.applicantDetails?.fullName || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub }}>{app.loanType || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub }}>INR {Number(app.amount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub }}>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td style={{ padding: '12px 16px' }}><Badge status={app.status} /></td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub }}>{app.reviews?.verification?.officerName || app.reviews?.credit?.officerName || app.reviews?.manager?.managerName || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button type="button" onClick={() => navigate(`/employee/application/${app.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '6px', border: `1px solid ${C.blueLine}`, background: C.blueSoft, color: C.blue, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        View Application
                        <ChevronRight style={{ width: '14px', height: '14px' }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: '#FAFAFA', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: C.muted }}>
            Showing {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, rows.length)} of {rows.length}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '7px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'white', color: C.sub, cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.5 : 1 }}>
              <ChevronLeft style={{ width: '14px', height: '14px' }} />
              Prev
            </button>
            <span style={{ fontSize: '12px', color: C.muted }}>Page {safePage} of {totalPages}</span>
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '7px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'white', color: C.sub, cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.5 : 1 }}>
              Next
              <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Queue;
