import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  enrollmentService,
  consentService,
  followUpService,
  outcomeService,
} from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { TraineeEnrollmentCard } from '../../components/trainee/TraineeEnrollmentCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { CertificateViewModal } from '../../components/common/CertificateViewModal';
import { ConsentModal } from '../../components/trainee/ConsentModal';
import { FollowUpQuestionnaireModal } from '../../components/trainee/FollowUpQuestionnaireModal';
import { OutcomeTimeline } from '../../components/trainee/OutcomeTimeline';
import {
  IconBookOpen,
  IconAward,
  IconCertificate,
  IconRefresh,
  IconGraduationCap,
  IconShield,
  IconCheckSquare,
  IconBriefcase,
  IconUserX,
  IconRotateCcw,
} from '../../components/common/Icons';

export const TraineeDashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [consents, setConsents] = useState([]);
  const [pendingEligibleConsents, setPendingEligibleConsents] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [traineeStatus, setTraineeStatus] = useState('NOT_DUE');
  const [trackingConsent, setTrackingConsent] = useState('GRANTED');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  // Modals state
  const [selectedCert, setSelectedCert] = useState(null);
  const [consentEligibleItem, setConsentEligibleItem] = useState(null);
  const [activeFollowUpToAnswer, setActiveFollowUpToAnswer] = useState(null);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [optOutReason, setOptOutReason] = useState('');

  const loadAllTraineeData = async () => {
    try {
      setLoading(true);
      const [eRes, cRes, fRes, oRes] = await Promise.all([
        enrollmentService.getAll(),
        consentService.getMy(),
        followUpService.getMy(),
        outcomeService.getMy(),
      ]);

      if (eRes.data.success) setEnrollments(eRes.data.data);
      if (cRes.data.success) {
        setConsents(cRes.data.data.consents || []);
        setPendingEligibleConsents(cRes.data.data.pendingEligible || []);
      }
      if (fRes.data.success) {
        setFollowUps(fRes.data.data);
        if (fRes.data.traineeStatus) setTraineeStatus(fRes.data.traineeStatus);
        if (fRes.data.trackingConsent) setTrackingConsent(fRes.data.trackingConsent);
      }
      if (oRes.data.success) setOutcomes(oRes.data.data);
    } catch (err) {
      setToast({
        message: err.message || 'Failed to load your learning data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTraineeData();

    // Listen for simulation time advancement to reload follow-ups
    const handleTimeEvent = () => loadAllTraineeData();
    window.addEventListener('time:advanced', handleTimeEvent);
    window.addEventListener('time:changed', handleTimeEvent);
    window.addEventListener('time:reset', handleTimeEvent);

    return () => {
      window.removeEventListener('time:advanced', handleTimeEvent);
      window.removeEventListener('time:changed', handleTimeEvent);
      window.removeEventListener('time:reset', handleTimeEvent);
    };
  }, []);

  const handleOptOut = async () => {
    try {
      setActionLoading(true);
      const res = await followUpService.optOut({ reason: optOutReason });
      if (res.data.success) {
        setShowOptOutModal(false);
        setToast({ message: '✓ Tracking consent withdrawn. Future follow-ups stopped.', type: 'success' });
        loadAllTraineeData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to process opt-out', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading(true);
      const res = await followUpService.resume();
      if (res.data.success) {
        setToast({ message: '✓ Tracking consent restored. Welcome back!', type: 'success' });
        loadAllTraineeData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to resume tracking', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const completedCount = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const certifiedCount = enrollments.filter(
    (e) => e.certificate && e.certificate.status === 'ISSUED'
  ).length;
  const activeCount = enrollments.filter((e) => e.status === 'ENROLLED').length;

  const isOptedOut = trackingConsent === 'WITHDRAWN' || traineeStatus === 'OPTED_OUT';
  const isGovernmentFlagged = traineeStatus === 'GOVERNMENT_TRACKING_FLAGGED';

  const readyFollowUps = followUps.filter(
    (f) => (f.status === 'DUE' || f.status === 'READY' || f.status === 'WAITING_FOR_RESPONSE') && !isOptedOut
  );
  const completedFollowUps = followUps.filter(
    (f) => f.status === 'RESPONDED' || f.status === 'COMPLETED'
  );

  const filteredEnrollments = useMemo(() => {
    if (statusFilter === 'ALL') return enrollments;
    if (statusFilter === 'CERTIFIED') {
      return enrollments.filter((e) => e.certificate && e.certificate.status === 'ISSUED');
    }
    return enrollments.filter((e) => e.status === statusFilter);
  }, [enrollments, statusFilter]);

  // Primary completed enrollment with certificate for the outcome timeline
  const completedEnrollmentWithCert = enrollments.find(
    (e) => e.status === 'COMPLETED' && e.certificate
  );
  const primaryConsent = consents.find(
    (c) => c.enrollmentId?._id === completedEnrollmentWithCert?._id ||
           c.enrollmentId === completedEnrollmentWithCert?._id
  );

  return (
    <div className="page-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Trainee Welcome Banner */}
      <div className="trainee-hero-banner">
        <div className="hero-content">
          <span className="hero-tag">STUDENT LEARNING & LONGITUDINAL OUTCOME HUB</span>
          <h1 className="hero-title">Welcome back, {user?.name || user?.username}!</h1>
          <p className="hero-subtitle">
            Track your skilling curricula, scheduled batch sessions, verified completion certificates,
            and periodic career milestones.
          </p>
        </div>
        <div className="hero-action flex items-center gap-2">
          {!isOptedOut && completedCount > 0 && (
            <Button
              variant="outline"
              icon={IconUserX}
              onClick={() => setShowOptOutModal(true)}
              className="text-xs border-white/30 text-white hover:bg-white/10"
            >
              Stop Follow-ups
            </Button>
          )}
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={loadAllTraineeData}
            disabled={loading}
            className="hero-refresh-btn"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* 0. Opted Out Action Callout */}
      {isOptedOut && (
        <div className="trainee-action-callout" style={{ borderColor: 'var(--color-primary)' }}>
          <div className="callout-icon-col">
            <IconUserX size={28} className="text-purple-500" />
          </div>
          <div className="callout-content-col">
            <span className="callout-pill-tag" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
              TRACKING SUSPENDED
            </span>
            <h3 className="callout-title">Routine Outcome Follow-Ups Paused</h3>
            <p className="callout-text">
              You have previously withdrawn consent for routine outcome follow-ups. You can resume at any time to share your latest career milestones.
            </p>
          </div>
          <div className="callout-btn-col">
            <Button
              variant="primary"
              icon={IconRotateCcw}
              onClick={handleResume}
              loading={actionLoading}
            >
              Resume Outcome Tracking
            </Button>
          </div>
        </div>
      )}

      {/* 0.5. Government Flagged Notice Callout */}
      {isGovernmentFlagged && !isOptedOut && (
        <div className="trainee-action-callout" style={{ borderColor: 'var(--color-warning)' }}>
          <div className="callout-icon-col">
            <IconShield size={28} className="text-amber-500" />
          </div>
          <div className="callout-content-col">
            <span className="callout-pill-tag warning">
              STATUS UPDATE PENDING
            </span>
            <h3 className="callout-title">Reactivate Your Longitudinal Journey</h3>
            <p className="callout-text">
              Our automated check-in was previously paused. Update your career status now to clear pending escalations and restore normal tracking.
            </p>
          </div>
          <div className="callout-btn-col">
            <Button
              variant="success"
              icon={IconRotateCcw}
              onClick={handleResume}
              loading={actionLoading}
            >
              Update Career Status
            </Button>
          </div>
        </div>
      )}

      {/* 1. Pending Consent Action Callout */}
      {pendingEligibleConsents.length > 0 && !isOptedOut && (
        <div className="trainee-action-callout consent-callout">
          <div className="callout-icon-col">
            <IconShield size={28} />
          </div>
          <div className="callout-content-col">
            <span className="callout-pill-tag">CONSENT REQUIRED</span>
            <h3 className="callout-title">Post-Training Career Tracking Consent</h3>
            <p className="callout-text">
              Congratulations on earning your digital certificate in{' '}
              <strong>
                {pendingEligibleConsents[0].enrollment?.courseId?.courseName || 'Skilling Program'}
              </strong>
              ! We request your consent to periodically check in on your employment and career progress.
            </p>
          </div>
          <div className="callout-btn-col">
            <Button
              variant="success"
              icon={IconShield}
              onClick={() => setConsentEligibleItem(pendingEligibleConsents[0])}
            >
              Review Consent Request →
            </Button>
          </div>
        </div>
      )}

      {/* 2. Ready Follow-Up Action Callout */}
      {readyFollowUps.length > 0 && (
        <div className="trainee-action-callout followup-callout">
          <div className="callout-icon-col pulse-glow">
            <IconCheckSquare size={28} />
          </div>
          <div className="callout-content-col">
            <span className="callout-pill-tag warning">MILESTONE ACTIVE</span>
            <h3 className="callout-title">
              {readyFollowUps[0].followUpType?.replace('_', '-')} Outcome Questionnaire Ready
            </h3>
            <p className="callout-text">
              Your post-training milestone is now due! Please take 2 minutes to share your current job,
              salary range, or business status.
            </p>
          </div>
          <div className="callout-btn-col">
            <Button
              variant="primary"
              icon={IconBriefcase}
              onClick={() => setActiveFollowUpToAnswer(readyFollowUps[0])}
            >
              Start {readyFollowUps[0].followUpType?.replace('_', '-')} Questionnaire →
            </Button>
          </div>
        </div>
      )}

      {/* Trainee KPI Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Enrollments"
          value={enrollments.length}
          icon={IconBookOpen}
          description="Courses registered"
          colorScheme="primary"
          loading={loading}
        />
        <StatCard
          title="Official Certificates"
          value={certifiedCount}
          icon={IconCertificate}
          description="Issued credentials"
          colorScheme="emerald"
          loading={loading}
        />
        <StatCard
          title="Active Milestones"
          value={readyFollowUps.length}
          icon={IconCheckSquare}
          description="Due for response"
          colorScheme="violet"
          loading={loading}
        />
        <StatCard
          title="Completed Follow-Ups"
          value={completedFollowUps.length}
          icon={IconAward}
          description="Logged career records"
          colorScheme="cyan"
          loading={loading}
        />
      </div>

      {/* Longitudinal Outcome Journey Timeline (if completed + certified) */}
      {completedEnrollmentWithCert && (
        <div className="dashboard-section-wrapper">
          <OutcomeTimeline
            enrollment={completedEnrollmentWithCert}
            certificate={completedEnrollmentWithCert.certificate}
            consent={primaryConsent}
            followUps={followUps}
            outcomes={outcomes}
            onOpenFollowUp={(f) => setActiveFollowUpToAnswer(f)}
          />
        </div>
      )}

      {/* Enrolled Courses Section */}
      <div className="section-header-row mt-8">
        <div>
          <h2 className="section-title">My Enrolled Programs & Cohorts</h2>
          <p className="section-subtitle">
            Detailed overview of your course schedules and verified certifications
          </p>
        </div>

        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All ({enrollments.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'ENROLLED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ENROLLED')}
          >
            In Progress ({activeCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'CERTIFIED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('CERTIFIED')}
          >
            Certified ({certifiedCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="content-card py-12">
          <LoadingSpinner size="lg" message="Loading your courses and batch schedules..." />
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="content-card">
          <EmptyState
            title="No course enrollments found"
            description={
              statusFilter === 'ALL'
                ? 'You are not enrolled in any training batches yet. Please contact your training provider.'
                : `You do not have any courses matching "${statusFilter.toLowerCase()}".`
            }
            icon={IconGraduationCap}
          />
        </div>
      ) : (
        <div className="trainee-cards-grid">
          {filteredEnrollments.map((enrollment) => (
            <TraineeEnrollmentCard
              key={enrollment._id}
              enrollment={enrollment}
              onViewCertificate={(cert) => setSelectedCert(cert)}
            />
          ))}
        </div>
      )}

      {/* Certificate Viewer Modal */}
      <CertificateViewModal
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />

      {/* Consent Modal */}
      <ConsentModal
        isOpen={!!consentEligibleItem}
        onClose={() => setConsentEligibleItem(null)}
        eligibleItem={consentEligibleItem}
        onConsentDecided={() => {
          setToast({
            message: 'Consent decision recorded successfully!',
            type: 'success',
          });
          loadAllTraineeData();
        }}
      />

      {/* Follow-Up Questionnaire Modal */}
      <FollowUpQuestionnaireModal
        isOpen={!!activeFollowUpToAnswer}
        onClose={() => setActiveFollowUpToAnswer(null)}
        followUp={activeFollowUpToAnswer}
        onSubmitted={() => {
          setToast({
            message: '✓ Outcome response recorded successfully!',
            type: 'success',
          });
          loadAllTraineeData();
        }}
      />

      {/* Stop Future Follow-ups Opt-Out Modal */}
      <Modal
        isOpen={showOptOutModal}
        onClose={() => setShowOptOutModal(false)}
        title="Stop Future Outcome Follow-ups"
        subtitle="Voluntary Participation Preference"
      >
        <div className="space-y-4">
          <div className="p-3 bg-purple-500/10 rounded-lg text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
            You can stop future voluntary outcome follow-ups at any time. Stopping follow-ups means that the system will no longer send routine outcome requests to you. You can choose to resume tracking later.
          </div>

          <div className="form-group">
            <label className="form-label text-xs">Reason for stopping (optional)</label>
            <input
              type="text"
              placeholder="e.g. Employed in family business, prefer no surveys"
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              className="form-input text-sm"
            />
          </div>

          <p className="text-xs text-muted">
            Are you sure you want to stop future outcome follow-ups?
          </p>

          <div className="modal-actions-end">
            <Button variant="ghost" onClick={() => setShowOptOutModal(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleOptOut}
              loading={actionLoading}
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

export default TraineeDashboard;
