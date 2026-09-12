import React, { useState, useEffect, useMemo } from 'react';
import { traineeService, providerService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import {
  IconUsers,
  IconSearch,
  IconRefresh,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const AdminTrainees = () => {
  const [trainees, setTrainees] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [traineesRes, providersRes] = await Promise.all([
        traineeService.getAll(),
        providerService.getAll(),
      ]);
      if (traineesRes.data.success) {
        setTrainees(traineesRes.data.data);
      }
      if (providersRes.data.success) {
        setProviders(providersRes.data.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load trainees', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTrainees = useMemo(() => {
    return trainees.filter((t) => {
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesProvider =
        providerFilter === 'ALL' || t.providerId?._id === providerFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus && matchesProvider;

      const matchesSearch =
        (t.userId?.name || '').toLowerCase().includes(q) ||
        (t.userId?.username || '').toLowerCase().includes(q) ||
        (t.userId?.email || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.location || '').toLowerCase().includes(q) ||
        (t.providerId?.organizationName || '').toLowerCase().includes(q);

      return matchesStatus && matchesProvider && matchesSearch;
    });
  }, [trainees, search, statusFilter, providerFilter]);

  const columns = [
    {
      title: 'Trainee Student',
      dataIndex: 'userId',
      render: (u, row) => (
        <div className="table-org-cell">
          <div className="table-avatar user-avatar">{u?.name?.[0]?.toUpperCase() || 'T'}</div>
          <div>
            <div className="font-semibold text-main">{u?.name || '—'}</div>
            <div className="text-xs text-muted">@{u?.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Assigned Provider',
      dataIndex: 'providerId',
      render: (p) => (
        <span className="font-medium text-primary-link">
          {p?.organizationName || '—'}
        </span>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, row) => (
        <div>
          <div className="text-sm">{row.phone || '—'}</div>
          {row.userId?.email && <div className="text-xs text-muted">{row.userId.email}</div>}
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      render: (loc) => loc || '—',
    },
    {
      title: 'Gender / DOB',
      key: 'demographics',
      render: (_, row) => (
        <div className="text-xs text-muted">
          <span>{row.gender || 'Not specified'}</span>
          {row.dateOfBirth && <span> • {formatDate(row.dateOfBirth)}</span>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => <Badge>{status}</Badge>,
    },
    {
      title: 'Joined On',
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
          <h1 className="page-title">Registered Trainees</h1>
          <p className="page-subtitle">
            Central registry of all students participating in skilling programs across centers
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
            placeholder="Search by student name, username, email, phone, location..."
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

          <label className="filter-label">Status:</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses ({trainees.length})</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className="content-card">
        <Table
          columns={columns}
          data={filteredTrainees}
          loading={loading}
          emptyTitle="No trainees found"
          emptyDescription="There are no trainee records matching your search criteria."
          icon={IconUsers}
        />
      </div>
    </div>
  );
};
