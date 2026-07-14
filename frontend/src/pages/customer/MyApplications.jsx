import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useApplications } from '../../hooks/useLoans';
import { loanService } from '../../services/api';
import { Badge, LoadingPage } from '../../components/ui/Primitives';
import {
  FileText, ShieldCheck, Landmark, UserCheck, Download, Info, Activity, Eye, Printer
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────────────── */
const WORKFLOW_STAGES = [
  { key: 'Submitted',   label: 'Submitted' },
  { key: 'In Review',   label: 'In Review' },
  { key: 'On Hold',     label: 'On Hold'   },
  { key: 'Decision',    label: 'Decision'  },
];

// All backend status values → step index in WORKFLOW_STAGES
const STAGE_TO_STEP = {
  'Submitted':                       0,
  'In Review':                       1,
  'Verification Queue':              1,
  'Verification In Progress':        1,
  'Credit Queue':                    1,
  'Credit In Progress':              1,
  'Approvals Queue':                 1,
  'Credit Assessment':               1,
  'Manager Review':                  1,
  'On Hold':                         2,
  'Document Requested':              2,
  'Additional Documents Required':   2,
  'Approved':                        3,
  'Rejected':                        3,
};

const STAGE_TO_DEPT = {
  'Submitted':                       'System — automated intake',
  'In Review':                       'Loan Officer desk',
  'Verification Queue':              'Loan Officer desk',
  'Verification In Progress':        'Loan Officer desk',
  'Credit Queue':                    'Loan Officer desk',
  'Credit In Progress':              'Loan Officer desk',
  'Approvals Queue':                 'Loan Officer desk',
  'Credit Assessment':               'Loan Officer desk',
  'Manager Review':                  'Loan Officer desk',
  'On Hold':                         'Loan Officer desk — awaiting documents',
  'Document Requested':              'Loan Officer desk — awaiting documents',
  'Additional Documents Required':   'Loan Officer desk — awaiting documents',
  'Approved':                        'Disbursement desk',
  'Rejected':                        'Underwriting board',
};

const STATUS_DESCRIPTION = {
  'Submitted':                       'Application received and logged. Under initial review.',
  'In Review':                       'Your application is being reviewed by the Loan Officer.',
  'Verification Queue':              'Your application is being reviewed by the Loan Officer.',
  'Verification In Progress':        'Your application is being reviewed by the Loan Officer.',
  'Credit Queue':                    'Your application is being reviewed by the Loan Officer.',
  'Credit In Progress':              'Your application is being reviewed by the Loan Officer.',
  'Approvals Queue':                 'Your application is being reviewed by the Loan Officer.',
  'Credit Assessment':               'Your application is being reviewed by the Loan Officer.',
  'Manager Review':                  'Your application is being reviewed by the Loan Officer.',
  'On Hold':                         'Action required — the Loan Officer needs additional documents from you.',
  'Document Requested':              'Action required — the Loan Officer needs additional documents from you.',
  'Additional Documents Required':   'Action required — the Loan Officer needs additional documents from you.',
  'Approved':                        'Congratulations! Your loan has been sanctioned. Disbursement in progress.',
  'Rejected':                        'Your application did not meet the current underwriting criteria.',
};

const STAGE_TO_PROGRESS = {
  'Submitted':                       25,
  'In Review':                       50,
  'Verification Queue':              50,
  'Verification In Progress':        50,
  'Credit Queue':                    50,
  'Credit In Progress':              50,
  'Approvals Queue':                 50,
  'Credit Assessment':               50,
  'Manager Review':                  50,
  'On Hold':                         50,
  'Document Requested':              50,
  'Additional Documents Required':   50,
  'Approved':                        100,
  'Rejected':                        100,
};

/* ─── Shared styles ───────────────────────────────────────────────── */
const S = {
  lbl:    { color: '#94a3b8', display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' },
  val:    { fontWeight: 700, color: '#334155', fontSize: '13px' },
  card:   { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' },
  tab:    (active) => ({
    padding: '12px 16px', border: 'none', background: 'none',
    fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
    color: active ? '#2563eb' : '#64748b',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    transition: 'all 0.15s ease', whiteSpace: 'nowrap',
  }),
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
const getExpectedDate = (app) => {
  if (!app) return '—';
  const d = new Date(app.timeline[0]?.timestamp || Date.now());
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTs = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const resolveDocumentUrl = async (doc) => {
  const directUrl = doc?.publicUrl || doc?.fileUrl || doc?.url || '';
  const storagePath = doc?.storagePath || '';

  if (!directUrl && !storagePath) return '';
  if (/^https?:\/\//i.test(directUrl)) return directUrl;

  try {
    const result = await loanService.getDocumentSignedUrl(storagePath || directUrl, directUrl);
    return result?.url || '';
  } catch {
    return directUrl || '';
  }
};

const openPreview = async (doc) => {
  const url = await resolveDocumentUrl(doc);
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const downloadDocument = async (doc, fileName) => {
  const url = await resolveDocumentUrl(doc);
  if (!url) return;

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = fileName || doc?.fileName || 'document.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const printDocument = async (doc) => {
  const url = await resolveDocumentUrl(doc);
  if (!url) return;

  const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!printWindow) return;

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // Ignore print failures from browser PDF viewers.
    }
  };

  printWindow.addEventListener('load', triggerPrint, { once: true });
  setTimeout(triggerPrint, 1200);
};

/* ─── Sub-components ──────────────────────────────────────────────── */
const WorkflowStepper = ({ app }) => {
  const status = app.current_stage || app.status;
  const currentStep = STAGE_TO_STEP[status] ?? 0;
  const pct = STAGE_TO_PROGRESS[status] || 16;
  const isRejected = app.status === 'Rejected';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
          <span style={{ fontWeight: 600, color: '#64748b' }}>Verification Progress</span>
          <span style={{ fontWeight: 700, color: isRejected ? '#dc2626' : '#2563eb' }}>{pct}%</span>
        </div>
        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: isRejected ? '#ef4444' : 'linear-gradient(90deg, #2563eb, #3b82f6)', transition: 'width 0.6s ease', borderRadius: '999px' }} />
        </div>
      </div>

      {/* Stage nodes */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '14px', left: '14px', right: '14px', height: '2px', background: '#e2e8f0' }} />
        <div style={{ position: 'absolute', top: '14px', left: '14px', height: '2px', background: isRejected ? '#ef4444' : '#2563eb', width: `${Math.min(100, (currentStep / (WORKFLOW_STAGES.length - 1)) * 100)}%`, maxWidth: 'calc(100% - 28px)', transition: 'width 0.5s ease' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          {WORKFLOW_STAGES.map((stage, idx) => {
            const done    = idx < currentStep;
            const current = idx === currentStep;
            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', maxWidth: '72px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '11px',
                  background: done ? '#2563eb' : current ? (isRejected ? '#ef4444' : '#0f172a') : 'white',
                  border: `2px solid ${done ? '#2563eb' : current ? (isRejected ? '#ef4444' : '#0f172a') : '#e2e8f0'}`,
                  color: (done || current) ? 'white' : '#94a3b8',
                  transition: 'all 0.3s ease',
                }}>
                  {done ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: '9px', fontWeight: current ? 700 : 500, color: current ? '#0f172a' : '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const OverviewTab = ({ app }) => {
  const status = app.current_stage || app.status;
  const isRejected = app.status === 'Rejected';
  const isApproved = app.status === 'Approved';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Status banner */}
      <div style={{
        display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px 16px', borderRadius: '10px',
        background: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#eff6ff',
        border: `1px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#dbeafe'}`,
      }}>
        <Info style={{ width: '15px', height: '15px', color: isApproved ? '#059669' : isRejected ? '#dc2626' : '#2563eb', flexShrink: 0, marginTop: '1px' }} />
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: isApproved ? '#166534' : isRejected ? '#991b1b' : '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Active Stage Info
          </div>
          <div style={{ fontSize: '13px', color: isApproved ? '#166534' : isRejected ? '#991b1b' : '#1e3a8a', lineHeight: 1.6 }}>
            {STATUS_DESCRIPTION[status] || STATUS_DESCRIPTION['Submitted']}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Application Number', value: app.id, mono: true },
          { label: 'Loan Product',       value: `${app.loanType} Loan` },
          { label: 'Requested Amount',   value: `₹${app.amount.toLocaleString('en-IN')}` },
          { label: 'Loan Tenure',        value: `${app.tenureMonths} Months` },
          { label: 'Applied Date',       value: new Date(app.timeline[0]?.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'Expected Decision',  value: getExpectedDate(app) },
          { label: 'Est. Processing',    value: app.meta?.estimatedProcessing || '?' },
          { label: 'Assigned Branch',    value: app.assignedBranch || '?' },
          { label: 'Assigned Dept.',     value: STAGE_TO_DEPT[status] || '—' },
          { label: 'Current Stage',      value: status, highlight: true },
          { label: 'Loan Purpose',       value: app.purpose || '—' },
          { label: 'Employment Type',    value: app.employmentDetails?.employmentType || '—' },
        ].map(({ label, value, mono, highlight }) => (
          <div key={label} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={S.lbl}>{label}</span>
            <span style={{ ...S.val, fontFamily: mono ? 'monospace' : 'inherit', color: highlight ? '#2563eb' : '#334155', fontSize: mono ? '12px' : '13px' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Workflow stepper */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 20px', fontFamily: 'Outfit, sans-serif', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
          Loan Workflow Progress
        </h4>
        <WorkflowStepper app={app} />
      </div>
    </div>
  );
};

const DocumentsTab = ({ app }) => {
  const docs = Object.entries(app.documents || {}).filter(([, d]) => d?.fileName);

  if (docs.length === 0) return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
      No documents uploaded yet.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Document Checklist — {docs.length} files
      </h4>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 1.1fr 1fr', padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <div>Document</div><div>File Name</div><div>Uploaded</div><div>Status</div><div>Result</div>
        </div>
        {docs.map(([key, doc]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 1.1fr 1fr', padding: '12px 14px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, textTransform: 'capitalize', color: '#334155' }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>{doc.fileName}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{formatTs(doc.uploadTime)}</div>
            <div>
              <Badge status={doc.status === 'Verified' ? 'Approved' : doc.status === 'Processing' ? 'In Review' : 'Submitted'}>
                {doc.status || 'Pending'}
              </Badge>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: doc.status === 'Verified' ? '#059669' : '#d97706' }}>
              {doc.verificationResult || 'Pending validation'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const VerificationTab = ({ app }) => {
  const verif = app.reviews?.verification || {};
  const credit = app.reviews?.credit || {};

  const checks = [
    {
      icon: UserCheck,
      title: 'Identity Verification (KYC)',
      badge: verif.status === 'Completed' ? 'Completed' : 'In Progress',
      badgeOk: verif.status === 'Completed',
      detail: 'Aadhaar verified via UIDAI registry. PAN cross-checked with Income Tax records.',
    },
    {
      icon: Landmark,
      title: 'Financial Verification',
      badge: verif.status === 'Completed' ? 'Completed' : 'In Progress',
      badgeOk: verif.status === 'Completed',
      detail: 'Salary credits, bank statements and declared assets registered.',
    },
    {
      icon: ShieldCheck,
      title: 'Credit Risk Assessment (CIBIL)',
      badge: credit.status === 'Completed' ? `CIBIL: ${credit.creditScore}` : 'Awaiting scoring',
      badgeOk: credit.status === 'Completed',
      detail: credit.status === 'Completed'
        ? `Risk level: ${credit.riskLevel}. DTI ratio: ${credit.dtiRatio}%.`
        : 'CIBIL score and DTI calculation pending.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {checks.map(({ icon: Icon, title, badge, badgeOk, detail }) => (
        <div key={title} style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Icon style={{ width: '15px', height: '15px', color: '#2563eb' }} />
              {title}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px',
              background: badgeOk ? '#f0fdf4' : '#fffbeb',
              color: badgeOk ? '#166534' : '#92400e',
              border: `1px solid ${badgeOk ? '#bbf7d0' : '#fde68a'}`,
            }}>
              {badge}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{detail}</p>
        </div>
      ))}

      {/* Officer remarks */}
      {(verif.remarks || credit.remarks) && (
        <div style={{ borderLeft: '4px solid #2563eb', paddingLeft: '14px', marginTop: '4px' }}>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Loan Officer Remarks
          </span>
          <p style={{ fontStyle: 'italic', color: '#334155', margin: 0, fontSize: '12px', lineHeight: 1.6 }}>
            "{verif.remarks || credit.remarks}"
          </p>
          {(verif.officerName || credit.officerName) && (
            <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              — {verif.officerName || credit.officerName}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const TimelineTab = ({ app }) => (
  <div style={{ position: 'relative', borderLeft: '2px solid #e2e8f0', paddingLeft: '20px', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
    {app.timeline.map((event, idx) => (
      <div key={idx} style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '-27px', top: '3px',
          width: '12px', height: '12px', borderRadius: '50%',
          background: idx === 0 ? '#2563eb' : '#94a3b8',
          border: '2px solid white',
          boxShadow: idx === 0 ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{event.action}</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(event.timestamp).toLocaleString('en-IN')}</span>
        </div>
        {event.actor && (
          <span style={{ display: 'block', fontSize: '10px', color: '#2563eb', fontWeight: 600, marginBottom: '3px' }}>
            by {event.actor}
          </span>
        )}
        {event.remarks && (
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5, fontStyle: 'italic' }}>
            {event.remarks}
          </p>
        )}
      </div>
    ))}
  </div>
);

const DownloadsTab = ({ app }) => {
  const generatedDocs = (app.generatedDocuments || []).filter((d) => d?.fileName);
  const docs = Object.entries(app.documents || {}).filter(([, d]) => d?.fileName);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
        Download your uploaded documents. Verified files are available immediately.
      </p>
      {generatedDocs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Generated Documents
          </div>
          {generatedDocs.map((doc) => (
            <div key={`${doc.documentType}-${doc.fileName}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #dbeafe', borderRadius: '10px', background: '#eff6ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #bfdbfe' }}>
                  <FileText style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {doc.fileName}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                    {doc.documentType}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => openPreview(doc)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid #93c5fd', background: 'white', fontSize: '11px', fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}
                >
                  <Eye style={{ width: '12px', height: '12px' }} />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument(doc, doc.fileName)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', background: 'white', fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                >
                  <Download style={{ width: '12px', height: '12px' }} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => printDocument(doc)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', background: 'white', fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                >
                  <Printer style={{ width: '12px', height: '12px' }} />
                  Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {docs.length === 0 && generatedDocs.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No documents available for this application.
        </div>
      )}
      {docs.map(([key, doc]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText style={{ width: '16px', height: '16px', color: '#2563eb' }} />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{doc.fileName}</span>
            </div>
          </div>
          <button
            onClick={() => openDocument(doc)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '7px', border: '1px solid #cbd5e1', background: 'white', fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
          >
            <Download style={{ width: '12px', height: '12px' }} />
            Download
          </button>
        </div>
      ))}
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',      label: 'Overview',       icon: Info },
  { id: 'verification',  label: 'Verification',   icon: ShieldCheck },
  { id: 'documents',     label: 'Documents',      icon: FileText },
  { id: 'timeline',      label: 'Audit Timeline', icon: Activity },
  { id: 'downloads',     label: 'Downloads',      icon: Download },
];

const MyApplications = () => {
  const { user } = useAuth();
  const { data: applications = [], isLoading } = useApplications({ customerId: user?.id });
  const [selectedId, setSelectedId]  = useState(null);
  const [activeTab, setActiveTab]    = useState('overview');

  if (isLoading) return <LoadingPage message="Loading your loan records…" />;

  const selected = applications.find(a => a.id === selectedId) || applications[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          My Loan Applications
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>
          Full tracking centre — workflow progress, documents, verification status and audit history.
        </p>
      </div>

      {applications.length === 0 ? (
        <div style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '64px 24px', textAlign: 'center' }}>
          <FileText style={{ width: '40px', height: '40px', color: '#cbd5e1', margin: '0 auto 14px' }} />
          <p style={{ fontWeight: 700, color: '#64748b', fontSize: '15px', margin: '0 0 6px' }}>No loan applications found</p>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px' }}>
            You haven't submitted any applications yet.
          </p>
          <button
            onClick={() => window.location.href = '/customer/apply-loan'}
            style={{ padding: '10px 24px', borderRadius: '999px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            Apply For a Loan
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ── Left: Application list ──────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: '80px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', padding: '0 4px' }}>
              Submitted Applications
            </div>
            <div style={S.card}>
              {applications.map(app => {
                const isSelected = app.id === (selectedId || applications[0]?.id);
                return (
                  <div
                    key={app.id}
                    onClick={() => { setSelectedId(app.id); setActiveTab('overview'); }}
                    style={{
                      padding: '14px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'white',
                      borderLeft: `4px solid ${isSelected ? '#2563eb' : 'transparent'}`,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>{app.id}</span>
                      <Badge status={app.status} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{app.loanType} Loan</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '3px 0' }}>
                      ₹{app.amount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      Filed {new Date(app.timeline[0]?.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Detail pane ──────────────────────────────── */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <div style={S.card}>
                {/* Application header strip */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{selected.id}</span>
                      <Badge status={selected.status} />
                    </div>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {selected.loanType} Loan — ₹{selected.amount.toLocaleString('en-IN')}
                    </h2>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {selected.tenureMonths} Months · {selected.purpose}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8' }}>
                    <span style={{ display: 'block' }}>Applied: {new Date(selected.timeline[0]?.timestamp).toLocaleDateString()}</span>
                    <span style={{ display: 'block', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                      Expected: {getExpectedDate(selected)}
                    </span>
                  </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fafafa', padding: '0 16px', overflowX: 'auto' }}>
                  {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={S.tab(activeTab === tab.id)}>
                      <tab.icon style={{ width: '13px', height: '13px', marginRight: '5px', display: 'inline', verticalAlign: 'middle' }} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ padding: '24px' }}>
                  {activeTab === 'overview'     && <OverviewTab      app={selected} />}
                  {activeTab === 'documents'    && <DocumentsTab     app={selected} />}
                  {activeTab === 'verification' && <VerificationTab  app={selected} />}
                  {activeTab === 'timeline'     && <TimelineTab      app={selected} />}
                  {activeTab === 'downloads'    && <DownloadsTab     app={selected} />}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default MyApplications;
