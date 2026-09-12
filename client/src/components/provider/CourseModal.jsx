import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IconCheckCircle } from '../common/Icons';

export const CourseModal = ({
  isOpen,
  onClose,
  onSubmit,
  course = null,
  loading = false,
}) => {
  const isEdit = !!course;

  const [formData, setFormData] = useState({
    courseName: '',
    description: '',
    category: '',
    duration: '',
    skillsInput: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (course) {
      setFormData({
        courseName: course.courseName || '',
        description: course.description || '',
        category: course.category || '',
        duration: course.duration || '',
        skillsInput: Array.isArray(course.skills)
          ? course.skills.map((s) => (typeof s === 'string' ? s : s.skillName)).join(', ')
          : '',
      });
    } else {
      setFormData({
        courseName: '',
        description: '',
        category: '',
        duration: '',
        skillsInput: '',
      });
    }
    setErrors({});
  }, [course, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.courseName.trim()) errs.courseName = 'Course name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const skills = formData.skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSubmit({
      courseName: formData.courseName.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      duration: formData.duration.trim(),
      skills,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Training Course' : 'Create New Training Course'}
      subtitle={
        isEdit
          ? `Modify details for ${course?.courseName}`
          : 'Define curriculum, category, duration, and targeted skill outcomes'
      }
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-group">
          <label className="form-label" htmlFor="courseName">
            Course Title *
          </label>
          <input
            id="courseName"
            type="text"
            className={`form-input ${errors.courseName ? 'input-error' : ''}`}
            placeholder="e.g. Full-Stack Web Development Bootcamp"
            value={formData.courseName}
            onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
          />
          {errors.courseName && <span className="field-error">{errors.courseName}</span>}
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="category">
              Domain / Category
            </label>
            <input
              id="category"
              type="text"
              className="form-input"
              placeholder="e.g. Information Technology, Healthcare"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="duration">
              Duration / Timeline
            </label>
            <input
              id="duration"
              type="text"
              className="form-input"
              placeholder="e.g. 12 Weeks (300 Hours)"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="skillsInput">
            Target Skills (comma separated)
          </label>
          <input
            id="skillsInput"
            type="text"
            className="form-input"
            placeholder="e.g. JavaScript, React, Node.js, REST APIs"
            value={formData.skillsInput}
            onChange={(e) => setFormData({ ...formData, skillsInput: e.target.value })}
          />
          <span className="field-hint">Separate skills with commas. These appear as tags on the course.</span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">
            Course Description & Objectives
          </label>
          <textarea
            id="description"
            rows="4"
            className="form-textarea"
            placeholder="Briefly outline what trainees will learn, prerequisites, and expected outcomes..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          ></textarea>
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
            {isEdit ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
