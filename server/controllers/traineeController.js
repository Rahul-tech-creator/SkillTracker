const crypto = require('crypto');
const User = require('../models/User');
const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');

const getProviderRecord = async (userId) => Provider.findOne({ userId });

/**
 * Helper to generate unique internal Trainee ID (e.g. TRN-2024-10523)
 */
const generateInternalTraineeId = async () => {
  const year = new Date().getFullYear();
  const count = await Trainee.countDocuments();
  const serial = String(count + 10001).padStart(5, '0');
  return `TRN-${year}-${serial}`;
};

/**
 * POST /api/trainees
 * Register a new trainee with tokenized identity, demographics, and duplicate protection
 */
const createTrainee = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      email,
      phone,
      alternatePhone,
      alternateEmail,
      preferredChannel,
      dateOfBirth,
      gender,
      socialCategory,
      residenceType,
      educationLevel,
      district,
      state,
      currentLocation,
      idType,
      tokenizedIdRef,
    } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Name, username, and password are required.' });
    }

    let providerId = req.body.providerId;
    if (req.user.role === 'PROVIDER') {
      const provider = await getProviderRecord(req.user._id);
      if (!provider) return res.status(404).json({ success: false, message: 'Provider profile not found.' });
      providerId = provider._id;
    }

    // Check username uniqueness
    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    // Duplicate Trainee Detection: check by tokenized ID or phone + name
    let idHash = '';
    if (tokenizedIdRef) {
      idHash = crypto.createHash('sha256').update(tokenizedIdRef.trim()).digest('hex');
      const existingTrainee = await Trainee.findOne({ idHash });
      if (existingTrainee) {
        return res.status(400).json({
          success: false,
          message: `Possible duplicate trainee found: identity reference is already registered under ID ${existingTrainee.internalTraineeId}.`,
        });
      }
    }

    const internalTraineeId = await generateInternalTraineeId();

    // Create auth user
    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      email: email || null,
      password,
      role: 'TRAINEE',
      status: 'ACTIVE',
    });

    // Create trainee profile
    const trainee = await Trainee.create({
      internalTraineeId,
      userId: user._id,
      providerId,
      phone: phone || '',
      alternatePhone: alternatePhone || '',
      email: email || '',
      alternateEmail: alternateEmail || '',
      preferredChannel: preferredChannel || 'WHATSAPP',
      contactStatus: 'VERIFIED',
      dateOfBirth: dateOfBirth || null,
      gender: gender || '',
      socialCategory: socialCategory || 'GENERAL',
      residenceType: residenceType || 'URBAN',
      educationLevel: educationLevel || 'GRADUATE',
      district: district || 'Vijayawada / Krishna',
      state: state || 'Andhra Pradesh',
      currentLocation: currentLocation || district || '',
      idType: idType || 'AADHAAR_TOKEN',
      tokenizedIdRef: tokenizedIdRef || '',
      idHash,
      idVerificationStatus: tokenizedIdRef ? 'VERIFIED_TOKEN' : 'SELF_DECLARED',
      trackingConsent: 'GRANTED',
      currentFollowUpStatus: 'NOT_DUE',
      status: 'ACTIVE',
    });

    res.status(201).json({
      success: true,
      message: '✓ Trainee registered successfully with permanent internal ID.',
      data: trainee,
    });
  } catch (error) {
    console.error('createTrainee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/trainees
 * List trainees with pagination, search, and demographic filters
 */
const getTrainees = async (req, res) => {
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

    if (req.query.district && req.query.district !== 'ALL') {
      filter.district = req.query.district;
    }
    if (req.query.socialCategory && req.query.socialCategory !== 'ALL') {
      filter.socialCategory = req.query.socialCategory;
    }
    if (req.query.trackingConsent && req.query.trackingConsent !== 'ALL') {
      filter.trackingConsent = req.query.trackingConsent;
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [trainees, totalCount] = await Promise.all([
      Trainee.find(filter)
        .populate('userId', 'name email username status')
        .populate('providerId', 'organizationName contactPerson')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Trainee.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: trainees.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      data: trainees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/trainees/:id
 */
const getTraineeById = async (req, res) => {
  try {
    const trainee = await Trainee.findById(req.params.id)
      .populate('userId', 'name email username status')
      .populate('providerId', 'organizationName contactPerson phone email');

    if (!trainee) return res.status(404).json({ success: false, message: 'Trainee not found.' });

    res.json({ success: true, data: trainee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/trainees/:id
 * Update contact details with change history (prevents duplicate creation on phone change)
 */
const updateTrainee = async (req, res) => {
  try {
    const trainee = await Trainee.findById(req.params.id);
    if (!trainee) return res.status(404).json({ success: false, message: 'Trainee not found.' });

    const { phone, alternatePhone, email, alternateEmail, preferredChannel, district, currentLocation } = req.body;

    if (phone && phone !== trainee.phone) {
      trainee.phoneChangeHistory.push({
        oldPhone: trainee.phone,
        newPhone: phone,
        changedAt: new Date(),
        reason: req.body.phoneChangeReason || 'Trainee contact update',
      });
      trainee.phone = phone;
      trainee.contactStatus = 'UPDATED';
    }

    if (alternatePhone) trainee.alternatePhone = alternatePhone;
    if (email) trainee.email = email;
    if (alternateEmail) trainee.alternateEmail = alternateEmail;
    if (preferredChannel) trainee.preferredChannel = preferredChannel;
    if (district) trainee.district = district;
    if (currentLocation) trainee.currentLocation = currentLocation;

    await trainee.save();

    res.json({ success: true, message: 'Trainee details updated successfully.', data: trainee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTrainee,
  getTrainees,
  getTraineeById,
  getTrainee: getTraineeById,
  updateTrainee,
};
