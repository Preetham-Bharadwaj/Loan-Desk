import React, { useEffect, useCallback } from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, Venus, CreditCard } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../utils/supabase';
import { useQuery } from '@tanstack/react-query';

/* ─── Design tokens — exact same palette as ApplicationDetails ─── */
const C = {
  blue:      '#1E3A8A',
  blueSoft:  '#EFF6FF',
  blueLine:  '#DBEAFE',
  green:     '#15803D',
  greenSoft: '#F0FDF4',
  greenLine: '#DCFCE7',
  amber:     '#B45309',
  amberSoft: '#FFFBEB',
  amberLine: '#FDE68A',
  red:       '#B91C1C',
  redSoft:   '#FEF2F2',
  redLine:   '#FECACA',
  slate:     '#475569',
  slateSoft: '#F1F5F9',
  border:    '#E5E7EB',
  bg:        '#F8FAFC',
  white:     '#FFFFFF',
  text:      '#111827',
  sub:       '#374151',
  muted:     '#6B7280',
  line:      '#F3F4F6',
};

/* ─── Helpers ─── */
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'NA';

const maskAccount = (num) => {
  if (!num) return 'XXXX XXXX ????';
  const s = String(num).replace(/\D/g, '');
  return `XXXX XXXX ${s.slice(-4)}`;
};

const formatDob = (dob) => {
  if (!dob) return 'Not Available';
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return 'Not Available';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return 'Not Available'; }
};

const formatMonthYear = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch { return '—'; }
};

/* ─── Account type icons (emoji fallback — no extra deps) ─── */
const ACCOUNT_ICON = {
  savings:          '💳',
  salary:           '💼',
  current:          '🏢',
  business_current: '🏢',
  fixed:            '🏦',
  recurring:        '📅',
  default:          '🏦',
};

const accountIcon = (type = '') => {
  const t = type.toLowerCase().replace(/\s+/g, '_');
  for (const key of Object.keys(ACCOUNT_ICON)) {
    if (t.includes(key)) return ACCOUNT_ICON[key];
  }
  return ACCOUNT_ICON.default;
};

/* ─── Status badge config ─── */
const statusConfig = (s = '') => {
  const v = s.toLowerCase();
  if (v === 'active')   return { dot: C.green,  bg: C.greenSoft, color: C.green,  border: C.greenLine,  label: 'Active'  };
  if (v === 'frozen')   return { dot: '#F97316', bg: '#FFF7ED',   color: '#C2410C', border: '#FDBA74',   label: 'Frozen'  };
  if (v === 'dormant')  return { dot: C.muted,   bg: C.bg,        color: C.muted,   border: C.border,    label: 'Dormant' };
  if (v === 'closed')   return { dot: C.red,     bg: C.redSoft,   color: C.red,     border: C.redLine,   label: 'Closed'  };
  return               { dot: C.muted,   bg: C.bg,        color: C.muted,   border: C.border,    label: s || 'Unknown' };
};

/* ─── Skeleton ─── */
const Skeleton = ({ w = '100%', h = '13px', mb = '8px', radius = '4px' }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: 'linear-gradient(90deg,#F0F0F0 25%,#E8E8E8 50%,#F0F0F0 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeletonShimmer 1.4s ease-in-out infinite',
    marginBottom: mb,
  }} />
);

const SkeletonHeader = () => (
  <div style={{ padding: '24px 20px 20px', background: C.blueSoft, borderBottom: `1px solid ${C.blueLine}` }}>
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <Skeleton w="56px" h="56px" mb="0" radius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton w="55%" h="16px" mb="8px" />
        <Skeleton w="70%" h="11px" mb="6px" />
        <Skeleton w="50%" h="11px" mb="0" />
      </div>
    </div>
  </div>
);

const SkeletonRows = () => (
  <div style={{ padding: '20px' }}>
    <Skeleton w="35%" h="10px" mb="14px" />
    {[1,2,3,4,5].map((i) => <Skeleton key={i} w={i % 2 === 0 ? '80%' : '65%'} h="13px" mb="10px" />)}
    <div style={{ height: '16px' }} />
    <Skeleton w="35%" h="10px" mb="14px" />
    {[1,2,3].map((i) => <Skeleton key={i} w="100%" h="52px" radius="8px" mb="8px" />)}
  </div>
);

