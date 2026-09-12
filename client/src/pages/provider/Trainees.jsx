import React, { useState, useEffect, useMemo } from 'react';
import { traineeService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { TraineeModal } from '../../components/provider/TraineeModal';
import {
  IconUsers,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconEdit,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderTrainees = () => {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchTrainees = async () => {
    try {
      setLoading(true);
      const res = await traineeService.getAll();
      if (res.data.success) {
        setTrainees(res.data.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to fetch trainees', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainees();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setActionLoading(true);
      if (editingTrainee) {
        const res = await traineeService.update(editingTrainee._id, formData);
        if (res.data.success) {
          setToast({ message: 'Trainee profile updated!', type: 'success' });
          setIsModalOpen(false);
          setEditingTrainee(null);
          fetchTrainees();
        }
      } else {
        const res = await traineeService.create(formData);
        if (res.data.success) {
          setToast({ message: 'Trainee registered with login credentials!', type: 'success' });
          setIsModalOpen(false);
          fetchTrainees();
        }
      }
    } catch (err) {
      setToast({ message: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTrainees = useMemo(() => {
    return trainees.filter((t) => {
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus;

      const matchesSearch =
        (t.userId?.name || '').toLowerCase().includes(q) ||
        (t.userId?.username || '').toLowerCase().includes(q) ||
        (t.userId?.email || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.location || '').toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [trainees, search, statusFilter]);

  const columns = [
    {
      title: 'Trainee Student',
      dataIndex: 'userId',
      render: (u) => (
        <div className="table-org-cell">
          <div className="table-avatar user-avatar">{u?.name?.[0]?.toUpperCase() || 'T'}</div>
          <div>
            <div className="font-semibold text-main">{u?.name}</div>
            <div className="text-xs text-muted">@{u?.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Contact Details',
      key: 'contact',
      render: (_, row) => (
        <div>
          <div className="text-sm">{row.phone || '—'}</div>
          {row.userId?.email && <div className="text-xs text-muted">{row.userId.email}</div>}
        </div>
      ),
    },
    {
      title: 'City / Location',
      dataIndex: 'location',
      render: (val) => val || '—',
    },
    {
      title: 'Demographics',
      key: 'demographics',
      render: (_, row) => (
        <div className="text-xs text-muted">
          <span>{row.gender || 'Not specified'}</span>
          {row.dateOfBirth && <span> • DOB: {formatDate(row.dateOfBirth)}</span>}
        </div>
      ),
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
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={IconEdit}
          onClick={() => {
            setEditingTrainee(row);
            setIsModalOpen(true);
          }}
        >
          Edit
        </Button>
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
          <h1 className="page-title">Registered Trainees</h1>
          <p className="page-subtitle">
            Manage your student roster, credentials, contact information, and demographic data
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={fetchTrainees}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={IconPlus}
            onClick={() => {
              setEditingTrainee(null);
              setIsModalOpen(true);
            }}
          >
            Register Trainee
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
            placeholder="Search trainees by name, username, email, phone, location..."
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
          emptyTitle="No trainees registered yet"
          emptyDescription="Register your trainees to provide them with portal access and batch enrollment."
          emptyAction="Register Trainee"
          onEmptyAction={() => {
            setEditingTrainee(null);
            setIsModalOpen(true);
          }}
          icon={IconUsers}
        />
      </div>

      <TraineeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTrainee(null);
        }}
        onSubmit={handleCreateOrUpdate}
        trainee={editingTrainee}
        loading={actionLoading}
      />
    </div>
  );
};
