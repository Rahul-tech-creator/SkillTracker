import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IconCheckCircle } from '../common/Icons';

export const EnrollmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  trainees = [],
  batches = [],
  loading = false,
}) => {
  const [traineeId, setTraineeId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setTraineeId(trainees.length > 0 ? trainees[0]._id : '');
    setBatchId(batches.length > 0 ? batches[0]._id : '');
    setErrors({});
  }, [isOpen, trainees, batches]);

  const selectedBatch = batches.find((b) => b._id === batchId);

  const validate = () => {
    const errs = {};
    if (!traineeId) errs.traineeId = 'Please select a trainee';
    if (!batchId) errs.batchId = 'Please select a training batch';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ traineeId, batchId });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll Trainee in Batch"
      subtitle="Assign an enrolled student to an active or upcoming training cohort"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-group">
          <label className="form-label" htmlFor="traineeSelect">
            Select Trainee Student *
          </label>
          <select
            id="traineeSelect"
            className={`form-select ${errors.traineeId ? 'input-error' : ''}`}
            value={traineeId}
            onChange={(e) => setTraineeId(e.target.value)}
          >
            <option value="">-- Choose a registered trainee --</option>
            {trainees.map((t) => (
              <option key={t._id} value={t._id}>
                {t.userId?.name || 'Trainee'} (@{t.userId?.username})
              </option>
            ))}
          </select>
          {errors.traineeId && <span className="field-error">{errors.traineeId}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="batchSelect">
            Target Batch Cohort *
          </label>
          <select
            id="batchSelect"
            className={`form-select ${errors.batchId ? 'input-error' : ''}`}
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            <option value="">-- Choose batch cohort --</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.batchName} — {b.courseId?.courseName || 'Course'} ({b.mode})
              </option>
            ))}
          </select>
          {errors.batchId && <span className="field-error">{errors.batchId}</span>}
        </div>

        {selectedBatch && (
          <div className="enrollment-preview-box">
            <h4 className="preview-heading">Batch Summary</h4>
            <div className="preview-grid">
              <div className="preview-item">
                <span className="preview-label">Course:</span>
                <span className="preview-value">{selectedBatch.courseId?.courseName || '—'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Mode:</span>
                <span className="preview-value">{selectedBatch.mode}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Status:</span>
                <span className="preview-value">{selectedBatch.status}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Capacity:</span>
                <span className="preview-value">{selectedBatch.capacity || 'Unlimited'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={IconCheckCircle}
          >
            Confirm Enrollment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
