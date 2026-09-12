import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, providerService, certificateService } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import {
  IconBuilding,
  IconBookOpen,
  IconLayers,
  IconUsers,
  IconUserCheck,
  IconCertificate,
  IconAward,
  IconPlus,
  IconRefresh,
  IconClock,
  IconActivity,
  IconCheckSquare,
  IconBriefcase,
  IconShield,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';
import { ProviderModal } from '../../components/admin/ProviderModal';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    providers: 0,
    courses: 0,
    batches: 0,
    trainees: 0,
    enrollments: 0,
    completed: 0,
    certified: 0,
    pendingCertification: 0,
    revokedCertificates: 0,
  });
  const [recentProviders, setRecentProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, providersRes] = await Promise.all([
        adminService.getStats(),
        providerService.getAll(),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (providersRes.data.success) {
        setRecentProviders(providersRes.data.data.slice(0, 5));
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load dashboard data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProvider = async (formData) => {
    try {
      setCreateLoading(true);
      const res = await providerService.create(formData);
      if (res.data.success) {
        setToast({ message: 'Training Provider created successfully!', type: 'success' });
        setIsModalOpen(false);
        loadData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to create provider', type: 'error' });
    } finally {
      setCreateLoading(false);
    }
  };

  const columns = [
    {
      title: 'Organization',
      dataIndex: 'organizationName',
      render: (val, row) => (
        <div className="table-org-cell">
          <div className="table-avatar">{val[0]?.toUpperCase() || 'P'}</div>
          <div>
            <div className="font-semibold text-main">{val}</div>
            <div className="text-xs text-muted">@{row.userId?.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => <Badge>{status}</Badge>,
    },
    {
      title: 'Registered On',
      dataIndex: 'createdAt',
      render: (val) => formatDate(val),
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
          <h1 className="page-title">Executive Administrator Overview</h1>
          <p className="page-subtitle">
            System-wide skilling metrics, provider networks, completions, and certificate outcomes
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={IconPlus}
            onClick={() => setIsModalOpen(true)}
          >
            Add Provider
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="stats-grid">
        <StatCard
          title="Training Providers"
          value={stats.providers}
          icon={IconBuilding}
          description="Registered training centers"
          colorScheme="primary"
          loading={loading}
          onClick={() => navigate('/admin/providers')}
        />
        <StatCard
          title="Curriculum Courses"
          value={stats.courses}
          icon={IconBookOpen}
          description="Approved courses"
          colorScheme="cyan"
          loading={loading}
          onClick={() => navigate('/admin/courses')}
        />
        <StatCard
          title="Total Enrollments"
          value={stats.enrollments}
          icon={IconUserCheck}
          description="Total enrolled students"
          colorScheme="violet"
          loading={loading}
          onClick={() => navigate('/admin/enrollments')}
        />
        <StatCard
          title="Training Completed"
          value={stats.completed}
          icon={IconAward}
          description="Completed training curriculum"
          colorScheme="emerald"
          loading={loading}
          onClick={() => navigate('/admin/enrollments')}
        />
        <StatCard
          title="Certified Trainees"
          value={stats.certified}
          icon={IconCertificate}
          description="Official certificates issued"
          colorScheme="emerald"
          loading={loading}
          onClick={() => navigate('/admin/certificates')}
        />
        <StatCard
          title="Follow-Ups Due"
          value={stats.followUpsDue || 0}
          icon={IconCheckSquare}
          description="Milestones ready for submission"
          colorScheme="warning"
          loading={loading}
          onClick={() => navigate('/admin/follow-ups')}
        />
        <StatCard
          title="Employed Graduates"
          value={stats.employed || 0}
          icon={IconBriefcase}
          description="In verified employment"
          colorScheme="emerald"
          loading={loading}
          onClick={() => navigate('/admin/outcomes')}
        />
        <StatCard
          title="Consent Granted"
          value={stats.consentGranted || 0}
          icon={IconShield}
          description="Enrolled in outcome tracking"
          colorScheme="cyan"
          loading={loading}
        />
        <StatCard
          title="Pending Certificate"
          value={stats.pendingCertification}
          icon={IconUsers}
          description="Completed, awaiting issuance"
          colorScheme="amber"
          loading={loading}
          onClick={() => navigate('/admin/certificates')}
        />
      </div>

      {/* Quick Access to Time Simulation & Pipeline */}
      <div className="admin-quick-action-cards-grid mt-6">
        <div className="quick-action-banner-card time-sim-banner">
          <div className="banner-icon-circle">
            <IconClock size={24} />
          </div>
          <div className="banner-content">
            <h3 className="banner-title">Time Simulation Engine</h3>
            <p className="banner-desc">
              Fast-forward application logical time (+30D, +90D, +180D, +365D) to evaluate longitudinal milestones immediately.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/admin/time-simulation')}
          >
            Open Time Controller →
          </Button>
        </div>

        <div className="quick-action-banner-card followups-banner">
          <div className="banner-icon-circle">
            <IconActivity size={24} />
          </div>
          <div className="banner-content">
            <h3 className="banner-title">Follow-Up Pipeline Monitor</h3>
            <p className="banner-desc">
              Track multi-stage 30D–365D surveys, questionnaire responses, and skill gap reports across all providers.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/follow-ups')}
          >
            View Pipeline →
          </Button>
        </div>
      </div>

      {/* National Certification Outcome Funnel */}
      <div className="funnel-summary-card">
        <div className="funnel-card-header">
          <div>
            <h3 className="card-title">National Skilling Outcome & Certification Pipeline</h3>
            <p className="card-subtitle">
              Measurement of training delivery efficiency from enrollment to credential issuance
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={IconCertificate}
            onClick={() => navigate('/admin/certificates')}
          >
            Manage Certificates ({stats.certified}) →
          </Button>
        </div>

        <div className="funnel-metrics-row">
          <div className="funnel-step">
            <span className="funnel-step-name">1. TOTAL ENROLLED</span>
            <span className="funnel-step-num">{stats.enrollments}</span>
            <span className="funnel-step-desc">Students across all centers</span>
          </div>

          <div className="funnel-arrow">→</div>

          <div className="funnel-step">
            <span className="funnel-step-name">2. TRAINING COMPLETED</span>
            <span className="funnel-step-num font-semibold text-primary-link">{stats.completed}</span>
            <span className="funnel-step-desc">
              {stats.enrollments > 0
                ? `${Math.round((stats.completed / stats.enrollments) * 100)}% overall completion rate`
                : '0% completion'}
            </span>
          </div>

          <div className="funnel-arrow">→</div>

          <div className="funnel-step highlight-certified">
            <span className="funnel-step-name">3. CERTIFICATE ISSUED</span>
            <span className="funnel-step-num text-emerald">{stats.certified}</span>
            <span className="funnel-step-desc">
              {stats.completed > 0
                ? `${Math.round((stats.certified / stats.completed) * 100)}% of completed certified`
                : '0% certified'}
            </span>
          </div>

          <div className="funnel-divider"></div>

          <div className="funnel-step pending-box">
            <span className="funnel-step-name text-amber">PENDING CERTIFICATION</span>
            <span className="funnel-step-num text-amber">{stats.pendingCertification}</span>
            <span className="funnel-step-desc">Completed but uncertified</span>
          </div>
        </div>
      </div>

      {/* Recent Providers Table */}
      <div className="content-card">
        <div className="card-header-flex">
          <div>
            <h2 className="card-title">Recently Registered Providers</h2>
            <p className="card-subtitle">Training organizations onboarded to the tracking system</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/providers')}
          >
            View All Providers →
          </Button>
        </div>

        <Table
          columns={columns}
          data={recentProviders}
          loading={loading}
          emptyTitle="No providers registered yet"
          emptyDescription="Start by adding the first training provider to the system."
          emptyAction="Register Provider"
          onEmptyAction={() => setIsModalOpen(true)}
        />
      </div>

      <ProviderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProvider}
        loading={createLoading}
      />
    </div>
  );
};
