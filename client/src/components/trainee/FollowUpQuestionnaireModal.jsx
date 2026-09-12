import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { followUpService } from '../../services/api';
import {
  IconBriefcase,
  IconCheckSquare,
  IconStar,
  IconHelpCircle,
  IconCheckCircle,
} from '../common/Icons';

export const FollowUpQuestionnaireModal = ({
  isOpen,
  onClose,
  followUp,
  onSubmitted,
}) => {
  const [step, setStep] = useState(1); // 1: Situation, 2: Details, 3: Feedback
  const [situation, setSituation] = useState('EMPLOYED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Employed state
  const [employedData, setEmployedData] = useState({
    isEmployed: true,
    employerName: '',
    jobRole: '',
    startDate: '',
    monthlySalaryRange: '₹10,000–₹20,000',
    isRelatedToTraining: 'YES',
    trainingUsefulness: 5,
  });

  // Self-Employed state
  const [selfEmployedData, setSelfEmployedData] = useState({
    isSelfEmployed: true,
    businessType: '',
    startDate: '',
    monthlyIncomeRange: '₹10,000–₹20,000',
    isRelatedToTraining: 'YES',
    trainingUsefulness: 5,
  });

  // Apprentice state
  const [apprenticeData, setApprenticeData] = useState({
    organizationName: '',
    role: '',
    startDate: '',
    expectedEndDate: '',
    monthlyStipendRange: '₹10,000–₹20,000',
    isRelatedToTraining: 'YES',
  });

  // Unemployed state
  const [unemployedData, setUnemployedData] = useState({
    isLookingForWork: true,
    primaryReason: 'Could not find suitable job',
    needsAdditionalSkills: true,
    requestedSkills: '',
  });

  // Universal Feedback state
  const [relevanceRating, setRelevanceRating] = useState(5);
  const [feedback, setFeedback] = useState({
    whatCouldBeBetter: '',
    additionalSupportNeeded: '',
  });

  if (!followUp) return null;

  const typeLabel = followUp.followUpType?.replace('_', '-');
  const courseName = followUp.enrollmentId?.courseId?.courseName || 'Skilling Program';

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const payload = {
        situation,
        relevanceRating,
        feedback,
      };

      const cleanEmployed = { ...employedData };
      if (!cleanEmployed.startDate) cleanEmployed.startDate = null;

      const cleanSelfEmployed = { ...selfEmployedData };
      if (!cleanSelfEmployed.startDate) cleanSelfEmployed.startDate = null;

      const cleanApprentice = { ...apprenticeData };
      if (!cleanApprentice.startDate) cleanApprentice.startDate = null;
      if (!cleanApprentice.expectedEndDate) cleanApprentice.expectedEndDate = null;

      if (situation === 'EMPLOYED') {
        payload.employmentData = cleanEmployed;
      } else if (situation === 'SELF_EMPLOYED') {
        payload.selfEmploymentData = cleanSelfEmployed;
      } else if (situation === 'APPRENTICE') {
        payload.apprenticeshipData = cleanApprentice;
      } else if (situation === 'UNEMPLOYED') {
        payload.unemploymentData = unemployedData;
      }

      const res = await followUpService.submit(followUp._id, payload);
      if (res.data.success) {
        if (onSubmitted) {
          onSubmitted(res.data);
        }
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit follow-up questionnaire.');
    } finally {
      setLoading(false);
    }
  };

  const situationOptions = [
    { value: 'EMPLOYED', label: 'Employed', desc: 'Working with a company / employer' },
    { value: 'SELF_EMPLOYED', label: 'Self-Employed', desc: 'Running own venture or freelance' },
    { value: 'APPRENTICE', label: 'Apprentice / Intern', desc: 'Structured on-the-job training' },
    { value: 'UNEMPLOYED', label: 'Seeking Work', desc: 'Currently looking for opportunities' },
    { value: 'STUDYING', label: 'Higher Studies', desc: 'Enrolled in further education' },
    { value: 'OTHER', label: 'Other', desc: 'Personal reasons / other' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${typeLabel} Outcome Follow-Up Questionnaire`}
      subtitle={`Milestone for: ${courseName}`}
      maxWidth="680px"
    >
      <div className="questionnaire-modal-content">
        {error && <div className="form-error-alert">{error}</div>}

        {/* Progress Bar */}
        <div className="wizard-step-tracker">
          <div className={`wizard-step-pill ${step >= 1 ? 'active' : ''}`}>1. Current Status</div>
          <div className={`wizard-step-pill ${step >= 2 ? 'active' : ''}`}>2. Career Details</div>
          <div className={`wizard-step-pill ${step >= 3 ? 'active' : ''}`}>3. Feedback & Rating</div>
        </div>

        {/* STEP 1: Situation Selection */}
        {step === 1 && (
          <div className="wizard-step-container">
            <h3 className="wizard-step-heading">What is your current career situation?</h3>
            <p className="wizard-step-subheading">
              Select the status that best represents your primary activity today.
            </p>

            <div className="situation-grid">
              {situationOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`situation-choice-card ${situation === opt.value ? 'selected' : ''}`}
                  onClick={() => setSituation(opt.value)}
                >
                  <input
                    type="radio"
                    name="situation"
                    checked={situation === opt.value}
                    onChange={() => setSituation(opt.value)}
                  />
                  <div className="situation-text-col">
                    <span className="situation-choice-title">{opt.label}</span>
                    <span className="situation-choice-desc">{opt.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="wizard-footer-actions">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setStep(2)}>
                Next: Career Details →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Adaptive Details Form */}
        {step === 2 && (
          <div className="wizard-step-container">
            {situation === 'EMPLOYED' && (
              <div className="form-grid">
                <h4 className="section-subtitle">Employment Information</h4>

                {/* Redundant 'Are you employed' prompt removed per user request (already chosen in Step 1) */}
                <div className="form-group">
                  <label className="form-label">Employer / Company Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Infosys Ltd, Local Tech Corp"
                    value={employedData.employerName}
                    onChange={(e) =>
                      setEmployedData({ ...employedData, employerName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Role / Designation *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Junior Web Developer, Technician"
                    value={employedData.jobRole}
                    onChange={(e) =>
                      setEmployedData({ ...employedData, jobRole: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">When did you start this job?</label>
                  <input
                    type="date"
                    className="form-input"
                    value={employedData.startDate}
                    onChange={(e) =>
                      setEmployedData({ ...employedData, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Approximate Monthly Salary Range</label>
                  <select
                    className="form-select"
                    value={employedData.monthlySalaryRange}
                    onChange={(e) =>
                      setEmployedData({ ...employedData, monthlySalaryRange: e.target.value })
                    }
                  >
                    <option value="Below ₹10,000">Below ₹10,000</option>
                    <option value="₹10,000–₹20,000">₹10,000–₹20,000</option>
                    <option value="₹20,000–₹30,000">₹20,000–₹30,000</option>
                    <option value="₹30,000–₹50,000">₹30,000–₹50,000</option>
                    <option value="Above ₹50,000">Above ₹50,000</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Is your job related to your training?</label>
                  <select
                    className="form-select"
                    value={employedData.isRelatedToTraining}
                    onChange={(e) =>
                      setEmployedData({ ...employedData, isRelatedToTraining: e.target.value })
                    }
                  >
                    <option value="YES">Yes, directly related</option>
                    <option value="PARTLY">Partly related</option>
                    <option value="NO">No, different domain</option>
                  </select>
                </div>
              </div>
            )}

            {situation === 'SELF_EMPLOYED' && (
              <div className="form-grid">
                <h4 className="section-subtitle">Self-Employment & Venture Details</h4>

                <div className="form-group">
                  <label className="form-label">Type of Business / Freelance Work *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Electrical Services Shop, Web Design Agency"
                    value={selfEmployedData.businessType}
                    onChange={(e) =>
                      setSelfEmployedData({ ...selfEmployedData, businessType: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">When did you start?</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selfEmployedData.startDate}
                    onChange={(e) =>
                      setSelfEmployedData({ ...selfEmployedData, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Approximate Monthly Income Range</label>
                  <select
                    className="form-select"
                    value={selfEmployedData.monthlyIncomeRange}
                    onChange={(e) =>
                      setSelfEmployedData({ ...selfEmployedData, monthlyIncomeRange: e.target.value })
                    }
                  >
                    <option value="Below ₹10,000">Below ₹10,000</option>
                    <option value="₹10,000–₹20,000">₹10,000–₹20,000</option>
                    <option value="₹20,000–₹30,000">₹20,000–₹30,000</option>
                    <option value="₹30,000–₹50,000">₹30,000–₹50,000</option>
                    <option value="Above ₹50,000">Above ₹50,000</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Is this work related to your training?</label>
                  <select
                    className="form-select"
                    value={selfEmployedData.isRelatedToTraining}
                    onChange={(e) =>
                      setSelfEmployedData({ ...selfEmployedData, isRelatedToTraining: e.target.value })
                    }
                  >
                    <option value="YES">Yes, directly related</option>
                    <option value="PARTLY">Partly related</option>
                    <option value="NO">No, different domain</option>
                  </select>
                </div>
              </div>
            )}

            {situation === 'APPRENTICE' && (
              <div className="form-grid">
                <h4 className="section-subtitle">Apprenticeship & Internship Details</h4>

                <div className="form-group">
                  <label className="form-label">Host Organization / Company *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Tata Motors, Tech Solutions"
                    value={apprenticeData.organizationName}
                    onChange={(e) =>
                      setApprenticeData({ ...apprenticeData, organizationName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Apprentice Role *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Graduate Apprentice, Trade Trainee"
                    value={apprenticeData.role}
                    onChange={(e) =>
                      setApprenticeData({ ...apprenticeData, role: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={apprenticeData.startDate}
                    onChange={(e) =>
                      setApprenticeData({ ...apprenticeData, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Stipend Range</label>
                  <select
                    className="form-select"
                    value={apprenticeData.monthlyStipendRange}
                    onChange={(e) =>
                      setApprenticeData({ ...apprenticeData, monthlyStipendRange: e.target.value })
                    }
                  >
                    <option value="Below ₹10,000">Below ₹10,000</option>
                    <option value="₹10,000–₹20,000">₹10,000–₹20,000</option>
                    <option value="₹20,000–₹30,000">₹20,000–₹30,000</option>
                    <option value="Above ₹30,000">Above ₹30,000</option>
                    <option value="Unpaid">Unpaid Internship</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Is this apprenticeship related to training?</label>
                  <select
                    className="form-select"
                    value={apprenticeData.isRelatedToTraining}
                    onChange={(e) =>
                      setApprenticeData({ ...apprenticeData, isRelatedToTraining: e.target.value })
                    }
                  >
                    <option value="YES">Yes, directly related</option>
                    <option value="PARTLY">Partly related</option>
                    <option value="NO">No, different domain</option>
                  </select>
                </div>
              </div>
            )}

            {situation === 'UNEMPLOYED' && (
              <div className="form-grid">
                <h4 className="section-subtitle">Job Search & Skill Gap Assessment</h4>

                <div className="form-group">
                  <label className="form-label">Are you currently looking for work?</label>
                  <select
                    className="form-select"
                    value={unemployedData.isLookingForWork ? 'YES' : 'NO'}
                    onChange={(e) =>
                      setUnemployedData({
                        ...unemployedData,
                        isLookingForWork: e.target.value === 'YES',
                      })
                    }
                  >
                    <option value="YES">Yes, actively looking</option>
                    <option value="NO">Not looking currently</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">What is the main reason you are not employed?</label>
                  <select
                    className="form-select"
                    value={unemployedData.primaryReason}
                    onChange={(e) =>
                      setUnemployedData({ ...unemployedData, primaryReason: e.target.value })
                    }
                  >
                    <option value="Could not find suitable job">Could not find suitable job</option>
                    <option value="Lack of required skills">Lack of required skills</option>
                    <option value="Salary too low">Salary offered was too low</option>
                    <option value="Location issue">Location / relocation issues</option>
                    <option value="No suitable opportunities">No suitable opportunities nearby</option>
                    <option value="Further studies">Pursuing higher studies</option>
                    <option value="Personal reasons">Personal / family reasons</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Do you feel you need additional skills?</label>
                  <select
                    className="form-select"
                    value={unemployedData.needsAdditionalSkills ? 'YES' : 'NO'}
                    onChange={(e) =>
                      setUnemployedData({
                        ...unemployedData,
                        needsAdditionalSkills: e.target.value === 'YES',
                      })
                    }
                  >
                    <option value="YES">Yes, additional skills needed</option>
                    <option value="NO">No, my skills are adequate</option>
                  </select>
                </div>

                {unemployedData.needsAdditionalSkills && (
                  <div className="form-group">
                    <label className="form-label">Which specific skills would help you get placed?</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Advanced React, Cloud Hosting, English Communication"
                      value={unemployedData.requestedSkills}
                      onChange={(e) =>
                        setUnemployedData({ ...unemployedData, requestedSkills: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {(situation === 'STUDYING' || situation === 'OTHER') && (
              <div className="form-grid">
                <p className="text-muted">
                  Thank you for keeping your profile updated. Please proceed to the final feedback step.
                </p>
              </div>
            )}

            <div className="wizard-footer-actions">
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Back to Situation
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next: Training Feedback →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Universal Feedback & Rating */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="wizard-step-container">
            <h3 className="wizard-step-heading">Training Program Feedback</h3>
            <p className="wizard-step-subheading">
              How valuable was your training in {courseName} for your career journey?
            </p>

            {/* Star Rating */}
            <div className="rating-select-container">
              <label className="form-label">Overall Usefulness Rating (1 to 5 Stars)</label>
              <div className="star-rating-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    className={`star-rating-btn ${relevanceRating >= star ? 'filled' : ''}`}
                    onClick={() => setRelevanceRating(star)}
                  >
                    <IconStar size={28} />
                  </button>
                ))}
                <span className="rating-num-label">{relevanceRating} / 5 Stars</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>What could have been better about the training?</span>
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem', fontWeight: 'normal', opacity: 0.85 }}>Optional</span>
              </label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="e.g. More practical labs, recent framework versions, mock interviews..."
                value={feedback.whatCouldBeBetter}
                onChange={(e) =>
                  setFeedback({ ...feedback, whatCouldBeBetter: e.target.value })
                }
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>What additional career support would help you now?</span>
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem', fontWeight: 'normal', opacity: 0.85 }}>Optional</span>
              </label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="e.g. Placement drives, advanced certification vouchers, resume review..."
                value={feedback.additionalSupportNeeded}
                onChange={(e) =>
                  setFeedback({ ...feedback, additionalSupportNeeded: e.target.value })
                }
              ></textarea>
            </div>

            <div className="wizard-footer-actions">
              <Button variant="secondary" onClick={() => setStep(2)} disabled={loading}>
                ← Back
              </Button>
              <Button variant="success" icon={IconCheckCircle} type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Complete Follow-Up Submission'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
