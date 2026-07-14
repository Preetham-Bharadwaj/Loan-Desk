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

const LoanTypeDistributionCard = () => {
  const { data: apps = [], isLoading } = useApplications();

  const { chartData, tableData, totalApplications } = useMemo(() => {
    // Debug: raw response
    console.log('[LoanTypeDistribution] raw apps:', apps);

    const total = apps.length;

    // Group by loanType (camelCase from mapApplicationRow) or loan_type fallback
    const counts = {};
    apps.forEach((app) => {
      // Backend mapApplicationRow sets loanType = application.loan_type (raw lowercase string)
      const raw = app.loanType || app.loan_type || '';
      const key = String(raw).trim().toLowerCase(); // e.g. "personal"
      if (LOAN_TYPES[key]) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    console.log('[LoanTypeDistribution] grouped counts:', counts);

    // Build chart data from the LOAN_TYPES map order, fill = required for Recharts Cell
    const chartData = Object.entries(LOAN_TYPES).map(([key, meta]) => ({
      name: meta.label,
      value: counts[key] || 0,
      fill: meta.color,
    }));

    // Build table data
    const tableData = Object.entries(LOAN_TYPES).map(([key, meta]) => ({
      key,
      label: meta.label,
      color: meta.color,
      count: counts[key] || 0,
      percentage: total > 0 ? Math.round(((counts[key] || 0) / total) * 100) : 0,
    }));

    console.log('[LoanTypeDistribution] chartData:', chartData);
    console.log('[LoanTypeDistribution] tableData:', tableData);

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
                    {row.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{
            marginTop: 'auto',
            paddingTop: '16px',
            textAlign: 'center',
            fontSize: '13px',
            color: C.muted,
          }}>
            Based on <span style={{ fontWeight: 600, color: C.blue }}>{totalApplications}</span> Application{totalApplications !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoanTypeDistributionCard;