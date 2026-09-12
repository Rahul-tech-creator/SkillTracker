import React, { useState, useEffect } from 'react';
import { courseComparisonService } from '../../services/api';
import { IconBookOpen, IconBrain, IconTrendingUp, IconAward, IconUsers } from '../../components/common/Icons';
import { AIInsightCard } from '../../components/common/AIInsightCard';

export const AdminCourseComparison = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  useEffect(() => {
    fetchCourseComparison();
  }, []);

  const fetchCourseComparison = async () => {
    try {
      setLoading(true);
      const res = await courseComparisonService.compare();
      setCourses(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load course comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      const res = await courseComparisonService.getAIAnalysis();
      if (res.data?.success && res.data?.data?.analysis) {
        setAiAnalysis(res.data.data.analysis);
      }
    } catch (err) {
      console.error('Failed to generate course AI analysis:', err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconBookOpen size={26} color="#8b5cf6" /> Course Outcome Benchmarking
          </h1>
          <p className="page-subtitle">
            Cross-curriculum performance evaluation across all active vocational courses and longitudinal career results
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGenerateAI}
          disabled={aiLoading || courses.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconBrain size={18} />
          {aiLoading ? 'Synthesizing Course Insights...' : 'Generate AI Curriculum Audit'}
        </button>
      </div>

      {/* Comparison Table */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Comparing cross-course longitudinal records...
          </div>
        ) : courses.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No courses found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Category</th>
                  <th>Total Enrolled</th>
                  <th>Completion Rate</th>
                  <th>Certification Rate</th>
                  <th>Assessment Avg</th>
                  <th>Employment Rate</th>
                  <th>Retention</th>
                  <th>Relevance</th>
                  <th>Skill Gap Rate</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{c.courseName}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{c.category || 'General'}</span>
                    </td>
                    <td>
                      <strong>{c.enrolled}</strong>
                    </td>
                    <td>{c.metrics.completion != null ? `${c.metrics.completion}%` : '—'}</td>
                    <td>{c.metrics.certification != null ? `${c.metrics.certification}%` : '—'}</td>
                    <td>{c.metrics.assessment != null ? `${c.metrics.assessment}%` : '—'}</td>
                    <td>
                      <strong style={{ color: (c.metrics.employment || 0) >= 70 ? '#10b981' : undefined }}>
                        {c.metrics.employment != null ? `${c.metrics.employment}%` : '—'}
                      </strong>
                    </td>
                    <td>{c.metrics.retention != null ? `${c.metrics.retention}%` : '—'}</td>
                    <td>{c.metrics.relevance != null ? `${c.metrics.relevance}/5` : '—'}</td>
                    <td>
                      <span style={{ color: (c.metrics.skillGapRate || 0) > 40 ? '#ef4444' : '#10b981' }}>
                        {c.metrics.skillGapRate != null ? `${c.metrics.skillGapRate}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <div style={{ marginBottom: '2rem' }}>
          <AIInsightCard
            title="Grok AI Curriculum & Impact Audit"
            data={aiAnalysis}
            onRefresh={handleGenerateAI}
          />
        </div>
      )}
    </div>
  );
};
