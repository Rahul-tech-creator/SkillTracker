const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Trainee = require('../models/Trainee');

/** Generate a signed JWT for the given user id */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Works for all three roles: ADMIN, PROVIDER, TRAINEE
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password.',
      });
    }

    // Password field is excluded by default — explicitly select it here
    const user = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact administrator.',
      });
    }

    const token = signToken(user._id);

    // Set cookie for session persistence
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    };
    res.cookie('skilling_token', token, cookieOptions);

    // Build role-specific profile to return
    let profile = null;
    if (user.role === 'PROVIDER') {
      profile = await Provider.findOne({ userId: user._id });
    } else if (user.role === 'TRAINEE') {
      profile = await Trainee.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        profile,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears cookie session
 */
const logout = async (req, res) => {
  try {
    res.clearCookie('skilling_token');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

/**
 * GET /api/auth/me
 * Returns the current authenticated user's info
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;

    let profile = null;
    if (user.role === 'PROVIDER') {
      profile = await Provider.findOne({ userId: user._id });
    } else if (user.role === 'TRAINEE') {
      profile = await Trainee.findOne({ userId: user._id }).populate('providerId');
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        profile,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login, logout, getMe };
