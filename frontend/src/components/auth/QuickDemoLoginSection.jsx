import React, { useEffect, useState } from 'react';
import { loanService } from '../../services/api';

const demoPassword = import.meta.env.VITE_DEMO_SHARED_PASSWORD || '';
const MAX_CUSTOMERS = 4;
const MAX_LOAN_OFFICERS = 3;

const normalizeDemoAccounts = (payload) => {
  const source = payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;

  return {
    customers: Array.isArray(source?.customers) ? source.customers.slice(0, MAX_CUSTOMERS) : [],
    loanOfficers: Array.isArray(source?.loanOfficers) ? source.loanOfficers.slice(0, MAX_LOAN_OFFICERS) : [],
  };
};

const dispatchFillEvent = (account) => {
  const username = String(account?.username || account?.email || '').trim();

  if (!username) return;

  window.dispatchEvent(
    new CustomEvent('loan-desk-demo-account', {
      detail: {
        username,
        password: demoPassword,
      },
    })
  );
};

const QuickDemoLoginSection = () => {
  const [accounts, setAccounts] = useState({ customers: [], loanOfficers: [] });

  useEffect(() => {
    let active = true;

    const loadDemoAccounts = async () => {
      try {
        const response = await loanService.getDemoAccounts();
        if (active) setAccounts(normalizeDemoAccounts(response));
      } catch {
        if (active) setAccounts({ customers: [], loanOfficers: [] });
      }
    };

    loadDemoAccounts();

    return () => {
      active = false;
    };
  }, []);

  const groups = [
    {
      label: 'Customers',
      prefix: 'Customer',
      icon: '👤',
      columns: 2,
      accounts: accounts.customers,
    },
    {
      label: 'Loan Officers',
      prefix: 'Officer',
      icon: '🏦',
      columns: 3,
      accounts: accounts.loanOfficers,
    },
  ].filter((group) => group.accounts.length > 0);

  if (!groups.length) return null;

  return (
    <section
      aria-label="Quick Demo Login"
      style={{
        width: '100%',
        maxWidth: '420px',
        marginTop: '14px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.2px' }}>
        Quick Demo Login
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        {groups.map((group) => (
          <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{group.label}</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(group.columns, group.accounts.length)}, minmax(0, 1fr))`,
                gap: '6px',
              }}
            >
              {group.accounts.map((account, index) => (
                <button
                  key={account?.id || account?.username || account?.email || `${group.prefix}-${index}`}
                  type="button"
                  onClick={() => dispatchFillEvent(account)}
                  style={{
                    minWidth: 0,
                    border: 'none',
                    borderRadius: '7px',
                    padding: '7px clamp(5px, 2vw, 10px)',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: 'clamp(9px, 2.7vw, 11px)',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = '#1d4ed8';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = '#2563eb';
                  }}
                >
                  <span aria-hidden="true" style={{ marginRight: '4px' }}>{group.icon}</span>
                  {group.prefix} {index + 1}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default QuickDemoLoginSection;
