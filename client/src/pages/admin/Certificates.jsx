import React, { useState, useEffect, useMemo } from 'react';
import { certificateService, providerService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import { CertificateViewModal } from '../../components/common/CertificateViewModal';
import {
  IconCertificate,
  IconSearch,
  IconRefresh,
  IconEye,
  IconBan,
  IconShield,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const AdminCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');

  const [selectedCert, setSelectedCert] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, pRes] = await Promise.all([
        certificateService.getAll(),
        providerService.getAll(),
      ]);

      if (cRes.data.success) setCertificates(cRes.data.data);
      if (pRes.data.success) setProviders(pRes.data.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load certificates', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevoke = async (cert) => {
    if (!window.confirm(`Are you sure you want to REVOKE certificate ${cert.certificateNumber} for ${cert.traineeId?.userId?.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setRevokingId(cert._id);
      const res = await certificateService.revoke(cert._id);
      if (res.data.success) {
        setToast({ message: `Certificate ${cert.certificateNumber} has been revoked.`, type: 'success' });
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to revoke certificate', type: 'error' });
    } finally {
      setRevokingId(null);
    }
  };

  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesProvider =
        providerFilter === 'ALL' || c.providerId?._id === providerFilter;
      const q = (search || '').toLowerCase().trim();
      if (!q) return matchesStatus && matchesProvider;

      const matchesSearch =
        (c.certificateNumber || '').toLowerCase().includes(q) ||
        (c.verificationCode || '').toLowerCase().includes(q) ||
        (c.traineeId?.userId?.name || '').toLowerCase().includes(q) ||
        (c.courseId?.courseName || '').toLowerCase().includes(q) ||
        (c.providerId?.organizationName || '').toLowerCase().includes(q);

      return matchesStatus && matchesProvider && matchesSearch;
    });
  }, [certificates, search, statusFilter, providerFilter]);

  const columns = [
    {
      title: 'Certificate #',
      dataIndex: 'certificateNumber',
      render: (val, row) => (
        <div>
          <div className="font-mono font-semibold text-main">{val}</div>
          <div className="text-xs font-mono text-muted">Code: {row.verificationCode}</div>
        </div>
      ),
    },
    {
      title: 'Certified Trainee',
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
      title: 'Training Provider',
      dataIndex: 'providerId',
      render: (p) => (
        <span className="font-medium text-primary-link">
          {p?.organizationName || '—'}
        </span>
      ),
    },
    {
      title: 'Issue Date',
      dataIndex: 'issueDate',
      render: (d) => formatDate(d),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => (
        <span className={`badge ${status === 'ISSUED' ? 'badge-success' : 'badge-danger'}`}>
          <span className="badge-dot"></span>
          {status === 'ISSUED' ? 'VALID' : 'REVOKED'}
        </span>
      ),
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
            icon={IconEye}
            onClick={() => setSelectedCert(row)}
            title="View Full Certificate"
          >
            View
          </Button>

          {row.status === 'ISSUED' && (
            <Button
              variant="ghost-danger"
              size="sm"
              icon={IconBan}
              loading={revokingId === row._id}
              onClick={() => handleRevoke(row)}
              title="Revoke this Certificate"
            >
              Revoke
            </Button>
          )}
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
          <h1 className="page-title">Digital Certificates Registry</h1>
          <p className="page-subtitle">
            Central repository of all issued, active, and revoked student completion credentials
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
            placeholder="Search by Certificate #, verification code, student, course, provider..."
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
            <option value="ALL">All Statuses ({certificates.length})</option>
            <option value="ISSUED">Valid (Issued)</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      <div className="content-card">
        <Table
          columns={columns}
          data={filteredCertificates}
          loading={loading}
          emptyTitle="No certificates found"
          emptyDescription="There are no certificates matching the selected filter."
          icon={IconCertificate}
        />
      </div>

      <CertificateViewModal
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
      />
    </div>
  );
};
