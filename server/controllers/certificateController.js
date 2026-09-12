const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const timeService = require('../utils/timeService');
const { createFollowUpSchedule } = require('../services/followUpEngine');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * Generate a clean course code abbreviation (e.g. "Full Stack Development" -> "FSD")
 */
const generateCourseCode = (courseName) => {
  if (!courseName) return 'SKILL';
  const words = courseName.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  const code = words.map((w) => w[0]).join('').substring(0, 4).toUpperCase();
  return code || 'SKILL';
};

/**
 * Generate unique human-readable certificate number e.g. CERT-2026-FSD-000184
 */
const generateUniqueCertificateNumber = async (courseName) => {
  const year = new Date().getFullYear();
  const code = generateCourseCode(courseName);
  let isUnique = false;
  let certNumber = '';

  while (!isUnique) {
    // Generate 6 random alphanumeric characters
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    certNumber = `CERT-${year}-${code}-${randomSuffix}`;
    const existing = await Certificate.findOne({ certificateNumber: certNumber });
    if (!existing) {
      isUnique = true;
    }
  }
  return certNumber;
};

/**
 * Generate a 10-char secure random uppercase verification code
 */
const generateUniqueVerificationCode = async () => {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid ambiguous chars 0, 1, I, O
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    const bytes = crypto.randomBytes(10);
    code = '';
    for (let i = 0; i < 10; i++) {
      code += charset[bytes[i] % charset.length];
    }
    const existing = await Certificate.findOne({ verificationCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

/**
 * POST /api/certificates/issue/:enrollmentId
 * Provider issues a certificate for an enrolled trainee whose status is COMPLETED
 */
const issueCertificate = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const provider = await getProviderRecord(req.user._id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    // Find enrollment
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('courseId')
      .populate('batchId')
      .populate('traineeId');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
    }

    // Verify ownership: Provider can only issue certificates for their own enrollments
    if (enrollment.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only issue certificates for your own training programs.',
      });
    }

    // Verify eligibility: Status must be COMPLETED
    if (enrollment.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot issue certificate. Training status is ${enrollment.status}. Only COMPLETED trainees are eligible for certificate issuance.`,
      });
    }

    // Check for existing certificate
    const existingCert = await Certificate.findOne({ enrollmentId: enrollment._id });
    if (existingCert) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already issued for this enrollment.',
        data: existingCert,
      });
    }

    // Generate credentials
    const certificateNumber = await generateUniqueCertificateNumber(enrollment.courseId?.courseName);
    const verificationCode = await generateUniqueVerificationCode();
    const logicalNow = await timeService.getCurrentDate();

    const certificate = await Certificate.create({
      certificateNumber,
      traineeId: enrollment.traineeId._id,
      enrollmentId: enrollment._id,
      courseId: enrollment.courseId._id,
      batchId: enrollment.batchId._id,
      providerId: provider._id,
      issueDate: logicalNow,
      issuedBy: req.user._id,
      status: 'ISSUED',
      verificationCode,
    });

    // Automatically initialize follow-up schedule
    await createFollowUpSchedule({
      traineeId: enrollment.traineeId._id,
      enrollmentId: enrollment._id,
      certificateId: certificate._id,
      providerId: provider._id,
      certIssueDate: logicalNow,
    });

    const populated = await Certificate.findById(certificate._id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username email' },
      })
      .populate('courseId', 'courseName category duration skills')
      .populate('batchId', 'batchName startDate endDate mode location')
      .populate('providerId', 'organizationName contactPerson phone address')
      .populate('issuedBy', 'name username');

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully and longitudinal follow-up schedule initialized.',
      data: populated,
    });
  } catch (error) {
    console.error('issueCertificate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/certificates
 * Admin: all certificates with filters. Provider: own certificates only.
 */
const getCertificates = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    } else if (req.user.role === 'ADMIN') {
      if (req.query.providerId && req.query.providerId !== 'ALL') {
        filter.providerId = req.query.providerId;
      }
    }

    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    if (req.query.courseId && req.query.courseId !== 'ALL') {
      filter.courseId = req.query.courseId;
    }
    if (req.query.batchId && req.query.batchId !== 'ALL') {
      filter.batchId = req.query.batchId;
    }

    const certificates = await Certificate.find(filter)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username email' },
      })
      .populate('courseId', 'courseName category duration skills')
      .populate('batchId', 'batchName startDate endDate mode location')
      .populate('providerId', 'organizationName contactPerson phone address')
      .populate('issuedBy', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/certificates/my
 * Trainee views all certificates awarded to them
 */
const getMyCertificates = async (req, res) => {
  try {
    const trainee = await Trainee.findOne({ userId: req.user._id });
    if (!trainee) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const certificates = await Certificate.find({ traineeId: trainee._id })
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username email' },
      })
      .populate('courseId', 'courseName category duration skills description')
      .populate('batchId', 'batchName startDate endDate mode location')
      .populate('providerId', 'organizationName contactPerson phone address')
      .populate('issuedBy', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/certificates/:id
 * Get single certificate by ID (with RBAC isolation)
 */
const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username email' },
      })
      .populate('courseId', 'courseName category duration skills description')
      .populate('batchId', 'batchName startDate endDate mode location')
      .populate('providerId', 'organizationName contactPerson phone address')
      .populate('issuedBy', 'name username');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    // Role-based access checks
    if (req.user.role === 'TRAINEE') {
      const trainee = await Trainee.findOne({ userId: req.user._id });
      if (!trainee || certificate.traineeId._id.toString() !== trainee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } else if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || certificate.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.json({ success: true, data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/certificates/:id/revoke
 * Admin only: Revokes an issued certificate (record is preserved permanently)
 */
const revokeCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    certificate.status = 'REVOKED';
    await certificate.save();

    const updated = await Certificate.findById(certificate._id)
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name username email' },
      })
      .populate('courseId', 'courseName category')
      .populate('providerId', 'organizationName');

    res.json({
      success: true,
      message: 'Certificate has been revoked successfully.',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/certificates/verify/:code
 * Public verification endpoint (No auth required!)
 * Verifies certificate via verificationCode OR certificateNumber
 * Exposes ONLY non-sensitive privacy-safe details
 */
const verifyCertificatePublic = async (req, res) => {
  try {
    const rawCode = req.params.code.trim();
    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'Verification code or certificate number is required.' });
    }

    const code = rawCode.toUpperCase();

    // Query by verificationCode or certificateNumber
    const certificate = await Certificate.findOne({
      $or: [{ verificationCode: code }, { certificateNumber: code }],
    })
      .populate({
        path: 'traineeId',
        populate: { path: 'userId', select: 'name' },
      })
      .populate('courseId', 'courseName category duration skills')
      .populate('batchId', 'batchName mode startDate endDate')
      .populate('providerId', 'organizationName');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid.',
      });
    }

    // Return strictly privacy-safe sanitized payload
    res.json({
      success: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        status: certificate.status, // 'ISSUED' or 'REVOKED'
        isValid: certificate.status === 'ISSUED',
        issueDate: certificate.issueDate,
        traineeName: certificate.traineeId?.userId?.name || 'Verified Trainee',
        courseName: certificate.courseId?.courseName || 'Training Course',
        courseCategory: certificate.courseId?.category || '',
        batchName: certificate.batchId?.batchName || '',
        batchMode: certificate.batchId?.mode || '',
        providerName: certificate.providerId?.organizationName || 'Authorized Training Provider',
        skills: certificate.courseId?.skills || [],
      },
    });
  } catch (error) {
    console.error('verifyCertificatePublic error:', error);
    res.status(500).json({ success: false, message: 'Verification lookup failed.' });
  }
};

/**
 * GET /api/certificates/stats
 * Returns certification funnel statistics
 */
const getCertificationStats = async (req, res) => {
  try {
    let enrollFilter = {};
    let certFilter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) {
        return res.json({
          success: true,
          data: {
            totalEnrolled: 0,
            completed: 0,
            inProgress: 0,
            dropped: 0,
            certified: 0,
            pendingCertification: 0,
            revoked: 0,
          },
        });
      }
      enrollFilter.providerId = provider._id;
      certFilter.providerId = provider._id;
    }

    const [
      totalEnrolled,
      completed,
      inProgress,
      dropped,
      certified,
      revoked,
    ] = await Promise.all([
      Enrollment.countDocuments(enrollFilter),
      Enrollment.countDocuments({ ...enrollFilter, status: 'COMPLETED' }),
      Enrollment.countDocuments({ ...enrollFilter, status: 'ENROLLED' }),
      Enrollment.countDocuments({ ...enrollFilter, status: 'DROPPED' }),
      Certificate.countDocuments({ ...certFilter, status: 'ISSUED' }),
      Certificate.countDocuments({ ...certFilter, status: 'REVOKED' }),
    ]);

    const pendingCertification = Math.max(0, completed - certified);

    res.json({
      success: true,
      data: {
        totalEnrolled,
        completed,
        inProgress,
        dropped,
        certified,
        pendingCertification,
        revoked,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  issueCertificate,
  getCertificates,
  getMyCertificates,
  getCertificateById,
  revokeCertificate,
  verifyCertificatePublic,
  getCertificationStats,
};
