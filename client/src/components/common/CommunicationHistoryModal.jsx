import React, { useState, useEffect } from 'react';
import { followUpService } from '../../services/api';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import {
  IconHistory,
  IconPhoneCall,
  IconMail,
  IconWhatsApp,
  IconFlag,
  IconUserX,
  IconCheckCircle,
  IconShield,
  IconClock,
} from './Icons';
import { formatDate } from '../../utils/helpers';

export const CommunicationHistoryModal = ({ isOpen, onClose, followUpId, traineeName }) => {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState({ timeline: [], calls: [], consents: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && followUpId) {
      fetchHistory();
    }
  }, [isOpen, followUpId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await followUpService.getHistory(followUpId);
      if (res.data.success) {
        setHistoryData(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load communication history');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action, channel) => {
    if (channel === 'WHATSAPP') return <IconWhatsApp size={16} className="text-emerald-500" />;
    if (channel === 'EMAIL') return <IconMail size={16} className="text-blue-500" />;
    if (channel === 'PHONE_CALL') return <IconPhoneCall size={16} className="text-amber-500" />;
    if (channel === 'GOVERNMENT' || action.includes('GOVERNMENT')) return <IconFlag size={16} className="text-rose-500" />;
    if (action === 'OPTED_OUT') return <IconUserX size={16} className="text-purple-500" />;
    if (action === 'TRAINEE_RESPONDED' || action === 'RETURNED') return <IconCheckCircle size={16} className="text-emerald-500" />;
    return <IconClock size={16} className="text-muted" />;
  };

  const getActionBadge = (action) => {
    if (action.includes('GOVERNMENT')) return <Badge status="danger" text={action.replace(/_/g, ' ')} />;
    if (action === 'TRAINEE_RESPONDED' || action === 'RETURNED') return <Badge status="success" text={action.replace(/_/g, ' ')} />;
    if (action === 'CALL_LOGGED' || action === 'ESCALATED_TO_CALL') return <Badge status="warning" text={action.replace(/_/g, ' ')} />;
    if (action === 'OPTED_OUT') return <Badge status="neutral" text={action.replace(/_/g, ' ')} />;
    return <Badge status="info" text={action.replace(/_/g, ' ')} />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Communication & Escalation History"
      subtitle={`Complete auditable timeline for ${traineeName || 'Trainee'}`}
    >
      <div className="comm-history-modal-body">
        {loading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="md" message="Loading interaction timeline..." />
          </div>
        ) : error ? (
          <div className="alert-box alert-error">{error}</div>
        ) : historyData.timeline.length === 0 ? (
          <div className="empty-history-state py-8 text-center text-muted">
            <IconHistory size={36} className="mx-auto mb-2 opacity-50" />
            <p>No communication actions recorded yet for this follow-up.</p>
          </div>
        ) : (
          <div className="comm-timeline-container">
            <div className="comm-timeline">
              {historyData.timeline.map((item, idx) => (
                <div key={item._id || idx} className="comm-timeline-item">
                  <div className="comm-timeline-icon">
                    {getActionIcon(item.action, item.channel)}
                  </div>
                  <div className="comm-timeline-content">
                    <div className="comm-timeline-header">
                      <div className="comm-timeline-title">
                        {getActionBadge(item.action)}
                        <span className="comm-channel-tag">{item.channel}</span>
                      </div>
                      <span className="comm-timestamp">{formatDate(item.timestamp)}</span>
                    </div>

                    <p className="comm-notes">{item.notes}</p>

                    {item.outcome && (
                      <div className="comm-meta-row">
                        <span className="text-xs text-muted font-mono">Outcome: {item.outcome}</span>
                      </div>
                    )}

                    <div className="comm-performer">
                      <span className="text-xs text-muted">Logged by: {item.performedByName || 'System Automation'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions-end mt-6">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
