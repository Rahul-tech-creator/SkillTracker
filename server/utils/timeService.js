const SystemSetting = require('../models/SystemSetting');

class TimeService {
  constructor() {
    this.cachedSetting = null;
    this.lastFetched = 0;
    this.CACHE_TTL_MS = 2000; // 2 seconds cache
  }

  async getSetting() {
    const now = Date.now();
    if (this.cachedSetting && now - this.lastFetched < this.CACHE_TTL_MS) {
      return this.cachedSetting;
    }

    try {
      let setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
      if (!setting) {
        setting = await SystemSetting.create({
          key: 'GLOBAL_SETTINGS',
          timeMode: 'REAL',
          simulationDate: null,
          simulationTime: '10:00 AM',
        });
      }
      this.cachedSetting = setting;
      this.lastFetched = now;
      return setting;
    } catch (err) {
      console.error('TimeService.getSetting error:', err.message);
      // Fallback in-memory
      return (
        this.cachedSetting || {
          timeMode: 'REAL',
          simulationDate: null,
          simulationTime: '10:00 AM',
        }
      );
    }
  }

  /**
   * Returns application logical current Date (synchronous fallback if cached, or async)
   */
  async getCurrentDate() {
    const setting = await this.getSetting();
    if (setting.timeMode === 'SIMULATION' && setting.simulationDate) {
      const sim = new Date(setting.simulationDate);
      if (!isNaN(sim.getTime())) {
        return sim;
      }
    }
    return new Date();
  }

  /**
   * Synchronous quick check based on last cached setting
   */
  getCurrentDateSync() {
    if (
      this.cachedSetting &&
      this.cachedSetting.timeMode === 'SIMULATION' &&
      this.cachedSetting.simulationDate
    ) {
      const sim = new Date(this.cachedSetting.simulationDate);
      if (!isNaN(sim.getTime())) return sim;
    }
    return new Date();
  }

  async isSimulationMode() {
    const setting = await this.getSetting();
    return setting.timeMode === 'SIMULATION';
  }

  async getSystemTimeInfo() {
    const setting = await this.getSetting();
    const realNow = new Date();
    const isSim = setting.timeMode === 'SIMULATION' && !!setting.simulationDate;
    const logicalNow = isSim ? new Date(setting.simulationDate) : realNow;

    return {
      timeMode: setting.timeMode,
      isSimulationActive: isSim,
      realDate: realNow,
      logicalDate: logicalNow,
      simulationDate: setting.simulationDate,
      simulationTime: setting.simulationTime || '10:00 AM',
      updatedAt: setting.updatedAt || realNow,
      updatedBy: setting.updatedBy || null,
    };
  }

  async setTimeMode(mode, userId) {
    if (!['REAL', 'SIMULATION'].includes(mode)) {
      throw new Error('Invalid time mode. Must be REAL or SIMULATION.');
    }

    let setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!setting) {
      setting = new SystemSetting({ key: 'GLOBAL_SETTINGS' });
    }

    setting.timeMode = mode;
    if (mode === 'SIMULATION' && !setting.simulationDate) {
      setting.simulationDate = new Date();
    }
    if (userId) setting.updatedBy = userId;

    await setting.save();
    this.cachedSetting = setting;
    this.lastFetched = Date.now();
    return this.getSystemTimeInfo();
  }

  async setSimulationDateTime(date, time, userId) {
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid simulation date format.');
    }

    let setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!setting) {
      setting = new SystemSetting({ key: 'GLOBAL_SETTINGS' });
    }

    setting.timeMode = 'SIMULATION';
    setting.simulationDate = targetDate;
    if (time) setting.simulationTime = time;
    if (userId) setting.updatedBy = userId;

    await setting.save();
    this.cachedSetting = setting;
    this.lastFetched = Date.now();
    return this.getSystemTimeInfo();
  }

  async advanceSimulationDays(days, userId) {
    const numDays = parseInt(days, 10);
    if (isNaN(numDays) || numDays <= 0) {
      throw new Error('Advance days must be a positive integer.');
    }

    const currentLogical = await this.getCurrentDate();
    const advancedDate = new Date(currentLogical.getTime() + numDays * 24 * 60 * 60 * 1000);

    let setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!setting) {
      setting = new SystemSetting({ key: 'GLOBAL_SETTINGS' });
    }

    setting.timeMode = 'SIMULATION';
    setting.simulationDate = advancedDate;
    if (userId) setting.updatedBy = userId;

    await setting.save();
    this.cachedSetting = setting;
    this.lastFetched = Date.now();
    return this.getSystemTimeInfo();
  }

  async resetToRealTime(userId) {
    let setting = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!setting) {
      setting = new SystemSetting({ key: 'GLOBAL_SETTINGS' });
    }

    setting.timeMode = 'REAL';
    if (userId) setting.updatedBy = userId;

    await setting.save();
    this.cachedSetting = setting;
    this.lastFetched = Date.now();
    return this.getSystemTimeInfo();
  }
}

module.exports = new TimeService();
