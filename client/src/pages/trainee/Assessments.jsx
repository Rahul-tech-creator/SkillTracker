import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/api';
import { IconClipboard, IconClock, IconAward, IconCheckCircle, IconEye } from '../../components/common/Icons';

export const TraineeAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAll();
      setAssessments(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load trainee assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconClipboard size={26} color="#3b82f6" /> Course Skill Assessments
          </h1>
          <p className="page-subtitle">
            Take official course skill assessments to evaluate your technical competencies and receive evidence-based AI feedback
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your assigned assessments...
        </div>
      ) : assessments.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No published assessments available for your enrolled courses yet. Check back once your provider publishes an assessment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assessments.map((a) => {
            const bestAttempt = a.myAttempts?.filter((at) => at.status === 'SUBMITTED').sort((x, y) => (y.percentage || 0) - (x.percentage || 0))[0];

            return (
              <div
                key={a._id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: bestAttempt ? '4px solid #10b981' : '4px solid #3b82f6',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span className="badge badge-info">{a.courseId?.courseName || 'Course'}</span>
                    <span className="badge badge-secondary">{a.difficulty} Level</span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {a.title}
                  </h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
                    {a.skills?.map((s, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        {typeof s === 'string' ? s : s?.skillName || s?.name || 'Skill'}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Format: </span>
                      <strong>{a.caseStudyQuestions?.length || a.totalQuestions || a.questions?.length || 5} Case Study + Adaptive</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Time Limit: </span>
                      <strong>{a.timeLimitMinutes ? `${a.timeLimitMinutes} mins` : 'Untimed'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Attempts: </span>
                      <strong>{a.attemptsUsed} / {a.maxAttempts}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Best Score: </span>
                      <strong style={{ color: bestAttempt ? '#10b981' : undefined }}>
                        {bestAttempt ? `${bestAttempt.percentage}%` : 'Not Taken'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {a.canAttempt ? (
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => navigate(`/trainee/assessments/${a._id}/take`)}
                    >
                      {a.attemptsUsed > 0 ? 'Retake Assessment →' : 'Start Assessment →'}
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-block" disabled>
                      Max Attempts Used
                    </button>
                  )}
                  {bestAttempt && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate('/trainee/skill-report')}
                      title="View Skill Gap Report"
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
