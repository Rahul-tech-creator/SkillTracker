import React, { useState, useEffect, useMemo } from 'react';
import { courseService, providerService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import {
  IconBookOpen,
  IconSearch,
  IconRefresh,
  IconCheckCircle,
  IconXCircle,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, providersRes] = await Promise.all([
        courseService.getAll(),
        providerService.getAll(),
      ]);
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data);
      }
      if (providersRes.data.success) {
        setProviders(providersRes.data.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load courses', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (course) => {
    const newStatus = course.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await courseService.updateStatus(course._id, newStatus);
      if (res.data.success) {
        setToast({
          message: `Course status changed to ${newStatus}`,
          type: 'success',
        });
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesProvider =
        providerFilter === 'ALL' || c.providerId?._id === providerFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus && matchesProvider;

      const matchesSearch =
        c.courseName?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.providerId?.organizationName?.toLowerCase().includes(q) ||
        c.skills?.some((s) => {
          const name = typeof s === 'string' ? s : s?.skillName || s?.name || '';
          return name.toLowerCase().includes(q);
        });

      return matchesStatus && matchesProvider && matchesSearch;
    });
  }, [courses, search, statusFilter, providerFilter]);

  const columns = [
    {
      title: 'Course Curriculum',
      dataIndex: 'courseName',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-main">{val}</div>
          {row.description && (
            <div className="text-xs text-muted line-clamp-1">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Training Provider',
      dataIndex: 'providerId',
      render: (provider) => (
        <span className="font-medium text-primary-link">
          {provider?.organizationName || '—'}
        </span>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      render: (val) => val || 'General',
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (val) => val || '—',
    },
    {
      title: 'Target Skills',
      dataIndex: 'skills',
      render: (skills) => (
        <div className="table-skills-list">
          {Array.isArray(skills) && skills.length > 0
            ? skills.slice(0, 3).map((s, i) => {
                const label = typeof s === 'string' ? s : s?.skillName || s?.name || 'Skill';
                return (
                  <span key={i} className="mini-skill-pill">
                    {label}
                  </span>
                );
              })
            : '—'}
          {skills?.length > 3 && (
            <span className="mini-skill-pill more">+{skills.length - 3}</span>
          )}
        </div>
      ),
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
          variant={row.status === 'ACTIVE' ? 'ghost-danger' : 'ghost-success'}
          size="sm"
          icon={row.status === 'ACTIVE' ? IconXCircle : IconCheckCircle}
          onClick={() => handleToggleStatus(row)}
        >
          {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
          <h1 className="page-title">System-wide Course Curricula</h1>
          <p className="page-subtitle">
            Catalog of training programs provided by all registered partner institutions
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
            placeholder="Search by course name, category, skills, provider..."
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
            <option value="ALL">All Statuses ({courses.length})</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className="content-card">
        <Table
          columns={columns}
          data={filteredCourses}
          loading={loading}
          emptyTitle="No courses found"
          emptyDescription="There are no courses matching the applied filters."
          icon={IconBookOpen}
        />
      </div>
    </div>
  );
};
