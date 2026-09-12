import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { certificateService } from '../../services/api';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  IconCertificate,
  IconShield,
  IconCheckCircle,
  IconBan,
  IconSearch,
  IconBuilding,
  IconBookOpen,
  IconLayers,
  IconCalendar,
  IconAward,
  IconGraduationCap,
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';

export const VerifyCertificate = () => {
  const { code: routeCode } = useParams();
  const [searchInput, setSearchInput] = useState(routeCode || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const performVerification = async (query) => {
    if (!query.trim()) {
      setError('Please enter a verification code or certificate number.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);
      setSearched(true);

      const res = await certificateService.verify(query.trim());
      if (res.data.success) {
        setResult(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Certificate not found or invalid.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeCode) {
      setSearchInput(routeCode);
      performVerification(routeCode);
    }
  }, [routeCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performVerification(searchInput);
  };

  return (
    <div className="verify-page-wrapper">
      <div className="verify-bg-glow"></div>

      <header className="verify-nav">
        <div className="verify-brand">
          <div className="brand-logo-icon">
            <IconGraduationCap size={22} />
          </div>
          <div>
            <span className="brand-name">SkillTracker</span>
            <span className="brand-sub">Credential Verification</span>
          </div>
        </div>
        <Link to="/login" className="btn btn-outline btn-sm">
          Sign In to Portal →
        </Link>
      </header>

      <main className="verify-main-content">
        <div className="verify-hero">
          <div className="verify-badge-pill">
            <IconShield size={14} /> PUBLIC CREDENTIAL REGISTRY
          </div>
          <h1 className="verify-hero-title">Verify Skilling Certificate</h1>
          <p className="verify-hero-subtitle">
            Instantly authenticate official digital completion certificates issued by certified training providers.
          </p>
        </div>

        {/* Search Box */}
        <div className="verify-search-box">
          <form onSubmit={handleSubmit} className="verify-search-form">
            <div className="verify-input-group">
              <IconSearch size={20} className="verify-search-icon" />
              <input
                type="text"
                className="verify-search-input"
                placeholder="Enter Verification Code (e.g. 8F7K2P9X4Q) or Certificate Number..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="verify-submit-btn"
            >
              Verify Credential
            </Button>
          </form>
          <span className="verify-search-hint">
            You can verify by either the 10-character code or full certificate number (e.g. CERT-2026-FSD-...).
          </span>
        </div>

        {/* Status / Results Section */}
        {loading && (
          <div className="verify-result-card">
            <LoadingSpinner size="md" message="Authenticating credential with registry..." />
          </div>
        )}

        {!loading && error && searched && (
          <div className="verify-result-card verify-card-error">
            <div className="verify-status-icon error">
              <IconBan size={40} />
            </div>
            <h2 className="verify-status-title">Certificate Not Found or Invalid</h2>
            <p className="verify-status-desc">
              The credential code you entered could not be verified in the registry. Please check for typos and verify you have the correct certificate number or 10-character code.
            </p>
          </div>
        )}

        {!loading && result && (
          <div className={`verify-result-card ${result.isValid ? 'verify-card-success' : 'verify-card-revoked'}`}>
            {/* Status Header Banner */}
            <div className="verify-header-banner">
              {result.isValid ? (
                <>
                  <div className="verify-status-badge valid">
                    <IconCheckCircle size={22} />
                    <span>AUTHENTIC & VALID CREDENTIAL</span>
                  </div>
                  <p className="verify-banner-sub">This certificate is actively verified and recorded in the national outcome registry.</p>
                </>
              ) : (
                <>
                  <div className="verify-status-badge revoked">
                    <IconBan size={22} />
                    <span>CREDENTIAL REVOKED</span>
                  </div>
                  <p className="verify-banner-sub">This certificate was previously issued but has been revoked by administrators.</p>
                </>
              )}
            </div>

            {/* Credential Data Summary */}
            <div className="verify-details-grid">
              <div className="verify-detail-item">
                <span className="verify-item-label">CERTIFIED TRAINEE</span>
                <span className="verify-item-value highlight">{result.traineeName}</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-item-label">COURSE COMPLETED</span>
                <span className="verify-item-value">{result.courseName}</span>
                {result.courseCategory && <span className="verify-sub-info">Domain: {result.courseCategory}</span>}
              </div>

              <div className="verify-detail-item">
                <span className="verify-item-label">TRAINING PROVIDER</span>
                <span className="verify-item-value">{result.providerName}</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-item-label">TRAINING BATCH</span>
                <span className="verify-item-value">{result.batchName} ({result.batchMode})</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-item-label">DATE OF ISSUANCE</span>
                <span className="verify-item-value">{formatDate(result.issueDate)}</span>
              </div>

              <div className="verify-detail-item">
                <span className="verify-item-label">CERTIFICATE NUMBER</span>
                <span className="verify-item-value font-mono">{result.certificateNumber}</span>
              </div>
            </div>

            {result.skills && result.skills.length > 0 && (
              <div className="verify-skills-row">
                <span className="verify-skills-title">
                  <IconAward size={16} /> Verified Competencies:
                </span>
                <div className="skill-tags">
                  {result.skills.map((s, i) => (
                    <span key={i} className="skill-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="verify-card-footer">
              <span className="verify-code-pill font-mono">Verification Code: {result.verificationCode}</span>
              <span className="verify-privacy-notice">Privacy protected credential verification record</span>
            </div>
          </div>
        )}
      </main>

      <footer className="verify-footer">
        <p>© 2026 SkillTracker Platform • Public Credential Verification Engine</p>
      </footer>
    </div>
  );
};
