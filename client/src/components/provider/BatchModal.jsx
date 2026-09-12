import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IconCheckCircle } from '../common/Icons';

export const BatchModal = ({
  isOpen,
  onClose,
  onSubmit,
  batch = null,
  courses = [],
  loading = false,
}) => {
  const isEdit = !!batch;

  const [formData, setFormData] = useState({
    courseId: '',
    batchName: '',
    startDate: '',
    endDate: '',
    capacity: '',
    location: '',
    mode: 'OFFLINE',
    status: 'UPCOMING',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (batch) {
      setFormData({
        courseId: batch.courseId?._id || batch.courseId || '',
        batchName: batch.batchName || '',
        startDate: batch.startDate ? batch.startDate.substring(0, 10) : '',
        endDate: batch.endDate ? batch.endDate.substring(0, 10) : '',
        capacity: batch.capacity ?? '',
        location: batch.location || '',
        mode: batch.mode || 'OFFLINE',
        status: batch.status || 'UPCOMING',
      });
    } else {
      setFormData({
        courseId: courses.length > 0 ? courses[0]._id : '',
        batchName: '',
        startDate: '',
        endDate: '',
        capacity: '',
        location: '',
        mode: 'OFFLINE',
        status: 'UPCOMING',
      });
    }
    setErrors({});
  }, [batch, courses, isOpen]);

  const validate = () => {
    const errs = {};
    if (!isEdit && !formData.courseId) errs.courseId = 'Please select a course';
    if (!formData.batchName.trim()) errs.batchName = 'Batch name is required';
    if (formData.capacity && isNaN(Number(formData.capacity))) {
      errs.capacity = 'Capacity must be a number';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      batchName: formData.batchName.trim(),
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      location: formData.location.trim(),
      mode: formData.mode,
      status: formData.status,
    };

    if (!isEdit) {
      payload.courseId = formData.courseId;
    }

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Training Batch' : 'Launch New Training Batch'}
      subtitle={
        isEdit
          ? `Modify details for ${batch?.batchName}`
          : 'Schedule a new cohort, specify dates, delivery mode and capacity'
      }
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} className="form-stack">
        {!isEdit && (
          <div className="form-group">
            <label className="form-label" htmlFor="courseId">
              Associated Course Curriculum *
            </label>
            <select
              id="courseId"
              className={`form-select ${errors.courseId ? 'input-error' : ''}`}
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
            >
              <option value="">-- Select Course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseName} ({c.category || 'General'})
                </option>
              ))}
            </select>
            {errors.courseId && <span className="field-error">{errors.courseId}</span>}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="batchName">
            Batch Name / Cohort Code *
          </label>
          <input
            id="batchName"
            type="text"
            className={`form-input ${errors.batchName ? 'input-error' : ''}`}
            placeholder="e.g. FSD-2024-Cohort-A"
            value={formData.batchName}
            onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
          />
          {errors.batchName && <span className="field-error">{errors.batchName}</span>}
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="startDate">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              className="form-input"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="endDate">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              className="form-input"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="mode">
              Training Delivery Mode
            </label>
            <select
              id="mode"
              className="form-select"
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
            >
              <option value="OFFLINE">Offline (In-Person)</option>
              <option value="ONLINE">Online (Virtual)</option>
              <option value="HYBRID">Hybrid (Blended)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="capacity">
              Student Capacity
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              className={`form-input ${errors.capacity ? 'input-error' : ''}`}
              placeholder="e.g. 30"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            />
            {errors.capacity && <span className="field-error">{errors.capacity}</span>}
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="location">
              Venue / Classroom / Link
            </label>
            <input
              id="location"
              type="text"
              className="form-input"
              placeholder="e.g. Lab 3B or Zoom Meeting"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {isEdit && (
            <div className="form-group">
              <label className="form-label" htmlFor="status">
                Batch Status
              </label>
              <select
                id="status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
        </div>

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
            {isEdit ? 'Save Changes' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
