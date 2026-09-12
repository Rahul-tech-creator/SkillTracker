import React, { createContext, useState, useEffect, useCallback } from 'react';
import { timeService } from '../services/api';

export const TimeContext = createContext(null);

export const TimeProvider = ({ children }) => {
  const [timeInfo, setTimeInfo] = useState({
    timeMode: 'REAL',
    isSimulationActive: false,
    realDate: new Date(),
    logicalDate: new Date(),
    simulationDate: null,
    simulationTime: '10:00 AM',
  });
  const [loading, setLoading] = useState(true);

  const fetchTimeInfo = useCallback(async () => {
    try {
      const res = await timeService.getTime();
      if (res.data.success) {
        setTimeInfo(res.data.data);
      }
    } catch (err) {
      console.warn('TimeContext fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeInfo();
    const interval = setInterval(fetchTimeInfo, 10000); // sync every 10s
    return () => clearInterval(interval);
  }, [fetchTimeInfo]);

  const advanceDays = async (days) => {
    try {
      const res = await timeService.advance(days);
      if (res.data.success) {
        setTimeInfo(res.data.data);
        window.dispatchEvent(new CustomEvent('time:advanced', { detail: res.data }));
        return res.data;
      }
    } catch (err) {
      throw err;
    }
  };

  const resetToRealTime = async () => {
    try {
      const res = await timeService.reset();
      if (res.data.success) {
        setTimeInfo(res.data.data);
        window.dispatchEvent(new CustomEvent('time:reset', { detail: res.data }));
        return res.data;
      }
    } catch (err) {
      throw err;
    }
  };

  const setSimulationDateTime = async (date, time) => {
    try {
      const res = await timeService.setSimulation(date, time);
      if (res.data.success) {
        setTimeInfo(res.data.data);
        window.dispatchEvent(new CustomEvent('time:changed', { detail: res.data }));
        return res.data;
      }
    } catch (err) {
      throw err;
    }
  };

  const setTimeMode = async (mode) => {
    try {
      const res = await timeService.setMode(mode);
      if (res.data.success) {
        setTimeInfo(res.data.data);
        window.dispatchEvent(new CustomEvent('time:changed', { detail: res.data }));
        return res.data;
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <TimeContext.Provider
      value={{
        timeInfo,
        isSimulationActive: timeInfo.isSimulationActive,
        logicalDate: timeInfo.logicalDate ? new Date(timeInfo.logicalDate) : new Date(),
        realDate: timeInfo.realDate ? new Date(timeInfo.realDate) : new Date(),
        loading,
        refreshTime: fetchTimeInfo,
        advanceDays,
        resetToRealTime,
        setSimulationDateTime,
        setTimeMode,
      }}
    >
      {children}
    </TimeContext.Provider>
  );
};
