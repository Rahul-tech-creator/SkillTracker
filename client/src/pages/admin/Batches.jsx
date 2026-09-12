import React, { useState, useEffect, useMemo } from 'react';
import { batchService, providerService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import {
  IconLayers,
  IconSearch,
  IconRefresh,
  IconCalendar,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const AdminBatches = () => {
  const [batches, setBatches] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, providersRes] = await Promise.all([
        batchService.getAll(),
        providerService.getAll(),
      ]);
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.data);
      }
      if (providersRes.data.success) {
        setProviders(providersRes.data.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load batches', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const matchesMode = modeFilter === 'ALL' || b.mode === modeFilter;
      const matchesProvider =
        providerFilter === 'ALL' || b.providerId?._id === providerFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus && matchesMode && matchesProvider;

      const matchesSearch =
        (b.batchName || '').toLowerCase().includes(q) ||
        (b.courseId?.courseName || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q) ||
        (b.providerId?.organizationName || '').toLowerCase().includes(q);

      return matchesStatus && matchesMode && matchesProvider && matchesSearch;
    });
  }, [batches, search, statusFilter, modeFilter, providerFilter]);

  const columns = [
    {
      title: 'Batch / Cohort',
      dataIndex: 'batchName',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-main">{val}</div>
          <div className="text-xs text-muted">
            Course: {row.courseId?.courseName || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'providerId',
      render: (p) => (
        <span className="font-medium text-primary-link">
          {p?.organizationName || '—'}
        </span>
      ),
    },
    {
      title: 'Schedule Timeline',
      key: 'dates',
      render: (_, row) => (
        <div className="text-xs">
          <span className="font-medium">{formatDate(row.startDate)}</span>
          <span className="text-muted"> → </span>
          <span className="font-medium">{formatDate(row.endDate)}</span>
        </div>
      ),
    },
    {
      title: 'Delivery Mode',
      dataIndex: 'mode',
      render: (mode) => <Badge type="mode">{mode}</Badge>,
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      render: (cap) => cap ? `${cap} seats` : <span className="text-muted">Open</span>,
    },
    {
      title: 'Status',
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
          <h1 className="page-title">System-wide Training Batches</h1>
          <p className="page-subtitle">
            All active, scheduled, and past training cohorts across participating centers
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
            placeholder="Search by batch name, course, provider, location..."
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

          <label className="filter-label">Mode:</label>
          <select
            className="filter-select"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="ALL">All Modes</option>
            <option value="OFFLINE">Offline</option>
            <option value="ONLINE">Online</option>
            <option value="HYBRID">Hybrid</option>
          </select>

          <label className="filter-label">Status:</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses ({batches.length})</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="content-card">
        <Table
          columns={columns}
          data={filteredBatches}
          loading={loading}
          emptyTitle="No training batches found"
          emptyDescription="There are no batches matching the chosen criteria."
          icon={IconLayers}
        />
      </div>
    </div>
  );
};
