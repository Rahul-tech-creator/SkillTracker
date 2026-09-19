import React, { useState, useEffect } from 'react';
import { outcomeService } from '../../services/api';
import {
  IconClose,
  IconCheckCircle,
  IconAlertCircle,
  IconShield,
  IconBuilding,
  IconUser,
  IconFileText,
  IconDollarSign,
  IconPlus,
  IconExternalLink,
} from '../common/Icons';
import { formatCurrency, formatDate } from '../../utils/helpers';

export const OutcomeVerificationModal = ({ outcome, onClose, onVerified }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for multi-source verification
  const [hasProviderConfirmation, setHasProviderConfirmation] = useState(false);
  const [hasEmployerConfirmation, setHasEmployerConfirmation] = useState(false);
  const [isEmployeeRecognized, setIsEmployeeRecognized] = useState(true);
  const [employerReportedRole, setEmployerReportedRole] = useState('');
  const [employerReportedSalary, setEmployerReportedSalary] = useState('');
  const [employerReportedJoiningDate, setEmployerReportedJoiningDate] = useState('');
  const [employerComments, setEmployerComments] = useState('');

  // Evidence state
  const [evidenceType, setEvidenceType] = useState('APPOINTMENT_LETTER');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [showAddEvidence, setShowAddEvidence] = useState(false);

  // Directorate decision
  const [actionStatus, setActionStatus] = useState('VERIFIED');
  const [verificationNotes, setVerificationNotes] = useState('');

  const fetchVerification = async () => {
    if (!outcome?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await outcomeService.getVerification(outcome._id);
      const v = res.data?.data || null;
      setData(v);

      if (v) {
        setHasProviderConfirmation(v.confidenceSignals?.providerConfirmed > 0);
        setHasEmployerConfirmation(v.confidenceSignals?.employerConfirmed > 0);
        setActionStatus(v.status || 'PENDING_REVIEW');

        if (v.employerVerificationDetails) {
          const emp = v.employerVerificationDetails;
          setIsEmployeeRecognized(emp.isEmployeeRecognized ?? true);
          setEmployerReportedRole(emp.employerReportedRole || '');
          setEmployerReportedSalary(emp.employerWageBandReported || '');
          if (emp.employerReportedJoiningDate) {
            setEmployerReportedJoiningDate(new Date(emp.employerReportedJoiningDate).toISOString().split('T')[0]);
          }
          setEmployerComments(emp.employerComments || '');
        }
      }
    } catch (err) {
      console.error('Failed to load verification:', err);
      setError(err.message || 'Failed to retrieve outcome verification data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [outcome]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        hasProviderConfirmation,
        hasEmployerConfirmation,
        status: actionStatus,
        verificationNotes,
      };

      if (hasEmployerConfirmation) {
        payload.employerData = {
          isEmployeeRecognized,
          roleConfirmed: !employerReportedRole || employerReportedRole.toLowerCase() === (outcome.jobRole || outcome.designation || '').toLowerCase(),
          employerReportedRole: employerReportedRole || undefined,
          employerReportedSalary: employerReportedSalary ? Number(employerReportedSalary) || undefined : undefined,
          employerWageBandReported: employerReportedSalary ? `₹${Number(employerReportedSalary).toLocaleString()}` : undefined,
          employerReportedJoiningDate: employerReportedJoiningDate || undefined,
          joiningDateConfirmed: !employerReportedJoiningDate,
          employerComments,
        };
      }

      if (showAddEvidence && documentTitle.trim()) {
        payload.newEvidence = {
          evidenceType,
          documentTitle: documentTitle.trim(),
          documentUrl: documentUrl.trim(),
          signalWeight: 20,
        };
      }

      const res = await outcomeService.verify(outcome._id, payload);
      if (res.data?.success) {
        if (onVerified) onVerified();
        await fetchVerification();
        setShowAddEvidence(false);
        setDocumentTitle('');
        setDocumentUrl('');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update verification');
    } finally {
      setSubmitting(false);
    }
  };

  const confidenceScore = data?.confidenceScore ?? (outcome.confidenceScore || 20);
  const discrepancies = data?.discrepancies || [];
  const isDiscrepant = discrepancies.length > 0;
  const externalInfo = data?.externalIntegration || {
    status: 'PENDING_EXTERNAL_INTEGRATION',
    message:
      'Direct external government / employer database integration is pending authorized production API gateway credentials. Local multi-source verification is active and authoritative.',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container verification-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        style={{ maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-category-tag">LONGITUDINAL OUTCOME AUDIT</span>
            <h3 className="modal-title">
              Verification Engine — Milestone {outcome.milestone || outcome.followUpType || 'M3'}
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </div>

        <div className="modal-body verification-modal-body">
          {loading && (
            <div className="loading-state-center" style={{ padding: '3rem', textAlign: 'center' }}>
              <span className="spinner-md"></span>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                Querying verification records and consistency matrix...
              </p>
            </div>
          )}

          {error && (
            <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
              <IconAlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Trainee & Employment Snapshot */}
              <div className="verification-top-summary">
                <div className="summary-col">
                  <span className="summary-label">TRAINEE IDENTITY</span>
                  <div className="summary-val-main">
                    <IconUser size={16} />
                    <span>{outcome.trainee?.fullName || outcome.traineeId?.userId?.name || 'Trainee'}</span>
                  </div>
                  <div className="identity-token-badge">
                    <IconShield size={12} />
                    <span>{outcome.trainee?.internalTraineeId || outcome.traineeId?.internalTraineeId || 'SECURE-TOKEN'}</span>
                  </div>
                </div>

                <div className="summary-col">
                  <span className="summary-label">REPORTED EMPLOYER</span>
                  <div className="summary-val-main">
                    <IconBuilding size={16} />
                    <span>{outcome.employer?.companyName || outcome.employmentData?.employerName || outcome.employerName || 'Self-Employed'}</span>
                  </div>
                  <span className="summary-sub">
                    Designation: {outcome.employmentData?.jobRole || outcome.designation || 'Not specified'}
                  </span>
                </div>

                <div className="summary-col">
                  <span className="summary-label">REPORTED MONTHLY SALARY</span>
                  <div className="summary-val-main font-mono text-success">
                    <IconDollarSign size={16} />
                    <span>{formatCurrency(outcome.employmentData?.monthlySalary || outcome.monthlySalary || outcome.salary || 0)}</span>
                  </div>
                  <span className="summary-sub">Observed: {formatDate(outcome.observedAt || outcome.createdAt)}</span>
                </div>
              </div>

              {/* Multi-Source Algorithmic Confidence Header */}
              <div className="confidence-score-panel" style={{ marginTop: '1rem' }}>
                <div className="confidence-header">
                  <div className="confidence-title-wrap">
                    <h4>Multi-Source Algorithmic Confidence</h4>
                    <span className="confidence-subtitle">
                      Derived deterministically from Trainee, Provider, Employer, and Documentary signals
                    </span>
                  </div>
                  <div className={`confidence-score-dial ${confidenceScore >= 75 ? 'dial-high' : confidenceScore >= 45 ? 'dial-medium' : 'dial-low'}`}>
                    <span className="dial-value">{confidenceScore}%</span>
                    <span className="dial-label">
                      {confidenceScore >= 75 ? 'HIGH CONFIDENCE' : confidenceScore >= 45 ? 'MODERATE' : 'AUDIT REQUIRED'}
                    </span>
                  </div>
                </div>

                <div className="confidence-bar-bg" style={{ margin: '1rem 0' }}>
                  <div
                    className={`confidence-bar-fill ${confidenceScore >= 75 ? 'fill-high' : confidenceScore >= 45 ? 'fill-medium' : 'fill-low'}`}
                    style={{ width: `${Math.min(100, Math.max(5, confidenceScore))}%` }}
                  ></div>
                </div>

                {/* Real Live Signals Breakdown */}
                <div className="confidence-breakdown-grid">
                  <div className="breakdown-item">
                    <span className="item-k">Trainee Self-Report</span>
                    <span className="item-v text-success">+{data?.confidenceSignals?.traineeSelfReport || 20} pts</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="item-k">Provider Attestation</span>
                    <span className={`item-v ${data?.confidenceSignals?.providerConfirmed > 0 ? 'text-success' : 'text-muted'}`}>
                      +{data?.confidenceSignals?.providerConfirmed || 0} pts
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="item-k">Employer Confirmation</span>
                    <span className={`item-v ${data?.confidenceSignals?.employerConfirmed > 0 ? 'text-success' : 'text-muted'}`}>
                      +{data?.confidenceSignals?.employerConfirmed || 0} pts
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="item-k">Documentary Artifacts</span>
                    <span className={`item-v ${data?.confidenceSignals?.documentaryEvidence > 0 ? 'text-success' : 'text-muted'}`}>
                      +{data?.confidenceSignals?.documentaryEvidence || 0} pts
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="item-k">Discrepancy Deductions</span>
                    <span className={`item-v ${data?.confidenceSignals?.discrepancyDeductions > 0 ? 'text-danger' : 'text-muted'}`}>
                      -{data?.confidenceSignals?.discrepancyDeductions || 0} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Online Verification Adapter Notice (Rule 6: Truthful Integration) */}
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'rgba(217, 119, 6, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <IconAlertCircle size={20} style={{ color: '#D97706', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#B45309' }}>
                      External Integration Status:
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                      {externalInfo.status || 'PENDING_EXTERNAL_INTEGRATION'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {externalInfo.message}
                  </p>
                </div>
              </div>

              {/* Flagged Discrepancies Banner (Calculated from real values) */}
              {isDiscrepant && (
                <div className="discrepancy-alert-banner" style={{ marginTop: '1.25rem' }}>
                  <IconAlertCircle size={20} className="text-danger" style={{ flexShrink: 0 }} />
                  <div className="discrepancy-content">
                    <h5>Cross-Check Discrepancy Flagged</h5>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                      {discrepancies.map((d, i) => (
                        <li key={i}>
                          <strong>[{d.severity}] {d.field}:</strong> {d.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Interactive Multi-Source Verification Form */}
              <form className="verification-decision-form" onSubmit={handleVerify} style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                  Multi-Source Audit Actions
                </h4>

                {/* Level 2: Provider Attestation */}
                <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={hasProviderConfirmation}
                      onChange={(e) => setHasProviderConfirmation(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Level 2: Provider Attestation Confirmed
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Training provider placement cell confirms graduate employment status and contact.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Level 3: Employer Direct Verification */}
                <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={hasEmployerConfirmation}
                      onChange={(e) => setHasEmployerConfirmation(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      Level 3: Direct Employer Verification
                    </span>
                  </label>

                  {hasEmployerConfirmation && (
                    <div style={{ paddingLeft: '1.75rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: '600' }}>Candidate Recognized on Payroll?</label>
                        <select
                          className="form-control"
                          value={isEmployeeRecognized ? 'YES' : 'NO'}
                          onChange={(e) => setIsEmployeeRecognized(e.target.value === 'YES')}
                        >
                          <option value="YES">Yes, active on company records</option>
                          <option value="NO">No, candidate not recognized on payroll (Critical Discrepancy)</option>
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: '600' }}>
                            Employer Confirmed Role
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Junior Electrician"
                            value={employerReportedRole}
                            onChange={(e) => setEmployerReportedRole(e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: '600' }}>
                            Employer Confirmed Monthly Salary (₹)
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="e.g. 18000"
                            value={employerReportedSalary}
                            onChange={(e) => setEmployerReportedSalary(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Level 4: Documentary Artifacts */}
                <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      Level 4: Documentary Evidence ({data?.evidence?.length || 0} attached)
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowAddEvidence(!showAddEvidence)}
                    >
                      <IconPlus size={14} /> {showAddEvidence ? 'Cancel' : 'Add Document'}
                    </button>
                  </div>

                  {data?.evidence && data.evidence.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: showAddEvidence ? '1rem' : 0 }}>
                      {data.evidence.map((ev, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IconFileText size={16} className="text-primary" />
                            <span style={{ fontWeight: '600' }}>{ev.documentTitle}</span>
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                              {ev.evidenceType}
                            </span>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>+{ev.signalWeight} pts</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showAddEvidence && (
                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Document Type</label>
                          <select
                            className="form-control"
                            value={evidenceType}
                            onChange={(e) => setEvidenceType(e.target.value)}
                          >
                            <option value="APPOINTMENT_LETTER">Appointment / Offer Letter</option>
                            <option value="SALARY_SLIP">Salary Slip / Pay Voucher</option>
                            <option value="BANK_STATEMENT_CREDIT">Bank Salary Credit Statement</option>
                            <option value="AUTHORIZED_EXTERNAL_PORTAL">Authorized Portal Credential</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Document Title</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Appointment Letter PDF"
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Document URL or Cryptographic Hash</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. https://storage.gov.in/docs/hash123 or SHA-256"
                          value={documentUrl}
                          onChange={(e) => setDocumentUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Audit Decision Status */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold">Directorate Verification Decision</label>
                  <div className="radio-group-horizontal">
                    <label className="radio-pill">
                      <input
                        type="radio"
                        name="verif_status"
                        value="VERIFIED"
                        checked={actionStatus === 'VERIFIED'}
                        onChange={(e) => setActionStatus(e.target.value)}
                      />
                      <span>Approve & Verify</span>
                    </label>
                    <label className="radio-pill">
                      <input
                        type="radio"
                        name="verif_status"
                        value="DISCREPANCY_FLAGGED"
                        checked={actionStatus === 'DISCREPANCY_FLAGGED'}
                        onChange={(e) => setActionStatus(e.target.value)}
                      />
                      <span>Flag for Discrepancy</span>
                    </label>
                    <label className="radio-pill">
                      <input
                        type="radio"
                        name="verif_status"
                        value="PENDING_REVIEW"
                        checked={actionStatus === 'PENDING_REVIEW'}
                        onChange={(e) => setActionStatus(e.target.value)}
                      />
                      <span>Keep Pending Review</span>
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Audit Notes & Justification</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter compliance notes or audit justification..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                  />
                </div>

                <div className="modal-actions-right">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Computing Multi-Source Audit...' : 'Save & Recalculate Confidence'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutcomeVerificationModal;
