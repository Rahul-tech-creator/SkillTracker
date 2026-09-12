import React, { useState, useEffect } from 'react';
import { courseService, skillGapService } from '../../services/api';
import { IconTarget, IconBrain, IconBookOpen, IconSearch, IconAlertCircle } from '../../components/common/Icons';
import { SkillBar } from '../../components/common/SkillBar';
import { AIInsightCard } from '../../components/common/AIInsightCard';
import { MetricCard } from '../../components/common/MetricCard';

export const AdminSkillGapAnalysis = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseGapData, setCourseGapData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseGapData(selectedCourseId);
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

  const fetchCourseGapData = async (courseId) => {
    try {
      setLoading(true);
      const res = await skillGapService.getByCourse(courseId);
      setCourseGapData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load course skill gap data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconTarget size={26} color="#ef4444" /> Skill Gap Intelligence & Analytics
          </h1>
          <p className="page-subtitle">
            Longitudinal skill gap identification derived from actual trainee assessment marks and question responses
          </p>
        </div>
      </div>

      {/* Course Selector Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '280px', flex: 1 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
            SELECT COURSE FOR SKILL GAP AUDIT:
          </label>
          <select
            className="form-control"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.courseName} ({c.providerId?.organizationName || 'Provider'})
              </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Category: </span>
              <strong>{selectedCourse.category || 'General'}</strong>
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Curriculum Skills: </span>
              <strong>{selectedCourse.skills?.length || 0} skills</strong>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Trainees Assessed"
          value={courseGapData?.totalAnalyzed || 0}
          subtitle="Trainees with graded attempts"
          icon={IconTarget}
          color="#3b82f6"
        />
        <MetricCard
          title="Assessed Skills"
          value={courseGapData?.skillAverages?.length || 0}
          subtitle="Core skills tested"
          icon={IconBookOpen}
          color="#8b5cf6"
        />
        <MetricCard
          title="Critical Gaps (<40%)"
          value={courseGapData?.skillAverages?.filter((s) => s.averagePercentage < 40).length || 0}
          subtitle="Skills needing urgent focus"
          icon={IconAlertCircle}
          color="#ef4444"
        />
        <MetricCard
          title="Strong Skills (≥80%)"
          value={courseGapData?.skillAverages?.filter((s) => s.averagePercentage >= 80).length || 0}
          subtitle="Proficiency benchmark met"
          icon={IconBrain}
          color="#10b981"
        />
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Skill Breakdown */}
        <div className="lg:col-span-2 card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Empirical Skill Proficiency Breakdown
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Deterministic averages calculated from submitted question scores. Classified using standard thresholds (Strong ≥80%, Developing 60-79%, Weak 40-59%, Critical &lt;40%).
          </p>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Calculating skill averages...
            </div>
          ) : !courseGapData || courseGapData.skillAverages?.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No assessment submissions found for this course yet. Skill gap analytics will appear once trainees complete published assessments.
            </div>
          ) : (
            <div>
              {courseGapData.skillAverages.map((s) => {
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

        {/* Right Column: AI Analysis Card */}
        <div>
          <AIInsightCard
            title="Course Gap Interpretation"
            data={
              courseGapData && courseGapData.totalAnalyzed > 0
                ? {
                    summary: `Empirical analysis across ${courseGapData.totalAnalyzed} trainees shows skill proficiencies ranging from ${
                      Math.min(...courseGapData.skillAverages.map((s) => s.averagePercentage))
                    }% to ${
                      Math.max(...courseGapData.skillAverages.map((s) => s.averagePercentage))
                    }%.`,
                    strongSkills: courseGapData.skillAverages
                      .filter((s) => s.averagePercentage >= 80)
                      .map((s) => `${s.skillName} (Avg: ${s.averagePercentage}%)`),
                    skillGaps: courseGapData.skillAverages
                      .filter((s) => s.averagePercentage < 60)
                      .map((s) => ({
                        skill: s.skillName,
                        severity: s.averagePercentage < 40 ? 'HIGH' : 'MEDIUM',
                        evidence: `Average score across cohort is ${s.averagePercentage}% (${s.traineesAssessed} trainees tested).`,
                        recommendedAction: `Schedule refresher modules and targeted hands-on labs for ${s.skillName}.`,
                      })),
                    providerActions: [
                      'Review question difficulty and curriculum coverage for weak skills',
                      'Assign peer mentors or remedial workshops for critical gap areas',
                      'Track progress with post-intervention re-assessments',
                    ],
                  }
                : null
            }
            emptyMessage="No assessment data to generate AI insights for this course."
          />
        </div>
      </div>
    </div>
  );
};
