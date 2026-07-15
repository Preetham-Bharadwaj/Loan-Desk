import React, { useMemo, useState } from 'react';
import { useApplications } from '../../hooks/useLoans';
import { LoadingPage } from '../../components/ui/Primitives';
import { Search, Download } from 'lucide-react';

const C = {
  white: '#FFFFFF',
  border: '#E5E7EB',
  line: '#F3F4F6',
  text: '#111827',
  sub: '#4B5563',
  muted: '#6B7280',
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const AuditLogs = () => {
  const { data: applications = [], isLoading } = useApplications();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const events = applications.flatMap((app) =>
      (app.timeline || []).map((event) => ({
        id: `${app.id}-${event.timestamp}-${event.action}`,
        timestamp: event.timestamp,
        date: formatDate(event.timestamp),
        time: formatTime(event.timestamp),
        activity: event.action || event.status || '—',
        actor: event.actor || event.updatedBy || 'System',
        remarks: event.remarks || '—',
        searchText: `${app.applicationNumber || app.id} ${event.action || ''} ${event.status || ''} ${event.actor || ''} ${event.remarks || ''}`.toLowerCase(),
      }))
    );

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (!q) return events;
    return events.filter((event) => event.searchText.includes(q));
  }, [applications, search]);

  const handleExportCsv = () => {
    if (rows.length === 0) return;

    const header = ['Date', 'Time', 'Activity', 'Performed By', 'Remarks'];
    const csvLines = [
      header.join(','),
      ...rows.map((row) => [row.date, row.time, row.activity, row.actor, row.remarks].map(escapeCsv).join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loan-desk-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <LoadingPage message="Loading audit logs..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: 'Inter, sans-serif' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: C.text }}>Audit Logs</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', padding: '12px', background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.muted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by application, activity, actor, or remarks"
            style={{
              width: '100%',
              height: '36px',
              paddingLeft: '32px',
              paddingRight: '12px',
              borderRadius: '6px',
              border: `1px solid ${C.border}`,
              background: '#F9FAFB',
              color: C.text,
              outline: 'none',
              fontSize: '13px',
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${C.border}`,
            background: C.white,
            color: C.sub,
            fontSize: '13px',
            fontWeight: 600,
            cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
            opacity: rows.length === 0 ? 0.5 : 1,
          }}
          disabled={rows.length === 0}
        >
          <Download style={{ width: '14px', height: '14px' }} />
          Export CSV
        </button>
      </div>

      <section style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                {['Date', 'Time', 'Activity', 'Performed By', 'Remarks'].map((head) => (
                  <th
                    key={head}
                    style={{
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: C.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>
                    No audit events found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub }}>{row.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub }}>{row.time}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.text }}>{row.activity}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub }}>{row.actor}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.sub, lineHeight: 1.45 }}>{row.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AuditLogs;
