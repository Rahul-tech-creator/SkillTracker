const User = require('../models/User');
const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');
const { validateAadhaar, maskAadhaar, hashAadhaar } = require('../utils/aadhaarValidator');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * POST /api/trainees
 * Provider adds (creates + enrolls) a new trainee into their provider with Aadhaar validation
 */
const createTrainee = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      email,
      phone,
      dateOfBirth,
      gender,
      location,
      educationLevel,
      governmentIdType,
      aadhaarNumber,
    } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'name, username, and password are required.' });
    }

    const provider = await getProviderRecord(req.user._id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found.' });
    }

    // Check username not taken
    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already in use.' });
    }

    // Aadhaar Validation & Masking
    let maskedAadhaar = '';
    let aadhaarHash = '';
    const idType = governmentIdType || 'AADHAAR';

    if (idType === 'AADHAAR' && aadhaarNumber) {
      const cleanAadhaar = String(aadhaarNumber).replace(/[\s-]/g, '');
      const validation = validateAadhaar(cleanAadhaar);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      maskedAadhaar = maskAadhaar(cleanAadhaar);
      aadhaarHash = hashAadhaar(cleanAadhaar);

      // Check if Aadhaar is already registered
      const duplicate = await Trainee.findOne({ aadhaarHash });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `This Government ID / Aadhaar is already registered under ID (${maskedAadhaar}).`,
        });
      }
    }

    // Create User auth record
    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      email: email || null,
      password,
      role: 'TRAINEE',
      status: 'ACTIVE',
    });

    // Create Trainee profile
    const trainee = await Trainee.create({
      userId: user._id,
      providerId: provider._id,
      phone: phone || '',
      dateOfBirth: dateOfBirth || null,
      gender: gender || '',
      location: location || '',
      educationLevel: educationLevel || 'GRADUATE',
      governmentIdType: idType,
      maskedAadhaar,
      aadhaarHash,
      trackingConsent: 'GRANTED',
      currentFollowUpStatus: 'NOT_DUE',
      status: 'ACTIVE',
    });

    res.status(201).json({
      success: true,
      message: '✓ Trainee registered successfully.',
      data: {
        trainee: {
          _id: trainee._id,
          phone: trainee.phone,
          location: trainee.location,
          maskedAadhaar: trainee.maskedAadhaar,
          governmentIdType: trainee.governmentIdType,
          trackingConsent: trainee.trackingConsent,
          status: trainee.status,
        },
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('createTrainee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/trainees
 */
const getTrainees = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.json({ success: true, count: 0, data: [] });
      filter.providerId = provider._id;
    } else if (req.user.role === 'TRAINEE') {
      filter.userId = req.user._id;
    }

    const trainees = await Trainee.find(filter)
      .populate('userId', 'name username email status createdAt')
      .populate('providerId', 'organizationName contactPerson')
      .select('-aadhaarHash') // Never leak cryptographic hash
      .sort({ createdAt: -1 });

    res.json({ success: true, count: trainees.length, data: trainees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/trainees/:id
 */
const getTrainee = async (req, res) => {
  try {
    const trainee = await Trainee.findById(req.params.id)
      .populate('userId', 'name username email status createdAt')
      .populate('providerId', 'organizationName contactPerson phone address')
      .select('-aadhaarHash');

    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee not found.' });
    }

    if (req.user.role === 'TRAINEE' && trainee.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || trainee.providerId._id.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.json({ success: true, data: trainee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/trainees/:id
 */
const updateTrainee = async (req, res) => {
  try {
    const trainee = await Trainee.findById(req.params.id);
    if (!trainee) {
      return res.status(404).json({ success: false, message: 'Trainee not found.' });
    }

    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider || trainee.providerId.toString() !== provider._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const {
      phone,
      dateOfBirth,
      gender,
      location,
      status,
      name,
      email,
      educationLevel,
      governmentIdType,
      aadhaarNumber,
    } = req.body;

    if (phone !== undefined) trainee.phone = phone;
    if (dateOfBirth !== undefined) trainee.dateOfBirth = dateOfBirth;
    if (gender !== undefined) trainee.gender = gender;
    if (location !== undefined) trainee.location = location;
    if (educationLevel !== undefined) trainee.educationLevel = educationLevel;
    if (status !== undefined) trainee.status = status;
    if (governmentIdType !== undefined) trainee.governmentIdType = governmentIdType;

    if (aadhaarNumber) {
      const cleanAadhaar = String(aadhaarNumber).replace(/[\s-]/g, '');
      const validation = validateAadhaar(cleanAadhaar);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      trainee.maskedAadhaar = maskAadhaar(cleanAadhaar);
      trainee.aadhaarHash = hashAadhaar(cleanAadhaar);
    }

    await trainee.save();

    if (name !== undefined || email !== undefined) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (email) userUpdate.email = email;
      await User.findByIdAndUpdate(trainee.userId, userUpdate);
    }

    const updated = await Trainee.findById(trainee._id)
      .populate('userId', 'name username email status')
      .populate('providerId', 'organizationName')
      .select('-aadhaarHash');

    res.json({ success: true, message: '✓ Trainee updated successfully.', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createTrainee, getTrainees, getTrainee, updateTrainee };
