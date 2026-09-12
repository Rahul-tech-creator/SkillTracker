import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { consentService } from '../../services/api';
import {
  IconShield,
  IconCheckCircle,
  IconXCircle,
  IconAward,
} from '../common/Icons';

export const ConsentModal = ({ isOpen, onClose, eligibleItem, onConsentDecided }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!eligibleItem) return null;

  const { enrollment, certificate } = eligibleItem;
  const courseName = enrollment?.courseId?.courseName || 'Completed Skilling Program';
  const providerName = enrollment?.providerId?.organizationName || 'Authorized Training Provider';

  const handleDecision = async (status) => {
    try {
      setLoading(true);
      setError('');
      const res = await consentService.submit({
        enrollmentId: enrollment._id,
        certificateId: certificate?._id,
        status, // 'GRANTED' or 'DECLINED'
        consentVersion: 'v1.0',
      });

      if (res.data.success) {
        if (onConsentDecided) {
          onConsentDecided(res.data);
        }
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to record consent decision.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Post-Training Outcome Tracking"
      subtitle={`Program: ${courseName} (${providerName})`}
      maxWidth="620px"
    >
      <div className="consent-modal-body">
        {error && <div className="form-error-alert">{error}</div>}

        <div className="consent-badge-header">
          <div className="consent-icon-seal">
            <IconShield size={32} />
          </div>
          <span className="consent-tag">OFFICIAL SKILLING OUTCOME REGISTRY</span>
        </div>

        <div className="consent-card-content">
          <h2 className="consent-title">Your training has been completed successfully!</h2>
          <p className="consent-paragraph">
            We would like to periodically ask about your <strong>employment</strong>,{' '}
            <strong>self-employment</strong>, <strong>apprenticeship</strong>, job retention, and how
            useful your training has been.
          </p>
          <p className="consent-paragraph">
            Your responses help us understand the long-term impact of training programmes and
            guide government and industry initiatives.
          </p>
          <div className="consent-privacy-box">
            <IconShield size={16} className="text-primary" />
            <span>This information will be handled strictly according to the system's privacy rules.</span>
          </div>
        </div>

        <div className="consent-modal-actions">
          <Button
            variant="success"
            icon={IconCheckCircle}
            onClick={() => handleDecision('GRANTED')}
            disabled={loading}
            className="consent-agree-btn"
          >
            {loading ? 'Submitting...' : 'I Agree'}
          </Button>
          <Button
            variant="outline"
            icon={IconXCircle}
            onClick={() => handleDecision('DECLINED')}
            disabled={loading}
            className="consent-decline-btn"
          >
            I Do Not Agree
          </Button>
        </div>
      </div>
    </Modal>
  );
};
