import React, { useState, useEffect, useMemo } from 'react';
import { followUpService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Toast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { RecordCallModal } from '../../components/provider/RecordCallModal';
import { CommunicationHistoryModal } from '../../components/common/CommunicationHistoryModal';
import {
  IconActivity,
  IconSearch,
  IconRefresh,
  IconClock,
  IconCheckSquare,
  IconCalendar,
  IconEye,
  IconWhatsApp,
  IconMail,
  IconPhoneCall,
  IconFlag,
  IconUserX,
  IconHistory,
  IconRotateCcw,
  IconCheckCircle,
  IconShield,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderFollowUps = () => {
  const [followUps, setFollowUps] = useState([]);
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
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [callModalFollowUp, setCallModalFollowUp] = useState(null);
  const [historyModalFollowUp, setHistoryModalFollowUp] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fRes, sRes] = await Promise.all([
        followUpService.getAll(),
        followUpService.getStats(),
      ]);

      if (fRes.data.success) setFollowUps(fRes.data.data);
      if (sRes.data.success) setStats(sRes.data.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load cohort follow-ups', type: 'error' });
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

  const handleSendDigital = async (followUp, channel) => {
    try {
      const res = await followUpService.sendDigital(followUp._id, channel);
      if (res.data.success) {
        setToast({
          message: res.data.message || `✓ ${channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'} message prepared successfully.`,
          type: 'success',
        });

        // Open in new tab/window for WhatsApp or trigger mailto
        if (channel === 'WHATSAPP' && res.data.data?.whatsappUrl) {
          window.open(res.data.data.whatsappUrl, '_blank', 'noopener,noreferrer');
        } else if (channel === 'EMAIL' && res.data.data?.mailtoUrl) {
          window.location.href = res.data.data.mailtoUrl;
        }

        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to prepare digital contact', type: 'error' });
    }
  };

  const handleMarkReturned = async (followUp) => {
    const notes = window.prompt(`Mark contact restored for ${followUp.traineeId?.userId?.name || 'Trainee'}. Enter notes (optional):`);
    if (notes === null) return; // User cancelled prompt

    try {
      const res = await followUpService.markReturned(followUp._id, notes);
      if (res.data.success) {
        setToast({ message: '✓ Trainee marked as returned. Longitudinal tracking resumed.', type: 'success' });
        fetchData();
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to mark trainee returned', type: 'error' });
    }
  };

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((f) => {
      let matchesStatus = true;
      if (statusFilter === 'DUE') {
        matchesStatus = f.status === 'DUE' || f.status === 'READY';
      } else if (statusFilter === 'WAITING_FOR_RESPONSE') {
        matchesStatus = f.status === 'WAITING_FOR_RESPONSE' || f.status === 'DIGITAL_CONTACTED';
      } else if (statusFilter === 'RESPONDED') {
        matchesStatus = f.status === 'RESPONDED' || f.status === 'COMPLETED';
      } else if (statusFilter === 'CALL_REQUIRED') {
        matchesStatus = f.status === 'CALL_REQUIRED';
      } else if (statusFilter === 'CALL_ATTEMPTED') {
        matchesStatus = f.status === 'CALL_ATTEMPTED' || f.status === 'WAITING_AFTER_CALL';
      } else if (statusFilter === 'GOVERNMENT_TRACKING_FLAGGED') {
        matchesStatus = f.status === 'GOVERNMENT_TRACKING_FLAGGED';
      } else if (statusFilter === 'OPTED_OUT') {
        matchesStatus = f.status === 'OPTED_OUT';
      } else if (statusFilter === 'RETURNED') {
        matchesStatus = f.status === 'RETURNED';
      } else if (statusFilter !== 'ALL') {
        matchesStatus = f.status === statusFilter;
      }

      const matchesType = typeFilter === 'ALL' || f.followUpType === typeFilter;

      const q = search.toLowerCase();
      const traineeName = f.traineeId?.userId?.name?.toLowerCase() || '';
      const courseName = f.enrollmentId?.courseId?.courseName?.toLowerCase() || '';
      const batchName = f.enrollmentId?.batchId?.batchName?.toLowerCase() || '';
      const phone = f.traineeId?.phone || '';
      const maskedId = f.traineeId?.maskedAadhaar?.toLowerCase() || '';

      const matchesSearch =
        !search ||
        traineeName.includes(q) ||
        courseName.includes(q) ||
        batchName.includes(q) ||
        phone.includes(q) ||
        maskedId.includes(q);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [followUps, search, statusFilter, typeFilter]);

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

  const columns = [
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
      title: 'Next Action & Deadline',
      render: (_, row) => {
        if (row.status === 'DUE' || row.status === 'READY') {
          return <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Send WhatsApp / Email</span>;
        }
        if (row.status === 'WAITING_FOR_RESPONSE' || row.status === 'DIGITAL_CONTACTED') {
          return (
            <span className="text-xs text-muted">
              Response due by: {formatDate(row.digitalResponseDeadline)}
            </span>
          );
        }
        if (row.status === 'CALL_REQUIRED') {
          return <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">Call Trainee ASAP</span>;
        }
        if (row.status === 'WAITING_AFTER_CALL' || row.status === 'CALL_ATTEMPTED') {
          return (
            <span className="text-xs text-muted">
              Call timeout: {formatDate(row.callResponseDeadline)}
            </span>
          );
        }
        if (row.status === 'GOVERNMENT_TRACKING_FLAGGED') {
          return <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">In Gov Queue</span>;
        }
        if (row.status === 'RESPONDED' || row.status === 'COMPLETED') {
          return <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Outcome Recorded</span>;
        }
        if (row.status === 'OPTED_OUT') {
          return <span className="text-xs text-muted">Consent Withdrawn</span>;
        }
        return <span className="text-xs text-muted">Awaiting milestone</span>;
      },
    },
    {
      title: 'Actions',
      render: (_, row) => {
        const isOptedOut = row.status === 'OPTED_OUT' || row.trackingConsent === 'WITHDRAWN';
        const isCompleted = row.status === 'RESPONDED' || row.status === 'COMPLETED';

        return (
          <div className="table-actions-cell flex items-center gap-1.5">
            {/* 1. WhatsApp Button */}
            {!isOptedOut && !isCompleted && (
              <Button
                variant="outline"
                size="sm"
                icon={IconWhatsApp}
                onClick={() => handleSendDigital(row, 'WHATSAPP')}
                title="Send WhatsApp Follow-Up"
                className="text-emerald-600 hover:text-emerald-700 hover:border-emerald-500"
              >
                WhatsApp
              </Button>
            )}

            {/* 2. Email Button */}
            {!isOptedOut && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                icon={IconMail}
                onClick={() => handleSendDigital(row, 'EMAIL')}
                title="Send Email Follow-Up"
              >
                Email
              </Button>
            )}

            {/* 3. Record Call Button */}
            {!isOptedOut && !isCompleted && (
              <Button
                variant="outline"
                size="sm"
                icon={IconPhoneCall}
                onClick={() => setCallModalFollowUp(row)}
                title="Record Call Attempt"
                className={row.status === 'CALL_REQUIRED' ? 'border-amber-500 text-amber-600 font-bold' : ''}
              >
                Call
              </Button>
            )}

            {/* 4. Mark Returned for Government Flagged */}
            {row.status === 'GOVERNMENT_TRACKING_FLAGGED' && (
              <Button
                variant="success"
                size="sm"
                icon={IconRotateCcw}
                onClick={() => handleMarkReturned(row)}
                title="Mark Trainee Returned"
              >
                Returned
              </Button>
            )}

            {/* 5. Communication History */}
            <Button
              variant="ghost"
              size="sm"
              icon={IconHistory}
              onClick={() => setHistoryModalFollowUp(row)}
              title="View History Timeline"
            >
              History
            </Button>

            {/* 6. Details */}
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
        );
      },
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
          <h1 className="page-title">Outcome Follow-Up Center</h1>
          <p className="page-subtitle">
            Execute low-burden digital follow-ups, record escalated calls, and manage post-training cohort outcomes
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

      {/* KPI Stats Cards */}
      <div className="stats-grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard
          title="Due Today"
          value={stats.due}
          icon={IconCheckSquare}
          description="Ready for contact"
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
          title="Call Required"
          value={stats.callRequired}
          icon={IconPhoneCall}
          description="3-day escalation"
          colorScheme="violet"
          loading={loading}
        />
        <StatCard
          title="Gov Flagged"
          value={stats.governmentFlagged}
          icon={IconFlag}
          description="Unresolved queue"
          colorScheme="cyan"
          loading={loading}
        />
        <StatCard
          title="Responded"
          value={stats.responded}
          icon={IconCheckCircle}
          description="Outcomes collected"
          colorScheme="emerald"
          loading={loading}
        />
        <StatCard
          title="Returned"
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
          description="Across cohorts"
          colorScheme="primary"
          loading={loading}
        />
      </div>

      {/* Table & Filters */}
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
              <option value="DUE">DUE TODAY (Ready to Send)</option>
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Milestone Intervals</option>
              <option value="INITIAL_3_DAY">3-Day Initial</option>
              <option value="30_DAY">30-Day</option>
              <option value="90_DAY">90-Day</option>
              <option value="180_DAY">180-Day</option>
              <option value="365_DAY">365-Day / 1-Year</option>
            </select>
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredFollowUps}
          loading={loading}
          emptyText="No follow-up records found matching your filters."
        />
      </div>

      {/* Record Call Modal */}
      {callModalFollowUp && (
        <RecordCallModal
          isOpen={!!callModalFollowUp}
          onClose={() => setCallModalFollowUp(null)}
          followUp={callModalFollowUp}
          onCallRecorded={() => {
            setToast({ message: '✓ Call attempt recorded successfully.', type: 'success' });
            fetchData();
          }}
        />
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
                <span className="text-xs text-muted">Phone Number</span>
                <p className="font-semibold">{selectedFollowUp.traineeId?.phone || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Course Program</span>
                <p className="font-semibold">{selectedFollowUp.enrollmentId?.courseId?.courseName}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Cohort Batch</span>
                <p className="font-semibold">{selectedFollowUp.enrollmentId?.batchId?.batchName}</p>
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

            {selectedFollowUp.lastCommunicationNote && (
              <div className="p-3 bg-surface-raised rounded-lg border border-border mt-3 text-xs">
                <span className="font-bold text-muted block mb-1">Latest Communication Note:</span>
                <p className="text-main">{selectedFollowUp.lastCommunicationNote}</p>
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
    </div>
  );
};

export default ProviderFollowUps;
