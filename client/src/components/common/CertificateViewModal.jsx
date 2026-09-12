import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import {
  IconCertificate,
  IconPrinter,
  IconCopy,
  IconExternalLink,
  IconShield,
  IconCheckCircle,
  IconBan,
} from './Icons';
import { formatDate } from '../../utils/helpers';

export const CertificateViewModal = ({ isOpen, onClose, certificate }) => {
  const [copied, setCopied] = useState(false);

  if (!certificate) return null;

  const traineeName =
    certificate.traineeId?.userId?.name ||
    certificate.traineeName ||
    'Certified Trainee';
  const courseName =
    certificate.courseId?.courseName ||
    certificate.courseName ||
    'Skilling Program';
  const category = certificate.courseId?.category || certificate.courseCategory || '';
  const batchName =
    certificate.batchId?.batchName || certificate.batchName || 'Cohort';
  const mode = certificate.batchId?.mode || certificate.batchMode || 'OFFLINE';
  const providerName =
    certificate.providerId?.organizationName ||
    certificate.providerName ||
    'Authorized Training Provider';
  const certNumber = certificate.certificateNumber;
  const verificationCode = certificate.verificationCode;
  const issueDate = certificate.issueDate;
  const isRevoked = certificate.status === 'REVOKED';

  const verificationUrl = `${window.location.origin}/verify-certificate/${verificationCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verified Digital Credential"
      subtitle={`Certificate ID: ${certNumber}`}
      maxWidth="780px"
    >
      <div className="certificate-modal-wrapper">
        {/* Certificate Paper Element for Display and Print */}
        <div id="printable-certificate" className={`certificate-paper ${isRevoked ? 'cert-revoked' : ''}`}>
          <div className="cert-border-outer">
            <div className="cert-border-inner">
              {/* Header Seal */}
              <div className="cert-header">
                <div className="cert-seal">
                  <IconCertificate size={36} />
                </div>
                <span className="cert-organization-label">NATIONAL SKILLING OUTCOME REGISTRY</span>
                <h1 className="cert-main-title">CERTIFICATE OF COMPLETION</h1>
                <div className="cert-divider-line"></div>
              </div>

              {/* Body */}
              <div className="cert-body">
                <p className="cert-intro">This is to certify that</p>
                <h2 className="cert-trainee-name">{traineeName}</h2>
                <p className="cert-fulfillment">
                  has successfully fulfilled all curriculum requirements, practical competencies, and evaluations for
                </p>
                <h3 className="cert-course-name">{courseName}</h3>
                {category && <p className="cert-course-category">Domain Focus: {category}</p>}

                <div className="cert-metadata-row">
                  <div className="cert-meta-block">
                    <span className="cert-meta-label">TRAINING COHORT</span>
                    <span className="cert-meta-value">{batchName} ({mode})</span>
                  </div>
                  <div className="cert-meta-block">
                    <span className="cert-meta-label">TRAINING PROVIDER</span>
                    <span className="cert-meta-value">{providerName}</span>
                  </div>
                  <div className="cert-meta-block">
                    <span className="cert-meta-label">DATE OF ISSUANCE</span>
                    <span className="cert-meta-value">{formatDate(issueDate)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Credentials & Status Stamp */}
              <div className="cert-footer">
                <div className="cert-verification-details">
                  <div className="cert-code-group">
                    <span className="cert-code-label">CERTIFICATE NUMBER:</span>
                    <span className="cert-code-val font-mono">{certNumber}</span>
                  </div>
                  <div className="cert-code-group">
                    <span className="cert-code-label">VERIFICATION CODE:</span>
                    <span className="cert-code-val font-mono">{verificationCode}</span>
                  </div>
                </div>

                <div className="cert-stamp-box">
                  {isRevoked ? (
                    <div className="stamp-revoked">
                      <IconBan size={20} />
                      <span>REVOKED</span>
                    </div>
                  ) : (
                    <div className="stamp-valid">
                      <IconShield size={20} />
                      <span>VERIFIED & VALID</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="certificate-modal-toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopyLink}
            >
              <IconCopy size={14} />
              {copied ? 'Link Copied!' : 'Copy Verification Link'}
            </button>
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              <IconExternalLink size={14} />
              Verify Public Page
            </a>
          </div>

          <div className="toolbar-right">
            <Button
              variant="primary"
              size="sm"
              icon={IconPrinter}
              onClick={handlePrint}
            >
              Print / Save PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
