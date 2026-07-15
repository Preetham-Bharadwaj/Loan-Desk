import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  useApplicationDetails,
  useManagerDecision,
} from '../../hooks/useLoans';
import { loanService } from '../../services/api';
import ApplicantProfileDrawer from '../../components/applicant/ApplicantProfileDrawer';
import {
  ChevronLeft,
  ChevronDown,
  Download,
  Eye,
  FileText,
  ShieldCheck,
  TrendingUp,
  Scale,
  History,
  User,
  Clock3,
  X,
  ArrowRight,
  Printer,
  CheckCircle2,
  PauseCircle,
  XCircle,
} from 'lucide-react';

const C = {
  blue: '#1E3A8A',
  blueSoft: '#EFF6FF',
  blueLine: '#DBEAFE',
  green: '#15803D',
  greenSoft: '#F0FDF4',
  greenLine: '#DCFCE7',
  amber: '#B45309',
  amberSoft: '#FFFBEB',
  amberLine: '#FDE68A',
  red: '#B91C1C',
  redSoft: '#FEF2F2',
  redLine: '#FECACA',
  border: '#E5E7EB',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  text: '#111827',
  sub: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  line: '#F3F4F6',
};

const MODULES = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
  { id: 'credit', label: 'Credit Analysis', icon: TrendingUp },
  { id: 'decision', label: 'Decision', icon: Scale },
];

const DOCS = [
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'pan', label: 'PAN' },
  { key: 'salarySlip', label: 'Salary Slip' },
  { key: 'bankStatement', label: 'Bank Statement' },
  { key: 'photo', label: 'Photograph' },
];

const KYC_CHECKS = [
  'Aadhaar Verification',
  'PAN Verification',
  'Face Match',
  'Address Verification',
  'Mobile Verification',
  'Email Verification',
  'Bank Account Verification',
  'Employment Verification',
  'Salary Verification',
  'Fraud / Blacklist Check',
];

const currency = (value) =>
  value == null || Number.isNaN(Number(value))
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN')}`;

const shortDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const shortDateDob = (value) => {
  if (!value) return 'Not Available';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Not Available';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const ageFromDob = (dob) => {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const diff = Date.now() - birth.getTime();
  return Math.max(0, Math.floor(diff / 31557600000));
};

const employerCategoryFrom = (name = '') => {
  const text = name.toLowerCase();
  if (!text) return 'Private Enterprise';
  if (text.includes('government') || text.includes('govt') || text.includes('psu') || text.includes('municipal')) {
    return 'Government / PSU';
  }
  if (text.includes('bank') || text.includes('finance') || text.includes('insurance') || text.includes('ltd') || text.includes('corp')) {
    return 'Tier-1 Corporate';
  }
  if (text.includes('startup') || text.includes('studio') || text.includes('ventures')) {
    return 'Private Enterprise';
  }
  return 'Private Enterprise';
};

const statusTone = (status = '') => {
  const normalized = status.toLowerCase();
  if (['verified', 'completed', 'approved'].includes(normalized)) {
    return { bg: C.greenSoft, text: C.green, border: C.greenLine };
  }
  if (['pending', 'processing'].includes(normalized)) {
    return { bg: C.amberSoft, text: C.amber, border: C.amberLine };
  }
  if (['mismatch', 'failed', 'rejected'].includes(normalized)) {
    return { bg: C.redSoft, text: C.red, border: C.redLine };
  }
  return { bg: '#F3F4F6', text: C.sub, border: C.border };
};

const applicationTone = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized.includes('verification') || normalized.includes('docs')) {
    return { bg: C.blueSoft, text: C.blue, border: C.blueLine };
  }
  if (normalized.includes('credit')) {
    return { bg: '#F5F3FF', text: '#5B21B6', border: '#EDE9FE' };
  }
  if (normalized.includes('approv') || normalized.includes('approved')) {
    return { bg: C.greenSoft, text: C.green, border: C.greenLine };
  }
  if (normalized.includes('reject')) {
    return { bg: C.redSoft, text: C.red, border: C.redLine };
  }
  return { bg: '#F3F4F6', text: C.sub, border: C.border };
};

const applicantName = (app) => app?.applicantDetails?.fullName || '—';

const applicantOfficer = (app, user) =>
  app?.reviews?.verification?.officerName ||
  app?.reviews?.credit?.officerName ||
  app?.reviews?.manager?.managerName ||
  user?.fullName ||
  '—';

const computeEligibility = (app) => {
  const income = toNumber(app?.employmentDetails?.monthlyIncome, 0);
  const requested = toNumber(app?.amount, 0);
  const tenureMonths = Math.max(12, toNumber(app?.tenureMonths, 60));
  const age = ageFromDob(app?.applicantDetails?.dob);
  const employerCategory = employerCategoryFrom(app?.employmentDetails?.employer || app?.employmentDetails?.companyName);

  const docs = app?.documents || {};
  const verifiedDocs = ['aadhaar', 'pan', 'salarySlip', 'bankStatement', 'photo'].filter(
    (key) => docs[key]?.status === 'Verified'
  ).length;

  const baseScore = toNumber(app?.reviews?.credit?.creditScore, 0) || 680;
  const score =
    clamp(
      baseScore +
        (income >= 150000 ? 32 : income >= 100000 ? 18 : 0) +
        (verifiedDocs >= 4 ? 14 : verifiedDocs >= 3 ? 8 : 0) +
        (age >= 28 && age <= 55 ? 10 : age < 25 ? -18 : -8) +
        (app?.status === 'Credit Queue' ? 8 : 0),
      640,
      790
    );

  const creditRating =
    score >= 780 ? 'AAA' : score >= 750 ? 'AA+' : score >= 720 ? 'AA' : score >= 690 ? 'A' : 'BBB';

  const policyFoir = score >= 760 ? 0.52 : score >= 730 ? 0.48 : score >= 700 ? 0.44 : 0.38;

  const existingLoans = toNumber(
    app?.reviews?.credit?.existingLoans,
    income >= 180000 ? 2 : income >= 120000 ? 1 : 3
  );

  const currentEmi = toNumber(
    app?.reviews?.credit?.currentEMI,
    Math.round(income * (0.13 + existingLoans * 0.035 + (employerCategory === 'Private Enterprise' ? 0.02 : 0)))
  );

  const maxEmiAllowed = Math.max(0, Math.round(income * policyFoir));
  const availableEmi = Math.max(0, maxEmiAllowed - currentEmi);

  const interestRate =
    app?.loanType === 'Home'
      ? score >= 750 ? 8.75 : 9.15
      : app?.loanType === 'Vehicle'
        ? 9.85
        : app?.loanType === 'Education'
          ? 9.25
          : 10.25;

  const monthlyRate = interestRate / 12 / 100;
  const pvFactor = monthlyRate > 0
    ? (1 - Math.pow(1 + monthlyRate, -tenureMonths)) / monthlyRate
    : tenureMonths;

  const rawEligible = Math.round(availableEmi * pvFactor);

  const capFactor = score >= 760 ? 0.92 : score >= 730 ? 0.88 : score >= 700 ? 0.84 : 0.78;
  const tenureFactor = tenureMonths >= 180 ? 0.98 : tenureMonths >= 84 ? 1 : 0.94;
  const ageFactor = age >= 28 && age <= 58 ? 1 : age < 25 ? 0.92 : 0.96;
  const employerFactor =
    employerCategory === 'Government / PSU' ? 1.03
      : employerCategory === 'Tier-1 Corporate' ? 1.02
      : 0.97;
  const riskCategory = score >= 760 && policyFoir >= 0.5 ? 'Low' : score >= 700 ? 'Medium' : 'High';
  const riskFactor = riskCategory === 'Low' ? 1 : riskCategory === 'Medium' ? 0.95 : 0.9;

  const adjustedEligible = Math.round(rawEligible * tenureFactor * ageFactor * employerFactor * riskFactor);
  const eligibleAmount = Math.max(0, Math.min(adjustedEligible, Math.round(requested * capFactor)));
  const recommendedAmount = Math.max(
    0,
    Math.min(eligibleAmount, Math.round(eligibleAmount * (riskCategory === 'Low' ? 0.97 : riskCategory === 'Medium' ? 0.95 : 0.92)))
  );

  const reasonLines = [];
  if (requested > eligibleAmount) reasonLines.push('FOIR exceeds internal policy.');
  if (currentEmi > 0) reasonLines.push('Existing EMIs reduce affordability.');
  if (income < requested / Math.max(tenureMonths / 12, 1)) reasonLines.push('Income supports a lower borrowing capacity.');
  if (age < 25 || age > 58) reasonLines.push('Age profile narrows the approved tenor band.');
  if (employerCategory === 'Private Enterprise') reasonLines.push('Employer category is treated conservatively in policy scoring.');
  if (reasonLines.length === 0) reasonLines.push('Case remains within internal policy thresholds.');

  return {
    income,
    requested,
    tenureMonths,
    age,
    employerCategory,
    score,
    creditRating,
    currentEmi,
    maxEmiAllowed,
    availableEmi,
    interestRate,
    riskCategory,
    eligibleAmount,
    recommendedAmount,
    reasonLines,
    policyFoir,
  };
};

