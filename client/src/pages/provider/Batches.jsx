import React, { useState, useEffect, useMemo } from 'react';
import { batchService, courseService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { BatchModal } from '../../components/provider/BatchModal';
import {
  IconLayers,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconEdit,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderBatches = () => {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, coursesRes] = await Promise.all([
        batchService.getAll(),
        courseService.getAll(),
      ]);

      if (batchesRes.data.success) {
        setBatches(batchesRes.data.data);
      }
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data);
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

  const handleCreateOrUpdate = async (formData) => {
    try {
      setActionLoading(true);
      if (editingBatch) {
        const res = await batchService.update(editingBatch._id, formData);
        if (res.data.success) {
          setToast({ message: 'Batch updated successfully!', type: 'success' });
          setIsModalOpen(false);
          setEditingBatch(null);
          fetchData();
        }
      } else {
        const res = await batchService.create(formData);
        if (res.data.success) {
          setToast({ message: 'Batch cohort launched successfully!', type: 'success' });
          setIsModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      setToast({ message: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const matchesMode = modeFilter === 'ALL' || b.mode === modeFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus && matchesMode;

      const matchesSearch =
        (b.batchName || '').toLowerCase().includes(q) ||
        (b.courseId?.courseName || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q);

      return matchesStatus && matchesMode && matchesSearch;
    });
  }, [batches, search, statusFilter, modeFilter]);

  const columns = [
    {
      title: 'Batch / Cohort',
      dataIndex: 'batchName',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-main">{val}</div>
          <div className="text-xs text-muted">
            Curriculum: {row.courseId?.courseName || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Timeline Schedule',
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
      render: (val) => val ? `${val} trainees` : 'Unlimited',
    },
    {
      title: 'Location / Link',
      dataIndex: 'location',
      render: (loc) => loc || <span className="text-muted">—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => <Badge>{status}</Badge>,
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
            setEditingBatch(row);
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
          <h1 className="page-title">Training Cohorts & Batches</h1>
          <p className="page-subtitle">
            Schedule cohorts, manage enrollment capacities, and configure delivery venues
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
            onClick={() => {
              setEditingBatch(null);
              setIsModalOpen(true);
            }}
            disabled={courses.length === 0}
            title={courses.length === 0 ? 'Create a course first' : ''}
          >
            Launch Batch
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
            placeholder="Search batches by name, course, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
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
          emptyDescription={
            courses.length === 0
              ? 'You must create at least one course before launching a batch.'
              : 'Create a new training cohort to begin enrolling trainees.'
          }
          emptyAction={courses.length > 0 ? 'Launch Batch' : undefined}
          onEmptyAction={() => {
            setEditingBatch(null);
            setIsModalOpen(true);
          }}
          icon={IconLayers}
        />
      </div>

      <BatchModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBatch(null);
        }}
        onSubmit={handleCreateOrUpdate}
        batch={editingBatch}
        courses={courses.filter((c) => c.status === 'ACTIVE')}
        loading={actionLoading}
      />
    </div>
  );
};
