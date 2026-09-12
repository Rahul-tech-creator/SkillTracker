const timeService = require('../utils/timeService');
const { evaluateReadiness } = require('../services/followUpEngine');

/**
 * GET /api/time
 * Returns current logical time, real server time, and simulation mode status
 */
const getTimeInfo = async (req, res) => {
  try {
    const timeInfo = await timeService.getSystemTimeInfo();
    res.json({ success: true, data: timeInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/time/mode
 * Admin only: toggle between REAL and SIMULATION mode
 */
const setTimeMode = async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['REAL', 'SIMULATION'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mode. Must be REAL or SIMULATION.',
      });
    }

    const timeInfo = await timeService.setTimeMode(mode, req.user._id);

    // Re-evaluate follow-up milestones under new mode
    const transitioned = await evaluateReadiness();

    res.json({
      success: true,
      message: `System time mode switched to ${mode}. ${transitioned} follow-up(s) updated.`,
      data: timeInfo,
      transitionedFollowUps: transitioned,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/time/simulation
 * Admin only: set specific simulated date and time
 */
const setSimulationDateTime = async (req, res) => {
  try {
    const { date, time } = req.body;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Simulation date is required.',
      });
    }

    const timeInfo = await timeService.setSimulationDateTime(date, time, req.user._id);

    // Re-evaluate follow-up milestones under updated date
    const transitioned = await evaluateReadiness();

    res.json({
      success: true,
      message: `Simulation date updated successfully. ${transitioned} follow-up(s) updated.`,
      data: timeInfo,
      transitionedFollowUps: transitioned,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/time/advance
 * Admin only: advance simulation clock by X days (+1, +7, +30, +90, +180, +365)
 */
const advanceSimulationDays = async (req, res) => {
  try {
    const { days } = req.body;
    const numDays = parseInt(days, 10);
    if (isNaN(numDays) || numDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid positive number of days to advance.',
      });
    }

    const timeInfo = await timeService.advanceSimulationDays(numDays, req.user._id);

    // Re-evaluate follow-up milestones under advanced date
    const transitioned = await evaluateReadiness();

    res.json({
      success: true,
      message: `Advanced simulation time by +${numDays} day(s). ${transitioned} follow-up(s) transitioned to READY.`,
      data: timeInfo,
      transitionedFollowUps: transitioned,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/time/reset
 * Admin only: reset back to real system time
 */
const resetToRealTime = async (req, res) => {
  try {
    const timeInfo = await timeService.resetToRealTime(req.user._id);
    const transitioned = await evaluateReadiness();

    res.json({
      success: true,
      message: 'System clock has been reset to Real Time.',
      data: timeInfo,
      transitionedFollowUps: transitioned,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTimeInfo,
  setTimeMode,
  setSimulationDateTime,
  advanceSimulationDays,
  resetToRealTime,
};
