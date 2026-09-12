import React, { useState } from 'react';
import { followUpService } from '../../services/api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IconPhoneCall, IconCheck, IconAlertCircle } from '../common/Icons';

const CALL_OUTCOMES = [
  { value: 'CONNECTED', label: 'Connected (Spoke with Trainee)', description: 'Trainee answered and spoke directly' },
  { value: 'NO_ANSWER', label: 'No Answer / Ringing', description: 'Phone rang but was not picked up' },
  { value: 'BUSY', label: 'Line Busy', description: 'User engaged on another call' },
  { value: 'CALL_BACK_REQUESTED', label: 'Call Back Requested', description: 'Trainee asked to be called later' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number / Invalid', description: 'Phone number does not belong to trainee' },
  { value: 'REFUSED', label: 'Refused to Participate', description: 'Trainee declined post-training tracking' },
  { value: 'OTHER', label: 'Other', description: 'Voicemail, network issue, or switched off' },
];

export const RecordCallModal = ({ isOpen, onClose, followUp, onCallRecorded }) => {
  const [callOutcome, setCallOutcome] = useState('NO_ANSWER');
  const [notes, setNotes] = useState('');
  const [recordDirectOutcome, setRecordDirectOutcome] = useState(false);
  const [directSituation, setDirectSituation] = useState('EMPLOYED');
  const [employerName, setEmployerName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('₹30,000–₹50,000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!followUp) return null;

  const traineeName = followUp.traineeId?.userId?.name || 'Trainee';
  const phone = followUp.traineeId?.phone || 'Not Available';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const payload = {
        callOutcome,
        notes,
      };

      if (callOutcome === 'CONNECTED' && recordDirectOutcome) {
        payload.directOutcome = {
          situation: directSituation,
          employmentData: {
            isEmployed: directSituation === 'EMPLOYED',
            employerName: employerName || 'Not Disclosed',
            jobRole: jobRole || 'Graduate Role',
            monthlySalaryRange: monthlySalary,
          },
          relevanceRating: 5,
          feedback: {
            notes: 'Recorded by training provider staff during follow-up phone interview with trainee consent.',
          },
        };
      }

      const res = await followUpService.recordCall(followUp._id, payload);
      if (res.data.success) {
        onCallRecorded?.(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to record call attempt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Phone Follow-Up Call"
      subtitle={`Trainee: ${traineeName} | Phone: ${phone}`}
    >
      <form onSubmit={handleSubmit} className="record-call-form">
        {error && (
          <div className="alert-box alert-error mb-4">
            <IconAlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-group mb-4">
          <label className="form-label font-semibold">
            Call Outcome <span className="text-danger">*</span>
          </label>
          <div className="call-outcomes-grid">
            {CALL_OUTCOMES.map((option) => (
              <label
                key={option.value}
                className={`call-outcome-card ${callOutcome === option.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="callOutcome"
                  value={option.value}
                  checked={callOutcome === option.value}
                  onChange={(e) => {
                    setCallOutcome(e.target.value);
                    if (e.target.value !== 'CONNECTED') {
                      setRecordDirectOutcome(false);
                    }
                  }}
                  className="sr-only"
                />
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-muted mt-1">{option.description}</div>
              </label>
            ))}
          </div>
        </div>

        {/* If call was connected, offer direct outcome recording */}
        {callOutcome === 'CONNECTED' && (
          <div className="connected-outcome-section p-4 rounded-lg bg-surface-raised border border-primary/20 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="recordDirectOutcome"
                checked={recordDirectOutcome}
                onChange={(e) => setRecordDirectOutcome(e.target.checked)}
                className="form-checkbox"
              />
              <label htmlFor="recordDirectOutcome" className="text-sm font-semibold cursor-pointer">
                Log Employment & Career Outcome now on Trainee's behalf (with consent)
              </label>
            </div>

            {recordDirectOutcome && (
              <div className="direct-outcome-fields space-y-3 mt-3">
                <div className="form-group">
                  <label className="form-label text-xs">Current Career Status</label>
                  <select
                    className="form-select text-sm"
                    value={directSituation}
                    onChange={(e) => setDirectSituation(e.target.value)}
                  >
                    <option value="EMPLOYED">Employed (Full-Time / Part-Time)</option>
                    <option value="SELF_EMPLOYED">Self-Employed / Freelancer / Entrepreneur</option>
                    <option value="APPRENTICESHIP">Apprenticeship / Traineeship</option>
                    <option value="LOOKING_FOR_JOB">Actively Seeking Employment</option>
                    <option value="FURTHER_EDUCATION">Pursuing Higher Education</option>
                    <option value="OTHER">Other / Not Working</option>
                  </select>
                </div>

                {directSituation === 'EMPLOYED' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label text-xs">Employer Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Infosys, TCS, Local Firm"
                        value={employerName}
                        onChange={(e) => setEmployerName(e.target.value)}
                        className="form-input text-sm"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-xs">Job Role / Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Junior Developer, Tech Trainee"
                        value={jobRole}
                        onChange={(e) => setJobRole(e.target.value)}
                        className="form-input text-sm"
                      />
                    </div>
                    <div className="form-group col-span-2">
                      <label className="form-label text-xs">Monthly Salary Range</label>
                      <select
                        className="form-select text-sm"
                        value={monthlySalary}
                        onChange={(e) => setMonthlySalary(e.target.value)}
                      >
                        <option value="Below ₹15,000">Below ₹15,000</option>
                        <option value="₹15,000–₹25,000">₹15,000–₹25,000</option>
                        <option value="₹25,000–₹35,000">₹25,000–₹35,000</option>
                        <option value="₹35,000–₹50,000">₹35,000–₹50,000</option>
                        <option value="Above ₹50,000">Above ₹50,000</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-group mb-6">
          <label className="form-label font-semibold">Call Notes / Summary</label>
          <textarea
            className="form-textarea"
            rows="3"
            placeholder="Add context on conversation, call back time requested, or non-response details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>

        <div className="modal-actions-end">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} icon={IconPhoneCall}>
            Save Call Record
          </Button>
        </div>
      </form>
    </Modal>
  );
};
