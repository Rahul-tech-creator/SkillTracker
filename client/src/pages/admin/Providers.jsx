import React, { useState, useEffect, useMemo } from 'react';
import { providerService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { ProviderModal } from '../../components/admin/ProviderModal';
import { ResetPasswordModal } from '../../components/admin/ResetPasswordModal';
import {
  IconBuilding,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconEdit,
  IconKey,
  IconCheckCircle,
  IconXCircle,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const AdminProviders = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetProvider, setResetProvider] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await providerService.getAll();
      if (res.data.success) {
        setProviders(res.data.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to fetch providers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setActionLoading(true);
      if (editingProvider) {
        const res = await providerService.update(editingProvider._id, formData);
        if (res.data.success) {
          setToast({ message: 'Provider details updated successfully!', type: 'success' });
          setIsProviderModalOpen(false);
          setEditingProvider(null);
          fetchProviders();
        }
      } else {
        const res = await providerService.create(formData);
        if (res.data.success) {
          setToast({ message: 'Provider organization registered successfully!', type: 'success' });
          setIsProviderModalOpen(false);
          fetchProviders();
        }
      }
    } catch (err) {
      setToast({ message: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (provider) => {
    const newStatus = provider.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await providerService.updateStatus(provider._id, newStatus);
      if (res.data.success) {
        setToast({
          message: `Provider ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully!`,
          type: 'success',
        });
        fetchProviders();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const handleResetPassword = async (newPassword) => {
    if (!resetProvider) return;
    try {
      setActionLoading(true);
      const res = await providerService.resetPassword(resetProvider._id, newPassword);
      if (res.data.success) {
        setToast({ message: 'Provider password reset successfully!', type: 'success' });
        setIsResetModalOpen(false);
        setResetProvider(null);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to reset password', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus;

      const matchesSearch =
        (p.organizationName || '').toLowerCase().includes(q) ||
        (p.contactPerson || '').toLowerCase().includes(q) ||
        (p.userId?.username || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [providers, search, statusFilter]);

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
      title: 'Contact Details',
      dataIndex: 'contactPerson',
      render: (val, row) => (
        <div>
          <div className="font-medium">{val}</div>
          <div className="text-xs text-muted">{row.phone}</div>
        </div>
      ),
    },
    {
      title: 'Address / Location',
      dataIndex: 'address',
      render: (val) => val || <span className="text-muted">—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => <Badge>{status}</Badge>,
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      render: (val) => formatDate(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div className="action-buttons-group">
          <Button
            variant="ghost"
            size="sm"
            icon={IconEdit}
            onClick={() => {
              setEditingProvider(row);
              setIsProviderModalOpen(true);
            }}
            title="Edit details"
          >
            Edit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={IconKey}
            onClick={() => {
              setResetProvider(row);
              setIsResetModalOpen(true);
            }}
            title="Reset Password"
          >
            Reset
          </Button>

          <Button
            variant={row.status === 'ACTIVE' ? 'ghost-danger' : 'ghost-success'}
            size="sm"
            icon={row.status === 'ACTIVE' ? IconXCircle : IconCheckCircle}
            onClick={() => handleToggleStatus(row)}
            title={row.status === 'ACTIVE' ? 'Deactivate Provider' : 'Activate Provider'}
          >
            {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
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
          <h1 className="page-title">Training Providers Management</h1>
          <p className="page-subtitle">
            Configure partner organizations, manage accounts, and monitor provider status
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={fetchProviders}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={IconPlus}
            onClick={() => {
              setEditingProvider(null);
              setIsProviderModalOpen(true);
            }}
          >
            Add Provider
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
            placeholder="Search by organization name, username, contact person, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <label className="filter-label">Status:</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses ({providers.length})</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Providers Table */}
      <div className="content-card">
        <Table
          columns={columns}
          data={filteredProviders}
          loading={loading}
          emptyTitle="No providers match your filter"
          emptyDescription="Try clearing your search or add a new training provider."
          emptyAction="Register Provider"
          onEmptyAction={() => {
            setEditingProvider(null);
            setIsProviderModalOpen(true);
          }}
          icon={IconBuilding}
        />
      </div>

      <ProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => {
          setIsProviderModalOpen(false);
          setEditingProvider(null);
        }}
        onSubmit={handleCreateOrUpdate}
        provider={editingProvider}
        loading={actionLoading}
      />

      <ResetPasswordModal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setResetProvider(null);
        }}
        onSubmit={handleResetPassword}
        provider={resetProvider}
        loading={actionLoading}
      />
    </div>
  );
};
