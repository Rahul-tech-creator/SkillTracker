const User = require('../models/User');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Trainee = require('../models/Trainee');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const bcrypt = require('bcryptjs');

/**
 * POST /api/providers
 * Admin creates a new provider account
 */
const createProvider = async (req, res) => {
  try {
    const {
      organizationName,
      contactPerson,
      phone,
      address,
      username,
      password,
      email,
      name,
    } = req.body;

    if (!organizationName || !contactPerson || !phone || !username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'organizationName, contactPerson, phone, name, username, and password are required.',
      });
    }

    // Check if username already taken
    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already in use.' });
    }

    // Create User record first
    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      email: email || null,
      password,
      role: 'PROVIDER',
      status: 'ACTIVE',
    });

    // Create Provider profile linked to that User
    const provider = await Provider.create({
      userId: user._id,
      organizationName,
      contactPerson,
      phone,
      address: address || '',
      status: 'ACTIVE',
    });

    res.status(201).json({
      success: true,
      message: 'Provider created successfully.',
      data: {
        provider,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error('createProvider error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/providers
 * Admin: all providers. Provider: own record only.
 */
const getProviders = async (req, res) => {
  try {
    let providers;
    if (req.user.role === 'ADMIN') {
      providers = await Provider.find().populate('userId', 'name username email status createdAt');
    } else {
      // Provider can only see their own record
      providers = await Provider.find({ userId: req.user._id }).populate(
        'userId',
        'name username email status createdAt'
      );
    }
    res.json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/providers/:id
 */
const getProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).populate(
      'userId',
      'name username email status createdAt'
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    // Provider can only view their own record
    if (
      req.user.role === 'PROVIDER' &&
      provider.userId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/providers/:id
 * Admin updates provider details
 */
const updateProvider = async (req, res) => {
  try {
    const { organizationName, contactPerson, phone, address, name, email } = req.body;

    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    // Update Provider profile fields
    if (organizationName !== undefined) provider.organizationName = organizationName;
    if (contactPerson !== undefined) provider.contactPerson = contactPerson;
    if (phone !== undefined) provider.phone = phone;
    if (address !== undefined) provider.address = address;
    await provider.save();

    // Update User fields if provided
    if (name !== undefined || email !== undefined) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (email) userUpdate.email = email;
      await User.findByIdAndUpdate(provider.userId, userUpdate);
    }

    const updated = await Provider.findById(provider._id).populate(
      'userId',
      'name username email status'
    );

    res.json({ success: true, message: 'Provider updated.', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/providers/:id/status
 * Admin activates or deactivates a provider
 */
const updateProviderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE.' });
    }

    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    provider.status = status;
    await provider.save();

    // Also update the linked User so login is blocked immediately
    await User.findByIdAndUpdate(provider.userId, { status });

    res.json({
      success: true,
      message: `Provider ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`,
      data: provider,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/providers/:id/reset-password
 * Admin resets provider password
 */
const resetProviderPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    // The pre-save hook on User will hash the new password
    const user = await User.findById(provider.userId).select('+password');
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const Consent = require('../models/Consent');
const FollowUp = require('../models/FollowUp');
const OutcomeRecord = require('../models/OutcomeRecord');

/**
 * GET /api/admin/stats
 * Admin dashboard summary counts
 */
const getAdminStats = async (req, res) => {
  try {
    const [
      providers,
      courses,
      batches,
      trainees,
      enrollments,
      completed,
      certified,
      revokedCertificates,
      consentGranted,
      consentDeclined,
      followUpsDue,
      followUpsCompleted,
      employed,
      selfEmployed,
      apprentices,
      unemployed,
    ] = await Promise.all([
      Provider.countDocuments(),
      Course.countDocuments(),
      Batch.countDocuments(),
      Trainee.countDocuments(),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'COMPLETED' }),
      Certificate.countDocuments({ status: 'ISSUED' }),
      Certificate.countDocuments({ status: 'REVOKED' }),
      Consent.countDocuments({ status: 'GRANTED' }),
      Consent.countDocuments({ status: 'DECLINED' }),
      FollowUp.countDocuments({ status: 'READY' }),
      FollowUp.countDocuments({ status: 'COMPLETED' }),
      OutcomeRecord.countDocuments({ situation: 'EMPLOYED' }),
      OutcomeRecord.countDocuments({ situation: 'SELF_EMPLOYED' }),
      OutcomeRecord.countDocuments({ situation: 'APPRENTICE' }),
      OutcomeRecord.countDocuments({ situation: 'UNEMPLOYED' }),
    ]);

    const pendingCertification = Math.max(0, completed - certified);

    res.json({
      success: true,
      data: {
        providers,
        courses,
        batches,
        trainees,
        enrollments,
        completed,
        certified,
        pendingCertification,
        revokedCertificates,
        consentGranted,
        consentDeclined,
        followUpsDue,
        followUpsCompleted,
        employed,
        selfEmployed,
        apprentices,
        unemployed,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProvider,
  getProviders,
  getProvider,
  updateProvider,
  updateProviderStatus,
  resetProviderPassword,
  getAdminStats,
};

