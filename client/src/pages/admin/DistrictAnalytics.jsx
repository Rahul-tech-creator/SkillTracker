import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import {
  IconMapPin,
  IconBuilding,
  IconUsers,
  IconTrendingUp,
  IconDollarSign,
  IconCheckCircle,
  IconAlertCircle,
  IconBookOpen,
  IconShield,
} from '../../components/common/Icons';
import { formatCurrency, formatDate } from '../../utils/helpers';

export const DistrictAnalytics = () => {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drillLevel, setDrillLevel] = useState('OVERVIEW'); // 'OVERVIEW', 'PROVIDERS', 'COURSES', 'TRAINEES'

  // Fetch initial list of districts & current selection
  useEffect(() => {
    const fetchDistricts = async () => {
      setLoading(true);
      try {
        const res = await analyticsService.getDistrictAnalytics();
        const data = res.data?.data;
        const districtList = data?.availableDistricts || data?.districts || [];
        setDistricts(districtList);
        if (districtList.length > 0) {
          const initial = typeof districtList[0] === 'string' ? districtList[0] : districtList[0].name;
          setSelectedDistrict(initial);
        } else {
          setAnalytics(data || null);
        }
      } catch (err) {
        console.error('Failed to load district data:', err);
        setError(err.message || 'Failed to retrieve district intelligence');
      } finally {
        setLoading(false);
      }
    };
    fetchDistricts();
  }, []);

  // Fetch detailed district data when selectedDistrict changes
  useEffect(() => {
    if (!selectedDistrict) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await analyticsService.getDistrictAnalytics({ district: selectedDistrict });
        setAnalytics(res.data?.data || null);
      } catch (err) {
        console.error('Failed to load district detail:', err);
        setError(err.message || 'Failed to load details for district');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [selectedDistrict]);

  const kpis = analytics?.kpis || {
    totalTrainees: 0,
    placementRate: 0,
    retentionRate: 0,
    avgSalary: 0,
    providerCount: 0,
  };

  const sectors = analytics?.sectors || [];
  const providers = analytics?.providers || analytics?.providerBreakdown || [];
  const courses = analytics?.courses || [];
  const trainees = analytics?.trainees || [];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row mb-6">
        <div>
          <span className="section-eyebrow">GEOGRAPHIC OUTCOME INTELLIGENCE</span>
          <h1 className="page-title">District Skilling & Employment Performance</h1>
          <p className="page-subtitle">
            Longitudinal monitoring of skilling outcomes, provider accountability, and employment wage progression at district level.
          </p>
        </div>

        {/* District Selector */}
        {districts.length > 0 && (
          <div className="district-filter-control">
            <label className="filter-label">Select Target District:</label>
            <div className="select-with-icon">
              <IconMapPin size={16} className="select-icon" />
              <select
                className="district-select"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
              >
                {districts.map((d, i) => {
                  const name = typeof d === 'string' ? d : d.name;
                  const state = typeof d === 'string' ? '' : ` (${d.state})`;
                  return (
                    <option key={i} value={name}>
                      {name}{state}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}
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
          <p>Aggregating district longitudinal data from registry...</p>
        </div>
      ) : districts.length === 0 ? (
        /* Empty State when no districts exist */
        <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <IconMapPin size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            No District Data Available
          </h3>
          <p style={{ maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            There are currently no trainee enrollment records mapped to geographic districts. Once trainees are registered and enrolled into batches, district performance metrics will generate automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="stats-grid mb-6">
            <div className="stat-card">
              <div className="stat-icon-wrap bg-forest">
                <IconUsers size={22} className="text-white" />
              </div>
              <div className="stat-content">
                <span className="stat-label">TOTAL TRAINEES IN DISTRICT</span>
                <span className="stat-value">{(kpis.totalTrainees || 0).toLocaleString()}</span>
                <span className="stat-hint">Longitudinal Cohort Records</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap bg-sage">
                <IconCheckCircle size={22} className="text-white" />
              </div>
              <div className="stat-content">
                <span className="stat-label">PLACEMENT RATE</span>
                <span className="stat-value">{kpis.placementRate || 0}%</span>
                <span className="stat-hint">Trainees in Active Employment</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap bg-amber">
                <IconTrendingUp size={22} className="text-white" />
              </div>
              <div className="stat-content">
                <span className="stat-label">12M RETENTION RATE</span>
                <span className="stat-value">{kpis.retentionRate || 0}%</span>
                <span className="stat-hint">Sustained Employment At 12M</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap bg-slate">
                <IconDollarSign size={22} className="text-white" />
              </div>
              <div className="stat-content">
                <span className="stat-label">AVG MONTHLY WAGE</span>
                <span className="stat-value font-mono">{formatCurrency(kpis.avgSalary || 0)}</span>
                <span className="stat-hint">Verified In-Hand Salary</span>
              </div>
            </div>
          </div>

          {/* Drill-down Navigation Tabs */}
          <div className="filter-tabs-bar mb-4">
            <button
              className={`filter-tab ${drillLevel === 'OVERVIEW' ? 'active' : ''}`}
              onClick={() => setDrillLevel('OVERVIEW')}
            >
              District Overview & Sectors
            </button>
            <button
              className={`filter-tab ${drillLevel === 'PROVIDERS' ? 'active' : ''}`}
              onClick={() => setDrillLevel('PROVIDERS')}
            >
              Providers in {selectedDistrict} ({providers.length})
            </button>
            <button
              className={`filter-tab ${drillLevel === 'COURSES' ? 'active' : ''}`}
              onClick={() => setDrillLevel('COURSES')}
            >
              Course Curricula ({courses.length})
            </button>
            <button
              className={`filter-tab ${drillLevel === 'TRAINEES' ? 'active' : ''}`}
              onClick={() => setDrillLevel('TRAINEES')}
            >
              Trainee Records ({trainees.length})
            </button>
          </div>

          {/* Tab 1: OVERVIEW */}
          {drillLevel === 'OVERVIEW' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card lg:col-span-2">
                <div className="card-header">
                  <h3 className="card-title">Sectoral Distribution & Placement Benchmarks</h3>
                  <span className="text-sm text-secondary">Verified employment by industry</span>
                </div>
                <div className="card-body p-0">
                  {sectors.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No sectoral enrollment data logged for {selectedDistrict} yet.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SECTOR / INDUSTRY</th>
                          <th>ENROLLED</th>
                          <th>PLACED</th>
                          <th>PLACEMENT %</th>
                          <th>AVG WAGE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectors.map((s, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-primary">{s.name}</td>
                            <td>{(s.enrolled || 0).toLocaleString()}</td>
                            <td>{(s.placed || 0).toLocaleString()}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <span className="font-bold">{s.rate || 0}%</span>
                                <div className="progress-bar-sm">
                                  <div className="progress-fill" style={{ width: `${s.rate || 0}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="font-mono text-success font-semibold">
                              {formatCurrency(s.wage || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">District Performance Signals</h3>
                </div>
                <div className="card-body">
                  <div className="signal-list">
                    {kpis.totalTrainees === 0 ? (
                      <div className="signal-box signal-neutral">
                        <IconUsers size={18} className="text-secondary" />
                        <div>
                          <h6>Awaiting Trainee Registrations</h6>
                          <p>No active cohorts mapped to {selectedDistrict} currently.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`signal-box ${kpis.placementRate >= 60 ? 'signal-positive' : 'signal-warning'}`}>
                          {kpis.placementRate >= 60 ? (
                            <IconCheckCircle size={18} className="text-success" />
                          ) : (
                            <IconAlertCircle size={18} className="text-amber" />
                          )}
                          <div>
                            <h6>Placement Performance</h6>
                            <p>{kpis.placementRate}% verified placement rate across active district batches.</p>
                          </div>
                        </div>

                        {kpis.retentionRate > 0 && (
                          <div className="signal-box signal-positive">
                            <IconTrendingUp size={18} className="text-success" />
                            <div>
                              <h6>12-Month Retention Stability</h6>
                              <p>{kpis.retentionRate}% of placed graduates remain retained in the workforce at M12.</p>
                            </div>
                          </div>
                        )}

                        <div className="signal-box signal-neutral">
                          <IconBuilding size={18} className="text-primary" />
                          <div>
                            <h6>Accredited Training Centers</h6>
                            <p>{providers.length} accredited training provider(s) active in {selectedDistrict}.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: PROVIDERS IN DISTRICT */}
          {drillLevel === 'PROVIDERS' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Authorized Training Providers in {selectedDistrict}</h3>
                <span className="text-sm text-secondary">Accredited centers operating within district boundary</span>
              </div>
              <div className="card-body p-0">
                {providers.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No training providers active in {selectedDistrict} yet.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PROVIDER CODE</th>
                        <th>ORGANIZATION NAME</th>
                        <th>TIER</th>
                        <th>ENROLLED</th>
                        <th>PLACEMENT %</th>
                        <th>RETENTION %</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map((p, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold text-secondary">{p.code || 'PRV-ACTIVE'}</td>
                          <td className="font-semibold text-primary">{p.name || p.providerName}</td>
                          <td>
                            <span className="badge badge-light font-bold">Tier {p.tier || 1}</span>
                          </td>
                          <td>{(p.traineeCount || p.enrolledCount || 0).toLocaleString()}</td>
                          <td className="font-bold text-success">{p.placementRate || 0}%</td>
                          <td className="font-bold">{p.retentionRate || 0}%</td>
                          <td>
                            <span className="status-pill pill-active">Accredited</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: COURSES */}
          {drillLevel === 'COURSES' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Courses Active in {selectedDistrict}</h3>
              </div>
              <div className="card-body p-0">
                {courses.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No courses enrolled in {selectedDistrict} yet.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>COURSE CODE</th>
                        <th>TITLE</th>
                        <th>SECTOR</th>
                        <th>DURATION</th>
                        <th>MARKET ALIGNMENT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold text-secondary">{c.code}</td>
                          <td className="font-semibold text-primary">{c.title}</td>
                          <td>{c.sector}</td>
                          <td>{c.durationHours || 0} hrs</td>
                          <td>
                            <span className="badge badge-success">
                              {c.alignmentScore || 0}% Aligned
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: TRAINEES */}
          {drillLevel === 'TRAINEES' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Trainee Cohort Records in {selectedDistrict}</h3>
                <span className="text-sm text-secondary">Tokenized longitudinal trainee roster</span>
              </div>
              <div className="card-body p-0">
                {trainees.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No trainee cohort records in {selectedDistrict} yet.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>INTERNAL ID</th>
                        <th>TRAINEE NAME</th>
                        <th>GENDER / CAT</th>
                        <th>EMPLOYMENT STATUS</th>
                        <th>CURRENT SALARY</th>
                        <th>VERIFICATION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainees.map((t, idx) => (
                        <tr key={idx}>
                          <td className="font-mono text-primary font-bold">
                            <div className="d-flex align-items-center gap-1">
                              <IconShield size={13} className="text-secondary" />
                              <span>{t.internalTraineeId || 'TOKENIZED-ID'}</span>
                            </div>
                          </td>
                          <td className="font-semibold">{t.fullName}</td>
                          <td>
                            {t.gender || '—'} • {t.demographics?.category || 'General'}
                          </td>
                          <td>
                            <span className="status-pill pill-employed">{t.status || 'ENROLLED'}</span>
                          </td>
                          <td className="font-mono text-success font-bold">
                            {t.salary ? formatCurrency(t.salary) : '—'}
                          </td>
                          <td>
                            <span className="status-pill pill-verified">
                              {t.isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DistrictAnalytics;
