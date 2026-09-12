import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IconCheckCircle, IconShield } from '../common/Icons';

export const TraineeModal = ({
  isOpen,
  onClose,
  onSubmit,
  trainee = null,
  loading = false,
}) => {
  const isEdit = !!trainee;

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    location: '',
    educationLevel: 'GRADUATE',
    governmentIdType: 'AADHAAR',
    aadhaarNumber: '',
    status: 'ACTIVE',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (trainee) {
      setFormData({
        name: trainee.userId?.name || '',
        username: trainee.userId?.username || '',
        password: '',
        email: trainee.userId?.email || '',
        phone: trainee.phone || '',
        dateOfBirth: trainee.dateOfBirth ? trainee.dateOfBirth.substring(0, 10) : '',
        gender: trainee.gender || '',
        location: trainee.location || '',
        educationLevel: trainee.educationLevel || 'GRADUATE',
        governmentIdType: trainee.governmentIdType || 'AADHAAR',
        aadhaarNumber: trainee.maskedAadhaar || '',
        status: trainee.status || 'ACTIVE',
      });
    } else {
      setFormData({
        name: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        location: '',
        educationLevel: 'GRADUATE',
        governmentIdType: 'AADHAAR',
        aadhaarNumber: '',
        status: 'ACTIVE',
      });
    }
    setErrors({});
  }, [trainee, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';

    if (!isEdit) {
      if (!formData.username.trim()) errs.username = 'Username is required';
      if (!formData.password) errs.password = 'Password is required';
      else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    }

    if (formData.governmentIdType === 'AADHAAR' && formData.aadhaarNumber) {
      const clean = formData.aadhaarNumber.replace(/[\s-]/g, '');
      // If editing and already masked e.g. XXXX-XXXX-1234, that's fine
      if (!clean.includes('X') && !/^\d{12}$/.test(clean)) {
        errs.aadhaarNumber = 'Aadhaar must be exactly 12 numeric digits';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim(),
      dateOfBirth: formData.dateOfBirth || null,
      gender: formData.gender,
      location: formData.location.trim(),
      educationLevel: formData.educationLevel,
      governmentIdType: formData.governmentIdType,
    };

    if (formData.aadhaarNumber && !formData.aadhaarNumber.includes('X')) {
      payload.aadhaarNumber = formData.aadhaarNumber.replace(/[\s-]/g, '');
    }

    if (!isEdit) {
      payload.username = formData.username.trim();
      payload.password = formData.password;
    } else {
      payload.status = formData.status;
    }

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Trainee Profile' : 'Register New Trainee'}
      subtitle={
        isEdit
          ? `Update records for ${trainee?.userId?.name || 'Trainee'}`
          : 'Enroll a trainee student and provide credentials & identity details'
      }
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-section-title">Personal & Contact Details</div>

        <div className="form-group">
          <label className="form-label" htmlFor="traineeName">
            Full Name *
          </label>
          <input
            id="traineeName"
            type="text"
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            placeholder="e.g. Rahul Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="traineeEmail">
              Email Address
            </label>
            <input
              id="traineeEmail"
              type="email"
              className="form-input"
              placeholder="rahul@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="traineePhone">
              Phone Number
            </label>
            <input
              id="traineePhone"
              type="tel"
              className="form-input"
              placeholder="9848010001"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label" htmlFor="dateOfBirth">
              Date of Birth
            </label>
            <input
              id="dateOfBirth"
              type="date"
              className="form-input"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              className="form-select"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">-- Select --</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">
              City / Location
            </label>
            <input
              id="location"
              type="text"
              className="form-input"
              placeholder="e.g. Vijayawada"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
        </div>

        <div className="form-section-title flex items-center gap-2">
          <IconShield size={16} className="text-primary" />
          <span>Identity & Government Verification Reference</span>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="governmentIdType">
              Government ID Type
            </label>
            <select
              id="governmentIdType"
              className="form-select"
              value={formData.governmentIdType}
              onChange={(e) => setFormData({ ...formData, governmentIdType: e.target.value })}
            >
              <option value="AADHAAR">Aadhaar Card (12 Digits)</option>
              <option value="VOTER_ID">Voter ID</option>
              <option value="PAN">PAN Card</option>
              <option value="NONE">None</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="aadhaarNumber">
              {formData.governmentIdType === 'AADHAAR' ? 'Aadhaar Number (12 Digits)' : 'Identity Document Number'}
            </label>
            <input
              id="aadhaarNumber"
              type="text"
              maxLength={formData.governmentIdType === 'AADHAAR' ? 14 : 20}
              className={`form-input font-mono ${errors.aadhaarNumber ? 'input-error' : ''}`}
              placeholder={formData.governmentIdType === 'AADHAAR' ? 'XXXX-XXXX-1234 or 12 digits' : 'ID Number'}
              value={formData.aadhaarNumber}
              onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
            />
            {errors.aadhaarNumber && <span className="field-error">{errors.aadhaarNumber}</span>}
            <span className="text-xs text-muted mt-1 block">
              Identity data is strictly masked and encrypted. Raw numbers are never exposed in UI or logs.
            </span>
          </div>
        </div>

        {!isEdit && (
          <>
            <div className="form-section-title">Login Credentials</div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="traineeUsername">
                  Login Username *
                </label>
                <input
                  id="traineeUsername"
                  type="text"
                  className={`form-input ${errors.username ? 'input-error' : ''}`}
                  placeholder="e.g. rahul"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                {errors.username && <span className="field-error">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="traineePassword">
                  Initial Password *
                </label>
                <input
                  id="traineePassword"
                  type="password"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
            </div>
          </>
        )}

        {isEdit && (
          <div className="form-group">
            <label className="form-label" htmlFor="traineeStatus">
              Account Status
            </label>
            <select
              id="traineeStatus"
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
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
            {isEdit ? 'Save Changes' : 'Register Trainee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
