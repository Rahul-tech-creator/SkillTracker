import React from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  IconCheckCircle,
  IconClock,
  IconCertificate,
  IconShield,
  IconBriefcase,
  IconStar,
  IconTrendingUp,
} from '../common/Icons';
import { formatDate } from '../../utils/helpers';

export const OutcomeTimeline = ({
  enrollment,
  certificate,
  consent,
  followUps = [],
  outcomes = [],
  onOpenFollowUp,
}) => {
  if (!enrollment) return null;

  return (
    <div className="outcome-timeline-card">
      <div className="timeline-header">
        <div className="timeline-header-icon">
          <IconTrendingUp size={22} />
        </div>
        <div>
          <h3 className="timeline-title">My Longitudinal Outcome Journey</h3>
          <p className="timeline-subtitle">
            Curriculum completion, verifiable credentialing, and post-training milestone tracking.
          </p>
        </div>
      </div>

      <div className="timeline-flow-list">
        {/* Node 1: Training Completed */}
        <div className="timeline-item completed">
          <div className="timeline-marker">
            <IconCheckCircle size={18} />
          </div>
          <div className="timeline-content">
            <div className="timeline-meta-row">
              <span className="timeline-stage-title">1. Training Completed</span>
              <span className="timeline-date">{formatDate(enrollment.updatedAt || enrollment.createdAt)}</span>
            </div>
            <p className="timeline-desc">
              Successfully finished all modules for{' '}
              <strong>{enrollment.courseId?.courseName || 'Course'}</strong> in cohort{' '}
              <strong>{enrollment.batchId?.batchName}</strong>.
            </p>
          </div>
        </div>

        {/* Node 2: Certificate Issued */}
        <div className={`timeline-item ${certificate ? 'completed' : 'pending'}`}>
          <div className="timeline-marker">
            <IconCertificate size={18} />
          </div>
          <div className="timeline-content">
            <div className="timeline-meta-row">
              <span className="timeline-stage-title">2. Digital Certificate Issued</span>
              {certificate && <span className="timeline-date">{formatDate(certificate.issueDate)}</span>}
            </div>
            {certificate ? (
              <p className="timeline-desc">
                Official Credential #<span className="font-mono text-primary">{certificate.certificateNumber}</span> issued by{' '}
                {certificate.providerId?.organizationName || 'Training Provider'}.
              </p>
            ) : (
              <p className="timeline-desc text-muted">Awaiting provider certificate issuance.</p>
            )}
          </div>
        </div>

        {/* Node 3: Consent */}
        <div className={`timeline-item ${consent?.status === 'GRANTED' ? 'completed' : 'pending'}`}>
          <div className="timeline-marker">
            <IconShield size={18} />
          </div>
          <div className="timeline-content">
            <div className="timeline-meta-row">
              <span className="timeline-stage-title">3. Post-Training Outcome Consent</span>
              {consent?.consentedAt && (
                <span className="timeline-date">{formatDate(consent.consentedAt)}</span>
              )}
            </div>
            {consent?.status === 'GRANTED' ? (
              <p className="timeline-desc">
                Consent granted for longitudinal tracking. Longitudinal survey milestones initialized.
              </p>
            ) : consent?.status === 'DECLINED' ? (
              <p className="timeline-desc text-warning">
                Tracking consent declined. Longitudinal surveys will not be dispatched.
              </p>
            ) : (
              <p className="timeline-desc text-muted">Pending consent review.</p>
            )}
          </div>
        </div>

        {/* Dynamic Follow-Up Nodes (3-day, 30, 90, 180, 365 days) */}
        {followUps.map((f, idx) => {
          const isDone = f.status === 'RESPONDED' || f.status === 'COMPLETED';
          const isReady = f.status === 'DUE' || f.status === 'READY' || f.status === 'WAITING_FOR_RESPONSE';
          const isOptedOut = f.status === 'OPTED_OUT';
          const isGov = f.status === 'GOVERNMENT_TRACKING_FLAGGED';
          const outcome = outcomes.find(
            (o) => o.followUpId?.toString() === f._id.toString()
          );

          const stageNumber = 4 + idx;
          const label = f.followUpType?.replace('_', '-');

          return (
            <div
              key={f._id}
              className={`timeline-item ${
                isDone ? 'completed' : isReady ? 'ready-pulse' : isOptedOut ? 'paused' : 'scheduled'
              }`}
            >
              <div className="timeline-marker">
                {isDone ? (
                  <IconCheckCircle size={18} />
                ) : isReady ? (
                  <IconClock size={18} />
                ) : isGov ? (
                  <IconShield size={18} className="text-danger" />
                ) : isOptedOut ? (
                  <IconShield size={18} className="text-muted" />
                ) : (
                  <span className="step-num-bubble">{stageNumber}</span>
                )}
              </div>

              <div className="timeline-content">
                <div className="timeline-meta-row">
                  <div className="timeline-stage-heading-col">
                    <span className="timeline-stage-title">
                      {stageNumber}. {label} Follow-Up
                    </span>
                    <Badge
                      status={
                        isDone
                          ? 'success'
                          : isReady
                          ? 'warning'
                          : isGov
                          ? 'danger'
                          : isOptedOut
                          ? 'neutral'
                          : 'info'
                      }
                      text={f.status}
                    />
                  </div>
                  <span className="timeline-date">
                    {isDone
                      ? `Observed: ${formatDate(f.completedAt)}`
                      : `Scheduled: ${formatDate(f.scheduledDate)}`}
                  </span>
                </div>

                {isDone && outcome ? (
                  <div className="timeline-outcome-snapshot">
                    <div className="snapshot-situation-badge">
                      <IconBriefcase size={15} />
                      <span>{outcome.situation.replace('_', ' ')}</span>
                    </div>

                    {outcome.situation === 'EMPLOYED' && outcome.employmentData && (
                      <div className="snapshot-details">
                        <span>
                          <strong>Employer:</strong> {outcome.employmentData.employerName || '—'}
                        </span>
                        <span>
                          <strong>Role:</strong> {outcome.employmentData.jobRole || '—'}
                        </span>
                        <span>
                          <strong>Salary:</strong>{' '}
                          {outcome.employmentData.monthlySalaryRange || '—'}
                        </span>
                      </div>
                    )}

                    {outcome.situation === 'SELF_EMPLOYED' && outcome.selfEmploymentData && (
                      <div className="snapshot-details">
                        <span>
                          <strong>Venture:</strong>{' '}
                          {outcome.selfEmploymentData.businessType || '—'}
                        </span>
                        <span>
                          <strong>Income:</strong>{' '}
                          {outcome.selfEmploymentData.monthlyIncomeRange || '—'}
                        </span>
                      </div>
                    )}

                    {outcome.situation === 'APPRENTICE' && outcome.apprenticeshipData && (
                      <div className="snapshot-details">
                        <span>
                          <strong>Host:</strong>{' '}
                          {outcome.apprenticeshipData.organizationName || '—'}
                        </span>
                        <span>
                          <strong>Stipend:</strong>{' '}
                          {outcome.apprenticeshipData.monthlyStipendRange || '—'}
                        </span>
                      </div>
                    )}

                    {outcome.situation === 'UNEMPLOYED' && outcome.unemploymentData && (
                      <div className="snapshot-details">
                        <span>
                          <strong>Reason:</strong>{' '}
                          {outcome.unemploymentData.primaryReason || '—'}
                        </span>
                        {outcome.unemploymentData.requestedSkills && (
                          <span>
                            <strong>Skill Need:</strong>{' '}
                            {outcome.unemploymentData.requestedSkills}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="snapshot-rating">
                      <IconStar size={14} className="text-warning" />
                      <span>Rating: {outcome.relevanceRating} / 5</span>
                    </div>
                  </div>
                ) : isReady ? (
                  <div className="timeline-action-box">
                    <p className="ready-alert-text">
                      Milestone is active! Please complete this short questionnaire to update your career status.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={IconBriefcase}
                      onClick={() => onOpenFollowUp && onOpenFollowUp(f)}
                    >
                      Fill {label} Questionnaire →
                    </Button>
                  </div>
                ) : (
                  <p className="timeline-desc text-muted">
                    Scheduled to become active on {formatDate(f.scheduledDate)}.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
