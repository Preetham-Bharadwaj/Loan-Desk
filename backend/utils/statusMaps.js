const loanStatusMap = {
  submitted: 'In Review',
  draft: 'In Review',
  documents_uploaded: 'In Review',
  verification_queue: 'In Review',
  verification_in_progress: 'In Review',
  verification_completed: 'In Review',
  credit_queue: 'In Review',
  credit_in_progress: 'In Review',
  credit_completed: 'In Review',
  manager_review: 'In Review',
  approvals_queue: 'In Review',
  additional_documents_required: 'Document Requested',
  on_hold: 'On Hold',
  hold: 'On Hold',
  approved: 'Approved',
  rejected: 'Rejected',
  disbursed: 'Approved',
  closed: 'Rejected',
};

// Valid application_status enum values in the database
const validApplicationStatuses = new Set([
  'draft',
  'submitted',
  'verification_queue',
  'verification_in_progress',
  'verification_completed',
  'credit_queue',
  'credit_in_progress',
  'credit_completed',
  'manager_review',
  'approved',
  'rejected',
  'additional_documents_required',
  'disbursed',
  'closed',
  'on_hold', // added via migration
]);

const reverseLoanStatusMap = Object.fromEntries(
  Object.entries(loanStatusMap).map(([key, value]) => [value.toLowerCase(), key])
);


const verificationStatusMap = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  mismatch: 'Mismatch',
  not_applicable: 'Not Applicable',
};

const decisionStatusMap = {
  approved: 'Approved',
  rejected: 'Rejected',
  needs_documents: 'Needs Documents',
  request_documents: 'Needs Documents',
  escalated: 'Escalated',
  hold: 'On Hold',
  on_hold: 'On Hold',
};

const assessmentStatusMap = {
  pending: 'Pending',
  in_review: 'In Review',
  completed: 'Completed',
  returned: 'Returned',
};

const notificationStatusMap = {
  unread: false,
  read: true,
  archived: true,
};

const employeeDesignationMap = {
  loan_officer: 'Loan Officer',
  loanofficer: 'Loan Officer',
  employee: 'Loan Officer',
  verification_officer: 'Loan Officer',
  credit_officer: 'Loan Officer',
  loan_manager: 'Loan Officer',
  admin: 'Loan Officer',
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function humanize(value) {
  return String(value || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function displayLoanStatus(value) {
  const normalized = normalizeKey(value);
  return loanStatusMap[normalized] || humanize(value);
}

function dbLoanStatus(value) {
  const normalized = normalizeKey(value);
  if (normalized === 'in_review') return 'verification_queue';
  if (normalized === 'document_requested' || normalized === 'additional_documents_required') return 'additional_documents_required';
  if (normalized === 'on_hold' || normalized === 'hold') return 'on_hold';
  if (normalized === 'credit_review') return 'credit_queue';
  if (normalized === 'escalated') return 'manager_review';
  return reverseLoanStatusMap[normalized] || normalized || value;
}

function displayVerificationStatus(value) {
  const normalized = normalizeKey(value);
  return verificationStatusMap[normalized] || humanize(value);
}

function displayDecisionStatus(value) {
  const normalized = normalizeKey(value);
  return decisionStatusMap[normalized] || humanize(value);
}

function displayAssessmentStatus(value) {
  const normalized = normalizeKey(value);
  return assessmentStatusMap[normalized] || humanize(value);
}

function notificationReadFromStatus(value) {
  const normalized = normalizeKey(value);
  return notificationStatusMap[normalized] ?? false;
}

function displayEmployeeDesignation(value) {
  const normalized = normalizeKey(value);
  return employeeDesignationMap[normalized] || humanize(value);
}

function normalizeDocumentKey(value) {
  const normalized = normalizeKey(value);
  const map = {
    aadhaar: 'aadhaar',
    pan: 'pan',
    salary_slip: 'salarySlip',
    salaryslip: 'salarySlip',
    bank_statement: 'bankStatement',
    bankstatement: 'bankStatement',
    photo: 'photo',
    passport_photo: 'photo',
    passportphoto: 'photo',
    business_docs: 'businessDocs',
    businessdocs: 'businessDocs',
    business_registration: 'businessDocs',
    businessregistration: 'businessDocs',
    gst_certificate: 'businessDocs',
    gstcertificate: 'businessDocs',
    other: 'businessDocs',
    property_docs: 'businessDocs',
    vehicle_invoice: 'businessDocs',
    admission_letter: 'businessDocs',
  };
  return map[normalized] || normalized;
}

module.exports = {
  displayLoanStatus,
  dbLoanStatus,
  displayVerificationStatus,
  displayDecisionStatus,
  displayAssessmentStatus,
  notificationReadFromStatus,
  displayEmployeeDesignation,
  normalizeDocumentKey,
  normalizeKey,
  humanize,
};
