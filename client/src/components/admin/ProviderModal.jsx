import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IconCheckCircle } from '../common/Icons';

export const ProviderModal = ({
  isOpen,
  onClose,
  onSubmit,
  provider = null,
  loading = false,
}) => {
  const isEdit = !!provider;

  const [formData, setFormData] = useState({
    organizationName: '',
    contactPerson: '',
    phone: '',
    address: '',
    name: '',
    email: '',
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (provider) {
      setFormData({
        organizationName: provider.organizationName || '',
        contactPerson: provider.contactPerson || '',
        phone: provider.phone || '',
        address: provider.address || '',
        name: provider.userId?.name || '',
        email: provider.userId?.email || '',
        username: provider.userId?.username || '',
        password: '',
      });
    } else {
      setFormData({
        organizationName: '',
        contactPerson: '',
        phone: '',
        address: '',
        name: '',
        email: '',
        username: '',
        password: '',
      });
    }
    setErrors({});
  }, [provider, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.organizationName.trim()) errs.organizationName = 'Organization name is required';
    if (!formData.contactPerson.trim()) errs.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    if (!formData.name.trim()) errs.name = 'Account holder name is required';

    if (!isEdit) {
      if (!formData.username.trim()) errs.username = 'Username is required';
      if (!formData.password) errs.password = 'Password is required';
      else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Training Provider' : 'Register New Training Provider'}
      subtitle={
        isEdit
          ? `Update details for ${provider?.organizationName}`
          : 'Create a training provider organization and user login credentials'
      }
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-section-title">Organization Information</div>

        <div className="form-group">
          <label className="form-label" htmlFor="organizationName">
            Organization / Center Name *
          </label>
          <input
            id="organizationName"
            type="text"
            className={`form-input ${errors.organizationName ? 'input-error' : ''}`}
            placeholder="e.g. Apex Skill Development Hub"
            value={formData.organizationName}
            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
          />
          {errors.organizationName && <span className="field-error">{errors.organizationName}</span>}
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="contactPerson">
              Contact Person *
            </label>
            <input
              id="contactPerson"
              type="text"
              className={`form-input ${errors.contactPerson ? 'input-error' : ''}`}
              placeholder="e.g. Sarah Jenkins"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
            {errors.contactPerson && <span className="field-error">{errors.contactPerson}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
              placeholder="e.g. +1 555-0199"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="address">
            Physical / Center Address
          </label>
          <input
            id="address"
            type="text"
            className="form-input"
            placeholder="e.g. 104 Innovation Boulevard, Tech District"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="form-section-title">Login & Account Details</div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Account Representative Name *
            </label>
            <input
              id="name"
              type="text"
              className={`form-input ${errors.name ? 'input-error' : ''}`}
              placeholder="e.g. Sarah Jenkins"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address (Optional)
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="sarah@apexskills.org"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        {!isEdit && (
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Login Username *
              </label>
              <input
                id="username"
                type="text"
                className={`form-input ${errors.username ? 'input-error' : ''}`}
                placeholder="e.g. apexskills"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Initial Password *
              </label>
              <input
                id="password"
                type="password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
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
            {isEdit ? 'Save Changes' : 'Create Provider'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
