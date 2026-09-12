import React, { useState, useEffect, useMemo } from 'react';
import {
  enrollmentService,
  traineeService,
  batchService,
  certificateService,
} from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { EnrollmentModal } from '../../components/provider/EnrollmentModal';
import { CertificateViewModal } from '../../components/common/CertificateViewModal';
import {
  IconUserCheck,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconCertificate,
  IconEye,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [certFilter, setCertFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [issuingId, setIssuingId] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eRes, tRes, bRes] = await Promise.all([
        enrollmentService.getAll(),
        traineeService.getAll(),
        batchService.getAll(),
      ]);

      if (eRes.data.success) setEnrollments(eRes.data.data);
      if (tRes.data.success) setTrainees(tRes.data.data);
      if (bRes.data.success) setBatches(bRes.data.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load enrollments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnrollTrainee = async (formData) => {
    try {
      setActionLoading(true);
      const res = await enrollmentService.create(formData);
      if (res.data.success) {
        setToast({ message: 'Trainee enrolled successfully!', type: 'success' });
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Enrollment failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (enrollmentId, newStatus) => {
    try {
      const res = await enrollmentService.updateStatus(enrollmentId, newStatus);
      if (res.data.success) {
        setToast({ message: `Training status updated to ${newStatus}`, type: 'success' });
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const handleIssueCertificate = async (enrollmentId) => {
    try {
      setIssuingId(enrollmentId);
      const res = await certificateService.issue(enrollmentId);
      if (res.data.success) {
        setToast({
          message: `Certificate issued successfully! (Number: ${res.data.data.certificateNumber})`,
          type: 'success',
        });
        setSelectedCert(res.data.data);
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to issue certificate', type: 'error' });
    } finally {
      setIssuingId(null);
    }
  };

  const getCertStatus = (enrollment) => {
    if (enrollment.certificate) {
      return enrollment.certificate.status; // 'ISSUED' or 'REVOKED'
    }
    if (enrollment.status === 'COMPLETED') {
      return 'ELIGIBLE'; // Eligible but not issued
    }
    return 'NOT_ELIGIBLE';
  };

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const matchesBatch = batchFilter === 'ALL' || e.batchId?._id === batchFilter;
      const cStatus = getCertStatus(e);
      const matchesCert =
        certFilter === 'ALL' ||
        (certFilter === 'ISSUED' && cStatus === 'ISSUED') ||
        (certFilter === 'ELIGIBLE' && cStatus === 'ELIGIBLE') ||
        (certFilter === 'NOT_ELIGIBLE' && cStatus === 'NOT_ELIGIBLE') ||
        (certFilter === 'REVOKED' && cStatus === 'REVOKED');

      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus && matchesBatch && matchesCert;

      const matchesSearch =
        (e.traineeId?.userId?.name || '').toLowerCase().includes(q) ||
        (e.traineeId?.userId?.username || '').toLowerCase().includes(q) ||
        (e.courseId?.courseName || '').toLowerCase().includes(q) ||
        (e.batchId?.batchName || '').toLowerCase().includes(q) ||
        (e.certificate?.certificateNumber || '').toLowerCase().includes(q) ||
        (e.certificate?.verificationCode || '').toLowerCase().includes(q);

      return matchesStatus && matchesBatch && matchesCert && matchesSearch;
    });
  }, [enrollments, search, statusFilter, certFilter, batchFilter]);

  const columns = [
    {
      title: 'Trainee Student',
      dataIndex: 'traineeId',
      render: (t) => (
        <div>
          <div className="font-semibold text-main">{t?.userId?.name || 'Trainee'}</div>
          <div className="text-xs text-muted">@{t?.userId?.username}</div>
        </div>
      ),
    },
    {
      title: 'Course Curriculum',
      dataIndex: 'courseId',
      render: (c) => (
        <div>
          <div className="font-medium text-main">{c?.courseName || 'Course'}</div>
          <div className="text-xs text-muted">{c?.category || 'General'}</div>
        </div>
      ),
    },
    {
      title: 'Batch Cohort',
      dataIndex: 'batchId',
      render: (b) => (
        <div>
          <div className="font-medium">{b?.batchName || 'Batch'}</div>
          <div className="text-xs text-muted">
            <Badge type="mode">{b?.mode || 'OFFLINE'}</Badge>
          </div>
        </div>
      ),
    },
    {
      title: 'Training Status',
      key: 'trainingStatus',
      render: (_, row) => (
        <div className="flex-col gap-1">
          <select
            className="table-action-select"
            value={row.status}
            onChange={(e) => handleUpdateStatus(row._id, e.target.value)}
          >
            <option value="ENROLLED">Enrolled (Active)</option>
            <option value="COMPLETED">Completed</option>
            <option value="DROPPED">Dropped</option>
          </select>
        </div>
      ),
    },
    {
      title: 'Certificate Outcome',
      key: 'certStatus',
      render: (_, row) => {
        const cStatus = getCertStatus(row);
        if (cStatus === 'ISSUED') {
          return (
            <div>
              <span className="badge badge-success">✓ Issued</span>
              <div className="text-xs font-mono text-muted mt-1">
                {row.certificate?.certificateNumber}
              </div>
            </div>
          );
        }
        if (cStatus === 'REVOKED') {
          return <span className="badge badge-danger">Revoked</span>;
        }
        if (cStatus === 'ELIGIBLE') {
          return <span className="badge badge-warning">Eligible (Pending)</span>;
        }
        return <span className="badge badge-neutral">Not Eligible</span>;
      },
    },
    {
      title: 'Certificate Action',
      key: 'actions',
      align: 'right',
      render: (_, row) => {
        const cStatus = getCertStatus(row);

        if (cStatus === 'ISSUED' || cStatus === 'REVOKED') {
          return (
            <Button
              variant="outline"
              size="sm"
              icon={IconEye}
              onClick={() => setSelectedCert(row.certificate)}
            >
              View Certificate
            </Button>
          );
        }

        if (cStatus === 'ELIGIBLE') {
          return (
            <Button
              variant="primary"
              size="sm"
              icon={IconCertificate}
              loading={issuingId === row._id}
              onClick={() => handleIssueCertificate(row._id)}
            >
              Issue Certificate
            </Button>
          );
        }

        return <span className="text-xs text-muted">Complete training first</span>;
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
          <h1 className="page-title">Course Enrolments & Certification</h1>
          <p className="page-subtitle">
            Track student training outcomes, mark course completions, and issue verified completion certificates
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={IconPlus}
            onClick={() => setIsModalOpen(true)}
            disabled={trainees.length === 0 || batches.length === 0}
            title={
              trainees.length === 0 || batches.length === 0
                ? 'Requires at least one trainee and one batch'
                : ''
            }
          >
            Enroll Trainee
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar-card">
        <div className="search-input-wrapper">
          <IconSearch size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by student, course, batch, certificate #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <label className="filter-label">Batch:</label>
          <select
            className="filter-select"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
          >
            <option value="ALL">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.batchName} ({b.courseId?.courseName})
              </option>
            ))}
          </select>

          <label className="filter-label">Training Status:</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Training Statuses</option>
            <option value="ENROLLED">Enrolled (In Training)</option>
            <option value="COMPLETED">Completed</option>
            <option value="DROPPED">Dropped</option>
          </select>

          <label className="filter-label">Certificate:</label>
          <select
            className="filter-select"
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value)}
          >
            <option value="ALL">All Certification States</option>
            <option value="ELIGIBLE">Eligible (Pending Issuance)</option>
            <option value="ISSUED">Issued (Certified)</option>
            <option value="NOT_ELIGIBLE">Not Eligible</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      <div className="content-card">
        <Table
          columns={columns}
          data={filteredEnrollments}
          loading={loading}
          emptyTitle="No enrollments recorded"
          emptyDescription="Assign registered trainees to batches to track their progression."
          emptyAction={trainees.length > 0 && batches.length > 0 ? 'Enroll Trainee' : undefined}
          onEmptyAction={() => setIsModalOpen(true)}
          icon={IconUserCheck}
        />
      </div>

      <EnrollmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleEnrollTrainee}
        trainees={trainees.filter((t) => t.status === 'ACTIVE')}
        batches={batches}
        loading={actionLoading}
      />

      <CertificateViewModal
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />
    </div>
  );
};
