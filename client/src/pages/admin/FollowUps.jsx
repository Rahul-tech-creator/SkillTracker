import React, { useState, useEffect, useMemo } from 'react';
import { followUpService, providerService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Toast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { CommunicationHistoryModal } from '../../components/common/CommunicationHistoryModal';
import { CallLogModal } from '../../components/followups/CallLogModal';
import {
  IconActivity,
  IconSearch,
  IconRefresh,
  IconClock,
  IconCheckSquare,
  IconCalendar,
  IconEye,
  IconFlag,
  IconPhoneCall,
  IconCheckCircle,
  IconUserX,
  IconRotateCcw,
  IconHistory,
  IconSliders,
  IconShield,
  IconBuilding,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const AdminFollowUps = () => {
  const [activeTab, setActiveTab] = useState('PIPELINE'); // 'PIPELINE' | 'ASSISTED_QUEUE' | 'GOV_QUEUE' | 'SETTINGS'
  const [followUps, setFollowUps] = useState([]);
  const [assistedQueue, setAssistedQueue] = useState([]);
  const [govQueue, setGovQueue] = useState([]);
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    due: 0,
    waitingResponse: 0,
    callRequired: 0,
    callAttempted: 0,
    governmentFlagged: 0,
    responded: 0,
    notResponded: 0,
    optedOut: 0,
    returned: 0,
    responseRate: 0,
    callEscalationRate: 0,
    govEscalationRate: 0,
    byType: {},
  });
  const [settings, setSettings] = useState({
    firstFollowUpDays: 3,
    digitalResponseWaitDays: 3,
    callResponseWaitDays: 3,
    tokenExpiryDays: 30,
  });

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [govStatusFilter, setGovStatusFilter] = useState('ALL');

  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [historyModalFollowUp, setHistoryModalFollowUp] = useState(null);
  const [callLogTarget, setCallLogTarget] = useState(null);
  const [selectedGovRecord, setSelectedGovRecord] = useState(null);
  const [govActionStatus, setGovActionStatus] = useState('');
  const [govActionNote, setGovActionNote] = useState('');
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fRes, pRes, sRes, qRes, setRes, aRes] = await Promise.all([
        followUpService.getAll(),
        providerService.getAll(),
        followUpService.getStats(),
        followUpService.getGovernmentQueue(),
        followUpService.getSettings(),
        followUpService.getAssistedQueue().catch(() => ({ data: { data: [] } })),
      ]);

      if (fRes.data.success) setFollowUps(fRes.data.data);
      if (pRes.data.success) setProviders(pRes.data.data);
      if (sRes.data.success) setStats(sRes.data.data);
      if (qRes.data.success) setGovQueue(qRes.data.data);
      if (setRes.data.success) setSettings(setRes.data.data);
      if (aRes.data?.data) setAssistedQueue(aRes.data.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load follow-up tracking data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleTimeEvent = () => fetchData();
    window.addEventListener('time:advanced', handleTimeEvent);
    window.addEventListener('time:changed', handleTimeEvent);
    window.addEventListener('time:reset', handleTimeEvent);
    return () => {
      window.removeEventListener('time:advanced', handleTimeEvent);
      window.removeEventListener('time:changed', handleTimeEvent);
      window.removeEventListener('time:reset', handleTimeEvent);
    };
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await followUpService.updateSettings(settings);
      if (res.data.success) {
        setToast({ message: '✓ Follow-up interval settings saved successfully.', type: 'success' });
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to update settings', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateGovStatus = async (e) => {
    e.preventDefault();
    if (!selectedGovRecord) return;
    try {
      const res = await followUpService.updateGovernmentStatus(selectedGovRecord._id, {
        status: govActionStatus || selectedGovRecord.status,
        note: govActionNote,
      });
      if (res.data.success) {
        setToast({ message: '✓ Government tracking status updated successfully.', type: 'success' });
        setSelectedGovRecord(null);
        setGovActionNote('');
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((f) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        f.status === statusFilter ||
        (statusFilter === 'DUE' && (f.status === 'DUE' || f.status === 'READY')) ||
        (statusFilter === 'WAITING_FOR_RESPONSE' && (f.status === 'WAITING_FOR_RESPONSE' || f.status === 'DIGITAL_CONTACTED')) ||
        (statusFilter === 'RESPONDED' && (f.status === 'RESPONDED' || f.status === 'COMPLETED'));

      const matchesProvider =
        providerFilter === 'ALL' || f.providerId?._id === providerFilter;

      const q = search.toLowerCase();
      const traineeName = f.traineeId?.userId?.name?.toLowerCase() || '';
      const traineePhone = f.traineeId?.phone || '';
      const maskedId = f.traineeId?.maskedAadhaar?.toLowerCase() || '';
      const courseName = f.enrollmentId?.courseId?.courseName?.toLowerCase() || '';
      const providerName = f.providerId?.organizationName?.toLowerCase() || '';

      const matchesSearch =
        !search ||
        traineeName.includes(q) ||
        traineePhone.includes(q) ||
        maskedId.includes(q) ||
        courseName.includes(q) ||
        providerName.includes(q);

      return matchesStatus && matchesProvider && matchesSearch;
    });
  }, [followUps, search, statusFilter, providerFilter]);

  const filteredGovQueue = useMemo(() => {
    return govQueue.filter((q) => {
      const matchesStatus = govStatusFilter === 'ALL' || q.status === govStatusFilter;
      const term = search.toLowerCase();
      const name = q.traineeId?.userId?.name?.toLowerCase() || '';
      const idMask = q.maskedIdNumber?.toLowerCase() || '';
      const prov = q.providerId?.organizationName?.toLowerCase() || '';
      const loc = q.lastKnownLocation?.toLowerCase() || '';

      const matchesSearch =
        !search || name.includes(term) || idMask.includes(term) || prov.includes(term) || loc.includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [govQueue, search, govStatusFilter]);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'DUE':
      case 'READY':
        return <Badge status="warning" text="DUE TODAY" />;
      case 'WAITING_FOR_RESPONSE':
      case 'DIGITAL_CONTACTED':
        return <Badge status="info" text="AWAITING RESPONSE" />;
      case 'CALL_REQUIRED':
        return <Badge status="danger" text="CALL REQUIRED" />;
      case 'CALL_ATTEMPTED':
      case 'WAITING_AFTER_CALL':
        return <Badge status="warning" text="CALL ATTEMPTED" />;
      case 'GOVERNMENT_TRACKING_FLAGGED':
        return <Badge status="danger" text="GOV TRACKING FLAGGED" />;
      case 'RESPONDED':
      case 'COMPLETED':
        return <Badge status="success" text="RESPONDED" />;
      case 'RETURNED':
        return <Badge status="success" text="RETURNED" />;
      case 'OPTED_OUT':
        return <Badge status="neutral" text="OPTED OUT" />;
      case 'NOT_RESPONDED':
      case 'UNREACHABLE':
        return <Badge status="neutral" text="NOT RESPONDED" />;
      default:
        return <Badge status="neutral" text={status?.replace(/_/g, ' ') || 'NOT DUE'} />;
    }
  };

  const followUpColumns = [
    {
      title: 'Trainee Graduate',
      dataIndex: 'traineeId',
      render: (val) => (
        <div>
          <div className="font-semibold text-main">{val?.userId?.name || '—'}</div>
          <div className="text-xs text-muted">
            📞 {val?.phone || 'No phone'} | 🆔 {val?.maskedAadhaar || 'XXXX-XXXX-1234'}
          </div>
        </div>
      ),
    },
    {
      title: 'Milestone',
      dataIndex: 'followUpType',
      render: (val) => (
        <span className="font-semibold font-mono text-primary text-xs">
          {val?.replace('_', '-')}
        </span>
      ),
    },
    {
      title: 'Program & Provider',
      dataIndex: 'enrollmentId',
      render: (val, row) => (
        <div>
          <div className="text-sm font-medium">{val?.courseId?.courseName || 'Course'}</div>
          <div className="text-xs text-muted">{row.providerId?.organizationName || 'Provider'}</div>
        </div>
      ),
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduledDate',
      render: (val) => <span className="text-sm">{formatDate(val)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (val) => renderStatusBadge(val),
    },
    {
      title: 'Actions',
      render: (_, row) => (
        <div className="table-actions-cell flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={IconHistory}
            onClick={() => setHistoryModalFollowUp(row)}
            title="View History Timeline"
          >
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={IconEye}
            onClick={() => setSelectedFollowUp(row)}
            title="View Details"
          >
            Details
          </Button>
        </div>
      ),
    },
  ];

  const govColumns = [
    {
      title: 'Trainee & Masked ID',
      dataIndex: 'traineeId',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-main">{val?.userId?.name || 'Trainee'}</div>
          <div className="text-xs font-mono text-primary font-bold">
            🆔 {row.maskedIdNumber || 'XXXX-XXXX-1234'} ({row.governmentIdType})
          </div>
        </div>
      ),
    },
    {
      title: 'Provider Organization',
      dataIndex: 'providerId',
      render: (val) => <span className="text-sm">{val?.organizationName || 'Provider'}</span>,
    },
    {
      title: 'Program & Batch',
      dataIndex: 'enrollmentId',
      render: (val) => (
        <div>
          <div className="text-sm font-medium">{val?.courseId?.courseName || 'Course'}</div>
          <div className="text-xs text-muted">{val?.batchId?.batchName || 'Batch'}</div>
        </div>
      ),
    },
    {
      title: 'Contact Attempts',
      render: (_, row) => (
        <div className="text-xs">
          <span>Digital: {row.digitalAttemptsCount || 1}</span> | <span>Calls: {row.callAttemptsCount || 1}</span>
        </div>
      ),
    },
    {
      title: 'Escalation Date',
      dataIndex: 'escalatedAt',
      render: (val) => <span className="text-xs">{formatDate(val)}</span>,
    },
    {
      title: 'Tracking Status',
      dataIndex: 'status',
      render: (val) => {
        if (val === 'PENDING_GOVERNMENT_ACTION') return <Badge status="danger" text="PENDING ACTION" />;
        if (val === 'UNDER_GOVERNMENT_TRACKING') return <Badge status="warning" text="UNDER TRACKING" />;
        if (val === 'RETURNED' || val === 'RESOLVED') return <Badge status="success" text={val} />;
        return <Badge status="neutral" text={val} />;
      },
    },
    {
      title: 'Actions',
      render: (_, row) => (
        <div className="table-actions-cell">
          <Button
            variant="outline"
            size="sm"
            icon={IconFlag}
            onClick={() => {
              setSelectedGovRecord(row);
              setGovActionStatus(row.status);
            }}
          >
            Manage Case
          </Button>
        </div>
      ),
    },
  ];

  const assistedColumns = [
    {
      title: 'Trainee Candidate',
      render: (_, row) => {
        const trainee = row.trainee || row.traineeId || {};
        const name = trainee.fullName || trainee.userId?.name || 'Trainee';
        const internalId = trainee.internalTraineeId || trainee.userId?.username;
        return (
          <div>
            <div className="font-semibold text-main">{name}</div>
            <div className="text-xs font-mono text-primary flex items-center gap-1">
              <IconShield size={11} /> {internalId || 'TRN-VERIFIED'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Contact Phone',
      render: (_, row) => {
        const phone = row.trainee?.phone || row.traineeId?.phone;
        return (
          <div className="font-mono text-xs font-semibold">
            {phone ? (
              <a href={`tel:${phone}`} className="text-primary hover:underline">
                📞 {phone}
              </a>
            ) : (
              'Protected Contact'
            )}
          </div>
        );
      },
    },
    {
      title: 'Milestone Due',
      render: (_, row) => {
        const m = row.milestone || row.followUpType?.replace('_', '-') || 'M3';
        return <span className="font-mono text-xs font-semibold text-primary">{m}</span>;
      },
    },
    {
      title: 'Escalation Status',
      render: () => (
        <div className="text-xs">
          <span className="badge badge-warning font-bold">Day 6+ Telephony Queue</span>
          <div className="text-muted mt-0.5">Day 0 Link & Day 3 Reminder Expired</div>
        </div>
      ),
    },
    {
      title: 'Actions',
      render: (_, row) => (
        <Button
          variant="primary"
          size="sm"
          icon={IconPhoneCall}
          onClick={() => setCallLogTarget(row)}
        >
          Call & Log
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

      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Longitudinal Outcome & Escalation Pipeline</h1>
          <p className="page-subtitle">
            System-wide follow-up monitoring, provider response analytics, and authorized government identity tracking queue
          </p>
        </div>

        <div className="header-actions flex items-center gap-2">
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

      {/* Navigation Tabs */}
      <div className="filter-pill-group mb-6">
        <button
          type="button"
          className={`filter-pill ${activeTab === 'PIPELINE' ? 'active' : ''}`}
          onClick={() => setActiveTab('PIPELINE')}
        >
          <IconActivity size={14} /> Master Follow-up Pipeline ({followUps.length})
        </button>
        <button
          type="button"
          className={`filter-pill ${activeTab === 'ASSISTED_QUEUE' ? 'active' : ''}`}
          onClick={() => setActiveTab('ASSISTED_QUEUE')}
        >
          <IconPhoneCall size={14} /> Assisted Follow-Up Queue ({assistedQueue.length})
        </button>
        <button
          type="button"
          className={`filter-pill ${activeTab === 'GOV_QUEUE' ? 'active' : ''}`}
          onClick={() => setActiveTab('GOV_QUEUE')}
        >
          <IconFlag size={14} /> Government Tracking Queue ({govQueue.length})
        </button>
        <button
          type="button"
          className={`filter-pill ${activeTab === 'SETTINGS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SETTINGS')}
        >
          <IconSliders size={14} /> Follow-Up Intervals Config
        </button>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="stats-grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatCard
          title="Due Today"
          value={stats.due}
          icon={IconCheckSquare}
          description="Active milestones"
          colorScheme="warning"
          loading={loading}
        />
        <StatCard
          title="Awaiting Response"
          value={stats.waitingResponse}
          icon={IconClock}
          description="Digital sent"
          colorScheme="primary"
          loading={loading}
        />
        <StatCard
          title="Call Escalations"
          value={stats.callRequired + stats.callAttempted}
          icon={IconPhoneCall}
          description={`${stats.callEscalationRate}% rate`}
          colorScheme="violet"
          loading={loading}
        />
        <StatCard
          title="Gov Queue Cases"
          value={stats.governmentFlagged}
          icon={IconFlag}
          description="Identity tracking"
          colorScheme="danger"
          loading={loading}
        />
        <StatCard
          title="Responded"
          value={stats.responded}
          icon={IconCheckCircle}
          description={`${stats.responseRate}% response`}
          colorScheme="emerald"
          loading={loading}
        />
        <StatCard
          title="Returned Cases"
          value={stats.returned}
          icon={IconRotateCcw}
          description="Contact restored"
          colorScheme="emerald"
          loading={loading}
        />
        <StatCard
          title="Opted Out"
          value={stats.optedOut}
          icon={IconUserX}
          description="Tracking paused"
          colorScheme="neutral"
          loading={loading}
        />
        <StatCard
          title="Total Follow-ups"
          value={stats.total}
          icon={IconActivity}
          description="All cohorts"
          colorScheme="primary"
          loading={loading}
        />
      </div>

      {/* TAB 1: PIPELINE */}
      {activeTab === 'PIPELINE' && (
        <div className="content-card">
          <div className="filters-bar-grid">
            <div className="search-input-group">
              <IconSearch size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by trainee, phone, masked ID, or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-select-group">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Follow-Up Statuses</option>
                <option value="DUE">DUE TODAY</option>
                <option value="WAITING_FOR_RESPONSE">Awaiting Digital Response</option>
                <option value="CALL_REQUIRED">CALL REQUIRED (Escalated)</option>
                <option value="CALL_ATTEMPTED">Call Attempted / Waiting</option>
                <option value="GOVERNMENT_TRACKING_FLAGGED">Government Tracking Flagged</option>
                <option value="RESPONDED">Responded / Completed</option>
                <option value="RETURNED">Returned (Contact Restored)</option>
                <option value="OPTED_OUT">Opted Out (Consent Withdrawn)</option>
              </select>

              <select
                className="form-select"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="ALL">All Training Providers</option>
                {providers.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.organizationName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Table
            columns={followUpColumns}
            data={filteredFollowUps}
            loading={loading}
            emptyText="No follow-up records found matching specified filters."
          />
        </div>
      )}

      {/* TAB 2: ASSISTED TELEPHONY FOLLOW-UP QUEUE (Day 6+ Escalation) */}
      {activeTab === 'ASSISTED_QUEUE' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <IconPhoneCall size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="block text-sm font-semibold mb-1">
                Assisted Telephony Follow-Up Queue (Day 0 → Day 3 → Day 6 Escalation Engine)
              </strong>
              Trainees who did not respond to automated digital links on Day 0 or automated reminders on Day 3 are automatically escalated to this telephony queue for assisted telephone contact by operations officers.
            </div>
          </div>

          <div className="content-card">
            <Table
              columns={assistedColumns}
              data={assistedQueue}
              loading={loading}
              emptyText="No trainees currently pending in the assisted telephony queue."
            />
          </div>
        </div>
      )}

      {/* TAB 3: GOVERNMENT TRACKING QUEUE */}
      {activeTab === 'GOV_QUEUE' && (
        <div className="space-y-6">
          {/* Government Tracking Disclaimer Alert */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <IconShield size={22} className="text-purple-500 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
              <strong className="block text-sm font-semibold mb-1 text-purple-900 dark:text-purple-200">
                Authorized Government Identity-Based Tracking Queue
              </strong>
              This queue aggregates unresolved cases where digital follow-ups and telephone escalations were exhausted without response. 
              Authorized government agencies utilize internal administrative registries to re-establish contact. 
              The application strictly protects citizen privacy: raw Aadhaar numbers are never queried or stored in plaintext.
            </div>
          </div>

          <div className="content-card">
            <div className="filters-bar-grid">
              <div className="search-input-group">
                <IconSearch size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search queue by trainee, masked ID, location, or provider..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-select-group">
                <select
                  className="form-select"
                  value={govStatusFilter}
                  onChange={(e) => setGovStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Queue Statuses</option>
                  <option value="PENDING_GOVERNMENT_ACTION">Pending Government Action</option>
                  <option value="UNDER_GOVERNMENT_TRACKING">Under Active Investigation</option>
                  <option value="RETURNED">Returned / Contact Restored</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>

            <Table
              columns={govColumns}
              data={filteredGovQueue}
              loading={loading}
              emptyText="No unresolved cases currently flagged for government tracking."
            />
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURATION SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="content-card max-w-2xl">
          <div className="border-b border-border pb-4 mb-6">
            <h2 className="text-lg font-bold text-main flex items-center gap-2">
              <IconSliders size={20} className="text-primary" />
              Follow-Up & Escalation Interval Configuration
            </h2>
            <p className="text-xs text-muted mt-1">
              Configure system-wide days intervals for automated follow-up scheduling and non-response escalation triggers.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="form-group">
              <label className="form-label text-sm font-semibold">
                Initial Follow-Up Milestone (Days after Certificate Issuance)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                className="form-input text-sm"
                value={settings.firstFollowUpDays}
                onChange={(e) => setSettings({ ...settings, firstFollowUpDays: e.target.value })}
                required
              />
              <span className="text-xs text-muted mt-1 block">Default: 3 days. Follow-up becomes DUE after this interval.</span>
            </div>

            <div className="form-group">
              <label className="form-label text-sm font-semibold">
                Digital Response Timeout (Days before Phone Call Escalation)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                className="form-input text-sm"
                value={settings.digitalResponseWaitDays}
                onChange={(e) => setSettings({ ...settings, digitalResponseWaitDays: e.target.value })}
                required
              />
              <span className="text-xs text-muted mt-1 block">Default: 3 days. Case automatically transitions to CALL_REQUIRED if no response.</span>
            </div>

            <div className="form-group">
              <label className="form-label text-sm font-semibold">
                Call Attempt Timeout (Days before Government Tracking Escalation)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                className="form-input text-sm"
                value={settings.callResponseWaitDays}
                onChange={(e) => setSettings({ ...settings, callResponseWaitDays: e.target.value })}
                required
              />
              <span className="text-xs text-muted mt-1 block">Default: 3 days. Case automatically transitions to GOVERNMENT_TRACKING_FLAGGED.</span>
            </div>

            <div className="form-group">
              <label className="form-label text-sm font-semibold">
                Public Tracking Link Expiry (Days)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                className="form-input text-sm"
                value={settings.tokenExpiryDays}
                onChange={(e) => setSettings({ ...settings, tokenExpiryDays: e.target.value })}
                required
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button variant="primary" type="submit" loading={savingSettings}>
                Save Interval Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Government Case Modal */}
      {selectedGovRecord && (
        <Modal
          isOpen={!!selectedGovRecord}
          onClose={() => setSelectedGovRecord(null)}
          title="Government Identity Tracking Management"
          subtitle={`Case: ${selectedGovRecord.traineeId?.userId?.name} | ID: ${selectedGovRecord.maskedIdNumber}`}
        >
          <form onSubmit={handleUpdateGovStatus} className="space-y-4">
            <div className="p-3 bg-surface-raised rounded-lg text-xs space-y-1">
              <div>Provider: <strong>{selectedGovRecord.providerId?.organizationName}</strong></div>
              <div>Course: <strong>{selectedGovRecord.enrollmentId?.courseId?.courseName}</strong></div>
              <div>Last Known Location: <strong>{selectedGovRecord.lastKnownLocation || 'N/A'}</strong></div>
              <div>Escalated Date: <strong>{formatDate(selectedGovRecord.escalatedAt)}</strong></div>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Update Government Tracking Status</label>
              <select
                className="form-select text-sm"
                value={govActionStatus}
                onChange={(e) => setGovActionStatus(e.target.value)}
              >
                <option value="PENDING_GOVERNMENT_ACTION">Pending Government Action</option>
                <option value="UNDER_GOVERNMENT_TRACKING">Under Active Government Tracking</option>
                <option value="RETURNED">Mark Trainee Returned (Contact Restored)</option>
                <option value="RESOLVED">Resolved / Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Official Action Note / Log</label>
              <textarea
                className="form-textarea text-sm"
                rows="3"
                placeholder="Enter administrative tracking notes or contact restoration details..."
                value={govActionNote}
                onChange={(e) => setGovActionNote(e.target.value)}
              ></textarea>
            </div>

            {selectedGovRecord.governmentTrackingNotes?.length > 0 && (
              <div className="tracking-notes-history max-h-40 overflow-y-auto p-2 bg-surface-raised rounded-lg text-xs space-y-2">
                <span className="font-bold text-muted block">Previous Official Notes:</span>
                {selectedGovRecord.governmentTrackingNotes.map((n, idx) => (
                  <div key={idx} className="border-b border-border/50 pb-1">
                    <span className="text-muted text-[10px]">{formatDate(n.updatedAt)} ({n.updatedByName})</span>
                    <p className="text-main">{n.note}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions-end mt-4">
              <Button variant="ghost" type="button" onClick={() => setSelectedGovRecord(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Tracking Update
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Communication History Modal */}
      {historyModalFollowUp && (
        <CommunicationHistoryModal
          isOpen={!!historyModalFollowUp}
          onClose={() => setHistoryModalFollowUp(null)}
          followUpId={historyModalFollowUp._id}
          traineeName={historyModalFollowUp.traineeId?.userId?.name}
        />
      )}

      {/* Follow-Up Details Modal */}
      {selectedFollowUp && (
        <Modal
          isOpen={!!selectedFollowUp}
          onClose={() => setSelectedFollowUp(null)}
          title={`${selectedFollowUp.followUpType?.replace('_', '-')} Milestone Details`}
          subtitle={`Trainee: ${selectedFollowUp.traineeId?.userId?.name || 'Trainee'}`}
        >
          <div className="detail-modal-body">
            <div className="meta-info-grid">
              <div>
                <span className="text-xs text-muted">Trainee Name</span>
                <p className="font-semibold text-main">{selectedFollowUp.traineeId?.userId?.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Masked ID Reference</span>
                <p className="font-semibold font-mono">{selectedFollowUp.traineeId?.maskedAadhaar || 'XXXX-XXXX-1234'}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Training Provider</span>
                <p className="font-semibold">{selectedFollowUp.providerId?.organizationName}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Course Program</span>
                <p className="font-semibold">{selectedFollowUp.enrollmentId?.courseId?.courseName}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Scheduled Date</span>
                <p className="font-semibold">{formatDate(selectedFollowUp.scheduledDate)}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Current Status</span>
                <div className="mt-1">{renderStatusBadge(selectedFollowUp.status)}</div>
              </div>
            </div>

            {selectedFollowUp.followUpToken && (
              <div className="p-3 bg-surface-raised rounded-lg border border-border mt-4">
                <span className="text-xs text-muted font-bold block mb-1">Public Secure Tracking Link:</span>
                <div className="text-xs font-mono text-primary break-all">
                  {window.location.origin}/tracking/{selectedFollowUp.followUpToken}
                </div>
              </div>
            )}

            <div className="modal-actions-end mt-6">
              <Button variant="primary" onClick={() => setSelectedFollowUp(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assisted Telephony Call Logging Modal */}
      {callLogTarget && (
        <CallLogModal
          followUp={callLogTarget}
          onClose={() => setCallLogTarget(null)}
          onLogged={() => {
            fetchData();
            setToast({ message: '✓ Telephony call log successfully recorded.', type: 'success' });
          }}
        />
      )}
    </div>
  );
};

export default AdminFollowUps;
