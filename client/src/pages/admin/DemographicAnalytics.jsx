import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import {
  IconUsers,
  IconShield,
  IconAlertCircle,
  IconCheckCircle,
  IconTrendingUp,
  IconDollarSign,
} from '../../components/common/Icons';
import { formatCurrency } from '../../utils/helpers';

export const DemographicAnalytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimension, setDimension] = useState('gender'); // 'gender', 'socialCategory', 'residenceType', 'educationLevel'

  const dimensionMap = {
    gender: 'gender',
    category: 'socialCategory',
    location: 'residenceType',
    education: 'educationLevel',
  };

  useEffect(() => {
    const fetchDemographics = async () => {
      setLoading(true);
      setError(null);
      try {
        const backendDim = dimensionMap[dimension] || dimension;
        const res = await analyticsService.getDemographics({ dimension: backendDim });
        const list = res.data?.data || [];
        setData(list);
      } catch (err) {
        console.error('Failed to load demographic data:', err);
        setError(err.message || 'Failed to retrieve demographic analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDemographics();
  }, [dimension]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row mb-6">
        <div>
          <span className="section-eyebrow">EQUITY & INCLUSION INTELLIGENCE</span>
          <h1 className="page-title">Demographic Outcome Cross-Tabulations</h1>
          <p className="page-subtitle">
            Longitudinal skilling outcome disaggregation by gender, social category, and residence type with privacy-preserving suppression controls.
          </p>
        </div>

        {/* Dimension selector */}
        <div className="dimension-selector">
          <label className="filter-label">Stratification Axis:</label>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${dimension === 'gender' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDimension('gender')}
            >
              Gender
            </button>
            <button
              className={`btn btn-sm ${dimension === 'category' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDimension('category')}
            >
              Social Category
            </button>
            <button
              className={`btn btn-sm ${dimension === 'location' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDimension('location')}
            >
              Rural / Urban
            </button>
            <button
              className={`btn btn-sm ${dimension === 'education' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDimension('education')}
            >
              Prior Education
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="privacy-notice-banner mb-6">
        <IconShield size={18} className="text-primary" />
        <div className="notice-text">
          <strong>Differential Privacy & Anonymity Enforcement:</strong> Cells with fewer than 5
          individuals are suppressed to prevent statistical re-identification of vulnerable groups.
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error mb-6">
          <IconAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state-card">
          <span className="spinner-lg"></span>
          <p>Processing cross-tabulations and privacy masks from database records...</p>
        </div>
      ) : data.length === 0 ? (
        /* Zero-state card */
        <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <IconUsers size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            No Demographic Data Available
          </h3>
          <p style={{ maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            No registered trainee profiles currently exist with data for this demographic stratification axis. Once trainees are registered and enrolled, demographic outcome cross-tabulations and privacy-preserved metrics will populate automatically.
          </p>
        </div>
      ) : (
        /* Main Cross-tabulation Table */
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">
              Longitudinal Performance by {dimension.toUpperCase()} Stratification
            </h3>
            <span className="text-sm text-secondary">
              Aggregated deterministically from verified trainee cohort records
            </span>
          </div>
          <div className="card-body p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>DEMOGRAPHIC STRATA</th>
                  <th>TRAINEES IN COHORT</th>
                  <th>COMPLETION RATE %</th>
                  <th>EMPLOYMENT RATE %</th>
                  <th>VERIFIED EMPLOYMENT %</th>
                  <th>AVG VERIFIED SALARY</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, idx) => {
                  const isSuppressed = typeof r.totalTrainees === 'string' && r.totalTrainees.includes('Suppressed');
                  return (
                    <tr key={idx}>
                      <td className="font-semibold text-primary">{r.segment || 'Unspecified'}</td>
                      <td>
                        {isSuppressed ? (
                          <span className="privacy-suppressed">&lt; 5 (Suppressed)</span>
                        ) : (
                          (r.totalTrainees || 0).toLocaleString()
                        )}
                      </td>
                      <td>
                        {isSuppressed ? (
                          <span className="privacy-suppressed">Suppressed</span>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <span className="font-bold">{r.completionRate || 0}%</span>
                            <div className="progress-bar-sm">
                              <div
                                className="progress-fill"
                                style={{ width: `${r.completionRate || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {isSuppressed ? (
                          <span className="privacy-suppressed">Suppressed</span>
                        ) : (
                          <span className="font-bold text-success">{r.employmentRate || 0}%</span>
                        )}
                      </td>
                      <td>
                        {isSuppressed ? (
                          <span className="privacy-suppressed">Suppressed</span>
                        ) : (
                          <span className="font-bold">{r.verifiedRate || 0}%</span>
                        )}
                      </td>
                      <td>
                        {isSuppressed ? (
                          <span className="privacy-suppressed">Suppressed</span>
                        ) : (
                          <span className="font-mono font-semibold text-forest">
                            {r.averageWage || 'N/A'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemographicAnalytics;
