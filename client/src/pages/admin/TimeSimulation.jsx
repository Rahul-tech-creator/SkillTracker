import React, { useState, useEffect } from 'react';
import { useTime } from '../../hooks/useTime';
import { followUpService } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import {
  IconClock,
  IconAlertCircle,
  IconFastForward,
  IconRefresh,
  IconCheckSquare,
  IconActivity,
  IconCalendar,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const TimeSimulation = () => {
  const {
    timeInfo,
    isSimulationActive,
    logicalDate,
    realDate,
    advanceDays,
    resetToRealTime,
    setSimulationDateTime,
    setTimeMode,
    refreshTime,
  } = useTime();

  // Local form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [loadingAction, setLoadingAction] = useState(false);
  const [toast, setToast] = useState(null);
  const [followUpStats, setFollowUpStats] = useState({
    total: 0,
    scheduled: 0,
    ready: 0,
    completed: 0,
    unreachable: 0,
  });

  const loadFollowUpStats = async () => {
    try {
      const res = await followUpService.getStats();
      if (res.data.success) {
        setFollowUpStats(res.data.data);
      }
    } catch (err) {
      console.warn('Stats fetch failed:', err.message);
    }
  };

  useEffect(() => {
    loadFollowUpStats();
    // Initialize date picker with current logical date in YYYY-MM-DD
    const d = logicalDate || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    setSelectedTime(timeInfo?.simulationTime || '10:00 AM');
  }, [timeInfo?.simulationDate]);

  const handleModeSwitch = async (newMode) => {
    try {
      setLoadingAction(true);
      const res = await setTimeMode(newMode);
      setToast({
        message: `System mode changed to ${newMode}.`,
        type: 'success',
      });
      loadFollowUpStats();
    } catch (err) {
      setToast({ message: err.message || 'Failed to change mode', type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveCustomDate = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      setToast({ message: 'Please select a valid date.', type: 'warning' });
      return;
    }

    try {
      setLoadingAction(true);
      const res = await setSimulationDateTime(selectedDate, selectedTime);
      setToast({
        message: `Simulated date set to ${selectedDate}. ${res.transitionedFollowUps || 0} follow-up(s) updated.`,
        type: 'success',
      });
      loadFollowUpStats();
    } catch (err) {
      setToast({ message: err.message || 'Failed to save date', type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdvance = async (days) => {
    try {
      setLoadingAction(true);
      const res = await advanceDays(days);
      setToast({
        message: `Advanced +${days} day(s). ${res.transitionedFollowUps || 0} follow-up(s) transitioned to READY.`,
        type: 'success',
      });
      loadFollowUpStats();
    } catch (err) {
      setToast({ message: err.message || 'Failed to advance time', type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoadingAction(true);
      await resetToRealTime();
      setToast({
        message: 'System clock has been reset to Real System Time.',
        type: 'success',
      });
      loadFollowUpStats();
    } catch (err) {
      setToast({ message: err.message || 'Failed to reset time', type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="page-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Banner */}
      <div className="page-header-row">
        <div>
          <div className="page-badge-pill">
            <IconClock size={14} /> TESTING & EVALUATION ENGINE
          </div>
          <h1 className="page-title">Time Simulation Control Center</h1>
          <p className="page-subtitle">
            Simulate future calendar dates to immediately test longitudinal 30-day, 90-day, 180-day, and
            365-day outcome follow-ups without waiting for real-world elapsed time.
          </p>
        </div>

        <div className="header-actions">
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={() => {
              refreshTime();
              loadFollowUpStats();
            }}
            disabled={loadingAction}
          >
            Refresh Clock
          </Button>
        </div>
      </div>

      {/* Dual Clock Live Visualizer */}
      <div className="dual-clock-grid">
        {/* Real Clock Card */}
        <div className="clock-display-card real-clock-card">
          <div className="clock-card-header">
            <span className="clock-status-tag real">REAL SYSTEM TIME</span>
            <IconClock size={20} className="text-muted" />
          </div>
          <div className="clock-date-value">{formatDate(realDate)}</div>
          <div className="clock-time-value">
            {new Date(realDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p className="clock-footer-note">
            Actual host computer timestamp (used for database audit records)
          </p>
        </div>

        {/* Logical Simulated Clock Card */}
        <div className={`clock-display-card sim-clock-card ${isSimulationActive ? 'active' : ''}`}>
          <div className="clock-card-header">
            <span className={`clock-status-tag ${isSimulationActive ? 'sim-active' : 'sim-inactive'}`}>
              {isSimulationActive ? 'LOGICAL CLOCK: SIMULATION' : 'LOGICAL CLOCK: REAL TIME'}
            </span>
            <IconFastForward size={20} className={isSimulationActive ? 'text-warning' : 'text-muted'} />
          </div>
          <div className="clock-date-value font-bold text-main">{formatDate(logicalDate)}</div>
          <div className="clock-time-value text-primary font-mono">
            {isSimulationActive ? timeInfo?.simulationTime || '10:00 AM' : 'Synchronized'}
          </div>
          <p className="clock-footer-note">
            Logical date evaluated by the follow-up milestone scheduler & notification dispatcher
          </p>
        </div>
      </div>

      {/* Follow-Up Pipeline Status under Current Logical Clock */}
      <div className="stats-grid mt-6">
        <StatCard
          title="Due / Active Now"
          value={followUpStats.ready}
          icon={IconCheckSquare}
          description="Milestones ready for submission"
          colorScheme="warning"
        />
        <StatCard
          title="Scheduled Milestones"
          value={followUpStats.scheduled}
          icon={IconCalendar}
          description="Awaiting future dates"
          colorScheme="primary"
        />
        <StatCard
          title="Completed Outcomes"
          value={followUpStats.completed}
          icon={IconActivity}
          description="Responses submitted"
          colorScheme="emerald"
        />
        <StatCard
          title="Total Follow-Ups"
          value={followUpStats.total}
          icon={IconClock}
          description="Across all graduates"
          colorScheme="violet"
        />
      </div>

      {/* Simulation Controls Panel */}
      <div className="content-card mt-6">
        <div className="card-header-border">
          <div>
            <h2 className="card-heading-title">Logical Clock Configuration</h2>
            <p className="card-heading-desc">
              Switch time mode or fast-forward days into the future. Database audit timestamps (createdAt / updatedAt) remain unaltered.
            </p>
          </div>
        </div>

        <div className="simulation-settings-grid">
          {/* Mode Switch Box */}
          <div className="sim-config-section">
            <h3 className="section-subtitle">1. Mode Selection</h3>
            <div className="mode-toggle-radio-group">
              <label className={`mode-radio-card ${!isSimulationActive ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="timeMode"
                  checked={!isSimulationActive}
                  onChange={() => handleModeSwitch('REAL')}
                  disabled={loadingAction}
                />
                <div>
                  <span className="mode-card-title">Real Time Mode (Default)</span>
                  <p className="mode-card-desc">
                    Uses actual host server date and time for all business logic.
                  </p>
                </div>
              </label>

              <label className={`mode-radio-card ${isSimulationActive ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="timeMode"
                  checked={isSimulationActive}
                  onChange={() => handleModeSwitch('SIMULATION')}
                  disabled={loadingAction}
                />
                <div>
                  <span className="mode-card-title">Simulation Time Mode</span>
                  <p className="mode-card-desc">
                    Allows arbitrary dates and time fast-forwarding for longitudinal verification.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Fast-Forward Quick Action Buttons */}
          <div className="sim-config-section">
            <h3 className="section-subtitle">2. Quick Milestone Jumps</h3>
            <p className="text-muted text-sm mb-4">
              Instantly advance the logical clock from its current position by a fixed interval:
            </p>

            <div className="quick-advance-button-grid">
              <Button
                variant="outline"
                icon={IconFastForward}
                onClick={() => handleAdvance(1)}
                disabled={loadingAction}
              >
                +1 Day
              </Button>
              <Button
                variant="outline"
                icon={IconFastForward}
                onClick={() => handleAdvance(7)}
                disabled={loadingAction}
              >
                +7 Days (1 Wk)
              </Button>
              <Button
                variant="primary"
                icon={IconFastForward}
                onClick={() => handleAdvance(30)}
                disabled={loadingAction}
                className="highlight-step-btn"
              >
                +30 Days (1 Mo)
              </Button>
              <Button
                variant="primary"
                icon={IconFastForward}
                onClick={() => handleAdvance(90)}
                disabled={loadingAction}
                className="highlight-step-btn"
              >
                +90 Days (3 Mo)
              </Button>
              <Button
                variant="outline"
                icon={IconFastForward}
                onClick={() => handleAdvance(180)}
                disabled={loadingAction}
              >
                +180 Days (6 Mo)
              </Button>
              <Button
                variant="outline"
                icon={IconFastForward}
                onClick={() => handleAdvance(365)}
                disabled={loadingAction}
              >
                +365 Days (1 Yr)
              </Button>
            </div>

            <div className="reset-bar mt-4">
              <Button
                variant="danger"
                icon={IconRefresh}
                onClick={handleReset}
                disabled={loadingAction || !isSimulationActive}
              >
                Reset to Real Time
              </Button>
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div className="sim-config-section span-full">
            <h3 className="section-subtitle">3. Set Specific Simulated Date & Time</h3>
            <form onSubmit={handleSaveCustomDate} className="custom-date-form">
              <div className="form-row-custom">
                <div className="form-group flex-1">
                  <label className="form-label">Simulated Date (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Simulated Time</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 10:00 AM, 02:30 PM"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>

                <div className="form-group flex-none flex-end-btn">
                  <Button
                    variant="success"
                    type="submit"
                    disabled={loadingAction}
                    className="save-time-btn"
                  >
                    Save Simulation Time
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSimulation;
