const { randomUUID } = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const { supabase, supabaseAuth } = require('../config/supabase');
const { buildDecisionPdfDocument, uploadDecisionPdf } = require('./decisionPdfService');
const {
  displayLoanStatus,
  dbLoanStatus,
  displayVerificationStatus,
  displayDecisionStatus,
  displayAssessmentStatus,
  displayEmployeeDesignation,
  normalizeDocumentKey,
  normalizeKey,
} = require('../utils/statusMaps');

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fileNameFromUrl(fileUrl, fallback = 'document.pdf') {
  if (!fileUrl) return fallback;
  const normalized = String(fileUrl).split('?')[0];
  const base = path.basename(normalized);
  return base || fallback;
}

const DOCUMENT_BUCKET = process.env.SUPABASE_DOCUMENT_BUCKET || 'loan-documents';

function isStorageBucketMissing(error) {
  const message = String(error?.message || error?.error || '').toLowerCase();
  return String(error?.statusCode || error?.status || '') === '404' || message.includes('bucket not found');
}

function sanitizeFileName(fileName, fallback = 'document.bin') {
  return String(fileName || fallback)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 120) || fallback;
}

function getFileMeta(fileValue, documentKey) {
  const rawContent = fileValue?.base64 || fileValue?.data || fileValue?.content || fileValue?.buffer;
  const fileName = sanitizeFileName(
    fileValue?.originalname || fileValue?.name || fileValue?.fileName || `${documentKey}.pdf`
  );
  const fileSize = toNumber(fileValue?.size || (Buffer.isBuffer(rawContent) ? rawContent.length : 0), 0);
  const mimeType = fileValue?.mimetype || fileValue?.type || getContentTypeFromName(fileName);

  return { fileName, fileSize, mimeType };
}

function fallbackDocumentUrl(applicationId, documentKey, fileName) {
  return `uploads/${applicationId}/${documentKey}-${Date.now()}-${sanitizeFileName(fileName)}`;
}

