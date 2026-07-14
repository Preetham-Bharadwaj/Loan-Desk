const loanService = require('../services/loanService');
const { displayEmployeeDesignation } = require('../utils/statusMaps');

function handleServiceError(res, error, fallbackMessage = 'An internal server error occurred') {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    fallbackMessage;

  return res.status(500).json({ message });
}

function parseMaybeJson(value, fallback = undefined) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildApplyLoanPayload(req) {
  const body = req.body || {};
  const filesByField = {};
  Object.entries(req.files || {}).forEach(([field, files]) => {
    if (Array.isArray(files) && files.length > 0) {
      filesByField[field] = files[0];
    }
  });

  return {
    ...body,
    customerId: body.customerId || body.customer_id,
    loanType: body.loanType || body.loan_type,
    amount: body.amount,
    tenureMonths: body.tenureMonths || body.loanTenure || body.loan_tenure,
    purpose: body.purpose,
    applicantDetails: parseMaybeJson(body.applicantDetails || body.applicant_details, {}),
    employmentDetails: parseMaybeJson(body.employmentDetails || body.employment_details, {}),
    documents: {
      aadhaar: filesByField.aadhaar || body.documents?.aadhaar || body.aadhaar || '',
      pan: filesByField.pan || body.documents?.pan || body.pan || '',
      salarySlip: filesByField.salarySlip || body.documents?.salarySlip || body.salarySlip || '',
      bankStatement: filesByField.bankStatement || body.documents?.bankStatement || body.bankStatement || '',
      photo: filesByField.photo || body.documents?.photo || body.photo || '',
      businessDocs: filesByField.businessDocs || body.documents?.businessDocs || body.businessDocs || '',
    },
    interestRate: body.interestRate || body.interest_rate,
  };
}

exports.getApplications = async (req, res) => {
  try {
    const applications = await loanService.getApplications(req.query);
    return res.status(200).json(applications);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const application = await loanService.getApplicationById(req.params.id);
    return res.status(200).json(application);
  } catch (error) {
    return handleServiceError(res, error, 'Application not found');
  }
};

exports.applyLoan = async (req, res) => {
  try {
    const result = await loanService.createApplication(buildApplyLoanPayload(req));
    const applicationId = result.applicationId || result.id;
    return res.status(201).json({
      message: 'Application submitted successfully',
      applicationId,
      id: applicationId,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.verifyApplication = async (req, res) => {
  try {
    const application = await loanService.updateVerification(req.params.id, req.body);
    return res.status(200).json({
      message: 'Verification details updated successfully.',
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.creditReview = async (req, res) => {
  try {
    const application = await loanService.updateCreditReview(req.params.id, req.body);
    return res.status(200).json({
      message: 'Credit review submitted successfully.',
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.managerDecision = async (req, res) => {
  try {
    const application = await loanService.updateManagerDecision(req.params.id, req.body);
    const decision = req.body.decision || req.body.decisionType || 'Update';
    return res.status(200).json({
      message: `Decision '${decision}' recorded successfully.`,
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await loanService.getNotifications(req.query.userId);
    return res.status(200).json(notifications);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.readNotification = async (req, res) => {
  try {
    const result = await loanService.markNotificationRead(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, 'Notification not found');
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const result = await loanService.deleteNotification(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, 'Notification not found');
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const [profiles, employees] = await Promise.all([
      loanService.fetchAllProfiles(),
      loanService.fetchAllEmployees(),
    ]);

    const profileMap = new Map(profiles.map((profile) => [String(profile.id), profile]));
    const data = employees.map((employee) => {
      const profile = profileMap.get(String(employee.profile_id)) || {};
      return {
        id: employee.employee_id || employee.id || profile.id,
        profileId: employee.profile_id || profile.id,
        name: profile.full_name || employee.full_name || employee.employee_name || '',
        email: profile.email || employee.email || '',
        role: displayEmployeeDesignation(employee.designation || employee.role || profile.role || 'employee'),
        status: employee.status || 'active',
        department: employee.department || '',
        branch: employee.branch || '',
      };
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.getDemoAccounts = async (req, res) => {
  try {
    const accounts = await loanService.getDemoAccounts();
    return res.status(200).json(accounts);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const application = await loanService.rejectVerificationApplication(req.params.id, req.body);
    return res.status(200).json({
      message: 'Application rejected at verification stage.',
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.requestDocumentsVerification = async (req, res) => {
  try {
    const application = await loanService.requestAdditionalDocumentsAtVerification(req.params.id, req.body);
    return res.status(200).json({
      message: 'Additional documents requested.',
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.getDocumentSignedUrl = async (req, res) => {
  try {
    const { storagePath, fileUrl } = req.query;
    const result = await loanService.getDocumentUrl(storagePath, fileUrl);
    return res.status(200).json(result);
  } catch (error) {
    return handleServiceError(res, error, 'Unable to retrieve document URL');
  }
};

exports.forwardToLoanOfficer = async (req, res) => {
  try {
    const application = await loanService.forwardToLoanOfficer(req.params.id, req.body);
    return res.status(200).json({
      message: 'Application forwarded to loan officer successfully.',
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.escalateApplication = async (req, res) => {
  try {
    const application = await loanService.escalateApplication(req.params.id, req.body);
    return res.status(200).json({
      message: 'Application escalated successfully.',
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

exports.uploadAdditionalDocument = async (req, res) => {
  try {
    const file = req.files?.document?.[0] || req.files?.file?.[0] || null;
    const application = await loanService.uploadAdditionalDocument(req.params.id, {
      documentType: req.body.documentType || req.body.document_type,
      customerId: req.body.customerId || req.body.customer_id,
      file,
    });
    return res.status(200).json({
      message: 'Document uploaded successfully.',
      application,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};
