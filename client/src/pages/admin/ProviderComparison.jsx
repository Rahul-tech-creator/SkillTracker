import React, { useState, useEffect } from 'react';
import { courseService, providerComparisonService } from '../../services/api';
import { IconBarChart, IconBrain, IconAward, IconSliders, IconAlertCircle, IconCheckCircle } from '../../components/common/Icons';
import { ConfidenceBadge } from '../../components/common/ConfidenceBadge';
import { AIInsightCard } from '../../components/common/AIInsightCard';

export const AdminProviderComparison = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchComparison(selectedCourseId);
      setAiAnalysis(null);
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    try {
      const res = await courseService.getAll();
      const list = res.data?.data || [];
      setCourses(list);
      if (list.length > 0) {
        setSelectedCourseId(list[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const fetchComparison = async (courseId) => {
    try {
      setLoading(true);
      const res = await providerComparisonService.compare(courseId);
      setComparisonData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to compare providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIAnalysis = async () => {
    if (!selectedCourseId) return;
    try {
      setAiLoading(true);
      const res = await providerComparisonService.getAIAnalysis(selectedCourseId);
      if (res.data?.success && res.data?.data?.analysis) {
        setAiAnalysis(res.data.data.analysis);
      }
    } catch (err) {
      console.error('AI provider analysis failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconBarChart size={26} color="#3b82f6" /> Evidence-Based Provider Benchmarking
          </h1>
          <p className="page-subtitle">
            Multi-dimensional provider comparison derived from verified MongoDB training completion, certification, assessment, and longitudinal career tracking records
          </p>
        </div>
      </div>

      {/* Selector & Action Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ minWidth: '300px', flex: 1 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
            BENCHMARK COURSE:
          </label>
          <select
            className="form-control"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.courseName} ({c.category || 'General'})
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleGenerateAIAnalysis}
          disabled={aiLoading || !comparisonData?.providers?.length}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconBrain size={18} />
          {aiLoading ? 'Analyzing Evidence with Grok...' : 'Generate AI Provider Intelligence'}
        </button>
      </div>

      {/* Comparison Table */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
              Provider Performance Matrix — {comparisonData?.course?.courseName || 'Course'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Minimum Sample Size: <strong>N={comparisonData?.minimumSampleSize || 30}</strong> (Providers below threshold flagged for low data confidence)
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Aggregating longitudinal provider outcomes...
          </div>
        ) : !comparisonData || comparisonData.providers?.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No providers found offering this course.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Training Provider</th>
                  <th>District</th>
                  <th>Sample (N)</th>
                  <th>Completion</th>
                  <th>Certification</th>
                  <th>Assessment</th>
                  <th>Employment</th>
                  <th>Retention</th>
                  <th>Relevance</th>
                  <th>Overall Score</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.providers.map((p) => (
                  <tr
                    key={p.providerId}
                    style={{
                      backgroundColor: p.rank === 1 ? 'rgba(16, 185, 129, 0.04)' : undefined,
                    }}
                  >
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: p.rank === 1 ? '#10b981' : p.rank === 2 ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                        }}
                      >
                        #{p.rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{p.name}</div>
                      {!p.sufficientSample && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <IconAlertCircle size={12} /> Insufficient sample size (&lt;{comparisonData.minimumSampleSize})
                        </span>
                      )}
                    </td>
                    <td>{p.district || '—'}</td>
                    <td>
                      <strong>{p.sampleSize}</strong>
                    </td>
                    <td>{p.metrics.completion != null ? `${p.metrics.completion}%` : '—'}</td>
                    <td>{p.metrics.certification != null ? `${p.metrics.certification}%` : '—'}</td>
                    <td>{p.metrics.assessment != null ? `${p.metrics.assessment}%` : '—'}</td>
                    <td>
                      <strong style={{ color: p.metrics.employment >= 70 ? '#10b981' : undefined }}>
                        {p.metrics.employment != null ? `${p.metrics.employment}%` : '—'}
                      </strong>
                    </td>
                    <td>{p.metrics.retention != null ? `${p.metrics.retention}%` : '—'}</td>
                    <td>{p.metrics.relevance != null ? `${p.metrics.relevance}/5` : '—'}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: '800',
                          fontSize: '1rem',
                          color: (p.metrics.overallScore || 0) >= 75 ? '#10b981' : (p.metrics.overallScore || 0) >= 50 ? '#3b82f6' : '#f59e0b',
                        }}
                      >
                        {p.metrics.overallScore != null ? `${p.metrics.overallScore}` : '—'}
                      </span>
                    </td>
                    <td>
                      <ConfidenceBadge confidence={p.confidence} sampleSize={p.sampleSize} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Scoring Methodology Banner */}
        <div style={{ marginTop: '1.25rem', padding: '0.85rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>Transparent Scoring Formula:</strong> Overall Score = (Completion × 20%) + (Certification × 15%) + (Assessment × 20%) + (Employment × 20%) + (Retention × 10%) + (Relevance × 10%) + (Follow-Up × 5%). Scores are mathematically normalized against available metrics.
        </div>
      </div>

      {/* AI Intelligence Output */}
      {aiAnalysis && (
        <div style={{ marginBottom: '2rem' }}>
          <AIInsightCard
            title={`Grok AI Comparative Audit: ${comparisonData?.course?.courseName}`}
            data={aiAnalysis}
            onRefresh={handleGenerateAIAnalysis}
          />
        </div>
      )}
    </div>
  );
};