function getContentTypeFromName(fileName) {
  const ext = String(fileName || '').toLowerCase().split('.').pop();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function parseDataUri(value) {
  const match = String(value || '').match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  return {
    contentType: match[1] || 'application/octet-stream',
    buffer: Buffer.from(match[2], 'base64'),
  };
}

async function uploadDocumentToStorage(applicationId, documentKey, fileValue) {
  if (!fileValue) return '';
  const { fileName } = getFileMeta(fileValue, documentKey);

  if (typeof fileValue === 'string') {
    if (/^https?:\/\//i.test(fileValue) || fileValue.startsWith('uploads/')) {
      return fileValue;
    }

    const parsed = parseDataUri(fileValue);
    if (!parsed) {
      return fileValue;
    }

    const objectPath = `applications/${applicationId}/${documentKey}-${Date.now()}`;
    const uploadResult = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(objectPath, parsed.buffer, {
        contentType: parsed.contentType,
        upsert: true,
      });

    if (uploadResult.error) {
      if (isStorageBucketMissing(uploadResult.error)) {
        return fallbackDocumentUrl(applicationId, documentKey, fileName);
      }
      throw uploadResult.error;
    }

    const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(uploadResult.data.path);
    return data?.publicUrl || uploadResult.data.path;
  }

  if (Buffer.isBuffer(fileValue)) {
    const objectPath = `applications/${applicationId}/${documentKey}-${Date.now()}`;
    const uploadResult = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(objectPath, fileValue, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadResult.error) {
      if (isStorageBucketMissing(uploadResult.error)) {
        return fallbackDocumentUrl(applicationId, documentKey, fileName);
      }
      throw uploadResult.error;
    }

    const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(uploadResult.data.path);
    return data?.publicUrl || uploadResult.data.path;
  }

  if (typeof fileValue === 'object') {
    const rawContent = fileValue.base64 || fileValue.data || fileValue.content || fileValue.buffer;
    if (!rawContent) {
      return fileValue.url || fileValue.fileUrl || '';
    }

    const content = Buffer.isBuffer(rawContent)
      ? rawContent
      : Buffer.from(String(rawContent).replace(/^data:.*;base64,/, ''), 'base64');

    const objectPath = `applications/${applicationId}/${documentKey}-${Date.now()}-${fileName}`;
    const uploadResult = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(objectPath, content, {
        contentType: fileValue.mimetype || fileValue.type || getContentTypeFromName(fileName),
        upsert: true,
      });

    if (uploadResult.error) {
      if (isStorageBucketMissing(uploadResult.error)) {
        return fallbackDocumentUrl(applicationId, documentKey, fileName);
      }
      throw uploadResult.error;
    }

    const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(uploadResult.data.path);
    return data?.publicUrl || uploadResult.data.path;
  }

  return String(fileValue);
}

function titleFromKey(key) {
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeLoanTypeForDb(value) {
  return normalizeKey(value);
}

function normalizeDocumentTypeForDb(key, loanType = '') {
  const normalized = normalizeKey(key);
  const type = normalizeLoanTypeForDb(loanType);
  const map = {
    aadhaar: 'aadhaar',
    pan: 'pan',
    salary_slip: 'salary_slip',
    salaryslip: 'salary_slip',
    bank_statement: 'bank_statement',
    bankstatement: 'bank_statement',
    photo: 'passport_photo',
    passport_photo: 'passport_photo',
    business_docs: ['business', 'startup'].includes(type) ? 'gst_certificate' : 'other',
    businessdocs: ['business', 'startup'].includes(type) ? 'gst_certificate' : 'other',
    gst_certificate: 'gst_certificate',
    business_registration: 'business_registration',
    other: 'other',
  };

  return map[normalized] || normalized;
}

function buildApplicationNumber() {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `LD${String(Date.now()).slice(-10)}${suffix}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sortByDateDesc(rows, field) {
  return [...rows].sort((a, b) => new Date(b?.[field] || 0) - new Date(a?.[field] || 0));
}

async function runQuery(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function runOptionalQuery(query) {
  try {
    return await runQuery(query);
  } catch (error) {
    if (isMissingNotificationColumnError(error)) {
      return [];
    }
    throw error;
  }
}

function isMissingNotificationColumnError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || error?.details || error || '').toLowerCase();
  return (
    code === '42703' ||
    code === '42P01' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('could not find') && message.includes('column')) ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

async function fetchAllProfiles() {
  return runQuery(supabase.from('profiles').select('*'));
}

async function fetchAllEmployees() {
  return runQuery(supabase.from('employees').select('*'));
}

async function fetchDemoAccounts() {
  const [customerResult, loanOfficerResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'customer')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'employee')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
  ]);

  if (customerResult.error) {
    console.error('[demo-accounts] Customer query failed:', customerResult.error);
  }

  if (loanOfficerResult.error) {
    console.error('[demo-accounts] Loan officer query failed:', loanOfficerResult.error);
  }

  console.log(`[demo-accounts] Customers found: ${customerResult.data?.length || 0}`);
  console.log(`[demo-accounts] Employees found: ${loanOfficerResult.data?.length || 0}`);

  if (customerResult.error) throw customerResult.error;
  if (loanOfficerResult.error) throw loanOfficerResult.error;

  const formatAccount = ({ id, full_name, email }) => ({
    id: String(id || ''),
    full_name: full_name || '',
    email: email || '',
  });

  return {
    customers: (customerResult.data || []).map(formatAccount),
    loanOfficers: (loanOfficerResult.data || []).map(formatAccount),
  };
}

function pickExistingColumns(row, patch) {
  if (!row) return {};

  const updates = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      updates[key] = value;
    }
  }

  return updates;
}

function buildProfilePatch(row, { fullName, email }) {
  return pickExistingColumns(row, {
    full_name: fullName,
    fullName,
    email,
  });
}

function buildPasswordPatch(row, passwordHash) {
  return pickExistingColumns(row, {
    password: passwordHash,
    password_hash: passwordHash,
    passwordHash: passwordHash,
    passcode: passwordHash,
    pin: passwordHash,
  });
}

async function fetchCurrentIdentity(auth = {}) {
  const profileId = auth.profileId || auth.sub || null;
  const employeeId = auth.employeeId || null;

  const [profileResult, employeeResult] = await Promise.all([
    profileId
      ? supabase.from('profiles').select('*').eq('id', profileId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    employeeId || profileId
      ? supabase
          .from('employees')
          .select('*')
          .or(employeeId ? `employee_id.eq.${employeeId},profile_id.eq.${profileId}` : `profile_id.eq.${profileId}`)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (employeeResult.error) throw employeeResult.error;

  return {
    profile: profileResult.data || null,
    employee: employeeResult.data || null,
  };
}

function buildProfileMaps(profiles, employees) {
  const profilesById = new Map();
  const profilesByEmail = new Map();
  const profilesByMobile = new Map();
  const employeesByEmployeeId = new Map();
  const employeesByProfileId = new Map();

  profiles.forEach((profile) => {
    if (profile?.id) profilesById.set(String(profile.id), profile);
    if (profile?.email) profilesByEmail.set(String(profile.email).toLowerCase(), profile);
    if (profile?.mobile) profilesByMobile.set(String(profile.mobile).replace(/\s+/g, ''), profile);
  });

  employees.forEach((employee) => {
    if (employee?.employee_id) employeesByEmployeeId.set(String(employee.employee_id), employee);
    if (employee?.profile_id) employeesByProfileId.set(String(employee.profile_id), employee);
  });

  return {
    profilesById,
    profilesByEmail,
    profilesByMobile,
    employeesByEmployeeId,
    employeesByProfileId,
  };
}

function resolveProfileByLogin(username, maps) {
  const normalized = String(username || '').trim();
  const emailKey = normalized.toLowerCase();
  const mobileKey = normalized.replace(/\s+/g, '');

  return (
    maps.profilesByEmail.get(emailKey) ||
    maps.profilesByMobile.get(mobileKey) ||
    maps.profilesById.get(normalized) ||
    null
  );
}

function resolveEmployeeByLogin(username, maps) {
  const normalized = String(username || '').trim();
  return (
    maps.employeesByEmployeeId.get(normalized) ||
    maps.employeesByProfileId.get(normalized) ||
    null
  );
}

function matchesPassword(record, password) {
  if (!record) return false;
  const candidates = [
    record.password,
    record.password_hash,
    record.passwordHash,
    record.passcode,
    record.pin,
  ].filter(Boolean);

  if (candidates.length === 0) {
    return false;
  }

  return candidates.some((candidate) => {
    const candidateStr = String(candidate);
    if (candidateStr.startsWith('$2a$') || candidateStr.startsWith('$2b$') || candidateStr.startsWith('$2y$')) {
      return bcrypt.compareSync(String(password || ''), candidateStr);
    }
    return candidateStr === String(password || '');
  });
}

function mapEmploymentDetails(application, profile, creditAssessment) {
  const applicationEmployment = application?.employment_details || application?.employmentDetails || {};
  return {
    employmentType:
      applicationEmployment.employmentType ||
      applicationEmployment.employment_type ||
      application?.employment_type ||
      profile?.employment_type ||
      profile?.employmentType ||
      'Salaried',
    employer:
      applicationEmployment.employer ||
      applicationEmployment.companyName ||
      application?.employer_name ||
      profile?.employer ||
      profile?.company_name ||
      profile?.companyName ||
      '',
    designation:
      applicationEmployment.designation ||
      profile?.designation ||
      '',
    monthlyIncome:
      toNumber(
        applicationEmployment.monthlyIncome ||
          applicationEmployment.monthly_income ||
          application?.monthly_income ||
          creditAssessment?.monthly_income ||
          profile?.monthly_income ||
          profile?.monthlyIncome,
        0
      ),
    businessName: applicationEmployment.businessName || profile?.business_name || '',
    annualIncome: toNumber(applicationEmployment.annualIncome || profile?.annual_income, 0),
    collegeName: applicationEmployment.collegeName || profile?.college_name || '',
    guardianIncome: toNumber(applicationEmployment.guardianIncome || profile?.guardian_income, 0),
    experienceYears: toNumber(applicationEmployment.experienceYears || profile?.experience_years, 0),
  };
}

function mapApplicantDetails(application, profile) {
  const applicationApplicant = application?.applicant_details || application?.applicantDetails || {};
  return {
    fullName:
      applicationApplicant.fullName ||
      applicationApplicant.full_name ||
      profile?.full_name ||
      profile?.fullName ||
      '',
    dob: applicationApplicant.dob || profile?.date_of_birth || profile?.dob || '',
    gender: applicationApplicant.gender || profile?.gender || '',
    phone: applicationApplicant.phone || profile?.mobile || profile?.phone || '',
    email: applicationApplicant.email || profile?.email || '',
    address: applicationApplicant.address || profile?.address || '',
    aadhaar: applicationApplicant.aadhaar || profile?.aadhaar || '',
    pan: applicationApplicant.pan || profile?.pan || '',
  };
}

function mapDocumentRow(row) {
  const key = normalizeDocumentKey(row?.document_type);
  const fileUrl = row?.file_url || row?.url || '';
  return {
    key,
    url: fileUrl,
    fileUrl,
    fileName: row?.file_name || row?.document_name || fileNameFromUrl(fileUrl, `${key}.pdf`),
    uploadTime: row?.uploaded_at || row?.created_at || '',
    verificationStarted: row?.verification_started || row?.created_at || '',
    verificationCompleted: row?.verification_completed || row?.verified_at || '',
    verificationResult: displayVerificationStatus(row?.verification_status || row?.status),
    verificationSource: row?.verification_source || 'Supabase Storage',
    verificationRemarks: row?.verification_remarks || row?.remarks || '',
    status: displayVerificationStatus(row?.verification_status || row?.status),
  };
}

function mapGeneratedDocumentRow(row) {
  const fileUrl = row?.public_url || row?.signed_url || row?.storage_path || row?.file_url || '';
  return {
    id: row?.generated_document_id || row?.document_id || row?.id || null,
    applicationId: row?.application_id || null,
    documentType: row?.document_type || '',
    fileName: row?.file_name || fileNameFromUrl(fileUrl, 'document.pdf'),
    storagePath: row?.storage_path || row?.file_path || row?.storagePath || '',
    fileUrl,
    publicUrl: row?.public_url || row?.signed_url || null,
    createdAt: row?.created_at || row?.generated_at || row?.updated_at || null,
  };
}

function buildDocumentsMap(documentRows = []) {
  const docs = {};
  documentRows.forEach((row) => {
    const key = normalizeDocumentKey(row.document_type);
    if (!key) return;
    docs[key] = mapDocumentRow(row);
  });
  return docs;
}

function buildGeneratedDocumentsList(rows = []) {
  return rows.map(mapGeneratedDocumentRow);
}

function calculateFoir(monthlyIncome, existingEmi) {
  if (!monthlyIncome) return 0;
  return Math.round((toNumber(existingEmi) / monthlyIncome) * 100);
}

function calculateDti(monthlyIncome, existingEmi) {
  if (!monthlyIncome) return 0;
  return Math.round((toNumber(existingEmi) / monthlyIncome) * 100);
}

function sumNumeric(rows, field) {
  return rows.reduce((total, row) => total + toNumber(row?.[field], 0), 0);
}

function buildTimeline(auditRows = [], profilesMaps = null) {
  return sortByDateDesc(auditRows, 'created_at')
    .reverse()
    .map((row) => ({
      timestamp: row?.created_at || row?.timestamp || nowIso(),
      actor: resolvePerformerName(row?.performed_by, profilesMaps) || row?.performed_by || 'System',
      action: row?.action || row?.event_type || 'System Event',
      remarks: row?.description || row?.remarks || '',
    }));
}

function resolvePerformerName(performedBy, maps) {
  if (!performedBy || !maps) return null;
  const key = String(performedBy);
  const profile = maps.profilesById.get(key);
  if (profile?.full_name) return profile.full_name;

  const employee = maps.employeesByEmployeeId.get(key) || maps.employeesByProfileId.get(key);
  if (employee) {
    const employeeProfile = maps.profilesById.get(String(employee.profile_id));
    const fullName = employeeProfile?.full_name || employee.full_name || employee.employee_name || '';
    const designation = displayEmployeeDesignation(employee.designation || employee.role || '');
    return fullName ? `${fullName} (${designation})` : designation;
  }

  return key;
}

function mapReviewStatus(value) {
  const normalized = normalizeKey(value);
  if (['verified', 'completed', 'approved'].includes(normalized)) return 'Completed';
  if (['rejected', 'mismatch', 'failed'].includes(normalized)) return 'Rejected';
  if (['in_review', 'pending'].includes(normalized)) return 'Pending';
  return value ? displayVerificationStatus(value) : 'Pending';
}

function mapCreditReview(row) {
  if (!row) {
    return {
      status: 'Pending',
      officerId: null,
      officerName: null,
      assessedAt: null,
      creditScore: null,
      dtiRatio: null,
      riskLevel: '',
      remarks: '',
      existingLoans: null,
      currentEMI: null,
      foir: null,
      dti: null,
      creditUtilization: null,
      loanDefaults: null,
      missedEmi: null,
      eligibleAmount: null,
      recommendedAmount: null,
    };
  }

  return {
    status: mapReviewStatus(row.assessment_status),
    officerId: row.assessed_by || null,
    officerName: row.assessed_by_name || null,
    assessedAt: row.assessed_at || row.assessment_completed_at || null,
    creditScore: row.credit_score ?? null,
    creditRating: row.credit_rating ?? '',
    monthlyIncome: row.monthly_income ?? null,
    existingLoans: row.existing_loans ?? row.total_existing_loans ?? null,
    currentEMI: row.existing_emi ?? row.total_existing_emi ?? null,
    foir: row.foir ?? null,
    dtiRatio: row.dti ?? null,
    dti: row.dti ?? null,
    creditUtilization: row.credit_utilization ?? null,
    loanDefaults: row.loan_defaults ?? row.total_defaults ?? null,
    missedEmi: row.missed_emi ?? row.total_missed_emis ?? null,
    eligibleAmount: row.eligible_amount ?? null,
    recommendedAmount: row.recommended_amount ?? null,
    riskLevel: row.risk_level || row.risk_category || '',
    remarks: row.remarks || row.officer_remarks || '',
  };
}

function mapKycReview(row) {
  if (!row) {
    return {
      status: 'Pending',
      officerId: null,
      officerName: null,
      verifiedAt: null,
      remarks: '',
    };
  }

  return {
    status: mapReviewStatus(row.aadhaar_status || row.kyc_status),
    officerId: row.verified_by || null,
    officerName: row.verified_by_name || null,
    verifiedAt: row.verified_at || row.verification_completed_at || null,
    remarks: row.officer_remarks || '',
    aadhaarStatus: displayVerificationStatus(row.aadhaar_status),
    panStatus: displayVerificationStatus(row.pan_status),
    faceMatch: displayVerificationStatus(row.face_match || row.face_match_status),
    mobileStatus: displayVerificationStatus(row.mobile_status),
    emailStatus: displayVerificationStatus(row.email_status),
    bankStatus: displayVerificationStatus(row.bank_status || row.bank_account_status),
    addressStatus: displayVerificationStatus(row.address_status),
    employmentStatus: displayVerificationStatus(row.employment_status),
    salaryStatus: displayVerificationStatus(row.salary_status || row.salary_verification_status),
    fraudCheck: displayVerificationStatus(row.fraud_check || row.fraud_check_status),
  };
}

function mapDecision(row) {
  if (!row) {
    return {
      status: 'Pending',
      managerId: null,
      managerName: null,
      decidedAt: null,
      decision: '',
      remarks: '',
    };
  }

  return {
    status: mapReviewStatus(row.decision),
    managerId: row.manager_id || row.decided_by || null,
    managerName: row.manager_name || null,
    decidedAt: row.decision_date || null,
    decision: displayDecisionStatus(row.decision),
    remarks: row.manager_remarks || row.rejection_reason || row.remarks || '',
    approvedAmount: row.approved_amount ?? null,
    interestRate: row.interest_rate ?? row.approved_interest_rate ?? null,
    loanTenure: row.loan_tenure ?? row.loan_tenure_months ?? null,
  };
}

function mapApplicationRow(application, refs) {
  const profile = refs.profilesById.get(String(application.customer_id)) || null;
  const creditAssessment = refs.creditByApplicationId.get(String(application.application_id)) || null;
  const kycReview = refs.kycByApplicationId.get(String(application.application_id)) || null;
  const decision = refs.decisionByApplicationId.get(String(application.application_id)) || null;
  const documents = refs.documentsByApplicationId.get(String(application.application_id)) || [];
  const generatedDocuments = refs.generatedDocumentsByApplicationId.get(String(application.application_id)) || [];
  const auditLogs = refs.auditByApplicationId.get(String(application.application_id)) || [];
  const existingLoans = refs.existingLoansByApplicationId.get(String(application.application_id)) || [];
  const emiHistory = refs.emiByApplicationId.get(String(application.application_id)) || [];
  const defaultHistory = refs.defaultByApplicationId.get(String(application.application_id)) || [];
  const missedEmiHistory = refs.missedByApplicationId.get(String(application.application_id)) || [];

  const applicantDetails = mapApplicantDetails(application, profile);
  const employmentDetails = mapEmploymentDetails(application, profile, creditAssessment);

  const monthlyIncome = toNumber(
    creditAssessment?.monthly_income ||
      employmentDetails.monthlyIncome ||
      profile?.monthly_income ||
      profile?.monthlyIncome,
    0
  );
  const currentEmi = toNumber(
    creditAssessment?.existing_emi ?? creditAssessment?.total_existing_emi ?? sumNumeric(emiHistory, 'emi_amount'),
    0
  );
  const foir = toNumber(creditAssessment?.foir, calculateFoir(monthlyIncome, currentEmi));
  const dti = toNumber(creditAssessment?.dti, calculateDti(monthlyIncome, currentEmi));

  const timeline = buildTimeline(auditLogs, refs);
  const latestAssignment = application.assigned_employee || kycReview?.officerId || creditAssessment?.assessed_by || decision?.managerId || null;

  return {
    id: application.application_id,
    applicationId: application.application_id,
    customerId: application.customer_id,
    loanType: application.loan_type,
    requestedAmount: toNumber(application.requested_amount, 0),
    amount: toNumber(application.requested_amount, 0),
    eligibleAmount: toNumber(
      application.eligible_amount ?? creditAssessment?.eligible_amount,
      0
    ),
    recommendedAmount: toNumber(
      application.recommended_amount ?? creditAssessment?.recommended_amount,
      0
    ),
    approvedAmount: toNumber(application.approved_amount ?? decision?.approvedAmount, 0),
    interestRate: toNumber(application.interest_rate ?? decision?.interestRate, 0),
    tenureMonths: toNumber(application.loan_tenure || application.loan_tenure_months, 0),
    purpose: application.purpose || application.loan_purpose || '',
    status: displayLoanStatus(application.application_status),
    current_stage: displayLoanStatus(application.application_status),
    assignedEmployee: latestAssignment,
    submittedAt: application.submitted_at || application.created_at || null,
    updatedAt: application.updated_at || null,
    applicantDetails,
    employmentDetails,
    documents: buildDocumentsMap(documents),
    generatedDocuments: buildGeneratedDocumentsList(generatedDocuments),
    reviews: {
      verification: {
        ...mapKycReview(kycReview),
        officerName: resolvePerformerName(kycReview?.verified_by || application.assigned_employee, refs) || kycReview?.officerName || null,
      },
      credit: {
        ...mapCreditReview(creditAssessment),
        officerName: resolvePerformerName(creditAssessment?.assessed_by, refs) || creditAssessment?.officerName || null,
        existingLoans: toNumber(creditAssessment?.existing_loans ?? creditAssessment?.total_existing_loans, existingLoans.length),
        currentEMI: toNumber(creditAssessment?.existing_emi ?? creditAssessment?.total_existing_emi, currentEmi),
        foir: toNumber(creditAssessment?.foir, foir),
        dtiRatio: toNumber(creditAssessment?.dti, dti),
        dti: toNumber(creditAssessment?.dti, dti),
        creditUtilization: toNumber(creditAssessment?.credit_utilization, 0),
        loanDefaults: toNumber(creditAssessment?.loan_defaults ?? creditAssessment?.total_defaults, defaultHistory.length),
        missedEmiCount: toNumber(creditAssessment?.missed_emi ?? creditAssessment?.total_missed_emis, missedEmiHistory.length),
        missedEmi: toNumber(creditAssessment?.missed_emi ?? creditAssessment?.total_missed_emis, missedEmiHistory.length),
        eligibleAmount: toNumber(creditAssessment?.eligible_amount, application.eligible_amount || 0),
        recommendedAmount: toNumber(creditAssessment?.recommended_amount, application.recommended_amount || 0),
      },
      manager: {
        ...mapDecision(decision),
        managerName: resolvePerformerName(decision?.manager_id, refs) || decision?.managerName || null,
      },
    },
    timeline,
    // Real credit detail rows from database tables
    creditData: {
      existingLoanRows: mapExistingLoanRows(existingLoans),
      emiHistoryRows: mapEmiHistoryRows(emiHistory),
      loanDefaultRows: mapLoanDefaultRows(defaultHistory),
      missedEmiRows: mapMissedEmiRows(missedEmiHistory),
    },
    meta: {
      documentsCount: documents.length,
      existingLoansCount: existingLoans.length,
      emiCount: emiHistory.length,
      loanDefaultCount: defaultHistory.length,
      missedEmiCount: missedEmiHistory.length,
    },
  };
}

async function loadApplicationRefs(applicationRows = []) {
  const applicationIds = applicationRows.map((row) => String(row.application_id));
  const customerIds = [...new Set(applicationRows.map((row) => String(row.customer_id)).filter(Boolean))];

  const [
    profiles,
    employees,
    documents,
    generatedDocuments,
    kyc,
    credit,
    decision,
    auditLogs,
    existingLoans,
    emiHistory,
    defaultHistory,
    missedEmiHistory,
  ] = await Promise.all([
    fetchAllProfiles(),
    fetchAllEmployees(),
    applicationIds.length
      ? runQuery(supabase.from('applicant_documents').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runQuery(supabase.from('generated_documents').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runQuery(supabase.from('kyc_verifications').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runQuery(supabase.from('credit_assessments').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runQuery(supabase.from('loan_decisions').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runQuery(supabase.from('audit_logs').select('*').in('application_id', applicationIds).order('created_at', { ascending: true }))
      : Promise.resolve([]),
    applicationIds.length
      ? runOptionalQuery(supabase.from('existing_loans').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runOptionalQuery(supabase.from('emi_history').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runOptionalQuery(supabase.from('loan_default_history').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
    applicationIds.length
      ? runOptionalQuery(supabase.from('missed_emi_history').select('*').in('application_id', applicationIds))
      : Promise.resolve([]),
  ]);

  const maps = buildProfileMaps(profiles, employees);
  const documentsByApplicationId = new Map();
  const generatedDocumentsByApplicationId = new Map();
  const kycByApplicationId = new Map();
  const creditByApplicationId = new Map();
  const decisionByApplicationId = new Map();
  const auditByApplicationId = new Map();
  const existingLoansByApplicationId = new Map();
  const emiByApplicationId = new Map();
  const defaultByApplicationId = new Map();
  const missedByApplicationId = new Map();

  documents.forEach((row) => {
    const applicationId = String(row.application_id);
    if (!documentsByApplicationId.has(applicationId)) documentsByApplicationId.set(applicationId, []);
    documentsByApplicationId.get(applicationId).push(row);
  });

  generatedDocuments.forEach((row) => {
    const applicationId = String(row.application_id);
    if (!generatedDocumentsByApplicationId.has(applicationId)) generatedDocumentsByApplicationId.set(applicationId, []);
    generatedDocumentsByApplicationId.get(applicationId).push(row);
  });

  kyc.forEach((row) => kycByApplicationId.set(String(row.application_id), row));
  credit.forEach((row) => creditByApplicationId.set(String(row.application_id), row));
  decision.forEach((row) => decisionByApplicationId.set(String(row.application_id), row));

  auditLogs.forEach((row) => {
    const applicationId = String(row.application_id);
    if (!auditByApplicationId.has(applicationId)) auditByApplicationId.set(applicationId, []);
    auditByApplicationId.get(applicationId).push(row);
  });

  existingLoans.forEach((row) => {
    const applicationId = String(row.application_id);
    if (!existingLoansByApplicationId.has(applicationId)) existingLoansByApplicationId.set(applicationId, []);
    existingLoansByApplicationId.get(applicationId).push(row);
  });

  emiHistory.forEach((row) => {
    const applicationId = String(row.application_id);
    if (!emiByApplicationId.has(applicationId)) emiByApplicationId.set(applicationId, []);
    emiByApplicationId.get(applicationId).push(row);
  });

  defaultHistory.forEach((row) => {
    const applicationId = String(row.application_id);
    if (!defaultByApplicationId.has(applicationId)) defaultByApplicationId.set(applicationId, []);
    defaultByApplicationId.get(applicationId).push(row);
  });

  missedEmiHistory.forEach((row) => {
    const applicationId = String(row.application_id);
    if (!missedByApplicationId.has(applicationId)) missedByApplicationId.set(applicationId, []);
    missedByApplicationId.get(applicationId).push(row);
  });

  return {
    ...maps,
    documentsByApplicationId,
    generatedDocumentsByApplicationId,
    kycByApplicationId,
    creditByApplicationId,
    decisionByApplicationId,
    auditByApplicationId,
    existingLoansByApplicationId,
    emiByApplicationId,
    defaultByApplicationId,
    missedByApplicationId,
    customerIds,
  };
}

async function insertAuditLog(applicationId, performedBy, action, description, module = 'loan_application') {
  const payload = {
    audit_log_id: randomUUID(),
    application_id: applicationId,
    performed_by: performedBy || null,
    action,
    module,
    description,
    created_at: nowIso(),
  };
  const { error } = await supabase.from('audit_logs').insert(payload);
  if (!error) return;

  if (performedBy && error.code === '23503') {
    const { error: retryError } = await supabase
      .from('audit_logs')
      .insert({ ...payload, audit_log_id: randomUUID(), performed_by: null });
    if (!retryError) return;
    throw retryError;
  }

  throw error;
}

const notificationSchemas = [
  {
    id: 'notification_id',
    recipient: 'recipient_id',
    read: 'is_read',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    type: 'notification_type',
    priority: 'priority',
  },
  {
    id: 'id',
    recipient: 'user_id',
    read: 'read',
    createdAt: 'timestamp',
  },
  {
    id: 'id',
    recipient: 'user_id',
    read: 'is_read',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    type: 'notification_type',
    priority: 'priority',
  },
  {
    id: 'notification_id',
    recipient: 'recipient_id',
    read: 'read',
    createdAt: 'timestamp',
  },
];

function buildNotificationPayload(schema, { userId, title, message, applicationId }) {
  const payload = {
    [schema.id]: randomUUID(),
    [schema.recipient]: userId,
    title,
    message,
    [schema.read]: false,
    [schema.createdAt]: nowIso(),
  };

  if (applicationId) {
    payload.application_id = applicationId;
  }
  if (schema.updatedAt) payload[schema.updatedAt] = payload[schema.createdAt];
  if (schema.type) payload[schema.type] = 'loan_update';
  if (schema.priority) payload[schema.priority] = 'medium';

  return payload;
}

async function insertNotification(userId, title, message, applicationId = null) {
  let lastError = null;

  for (const schema of notificationSchemas) {
    for (const includeApplicationId of [true, false]) {
      const payload = buildNotificationPayload(schema, {
        userId,
        title,
        message,
        applicationId: includeApplicationId ? applicationId : null,
      });
      const { error } = await supabase.from('notifications').insert(payload);
      if (!error) return;

      lastError = error;
      if (!isMissingNotificationColumnError(error)) break;
    }
  }

  if (lastError) throw lastError;
}

async function deleteNotification(notificationId) {
  let lastError = null;

  for (const schema of notificationSchemas) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq(schema.id, notificationId);

    if (!error) return { message: 'Notification deleted successfully' };

    lastError = error;
    if (!isMissingNotificationColumnError(error)) break;
  }

  if (lastError) throw lastError;
  return { message: 'Notification deleted successfully' };
}

function formatNotification(row) {
  return {
    id: row.notification_id || row.id,
    userId: row.recipient_id || row.user_id,
    title: row.title,
    message: row.message,
    read: Boolean(row.is_read ?? row.read),
    status: (row.is_read ?? row.read) ? 'read' : 'unread',
    applicationId: row.application_id || row.applicationId || null,
    createdAt: row.created_at || row.timestamp || row.createdAt || null,
    timestamp: row.created_at || row.timestamp || row.createdAt || null,
  };
}

async function createInitialWorkflowRecords(applicationId, payload, customerId) {
  const startedAt = nowIso();
  const employmentDetails = payload?.employmentDetails || payload?.employment_details || {};
  const monthlyIncome = toNumber(employmentDetails.monthlyIncome || employmentDetails.monthly_income || 0, 0);
  const requestedAmount = toNumber(payload?.amount || payload?.requested_amount || 0, 0);
  const tenureMonths = toNumber(payload?.tenureMonths || payload?.loanTenure || payload?.loan_tenure || 0, 0);

  const kycPayload = {
    verification_id: randomUUID(),
    application_id: applicationId,
    aadhaar_status: 'pending',
    pan_status: 'pending',
    face_match_status: 'pending',
    mobile_status: 'pending',
    email_status: 'pending',
    address_status: 'pending',
    bank_account_status: 'pending',
    employment_status: 'pending',
    salary_verification_status: 'pending',
    fraud_check_status: 'pending',
    overall_status: 'pending',
    officer_remarks: '',
    verified_by: null,
    verification_started_at: startedAt,
    verification_completed_at: null,
    created_at: startedAt,
    updated_at: startedAt,
  };

  const creditPayload = {
    assessment_id: randomUUID(),
    application_id: applicationId,
    credit_score: null,
    credit_rating: null,
    monthly_income: monthlyIncome,
    annual_income: monthlyIncome ? monthlyIncome * 12 : null,
    total_existing_loans: 0,
    total_existing_emi: 0,
    maximum_eligible_emi: 0,
    foir: 0,
    dti: 0,
    credit_utilization: 0,
    total_defaults: 0,
    total_missed_emis: 0,
    requested_amount: requestedAmount,
    eligible_amount: 0,
    recommended_amount: 0,
    suggested_tenure_months: tenureMonths || null,
    assessment_status: 'pending',
    assessed_by: null,
    officer_remarks: '',
    assessment_started_at: startedAt,
    assessment_completed_at: null,
    created_at: startedAt,
    updated_at: startedAt,
  };

  const [kycResult, creditResult] = await Promise.all([
    supabase.from('kyc_verifications').upsert(kycPayload, { onConflict: 'application_id' }),
    supabase.from('credit_assessments').upsert(creditPayload, { onConflict: 'application_id' }),
  ]);

  if (kycResult.error) throw kycResult.error;
  if (creditResult.error) throw creditResult.error;

  await insertAuditLog(applicationId, customerId, 'Application Submitted', 'Application submitted successfully.');
}

async function safeInsertNotification(userId, title, message, applicationId = null) {
  try {
    await insertNotification(userId, title, message, applicationId);
  } catch (error) {
    if (!isMissingNotificationColumnError(error)) {
      throw error;
    }

    console.warn('[notifications] Skipping notification write due to schema mismatch:', error?.message || error);
  }
}

async function createApplication(payload) {
  const customerId = payload.customerId || payload.customer_id;
  const loanType = payload.loanType || payload.loan_type;
  const amount = toNumber(payload.amount, null);
  const tenureMonths = toNumber(payload.tenureMonths || payload.loanTenure || payload.loan_tenure, null);

  if (!customerId || !loanType || !amount || !tenureMonths) {
    const error = new Error('Missing required loan application fields.');
    error.statusCode = 400;
    throw error;
  }

  const profile = await getProfileById(customerId);
  if (!profile) {
    const error = new Error('Customer profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const applicationId = randomUUID();
  const submittedAt = nowIso();
  const applicationStatus = dbLoanStatus('Verification Queue');
  const applicantDetails = payload.applicantDetails || payload.applicant_details || {};
  const employmentDetails = payload.employmentDetails || payload.employment_details || {};
  const monthlyIncome = toNumber(
    employmentDetails.monthlyIncome || employmentDetails.monthly_income || employmentDetails.guardianIncome || 0,
    0
  );

  const loanApplicationPayload = {
    application_id: applicationId,
    customer_id: customerId,
    application_number: buildApplicationNumber(),
    loan_type: normalizeLoanTypeForDb(loanType),
    loan_purpose: payload.purpose || 'General loan application',
    employment_type: employmentDetails.employmentType || employmentDetails.employment_type || 'Salaried',
    employer_name: employmentDetails.employer || employmentDetails.employer_name || employmentDetails.businessName || employmentDetails.collegeName || null,
    monthly_income: monthlyIncome || null,
    requested_amount: amount,
    eligible_amount: null,
    recommended_amount: null,
    approved_amount: null,
    interest_rate: payload.interestRate || payload.interest_rate || null,
    loan_tenure_months: tenureMonths,
    application_status: applicationStatus,
    assigned_employee: null,
    remarks: applicantDetails.fullName ? `Applicant: ${applicantDetails.fullName}` : null,
    submitted_at: submittedAt,
    created_at: submittedAt,
    updated_at: submittedAt,
  };

  const { error: applicationError } = await supabase.from('loan_applications').insert(loanApplicationPayload);
  if (applicationError) throw applicationError;

  const documentPayloads = [];
  for (const [key, fileValue] of Object.entries(payload.documents || {})) {
    const documentType = normalizeDocumentTypeForDb(key, loanType);
    const { fileName, fileSize, mimeType } = getFileMeta(fileValue, documentType);
    const fileUrl = await uploadDocumentToStorage(applicationId, documentType, fileValue);
    if (!fileUrl) continue;

    documentPayloads.push({
      document_id: randomUUID(),
      application_id: applicationId,
      document_type: documentType,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize || null,
      mime_type: mimeType,
      uploaded_by: customerId,
      verification_status: 'pending',
      uploaded_at: submittedAt,
      created_at: submittedAt,
      updated_at: submittedAt,
    });
  }

  if (documentPayloads.length) {
    const { error: documentError } = await supabase.from('applicant_documents').insert(documentPayloads);
    if (documentError) throw documentError;
  }

  await createInitialWorkflowRecords(applicationId, payload, customerId);
  await safeInsertNotification(
    customerId,
    'Application Submitted',
    `Your application ${applicationId} has been submitted successfully and moved to the verification queue.`,
    applicationId
  );

  return {
    applicationId,
    id: applicationId,
  };
}

async function getProfileById(profileId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
  if (error) throw error;
  return data;
}

async function getApplicationById(applicationId) {
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const refs = await loadApplicationRefs([data]);
  return mapApplicationRow(data, refs);
}

async function getApplications({ customerId, status } = {}) {
  let query = supabase.from('loan_applications').select('*');

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  if (status) {
    const normalized = normalizeKey(status);
    query = query.eq('application_status', dbLoanStatus(status) || normalized);
  }

  const applications = await runQuery(query.order('submitted_at', { ascending: false }));
  if (!applications.length) return [];

  const refs = await loadApplicationRefs(applications);
  return applications.map((application) => mapApplicationRow(application, refs));
}

async function updateDocumentVerification(applicationId, documentsVerification, statusFallback) {
  if (!documentsVerification || typeof documentsVerification !== 'object') return;

  const operations = Object.entries(documentsVerification).map(async ([docKey, docValue]) => {
    const documentType = normalizeDocumentKey(docKey);
    if (!documentType) return null;
    const verificationStatus = docValue?.verified ? 'verified' : docValue?.status || statusFallback || 'pending';
    const updates = {
      verification_status: normalizeKey(verificationStatus),
    };
    if (docValue?.remarks) {
      updates.verification_remarks = docValue.remarks;
    }
    const { error } = await supabase
      .from('applicant_documents')
      .update(updates)
      .eq('application_id', applicationId)
      .eq('document_type', documentType);
    if (error) throw error;
    return true;
  });

  await Promise.all(operations);
}

async function updateVerification(applicationId, payload = {}) {
  const { data: application, error: applicationError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const updatedAt = nowIso();
  const officerId = payload.officerId || payload.officer_id || null;
  const officerName = payload.officerName || payload.officer_name || null;
  const remarks = payload.remarks || 'KYC verification complete.';

  await updateDocumentVerification(applicationId, payload.documentsVerification, 'verified');

  const kycPayload = {
    application_id: applicationId,
    aadhaar_status: 'verified',
    pan_status: 'verified',
    face_match: 'verified',
    mobile_status: 'verified',
    email_status: 'verified',
    bank_status: 'verified',
    address_status: 'verified',
    employment_status: 'verified',
    salary_status: 'verified',
    fraud_check: 'verified',
    officer_remarks: remarks,
    verified_by: officerId,
    verified_at: updatedAt,
  };

  const { error: kycError } = await supabase.from('kyc_verifications').upsert(kycPayload, { onConflict: 'application_id' });
  if (kycError) throw kycError;

  const { error: applicationUpdateError } = await supabase
    .from('loan_applications')
    .update({
      application_status: dbLoanStatus('In Review'),
      assigned_employee: officerId,
      updated_at: updatedAt,
    })
    .eq('application_id', applicationId);

  if (applicationUpdateError) throw applicationUpdateError;

  await insertAuditLog(
    applicationId,
    officerId || application.customer_id,
    'Verification Completed',
    remarks || 'KYC verification completed.'
  );

  await safeInsertNotification(
    application.customer_id,
    'Verification Completed',
    `Your application ${applicationId} has completed verification and moved to credit assessment.`,
    applicationId
  );
  if (officerId) {
    await safeInsertNotification(
      officerId,
      'Verification Submitted',
      `Verification for application ${applicationId} was recorded successfully.`,
      applicationId
    );
  }

  return getApplicationById(applicationId);
}

function deriveCreditPolicy(creditScore) {
  const score = toNumber(creditScore, 700);
  if (score >= 780) return { foir: 52, multiplier: 0.97, risk: 'Low' };
  if (score >= 740) return { foir: 48, multiplier: 0.95, risk: 'Low' };
  if (score >= 700) return { foir: 44, multiplier: 0.93, risk: 'Medium' };
  return { foir: 38, multiplier: 0.9, risk: 'High' };
}

async function updateCreditReview(applicationId, payload = {}) {
  const { data: application, error: applicationError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const refs = await loadApplicationRefs([application]);
  const existingLoans = refs.existingLoansByApplicationId.get(String(applicationId)) || [];
  const emiHistory = refs.emiByApplicationId.get(String(applicationId)) || [];
  const defaultHistory = refs.defaultByApplicationId.get(String(applicationId)) || [];
  const missedHistory = refs.missedByApplicationId.get(String(applicationId)) || [];
  const kycReview = refs.kycByApplicationId.get(String(applicationId)) || null;
  const profile = refs.profilesById.get(String(application.customer_id)) || null;

  const monthlyIncome = toNumber(
    payload.monthlyIncome ||
      payload.monthly_income ||
      payload.employmentDetails?.monthlyIncome ||
      payload.employment_details?.monthlyIncome ||
      application?.employment_details?.monthlyIncome ||
      kycReview?.monthly_income ||
      profile?.monthly_income ||
      0,
    0
  );
  const currentEmi = toNumber(
    payload.currentEMI ||
      payload.current_emi ||
      payload.existingEmi ||
      payload.existing_emi ||
      sumNumeric(emiHistory, 'emi_amount') ||
      0,
    0
  );
  const score = toNumber(payload.creditScore || payload.credit_score, 700);
  const policy = deriveCreditPolicy(score);
  const foir = toNumber(payload.foir, calculateFoir(monthlyIncome, currentEmi) || policy.foir);
  const dti = toNumber(payload.dti || payload.dtiRatio, calculateDti(monthlyIncome, currentEmi));
  const creditUtilization = toNumber(
    payload.creditUtilization || payload.credit_utilization,
    monthlyIncome ? Math.round((currentEmi / Math.max(monthlyIncome, 1)) * 100) : 0
  );
  const eligibleAmount = toNumber(
    payload.eligibleAmount || payload.eligible_amount,
    Math.max(0, Math.round((monthlyIncome * (foir / 100) - currentEmi) * 36))
  );
  const recommendedAmount = Math.min(
    eligibleAmount,
    toNumber(payload.recommendedAmount || payload.recommended_amount, Math.round(eligibleAmount * policy.multiplier))
  );
  const updatedAt = nowIso();

  const assessmentPayload = {
    application_id: applicationId,
    credit_score: score,
    credit_rating: payload.creditRating || payload.credit_rating || null,
    monthly_income: monthlyIncome,
    existing_loans: toNumber(payload.existingLoans || payload.existing_loans, existingLoans.length),
    existing_emi: currentEmi,
    foir,
    dti,
    credit_utilization: creditUtilization,
    loan_defaults: toNumber(payload.loanDefaults || payload.loan_defaults, defaultHistory.length),
    missed_emi: toNumber(payload.missedEmi || payload.missed_emi, missedHistory.length),
    eligible_amount: eligibleAmount,
    recommended_amount: recommendedAmount,
    assessment_status: 'completed',
    assessed_by: payload.officerId || payload.assessed_by || null,
    assessed_at: updatedAt,
    remarks: payload.remarks || '',
  };

  const { error: assessmentError } = await supabase
    .from('credit_assessments')
    .upsert(assessmentPayload, { onConflict: 'application_id' });

  if (assessmentError) throw assessmentError;

  const { error: applicationUpdateError } = await supabase
    .from('loan_applications')
    .update({
      application_status: dbLoanStatus('In Review'),
      eligible_amount: eligibleAmount,
      recommended_amount: recommendedAmount,
      assigned_employee: payload.officerId || null,
      updated_at: updatedAt,
    })
    .eq('application_id', applicationId);

  if (applicationUpdateError) throw applicationUpdateError;

  await insertAuditLog(
    applicationId,
    payload.officerId || application.customer_id,
    'Credit Assessment Completed',
    payload.remarks || 'Credit assessment completed.'
  );

  await safeInsertNotification(
    application.customer_id,
    'Credit Assessment Completed',
    `Credit assessment for application ${applicationId} has been completed and forwarded to the manager queue.`,
    applicationId
  );
  if (payload.officerId) {
    await safeInsertNotification(
      payload.officerId,
      'Credit Review Submitted',
      `Credit review for application ${applicationId} was saved successfully.`,
      applicationId
    );
  }

  return getApplicationById(applicationId);
}

async function updateManagerDecision(applicationId, payload = {}) {
  console.log('[updateManagerDecision] Starting with applicationId:', applicationId, 'payload:', payload);
  
  const { data: application, error: applicationError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (applicationError) {
    console.error('[updateManagerDecision] Application fetch error:', applicationError);
    throw applicationError;
  }
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  console.log('[updateManagerDecision] Application found:', application.application_status);

  const decisionRaw = payload.decision || '';
  const normalizedDecision = normalizeKey(decisionRaw);
  const updatedAt = nowIso();
  const managerRef = payload.managerId || payload.manager_id || null;
  let managerId = null;
  if (managerRef) {
    const { data: managerProfile } = await supabase
      .from('employees')
      .select('employee_id, profile_id')
      .or(`employee_id.eq.${managerRef},profile_id.eq.${managerRef}`)
      .maybeSingle();

    if (managerProfile?.employee_id) {
      managerId = managerProfile.employee_id;
    }
  }

  if (!managerId) {
    const err = new Error('Unable to resolve manager identity for decision recording.');
    err.statusCode = 400;
    throw err;
  }
  const { data: applicantProfile } = await supabase
    .from('profiles')
    .select('id, full_name, fullName, email')
    .eq('id', application.customer_id)
    .maybeSingle();
  const decisionOutcome = ['approve', 'approved'].includes(normalizedDecision)
    ? 'approved'
    : ['reject', 'rejected'].includes(normalizedDecision)
      ? 'rejected'
      : ['need_documents', 'needs_documents', 'documents', 'additional_documents', 'request_additional_documents'].includes(normalizedDecision)
        ? 'needs_documents'
        : normalizedDecision || 'rejected';
  const approvedAmount = decisionOutcome === 'approved'
    ? toNumber(
        payload.approvedAmount || payload.approved_amount,
        toNumber(application.recommended_amount || application.eligible_amount || application.requested_amount, 0)
      )
    : 0;
  const interestRate = toNumber(payload.interestRate || payload.interest_rate || application.interest_rate, 0);
  const loanTenure = toNumber(payload.loanTenure || payload.loan_tenure || application.loan_tenure, 0);
  const loanTenureMonths = loanTenure > 0 ? loanTenure : null;
  const monthlyEmi = decisionOutcome === 'approved'
    ? toNumber(payload.monthlyEmi || payload.monthly_emi, 0) || null
    : null;
  const processingFee = decisionOutcome === 'approved'
    ? toNumber(payload.processingFee || payload.processing_fee, 0) || null
    : null;
  const rejectionReason = decisionOutcome === 'rejected'
    ? String(payload.rejectionReason || payload.rejection_reason || payload.remarks || '').trim() || null
    : null;

  console.log('[updateManagerDecision] Decision:', normalizedDecision, 'Outcome:', decisionOutcome);

  const applicationStatus = decisionOutcome === 'approved'
    ? dbLoanStatus('Approved')
    : decisionOutcome === 'rejected'
      ? dbLoanStatus('Rejected')
      : decisionOutcome === 'needs_documents'
        ? dbLoanStatus('Document Requested')
        : dbLoanStatus('In Review');

  const decisionPayloads = [
    {
      application_id: applicationId,
      manager_id: managerId,
      approved_amount: approvedAmount,
      approved_interest_rate: decisionOutcome === 'approved' ? interestRate : null,
      processing_fee: processingFee,
      loan_tenure_months: loanTenureMonths,
      monthly_emi: monthlyEmi,
      decision: decisionOutcome,
      manager_remarks: payload.remarks || '',
      rejection_reason: rejectionReason,
      decision_date: updatedAt,
      updated_at: updatedAt,
    },
    {
      application_id: applicationId,
      decided_by: managerId,
      approved_amount: approvedAmount,
      approved_interest_rate: decisionOutcome === 'approved' ? interestRate : null,
      processing_fee: processingFee,
      loan_tenure_months: loanTenureMonths,
      monthly_emi: monthlyEmi,
      decision: decisionOutcome,
      manager_remarks: payload.remarks || '',
      rejection_reason: rejectionReason,
      decision_date: updatedAt,
      updated_at: updatedAt,
    },
    {
      application_id: applicationId,
      manager_id: managerId,
      approved_amount: approvedAmount,
      approved_interest_rate: decisionOutcome === 'approved' ? interestRate : null,
      processing_fee: processingFee,
      loan_tenure_months: loanTenureMonths,
      monthly_emi: monthlyEmi,
      decision: decisionOutcome,
      manager_remarks: payload.remarks || '',
      rejection_reason: rejectionReason,
      decided_at: updatedAt,
      updated_at: updatedAt,
    },
    {
      application_id: applicationId,
      decided_by: managerId,
      approved_amount: approvedAmount,
      approved_interest_rate: decisionOutcome === 'approved' ? interestRate : null,
      processing_fee: processingFee,
      loan_tenure_months: loanTenureMonths,
      monthly_emi: monthlyEmi,
      decision: decisionOutcome,
      manager_remarks: payload.remarks || '',
      rejection_reason: rejectionReason,
      decided_at: updatedAt,
      updated_at: updatedAt,
    },
  ];

  async function writeDecisionRecord() {
    const { data: existingDecision, error: existingDecisionError } = await supabase
      .from('loan_decisions')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();

    if (existingDecisionError) {
      throw existingDecisionError;
    }

    let lastError = null;

    for (const decisionPayload of decisionPayloads) {
      if (existingDecision) {
        const { error } = await supabase
          .from('loan_decisions')
          .update(decisionPayload)
          .eq('application_id', applicationId);

        if (!error) return;
        lastError = error;
        if (!isMissingNotificationColumnError(error)) continue;
      } else {
        const { error } = await supabase
          .from('loan_decisions')
          .insert(decisionPayload);

        if (!error) return;
        lastError = error;
        if (!isMissingNotificationColumnError(error)) continue;
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  console.log('[updateManagerDecision] Writing decision record');
  await writeDecisionRecord().catch((error) => {
    console.error('[updateManagerDecision] Decision write error:', error);
    throw error;
  });

  console.log('[updateManagerDecision] Updating application status to:', applicationStatus);

  const { error: applicationUpdateError } = await supabase
    .from('loan_applications')
    .update({
      application_status: applicationStatus,
      approved_amount: approvedAmount,
      interest_rate: interestRate || application.interest_rate,
      loan_tenure_months: loanTenureMonths || application.loan_tenure_months || application.loan_tenure || null,
      assigned_employee: managerId,
      updated_at: updatedAt,
    })
    .eq('application_id', applicationId);

  if (applicationUpdateError) {
    console.error('[updateManagerDecision] Application update error:', applicationUpdateError);
    throw applicationUpdateError;
  }

  console.log('[updateManagerDecision] Core operations successful');

  let generatedDecisionDocument = null;
  try {
    if (decisionOutcome === 'approved' || decisionOutcome === 'rejected') {
      const documentType = decisionOutcome === 'approved' ? 'Approval Letter' : 'Rejection Letter';
      const decisionMeta = {
        documentType,
        applicationId,
        applicationNumber: application.application_number,
        applicantName: applicantProfile?.full_name || applicantProfile?.fullName || payload.applicantName || 'Applicant',
        loanType: application.loan_type,
        applicationDate: application.submitted_at || application.created_at || updatedAt,
        decisionDate: updatedAt,
        officerName: payload.managerName || payload.manager_name || managerId,
        requestedAmount: application.requested_amount,
        eligibleAmount: application.eligible_amount ?? application.recommended_amount ?? application.requested_amount,
        sanctionedAmount: approvedAmount,
        interestRate: decisionOutcome === 'approved' ? interestRate : application.interest_rate,
        loanTenureMonths: loanTenureMonths || application.loan_tenure_months || null,
        monthlyEmi,
        rejectionReason,
        officerRemarks: payload.remarks || '',
        qrPayload: `${applicationId}|${documentType}|${updatedAt}`,
      };

      const { buffer, fileName, storagePath } = await buildDecisionPdfDocument(decisionMeta);
      const uploaded = await uploadDecisionPdf({
        supabase,
        bucket: DOCUMENT_BUCKET,
        applicationId,
        documentType,
        fileBuffer: buffer,
        fileName,
        storagePath,
      });

      const generatedDocumentPayload = {
        application_id: applicationId,
        document_type: documentType,
        file_name: uploaded.fileName || fileName,
        storage_path: uploaded.storagePath,
        public_url: uploaded.publicUrl || uploaded.signedUrl || null,
        created_at: updatedAt,
      };

      const { error: generatedDocumentError } = await supabase
        .from('generated_documents')
        .insert(generatedDocumentPayload);

      if (generatedDocumentError) {
        console.warn('[updateManagerDecision] Generated document insert warning:', generatedDocumentError);
      }

      try {
        await insertAuditLog(
          applicationId,
          managerId,
          'PDF Generated',
          `${documentType} created and stored successfully.`
        );
      } catch (pdfAuditError) {
        console.warn('[updateManagerDecision] PDF audit insertion failed:', pdfAuditError);
      }

      generatedDecisionDocument = {
        ...generatedDocumentPayload,
        signedUrl: uploaded.signedUrl || uploaded.publicUrl || null,
      };
    }
  } catch (pdfError) {
    console.warn('[updateManagerDecision] PDF generation failed:', pdfError);
  }

  // Only generate document if fileUrl is explicitly provided
  if (payload.fileUrl || payload.file_url) {
    try {
      const documentType =
        decisionOutcome === 'approved' ? 'approval' :
        decisionOutcome === 'rejected' ? 'rejection' :
        'decision';
      
      const generatedFileUrl = await uploadDocumentToStorage(applicationId, documentType, payload.fileUrl || payload.file_url || '');
      
      // Only insert if we got a valid URL
      if (generatedFileUrl) {
        const { error: generatedDocumentError } = await supabase.from('generated_documents').insert({
          application_id: applicationId,
          document_name: documentType === 'approval' ? 'Approval Letter' : documentType === 'rejection' ? 'Rejection Letter' : 'Decision Document',
          document_type: documentType,
          file_url: generatedFileUrl,
          generated_by: managerId,
          generated_at: updatedAt,
        });

        if (generatedDocumentError) {
          console.warn('[updateManagerDecision] Could not insert generated document:', generatedDocumentError);
        }
      }
    } catch (docError) {
      console.warn('[updateManagerDecision] Document generation failed:', docError);
    }
  }

  try {
    await insertAuditLog(
      applicationId,
      managerId || application.customer_id,
      decisionOutcome === 'approved'
        ? 'Loan Approved'
        : decisionOutcome === 'rejected'
          ? 'Loan Rejected'
          : 'Manager Decision Recorded',
      payload.remarks || 'Manager decision recorded.'
    );
  } catch (auditError) {
    console.warn('[updateManagerDecision] Audit log insertion failed:', auditError);
  }

  try {
    await safeInsertNotification(
      application.customer_id,
      decisionOutcome === 'approved'
        ? 'Loan Approved'
        : decisionOutcome === 'rejected'
          ? 'Loan Rejected'
          : 'Application Update',
      decisionOutcome === 'approved'
        ? `Your loan has been approved. Your Loan Sanction Letter is now available for download.`
        : decisionOutcome === 'rejected'
        ? `Your loan application has been rejected. Your Rejection Letter is available for download.`
        : `Your application ${applicationId} has been updated.`,
      applicationId
      );
  } catch (notifError) {
    console.warn('[updateManagerDecision] Customer notification failed:', notifError);
  }

  if (managerId) {
    try {
      await safeInsertNotification(
        managerId,
        'Decision Recorded',
        `Decision for application ${applicationId} has been saved successfully.`,
        applicationId
      );
    } catch (managerNotifError) {
      console.warn('[updateManagerDecision] Manager notification failed:', managerNotifError);
    }
  }

  return getApplicationById(applicationId);
}

async function getNotifications(userId) {
  let lastError = null;

  for (const schema of notificationSchemas) {
    try {
      let query = supabase.from('notifications').select('*');
      if (userId) {
        query = query.eq(schema.recipient, userId);
      }

      const notifications = await runQuery(query.order(schema.createdAt, { ascending: false }));
      return notifications.map(formatNotification);
    } catch (error) {
      lastError = error;
      if (!isMissingNotificationColumnError(error)) {
        throw error;
      }
    }
  }

  if (lastError) {
    console.warn('[notifications] Returning empty list due to schema mismatch:', lastError?.message || lastError);
  }

  return [];
}

async function markNotificationRead(notificationId) {
  let lastError = null;

  for (const schema of notificationSchemas) {
    const updatePayload = {
      [schema.read]: true,
    };

    const { error } = await supabase
      .from('notifications')
      .update(updatePayload)
      .eq(schema.id, notificationId);

    if (!error) return { message: 'Notification marked as read' };

    lastError = error;
    if (!isMissingNotificationColumnError(error)) break;
  }

  if (lastError) throw lastError;
  return { message: 'Notification marked as read' };
}

function buildProfileLoginResult(profile, maps) {
  const employee = maps.employeesByProfileId.get(String(profile.id)) || null;

  if (String(profile.role || '').toLowerCase() === 'employee' || employee) {
    const designation = displayEmployeeDesignation(employee?.designation || profile?.role || 'employee') || 'Loan Officer';
    return {
      tokenPayload: {
        sub: String(profile.id),
        roleType: 'employee',
        role: designation,
        profileId: profile.id,
        employeeId: employee?.employee_id || null,
      },
      roleType: 'employee',
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: designation,
      },
      profile,
      employee: employee
        ? {
            employeeId: employee.employee_id,
            profileId: employee.profile_id,
            designation: displayEmployeeDesignation(employee.designation) || 'Loan Officer',
            department: employee.department || '',
            branch: employee.branch || '',
            status: employee.status || '',
          }
        : {
            employeeId: null,
            profileId: profile.id,
            designation,
            department: '',
            branch: '',
            status: 'active',
          },
    };
  }

  return {
    tokenPayload: {
      sub: String(profile.id),
      roleType: 'customer',
      role: 'customer',
      profileId: profile.id,
    },
    roleType: 'customer',
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      phone: profile.mobile,
      role: 'customer',
    },
    profile,
    employee: null,
  };
}

async function loginUser(username, password) {
  if (!username || !password) {
    const error = new Error('Username/Email and Password are required.');
    error.statusCode = 400;
    throw error;
  }

  const [profiles, employees] = await Promise.all([fetchAllProfiles(), fetchAllEmployees()]);
  const maps = buildProfileMaps(profiles, employees);

  const profile = resolveProfileByLogin(username, maps);
  if (profile && matchesPassword(profile, password)) {
    return buildProfileLoginResult(profile, maps);
  }

  if (profile?.email && profile.is_active !== false) {
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (!authError && authData.user?.email?.toLowerCase() === String(profile.email).toLowerCase()) {
      return buildProfileLoginResult(profile, maps);
    }
  }

  const employee = resolveEmployeeByLogin(username, maps);
  if (employee && matchesPassword(employee, password)) {
    const employeeProfile = maps.profilesById.get(String(employee.profile_id)) || null;
    const designation = displayEmployeeDesignation(employee.designation) || 'Loan Officer';
    return {
      tokenPayload: {
        sub: String(employeeProfile?.id || employee.profile_id || employee.employee_id),
        roleType: 'employee',
        role: designation,
        profileId: employeeProfile?.id || employee.profile_id || null,
        employeeId: employee.employee_id,
      },
      roleType: 'employee',
      user: {
        id: employeeProfile?.id || employee.profile_id || employee.employee_id,
        email: employeeProfile?.email || employee.email || '',
        fullName: employeeProfile?.full_name || employee.full_name || '',
        role: designation,
      },
      profile: employeeProfile,
      employee: {
        employeeId: employee.employee_id,
        profileId: employee.profile_id,
        designation,
        department: employee.department || '',
        branch: employee.branch || '',
        status: employee.status || 'active',
      },
    };
  }

  const error = new Error('Invalid credentials. Please check your email and password.');
  error.statusCode = 401;
  throw error;
}

async function getDemoAccounts() {
  return fetchDemoAccounts();
}

async function updateCurrentUserProfile(auth, payload = {}) {
  const fullName = String(payload.fullName || payload.full_name || '').trim();
  const email = String(payload.email || '').trim();

  if (!fullName && !email) {
    const error = new Error('At least one profile field is required.');
    error.statusCode = 400;
    throw error;
  }

  const { profile, employee } = await fetchCurrentIdentity(auth);
  if (!profile && !employee) {
    const error = new Error('Authenticated user record was not found.');
    error.statusCode = 404;
    throw error;
  }

  const updates = [];

  if (profile) {
    const profilePatch = buildProfilePatch(profile, {
      fullName: fullName || profile.full_name || profile.fullName || '',
      email: email || profile.email || '',
    });
    if (Object.keys(profilePatch).length > 0) {
      updates.push(supabase.from('profiles').update(profilePatch).eq('id', profile.id));
    }
  }

  if (employee) {
    const employeePatch = buildProfilePatch(employee, {
      fullName: fullName || employee.full_name || employee.fullName || '',
      email: email || employee.email || '',
    });
    if (Object.keys(employeePatch).length > 0) {
      const query = employee.employee_id
        ? supabase.from('employees').update(employeePatch).eq('employee_id', employee.employee_id)
        : supabase.from('employees').update(employeePatch).eq('profile_id', employee.profile_id);
      updates.push(query);
    }
  }

  await Promise.all(updates.map(runQuery));

  const updatedProfile = profile
    ? {
        ...profile,
        full_name: fullName || profile.full_name || profile.fullName || '',
        email: email || profile.email || '',
      }
    : null;

  const updatedEmployee = employee
    ? {
        ...employee,
        full_name: fullName || employee.full_name || employee.fullName || '',
        email: email || employee.email || '',
      }
    : null;

  return {
    profile: updatedProfile,
    employee: updatedEmployee,
  };
}

async function updateCurrentUserPassword(auth, payload = {}) {
  const currentPassword = String(payload.currentPassword || payload.current_password || '');
  const newPassword = String(payload.newPassword || payload.new_password || '');

  if (!currentPassword || !newPassword) {
    const error = new Error('Current password and new password are required.');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  const { profile, employee } = await fetchCurrentIdentity(auth);
  const passwordSource = [profile, employee].find((record) => record && matchesPassword(record, currentPassword));

  if (!passwordSource) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 401;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updates = [];

  if (profile) {
    const profilePatch = buildPasswordPatch(profile, passwordHash);
    if (Object.keys(profilePatch).length > 0) {
      updates.push(supabase.from('profiles').update(profilePatch).eq('id', profile.id));
    }
  }

  if (employee) {
    const employeePatch = buildPasswordPatch(employee, passwordHash);
    if (Object.keys(employeePatch).length > 0) {
      const query = employee.employee_id
        ? supabase.from('employees').update(employeePatch).eq('employee_id', employee.employee_id)
        : supabase.from('employees').update(employeePatch).eq('profile_id', employee.profile_id);
      updates.push(query);
    }
  }

  await Promise.all(updates.map(runQuery));

  return { message: 'Password updated successfully.' };
}

// ─── Row mappers for real credit detail data ─────────────────────────────────

function mapExistingLoanRows(rows = []) {
  return rows.map((row) => ({
    loanAccountNo: row.loan_account_no || row.account_no || row.loan_id || '',
    loanType: row.loan_type || row.loanType || '',
    bankName: row.bank_name || row.lender_name || row.bankName || '',
    originalAmount: toNumber(row.original_amount || row.loan_amount || row.sanction_amount, 0),
    outstandingAmount: toNumber(row.outstanding_amount || row.outstanding_balance, 0),
    monthlyEmi: toNumber(row.emi_amount || row.monthly_emi, 0),
    interestRate: toNumber(row.interest_rate, 0),
    startDate: row.start_date || row.loan_start_date || '',
    tenure: row.loan_tenure
      ? `${row.loan_tenure} Months`
      : row.tenure_months
        ? `${row.tenure_months} Months`
        : row.remaining_tenure
          ? `${row.remaining_tenure} Months`
          : row.remaining_tenure_months
            ? `${row.remaining_tenure_months} Months`
            : '',
    remainingTenure: row.remaining_tenure
      ? `${row.remaining_tenure} Months`
      : row.remaining_tenure_months
        ? `${row.remaining_tenure_months} Months`
        : '',
    closedDate: row.closed_date || row.closure_date || row.end_date || row.closed_at || '',
    status: row.loan_status || row.status || 'Active',
    paymentRating: row.payment_rating || row.repayment_rating || '',
  }));
}

function mapEmiHistoryRows(rows = []) {
  return rows.map((row) => ({
    loan: row.loan_type || row.loan_name || '',
    emiAmount: toNumber(row.emi_amount, 0),
    dueDate: row.due_date || '',
    paymentStatus: row.payment_status || row.status || 'Pending',
  }));
}

function mapLoanDefaultRows(rows = []) {
  return rows.map((row) => ({
    loan: row.loan_type || row.loan_name || '',
    defaultDate: row.default_date || row.created_at || '',
    daysPastDue: toNumber(row.days_past_due || row.dpd, 0),
    currentStatus: row.current_status || row.status || '',
    remarks: row.remarks || row.description || '',
  }));
}

function mapMissedEmiRows(rows = []) {
  return rows.map((row) => ({
    installmentNumber: row.installment_number || row.emi_number || '',
    dueDate: row.due_date || '',
    amount: toNumber(row.amount || row.emi_amount, 0),
    paidDate: row.paid_date || row.payment_date || '',
    status: row.status || row.payment_status || '',
    delayDays: toNumber(row.delay_days || row.days_delayed || row.dpd, 0),
  }));
}

// ─── Verification reject / request docs ──────────────────────────────────────

async function rejectVerificationApplication(applicationId, payload = {}) {
  const { data: application, error: applicationError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const updatedAt = nowIso();
  const officerId = payload.officerId || payload.officer_id || null;
  const remarks = payload.remarks || 'Application rejected at verification stage.';

  const { error: appUpdateError } = await supabase
    .from('loan_applications')
    .update({
      application_status: dbLoanStatus('Rejected'),
      assigned_employee: officerId,
      updated_at: updatedAt,
    })
    .eq('application_id', applicationId);

  if (appUpdateError) throw appUpdateError;

  const kycPatch = {
    application_id: applicationId,
    overall_status: 'rejected',
    officer_remarks: remarks,
    verified_by: officerId,
    verification_completed_at: updatedAt,
    updated_at: updatedAt,
  };

  const { error: kycError } = await supabase
    .from('kyc_verifications')
    .upsert(kycPatch, { onConflict: 'application_id' });

  if (kycError) throw kycError;

  await insertAuditLog(
    applicationId,
    officerId || application.customer_id,
    'Application Rejected',
    remarks
  );

  await safeInsertNotification(
    application.customer_id,
    'Application Rejected',
    `Your loan application ${applicationId} has been rejected at the verification stage. Reason: ${remarks}`,
    applicationId
  );

  return getApplicationById(applicationId);
}

async function requestAdditionalDocumentsAtVerification(applicationId, payload = {}) {
  const { data: application, error: applicationError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const updatedAt = nowIso();
  const officerId = payload.officerId || payload.officer_id || null;
  const remarks = payload.remarks || 'Additional documents required for verification.';

  const { error: appUpdateError } = await supabase
    .from('loan_applications')
    .update({
      application_status: dbLoanStatus('Additional Documents Required'),
      assigned_employee: officerId,
      updated_at: updatedAt,
    })
    .eq('application_id', applicationId);

  if (appUpdateError) throw appUpdateError;

  await insertAuditLog(
    applicationId,
    officerId || application.customer_id,
    'Additional Documents Requested',
    remarks
  );

  await safeInsertNotification(
    application.customer_id,
    'Additional Documents Required',
    `Your loan application ${applicationId} requires additional documents. Please upload: ${remarks}`,
    applicationId
  );

  return getApplicationById(applicationId);
}

async function forwardToLoanOfficer(applicationId, payload = {}) {
  const { data: application, error: applicationError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  // Validate remarks
  if (!payload.remarks || !String(payload.remarks).trim()) {
    const err = new Error('Officer remarks are mandatory');
    err.statusCode = 400;
    throw err;
  }

  // Check if application is already in a terminal state
  const currentStatus = String(application.application_status || '').toLowerCase();
  if (currentStatus.includes('reject') || currentStatus.includes('approved') || currentStatus.includes('closed')) {
    const err = new Error('Application is already in a terminal state and cannot be forwarded');
    err.statusCode = 400;
    throw err;
  }

  const updatedAt = nowIso();
  const officerId = payload.officerId || payload.officer_id || null;
  const remarks = String(payload.remarks).trim();

  // Get next available loan officer (credit review role)
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .or('designation.ilike.%credit%,designation.ilike.%loan%,designation.ilike.%review%');

  if (employeesError) {
    console.warn('[forwardToLoanOfficer] Could not fetch loan officers:', employeesError);
  }

  // Select the next available officer (round-robin or first available)
  const assignedOfficer = employees && employees.length > 0 
    ? employees.find(e => e.employee_id !== officerId) || employees[0]
    : null;

  const assignedOfficerId = assignedOfficer?.employee_id || assignedOfficer?.profile_id || null;

  const { error: appUpdateError } = await supabase
    .from('loan_applications')
    .update({
      application_status: dbLoanStatus('Credit Review'),
      assigned_employee: assignedOfficerId,
      updated_at: updatedAt,
    })
    .eq('application_id', applicationId);

  if (appUpdateError) throw appUpdateError;

  await insertAuditLog(
    applicationId,
    officerId || application.customer_id,
    'Forwarded to Loan Officer',
    remarks
  );

  await safeInsertNotification(
    application.customer_id,
    'Application Forwarded',
    `Your loan application ${applicationId} has been forwarded to credit review.`,
    applicationId
  );

  if (assignedOfficerId) {
    await safeInsertNotification(
      assignedOfficerId,
      'New Assignment',
      `A new application has been assigned for Credit Review. Application ID: ${applicationId}`,
      applicationId
    );
  }

  return getApplicationById(applicationId);
}

async function escalateApplication(applicationId, payload = {}) {
  const { data: application, error: applicationError } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  // Validate reason
  if (!payload.reason || !String(payload.reason).trim()) {
    const err = new Error('Escalation reason is mandatory');
    err.statusCode = 400;
    throw err;
  }

  // Check if application is already in a terminal state
  const currentStatus = String(application.application_status || '').toLowerCase();
  if (currentStatus.includes('reject') || currentStatus.includes('approved') || currentStatus.includes('closed')) {
    const err = new Error('Application is already in a terminal state and cannot be escalated');
    err.statusCode = 400;
    throw err;
  }

  const updatedAt = nowIso();
  const officerId = payload.officerId || payload.officer_id || null;
  const reason = String(payload.reason).trim();

  const { error: appUpdateError } = await supabase
    .from('loan_applications')
    .update({
      application_status: dbLoanStatus('Escalated'),
      assigned_employee: officerId,
      updated_at: updatedAt,
    })
    .eq('application_id', applicationId);

  if (appUpdateError) throw appUpdateError;

  await insertAuditLog(
    applicationId,
    officerId || application.customer_id,
    'Application Escalated',
    reason
  );

  // Get managers to notify
  const { data: managers, error: managersError } = await supabase
    .from('employees')
    .select('*')
    .or('designation.ilike.%manager%,designation.ilike.%lead%,designation.ilike.%head%');

  if (managersError) {
    console.warn('[escalateApplication] Could not fetch managers:', managersError);
  }

  // Notify all managers
  if (managers && managers.length > 0) {
    for (const manager of managers) {
      const managerId = manager.employee_id || manager.profile_id;
      if (managerId) {
        await safeInsertNotification(
          managerId,
          'Application Escalated',
          `Application ${applicationId} has been escalated. Reason: ${reason}`,
          applicationId
        );
      }
    }
  }

  return getApplicationById(applicationId);
}

// ─── Signed / public URL for documents ───────────────────────────────────────

async function getDocumentUrl(storagePath, fileUrl) {
  // If we have a storage path (not a full URL), generate a signed URL
  if (storagePath && !storagePath.startsWith('http')) {
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (!error && data?.signedUrl) {
      return { url: data.signedUrl, type: 'signed' };
    }

    // Fallback: try public URL
    const { data: publicData } = supabase.storage
      .from(DOCUMENT_BUCKET)
      .getPublicUrl(storagePath);

    if (publicData?.publicUrl) {
      return { url: publicData.publicUrl, type: 'public' };
    }
  }

  // If fileUrl is already a full URL, return it
  if (fileUrl && /^https?:\/\//i.test(fileUrl)) {
    return { url: fileUrl, type: 'direct' };
  }

  // Try to extract path from a full URL stored in fileUrl
  if (fileUrl && fileUrl.includes('/storage/v1/object/')) {
    const pathMatch = fileUrl.match(/\/object\/(?:public|sign)\/([^?]+)/);
    if (pathMatch) {
      const extractedPath = pathMatch[1].replace(/^[^/]+\//, ''); // remove bucket prefix
      const { data, error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(extractedPath, 3600);

      if (!error && data?.signedUrl) {
        return { url: data.signedUrl, type: 'signed' };
      }
    }

    return { url: fileUrl, type: 'direct' };
  }

  return { url: null, type: 'unavailable' };
}

module.exports = {
  getApplications,
  getApplicationById,
  createApplication,
  updateVerification,
  updateCreditReview,
  updateManagerDecision,
  rejectVerificationApplication,
  requestAdditionalDocumentsAtVerification,
  forwardToLoanOfficer,
  escalateApplication,
  getDocumentUrl,
  getNotifications,
  markNotificationRead,
  deleteNotification,
  loginUser,
  insertAuditLog,
  insertNotification,
  fetchAllProfiles,
  fetchAllEmployees,
  fetchDemoAccounts,
  getDemoAccounts,
  buildProfileMaps,
  resolvePerformerName,
  mapApplicationRow,
  mapExistingLoanRows,
  mapEmiHistoryRows,
  mapLoanDefaultRows,
  mapMissedEmiRows,
  updateCurrentUserProfile,
  updateCurrentUserPassword,
};
