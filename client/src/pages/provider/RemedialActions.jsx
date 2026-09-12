import React, { useState, useEffect } from 'react';
import { remedialActionService, courseService } from '../../services/api';
import { IconZap, IconPlus, IconCheckCircle, IconEdit, IconTrendingUp } from '../../components/common/Icons';

export const ProviderRemedialActions = () => {
  const [actions, setActions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    courseId: '',
    skillId: '',
    skillName: '',
    severity: 'MEDIUM',
    action: '',
    priority: 'MEDIUM',
    beforeScore: '',
    notes: '',
  });

  // Edit/Update State
  const [editData, setEditData] = useState({
    status: '',
    afterScore: '',
    notes: '',
  });

  useEffect(() => {
    fetchActions();
    fetchCourses();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const res = await remedialActionService.getAll();
      setActions(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load remedial actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await courseService.getAll();
      setCourses(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const handleCreateAction = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await remedialActionService.create({
        ...formData,
        beforeScore: formData.beforeScore ? Number(formData.beforeScore) : null,
      });
      setShowCreateModal(false);
      setFormData({
        courseId: '',
        skillId: '',
        skillName: '',
        severity: 'MEDIUM',
        action: '',
        priority: 'MEDIUM',
        beforeScore: '',
        notes: '',
      });
      fetchActions();
    } catch (err) {
      alert(err.message || 'Failed to create remedial action.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAction = async (e) => {
    e.preventDefault();
    if (!selectedAction) return;

    try {
      setSaving(true);
      await remedialActionService.update(selectedAction._id, {
        status: editData.status,
        afterScore: editData.afterScore ? Number(editData.afterScore) : null,
        notes: editData.notes,
      });
      setSelectedAction(null);
      fetchActions();
    } catch (err) {
      alert(err.message || 'Failed to update remedial action.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCourse = courses.find((c) => c._id === formData.courseId);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconZap size={26} color="#f59e0b" /> Remedial Interventions & Tracking
          </h1>
          <p className="page-subtitle">
            Plan, assign, and track targeted pedagogical interventions to close identified skill gaps with before/after score verification
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <IconPlus size={16} /> Create Remedial Action
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading remedial actions...
        </div>
      ) : actions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No remedial actions planned yet. Create one when a cohort or trainee exhibits a skill gap.
        </div>
      ) : (
        <div className="table-responsive card">
          <table className="table">
            <thead>
              <tr>
                <th>Skill Gap</th>
                <th>Course</th>
                <th>Severity</th>
                <th>Intervention Plan</th>
                <th>Priority</th>
                <th>Before Score</th>
                <th>After Score</th>
                <th>Improvement</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((act) => (
                <tr key={act._id}>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{act.skillName}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{act.courseId?.courseName || 'Course'}</span>
                  </td>
                  <td>
                    <span className={`badge ${act.severity === 'CRITICAL' || act.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                      {act.severity}
                    </span>
                  </td>
                  <td style={{ maxWidth: '280px' }}>
                    <div style={{ fontSize: '0.85rem' }}>{act.action}</div>
                  </td>
                  <td>{act.priority}</td>
                  <td>{act.beforeScore != null ? `${act.beforeScore}%` : '—'}</td>
                  <td>{act.afterScore != null ? `${act.afterScore}%` : '—'}</td>
                  <td>
                    {act.improvement != null ? (
                      <span style={{ fontWeight: '700', color: act.improvement >= 0 ? '#10b981' : '#ef4444' }}>
                        {act.improvement >= 0 ? `+${act.improvement}%` : `${act.improvement}%`}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`badge ${act.status === 'COMPLETED' ? 'badge-success' : act.status === 'IN_PROGRESS' ? 'badge-primary' : 'badge-secondary'}`}>
                      {act.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedAction(act);
                        setEditData({
                          status: act.status,
                          afterScore: act.afterScore || '',
                          notes: act.notes || '',
                        });
                      }}
                    >
                      <IconEdit size={14} /> Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Remedial Action Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Create Remedial Intervention</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAction}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Course *</label>
                  <select
                    className="form-control"
                    required
                    value={formData.courseId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const crs = courses.find((c) => c._id === cid);
                      const firstSkill = crs?.skills?.[0];
                      const sName = typeof firstSkill === 'string' ? firstSkill : firstSkill?.skillName || firstSkill?.name || '';
                      const sId = typeof firstSkill === 'string' ? firstSkill.toLowerCase().replace(/[^a-z0-9]+/g, '_') : firstSkill?.skillId || sName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      setFormData({
                        ...formData,
                        courseId: cid,
                        skillId: sId || '',
                        skillName: sName || '',
                      });
                    }}
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.courseName}</option>
                    ))}
                  </select>
                </div>

                {selectedCourse && (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Target Skill Gap *</label>
                    <select
                      className="form-control"
                      required
                      value={formData.skillId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const skl = (selectedCourse.skills || []).find((s) => {
                          const id = typeof s === 'string' ? s.toLowerCase().replace(/[^a-z0-9]+/g, '_') : s?.skillId;
                          return id === sid;
                        });
                        const sName = typeof skl === 'string' ? skl : skl?.skillName || skl?.name || '';
                        setFormData({
                          ...formData,
                          skillId: sid,
                          skillName: sName,
                        });
                      }}
                    >
                      {(selectedCourse.skills || []).map((s, idx) => {
                        const sName = typeof s === 'string' ? s : s?.skillName || s?.name || 'Skill';
                        const sId = typeof s === 'string' ? s.toLowerCase().replace(/[^a-z0-9]+/g, '_') : s?.skillId || `skill_${idx}`;
                        return (
                          <option key={sId || idx} value={sId}>{sName}</option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Severity Level</label>
                    <select
                      className="form-control"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    >
                      <option value="CRITICAL">Critical (&lt;40%)</option>
                      <option value="HIGH">High (40-50%)</option>
                      <option value="MEDIUM">Medium (50-65%)</option>
                      <option value="LOW">Low (65-79%)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Baseline Score (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 35"
                      min="0"
                      max="100"
                      value={formData.beforeScore}
                      onChange={(e) => setFormData({ ...formData, beforeScore: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Intervention Action Plan *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    required
                    placeholder="e.g. 4-hour hands-on lab on asynchronous JavaScript concepts + peer pair programming..."
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Internal Notes / Instructor Assigned</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Instructor: Alex Morgan"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Action Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Update Remedial Action Modal */}
      {selectedAction && (
        <div className="modal-backdrop" onClick={() => setSelectedAction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Update Remedial Action</h3>
              <button className="btn-close" onClick={() => setSelectedAction(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateAction}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                  <div><strong>Skill:</strong> {selectedAction.skillName}</div>
                  <div><strong>Course:</strong> {selectedAction.courseId?.courseName}</div>
                  <div><strong>Baseline Score:</strong> {selectedAction.beforeScore != null ? `${selectedAction.beforeScore}%` : 'N/A'}</div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  >
                    <option value="IDENTIFIED">IDENTIFIED</option>
                    <option value="PLANNED">PLANNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Post-Intervention Score (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 78"
                    min="0"
                    max="100"
                    value={editData.afterScore}
                    onChange={(e) => setEditData({ ...editData, afterScore: e.target.value })}
                  />
                  {selectedAction.beforeScore != null && editData.afterScore && (
                    <span style={{ fontSize: '0.8rem', color: Number(editData.afterScore) - selectedAction.beforeScore >= 0 ? '#10b981' : '#ef4444', marginTop: '4px', display: 'block' }}>
                      Calculated Improvement: {Number(editData.afterScore) - selectedAction.beforeScore >= 0 ? `+${Number(editData.afterScore) - selectedAction.beforeScore}%` : `${Number(editData.afterScore) - selectedAction.beforeScore}%`}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Outcomes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedAction(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Updating...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
