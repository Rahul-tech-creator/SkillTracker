import React from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  IconBookOpen,
  IconCalendar,
  IconMapPin,
  IconBuilding,
  IconAward,
  IconCertificate,
  IconShield,
  IconEye,
  IconExternalLink,
} from '../common/Icons';
import { formatDate } from '../../utils/helpers';

export const TraineeEnrollmentCard = ({ enrollment, onViewCertificate }) => {
  const { batchId, courseId, providerId, status, enrollmentDate, certificate } = enrollment;

  const isCompleted = status === 'COMPLETED';
  const hasCertificate = !!certificate;
  const isRevoked = certificate?.status === 'REVOKED';

  return (
    <div className="trainee-course-card">
      <div className="trainee-card-top">
        <div className="trainee-course-header">
          <span className="course-category-pill">{courseId?.category || 'General Skill'}</span>
          <Badge>{status}</Badge>
        </div>

        <h3 className="trainee-course-title">{courseId?.courseName || 'Course'}</h3>
        <p className="trainee-batch-name">
          Cohort: <strong>{batchId?.batchName || 'Default Batch'}</strong>
        </p>

        {courseId?.description && (
          <p className="trainee-course-description">{courseId.description}</p>
        )}
      </div>

      <div className="trainee-card-details">
        <div className="detail-row">
          <div className="detail-item">
            <IconCalendar size={16} className="detail-icon" />
            <span>
              {formatDate(batchId?.startDate)} → {formatDate(batchId?.endDate)}
            </span>
          </div>
          <div className="detail-item">
            <Badge type="mode">{batchId?.mode || 'OFFLINE'}</Badge>
          </div>
        </div>

        {batchId?.location && (
          <div className="detail-item full-width">
            <IconMapPin size={16} className="detail-icon" />
            <span>{batchId.location}</span>
          </div>
        )}

        <div className="detail-item full-width provider-highlight">
          <IconBuilding size={16} className="detail-icon" />
          <span>
            Provider: <strong>{providerId?.organizationName || 'Training Center'}</strong>
            {providerId?.phone && ` (${providerId.phone})`}
          </span>
        </div>

        {courseId?.skills && courseId.skills.length > 0 && (
          <div className="skills-section">
            <span className="skills-label">
              <IconAward size={14} /> Skills Targeted:
            </span>
            <div className="skill-tags">
              {courseId.skills.map((skill, i) => (
                <span key={i} className="skill-tag">
                  {typeof skill === 'string' ? skill : skill?.skillName || skill?.name || 'Skill'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certificate Section */}
        <div className="trainee-cert-section">
          {hasCertificate ? (
            <div className={`trainee-cert-box ${isRevoked ? 'cert-box-revoked' : 'cert-box-valid'}`}>
              <div className="cert-box-header">
                <div className="cert-box-title-row">
                  <IconCertificate size={18} className="cert-box-icon" />
                  <span className="cert-box-heading">
                    {isRevoked ? 'Certificate Revoked' : 'Official Certificate Issued'}
                  </span>
                </div>
                <span className={`badge ${isRevoked ? 'badge-danger' : 'badge-success'}`}>
                  {isRevoked ? 'REVOKED' : 'VALID'}
                </span>
              </div>

              <div className="cert-box-meta">
                <div className="cert-meta-item">
                  <span className="meta-k">Certificate Number:</span>
                  <span className="meta-v font-mono">{certificate.certificateNumber}</span>
                </div>
                <div className="cert-meta-item">
                  <span className="meta-k">Issue Date:</span>
                  <span className="meta-v">{formatDate(certificate.issueDate)}</span>
                </div>
              </div>

              <div className="cert-box-actions">
                <Button
                  variant="primary"
                  size="sm"
                  icon={IconEye}
                  onClick={() => onViewCertificate && onViewCertificate(certificate)}
                >
                  View Certificate
                </Button>
                <a
                  href={`/verify-certificate/${certificate.verificationCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <IconExternalLink size={14} /> Verify Online
                </a>
              </div>
            </div>
          ) : isCompleted ? (
            <div className="trainee-cert-box cert-box-pending">
              <div className="cert-box-header">
                <div className="cert-box-title-row">
                  <IconShield size={18} className="cert-box-icon text-amber" />
                  <span className="cert-box-heading text-amber">Certificate Pending</span>
                </div>
                <span className="badge badge-warning">Awaiting Provider</span>
              </div>
              <p className="cert-pending-desc">
                Your training has been completed! The training provider has not issued your official completion certificate yet.
              </p>
            </div>
          ) : (
            <div className="trainee-cert-box cert-box-progress">
              <span className="cert-progress-text">
                Complete training cohort to become eligible for verified certificate issuance.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="trainee-card-footer">
        <span className="enrolled-date">
          Enrolled on {formatDate(enrollmentDate)}
        </span>
      </div>
    </div>
  );
};
