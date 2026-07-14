const express = require('express');
const router = express.Router();
const multer = require('multer');
const loanController = require('../controllers/loanController');

const upload = multer({ storage: multer.memoryStorage() });
const documentFields = upload.fields([
  { name: 'aadhaar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'salarySlip', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'businessDocs', maxCount: 1 },
  { name: 'generatedDocument', maxCount: 1 },
]);

// Standard API paths
router.get('/applications', loanController.getApplications);
router.get('/demo-accounts', loanController.getDemoAccounts);
router.post('/apply-loan', documentFields, loanController.applyLoan);
router.get('/application/:id', loanController.getApplicationById);
router.get('/employees', loanController.getEmployees);

// Support both URL patterns (body-based and URL param based)
router.put('/verification/:id', loanController.verifyApplication);
router.put('/verification', (req, res, next) => {
  req.params.id = req.body.id || req.body.applicationId;
  next();
}, loanController.verifyApplication);

router.put('/verification-reject/:id', loanController.rejectVerification);
router.put('/verification-request-docs/:id', loanController.requestDocumentsVerification);

router.put('/forward-to-officer/:id', loanController.forwardToLoanOfficer);
router.put('/forward-to-officer', (req, res, next) => {
  req.params.id = req.body.id || req.body.applicationId;
  next();
}, loanController.forwardToLoanOfficer);

router.put('/escalate/:id', loanController.escalateApplication);
router.put('/escalate', (req, res, next) => {
  req.params.id = req.body.id || req.body.applicationId;
  next();
}, loanController.escalateApplication);

router.post('/upload-document/:id', upload.fields([{ name: 'document', maxCount: 1 }, { name: 'file', maxCount: 1 }]), loanController.uploadAdditionalDocument);

router.put('/credit-review/:id', loanController.creditReview);
router.put('/credit-review', (req, res, next) => {
  req.params.id = req.body.id || req.body.applicationId;
  next();
}, loanController.creditReview);

router.put('/manager-decision/:id', loanController.managerDecision);
router.put('/manager-decision', (req, res, next) => {
  req.params.id = req.body.id || req.body.applicationId;
  next();
}, loanController.managerDecision);

// Document signed URL
router.get('/document-url', loanController.getDocumentSignedUrl);

// Notifications routes
router.get('/notifications', loanController.getNotifications);
router.put('/notifications/:id/read', loanController.readNotification);
router.delete('/notifications/:id', loanController.deleteNotification);

module.exports = router;
