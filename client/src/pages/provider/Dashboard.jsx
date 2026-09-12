import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  courseService,
  batchService,
  traineeService,
  enrollmentService,
  certificateService,
  followUpService,
} from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { CourseModal } from '../../components/provider/CourseModal';
import { BatchModal } from '../../components/provider/BatchModal';
import { TraineeModal } from '../../components/provider/TraineeModal';
import { EnrollmentModal } from '../../components/provider/EnrollmentModal';
import { CertificateViewModal } from '../../components/common/CertificateViewModal';
import {
  IconBookOpen,
  IconLayers,
  IconUsers,
  IconUserCheck,
  IconPlus,
  IconRefresh,
  IconCertificate,
  IconAward,
  IconEye,
  IconCheckSquare,
  IconBriefcase,
  IconActivity,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [certStats, setCertStats] = useState({
    totalEnrolled: 0,
    completed: 0,
    certified: 0,
    pendingCertification: 0,
  });
  const [followUpStats, setFollowUpStats] = useState({
    total: 0,
    scheduled: 0,
    ready: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);


  // Modals
  const [modalCourse, setModalCourse] = useState(false);
  const [modalBatch, setModalBatch] = useState(false);
  const [modalTrainee, setModalTrainee] = useState(false);
  const [modalEnrollment, setModalEnrollment] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, bRes, tRes, eRes, statsRes, fStatsRes] = await Promise.all([
        courseService.getAll(),
        batchService.getAll(),
        traineeService.getAll(),
        enrollmentService.getAll(),
        certificateService.getStats(),
        followUpService.getStats(),
      ]);

      if (cRes.data.success) setCourses(cRes.data.data);
      if (bRes.data.success) setBatches(bRes.data.data);
      if (tRes.data.success) setTrainees(tRes.data.data);
      if (eRes.data.success) setEnrollments(eRes.data.data);
      if (statsRes.data.success) setCertStats(statsRes.data.data);
      if (fStatsRes.data.success) setFollowUpStats(fStatsRes.data.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load provider metrics', type: 'error' });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCourse = async (formData) => {
    try {
      setModalLoading(true);
      const res = await courseService.create(formData);
      if (res.data.success) {
        setToast({ message: 'Course created successfully!', type: 'success' });
        setModalCourse(false);
        loadData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to create course', type: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateBatch = async (formData) => {
    try {
      setModalLoading(true);
      const res = await batchService.create(formData);
      if (res.data.success) {
        setToast({ message: 'Batch launched successfully!', type: 'success' });
        setModalBatch(false);
        loadData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to create batch', type: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateTrainee = async (formData) => {
    try {
      setModalLoading(true);
      const res = await traineeService.create(formData);
      if (res.data.success) {
        setToast({ message: 'Trainee registered successfully!', type: 'success' });
        setModalTrainee(false);
        loadData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to create trainee', type: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateEnrollment = async (formData) => {
    try {
      setModalLoading(true);
      const res = await enrollmentService.create(formData);
      if (res.data.success) {
        setToast({ message: 'Trainee enrolled successfully into batch!', type: 'success' });
        setModalEnrollment(false);
        loadData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to create enrollment', type: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const recentBatchesColumns = [
    {
      title: 'Batch / Cohort',
      dataIndex: 'batchName',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-main">{val}</div>
          <div className="text-xs text-muted">{row.courseId?.courseName}</div>
        </div>
      ),
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_, row) => (
        <div className="text-xs">
          <span>{formatDate(row.startDate)}</span> → <span>{formatDate(row.endDate)}</span>
        </div>
      ),
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      render: (m) => <Badge type="mode">{m}</Badge>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s) => <Badge>{s}</Badge>,
    },
  ];

  const recentEnrollmentsColumns = [
    {
      title: 'Trainee Student',
      dataIndex: 'traineeId',
      render: (t) => (
        <div>
          <div className="font-semibold text-main">{t?.userId?.name}</div>
          <div className="text-xs text-muted">@{t?.userId?.username}</div>
        </div>
      ),
    },
    {
      title: 'Course / Batch',
      key: 'courseBatch',
      render: (_, row) => (
        <div>
          <div className="font-medium text-main">{row.courseId?.courseName}</div>
          <div className="text-xs text-muted">{row.batchId?.batchName}</div>
        </div>
      ),
    },
    {
      title: 'Training Status',
      dataIndex: 'status',
      render: (s) => <Badge>{s}</Badge>,
    },
    {
      title: 'Certificate',
      key: 'certStatus',
      render: (_, row) => {
        if (row.certificate) {
          return <span className="badge badge-success">✓ Certified</span>;
        }
        if (row.status === 'COMPLETED') {
          return <span className="badge badge-warning">Pending Issuance</span>;
        }
        return <span className="badge badge-neutral">In Training</span>;
      },
    },
  ];

  return (
    <div className="page-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            {user?.profile?.organizationName || 'Training Provider Portal'}
          </h1>
          <p className="page-subtitle">
            Manage your courses, schedule batches, track student completions, and issue verified certificates
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="outline" icon={IconRefresh} onClick={loadData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="quick-actions-bar">
        <span className="quick-actions-label">Quick Actions:</span>
        <div className="quick-buttons-row">
          <Button
            variant="primary"
            size="sm"
            icon={IconPlus}
            onClick={() => setModalCourse(true)}
          >
            New Course
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={IconPlus}
            onClick={() => setModalBatch(true)}
            disabled={courses.length === 0}
          >
            Launch Batch
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={IconPlus}
            onClick={() => setModalTrainee(true)}
          >
            Register Trainee
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={IconPlus}
            onClick={() => setModalEnrollment(true)}
            disabled={trainees.length === 0 || batches.length === 0}
          >
            Enroll in Batch
          </Button>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="stats-grid">
        <StatCard
          title="Total Enrolled"
          value={certStats.totalEnrolled || enrollments.length}
          icon={IconUserCheck}
          description="Total student registrations"
          colorScheme="primary"
          loading={loading}
          onClick={() => navigate('/provider/enrollments')}
        />
        <StatCard
          title="Completed Training"
          value={certStats.completed}
          icon={IconAward}
          description="Finished curriculum"
          colorScheme="violet"
          loading={loading}
          onClick={() => navigate('/provider/enrollments')}
        />
        <StatCard
          title="Certified Trainees"
          value={certStats.certified}
          icon={IconCertificate}
          description="Official certificates issued"
          colorScheme="emerald"
          loading={loading}
          onClick={() => navigate('/provider/enrollments')}
        />
        <StatCard
          title="Pending Certification"
          value={certStats.pendingCertification}
          icon={IconUsers}
          description="Completed, awaiting certificate"
          colorScheme="amber"
          loading={loading}
          onClick={() => navigate('/provider/enrollments')}
        />
        <StatCard
          title="Follow-Ups Due"
          value={followUpStats.ready}
          icon={IconCheckSquare}
          description="Awaiting graduate responses"
          colorScheme="warning"
          loading={loading}
          onClick={() => navigate('/provider/follow-ups')}
        />
        <StatCard
          title="Graduate Outcomes"
          value={followUpStats.completed}
          icon={IconBriefcase}
          description="Milestone responses logged"
          colorScheme="cyan"
          loading={loading}
          onClick={() => navigate('/provider/outcomes')}
        />
      </div>


      {/* Certification Funnel Banner */}
      <div className="funnel-summary-card">
        <div className="funnel-card-header">
          <div>
            <h3 className="card-title">Certification Outcome Progression</h3>
            <p className="card-subtitle">Breakdown of student training completion vs official certification</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={IconCertificate}
            onClick={() => navigate('/provider/enrollments')}
          >
            Review Uncertified Trainees ({certStats.pendingCertification}) →
          </Button>
        </div>

        <div className="funnel-metrics-row">
          <div className="funnel-step">
            <span className="funnel-step-name">1. TOTAL ENROLLED</span>
            <span className="funnel-step-num">{certStats.totalEnrolled}</span>
            <span className="funnel-step-desc">Students across all cohorts</span>
          </div>

          <div className="funnel-arrow">→</div>

          <div className="funnel-step">
            <span className="funnel-step-name">2. TRAINING COMPLETED</span>
            <span className="funnel-step-num font-semibold text-primary-link">{certStats.completed}</span>
            <span className="funnel-step-desc">
              {certStats.totalEnrolled > 0
                ? `${Math.round((certStats.completed / certStats.totalEnrolled) * 100)}% completion rate`
                : '0% completion'}
            </span>
          </div>

          <div className="funnel-arrow">→</div>

          <div className="funnel-step highlight-certified">
            <span className="funnel-step-name">3. CERTIFICATE ISSUED</span>
            <span className="funnel-step-num text-emerald">{certStats.certified}</span>
            <span className="funnel-step-desc">
              {certStats.completed > 0
                ? `${Math.round((certStats.certified / certStats.completed) * 100)}% of completed certified`
                : '0% certified'}
            </span>
          </div>

          <div className="funnel-divider"></div>

          <div className="funnel-step pending-box">
            <span className="funnel-step-name text-amber">PENDING CERTIFICATE</span>
            <span className="funnel-step-num text-amber">{certStats.pendingCertification}</span>
            <span className="funnel-step-desc">Completed but not yet issued</span>
          </div>
        </div>
      </div>

      {/* Two column layout for recent batches & recent enrollments */}
      <div className="dashboard-grid-2">
        <div className="content-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-title">Recent Training Batches</h2>
              <p className="card-subtitle">Active and scheduled cohorts</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/provider/batches')}
            >
              View All →
            </Button>
          </div>

          <Table
            columns={recentBatchesColumns}
            data={batches.slice(0, 5)}
            loading={loading}
            emptyTitle="No batches created yet"
            emptyDescription="Create your first batch to start scheduling cohorts."
            emptyAction="Launch Batch"
            onEmptyAction={() => setModalBatch(true)}
            icon={IconLayers}
          />
        </div>

        <div className="content-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-title">Recent Enrolments</h2>
              <p className="card-subtitle">Student outcomes & certification status</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/provider/enrollments')}
            >
              View All →
            </Button>
          </div>

          <Table
            columns={recentEnrollmentsColumns}
            data={enrollments.slice(0, 5)}
            loading={loading}
            emptyTitle="No enrollments recorded"
            emptyDescription="Assign registered trainees to active batches."
            emptyAction="Enroll Trainee"
            onEmptyAction={() => setModalEnrollment(true)}
            icon={IconUserCheck}
          />
        </div>
      </div>

      {/* Modals */}
      <CourseModal
        isOpen={modalCourse}
        onClose={() => setModalCourse(false)}
        onSubmit={handleCreateCourse}
        loading={modalLoading}
      />

      <BatchModal
        isOpen={modalBatch}
        onClose={() => setModalBatch(false)}
        onSubmit={handleCreateBatch}
        courses={courses.filter((c) => c.status === 'ACTIVE')}
        loading={modalLoading}
      />

      <TraineeModal
        isOpen={modalTrainee}
        onClose={() => setModalTrainee(false)}
        onSubmit={handleCreateTrainee}
        loading={modalLoading}
      />

      <EnrollmentModal
        isOpen={modalEnrollment}
        onClose={() => setModalEnrollment(false)}
        onSubmit={handleCreateEnrollment}
        trainees={trainees.filter((t) => t.status === 'ACTIVE')}
        batches={batches}
        loading={modalLoading}
      />

      <CertificateViewModal
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />
    </div>
  );
};
