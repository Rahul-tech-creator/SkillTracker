import React, { useState, useEffect } from 'react';
import { skillGapService } from '../../services/api';
import { IconTarget, IconBrain, IconAward, IconCheckCircle, IconAlertCircle, IconBookOpen } from '../../components/common/Icons';
import { SkillBar } from '../../components/common/SkillBar';
import { AIInsightCard } from '../../components/common/AIInsightCard';
import { MetricCard } from '../../components/common/MetricCard';

export const TraineeSkillReport = () => {
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      const res = await skillGapService.getMy();
      const list = res.data?.data || [];
      setReports(list);
      if (list.length > 0) {
        setSelectedReportId(list[0]._id);
      }
    } catch (err) {
      console.error('Failed to load skill gap reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedReport = reports.find((r) => r._id === selectedReportId) || reports[0];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconTarget size={26} color="#10b981" /> My Skill Gap & Proficiency Report
          </h1>
          <p className="page-subtitle">
            Personalized competency evaluation derived from your assessment submissions and Grok AI career feedback
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your skill gap reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No assessment results found. Take an assessment from the "Skill Assessments" tab to generate your report.
        </div>
      ) : (
        <>
          {/* Report Selector if multiple */}
          {reports.length > 1 && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                SELECT ASSESSMENT REPORT:
              </label>
              <select
                className="form-control"
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                style={{ maxWidth: '400px' }}
              >
                {reports.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.assessmentId?.title || 'Assessment'} — Score: {r.overallPercentage}% ({new Date(r.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedReport && (
            <>
              {/* Top Overview KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ marginBottom: '1.5rem' }}>
                <MetricCard
                  title="Overall Score"
                  value={`${selectedReport.overallPercentage}%`}
                  subtitle={`${selectedReport.overallScore}/${selectedReport.overallMaxScore} Total Marks`}
                  icon={IconAward}
                  color={selectedReport.overallPercentage >= 75 ? '#10b981' : selectedReport.overallPercentage >= 50 ? '#3b82f6' : '#ef4444'}
                />
                <MetricCard
                  title="Strong Skills"
                  value={selectedReport.deterministic?.strongSkills?.length || 0}
                  subtitle="Score ≥80%"
                  icon={IconCheckCircle}
                  color="#10b981"
                />
                <MetricCard
                  title="Developing Skills"
                  value={selectedReport.deterministic?.developingSkills?.length || 0}
                  subtitle="Score 60-79%"
                  icon={IconBookOpen}
                  color="#3b82f6"
                />
                <MetricCard
                  title="Skill Gaps"
                  value={(selectedReport.deterministic?.weakSkills?.length || 0) + (selectedReport.deterministic?.criticalGaps?.length || 0)}
                  subtitle="Score &lt;60%"
                  icon={IconAlertCircle}
                  color="#ef4444"
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Skill Breakdown */}
                <div className="lg:col-span-2 card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Detailed Skill-by-Skill Evaluation
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Calculated from your submitted MCQ responses. Review incorrect answer focus areas to guide your self-study.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedReport.skillResults?.map((s) => (
                      <SkillBar
                        key={s.skillId}
                        skillName={s.skillName}
                        percentage={s.percentage}
                        classification={s.classification}
                        score={s.score}
                        maxScore={s.maxScore}
                        wrongTopics={s.wrongTopics}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Column: AI Analysis */}
                <div>
                  <AIInsightCard
                    title="Grok AI Personalized Feedback"
                    data={selectedReport.aiAnalysis}
                    analyzedAt={selectedReport.aiAnalyzedAt}
                    emptyMessage="AI personalized analysis is processing..."
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
