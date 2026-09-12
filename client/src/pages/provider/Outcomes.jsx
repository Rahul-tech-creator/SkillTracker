import React, { useState, useEffect, useMemo } from 'react';
import { outcomeService } from '../../services/api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Toast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import {
  IconTrendingUp,
  IconBriefcase,
  IconSearch,
  IconRefresh,
  IconStar,
  IconEye,
  IconUsers,
  IconAward,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const ProviderOutcomes = () => {
  const [outcomes, setOutcomes] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    employed: 0,
    selfEmployed: 0,
    apprentice: 0,
    unemployed: 0,
    studying: 0,
    other: 0,
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [situationFilter, setSituationFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [oRes, sRes] = await Promise.all([
        outcomeService.getAll(),
        outcomeService.getStats(),
      ]);

      if (oRes.data.success) setOutcomes(oRes.data.data);
      if (sRes.data.success) setStats(sRes.data.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load graduate outcomes', type: 'error' });
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

  const filteredOutcomes = useMemo(() => {
    return outcomes.filter((o) => {
      const matchesSituation = situationFilter === 'ALL' || o.situation === situationFilter;
      const matchesType = typeFilter === 'ALL' || o.followUpType === typeFilter;

      const q = search.toLowerCase();
      const traineeName = o.traineeId?.userId?.name?.toLowerCase() || '';
      const employerName = o.employmentData?.employerName?.toLowerCase() || '';
      const courseName = o.enrollmentId?.courseId?.courseName?.toLowerCase() || '';

      const matchesSearch =
        !search ||
        traineeName.includes(q) ||
        employerName.includes(q) ||
        courseName.includes(q);

      return matchesSituation && matchesType && matchesSearch;
    });
  }, [outcomes, search, situationFilter, typeFilter]);

  const getSituationBadge = (situation) => {
    switch (situation) {
      case 'EMPLOYED':
        return <Badge status="success" text="EMPLOYED" />;
      case 'SELF_EMPLOYED':
        return <Badge status="info" text="SELF-EMPLOYED" />;
      case 'APPRENTICE':
        return <Badge status="warning" text="APPRENTICE" />;
      case 'UNEMPLOYED':
        return <Badge status="neutral" text="SEEKING WORK" />;
      default:
        return <Badge status="neutral" text={situation} />;
    }
  };

  const columns = [
    {
      title: 'Trainee Graduate',
      dataIndex: 'traineeId',
      render: (val) => (
        <div>
          <div className="font-semibold text-main">{val?.userId?.name || '—'}</div>
          <div className="text-xs text-muted">@{val?.userId?.username}</div>
        </div>
      ),
    },
    {
      title: 'Milestone',
      dataIndex: 'followUpType',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {val?.replace('_', '-')}
        </span>
      ),
    },
    {
      title: 'Current Situation',
      dataIndex: 'situation',
      render: (val) => getSituationBadge(val),
    },
    {
      title: 'Career Summary',
      render: (_, row) => {
        if (row.situation === 'EMPLOYED' && row.employmentData) {
          return (
            <div>
              <div className="font-medium text-sm">{row.employmentData.jobRole || 'Employee'}</div>
              <div className="text-xs text-muted">
                {row.employmentData.employerName} ({row.employmentData.monthlySalaryRange || '—'})
              </div>
            </div>
          );
        }
        if (row.situation === 'SELF_EMPLOYED' && row.selfEmploymentData) {
          return (
            <div>
              <div className="font-medium text-sm">{row.selfEmploymentData.businessType || 'Venture'}</div>
              <div className="text-xs text-muted">Income: {row.selfEmploymentData.monthlyIncomeRange || '—'}</div>
            </div>
          );
        }
        if (row.situation === 'APPRENTICE' && row.apprenticeshipData) {
          return (
            <div>
              <div className="font-medium text-sm">{row.apprenticeshipData.role || 'Apprentice'}</div>
              <div className="text-xs text-muted">Host: {row.apprenticeshipData.organizationName}</div>
            </div>
          );
        }
        if (row.situation === 'UNEMPLOYED' && row.unemploymentData) {
          return (
            <div className="text-xs text-muted">
              Reason: {row.unemploymentData.primaryReason || 'Looking for suitable job'}
            </div>
          );
        }
        return <span className="text-muted text-xs">—</span>;
      },
    },
    {
      title: 'Observed Date',
      dataIndex: 'observedAt',
      render: (val) => <span className="text-sm">{formatDate(val)}</span>,
    },
    {
      title: 'Usefulness',
      dataIndex: 'relevanceRating',
      render: (val) => (
        <div className="flex items-center gap-1 text-sm font-semibold">
          <IconStar size={14} className="text-warning fill-warning" />
          <span>{val || 5} / 5</span>
        </div>
      ),
    },
    {
      title: 'Actions',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={IconEye}
          onClick={() => setSelectedOutcome(row)}
        >
          View Full
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
          <h1 className="page-title">Graduate Outcomes & Placement Directory</h1>
          <p className="page-subtitle">
            Longitudinal post-training career records and satisfaction ratings reported by your graduates
          </p>
        </div>

        <div className="header-actions">
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

      {/* Metrics */}
      <div className="stats-grid">
        <StatCard
          title="Employed Graduates"
          value={stats.employed}
          icon={IconBriefcase}
          description="In workforce"
          colorScheme="emerald"
          loading={loading}
        />
        <StatCard
          title="Self-Employed"
          value={stats.selfEmployed}
          icon={IconTrendingUp}
          description="Freelancers & ventures"
          colorScheme="cyan"
          loading={loading}
        />
        <StatCard
          title="Apprentices"
          value={stats.apprentice}
          icon={IconAward}
          description="Internships & apprenticeships"
          colorScheme="violet"
          loading={loading}
        />
        <StatCard
          title="Seeking Work"
          value={stats.unemployed}
          icon={IconUsers}
          description="Need placement support"
          colorScheme="warning"
          loading={loading}
        />
        <StatCard
          title="Avg Training Usefulness"
          value={`${stats.avgRating || 0} / 5`}
          icon={IconStar}
          description="Graduate rating"
          colorScheme="primary"
          loading={loading}
        />
      </div>

      {/* Filter bar */}
      <div className="content-card">
        <div className="filters-bar-grid">
          <div className="search-input-group">
            <IconSearch size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by trainee or employer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-select-group">
            <select
              className="form-select"
              value={situationFilter}
              onChange={(e) => setSituationFilter(e.target.value)}
            >
              <option value="ALL">All Situations</option>
              <option value="EMPLOYED">Employed</option>
              <option value="SELF_EMPLOYED">Self-Employed</option>
              <option value="APPRENTICE">Apprentice</option>
              <option value="UNEMPLOYED">Seeking Work</option>
            </select>

            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Milestones</option>
              <option value="30_DAY">30-Day</option>
              <option value="90_DAY">90-Day</option>
              <option value="180_DAY">180-Day</option>
              <option value="365_DAY">365-Day</option>
            </select>
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredOutcomes}
          loading={loading}
          emptyText="No outcome records submitted by your graduates yet."
        />
      </div>

      {/* Detail Modal */}
      {selectedOutcome && (
        <Modal
          isOpen={!!selectedOutcome}
          onClose={() => setSelectedOutcome(null)}
          title={`${selectedOutcome.followUpType?.replace('_', '-')} Outcome Observation`}
          subtitle={`Trainee: ${selectedOutcome.traineeId?.userId?.name || 'Trainee'}`}
        >
          <div className="detail-modal-body">
            <div className="meta-info-grid">
              <div>
                <span className="text-xs text-muted">Situation</span>
                <div className="mt-1">{getSituationBadge(selectedOutcome.situation)}</div>
              </div>
              <div>
                <span className="text-xs text-muted">Observed Logical Date</span>
                <p className="font-semibold">{formatDate(selectedOutcome.observedAt)}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Training Program</span>
                <p className="font-semibold">{selectedOutcome.enrollmentId?.courseId?.courseName}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Batch Cohort</span>
                <p className="font-semibold">{selectedOutcome.enrollmentId?.batchId?.batchName}</p>
              </div>
            </div>

            {selectedOutcome.situation === 'EMPLOYED' && selectedOutcome.employmentData && (
              <div className="outcome-section-box mt-4">
                <h4 className="font-semibold text-sm mb-2">Employment Details</h4>
                <div className="meta-info-grid">
                  <div>
                    <span className="text-xs text-muted">Employer</span>
                    <p className="font-semibold">{selectedOutcome.employmentData.employerName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Job Role</span>
                    <p className="font-semibold">{selectedOutcome.employmentData.jobRole || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Salary Range</span>
                    <p className="font-semibold">{selectedOutcome.employmentData.monthlySalaryRange || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Related to Training?</span>
                    <p className="font-semibold">{selectedOutcome.employmentData.isRelatedToTraining || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedOutcome.situation === 'SELF_EMPLOYED' && selectedOutcome.selfEmploymentData && (
              <div className="outcome-section-box mt-4">
                <h4 className="font-semibold text-sm mb-2">Self-Employment Details</h4>
                <div className="meta-info-grid">
                  <div>
                    <span className="text-xs text-muted">Business Type</span>
                    <p className="font-semibold">{selectedOutcome.selfEmploymentData.businessType || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Income Range</span>
                    <p className="font-semibold">{selectedOutcome.selfEmploymentData.monthlyIncomeRange || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Related to Training?</span>
                    <p className="font-semibold">{selectedOutcome.selfEmploymentData.isRelatedToTraining || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedOutcome.situation === 'UNEMPLOYED' && selectedOutcome.unemploymentData && (
              <div className="outcome-section-box mt-4">
                <h4 className="font-semibold text-sm mb-2">Skill Gap Assessment</h4>
                <div className="meta-info-grid">
                  <div>
                    <span className="text-xs text-muted">Primary Reason</span>
                    <p className="font-semibold">{selectedOutcome.unemploymentData.primaryReason || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Additional Skills Needed?</span>
                    <p className="font-semibold">{selectedOutcome.unemploymentData.needsAdditionalSkills ? 'Yes' : 'No'}</p>
                  </div>
                  {selectedOutcome.unemploymentData.requestedSkills && (
                    <div className="span-full">
                      <span className="text-xs text-muted">Requested Skills</span>
                      <p className="font-semibold text-primary">{selectedOutcome.unemploymentData.requestedSkills}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="feedback-section-box mt-4">
              <h4 className="font-semibold text-sm mb-2">Graduate Feedback</h4>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xs text-muted">Usefulness:</span>
                <span className="font-bold text-warning">{selectedOutcome.relevanceRating} / 5 Stars</span>
              </div>
              {selectedOutcome.feedback?.whatCouldBeBetter && (
                <div className="mb-2">
                  <span className="text-xs text-muted">Suggested Improvements:</span>
                  <p className="text-sm mt-0.5">{selectedOutcome.feedback.whatCouldBeBetter}</p>
                </div>
              )}
            </div>

            <div className="modal-actions-end mt-6">
              <Button variant="primary" onClick={() => setSelectedOutcome(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProviderOutcomes;
