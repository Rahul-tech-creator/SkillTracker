import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IconKey } from '../common/Icons';

export const ResetPasswordModal = ({
  isOpen,
  onClose,
  onSubmit,
  provider = null,
  loading = false,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  }, [isOpen, provider]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    onSubmit(newPassword);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Provider Password"
      subtitle={`Set a new login password for ${provider?.organizationName} (@${provider?.userId?.username})`}
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-group">
          <label className="form-label" htmlFor="newPassword">
            New Password *
          </label>
          <input
            id="newPassword"
            type="password"
            className={`form-input ${error ? 'input-error' : ''}`}
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirmPassword">
            Confirm New Password *
          </label>
          <input
            id="confirmPassword"
            type="password"
            className={`form-input ${error ? 'input-error' : ''}`}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <span className="field-error">{error}</span>}
        </div>

        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={IconKey}
          >
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
};
