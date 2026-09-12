const express = require('express');
const router = express.Router();
const {
  issueCertificate,
  getCertificates,
  getMyCertificates,
  getCertificateById,
  revokeCertificate,
  verifyCertificatePublic,
  getCertificationStats,
} = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Public route: Verify certificate by code or certificate number (NO AUTH REQUIRED)
router.get('/verify/:code', verifyCertificatePublic);

// Authenticated routes
router.use(protect);

// Certification funnel stats
router.get('/stats', authorize('ADMIN', 'PROVIDER'), getCertificationStats);

// Trainee view own certificates
router.get('/my', authorize('TRAINEE'), getMyCertificates);

// Provider issues certificate for completed enrollment
router.post('/issue/:enrollmentId', authorize('PROVIDER'), issueCertificate);

// Admin & Provider list certificates (filtered by role in controller)
router.get('/', authorize('ADMIN', 'PROVIDER'), getCertificates);

// Single certificate view (RBAC enforced in controller)
router.get('/:id', authorize('ADMIN', 'PROVIDER', 'TRAINEE'), getCertificateById);

// Admin revokes certificate
router.patch('/:id/revoke', authorize('ADMIN'), revokeCertificate);

module.exports = router;
