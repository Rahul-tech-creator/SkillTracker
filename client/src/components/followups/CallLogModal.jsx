import React, { useState } from 'react';
import { followUpService } from '../../services/api';
import {
  IconClose,
  IconPhoneCall,
  IconUser,
  IconBuilding,
  IconAlertCircle,
  IconCheckCircle,
} from '../common/Icons';

export const CallLogModal = ({ followUp, onClose, onLogged }) => {
  const [callStatus, setCallStatus] = useState('CONNECTED');
  const [employmentStatus, setEmploymentStatus] = useState('EMPLOYED');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [designation, setDesignation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await followUpService.logCall(followUp._id, {
        callStatus,
        notes,
        outcomeData:
          callStatus === 'CONNECTED'
            ? {
                employmentStatus,
                monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
                employerName,
                designation,
              }
            : undefined,
      });
      if (onLogged) onLogged();
      onClose();
    } catch (err) {
      console.error('Failed to log call:', err);
      setError(err.message || 'Failed to submit operator call log');
    } finally {
      setSubmitting(false);
    }
  };

  const trainee = followUp.trainee || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container call-log-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-category-tag">ASSISTED TELEPHONY OUTREACH</span>
            <h3 className="modal-title">Log Operator Call — Day 6 Escalation</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert-box alert-error mb-4">
              <IconAlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Trainee Card */}
          <div className="call-trainee-brief mb-4">
            <div className="brief-left">
              <div className="brief-name-row">
                <IconUser size={18} />
                <span className="brief-name">{trainee.fullName || 'Trainee'}</span>
                <span className="brief-id">{trainee.internalTraineeId || 'ID-PENDING'}</span>
              </div>
              <div className="brief-meta">
                <span>Phone: <strong>{trainee.phone || 'Protected Contact'}</strong></span>
                <span> • District: <strong>{trainee.district || 'Unassigned'}</strong></span>
                <span> • Milestone: <strong>{followUp.milestone || 'M3'}</strong></span>
              </div>
            </div>
            <div className="brief-call-action">
              <a
                href={`tel:${trainee.phone || ''}`}
                className="btn btn-sm btn-primary"
                title="Initiate Dial"
              >
                <IconPhoneCall size={14} /> Call Now
              </a>
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="form-label font-bold">Call Connection Result</label>
            <select
              className="form-control"
              value={callStatus}
              onChange={(e) => setCallStatus(e.target.value)}
              required
            >
              <option value="CONNECTED">Connected — Trainee Responded</option>
              <option value="NO_ANSWER">Ringing / No Answer</option>
              <option value="BUSY">Line Busy</option>
              <option value="WRONG_NUMBER">Incorrect / Invalid Number</option>
              <option value="CALLBACK_REQUESTED">Callback Requested Later</option>
            </select>
          </div>

          {callStatus === 'CONNECTED' && (
            <div className="call-connected-details p-3 bg-light border rounded mb-4">
              <h5 className="mb-3 font-semibold text-primary">Trainee Response Details</h5>

              <div className="form-group mb-3">
                <label className="form-label">Current Employment Status</label>
                <select
                  className="form-control"
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  required
                >
                  <option value="EMPLOYED">Employed (Formal / Wage Employed)</option>
                  <option value="SELF_EMPLOYED">Self-Employed / Entrepreneur</option>
                  <option value="UNEMPLOYED">Seeking Employment (Unemployed)</option>
                  <option value="PURSUING_HIGHER_EDUCATION">Pursuing Higher Education / Skill Upgrades</option>
                  <option value="UNAVAILABLE_FOR_WORK">Unavailable / Personal Reasons</option>
                </select>
              </div>

              {(employmentStatus === 'EMPLOYED' || employmentStatus === 'SELF_EMPLOYED') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Company / Enterprise Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Infosys, Local Workshop, etc."
                      value={employerName}
                      onChange={(e) => setEmployerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Title / Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Solar Technician, Junior Analyst"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    />
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Monthly In-Hand Salary (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 18500"
                      value={monthlySalary}
                      onChange={(e) => setMonthlySalary(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group mb-4">
            <label className="form-label">Operator Notes & Observations</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Record any constraints, remarks, wage confirmation notes, or scheduled callbacks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>

          <div className="modal-actions-right">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting Call Log...' : 'Record Call Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
