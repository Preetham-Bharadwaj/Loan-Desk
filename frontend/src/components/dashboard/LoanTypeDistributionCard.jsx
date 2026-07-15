import React, { useMemo } from 'react';
import { useApplications } from '../../hooks/useLoans';
import { TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const C = {
  white: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  sub: '#4B5563',
  muted: '#6B7280',
  blue: '#1E3A8A',
  blueSoft: '#EFF6FF',
  line: '#F3F4F6',
};

// Keys match exact Supabase enum values (lowercase)
const LOAN_TYPES = {
  personal:  { label: 'Personal',  color: '#2563EB' },
  home:      { label: 'Home',      color: '#10B981' },
  business:  { label: 'Business',  color: '#8B5CF6' },
  vehicle:   { label: 'Vehicle',   color: '#F97316' },
  education: { label: 'Education', color: '#06B6D4' },
};

// ── Demo fallback dataset (prototype only) ───────────────────────────────────
// Used when the backend has fewer than 10 applications.
// Never written to the database — frontend display only.
const DEMO_DISTRIBUTION = {
  personal:  48,
  home:      32,
  business:  21,
  vehicle:   16,
  education: 11,
};
const DEMO_TOTAL = Object.values(DEMO_DISTRIBUTION).reduce((a, b) => a + b, 0); // 128

const LoanTypeDistributionCard = () => {
  const { data: apps = [], isLoading } = useApplications();

  const { chartData, tableData, totalApplications } = useMemo(() => {
    const liveTotal = apps.length;
    const useDemo = liveTotal < 10;

    const counts = useDemo ? DEMO_DISTRIBUTION : (() => {
      const c = {};
      apps.forEach((app) => {
        const key = String(app.loanType || app.loan_type || '').trim().toLowerCase();
        if (LOAN_TYPES[key]) c[key] = (c[key] || 0) + 1;
      });
      return c;
    })();

    const total = useDemo ? DEMO_TOTAL : liveTotal;

    const chartData = Object.entries(LOAN_TYPES).map(([key, meta]) => ({
      name: meta.label,
      value: counts[key] || 0,
      fill: meta.color,
    }));

    const tableData = Object.entries(LOAN_TYPES).map(([key, meta]) => ({
      key,
      label: meta.label,
      color: meta.color,
      count: counts[key] || 0,
      percentage: total > 0 ? parseFloat(((counts[key] || 0) / total * 100).toFixed(1)) : 0,
    }));

    return { chartData, tableData, totalApplications: total };
  }, [apps]);

  if (isLoading) {
    return (
      <section style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: '24px',
        height: '420px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <TrendingUp style={{ width: '18px', height: '18px', color: C.blue }} />
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
            Loan Type Distribution
          </h2>
        </div>
        <div style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '14px' }}>
          Loading data...
        </div>
      </section>
    );
  }

  return (
    <section style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
      padding: '24px',
      height: '420px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
        <TrendingUp style={{ width: '18px', height: '18px', color: C.blue }} />
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
          Loan Type Distribution
        </h2>
      </div>

      {/* Content */}
      <div style={{
        display: 'flex',
        height: 'calc(100% - 50px)',
        gap: '24px',
      }}>
        {/* LEFT: Doughnut Chart (35%) */}
        <div style={{
          width: '35%',
          minWidth: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
              {totalApplications}
            </div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
              Applications
            </div>
          </div>
        </div>

        {/* RIGHT: Summary Table (65%) */}
        <div style={{
          width: '65%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600, color: C.sub, fontSize: '12px' }}>Loan Type</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: C.sub, fontSize: '12px' }}>Applications</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: C.sub, fontSize: '12px' }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.key} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: row.color,
                        flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 500, color: C.text }}>{row.label}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0', fontWeight: 600, color: row.count > 0 ? C.blue : C.muted }}>
                    {row.count}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0', fontWeight: 500, color: C.sub }}>
                    {row.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
        </div>
      </div>
    </section>
  );
};

export default LoanTypeDistributionCard;