import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { providerService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Toast } from '../../components/common/Toast';
import {
  IconBuilding,
  IconUser,
  IconPhone,
  IconMapPin,
  IconMail,
  IconShield,
  IconRefresh,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderProfile = () => {
  const { user, refreshUser } = useAuth();
  const [provider, setProvider] = useState(user?.profile || null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      await refreshUser();
      const res = await providerService.getAll();
      if (res.data.success && res.data.data.length > 0) {
        setProvider(res.data.data[0]);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to refresh profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
          <h1 className="page-title">Organization Profile</h1>
          <p className="page-subtitle">
            Training provider organizational details, representative contact, and center status
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="outline"
            icon={IconRefresh}
            onClick={fetchProfile}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="profile-layout-grid">
        <div className="content-card profile-main-card">
          <div className="profile-header-banner">
            <div className="profile-avatar-large">
              {provider?.organizationName?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="profile-header-info">
              <h2 className="profile-org-name">{provider?.organizationName || 'Organization'}</h2>
              <div className="profile-badges-row">
                <Badge>{provider?.status || 'ACTIVE'}</Badge>
                <span className="profile-handle">@{user?.username}</span>
              </div>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-detail-card">
              <div className="detail-icon-circle">
                <IconUser size={20} />
              </div>
              <div>
                <span className="detail-label">Contact Person</span>
                <p className="detail-value">{provider?.contactPerson || user?.name || '—'}</p>
              </div>
            </div>

            <div className="profile-detail-card">
              <div className="detail-icon-circle">
                <IconPhone size={20} />
              </div>
              <div>
                <span className="detail-label">Phone Number</span>
                <p className="detail-value">{provider?.phone || '—'}</p>
              </div>
            </div>

            <div className="profile-detail-card">
              <div className="detail-icon-circle">
                <IconMail size={20} />
              </div>
              <div>
                <span className="detail-label">Official Email</span>
                <p className="detail-value">{user?.email || '—'}</p>
              </div>
            </div>

            <div className="profile-detail-card">
              <div className="detail-icon-circle">
                <IconMapPin size={20} />
              </div>
              <div>
                <span className="detail-label">Center Address</span>
                <p className="detail-value">{provider?.address || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="content-card profile-security-card">
          <h3 className="card-title">
            <IconShield size={18} /> System Registration
          </h3>
          <p className="text-sm text-muted mb-4">
            Security and account metadata registered on the platform
          </p>

          <div className="security-metadata-list">
            <div className="meta-row">
              <span className="meta-label">Account Role</span>
              <span className="meta-val font-semibold">Training Provider (PROVIDER)</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Status</span>
              <span className="meta-val"><Badge>{provider?.status || 'ACTIVE'}</Badge></span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Registered On</span>
              <span className="meta-val">{formatDate(provider?.createdAt)}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Provider ID</span>
              <span className="meta-val font-mono text-xs">{provider?._id || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
