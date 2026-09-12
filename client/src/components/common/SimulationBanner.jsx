import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTime } from '../../hooks/useTime';
import { useAuth } from '../../hooks/useAuth';
import {
  IconAlertCircle,
  IconClock,
  IconFastForward,
  IconRefresh,
} from './Icons';
import { formatDate } from '../../utils/helpers';

export const SimulationBanner = () => {
  const { isSimulationActive, logicalDate, realDate, advanceDays, resetToRealTime } = useTime();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState(false);

  if (!isSimulationActive) return null;

  const handleQuickAdvance = async (days) => {
    try {
      setLoadingAction(true);
      await advanceDays(days);
    } catch (err) {
      alert(err.message || 'Failed to advance time');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoadingAction(true);
      await resetToRealTime();
    } catch (err) {
      alert(err.message || 'Failed to reset time');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="simulation-banner">
      <div className="simulation-banner-inner">
        <div className="simulation-banner-left">
          <span className="sim-warning-icon">
            <IconAlertCircle size={18} />
          </span>
          <div className="sim-text-content">
            <span className="sim-badge-tag">SIMULATION TIME ACTIVE</span>
            <span className="sim-date-text">
              Application Logical Date: <strong>{formatDate(logicalDate)}</strong>
            </span>
            <span className="sim-real-date-text">
              (Real System Date: {formatDate(realDate)})
            </span>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="simulation-banner-actions">
            <button
              className="sim-quick-btn"
              onClick={() => handleQuickAdvance(30)}
              disabled={loadingAction}
              title="Advance Logical Clock by +30 Days"
            >
              <IconFastForward size={14} /> +30 Days
            </button>
            <button
              className="sim-quick-btn sim-reset-btn"
              onClick={handleReset}
              disabled={loadingAction}
              title="Reset System Clock to Real Time"
            >
              <IconRefresh size={14} /> Reset to Real
            </button>
            <button
              className="sim-manage-link-btn"
              onClick={() => navigate('/admin/time-simulation')}
            >
              <IconClock size={14} /> Manage Clock →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
