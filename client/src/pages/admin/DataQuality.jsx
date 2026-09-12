import React, { useState, useEffect } from 'react';
import { dataQualityService } from '../../services/api';
import { IconSliders, IconCheckCircle, IconAlertCircle, IconActivity, IconClipboard, IconUsers, IconCertificate } from '../../components/common/Icons';
import { MetricCard } from '../../components/common/MetricCard';

export const AdminDataQuality = () => {
  const [qualityData, setQualityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataQuality();
  }, []);

  const fetchDataQuality = async () => {
    try {
      setLoading(true);
      const res = await dataQualityService.get();
      setQualityData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load data quality:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (quality) => {
    if (quality === 'HIGH') return '#10b981';
    if (quality === 'MEDIUM') return '#3b82f6';
    return '#f59e0b';
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconSliders size={26} color="#3b82f6" /> System Data Quality & Integrity Audit
          </h1>
          <p className="page-subtitle">
            Completeness verification across longitudinal tracking stages to ensure AI inferences and funding decisions rest on robust empirical evidence
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Auditing data quality metrics across MongoDB collections...
        </div>
      ) : !qualityData ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Unable to audit data quality.
        </div>
      ) : (
        <>
          {/* Overall Health Card */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: `6px solid ${getStatusColor(qualityData.overallQuality)}`, background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(15, 23, 42, 0.6) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SYSTEM-WIDE DATA INTEGRITY RATING</span>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: getStatusColor(qualityData.overallQuality), marginTop: '4px' }}>
                  {qualityData.overallQuality} DATA COMPLETENESS ({qualityData.qualityScore}/100)
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Based on longitudinal follow-up response rates, assessment coverage, and outcome verification records.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={fetchDataQuality}>
                Re-Run System Audit
              </button>
            </div>
          </div>

          {/* KPI Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: '1.5rem' }}>
            <MetricCard
              title="Assessment Coverage"
              value={`${qualityData.indicators?.assessmentCoverage?.value}%`}
              subtitle={qualityData.indicators?.assessmentCoverage?.detail}
              icon={IconClipboard}
              color="#3b82f6"
            />
            <MetricCard
              title="Follow-Up Completion"
              value={`${qualityData.indicators?.followUpCompletion?.value}%`}
              subtitle={qualityData.indicators?.followUpCompletion?.detail}
              icon={IconActivity}
              color="#10b981"
            />
            <MetricCard
              title="Skill Gap Coverage"
              value={`${qualityData.indicators?.skillGapCoverage?.value}%`}
              subtitle={qualityData.indicators?.skillGapCoverage?.detail}
              icon={IconUsers}
              color="#8b5cf6"
            />
          </div>

          {/* Missing Data Indicators */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Data Quality Warnings & Missing Fields
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: qualityData.missingData?.coursesWithoutSkills?.value > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: `1px solid ${qualityData.missingData?.coursesWithoutSkills?.value > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                <div style={{ fontWeight: '700', fontSize: '1.25rem', color: qualityData.missingData?.coursesWithoutSkills?.value > 0 ? '#f59e0b' : '#10b981' }}>
                  {qualityData.missingData?.coursesWithoutSkills?.value}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Courses without structured skills defined</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Define skills to enable automated AI MCQ generation</span>
              </div>

              <div style={{ padding: '1rem', backgroundColor: qualityData.missingData?.providersWithoutDistrict?.value > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: `1px solid ${qualityData.missingData?.providersWithoutDistrict?.value > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                <div style={{ fontWeight: '700', fontSize: '1.25rem', color: qualityData.missingData?.providersWithoutDistrict?.value > 0 ? '#f59e0b' : '#10b981' }}>
                  {qualityData.missingData?.providersWithoutDistrict?.value}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Providers without geographic district tag</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add district for regional funding scheme allocation</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
