import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import {
  IconBrain,
  IconShield,
  IconCheckCircle,
  IconAlertCircle,
  IconTrendingUp,
  IconBuilding,
  IconBookOpen,
  IconMapPin,
  IconTarget,
} from '../../components/common/Icons';

export const PolicyInsights = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [emptyInfo, setEmptyInfo] = useState('');

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getPolicyRecommendations();
      const list = res.data?.data || [];
      setRecommendations(list);
      if (res.data?.message) {
        setEmptyInfo(res.data.message);
      }
      if (list.length > 0 && !selectedPolicy) {
        setSelectedPolicy(list[0]);
      }
    } catch (err) {
      console.error('Failed to load policy insights:', err);
      setError(err.message || 'Failed to retrieve policy recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await analyticsService.updatePolicyStatus(id, { status: newStatus });
      setRecommendations((prev) =>
        prev.map((p) => (p._id === id ? { ...p, status: newStatus } : p))
      );
      if (selectedPolicy?._id === id) {
        setSelectedPolicy((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.message || 'Failed to update policy status');
    }
  };

  const filtered =
    filterCategory === 'ALL'
      ? recommendations
      : recommendations.filter((p) => p.category === filterCategory || p.recommendationType === filterCategory);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-6">
        <div>
          <span className="section-eyebrow">GOVERNMENT STRATEGY & RESOURCE ALLOCATION</span>
          <h1 className="page-title">Policy Intelligence & Evidence Chains</h1>
          <p className="page-subtitle">
            Auditable, data-backed policy recommendations derived from longitudinal trainee outcomes, wage growth trajectories, and market skill demands.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error mb-6">
          <IconAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Category Filter Pills */}
      {recommendations.length > 0 && (
        <div className="filter-tabs-bar mb-6">
          {['ALL', 'SCALE_PROVIDER', 'FUND_REMEDIAL', 'UPDATE_CURRICULUM', 'REDIRECT_RESOURCES', 'INVESTIGATE_OUTCOMES'].map(
            (cat) => (
              <button
                key={cat}
                className={`filter-tab ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-state-card">
          <span className="spinner-lg"></span>
          <p>Compiling policy evidence chains from longitudinal database...</p>
        </div>
      ) : recommendations.length === 0 ? (
        /* Empty State enforcing Guardrail 9: Insufficient evidence informative state */
        <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <IconBrain size={52} className="text-muted" style={{ margin: '0 auto 1.25rem' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Insufficient Evidence for Policy Recommendation Synthesis
          </h3>
          <p style={{ maxWidth: '620px', margin: '0 auto 1.5rem', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {emptyInfo ||
              'Policy intelligence and resource recommendations require verified baseline evidence across at least 10 completed longitudinal outcome cycles. As cohorts progress through M3, M6, and M12 tracking milestones, auditable evidence chains will be synthesized deterministically.'}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <IconShield size={14} className="text-primary" />
            <span>Auditable Evidence Threshold: 10+ Verified Longitudinal Records</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommendations List Column */}
          <div className="recommendations-list-col">
            <h3 className="section-title-sm mb-3">
              Strategic Interventions ({filtered.length})
            </h3>

            <div className="policy-cards-stack">
              {filtered.map((item) => (
                <div
                  key={item._id}
                  className={`policy-card-item ${selectedPolicy?._id === item._id ? 'selected' : ''}`}
                  onClick={() => setSelectedPolicy(item)}
                >
                  <div className="policy-item-header">
                    <span className={`priority-badge priority-${(item.priority || 'medium').toLowerCase()}`}>
                      {item.priority || 'MEDIUM'} PRIORITY
                    </span>
                    <span className="status-pill-subtle">{item.status || 'GENERATED'}</span>
                  </div>
                  <h4 className="policy-item-title">{item.title}</h4>
                  <p className="policy-item-snippet">{item.expectedImpact || item.impactStatement}</p>
                  <div className="policy-item-footer">
                    <span className="text-secondary text-xs">
                      Target: <strong>{item.targetEntity?.entityName || item.category || 'System'}</strong>
                    </span>
                    <span className="text-primary text-xs font-semibold">View Evidence &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Evidence Chain Column */}
          <div className="lg:col-span-2">
            {selectedPolicy ? (
              <div className="card policy-detail-card">
                <div className="card-header border-b">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`priority-badge priority-${(selectedPolicy.priority || 'medium').toLowerCase()}`}>
                        {selectedPolicy.priority}
                      </span>
                      <span className="badge badge-light">
                        {selectedPolicy.recommendationType || selectedPolicy.category}
                      </span>
                      {selectedPolicy.targetEntity && (
                        <span className="badge badge-secondary font-mono">
                          {selectedPolicy.targetEntity.entityType}: {selectedPolicy.targetEntity.entityName}
                        </span>
                      )}
                    </div>
                    <h2 className="card-title text-xl">{selectedPolicy.title}</h2>
                  </div>

                  {/* Status Dropdown */}
                  <div className="status-action-wrap">
                    <select
                      className="form-control form-control-sm"
                      value={selectedPolicy.status || 'GENERATED'}
                      onChange={(e) => handleStatusChange(selectedPolicy._id, e.target.value)}
                    >
                      <option value="GENERATED">Status: Generated</option>
                      <option value="UNDER_REVIEW">Status: Under Directorate Review</option>
                      <option value="APPROVED">Status: Approved by Directorate</option>
                      <option value="IMPLEMENTED">Status: Implemented</option>
                      <option value="DISMISSED">Status: Dismissed</option>
                    </select>
                  </div>
                </div>

                <div className="card-body">
                  {/* Strategic Impact Overview */}
                  <div className="policy-section mb-6">
                    <h4 className="policy-sec-heading">Projected Strategic Impact</h4>
                    <p className="impact-text">{selectedPolicy.expectedImpact || selectedPolicy.impactStatement}</p>
                    {selectedPolicy.projectedRoi && (
                      <div className="roi-stat-box mt-3 p-3 bg-light rounded border">
                        <span className="text-xs text-secondary font-bold uppercase">Estimated Yield / ROI</span>
                        <div className="text-lg font-bold text-forest">{selectedPolicy.projectedRoi}</div>
                      </div>
                    )}
                  </div>

                  {/* Auditable Evidence Chain */}
                  <div className="policy-section mb-6">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h4 className="policy-sec-heading m-0">Auditable Evidence Chain</h4>
                      <span className="evidence-audit-badge">
                        <IconShield size={13} /> Verifiable Telemetry
                      </span>
                    </div>

                    {!selectedPolicy.evidenceChain || selectedPolicy.evidenceChain.length === 0 ? (
                      <p className="text-sm text-muted">Evidence telemetry is being compiled from active operational records.</p>
                    ) : (
                      <div className="evidence-timeline">
                        {selectedPolicy.evidenceChain.map((ev, i) => (
                          <div key={i} className="evidence-node">
                            <div className="evidence-marker">
                              <span className="marker-num">{i + 1}</span>
                            </div>
                            <div className="evidence-content">
                              <h5 className="evidence-title">{ev.metricName || ev.step}</h5>
                              <p className="evidence-detail">{ev.evidenceSummary || ev.detail}</p>
                              {(ev.currentValue !== undefined || ev.benchmarkValue !== undefined) && (
                                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', marginTop: '6px' }}>
                                  <span>Current: <strong>{String(ev.currentValue)}</strong></span>
                                  <span>Benchmark: <strong>{String(ev.benchmarkValue)}</strong></span>
                                  {ev.status && <span className="badge badge-light">{ev.status}</span>}
                                </div>
                              )}
                              {ev.source && (
                                <span className="evidence-source">
                                  <strong>Data Source:</strong> {ev.source}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recommended Action Plan */}
                  <div className="policy-section">
                    <h4 className="policy-sec-heading">Recommended Governance Action</h4>
                    <div className="action-step-card p-3 rounded bg-surface border">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <IconTarget size={16} className="text-primary" />
                        <span className="font-semibold text-primary">Directorate Implementation Directive</span>
                      </div>
                      <p className="text-sm text-secondary m-0">
                        {selectedPolicy.recommendedAction ||
                          'Enact resource prioritization to support verified high-outcome pathways.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-placeholder-card">
                <IconBrain size={32} className="text-muted mb-2" />
                <p>Select a strategic recommendation from the left panel to inspect its auditable evidence chain.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyInsights;
