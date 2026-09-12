import React, { useEffect } from 'react';
import { IconCheckCircle, IconAlertCircle, IconClose } from './Icons';

export const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast-notification toast-${type}`}>
      <div className="toast-icon">
        {type === 'success' ? (
          <IconCheckCircle size={18} />
        ) : (
          <IconAlertCircle size={18} />
        )}
      </div>
      <div className="toast-content">{message}</div>
      <button className="toast-close" onClick={onClose} aria-label="Close notification">
        <IconClose size={14} />
      </button>
    </div>
  );
};