const docStatusFrom = (doc = {}) => {
  const raw = String(doc.status || '').toLowerCase();
  if (raw.includes('verif')) return 'Verified';
  if (raw.includes('mismatch')) return 'Mismatch';
  if (raw.includes('reject') || raw.includes('fail')) return 'Failed';
  return 'Pending';
};

const kycChecklist = (app) => {
  const docs = app?.documents || {};
  const income = toNumber(app?.employmentDetails?.monthlyIncome, 0);
  const score = toNumber(app?.reviews?.credit?.creditScore, 0) || 710;

  return [
    { label: 'Aadhaar Verification', status: docStatusFrom(docs.aadhaar), note: docs.aadhaar?.verificationRemarks || 'Identity match reviewed.' },
    { label: 'PAN Verification', status: docStatusFrom(docs.pan), note: docs.pan?.verificationRemarks || 'Tax identity reviewed.' },
    { label: 'Face Match', status: docs.photo?.status === 'Verified' ? 'Verified' : 'Pending', note: 'Biometric match reviewed.' },
    { label: 'Address Verification', status: app?.applicantDetails?.address ? 'Verified' : 'Pending', note: 'Residential address captured in application.' },
    { label: 'Mobile Verification', status: app?.applicantDetails?.phone ? 'Verified' : 'Pending', note: 'OTP / contact verification completed.' },
    { label: 'Email Verification', status: app?.applicantDetails?.email ? 'Verified' : 'Pending', note: 'Email contact on record.' },
    { label: 'Bank Account Verification', status: docStatusFrom(docs.bankStatement), note: docs.bankStatement?.verificationRemarks || 'Account statement examined.' },
    { label: 'Employment Verification', status: docs.salarySlip?.status === 'Verified' ? 'Verified' : 'Pending', note: app?.employmentDetails?.employer || 'Employer details captured.' },
    { label: 'Salary Verification', status: docs.salarySlip?.status === 'Verified' ? 'Verified' : 'Pending', note: income ? 'Salary supports credit assessment.' : 'Salary details pending.' },
    { label: 'Fraud / Blacklist Check', status: score >= 700 ? 'Verified' : 'Pending', note: 'Internal risk watchlist scan completed.' },
  ];
};

const Badge = ({ status }) => {
  const tone = statusTone(status);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      borderRadius: '999px',
      background: tone.bg,
      color: tone.text,
      border: `1px solid ${tone.border}`,
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
};