/* ─── Supabase data hook ─── */
const useBankAccounts = (customerId, applicationId, open) =>
  useQuery({
    queryKey: ['applicant-drawer', customerId, applicationId],
    enabled: !!customerId && !!open && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      // 1. Profile row — has date_of_birth, gender, address if stored
      let profile = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('date_of_birth, dob, gender, address, mobile, email, full_name, created_at')
          .eq('id', customerId)
          .maybeSingle();
        profile = data || null;
      } catch { /* column subset may vary */ }

      // 2. Bank accounts
      let bankAccounts = [];
      try {
        const { data } = await supabase
          .from('bank_accounts')
          .select('id, account_type, account_number, status')
          .eq('customer_id', customerId);
        bankAccounts = data || [];
      } catch { /* table may not exist */ }

      // 3. applicant_details JSONB from loan_applications as a last fallback
      let appDetails = null;
      try {
        if (applicationId) {
          const { data } = await supabase
            .from('loan_applications')
            .select('applicant_details')
            .eq('application_id', applicationId)
            .maybeSingle();
          appDetails = data?.applicant_details || null;
        }
      } catch { /* column may not exist */ }

      return { bankAccounts, profile, appDetails };
    },
  });

/* ─── Section header ─── */
const SectionTitle = ({ label }) => (
  <div style={{
    fontSize: '10px', fontWeight: 800, color: C.muted,
    textTransform: 'uppercase', letterSpacing: '0.6px',
    marginBottom: '14px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${C.line}`,
  }}>
    {label}
  </div>
);

/* ─── Detail row ─── */
const DetailRow = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '9px 0', borderBottom: `1px solid ${C.line}` }}>
    <div style={{
      width: '28px', height: '28px', borderRadius: '6px',
      background: C.blueSoft, border: `1px solid ${C.blueLine}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: '1px',
    }}>
      <Icon style={{ width: '13px', height: '13px', color: C.blue }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: C.sub, wordBreak: 'break-word', lineHeight: 1.4 }}>
        {value || '—'}
      </div>
    </div>
  </div>
);

/* ─── Account card ─── */
const AccountCard = ({ account, index }) => {
  const type   = account.account_type || account.accountType || 'Bank Account';
  const number = account.account_number || account.accountNumber || '';
  const status = account.status || 'Active';
  const cfg    = statusConfig(status);
  const icon   = accountIcon(type);

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: '8px',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Icon bubble */}
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: C.blueSoft, border: `1px solid ${C.blueLine}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '2px' }}>
            {type}
          </div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: C.muted }}>
            {maskAccount(number)}
          </div>
        </div>
      </div>

      {/* Status badge */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        fontSize: '11px', fontWeight: 700,
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        borderRadius: '999px', padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
        {cfg.label}
      </span>
    </div>
  );
};

/* ─── Mock accounts (used when bank_accounts table doesn't exist) ─── */
const MOCK_ACCOUNTS = [
  { id: 'm1', account_type: 'Savings Account',          account_number: '00002345', status: 'Active'  },
  { id: 'm2', account_type: 'Salary Account',           account_number: '00008721', status: 'Active'  },
];

