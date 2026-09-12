import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentService, skillGapService } from '../../services/api';
import {
  IconClipboard,
  IconClock,
  IconAlertCircle,
  IconCheck,
  IconArrowRight,
  IconCheckCircle,
  IconAward,
} from '../../components/common/Icons';

export const TraineeTakeAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionId]: 'A' }
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    startOrResumeAttempt();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const startOrResumeAttempt = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await assessmentService.start(id);
      if (res.data?.success) {
        const { attempt: att, questions: qs } = res.data.data;
        setAttempt(att);
        setQuestions(qs || []);

        // Load assessment details for metadata
        try {
          const aRes = await assessmentService.getById(id);
          setAssessment(aRes.data?.data);
        } catch (e) {
          console.warn('Metadata load optional error:', e);
        }

        // Pre-fill answers if resuming in-progress attempt
        if (att.answers && att.answers.length > 0) {
          const loaded = {};
          att.answers.forEach((ans) => {
            if (ans.selectedAnswer) loaded[ans.questionId] = ans.selectedAnswer;
          });
          setSelectedAnswers(loaded);
        }

        // Initialize Timer if timeLimitMinutes is set
        const timeLimit = att.timeLimitMinutes || assessment?.timeLimitMinutes;
        if (timeLimit) {
          const totalSecs = timeLimit * 60;
          const elapsedSecs = Math.floor((new Date() - new Date(att.startedAt)) / 1000);
          const remaining = Math.max(0, totalSecs - elapsedSecs);
          setTimeLeft(remaining);

          timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                clearInterval(timerRef.current);
                handleAutoSubmit();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to start assessment.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionLabel) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionLabel,
    }));
  };

  const handleAutoSubmit = () => {
    alert('Time limit reached! Submitting your answers automatically...');
    handleSubmitAssessment();
  };

  const handleSubmitAssessment = async () => {
    if (!attempt) {
      alert('Unable to locate active assessment attempt. Please refresh or retake.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      if (timerRef.current) clearInterval(timerRef.current);

      const answersPayload = questions.map((q) => ({
        questionId: q.questionId,
        selectedAnswer: selectedAnswers[q.questionId] || null,
      }));

      const res = await assessmentService.submit(id, {
        attemptId: attempt._id,
        answers: answersPayload,
      });

      if (res.data?.success) {
        // Trigger skill gap & Grok AI analysis immediately
        try {
          await skillGapService.analyze(attempt._id);
        } catch (aiErr) {
          console.warn('Auto-trigger skill gap analysis non-blocking:', aiErr);
        }

        setShowConfirmModal(false);
        navigate('/trainee/skill-report');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit assessment.';
      setErrorMsg(msg);
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const formatTimer = (secs) => {
    if (secs == null) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto', padding: '2.5rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '40px', height: '40px', borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Preparing Assessment Environment
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Initializing secure session and loading verified competency questions...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg && !attempt) {
    return (
      <div className="page-container" style={{ padding: '4rem 1rem' }}>
        <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto', padding: '2.5rem', textAlign: 'center' }}>
          <IconAlertCircle size={44} color="#C2413B" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Assessment Session Notice
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            {errorMsg}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/trainee/assessments')}>
            Return to Assessments Hub
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalCount = questions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="page-container" style={{ maxWidth: '940px', margin: '0 auto', paddingBottom: '4rem' }}>
      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quiz Top Glass Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem 1.75rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '4px solid var(--primary)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              <IconAward size={13} style={{ marginRight: '4px' }} />
              Official Examination
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Session ID: {attempt?._id?.toString().substring(0, 8)}...
            </span>
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
            {assessment?.title || 'Technical Competency Assessment'}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {timeLeft !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: timeLeft < 180 ? 'rgba(194, 65, 59, 0.1)' : 'var(--active-nav-bg)',
                color: timeLeft < 180 ? '#C2413B' : 'var(--primary)',
                fontWeight: '700',
                fontSize: '0.9rem',
                border: `1px solid ${timeLeft < 180 ? 'rgba(194, 65, 59, 0.3)' : 'var(--border-strong)'}`,
              }}
            >
              <IconClock size={16} />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Finish & Submit Exam'}
          </button>
        </div>
      </div>

      {/* Progress & Palette Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Exam Progress: <strong style={{ color: 'var(--primary)' }}>{answeredCount}</strong> of <strong>{totalCount}</strong> answered ({progressPercent}%)
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Question {currentIdx + 1} of {totalCount}
          </span>
        </div>

        {/* Progress Bar Track */}
        <div style={{ height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #2F855A 0%, #166534 100%)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Question Numbers Jump Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {questions.map((q, idx) => {
            const isAnswered = !!selectedAnswers[q.questionId];
            const isCurrent = idx === currentIdx;

            return (
              <button
                key={q.questionId}
                onClick={() => setCurrentIdx(idx)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: isCurrent
                    ? '2px solid var(--primary)'
                    : isAnswered
                    ? '1px solid #166534'
                    : '1px solid var(--border-color)',
                  backgroundColor: isCurrent
                    ? 'var(--active-nav-bg)'
                    : isAnswered
                    ? '#166534'
                    : 'var(--bg-surface)',
                  color: isCurrent
                    ? 'var(--primary)'
                    : isAnswered
                    ? '#FFFFFF'
                    : 'var(--text-primary)',
                  fontWeight: isCurrent || isAnswered ? '700' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(22, 101, 52, 0.15)' : 'none',
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main MCQ Question Card */}
      {currentQ && (
        <div
          className="glass-card"
          style={{
            padding: '2rem 2.25rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
              Skill Domain: {currentQ.skillName}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Weightage: {currentQ.marks || 1} mark(s)
            </span>
          </div>

          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              marginBottom: '1.75rem',
            }}
          >
            <span style={{ color: 'var(--primary)', fontWeight: '700', marginRight: '6px' }}>Q{currentIdx + 1}.</span>
            {currentQ.questionText}
          </h3>

          {/* Options Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2.25rem' }}>
            {currentQ.options?.map((opt) => {
              const isSelected = selectedAnswers[currentQ.questionId] === opt.label;

              return (
                <div
                  key={opt.label}
                  onClick={() => handleSelectOption(currentQ.questionId, opt.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'var(--active-nav-bg)' : 'var(--bg-surface)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? '0 4px 12px rgba(22, 101, 52, 0.08)' : 'var(--shadow-xs)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {opt.label}
                  </div>
                  <span
                    style={{
                      fontSize: '0.95rem',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? '600' : 'normal',
                      lineHeight: '1.5',
                    }}
                  >
                    {opt.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Stepper Navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1.5rem',
            }}
          >
            <button
              className="btn btn-secondary"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => prev - 1)}
            >
              ← Previous Question
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              {currentIdx < questions.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentIdx((prev) => prev + 1)}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={submitting}
                >
                  Review & Submit Exam ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div
            className="modal-content glass-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Ready to Submit Assessment?</h3>
                <p className="modal-subtitle">Review your completion status</p>
              </div>
              <button className="btn-close" onClick={() => setShowConfirmModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: answeredCount < totalCount ? 'rgba(183, 121, 31, 0.08)' : 'var(--active-nav-bg)',
                  borderRadius: '8px',
                  border: `1px solid ${answeredCount < totalCount ? 'rgba(183, 121, 31, 0.3)' : 'var(--border-strong)'}`,
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Questions Answered:</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {answeredCount} of {totalCount}
                  </strong>
                </div>
                {answeredCount < totalCount && (
                  <p style={{ fontSize: '0.8rem', color: '#B7791F', margin: 0, fontWeight: '500' }}>
                    Notice: You have {totalCount - answeredCount} unanswered question(s). Unanswered questions will receive zero marks.
                  </p>
                )}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                Once submitted, your answers will be automatically evaluated against accredited competencies and your personal Skill Gap Diagnostic Report will be generated.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                Keep Reviewing
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitAssessment}
                disabled={submitting}
              >
                {submitting ? 'Finalizing Submission...' : 'Confirm & Finalize Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraineeTakeAssessment;