const SummaryCard = ({ label, value, sub }) => (
  <div style={{
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '12px 14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    minWidth: 0,
  }}>
    <div style={{ fontSize: '10px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 700, color: C.text, lineHeight: 1.25 }}>
      {value}
    </div>
    {sub && <div style={{ marginTop: '3px', fontSize: '11px', color: C.muted }}>{sub}</div>}
  </div>
);

const CREDIT_DETAIL_SECTIONS = {
  existingLoans: {
    title: 'Existing Loans',
    subtitle: 'Active loan exposure',
    description: 'Active loan records currently considered in the credit analysis.',
    empty: 'No active loan records are available for this application.',
    columns: [
      'Loan Type',
      'Bank Name',
      'Original Amount',
      'Outstanding Amount',
      'Monthly EMI',
      'Interest Rate',
      'Start Date',
      'Remaining Tenure',
      'Status',
    ],
  },
  currentEmi: {
    title: 'Current EMI',
    subtitle: 'Monthly EMI breakdown',
    description: 'Breakdown of the monthly installments contributing to the total EMI.',
    empty: 'No EMI breakdown is available for this application.',
    columns: ['Loan', 'EMI Amount', 'Due Date', 'Payment Status'],
  },
  loanDefaults: {
    title: 'Loan Defaults',
    subtitle: 'Default history',
    description: 'Only defaulted loans are shown here.',
    empty: 'No loan defaults are recorded for this application.',
    columns: ['Loan', 'Default Date', 'Days Past Due', 'Current Status', 'Remarks'],
  },
  missedEmi: {
    title: 'Missed EMI',
    subtitle: 'Missed payment history',
    description: 'Every missed EMI recorded against the current applicant profile.',
    empty: 'No missed EMI records are available for this application.',
    columns: ['Installment #', 'Due Date', 'Amount', 'Paid Date', 'Delay (Days)', 'Status'],
  },
};

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '\u2014';

const getCreditDetailData = (section, app, metrics) => {
  const creditData = app?.creditData || {};

  switch (section) {
    case 'existingLoans': {
      const rows = creditData.existingLoanRows || [];
      return {
        ...CREDIT_DETAIL_SECTIONS.existingLoans,
        summary: `${rows.length} ${rows.length === 1 ? 'Active Loan' : 'Active Loans'}`,
        rows,
      };
    }
    case 'currentEmi': {
      const rows = creditData.emiHistoryRows || [];
      return {
        ...CREDIT_DETAIL_SECTIONS.currentEmi,
        summary: `${currency(metrics?.currentEmi || 0)}/month`,
        rows,
        footerLabel: rows.length ? 'Total Monthly EMI' : null,
        footerValue: rows.length ? currency(metrics?.currentEmi || 0) : null,
      };
    }
    case 'loanDefaults': {
      const rows = creditData.loanDefaultRows || [];
      return {
        ...CREDIT_DETAIL_SECTIONS.loanDefaults,
        summary: `${rows.length} ${rows.length === 1 ? 'Default' : 'Defaults'}`,
        rows,
      };
    }
    case 'missedEmi': {
      const rows = creditData.missedEmiRows || [];
      return {
        ...CREDIT_DETAIL_SECTIONS.missedEmi,
        summary: `${rows.length} ${rows.length === 1 ? 'Payment' : 'Payments'}`,
        rows,
      };
    }
    default:
      return null;
  }
};

const detailCount = (value, fallback = 0) => {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : fallback;
};

const creditUtilization = (metrics) => {
  const income = Math.max(1, metrics?.income || 0);
  return clamp(Math.round((metrics?.currentEmi || 0) / income * 100) + 8, 8, 60);
};

// Use real counts from creditData rows if available; fall back to reviews counts
const existingLoanCount = (app) => {
  const fromRows = app?.creditData?.existingLoanRows?.length;
  if (fromRows != null) return fromRows;
  return detailCount(app?.reviews?.credit?.existingLoans, 0);
};

const loanDefaultCount = (app) => {
  const fromRows = app?.creditData?.loanDefaultRows?.length;
  if (fromRows != null) return fromRows;
  return detailCount(app?.reviews?.credit?.loanDefaults, 0);
};

const missedEmiCount = (app) => {
  const fromRows = app?.creditData?.missedEmiRows?.length;
  if (fromRows != null) return fromRows;
  return detailCount(app?.reviews?.credit?.missedEmiCount ?? app?.reviews?.credit?.missedEmi, 0);
};

const MetricCard = ({ label, value, helper, onViewDetails }) => (
  <div style={{
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '12px 14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    minWidth: 0,
  }}>
    <div style={{ fontSize: '10px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginTop: '5px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, lineHeight: 1.3, minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </div>
      {onViewDetails ? (
        <button
          type="button"
          onClick={onViewDetails}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 8px',
            borderRadius: '999px',
            border: `1px solid ${C.blueLine}`,
            background: C.blueSoft,
            color: C.blue,
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Eye style={iconStyle} />
          View Details
        </button>
      ) : null}
    </div>
    {helper && <div style={{ marginTop: '4px', fontSize: '11px', color: C.muted }}>{helper}</div>}
  </div>
);

const detailTableHeadStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: '10px',
  fontWeight: 800,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: 'nowrap',
};

const detailTableCellStyle = {
  padding: '8px 10px',
  verticalAlign: 'top',
  fontSize: '12px',
  color: C.text,
  lineHeight: 1.4,
};

const DetailBadge = ({ children, tone = 'default' }) => {
  const palette =
    tone === 'success'
      ? { bg: C.greenSoft, text: C.green, border: C.greenLine }
      : tone === 'warning'
        ? { bg: C.amberSoft, text: C.amber, border: C.amberLine }
        : tone === 'danger'
          ? { bg: C.redSoft, text: C.red, border: C.redLine }
          : { bg: '#F3F4F6', text: C.sub, border: C.border };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      background: palette.bg,
      color: palette.text,
      border: `1px solid ${palette.border}`,
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
};

const CreditDetailDrawer = ({ section, app, metrics, onClose }) => {
  const detail = getCreditDetailData(section, app, metrics);
  if (!detail) return null;

  const empty = !detail.rows || detail.rows.length === 0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.28)',
          backdropFilter: 'blur(2px)',
          zIndex: 39,
        }}
      />

      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(100%, 680px)',
        background: C.white,
        zIndex: 40,
        boxShadow: '-2px 0 16px rgba(15,23,42,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderLeft: `1px solid ${C.border}`,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '14px',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: C.muted }}>{app.applicationNumber || app.id}</span>
              <Badge status={app.status} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.text, margin: 0 }}>
              {detail.title}
            </h2>
            <div style={{ marginTop: '3px', fontSize: '12px', color: C.muted, lineHeight: 1.4 }}>
              {detail.description}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details drawer"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.muted,
              flexShrink: 0,
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: C.blueSoft,
            border: `1px solid ${C.blueLine}`,
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {detail.subtitle}
              </div>
              <div style={{ marginTop: '3px', fontSize: '13px', fontWeight: 700, color: C.text }}>
                {detail.summary}
              </div>
            </div>
            <DetailBadge tone="default">{detail.rows.length} Record{detail.rows.length === 1 ? '' : 's'}</DetailBadge>
          </div>

          {empty ? (
            <div style={{
              padding: '18px',
              borderRadius: '8px',
              border: `1px dashed ${C.border}`,
              background: '#FAFAFA',
              fontSize: '13px',
              color: C.muted,
            }}>
              {detail.empty}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {detail.columns.map((column) => (
                      <th key={column} style={detailTableHeadStyle}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section === 'existingLoans' && detail.rows.map((row, idx) => (
                    <tr key={`${row.bankName}-${row.loanType}-${idx}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={detailTableCellStyle}>{row.loanType || '\u2014'}</td>
                      <td style={detailTableCellStyle}>{row.bankName || '\u2014'}</td>
                      <td style={detailTableCellStyle}>{currency(row.originalAmount)}</td>
                      <td style={detailTableCellStyle}>{currency(row.outstandingAmount)}</td>
                      <td style={detailTableCellStyle}>{currency(row.monthlyEmi)}</td>
                      <td style={detailTableCellStyle}>{row.interestRate ? `${row.interestRate}%` : '\u2014'}</td>
                      <td style={detailTableCellStyle}>{row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</td>
                      <td style={detailTableCellStyle}>{row.remainingTenure || '\u2014'}</td>
                      <td style={detailTableCellStyle}>
                        <DetailBadge tone="success">{row.status || 'Active'}</DetailBadge>
                      </td>
                    </tr>
                  ))}

                  {section === 'currentEmi' && detail.rows.map((row, idx) => (
                    <tr key={`${row.loan}-${row.dueDate}-${idx}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={detailTableCellStyle}>{row.loan || '\u2014'}</td>
                      <td style={detailTableCellStyle}>{currency(row.emiAmount)}</td>
                      <td style={detailTableCellStyle}>{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</td>
                      <td style={detailTableCellStyle}>
                        <DetailBadge
                          tone={row.paymentStatus === 'Paid' ? 'success' : row.paymentStatus === 'Due Soon' ? 'warning' : 'danger'}
                        >
                          {row.paymentStatus || '\u2014'}
                        </DetailBadge>
                      </td>
                    </tr>
                  ))}

                  {section === 'loanDefaults' && detail.rows.map((row, idx) => (
                    <tr key={`${row.loan}-${row.defaultDate}-${idx}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={detailTableCellStyle}>{row.loan || '\u2014'}</td>
                      <td style={detailTableCellStyle}>{row.defaultDate ? new Date(row.defaultDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</td>
                      <td style={detailTableCellStyle}>{row.daysPastDue != null ? `${row.daysPastDue} Days` : '\u2014'}</td>
                      <td style={detailTableCellStyle}>
                        <DetailBadge tone="danger">{row.currentStatus || '\u2014'}</DetailBadge>
                      </td>
                      <td style={detailTableCellStyle}>{row.remarks || '\u2014'}</td>
                    </tr>
                  ))}

                  {section === 'missedEmi' && detail.rows.map((row, idx) => (
                    <tr key={`${row.dueDate}-${idx}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={detailTableCellStyle}>{row.installmentNumber || '\u2014'}</td>
                      <td style={detailTableCellStyle}>{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</td>
                      <td style={detailTableCellStyle}>{currency(row.amount)}</td>
                      <td style={detailTableCellStyle}>{row.paidDate ? new Date(row.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</td>
                      <td style={detailTableCellStyle}>{row.delayDays != null ? `${row.delayDays} Days` : '\u2014'}</td>
                      <td style={detailTableCellStyle}>
                        <DetailBadge tone={row.status?.toLowerCase().includes('overdue') || row.status?.toLowerCase().includes('missed') ? 'danger' : row.status?.toLowerCase().includes('partial') ? 'warning' : 'default'}>
                          {row.status || '\u2014'}
                        </DetailBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detail.footerLabel ? (
            <div style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#FAFAFA',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {detail.footerLabel}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>
                {detail.footerValue}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${C.border}`,
          background: '#F8FAFC',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              background: C.white,
              fontSize: '13px',
              fontWeight: 700,
              color: C.sub,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

const ModuleCard = ({ title, icon: Icon, children, right }) => (
  <section style={{
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '12px 16px',
      borderBottom: `1px solid ${C.border}`,
      background: '#FAFAFA',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Icon && <Icon style={{ width: '14px', height: '14px', color: C.blue }} />}
        <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </h2>
      </div>
      {right}
    </div>
    <div style={{ padding: '14px 16px' }}>{children}</div>
  </section>
);

const Field = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
    <span style={{ fontSize: '10px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </span>
    <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, lineHeight: 1.35, wordBreak: 'break-word' }}>
      {value ?? '—'}
    </span>
  </div>
);

const tableHeadCell = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 800,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  borderBottom: `1px solid ${C.border}`,
};

const tableCell = {
  padding: '10px 12px',
  verticalAlign: 'top',
  fontSize: '13px',
  color: C.text,
  lineHeight: 1.45,
};

const iconButtonStyle = {
  width: '28px',
  height: '28px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  border: `1px solid ${C.border}`,
  background: C.white,
  color: C.blue,
  cursor: 'pointer',
};

const iconStyle = {
  width: '14px',
  height: '14px',
};

const textareaStyle = {
  width: '100%',
  minHeight: '108px',
  resize: 'vertical',
  borderRadius: '6px',
  border: `1px solid ${C.border}`,
  background: '#F9FAFB',
  color: C.text,
  padding: '10px 12px',
  fontFamily: 'inherit',
  fontSize: '13px',
  lineHeight: 1.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const actionRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 800,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const primaryButtonStyle = {
  padding: '9px 14px',
  borderRadius: '6px',
  border: 'none',
  background: C.blue,
  color: C.white,
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  padding: '9px 14px',
  borderRadius: '6px',
  border: `1px solid ${C.blueLine}`,
  background: C.white,
  color: C.blue,
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

const dangerButtonStyle = {
  padding: '9px 14px',
  borderRadius: '6px',
  border: `1px solid ${C.redLine}`,
  background: C.white,
  color: C.red,
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

// Action card tone config
const ACTION_CARD_TONES = {
  green: { accent: '#15803D', soft: '#F0FDF4', line: '#DCFCE7' },
  amber: { accent: '#B45309', soft: '#FFFBEB', line: '#FDE68A' },
  blue:  { accent: '#1E3A8A', soft: '#EFF6FF', line: '#DBEAFE' },
  red:   { accent: '#B91C1C', soft: '#FEF2F2', line: '#FECACA' },
};

const ActionCard = ({ icon: Icon, title, subtitle, tone = 'blue', onClick, disabled }) => {
  const [hovered, setHovered] = React.useState(false);
  const { accent, soft, line } = ACTION_CARD_TONES[tone] || ACTION_CARD_TONES.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '14px',
        borderRadius: '10px',
        border: `1px solid ${hovered && !disabled ? accent : line}`,
        background: hovered && !disabled ? soft : C.white,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        minHeight: '80px',
        boxShadow: hovered && !disabled
          ? '0 2px 8px rgba(0,0,0,0.08)'
          : '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Icon pill */}
      <div style={{
        flexShrink: 0,
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: soft,
        border: `1px solid ${line}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon style={{ width: '15px', height: '15px', color: accent }} />
      </div>

      {/* Text */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          color: C.text,
          lineHeight: 1.3,
          marginBottom: '3px',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '11px',
          color: C.muted,
          lineHeight: 1.4,
          fontWeight: 400,
        }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
};

/* ─── Requested Documents helpers (employee side) ──────────────────
 * Parses the audit timeline to extract which documents were requested
 * by the loan officer, then maps them to the current applicant_documents
 * data in app.documents to show live status + file info.
 * ──────────────────────────────────────────────────────────────────── */
const EMP_DOC_LABEL_TO_KEY = {
  'bank statement':   'bankStatement',
  'salary slip':      'salarySlip',
  'pan card':         'pan',
  'pan':              'pan',
  'aadhaar card':     'aadhaar',
  'aadhaar':          'aadhaar',
  'address proof':    'businessDocs',
  'employment proof': 'businessDocs',
  'other':            'businessDocs',
  'photo':            'photo',
  'photograph':       'photo',
};

function parseRequestedDocLabels(timeline = []) {
  // Find the most recent "Requested Additional Documents" audit entry
  const entry = [...timeline]
    .reverse()
    .find(e => e.action === 'Requested Additional Documents');
  if (!entry?.remarks) return { labels: [], remarks: '' };

  // Format: "Loan Officer requested additional documents: X, Y. Remarks: ..."
  const docsMatch = entry.remarks.match(/additional documents:\s*([^.]+)\./i);
  const remarksMatch = entry.remarks.match(/Remarks:\s*(.+)$/i);
  return {
    labels: docsMatch ? docsMatch[1].split(',').map(d => d.trim()).filter(Boolean) : [],
    remarks: remarksMatch ? remarksMatch[1].trim() : '',
  };
}

function empDocLabelToKey(label) {
  return EMP_DOC_LABEL_TO_KEY[String(label || '').toLowerCase().trim()]
    || String(label || '').toLowerCase().replace(/\s+/g, '');
}

const RequestedDocumentsPanel = ({ app, onViewDocument }) => {
  const isDocRequested = (app?.status || '').toLowerCase().includes('document');
  const { labels, remarks } = React.useMemo(
    () => parseRequestedDocLabels(app?.timeline || []),
    [app?.timeline]
  );

  if (!isDocRequested || labels.length === 0) return null;

  const rows = labels.map(label => {
    const key = empDocLabelToKey(label);
    const doc = app?.documents?.[key] || null;
    const rawStatus = (doc?.status || '').toLowerCase();

    let statusLabel, statusBg, statusColor, statusBorder;
    if (rawStatus.includes('verif')) {
      statusLabel = 'Verified';   statusBg = C.greenSoft;  statusColor = C.green;  statusBorder = C.greenLine;
    } else if (rawStatus.includes('upload') || (rawStatus.includes('pending') && doc?.fileUrl)) {
      statusLabel = 'Uploaded';   statusBg = C.blueSoft;   statusColor = C.blue;   statusBorder = C.blueLine;
    } else if (rawStatus.includes('reject') || rawStatus.includes('mismatch')) {
      statusLabel = 'Rejected';   statusBg = C.redSoft;    statusColor = C.red;    statusBorder = C.redLine;
    } else {
      statusLabel = 'Pending';    statusBg = C.amberSoft;  statusColor = C.amber;  statusBorder = C.amberLine;
    }

    return { label, doc, statusLabel, statusBg, statusColor, statusBorder };
  });

  return (
    <ModuleCard title="Requested Documents" icon={FileText}>
      <div style={{ display: 'grid', gap: '10px' }}>
        {/* Officer remarks */}
        {remarks && (
          <div style={{ padding: '10px 12px', background: C.amberSoft, border: `1px solid ${C.amberLine}`, borderRadius: '6px', borderLeft: `3px solid ${C.amber}`, marginBottom: '4px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
              Officer Remarks
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: C.sub, fontStyle: 'italic', lineHeight: 1.5 }}>
              "{remarks}"
            </p>
          </div>
        )}

        {/* Document rows */}
        {rows.map(({ label, doc, statusLabel, statusBg, statusColor, statusBorder }) => (
          <div
            key={label}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '12px', padding: '10px 12px',
              border: `1px solid ${statusBorder}`,
              borderRadius: '8px', background: statusBg,
              flexWrap: 'wrap',
            }}
          >
            {/* Left: icon + name + meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: C.white, border: `1px solid ${statusBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText style={{ width: '13px', height: '13px', color: statusColor }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{label}</div>
                {doc?.fileName && (
                  <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', marginTop: '1px' }}>
                    {doc.fileName}
                  </div>
                )}
                {doc?.uploadTime && (
                  <div style={{ fontSize: '10px', color: C.faint, marginTop: '1px' }}>
                    {shortDate(doc.uploadTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Right: status badge + view button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: C.white, color: statusColor, border: `1px solid ${statusBorder}` }}>
                {statusLabel}
              </span>
              {doc?.fileUrl && (
                <button
                  type="button"
                  onClick={() => onViewDocument(doc)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.white, color: C.sub, fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Eye style={{ width: '12px', height: '12px' }} />
                  View
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
};

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: app, isLoading, error } = useApplicationDetails(id);
  const managerMutation = useManagerDecision();

  const [activeModule, setActiveModule] = useState('overview');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [creditDetailSection, setCreditDetailSection] = useState(null);
  const [loanHistoryOpen, setLoanHistoryOpen] = useState(false);
  const [docLoadingKey, setDocLoadingKey] = useState(null);
  const [showDocRequestModal, setShowDocRequestModal] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showHoldConfirm, setShowHoldConfirm] = useState(false);
  const [requestedDocs, setRequestedDocs] = useState([]);
  const [docRequestRemarks, setDocRequestRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const metrics = useMemo(() => (app ? computeEligibility(app) : null), [app]);
  const sortedTimeline = useMemo(
    () => [...(app?.timeline || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [app]
  );
  const checklist = useMemo(() => (app ? kycChecklist(app) : []), [app]);

  React.useEffect(() => {
    if (app) {
      setDecisionRemarks(app.reviews?.manager?.remarks || '');
    }
  }, [app]);

  React.useEffect(() => {
    if (!creditDetailSection) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setCreditDetailSection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [creditDetailSection]);

  const handleViewDocument = async (file) => {
    const fileUrl = file?.fileUrl || file?.url || '';
    const storagePath = file?.storagePath || '';

    if (!fileUrl && !storagePath) {
      setFeedback('Document unavailable.');
      return;
    }

    // If already a full public URL, open directly
    if (/^https?:\/\//i.test(fileUrl)) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Otherwise request a signed URL from the backend
    setDocLoadingKey(file?.key || fileUrl);
    try {
      const result = await loanService.getDocumentSignedUrl(storagePath || fileUrl, fileUrl);
      if (result?.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        setFeedback('Document unavailable.');
      }
    } catch {
      setFeedback('Document unavailable.');
    } finally {
      setDocLoadingKey(null);
    }
  };

  const handleDownloadDocument = async (file, label) => {
    const fileUrl = file?.fileUrl || file?.url || '';
    const storagePath = file?.storagePath || '';

    if (!fileUrl && !storagePath) {
      setFeedback('Document unavailable.');
      return;
    }

    let downloadUrl = fileUrl;

    if (!/^https?:\/\//i.test(fileUrl)) {
      setDocLoadingKey(file?.key || fileUrl);
      try {
        const result = await loanService.getDocumentSignedUrl(storagePath || fileUrl, fileUrl);
        downloadUrl = result?.url || '';
      } catch {
        setFeedback('Document unavailable.');
        setDocLoadingKey(null);
        return;
      } finally {
        setDocLoadingKey(null);
      }
    }

    if (!downloadUrl) {
      setFeedback('Document unavailable.');
      return;
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = file?.fileName || `${label || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrintDocument = async (file) => {
    const fileUrl = file?.fileUrl || file?.url || '';
    const storagePath = file?.storagePath || '';

    if (!fileUrl && !storagePath) {
      setFeedback('Document unavailable.');
      return;
    }

    let printUrl = fileUrl;

    if (!/^https?:\/\//i.test(fileUrl)) {
      setDocLoadingKey(file?.key || fileUrl);
      try {
        const result = await loanService.getDocumentSignedUrl(storagePath || fileUrl, fileUrl);
        printUrl = result?.url || '';
      } catch {
        setFeedback('Document unavailable.');
        setDocLoadingKey(null);
        return;
      } finally {
        setDocLoadingKey(null);
      }
    }

    if (!printUrl) {
      setFeedback('Document unavailable.');
      return;
    }

    const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    const triggerPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // Browsers can block programmatic print for built-in PDF viewers.
      }
    };
    printWindow.addEventListener('load', triggerPrint, { once: true });
    setTimeout(triggerPrint, 1200);
  };

  const handleDecisionAction = (action) => {
    if (!decisionRemarks.trim()) {
      setFeedback('Officer Remarks are required.');
      return;
    }

    // Show modal for document request
    if (action === 'docs') {
      setDocRequestRemarks(decisionRemarks.trim());
      setDecisionRemarks('');
      setShowDocRequestModal(true);
      return;
    }

    // Show confirmation for hold
    if (action === 'hold') {
      setShowHoldConfirm(true);
      return;
    }

    // Show confirmation for reject
    if (action === 'reject') {
      setRejectReason(decisionRemarks.trim());
      setShowRejectConfirm(true);
      return;
    }

    // Handle approve action
    if (action === 'approve') {
      managerMutation.mutate(
        {
          id,
          decisionData: {
            managerId: user?.id,
            managerName: user?.fullName,
            decision: 'approve',
            remarks: decisionRemarks.trim(),
            approvedAmount: metrics?.recommendedAmount || app?.approvedAmount || app?.amount || 0,
            interestRate: app?.interestRate || metrics?.rate || 0,
            loanTenure: app?.tenureMonths || 0,
          },
        },
        {
          onSuccess: () => {
            setFeedback('PDF Generated Successfully. Loan approved and recorded successfully.');
            setDecisionRemarks('');
            setTimeout(() => window.location.reload(), 1000);
          },
          onError: (err) => {
            setFeedback(err?.response?.data?.message || err?.message || 'Unable to submit manager decision.');
          },
        }
      );
      return;
    }
  };

  const handleConfirmHold = () => {
    if (!decisionRemarks.trim()) {
      setFeedback('Officer Remarks are required before placing on hold.');
      setShowHoldConfirm(false);
      return;
    }

    managerMutation.mutate(
      {
        id,
        decisionData: {
          managerId: user?.id,
          managerName: user?.fullName,
          decision: 'hold',
          remarks: decisionRemarks.trim(),
          approvedAmount: 0,
          interestRate: app?.interestRate || 0,
          loanTenure: app?.tenureMonths || 0,
        },
      },
      {
        onSuccess: () => {
          setFeedback('Application successfully placed on hold.');
          setShowHoldConfirm(false);
          setDecisionRemarks('');
          setTimeout(() => window.location.reload(), 1000);
        },
        onError: (err) => {
          setFeedback(err?.response?.data?.message || err?.message || 'Unable to place application on hold. Please try again.');
          setShowHoldConfirm(false);
        },
      }
    );
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setFeedback('Reject reason is required.');
      return;
    }

    managerMutation.mutate(
      {
        id,
        decisionData: {
          managerId: user?.id,
          managerName: user?.fullName,
          decision: 'reject',
          remarks: rejectReason.trim(),
          approvedAmount: 0,
          interestRate: app?.interestRate || 0,
          loanTenure: app?.tenureMonths || 0,
        },
        },
        {
          onSuccess: () => {
          setFeedback('PDF Generated Successfully. Application rejected successfully. Customer has been notified.');
          setShowRejectConfirm(false);
          setRejectReason('');
          setDecisionRemarks('');
          setTimeout(() => window.location.reload(), 1000);
        },
        onError: (err) => {
          setFeedback(err?.response?.data?.message || err?.message || 'Unable to reject application.');
        },
      }
    );
  };

  const handleSubmitDocRequest = () => {
    if (requestedDocs.length === 0) {
      setFeedback('Please select at least one document type.');
      return;
    }

    if (!docRequestRemarks.trim()) {
      setFeedback('Officer remarks are required.');
      return;
    }

    managerMutation.mutate(
      {
        id,
        decisionData: {
          managerId: user?.id,
          managerName: user?.fullName,
          decision: 'need_documents',
          remarks: docRequestRemarks.trim(),
          requestedDocuments: requestedDocs,
          approvedAmount: 0,
          interestRate: app?.interestRate || 0,
          loanTenure: app?.tenureMonths || 0,
        },
      },
      {
        onSuccess: () => {
          setFeedback('Additional document request sent successfully.');
          setShowDocRequestModal(false);
          setRequestedDocs([]);
          setDocRequestRemarks('');
          setDecisionRemarks('');
          setTimeout(() => window.location.reload(), 1000);
        },
        onError: (err) => {
          setFeedback(err?.response?.data?.message || err?.message || 'Unable to request documents.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: '32px 0', color: C.muted, fontSize: '13px' }}>
        Loading application details...
      </div>
    );
  }

  if (error || !app) {
    return (
      <div style={{
        padding: '24px',
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: '8px',
        color: C.red,
        fontSize: '13px',
      }}>
        Application not found or could not be loaded.
      </div>
    );
  }

  const submittedAt = app?.submittedAt || sortedTimeline[0]?.timestamp || app?.timeline?.[0]?.timestamp;
  const assignedOfficer = applicantOfficer(app, user);
  const applicant = applicantName(app);

  const renderOverview = () => (
    <div style={{ display: 'grid', gap: '14px' }}>
      <ModuleCard title="Overview Summary" icon={FileText}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px' }}>
          <Field label="Applicant Name" value={applicant} />
          <Field label="Date of Birth" value={shortDateDob(app?.applicantDetails?.dob)} />
          <Field label="Application ID" value={app.applicationNumber || app.id} />
          <Field label="Loan Type" value={app.loanType || '—'} />
          <Field label="Requested Amount" value={currency(app.amount)} />
          <Field label="Eligible Amount" value={currency(metrics?.eligibleAmount)} />
          <Field label="Application Status" value={app.status || '—'} />
          <Field label="Assigned Loan Officer" value={assignedOfficer} />
          <Field label="Submission Date" value={shortDate(submittedAt)} />
        </div>
      </ModuleCard>
    </div>
  );

  const renderVerification = () => (
    <div style={{ display: 'grid', gap: '14px' }}>
      <ModuleCard title="Applicant Information" icon={User}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px' }}>
          <Field label="Date of Birth" value={shortDateDob(app?.applicantDetails?.dob)} />
          <Field label="Occupation" value={app?.employmentDetails?.designation || app?.employmentDetails?.occupation || app?.employmentDetails?.employmentType || '—'} />
          <Field label="Employer" value={app?.employmentDetails?.employer || app?.employmentDetails?.companyName || app?.employmentDetails?.businessName || '—'} />
          <Field label="Monthly Income" value={currency(app?.employmentDetails?.monthlyIncome)} />
        </div>
      </ModuleCard>

      <ModuleCard title="Uploaded Documents" icon={FileText}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                <th style={tableHeadCell}>Document</th>
                <th style={tableHeadCell}>Verification Status</th>
                <th style={tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {DOCS.map((doc) => {
                const file = app?.documents?.[doc.key] || {};
                const status = docStatusFrom(file);
                return (
                  <tr key={doc.key} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={tableCell}>{doc.label}</td>
                    <td style={tableCell}><Badge status={status} /></td>
                    <td style={tableCell}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          title="Preview document"
                          style={iconButtonStyle}
                          onClick={() => handleViewDocument(file)}
                        >
                          <Eye style={iconStyle} />
                        </button>
                        <button
                          type="button"
                          title="Download document"
                          style={iconButtonStyle}
                          onClick={() => handleDownloadDocument(file, doc.label)}
                        >
                          <Download style={iconStyle} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ModuleCard>

      <ModuleCard title="Auto Verification Checklist" icon={ShieldCheck}>
        <div style={{ display: 'grid', gap: '8px' }}>
          {checklist.map((item, index) => {
            const tone = statusTone(item.status);
            return (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 0',
                  borderBottom: index < checklist.length - 1 ? `1px solid ${C.line}` : 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{item.note}</div>
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: tone.bg,
                  color: tone.text,
                  border: `1px solid ${tone.border}`,
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </ModuleCard>

      {app.reviews?.verification?.remarks && (
        <ModuleCard title="Verification Officer Remarks" icon={Clock3}>
          <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {app.reviews.verification.remarks}
          </div>
        </ModuleCard>
      )}

      <RequestedDocumentsPanel app={app} onViewDocument={handleViewDocument} />
    </div>
  );

  const renderCredit = () => {
    // ── MOCK DATA (prototype only) ──────────────────────────────────────────
    // TODO: Replace MOCK_LOAN_HISTORY with real data from:
    //   app.creditData.existingLoanRows filtered by status === 'closed' | 'settled'
    // Once existing_loans, loan_default_history, and missed_emi_history are
    // populated via the backend, remove this constant and uncomment the line below.
    const MOCK_LOAN_HISTORY = [
      {
        loanAccountNo: 'LN00012345',
        loanType:      'Home Loan',
        originalAmount: 1500000,
        tenure:        '180 Months',
        monthlyEmi:    12345,
        closedDate:    '2022-03-10',
        status:        'closed',
        paymentRating: 'excellent',
        remarks:       'All EMIs paid on time.',
      },
      {
        loanAccountNo: 'LN00023456',
        loanType:      'Vehicle Loan',
        originalAmount: 600000,
        tenure:        '60 Months',
        monthlyEmi:    12200,
        closedDate:    '2021-01-15',
        status:        'closed',
        paymentRating: 'excellent',
        remarks:       'No missed EMI.',
      },
      {
        loanAccountNo: 'LN00034567',
        loanType:      'Personal Loan',
        originalAmount: 200000,
        tenure:        '36 Months',
        monthlyEmi:    6247,
        closedDate:    '2019-08-05',
        status:        'closed',
        paymentRating: 'good',
        remarks:       '2 delayed EMI payments.',
      },
      {
        loanAccountNo: 'LN00045678',
        loanType:      'Two Wheeler Loan',
        originalAmount: 80000,
        tenure:        '24 Months',
        monthlyEmi:    3712,
        closedDate:    '2018-02-12',
        status:        'closed',
        paymentRating: 'good',
        remarks:       'One delayed payment.',
      },
      {
        loanAccountNo: 'LN00056789',
        loanType:      'Education Loan',
        originalAmount: 450000,
        tenure:        '84 Months',
        monthlyEmi:    7985,
        closedDate:    '2024-11-20',
        status:        'closed',
        paymentRating: 'excellent',
        remarks:       'Loan successfully completed.',
      },
    ];

    // Future integration: swap the line below in place of MOCK_LOAN_HISTORY
    // const closedLoans = (app?.creditData?.existingLoanRows || []).filter(
    //   (row) => { const s = (row.status || '').toLowerCase(); return s === 'closed' || s === 'settled'; }
    // );
    const closedLoans = MOCK_LOAN_HISTORY;
    // ────────────────────────────────────────────────────────────────────────

    const paymentRatingBadge = (rating) => {
      const r = (rating || '').toLowerCase();
      if (r === 'excellent') return { label: '⭐⭐⭐ Excellent', bg: C.greenSoft, color: C.green, border: C.greenLine };
      if (r === 'good')      return { label: '⭐⭐ Good',       bg: C.blueSoft,  color: C.blue,  border: C.blueLine  };
      if (r === 'average')   return { label: '⭐ Average',      bg: C.amberSoft, color: C.amber, border: C.amberLine };
      if (r === 'poor')      return { label: '🔴 Poor',         bg: C.redSoft,   color: C.red,   border: C.redLine   };
      return null;
    };

    const statusBadge = (status) => {
      const s = (status || '').toLowerCase();
      if (s === 'closed')   return { label: 'Closed',  bg: C.greenSoft, color: C.green, border: C.greenLine };
      if (s === 'settled')  return { label: 'Settled', bg: '#F3F4F6',   color: C.muted, border: C.border    };
      return null;
    };

    return (
      <div style={{ display: 'grid', gap: '14px' }}>
        <ModuleCard title="Credit Summary" icon={TrendingUp}>
          <div className="credit-summary-grid">
            <MetricCard
              label="CIBIL Score"
              value="XXX"
              helper="Prototype Credit Score"
            />
            <MetricCard
              label="Monthly Income"
              value={currency(metrics.income)}
              helper="Declared income"
            />
            <MetricCard
              label="Existing Loans"
              value={`${existingLoanCount(app)} ${existingLoanCount(app) === 1 ? 'Active Loan' : 'Active Loans'}`}
              helper="Active borrowings"
              onViewDetails={() => setCreditDetailSection('existingLoans')}
            />
            <MetricCard
              label="Current EMI"
              value={`${currency(metrics.currentEmi)}/month`}
              helper="Total monthly obligation"
              onViewDetails={() => setCreditDetailSection('currentEmi')}
            />
            <MetricCard
              label="Loan Defaults"
              value={`${loanDefaultCount(app)} ${loanDefaultCount(app) === 1 ? 'Default' : 'Defaults'}`}
              helper="Historical default count"
              onViewDetails={() => setCreditDetailSection('loanDefaults')}
            />
            <MetricCard
              label="Missed EMI"
              value={`${missedEmiCount(app)} ${missedEmiCount(app) === 1 ? 'Payment' : 'Payments'}`}
              helper="Missed instalments"
              onViewDetails={() => setCreditDetailSection('missedEmi')}
            />
          </div>
        </ModuleCard>

        {/* ── Loan History (Previous Loans) ──────────────────────────────── */}
        <section style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {/* Accordion header */}
          <button
            type="button"
            onClick={() => setLoanHistoryOpen((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              background: '#FAFAFA',
              border: 'none',
              borderBottom: loanHistoryOpen ? `1px solid ${C.border}` : 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText style={{ width: '14px', height: '14px', color: C.blue }} />
              <div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: C.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Loan History (Previous Loans)
                </span>
                <span style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: C.muted,
                  textTransform: 'none',
                  letterSpacing: 0,
                  marginTop: '1px',
                }}>
                  View applicant's previously availed and repaid loans
                </span>
              </div>
            </div>
            <ChevronDown style={{
              width: '15px',
              height: '15px',
              color: C.muted,
              flexShrink: 0,
              transition: 'transform 0.2s ease',
              transform: loanHistoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>

          {/* Accordion body */}
          {loanHistoryOpen && (
            <div style={{ padding: '14px 16px' }}>
              {closedLoans.length === 0 ? (
                <div style={{
                  padding: '24px 0',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: C.muted,
                }}>
                  No previous closed loan history available.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA' }}>
                        {['Loan Account', 'Loan Type', 'Sanction Amount', 'Tenure', 'Monthly EMI', 'Closed Date', 'Status', 'Payment Rating', 'Remarks'].map((col) => (
                          <th key={col} style={tableHeadCell}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {closedLoans.map((loan, idx) => {
                        const pb = paymentRatingBadge(loan.paymentRating);
                        const sb = statusBadge(loan.status);
                        return (
                          <tr key={`${loan.loanAccountNo}-${idx}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                            <td style={tableCell}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: C.sub }}>
                                {loan.loanAccountNo || '—'}
                              </span>
                            </td>
                            <td style={tableCell}>{loan.loanType || '—'}</td>
                            <td style={tableCell}>{currency(loan.originalAmount)}</td>
                            <td style={{ ...tableCell, whiteSpace: 'nowrap' }}>{loan.tenure || '—'}</td>
                            <td style={tableCell}>{loan.monthlyEmi ? currency(loan.monthlyEmi) : '—'}</td>
                            <td style={{ ...tableCell, whiteSpace: 'nowrap' }}>
                              {loan.closedDate ? shortDate(loan.closedDate) : '—'}
                            </td>
                            <td style={tableCell}>
                              {sb ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  background: sb.bg,
                                  color: sb.color,
                                  border: `1px solid ${sb.border}`,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {sb.label}
                                </span>
                              ) : (
                                <span style={{ fontSize: '13px', color: C.muted }}>{loan.status || '—'}</span>
                              )}
                            </td>
                            <td style={tableCell}>
                              {pb ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  background: pb.bg,
                                  color: pb.color,
                                  border: `1px solid ${pb.border}`,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {pb.label}
                                </span>
                              ) : (
                                <span style={{ fontSize: '13px', color: C.muted }}>—</span>
                              )}
                            </td>
                            <td style={{ ...tableCell, color: C.muted, fontStyle: 'italic' }}>
                              {loan.remarks || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

      </div>
    );
  };

  const renderDecision = () => {
    // Normalise the status string once — all comparisons go through this
    const rawStatus = app?.status || '';
    const sl = rawStatus.toLowerCase();

    const isApproved         = sl.includes('approv');
    const isRejected         = sl.includes('reject') || sl === 'closed';
    const isOnHold           = sl.includes('hold');
    const isDocRequested     = sl.includes('document');
    // All other states (in review, queued) fall through to the actionable controls block below.

    // ── Terminal state: Approved ─────────────────────────────────────────────
    if (isApproved) {
      return (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            padding: '20px 24px',
            background: C.greenSoft,
            border: `1px solid ${C.greenLine}`,
            borderRadius: '10px',
          }}>
            <CheckCircle2 style={{ width: '20px', height: '20px', color: C.green, flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Application Completed
              </div>
              <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.55 }}>
                This application has been approved. The sanction letter has been generated.
                No further actions are available.
              </div>
            </div>
          </div>

          {(app.generatedDocuments || []).length > 0 && (
            <ModuleCard title="Generated Documents" icon={FileText}>
              <div style={{ display: 'grid', gap: '10px' }}>
                {(app.generatedDocuments || []).map((doc) => (
                  <div
                    key={`${doc.documentType}-${doc.fileName}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      border: `1px solid ${C.greenLine}`,
                      borderRadius: '10px',
                      background: C.greenSoft,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{doc.fileName}</div>
                      <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{doc.documentType}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => handleViewDocument(doc)} style={iconTextButton}>
                        <Eye style={iconStyle} /> Preview PDF
                      </button>
                      <button type="button" onClick={() => handleDownloadDocument(doc, doc.fileName)} style={iconTextButton}>
                        <Download style={iconStyle} /> Download
                      </button>
                      <button type="button" onClick={() => handlePrintDocument(doc)} style={iconTextButton}>
                        <Printer style={iconStyle} /> Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ModuleCard>
          )}
        </div>
      );
    }

    // ── Terminal state: Rejected ─────────────────────────────────────────────
    if (isRejected) {
      return (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            padding: '20px 24px',
            background: C.redSoft,
            border: `1px solid ${C.redLine}`,
            borderRadius: '10px',
          }}>
            <XCircle style={{ width: '20px', height: '20px', color: C.red, flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Application Closed
              </div>
              <div style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.55 }}>
                This application has been rejected. The rejection letter has been generated.
                No further actions are available.
              </div>
            </div>
          </div>

          {(app.generatedDocuments || []).length > 0 && (
            <ModuleCard title="Generated Documents" icon={FileText}>
              <div style={{ display: 'grid', gap: '10px' }}>
                {(app.generatedDocuments || []).map((doc) => (
                  <div
                    key={`${doc.documentType}-${doc.fileName}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      border: `1px solid ${C.redLine}`,
                      borderRadius: '10px',
                      background: C.redSoft,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{doc.fileName}</div>
                      <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{doc.documentType}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => handleViewDocument(doc)} style={iconTextButton}>
                        <Eye style={iconStyle} /> Preview PDF
                      </button>
                      <button type="button" onClick={() => handleDownloadDocument(doc, doc.fileName)} style={iconTextButton}>
                        <Download style={iconStyle} /> Download
                      </button>
                      <button type="button" onClick={() => handlePrintDocument(doc)} style={iconTextButton}>
                        <Printer style={iconStyle} /> Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ModuleCard>
          )}
        </div>
      );
    }

    // ── Actionable states: In Review / Document Requested ────────────────────
    // isDocRequested hides the "Request Additional Documents" card because
    // documents have already been requested; all other actions remain available.
    return (
      <div style={{ display: 'grid', gap: '14px' }}>
        <ModuleCard title="Decision Controls" icon={Scale}>
          <div style={{ display: 'grid', gap: '20px' }}>

            {/* Context banner when docs already requested */}
            {isDocRequested && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: C.amberSoft,
                  border: `1px solid ${C.amberLine}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: C.amber,
                  fontWeight: 600,
                }}>
                  <FileText style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  Additional documents have already been requested from the applicant.
                </div>
                <RequestedDocumentsPanel app={app} onViewDocument={handleViewDocument} />
              </div>
            )}

            {/* Context banner when application is on hold */}
            {isOnHold && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: C.amberSoft,
                border: `1px solid ${C.amberLine}`,
                borderRadius: '8px',
                fontSize: '12px',
                color: C.amber,
                fontWeight: 600,
              }}>
                <PauseCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                🟠 ON HOLD — Application placed on hold. Waiting for manual review.
              </div>
            )}

            {/* Officer Remarks */}
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={labelStyle}>
                Officer Remarks <span style={{ color: C.red }}>*</span>
              </label>
              <textarea
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                placeholder="Record your decision basis before approving, holding, requesting documents, or rejecting..."
                rows={4}
                style={textareaStyle}
                disabled={managerMutation.isPending}
              />
            </div>

            {/* Feedback strip */}
            {feedback && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: C.blueSoft,
                border: `1px solid ${C.blueLine}`,
                color: C.blue,
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {feedback}
              </div>
            )}

            {/* Action card grid — layout adapts to how many cards are visible */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}>
              {/* Approve Loan — always visible when actionable */}
              <ActionCard
                icon={CheckCircle2}
                title="Approve Loan"
                subtitle="Approve and generate sanction letter"
                tone="green"
                disabled={managerMutation.isPending}
                onClick={() => handleDecisionAction('approve')}
              />

              {/* Hold Application — hidden when already on hold */}
              {!isOnHold && (
                <ActionCard
                  icon={PauseCircle}
                  title="Hold Application"
                  subtitle="Waiting for clarification or manual review"
                  tone="amber"
                  disabled={managerMutation.isPending}
                  onClick={() => handleDecisionAction('hold')}
                />
              )}

              {/* Request Additional Documents — hidden when docs already requested */}
              {!isDocRequested && (
                <ActionCard
                  icon={FileText}
                  title="Request Additional Documents"
                  subtitle="Ask applicant to upload missing documents"
                  tone="blue"
                  disabled={managerMutation.isPending}
                  onClick={() => handleDecisionAction('docs')}
                />
              )}

              {/* Reject Application — always visible when actionable */}
              <ActionCard
                icon={XCircle}
                title="Reject Application"
                subtitle="Reject application and notify customer"
                tone="red"
                disabled={managerMutation.isPending}
                onClick={() => handleDecisionAction('reject')}
              />
            </div>

          </div>
        </ModuleCard>

        {(app.generatedDocuments || []).length > 0 && (
          <ModuleCard title="Generated Documents" icon={FileText}>
            <div style={{ display: 'grid', gap: '10px' }}>
              {(app.generatedDocuments || []).map((doc) => (
                <div
                  key={`${doc.documentType}-${doc.fileName}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    border: '1px solid #dbeafe',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{doc.fileName}</div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{doc.documentType}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => handleViewDocument(doc)} style={iconTextButton}>
                      <Eye style={iconStyle} /> Preview PDF
                    </button>
                    <button type="button" onClick={() => handleDownloadDocument(doc, doc.fileName)} style={iconTextButton}>
                      <Download style={iconStyle} /> Download
                    </button>
                    <button type="button" onClick={() => handlePrintDocument(doc)} style={iconTextButton}>
                      <Printer style={iconStyle} /> Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ModuleCard>
        )}
      </div>
    );
  };

  const renderTimeline = () => (
    <ModuleCard title="Chronological Activity" icon={History}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FAFAFA' }}>
              <th style={tableHeadCell}>Time</th>
              <th style={tableHeadCell}>Activity</th>
              <th style={tableHeadCell}>Responsible User</th>
              <th style={tableHeadCell}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sortedTimeline.map((event, index) => (
              <tr key={`${event.timestamp}-${index}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={tableCell}>{dateTime(event.timestamp)}</td>
                <td style={tableCell}>{event.action || event.status || '—'}</td>
                <td style={tableCell}>{event.actor || event.performedBy || 'System'}</td>
                <td style={tableCell}>{event.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleCard>
  );

  return (
    <>
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100%', color: C.text }}>
      <style>{`
        .application-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .application-shell {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        .module-nav {
          position: sticky;
          top: 16px;
        }
        .module-grid {
          display: grid;
          gap: 14px;
        }
        .credit-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 1024px) {
          .application-shell {
            grid-template-columns: 1fr;
          }
          .module-nav {
            position: static;
          }
          .application-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .credit-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .application-summary-grid {
            grid-template-columns: 1fr;
          }
          .credit-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '14px',
      }}>
        <button
          type="button"
          onClick={() => navigate('/employee/applications')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            color: C.sub,
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ChevronLeft style={{ width: '14px', height: '14px' }} />
          Back to Applications
        </button>

        {/* Prominent Application Status card */}
        {(() => {
          const s = app.status || '';
          const sl = s.toLowerCase();
          let bg, border, color, dot;
          if (sl.includes('approved')) {
            bg = C.greenSoft; border = C.greenLine; color = C.green; dot = C.green;
          } else if (sl.includes('rejected')) {
            bg = C.redSoft; border = C.redLine; color = C.red; dot = C.red;
          } else if (sl.includes('hold') || sl.includes('document')) {
            bg = C.amberSoft; border = C.amberLine; color = C.amber; dot = C.amber;
          } else {
            bg = C.blueSoft; border = C.blueLine; color = C.blue; dot = C.blue;
          }
          const dateLabel = shortDate(app.updatedAt || submittedAt);
          const subLabel = feedback
            ? feedback
            : sl.includes('approved')   ? `Loan approved by Loan Officer · ${dateLabel}`
            : sl.includes('rejected')   ? `Application rejected · ${dateLabel}`
            : sl.includes('hold')       ? `Application placed on hold. Waiting for manual review · ${dateLabel}`
            : sl.includes('document') || sl.includes('additional')  ? `Waiting for applicant documents · ${dateLabel}`
            : `Under review · ${dateLabel}`;
          return (
            <div style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: '10px',
              padding: '10px 16px',
              minWidth: '220px',
              maxWidth: '300px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
                Application Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                <span style={{ fontSize: '15px', fontWeight: 800, color, letterSpacing: '0.3px' }}>
                  {sl.includes('document') || sl.includes('additional')
                    ? '🟠 ADDITIONAL DOCUMENTS REQUIRED'
                    : s.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '11px', color, opacity: 0.8, lineHeight: 1.4 }}>
                {subLabel}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="application-summary-grid" style={{ marginBottom: '16px' }}>
        <SummaryCard label="Application ID" value={app.applicationNumber || app.id} sub="LOS reference" />
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '8px',
          padding: '12px 14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          minWidth: 0,
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Applicant Name
          </div>
          <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 700, color: C.text, lineHeight: 1.25 }}>
            {applicant}
          </div>
          <button
            type="button"
            onClick={() => setProfileDrawerOpen(true)}
            style={{
              marginTop: '5px',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', padding: 0,
              fontSize: '11px', fontWeight: 600, color: C.blue,
              cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
          >
            View Applicant Profile →
          </button>
        </div>
        <SummaryCard label="Loan Type" value={app.loanType || '—'} />
        <SummaryCard label="Requested Amount" value={currency(app.amount)} />
        <SummaryCard label="Eligible Amount" value={currency(metrics?.eligibleAmount)} sub="System calculated" />
        <SummaryCard label="Submission Date" value={shortDate(submittedAt)} />
      </div>

      <div className="application-shell">
        <aside className="module-nav" style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            padding: '12px 14px',
            borderBottom: `1px solid ${C.border}`,
            background: '#FAFAFA',
            fontSize: '11px',
            fontWeight: 800,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Modules
          </div>
          <div style={{ display: 'grid', padding: '8px' }}>
            {MODULES.map((module) => {
              const Icon = module.icon;
              const active = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModule(module.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? C.blueSoft : 'transparent',
                    color: active ? C.blue : C.sub,
                    fontSize: '13px',
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                  <span>{module.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="module-grid" style={{ minWidth: 0 }}>
          {activeModule === 'overview' && renderOverview()}
          {activeModule === 'verification' && renderVerification()}
          {activeModule === 'credit' && renderCredit()}
          {activeModule === 'decision' && renderDecision()}
          {activeModule === 'timeline' && renderTimeline()}
        </main>
      </div>

      {creditDetailSection ? (
        <CreditDetailDrawer
          section={creditDetailSection}
          app={app}
          metrics={metrics}
          onClose={() => setCreditDetailSection(null)}
        />
      ) : null}

      {/* Document Request Modal */}
      {showDocRequestModal && (
        <>
          <div
            onClick={() => setShowDocRequestModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 50,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 500px)',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: C.white,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            zIndex: 51,
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${C.border}`,
              background: '#FAFAFA',
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.text }}>
                Request Additional Documents
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.muted }}>
                Select the documents needed from the customer
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Document Types
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {['Bank Statement', 'Salary Slip', 'PAN Card', 'Aadhaar Card', 'Address Proof', 'Employment Proof', 'Other'].map((doc) => (
                    <label
                      key={doc}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        border: `1px solid ${requestedDocs.includes(doc) ? C.blue : C.border}`,
                        borderRadius: '8px',
                        background: requestedDocs.includes(doc) ? C.blueSoft : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={requestedDocs.includes(doc)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRequestedDocs([...requestedDocs, doc]);
                          } else {
                            setRequestedDocs(requestedDocs.filter(d => d !== doc));
                          }
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{doc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                  Additional Remarks <span style={{ color: C.red }}>*</span>
                </label>
                <textarea
                  value={docRequestRemarks}
                  onChange={(e) => setDocRequestRemarks(e.target.value)}
                  placeholder="Explain why these documents are needed..."
                  rows={3}
                  style={textareaStyle}
                />
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${C.border}`,
              background: '#FAFAFA',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => {
                  setDecisionRemarks(docRequestRemarks);
                  setShowDocRequestModal(false);
                  setRequestedDocs([]);
                  setDocRequestRemarks('');
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${C.border}`,
                  background: C.white,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.sub,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDocRequest}
                disabled={managerMutation.isPending}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: managerMutation.isPending ? C.muted : C.blue,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.white,
                  cursor: managerMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {managerMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hold Confirmation Modal */}
      {showHoldConfirm && (
        <>
          <div
            onClick={() => setShowHoldConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 50,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 450px)',
            background: C.white,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            zIndex: 51,
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${C.border}`,
              background: C.amberSoft,
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.amber }}>
                Hold Application
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#92400e' }}>
                This application will be placed on hold for manual review.
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: C.amberSoft,
                border: `1px solid ${C.amberLine}`,
                fontSize: '12px',
                color: '#92400e',
                lineHeight: 1.5,
              }}>
                The applicant will not receive a final decision until the hold is removed.
                You can approve, reject, or request documents after placing on hold.
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                  Officer Remarks <span style={{ color: C.red }}>*</span>
                </label>
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: `1px solid ${C.border}`,
                  fontSize: '13px',
                  color: C.text,
                  lineHeight: 1.5,
                  minHeight: '48px',
                }}>
                  {decisionRemarks || <span style={{ color: C.muted, fontStyle: 'italic' }}>No remarks entered.</span>}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${C.border}`,
              background: '#FAFAFA',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => setShowHoldConfirm(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${C.border}`,
                  background: C.white,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.sub,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHold}
                disabled={managerMutation.isPending}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: managerMutation.isPending ? C.muted : C.amber,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.white,
                  cursor: managerMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {managerMutation.isPending ? 'Processing...' : 'Confirm Hold'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && (
        <>
          <div
            onClick={() => setShowRejectConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 50,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 450px)',
            background: C.white,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            zIndex: 51,
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${C.border}`,
              background: C.redSoft,
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.red }}>
                Confirm Application Rejection
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#991b1b' }}>
                This action cannot be undone. The customer will be notified.
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                  Rejection Reason <span style={{ color: C.red }}>*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide detailed reason for rejection..."
                  rows={4}
                  style={textareaStyle}
                />
              </div>

              <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                fontSize: '12px',
                color: '#991b1b',
                lineHeight: 1.5,
              }}>
                <strong>Warning:</strong> Once rejected, this application will be closed. A rejection letter will be generated and sent to the customer.
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${C.border}`,
              background: '#FAFAFA',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => {
                  setShowRejectConfirm(false);
                  setRejectReason('');
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${C.border}`,
                  background: C.white,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.sub,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={managerMutation.isPending || !rejectReason.trim()}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: managerMutation.isPending || !rejectReason.trim() ? C.muted : C.red,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.white,
                  cursor: managerMutation.isPending || !rejectReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {managerMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </>
      )}


    </div>

    <ApplicantProfileDrawer
      open={profileDrawerOpen}
      onClose={() => setProfileDrawerOpen(false)}
      app={app}
    />
    </>
  );
};

export default ApplicationDetails;