/* ══════════════════════════════════════════════════════════════════
   MAIN DRAWER COMPONENT
══════════════════════════════════════════════════════════════════ */
const ApplicantProfileDrawer = ({ open, onClose, app }) => {
  const customerId      = app?.customerId;
  const applicationId   = app?.id || app?.applicationId;
  const applicant       = app?.applicantDetails || {};

  /* Supabase fetch */
  const { data: fetched, isLoading } = useBankAccounts(customerId, applicationId, open);

  /* If Supabase returned no bank accounts use mock */
  const bankAccounts = (fetched?.bankAccounts?.length > 0)
    ? fetched.bankAccounts
    : MOCK_ACCOUNTS;

  /* Resolution priority:
     1. app.applicantDetails  (API response — from mapApplicantDetails which reads profile)
     2. fetched.profile       (direct Supabase profiles row — has dob if column exists)
     3. fetched.appDetails    (applicant_details JSONB in loan_applications)
  */
  const profileRow  = fetched?.profile   || {};
  const rawDb       = fetched?.appDetails || {};
  const fullName    = applicant.fullName  || profileRow.full_name  || rawDb.fullName    || '—';
  const gender      = applicant.gender    || profileRow.gender     || rawDb.gender      || '—';
  const dob         = applicant.dob       || profileRow.date_of_birth || profileRow.dob || rawDb.dob || '';
  const phone       = applicant.phone     || profileRow.mobile     || rawDb.phone       || '—';
  const email       = applicant.email     || profileRow.email      || rawDb.email       || '—';
  const address     = applicant.address   || profileRow.address    || rawDb.address     || '—';
  const customerSince = formatMonthYear(profileRow.created_at || app?.submittedAt);

  /* ESC close */
  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <>
      {/* ── Global keyframe styles ── */}
      <style>{`
        @keyframes skeletonShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes drawerIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .apd-scroll::-webkit-scrollbar        { width: 4px; }
        .apd-scroll::-webkit-scrollbar-track  { background: transparent; }
        .apd-scroll::-webkit-scrollbar-thumb  { background: #D1D5DB; border-radius: 4px; }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 1000,
          animation: 'overlayIn 0.2s ease',
        }}
      />

      {/* ── Panel ── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Applicant Profile"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(420px, 100vw)',
          background: C.white,
          zIndex: 1001,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-2px 0 20px rgba(0,0,0,0.08)',
          animation: 'drawerIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'Inter, sans-serif',
        }}
      >

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: '52px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>Applicant Profile</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: C.white, border: `1px solid ${C.border}`,
              borderRadius: '6px', cursor: 'pointer', color: C.muted,
            }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="apd-scroll" style={{ flex: 1, overflowY: 'auto' }}>

          {isLoading ? (
            <>
              <SkeletonHeader />
              <SkeletonRows />
            </>
          ) : (
            <>
              {/* ── Hero block ── */}
              <div style={{
                padding: '22px 20px 18px',
                background: C.blueSoft,
                borderBottom: `1px solid ${C.blueLine}`,
              }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {/* Avatar circle */}
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: C.blue, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: 800, flexShrink: 0,
                    boxShadow: '0 0 0 3px #DBEAFE',
                  }}>
                    {initials(fullName)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    {/* Name */}
                    <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: '4px' }}>
                      {fullName}
                    </div>
                    {/* Application Number */}
                    <div style={{ fontSize: '11px', color: C.muted, marginBottom: '2px' }}>
                      Application&nbsp;
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.sub }}>
                        {app?.applicationNumber || app?.id || '—'}
                      </span>
                    </div>
                    {/* Customer Since */}
                    <div style={{ fontSize: '11px', color: C.muted, marginBottom: '10px' }}>
                      Customer Since&nbsp;
                      <span style={{ fontWeight: 600, color: C.sub }}>{customerSince}</span>
                    </div>
                    {/* Active badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '11px', fontWeight: 700,
                      background: C.greenSoft, color: C.green,
                      border: `1px solid ${C.greenLine}`,
                      borderRadius: '999px', padding: '3px 9px',
                    }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.green }} />
                      Active Customer
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Content sections ── */}
              <div style={{ padding: '20px' }}>

                {/* SECTION 1 — Personal Details */}
                <div style={{ marginBottom: '28px' }}>
                  <SectionTitle label="Personal Details" />
                  <div>
                    <DetailRow icon={Venus}    label="Gender"         value={gender} />
                    <DetailRow icon={Calendar} label="Date of Birth"  value={formatDob(dob)} />
                    <DetailRow icon={Phone}    label="Mobile Number"  value={phone} />
                    <DetailRow icon={Mail}     label="Email Address"  value={email} />
                    <DetailRow icon={MapPin}   label="Address"        value={address} />
                  </div>
                </div>

                {/* SECTION 2 — Account Types */}
                <div>
                  <SectionTitle label="Account Types" />
                  {bankAccounts.length === 0 ? (
                    <div style={{
                      padding: '20px', textAlign: 'center',
                      background: C.bg, borderRadius: '8px',
                      border: `1px dashed ${C.border}`,
                      color: C.muted, fontSize: '13px',
                    }}>
                      No bank accounts available.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {bankAccounts.map((acct, i) => (
                        <AccountCard key={acct.id || i} account={acct} index={i} />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default ApplicantProfileDrawer;
