import React, { useState, useEffect } from 'react';
import { fundingSchemeService, courseService } from '../../services/api';
import { IconDollarSign, IconPlus, IconBrain, IconBuilding, IconCheckCircle, IconAlertCircle, IconEye } from '../../components/common/Icons';
import { ConfidenceBadge } from '../../components/common/ConfidenceBadge';
import { AIInsightCard } from '../../components/common/AIInsightCard';

export const AdminFundingSchemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [eligibleProviders, setEligibleProviders] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [adminReasons, setAdminReasons] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    schemeName: '',
    description: '',
    courseId: '',
    budget: '',
    district: '',
    startDate: '',
    endDate: '',
    targetTrainees: '',
  });

  useEffect(() => {
    fetchSchemes();
    fetchCourses();
  }, []);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const res = await fundingSchemeService.getAll();
      setSchemes(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch funding schemes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await courseService.getAll();
      setCourses(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await fundingSchemeService.create({
        ...formData,
        budget: Number(formData.budget),
        targetTrainees: Number(formData.targetTrainees) || 0,
      });
      setShowCreateModal(false);
      setFormData({
        schemeName: '',
        description: '',
        courseId: '',
        budget: '',
        district: '',
        startDate: '',
        endDate: '',
        targetTrainees: '',
      });
      fetchSchemes();
    } catch (err) {
      alert(err.message || 'Failed to create scheme');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenManageModal = async (scheme) => {
    try {
      setSelectedScheme(scheme);
      setAiAnalysis(null);
      const res = await fundingSchemeService.getEligibleProviders(scheme._id);
      const provs = res.data?.data || [];
      setEligibleProviders(provs);

      // Pre-fill existing allocations if any
      const initAlloc = {};
      const initReasons = {};
      scheme.providerAssignments?.forEach((a) => {
        const pid = (a.providerId._id || a.providerId).toString();
        initAlloc[pid] = a.allocatedBudget || 0;
        initReasons[pid] = a.adminReason || '';
      });
      setAllocations(initAlloc);
      setAdminReasons(initReasons);
    } catch (err) {
      console.error('Failed to load eligible providers:', err);
    }
  };

  const handleFetchAIFunding = async () => {
    if (!selectedScheme) return;
    try {
      setAiLoading(true);
      const res = await fundingSchemeService.getAIAnalysis(selectedScheme._id);
      if (res.data?.success && res.data?.data?.analysis) {
        setAiAnalysis(res.data.data.analysis);
      }
    } catch (err) {
      console.error('Failed to get AI funding recommendations:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAllocations = async () => {
    if (!selectedScheme) return;

    const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (totalAllocated > selectedScheme.budget) {
      alert(`Error: Total allocated budget (₹${totalAllocated.toLocaleString()}) exceeds scheme budget (₹${selectedScheme.budget.toLocaleString()}).`);
      return;
    }

    try {
      setSaving(true);
      const assignments = Object.entries(allocations)
        .filter(([_, amount]) => Number(amount) > 0)
        .map(([providerId, allocatedBudget]) => {
          const rec = aiAnalysis?.providerRecommendations?.find((r) =>
            eligibleProviders.find((p) => p.providerId === providerId)?.name === r.provider
          );
          return {
            providerId,
            allocatedBudget: Number(allocatedBudget),
            aiRecommended: rec?.recommended || false,
            adminDecision: 'APPROVED',
            adminReason: adminReasons[providerId] || 'Allocated based on performance review',
          };
        });

      await fundingSchemeService.assignProviders(selectedScheme._id, { assignments });
      alert('Provider funding allocations saved successfully.');
      setSelectedScheme(null);
      fetchSchemes();
    } catch (err) {
      alert(err.message || 'Failed to save allocations');
    } finally {
      setSaving(false);
    }
  };

  const totalAllocatedInModal = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remainingBudgetInModal = (selectedScheme?.budget || 0) - totalAllocatedInModal;

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconDollarSign size={26} color="#10b981" /> Scheme Funding & Grant Allocation
          </h1>
          <p className="page-subtitle">
            Admin-governed scheme funding allocation with AI decision-support and mathematical budget integrity
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <IconPlus size={16} /> Create New Funding Scheme
        </button>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading funding schemes...
        </div>
      ) : schemes.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No funding schemes created yet. Click "Create New Funding Scheme" above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemes.map((s) => {
            const allocated = s.providerAssignments?.reduce((sum, a) => sum + (a.allocatedBudget || 0), 0) || 0;
            const remaining = s.budget - allocated;
            const percentAllocated = s.budget > 0 ? Math.round((allocated / s.budget) * 100) : 0;

            return (
              <div key={s._id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span className="badge badge-info">{s.courseId?.courseName || 'General'}</span>
                    <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : s.status === 'DRAFT' ? 'badge-warning' : 'badge-secondary'}`}>
                      {s.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {s.schemeName}
                  </h3>
                  {s.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                      {s.description}
                    </p>
                  )}

                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '6px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Grant Budget:</span>
                      <strong style={{ color: '#10b981' }}>₹{s.budget?.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Allocated to Providers:</span>
                      <strong>₹{allocated.toLocaleString()} ({percentAllocated}%)</strong>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentAllocated}%`, height: '100%', backgroundColor: percentAllocated > 90 ? '#f59e0b' : '#10b981' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <span>Target Trainees: <strong>{s.targetTrainees || '—'}</strong></span>
                    <span>Assigned: <strong>{s.providerAssignments?.length || 0} providers</strong></span>
                  </div>
                </div>

                <button className="btn btn-secondary btn-block" onClick={() => handleOpenManageModal(s)}>
                  <IconEye size={16} /> Manage & Allocate Grants
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Scheme Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Create Scheme Grant</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateScheme}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Scheme Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. PMKVY 4.0 Advanced Tech Grant 2026"
                    required
                    value={formData.schemeName}
                    onChange={(e) => setFormData({ ...formData, schemeName: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Target Course *</label>
                  <select
                    className="form-control"
                    required
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  >
                    <option value="">Select course for scheme...</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.courseName} ({c.category || 'General'})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Total Grant Budget (₹) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 5000000"
                      required
                      min="1"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Trainees</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 200"
                      value={formData.targetTrainees}
                      onChange={(e) => setFormData({ ...formData, targetTrainees: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Objectives</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Brief description of grant eligibility and skilling targets..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating Scheme...' : 'Create Funding Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage & Allocate Modal */}
      {selectedScheme && (
        <div className="modal-backdrop" onClick={() => setSelectedScheme(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedScheme.schemeName} — Grant Allocation</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total Budget: <strong>₹{selectedScheme.budget?.toLocaleString()}</strong>
                </span>
              </div>
              <button className="btn-close" onClick={() => setSelectedScheme(null)}>×</button>
            </div>

            <div className="modal-body">
              {/* Budget Allocation Summary Bar */}
              <div style={{ padding: '1rem', backgroundColor: remainingBudgetInModal < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: `1px solid ${remainingBudgetInModal < 0 ? '#ef4444' : '#10b981'}`, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ALLOCATION STATUS:</span>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: remainingBudgetInModal < 0 ? '#ef4444' : '#10b981' }}>
                    ₹{totalAllocatedInModal.toLocaleString()} allocated of ₹{selectedScheme.budget?.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>REMAINING:</span>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem', color: remainingBudgetInModal < 0 ? '#ef4444' : '#10b981' }}>
                    {remainingBudgetInModal < 0 ? `Over-allocated by ₹${Math.abs(remainingBudgetInModal).toLocaleString()}` : `₹${remainingBudgetInModal.toLocaleString()}`}
                  </div>
                </div>
              </div>

              {/* AI Recommendations Action */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                  Eligible Providers Offering Course
                </h4>
                <button className="btn btn-primary btn-sm" onClick={handleFetchAIFunding} disabled={aiLoading}>
                  <IconBrain size={16} />
                  {aiLoading ? 'Grok Synthesizing Recommendations...' : 'Get AI Allocation Insights'}
                </button>
              </div>

              {/* AI Insights Card if generated */}
              {aiAnalysis && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <AIInsightCard
                    title="Grok Decision Support: Recommended Provider Grants"
                    data={aiAnalysis}
                    onRefresh={handleFetchAIFunding}
                  />
                </div>
              )}

              {/* Provider Allocation Table */}
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Score</th>
                      <th>Confidence</th>
                      <th>Employment Rate</th>
                      <th>Allocate Grant (₹)</th>
                      <th>Admin Decision Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleProviders.map((p) => {
                      const isAiRec = aiAnalysis?.providerRecommendations?.find((r) => r.provider === p.name)?.recommended;

                      return (
                        <tr key={p.providerId}>
                          <td>
                            <div style={{ fontWeight: '700' }}>{p.name}</div>
                            {isAiRec && (
                              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <IconCheckCircle size={12} /> AI Recommended
                              </span>
                            )}
                          </td>
                          <td>
                            <strong>{p.metrics.overallScore || '—'}</strong>/100
                          </td>
                          <td>
                            <ConfidenceBadge confidence={p.confidence} sampleSize={p.sampleSize} />
                          </td>
                          <td>{p.metrics.employment != null ? `${p.metrics.employment}%` : '—'}</td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              placeholder="₹0"
                              min="0"
                              max={selectedScheme.budget}
                              value={allocations[p.providerId] || ''}
                              onChange={(e) => setAllocations({ ...allocations, [p.providerId]: e.target.value })}
                              style={{ width: '130px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Reason for allocation..."
                              value={adminReasons[p.providerId] || ''}
                              onChange={(e) => setAdminReasons({ ...adminReasons, [p.providerId]: e.target.value })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedScheme(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAllocations}
                disabled={saving || remainingBudgetInModal < 0}
              >
                {saving ? 'Saving Allocations...' : 'Save Funding Allocations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
