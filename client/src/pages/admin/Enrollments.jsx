import React, { useState, useEffect, useMemo } from 'react';
import { enrollmentService, providerService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import {
  IconUserCheck,
  IconSearch,
  IconRefresh,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const AdminEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [enrollmentsRes, providersRes] = await Promise.all([
        enrollmentService.getAll(),
        providerService.getAll(),
      ]);
      if (enrollmentsRes.data.success) {
        setEnrollments(enrollmentsRes.data.data);
      }
      if (providersRes.data.success) {
        setProviders(providersRes.data.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load enrollments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const matchesProvider =
        providerFilter === 'ALL' || e.providerId?._id === providerFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus && matchesProvider;

      const matchesSearch =
        (e.traineeId?.userId?.name || '').toLowerCase().includes(q) ||
        (e.traineeId?.userId?.username || '').toLowerCase().includes(q) ||
        (e.courseId?.courseName || '').toLowerCase().includes(q) ||
        (e.batchId?.batchName || '').toLowerCase().includes(q) ||
        (e.providerId?.organizationName || '').toLowerCase().includes(q);

      return matchesStatus && matchesProvider && matchesSearch;
    });
  }, [enrollments, search, statusFilter, providerFilter]);

  const columns = [
    {
      title: 'Trainee Student',
      dataIndex: 'traineeId',
      render: (t) => (
        <div>
          <div className="font-semibold text-main">{t?.userId?.name || '—'}</div>
          <div className="text-xs text-muted">@{t?.userId?.username}</div>
        </div>
      ),
    },
    {
      title: 'Enrolled Course',
      dataIndex: 'courseId',
      render: (c) => (
        <div>
          <div className="font-medium text-main">{c?.courseName || '—'}</div>
          <div className="text-xs text-muted">{c?.category || 'General'}</div>
        </div>
      ),
    },
    {
      title: 'Batch Cohort',
      dataIndex: 'batchId',
      render: (b) => (
        <div>
          <div className="font-medium">{b?.batchName || '—'}</div>
          <div className="text-xs text-muted">
            <Badge type="mode">{b?.mode || 'OFFLINE'}</Badge>
          </div>
        </div>
      ),
    },
    {
      title: 'Training Provider',
      dataIndex: 'providerId',
      render: (p) => (
        <span className="font-medium text-primary-link">
          {p?.organizationName || '—'}
        </span>
      ),
    },
    {
      title: 'Enrollment Date',
      dataIndex: 'enrollmentDate',
      render: (val) => formatDate(val),
    },
    {
      title: 'Outcome Status',
      dataIndex: 'status',
      render: (status) => <Badge>{status}</Badge>,
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
          <h1 className="page-title">Course Enrollments Registry</h1>
          <p className="page-subtitle">
            System-level audit of all active and completed student learning engagements
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
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar-card">
        <div className="search-input-wrapper">
          <IconSearch size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by student, course, cohort batch, provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <label className="filter-label">Provider:</label>
          <select
            className="filter-select"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
          >
            <option value="ALL">All Providers</option>
            {providers.map((p) => (
              <option key={p._id} value={p._id}>
                {p.organizationName}
              </option>
            ))}
          </select>

          <label className="filter-label">Outcome Status:</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses ({enrollments.length})</option>
            <option value="ENROLLED">Enrolled (Active)</option>
            <option value="COMPLETED">Completed</option>
            <option value="DROPPED">Dropped</option>
          </select>
        </div>
      </div>

      <div className="content-card">
        <Table
          columns={columns}
          data={filteredEnrollments}
          loading={loading}
          emptyTitle="No enrollments recorded"
          emptyDescription="There are no enrollment records matching your filter."
          icon={IconUserCheck}
        />
      </div>
    </div>
  );
};
