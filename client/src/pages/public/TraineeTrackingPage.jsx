import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { followUpService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import {
  IconGraduationCap,
  IconShield,
  IconBriefcase,
  IconCheckCircle,
  IconAlertCircle,
  IconClock,
  IconUserX,
  IconRotateCcw,
  IconStar,
  IconCheck,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const TraineeTrackingPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Opt-out confirmation modal
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [optOutReason, setOptOutReason] = useState('');

  // Form State
  const [situation, setSituation] = useState('EMPLOYED');
  const [employerName, setEmployerName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('₹30,000–₹50,000');
  const [joiningDate, setJoiningDate] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [businessSector, setBusinessSector] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('₹25,000–₹40,000');

  const [apprenticeOrg, setApprenticeOrg] = useState('');
  const [apprenticeStipend, setApprenticeStipend] = useState('₹15,000–₹20,000');

  const [relevanceRating, setRelevanceRating] = useState(5);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [whatHelped, setWhatHelped] = useState('');
  const [whatMissing, setWhatMissing] = useState('');
  const [additionalTraining, setAdditionalTraining] = useState('');

  const fetchTrackingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await followUpService.getByToken(token);
      if (res.data.success) {
        setData(res.data.data);
        if (res.data.data.skills?.length) {
          setSelectedSkills(res.data.data.skills);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve tracking record. The link may have expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrackingDetails();
    }
  }, [token]);

  const handleSkillToggle = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const payload = {
        situation,
        relevanceRating,
        skillsUsed: selectedSkills,
        feedback: {
          whatHelped,
          whatMissing,
          additionalTraining,
        },
      };

      if (situation === 'EMPLOYED') {
        payload.employmentData = {
          isEmployed: true,
          employerName: employerName || 'Confidential Employer',
          jobRole: jobRole || 'Graduate Specialist',
          industrySector: industry,
          jobLocation: location,
          monthlySalaryRange: salaryRange,
          joiningDate: joiningDate || null,
        };
      } else if (situation === 'SELF_EMPLOYED') {
        payload.selfEmploymentData = {
          businessName,
          businessSector,
          monthlyIncomeRange: monthlyIncome,
        };
      } else if (situation === 'APPRENTICESHIP') {
        payload.apprenticeshipData = {
          organization: apprenticeOrg,
          monthlyStipendRange: apprenticeStipend,
        };
      } else if (situation === 'LOOKING_FOR_JOB' || situation === 'NOT_WORKING') {
        payload.unemploymentData = {
          seekingJob: situation === 'LOOKING_FOR_JOB',
          preferredSector: industry,
          preferredLocation: location,
        };
      }

      const res = await followUpService.submitByToken(token, payload);
      if (res.data.success) {
        setIsSubmittedSuccess(true);
        setToast({ message: '✓ Outcome submitted successfully.', type: 'success' });
        fetchTrackingDetails();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to submit outcome response', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptOutConfirm = async () => {
    try {
      setSubmitting(true);
      const res = await followUpService.optOutByToken(token, { reason: optOutReason });
      if (res.data.success) {
        setShowOptOutModal(false);
        setToast({ message: '✓ Tracking consent withdrawn. Future follow-ups stopped.', type: 'success' });
        fetchTrackingDetails();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to process opt-out', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeTracking = async () => {
    try {
      setSubmitting(true);
      const res = await followUpService.resumeByToken(token);
      if (res.data.success) {
        setToast({ message: '✓ Tracking consent restored. Welcome back!', type: 'success' });
        fetchTrackingDetails();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to resume tracking', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-page-wrapper flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" message="Loading secure outcome questionnaire..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="public-page-wrapper min-h-screen flex items-center justify-center p-4">
        <div className="content-card max-w-lg text-center p-8">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-main mb-2">Tracking Link Expired or Invalid</h2>
          <p className="text-sm text-muted mb-6">
            {error || 'This longitudinal follow-up token does not exist or has expired.'}
          </p>
          <Link to="/login">
            <Button variant="primary">Go to Student Login Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="public-tracking-page min-h-screen pb-16">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Navbar */}
      <header className="public-nav-header">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="brand-logo-icon">
              <IconGraduationCap size={22} />
            </div>
            <div>
              <span className="font-bold text-main tracking-tight">National Skilling Outcome Tracker</span>
              <span className="block text-xs text-muted">Authorized Longitudinal Verification</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold rounded-full flex items-center gap-1">
              <IconShield size={12} /> SECURE ENCRYPTED LINK
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8">
        {/* Course Card Summary */}
        <div className="content-card mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 mb-4">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {data.followUpType?.replace('_', '-')} Outcome Verification
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-main mt-1">{data.courseName}</h1>
              <p className="text-sm text-muted mt-0.5">
                Conducted by <strong>{data.providerName}</strong> ({data.batchName})
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted block">Certified Graduate</span>
              <span className="font-semibold text-main text-base">{data.traineeName}</span>
              <span className="text-xs text-muted block font-mono">ID: {data.maskedAadhaar}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted">
            <div>
              <span className="block text-muted">Certificate Number</span>
              <span className="font-mono font-medium text-main">{data.certificateNumber || 'Verified'}</span>
            </div>
            <div>
              <span className="block text-muted">Issued Date</span>
              <span className="font-medium text-main">{formatDate(data.issueDate)}</span>
            </div>
            <div>
              <span className="block text-muted">Privacy Level</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Strictly Masked & Protected</span>
            </div>
          </div>
        </div>

        {/* State 1: Opted Out */}
        {data.isOptedOut ? (
          <div className="content-card text-center py-10 px-6 border-purple-500/30">
            <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconUserX size={32} />
            </div>
            <h2 className="text-xl font-bold text-main mb-2">Tracking Currently Suspended</h2>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">
              You have previously chosen to stop routine voluntary outcome follow-ups for this training program. No automated contact will be initiated.
            </p>
            <Button
              variant="primary"
              icon={IconRotateCcw}
              onClick={handleResumeTracking}
              loading={submitting}
            >
              Resume Outcome Tracking
            </Button>
          </div>
        ) : data.isCompleted || isSubmittedSuccess ? (
          /* State 2: Already Completed Receipt */
          <div className="content-card text-center py-10 px-6 border-emerald-500/30">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-main mb-2">Outcome Questionnaire Completed!</h2>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">
              Thank you for contributing your career updates. Your verified outcomes help enhance vocational curricula and scheme accountability.
            </p>
            <div className="p-4 bg-surface-raised rounded-lg max-w-md mx-auto text-left text-xs text-muted mb-6">
              <div className="font-semibold text-main mb-1">Response Summary:</div>
              <div>Status: <span className="text-primary font-medium">{data.outcomeRecord?.situation || situation}</span></div>
              {data.outcomeRecord?.employmentData?.employerName && (
                <div>Employer: <span className="text-main font-medium">{data.outcomeRecord.employmentData.employerName}</span></div>
              )}
              <div>Logged Date: <span className="text-main">{formatDate(data.outcomeRecord?.observedAt || new Date())}</span></div>
            </div>
            <div className="flex justify-center gap-3">
              <Link to="/login">
                <Button variant="outline">Go to Student Portal</Button>
              </Link>
            </div>
          </div>
        ) : (
          /* State 3: Active Outcome Questionnaire Form */
          <form onSubmit={handleSubmit} className="content-card shadow-md space-y-6">
            <div className="form-intro border-b border-border pb-4">
              <h2 className="text-lg font-bold text-main flex items-center gap-2">
                <IconBriefcase size={20} className="text-primary" />
                Post-Training Career Status
              </h2>
              <p className="text-xs text-muted mt-1">
                Please take 2 minutes to provide accurate details about your employment, business, or education progress.
              </p>
            </div>

            {/* 1. Situation Selection */}
            <div className="form-group">
              <label className="form-label font-semibold">
                What is your current work / education status? *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                {[
                  { value: 'EMPLOYED', label: 'Employed (Full-Time / Part-Time)' },
                  { value: 'SELF_EMPLOYED', label: 'Self-Employed / Freelancer / Entrepreneur' },
                  { value: 'APPRENTICESHIP', label: 'Apprenticeship / On-the-Job Trainee' },
                  { value: 'LOOKING_FOR_JOB', label: 'Actively Looking for a Job' },
                  { value: 'FURTHER_EDUCATION', label: 'Pursuing Higher Studies / Further Education' },
                  { value: 'NOT_WORKING', label: 'Not Working / Career Break' },
                  { value: 'OTHER', label: 'Other' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`situation-select-card p-3 rounded-lg border cursor-pointer transition-all ${
                      situation === opt.value
                        ? 'border-primary bg-primary/5 shadow-xs font-semibold text-primary'
                        : 'border-border bg-surface hover:border-primary/40 text-main'
                    }`}
                  >
                    <input
                      type="radio"
                      name="situation"
                      value={opt.value}
                      checked={situation === opt.value}
                      onChange={(e) => setSituation(e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-xs">{opt.label}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Conditional Fields: EMPLOYED */}
            {situation === 'EMPLOYED' && (
              <div className="conditional-group bg-surface-raised p-4 rounded-xl border border-border space-y-4">
                <h3 className="text-sm font-semibold text-main">Employment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label text-xs">Employer / Company Name *</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="e.g. Infosys, Tech Mahindra"
                      value={employerName}
                      onChange={(e) => setEmployerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Job Role / Designation *</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="e.g. Junior Developer, Technician"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Industry Sector</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="e.g. Information Technology, Healthcare"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Job Location (City / Remote)</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="e.g. Vijayawada, Hyderabad"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Monthly Salary Range *</label>
                    <select
                      className="form-select text-sm"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      required
                    >
                      <option value="Below ₹15,000">Below ₹15,000</option>
                      <option value="₹15,000–₹25,000">₹15,000–₹25,000</option>
                      <option value="₹25,000–₹35,000">₹25,000–₹35,000</option>
                      <option value="₹35,000–₹50,000">₹35,000–₹50,000</option>
                      <option value="Above ₹50,000">Above ₹50,000</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Joining Date</label>
                    <input
                      type="date"
                      className="form-input text-sm"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Fields: SELF_EMPLOYED */}
            {situation === 'SELF_EMPLOYED' && (
              <div className="conditional-group bg-surface-raised p-4 rounded-xl border border-border space-y-4">
                <h3 className="text-sm font-semibold text-main">Self-Employment & Business Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label text-xs">Business / Venture Name</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="e.g. Sharma Tech Services"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Nature of Work / Sector</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="e.g. Freelance Web Design"
                      value={businessSector}
                      onChange={(e) => setBusinessSector(e.target.value)}
                    />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label text-xs">Estimated Monthly Income</label>
                    <select
                      className="form-select text-sm"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                    >
                      <option value="Below ₹15,000">Below ₹15,000</option>
                      <option value="₹15,000–₹25,000">₹15,000–₹25,000</option>
                      <option value="₹25,000–₹40,000">₹25,000–₹40,000</option>
                      <option value="Above ₹40,000">Above ₹40,000</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Fields: APPRENTICESHIP */}
            {situation === 'APPRENTICESHIP' && (
              <div className="conditional-group bg-surface-raised p-4 rounded-xl border border-border space-y-4">
                <h3 className="text-sm font-semibold text-main">Apprenticeship Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label text-xs">Apprentice Organization *</label>
                    <input
                      type="text"
                      className="form-input text-sm"
                      placeholder="e.g. Heavy Electricals Corp"
                      value={apprenticeOrg}
                      onChange={(e) => setApprenticeOrg(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Monthly Stipend Range</label>
                    <select
                      className="form-select text-sm"
                      value={apprenticeStipend}
                      onChange={(e) => setApprenticeStipend(e.target.value)}
                    >
                      <option value="Below ₹10,000">Below ₹10,000</option>
                      <option value="₹10,000–₹15,000">₹10,000–₹15,000</option>
                      <option value="₹15,000–₹20,000">₹15,000–₹20,000</option>
                      <option value="Above ₹20,000">Above ₹20,000</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Training Relevance Rating */}
            <div className="form-group">
              <label className="form-label font-semibold">
                How relevant was the training to your current career / job prospects? *
              </label>
              <div className="flex items-center gap-3 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRelevanceRating(star)}
                    className="p-2 rounded-lg hover:bg-surface-raised transition-colors focus:outline-hidden"
                  >
                    <IconStar
                      size={28}
                      className={star <= relevanceRating ? 'text-amber-400 fill-amber-400' : 'text-border'}
                    />
                  </button>
                ))}
                <span className="text-sm font-semibold text-primary ml-2">
                  {relevanceRating === 5
                    ? 'Extremely Relevant'
                    : relevanceRating === 4
                    ? 'Very Relevant'
                    : relevanceRating === 3
                    ? 'Moderately Relevant'
                    : relevanceRating === 2
                    ? 'Slightly Relevant'
                    : 'Not Relevant'}
                </span>
              </div>
            </div>

            {/* 4. Skills in Use */}
            {data.skills && data.skills.length > 0 && (
              <div className="form-group">
                <label className="form-label font-semibold">Which skills from the course are you currently using?</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.skills.map((skill) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillToggle(skill)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-xs font-semibold'
                            : 'bg-surface text-muted border-border hover:border-primary/40'
                        }`}
                      >
                        {isSelected && <IconCheck size={12} />}
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Qualitative Feedback */}
            <div className="space-y-3">
              <div className="form-group">
                <label className="form-label text-xs">What helped you the most in the training?</label>
                <input
                  type="text"
                  className="form-input text-sm"
                  placeholder="e.g. Hands-on practical lab drills, project-based assignments"
                  value={whatHelped}
                  onChange={(e) => setWhatHelped(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs">What was missing or could be improved?</label>
                <input
                  type="text"
                  className="form-input text-sm"
                  placeholder="e.g. More mock technical interviews, advanced deployment topics"
                  value={whatMissing}
                  onChange={(e) => setWhatMissing(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs">What additional training or skills do you require next?</label>
                <input
                  type="text"
                  className="form-input text-sm"
                  placeholder="e.g. Cloud architecture, System design, Cyber certifications"
                  value={additionalTraining}
                  onChange={(e) => setAdditionalTraining(e.target.value)}
                />
              </div>
            </div>

            {/* Submit & Opt-Out Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <button
                type="button"
                className="text-xs text-muted hover:text-danger underline transition-colors"
                onClick={() => setShowOptOutModal(true)}
              >
                Stop Future Follow-ups
              </button>

              <Button
                variant="primary"
                type="submit"
                loading={submitting}
                icon={IconCheckCircle}
                className="w-full sm:w-auto"
              >
                Submit Outcome Questionnaire
              </Button>
            </div>
          </form>
        )}
      </main>

      {/* Opt-Out Modal */}
      <Modal
        isOpen={showOptOutModal}
        onClose={() => setShowOptOutModal(false)}
        title="Stop Future Follow-ups"
        subtitle="Withdraw consent for voluntary outcome tracking"
      >
        <div className="opt-out-modal-body space-y-4">
          <div className="p-3 bg-purple-500/10 rounded-lg text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
            You can stop future voluntary outcome follow-ups at any time. Stopping follow-ups means that the system will no longer send routine outcome requests to you. You can choose to resume tracking later.
          </div>

          <div className="form-group">
            <label className="form-label text-xs">Reason for stopping (optional)</label>
            <input
              type="text"
              placeholder="e.g. Prefer not to share career updates"
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              className="form-input text-sm"
            />
          </div>

          <p className="text-xs text-muted">
            Are you sure you want to stop future outcome follow-ups for this course?
          </p>

          <div className="modal-actions-end">
            <Button variant="ghost" onClick={() => setShowOptOutModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleOptOutConfirm}
              loading={submitting}
              icon={IconUserX}
            >
              Confirm Stop Follow-ups
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
