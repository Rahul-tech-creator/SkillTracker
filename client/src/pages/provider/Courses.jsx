import React, { useState, useEffect, useMemo } from 'react';
import { courseService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { CourseModal } from '../../components/provider/CourseModal';
import {
  IconBookOpen,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconEdit,
  IconCheckCircle,
  IconXCircle,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await courseService.getAll();
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to fetch courses', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setActionLoading(true);
      if (editingCourse) {
        const res = await courseService.update(editingCourse._id, formData);
        if (res.data.success) {
          setToast({ message: 'Course updated successfully!', type: 'success' });
          setIsModalOpen(false);
          setEditingCourse(null);
          fetchCourses();
        }
      } else {
        const res = await courseService.create(formData);
        if (res.data.success) {
          setToast({ message: 'Course created successfully!', type: 'success' });
          setIsModalOpen(false);
          fetchCourses();
        }
      }
    } catch (err) {
      setToast({ message: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (course) => {
    const newStatus = course.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await courseService.updateStatus(course._id, newStatus);
      if (res.data.success) {
        setToast({ message: `Course status set to ${newStatus}`, type: 'success' });
        fetchCourses();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to change status', type: 'error' });
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus;

      const matchesSearch =
        c.courseName?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.skills?.some((s) => {
          const name = typeof s === 'string' ? s : s?.skillName || s?.name || '';
          return name.toLowerCase().includes(q);
        });

      return matchesStatus && matchesSearch;
    });
  }, [courses, search, statusFilter]);

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
      title: 'Domain / Category',
      dataIndex: 'category',
      render: (val) => val || 'General',
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (val) => val || '—',
    },
    {
      title: 'Skills Included',
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
              setEditingCourse(row);
              setIsModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant={row.status === 'ACTIVE' ? 'ghost-danger' : 'ghost-success'}
            size="sm"
            icon={row.status === 'ACTIVE' ? IconXCircle : IconCheckCircle}
            onClick={() => handleToggleStatus(row)}
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
          <h1 className="page-title">Course Curricula Management</h1>
          <p className="page-subtitle">
            Manage your organization's course catalog, targeted skills, and syllabus
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={fetchCourses}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={IconPlus}
            onClick={() => {
              setEditingCourse(null);
              setIsModalOpen(true);
            }}
          >
            Add New Course
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
            placeholder="Search by course name, category, skills, syllabus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <label className="filter-label">Filter Status:</label>
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
          emptyTitle="No courses defined"
          emptyDescription="Click 'Add New Course' to create your first vocational curriculum."
          icon={IconBookOpen}
        />
      </div>

      <CourseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
        onSubmit={handleCreateOrUpdate}
        course={editingCourse}
        loading={actionLoading}
      />
    </div>
  );
};
