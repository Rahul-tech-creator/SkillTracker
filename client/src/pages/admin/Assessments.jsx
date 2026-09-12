import React, { useState, useEffect } from 'react';
import { assessmentService } from '../../services/api';
import { IconClipboard, IconSearch, IconEye, IconLayers, IconBookOpen, IconUsers } from '../../components/common/Icons';

export const AdminAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAll();
      setAssessments(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = assessments.filter((a) => {
    const term = (search || '').toLowerCase().trim();
    if (!term) return true;
    return (
      (a.title || '').toLowerCase().includes(term) ||
      (a.courseId?.courseName || '').toLowerCase().includes(term) ||
      (a.providerId?.organizationName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconClipboard size={26} color="#3b82f6" /> Course Skill Assessments
          </h1>
          <p className="page-subtitle">
            Overview of all AI-generated and published skill assessments across training providers
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <IconSearch size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by title, course or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Total Assessments: <strong>{filtered.length}</strong>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading assessments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No assessments found. Providers generate assessments from their Course Management workspace.
        </div>
      ) : (
        <div className="table-responsive card">
          <table className="table">
            <thead>
              <tr>
                <th>Assessment Title</th>
                <th>Course</th>
                <th>Provider</th>
                <th>Version</th>
                <th>Skills Assessed</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a._id}>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{a.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Difficulty: {a.difficulty}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{a.courseId?.courseName || 'N/A'}</span>
                  </td>
                  <td>{a.providerId?.organizationName || 'N/A'}</td>
                  <td>v{a.version}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                      {a.skills?.map((s, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px' }}>
                          {typeof s === 'string' ? s : s?.skillName || s?.name || 'Skill'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{a.totalQuestions || a.questions?.length || 0}</td>
                  <td>
                    <span className={`badge ${a.status === 'PUBLISHED' ? 'badge-success' : a.status === 'DRAFT' ? 'badge-warning' : 'badge-secondary'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAssessment(a)}>
                      <IconEye size={14} /> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedAssessment && (
        <div className="modal-backdrop" onClick={() => setSelectedAssessment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{selectedAssessment.title}</h3>
              <button className="btn-close" onClick={() => setSelectedAssessment(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COURSE</span>
                  <div style={{ fontWeight: '600' }}>{selectedAssessment.courseId?.courseName}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PROVIDER</span>
                  <div style={{ fontWeight: '600' }}>{selectedAssessment.providerId?.organizationName}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DIFFICULTY</span>
                  <div style={{ fontWeight: '600' }}>{selectedAssessment.difficulty}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MAX ATTEMPTS</span>
                  <div style={{ fontWeight: '600' }}>{selectedAssessment.maxAttempts}</div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#93c5fd' }}>Skills & Question Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                {selectedAssessment.skills?.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontWeight: '600' }}>{typeof s === 'string' ? s : s?.skillName || s?.name || 'Skill'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedAssessment.questionsPerSkill || 5} questions (Weight: {s?.weight || 'Equal'}%)</span>
                  </div>
                ))}
              </div>

              {selectedAssessment.questions && selectedAssessment.questions.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#93c5fd' }}>Sample Questions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedAssessment.questions.slice(0, 5).map((q, idx) => (
                      <div key={idx} style={{ padding: '10px', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>
                          Q{idx + 1}. {q.questionText}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {q.options?.map((opt) => (
                            <div key={opt.label} style={{ padding: '3px 6px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
                              <strong>{opt.label}:</strong> {opt.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {selectedAssessment.questions.length > 5 && (
                      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        + {selectedAssessment.questions.length - 5} more questions
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAssessment(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
