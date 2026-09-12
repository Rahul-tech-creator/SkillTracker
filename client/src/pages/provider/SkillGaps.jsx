import React, { useState, useEffect } from 'react';
import { courseService, skillGapService } from '../../services/api';
import { IconTarget, IconBrain, IconBookOpen, IconAlertCircle, IconPlus } from '../../components/common/Icons';
import { SkillBar } from '../../components/common/SkillBar';
import { AIInsightCard } from '../../components/common/AIInsightCard';
import { MetricCard } from '../../components/common/MetricCard';
import { Link } from 'react-router-dom';

export const ProviderSkillGaps = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [gapData, setGapData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchSkillGaps(selectedCourseId);
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
      console.error('Failed to load courses:', err);
    }
  };

  const fetchSkillGaps = async (courseId) => {
    try {
      setLoading(true);
      const res = await skillGapService.getByCourse(courseId);
      setGapData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load skill gaps:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconTarget size={26} color="#ef4444" /> Skill Gap Analytics & Cohort Diagnostics
          </h1>
          <p className="page-subtitle">
            Identify specific skill deficiencies across your enrolled cohorts and create targeted remedial action plans
          </p>
        </div>
        <Link to="/provider/remedial-actions" className="btn btn-secondary">
          View Remedial Actions Dashboard →
        </Link>
      </div>

      {/* Course Filter */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
          SELECT COURSE:
        </label>
        <select
          className="form-control"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          style={{ maxWidth: '400px' }}
        >
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{c.courseName}</option>
          ))}
        </select>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Trainees Assessed"
          value={gapData?.totalAnalyzed || 0}
          subtitle="Trainees evaluated in this course"
          icon={IconTarget}
          color="#3b82f6"
        />
        <MetricCard
          title="Critical Skill Gaps"
          value={gapData?.skillAverages?.filter((s) => s.averagePercentage < 40).length || 0}
          subtitle="Cohort average &lt;40%"
          icon={IconAlertCircle}
          color="#ef4444"
        />
        <MetricCard
          title="Developing Skills"
          value={gapData?.skillAverages?.filter((s) => s.averagePercentage >= 60 && s.averagePercentage < 80).length || 0}
          subtitle="Cohort average 60-79%"
          icon={IconBookOpen}
          color="#f59e0b"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Cohort Skill Proficiency Breakdown
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Empirical scores derived from all submitted trainee assessments for this course.
          </p>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading cohort skill results...
            </div>
          ) : !gapData || gapData.skillAverages?.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No assessment submissions found for this course yet. Skill gap metrics will populate as trainees submit assessments.
            </div>
          ) : (
            <div>
              {gapData.skillAverages.map((s) => {
                let classification = 'CRITICAL_GAP';
                if (s.averagePercentage >= 80) classification = 'STRONG';
                else if (s.averagePercentage >= 60) classification = 'DEVELOPING';
                else if (s.averagePercentage >= 40) classification = 'WEAK';

                return (
                  <SkillBar
                    key={s.skillId}
                    skillName={s.skillName}
                    percentage={s.averagePercentage}
                    classification={classification}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* AI Interpretation */}
        <div>
          <AIInsightCard
            title="Grok Pedagogical Insights"
            data={
              gapData && gapData.totalAnalyzed > 0
                ? {
                    summary: `Cohort analysis across ${gapData.totalAnalyzed} trainees highlights key strengths and areas needing instructor reinforcement.`,
                    strongSkills: gapData.skillAverages.filter((s) => s.averagePercentage >= 80).map((s) => `${s.skillName} (${s.averagePercentage}%)`),
                    skillGaps: gapData.skillAverages.filter((s) => s.averagePercentage < 60).map((s) => ({
                      skill: s.skillName,
                      severity: s.averagePercentage < 40 ? 'HIGH' : 'MEDIUM',
                      evidence: `Cohort average is ${s.averagePercentage}%.`,
                      recommendedAction: `Organize targeted tutorial sessions and practice assignments for ${s.skillName}.`,
                    })),
                    providerActions: [
                      'Create a remedial action plan for high-severity skill gaps',
                      'Schedule peer mentoring sessions for struggling trainees',
                    ],
                  }
                : null
            }
            emptyMessage="No assessment data available for AI interpretation."
          />
        </div>
      </div>
    </div>
  );
};
