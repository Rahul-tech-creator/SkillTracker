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
  IconShield,
  IconBrain,
  IconBookOpen,
} from '../../components/common/Icons';

export const TraineeTakeAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Primary State Machine:
  // 'LOADING' | 'CASE_STUDY' | 'SUBMITTING_CASE_STUDY_ANSWER' |
  // 'ANALYZING_CASE_STUDY' | 'PREPARING_ADAPTIVE' | 'ADAPTIVE' |
  // 'SUBMITTING_ADAPTIVE_ANSWER' | 'COMPLETED' | 'REPORT_GENERATING' | 'ERROR'
  const [phaseState, setPhaseState] = useState('LOADING');

  const [assessment, setAssessment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [caseStudy, setCaseStudy] = useState({ title: '', scenario: '' });
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);

  // Progress metrics
  const [caseStudyStep, setCaseStudyStep] = useState(1);
  const [totalCaseStudyQuestions, setTotalCaseStudyQuestions] = useState(5);
  const [adaptiveStep, setAdaptiveStep] = useState(1);
  const [totalAdaptiveTarget, setTotalAdaptiveTarget] = useState(5);

  const [timeLeft, setTimeLeft] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    startOrResumeAttempt();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const startOrResumeAttempt = async () => {
    try {
      setPhaseState('LOADING');
      setErrorMsg('');

      // 1. Fetch assessment metadata non-blockingly
      try {
        const aRes = await assessmentService.getById(id);
        if (aRes.data?.success) {
          setAssessment(aRes.data.data);
          if (aRes.data.data.caseStudy) {
            setCaseStudy(aRes.data.data.caseStudy);
          }
        }
      } catch (e) {
        console.warn('Metadata load non-blocking warning:', e);
      }

      // 2. Start or Resume assessment attempt
      const res = await assessmentService.start(id);
      if (res.data?.success) {
        const payload = res.data.data;
        const att = payload.attempt;
        setAttempt(att);

        if (att.status === 'SUBMITTED') {
          navigate('/trainee/skill-report');
          return;
        }

        if (payload.caseStudy) {
          setCaseStudy(payload.caseStudy);
        }

        const phase = payload.phase || att.currentPhase || 'CASE_STUDY';

        if (phase === 'CASE_STUDY') {
          setTotalCaseStudyQuestions(payload.totalCaseStudyQuestions || 5);
          setCaseStudyStep(payload.currentStep || (att.caseStudyResponses?.length || 0) + 1);

          if (payload.currentQuestion && payload.currentQuestion.questionText) {
            setCurrentQuestion(payload.currentQuestion);
            setPhaseState('CASE_STUDY');
          } else {
            // Case study questions may have all been answered, complete transition
            transitionToAdaptive(att._id);
          }
        } else if (phase === 'ANALYZING_CASE_STUDY' || phase === 'PREPARING_ADAPTIVE') {
          setTotalCaseStudyQuestions(payload.totalCaseStudyQuestions || 5);
          transitionToAdaptive(att._id);
        } else if (phase === 'ADAPTIVE') {
          setTotalAdaptiveTarget(payload.totalTarget || att.targetAdaptiveQuestions || 5);
          setAdaptiveStep(payload.currentStep || (att.adaptiveResponses?.length || 0) + 1);

          if (payload.currentQuestion && payload.currentQuestion.questionText) {
            setCurrentQuestion(payload.currentQuestion);
            setPhaseState('ADAPTIVE');
          } else if (payload.isComplete) {
            setPhaseState('COMPLETED');
          } else {
            // Adaptive question needs generation / retry
            handleRetryAdaptive(att._id);
          }
        } else if (phase === 'COMPLETED') {
          setPhaseState('COMPLETED');
        }

        // Initialize Timer if timeLimitMinutes is set
        const timeLimit = att.timeLimitMinutes || assessment?.timeLimitMinutes;
        if (timeLimit && !timerRef.current) {
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
      setPhaseState('ERROR');
    }
  };

  /**
   * Transition from Phase 1 to Phase 2
   */
  const transitionToAdaptive = async (attemptId) => {
    try {
      setPhaseState('ANALYZING_CASE_STUDY');
      setErrorMsg('');

      const res = await assessmentService.completeCaseStudy(id, {
        attemptId: attemptId || attempt?._id,
      });

      if (res.data?.success) {
        const payload = res.data.data;
        setAdaptiveStep(1);
        setTotalAdaptiveTarget(payload.totalTarget || 5);

        if (payload.currentQuestion && payload.currentQuestion.questionText) {
          setCurrentQuestion(payload.currentQuestion);
          setSelectedOption(null);
          setPhaseState('ADAPTIVE');
        } else {
          setErrorMsg('Initial adaptive question could not be prepared.');
          setPhaseState('ERROR');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error consolidating case study evidence.';
      setErrorMsg(msg);
      setPhaseState('ERROR');
    }
  };

  /**
   * Handle Phase 1 Case Study MCQ Submission
   */
  const handleSubmitCaseStudyAnswer = async () => {
    if (!selectedOption) {
      alert('Please select an option before continuing.');
      return;
    }
    if (!attempt || !currentQuestion) return;

    try {
      setPhaseState('SUBMITTING_CASE_STUDY_ANSWER');
      setErrorMsg('');

      const res = await assessmentService.answerCaseStudy(id, {
        attemptId: attempt._id,
        questionId: currentQuestion.questionId,
        selectedAnswer: selectedOption,
      });

      if (res.data?.success) {
        const data = res.data.data;
        setSelectedOption(null);

        if (data.isCaseStudyComplete) {
          // Transition directly to Adaptive Phase calibration
          await transitionToAdaptive(attempt._id);
        } else if (data.nextQuestion && data.nextQuestion.questionText) {
          // Immediately display next predefined case-study question
          setCurrentQuestion(data.nextQuestion);
          setCaseStudyStep(data.currentStep || caseStudyStep + 1);
          setPhaseState('CASE_STUDY');
        } else {
          await transitionToAdaptive(attempt._id);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit case study answer.';
      setErrorMsg(msg);
      setPhaseState('CASE_STUDY'); // allow user to re-attempt submission
    }
  };

  /**
   * Handle Phase 2 Adaptive MCQ Submission
   */
  const handleSubmitAdaptiveAnswer = async () => {
    if (!selectedOption) {
      alert('Please select an option before continuing.');
      return;
    }
    if (!attempt || !currentQuestion) return;

    const answeredQuestionId = currentQuestion.questionId;
    const answeredOption = selectedOption;

    try {
      // Transition immediately to GENERATING_NEXT_ADAPTIVE and clear selection & currentQuestion
      // so neither stale nor blank question card is ever shown during generation
      setPhaseState('GENERATING_NEXT_ADAPTIVE');
      setSelectedOption(null);
      setCurrentQuestion(null);
      setErrorMsg('');

      const res = await assessmentService.answerAdaptive(id, {
        attemptId: attempt._id,
        questionId: answeredQuestionId,
        selectedAnswer: answeredOption,
      });

      if (res.data?.success) {
        const data = res.data.data;

        if (data.isComplete) {
          setCurrentQuestion(null);
          setPhaseState('COMPLETED');
        } else {
          const nextQ = data.nextQuestion || data.currentQuestion;
          if (nextQ && nextQ.questionText) {
            setCurrentQuestion(nextQ);
            setAdaptiveStep(data.currentStep || adaptiveStep + 1);
            setPhaseState('ADAPTIVE');
          } else {
            setErrorMsg('Unable to generate the next adaptive challenge.');
            setPhaseState('ERROR');
          }
        }
      } else {
        setErrorMsg(res.data?.message || 'Failed to calibrate adaptive challenge.');
        setPhaseState('ERROR');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to evaluate adaptive response.';
      setErrorMsg(msg);
      setPhaseState('ERROR');
    }
  };

  /**
   * Retry generating current adaptive question
   */
  const handleRetryAdaptive = async (overrideAttemptId) => {
    const attId = overrideAttemptId || attempt?._id;
    if (!attId) return;

    try {
      setPhaseState('GENERATING_NEXT_ADAPTIVE');
      setErrorMsg('');
      setCurrentQuestion(null);

      const res = await assessmentService.retryAdaptive(id, { attemptId: attId });
      if (res.data?.success) {
        const data = res.data.data;
        const nextQ = data.currentQuestion || data.nextQuestion;
        if (nextQ && nextQ.questionText) {
          setCurrentQuestion(nextQ);
          setSelectedOption(null);
          setAdaptiveStep(data.currentStep || adaptiveStep);
          setPhaseState('ADAPTIVE');
        } else {
          setErrorMsg('Unable to generate the next adaptive challenge.');
          setPhaseState('ERROR');
        }
      } else {
        setErrorMsg(res.data?.message || 'Unable to generate the next adaptive challenge.');
        setPhaseState('ERROR');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Unable to generate the next adaptive challenge. Please click retry.');
      setPhaseState('ERROR');
    }
  };

  /**
   * Final Submission & Skill Gap Report generation
   */
  const handleFinalSubmit = async () => {
    if (!attempt) return;

    try {
      setPhaseState('REPORT_GENERATING');
      setErrorMsg('');
      if (timerRef.current) clearInterval(timerRef.current);

      const res = await assessmentService.submit(id, {
        attemptId: attempt._id,
      });

      if (res.data?.success) {
        // Trigger deterministic & Groq skill gap analysis
        try {
          await skillGapService.analyze(attempt._id);
        } catch (aiErr) {
          console.warn('Non-blocking skill gap generation notice:', aiErr);
        }

        navigate('/trainee/skill-report');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to finalize assessment submission.';
      setErrorMsg(msg);
      setPhaseState('COMPLETED');
    }
  };

  const handleAutoSubmit = () => {
    alert('Assessment time limit reached! Submitting your assessment...');
    handleFinalSubmit();
  };

  const formatTimer = (secs) => {
    if (secs == null) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'ADVANCED':
        return <span className="badge badge-danger">Advanced Level</span>;
      case 'INTERMEDIATE':
        return <span className="badge badge-primary">Intermediate Level</span>;
      case 'BEGINNER':
      default:
        return <span className="badge badge-warning">Fundamental Level</span>;
    }
  };

  // 1. Initial Loading Screen
  if (phaseState === 'LOADING') {
    return (
      <div className="page-container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '42px', height: '42px', borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Initializing Assessment Session
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Loading predefined scenario and synchronizing attempt progress...
          </p>
        </div>
      </div>
    );
  }

  // 2. Fatal Session Error
  if (phaseState === 'ERROR' && !currentQuestion && !attempt) {
    return (
      <div className="page-container" style={{ padding: '4rem 1rem' }}>
        <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto', padding: '2.5rem', textAlign: 'center' }}>
          <IconAlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Assessment Session Notice
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            {errorMsg || 'An error occurred while communicating with the assessment service.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/trainee/assessments')}>
            Return to Assessments Hub
          </button>
        </div>
      </div>
    );
  }

  const isCaseStudyPhase = phaseState === 'CASE_STUDY' || phaseState === 'SUBMITTING_CASE_STUDY_ANSWER';
  const isAdaptivePhase = phaseState === 'ADAPTIVE';
  const isTransitioning = phaseState === 'ANALYZING_CASE_STUDY' || phaseState === 'PREPARING_ADAPTIVE';
  const isGeneratingNextAdaptive = phaseState === 'GENERATING_NEXT_ADAPTIVE' || phaseState === 'SUBMITTING_ADAPTIVE_ANSWER';

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconAlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          {phaseState === 'ERROR' && (
            <button className="btn btn-secondary btn-sm" onClick={() => handleRetryAdaptive()}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Top Session Banner */}
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
          borderLeft: isCaseStudyPhase ? '4px solid #3b82f6' : '4px solid #10b981',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {isCaseStudyPhase ? (
              <span className="badge badge-info" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconBookOpen size={13} />
                Phase 1: Predefined Case Study
              </span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconBrain size={13} />
                Phase 2: Dynamic Adaptive AI Challenge
              </span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Attempt #{attempt?.attemptNumber || 1} • {assessment?.courseId?.courseName || 'Course'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
            {assessment?.title || 'Vocational Competency Assessment'}
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
                backgroundColor: timeLeft < 180 ? 'rgba(239, 68, 68, 0.1)' : 'var(--active-nav-bg)',
                color: timeLeft < 180 ? '#ef4444' : 'var(--primary)',
                fontWeight: '700',
                fontSize: '0.9rem',
                border: `1px solid ${timeLeft < 180 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-strong)'}`,
              }}
            >
              <IconClock size={16} />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          )}

          <button
            className="btn btn-outline-secondary"
            onClick={handleFinalSubmit}
            disabled={phaseState === 'REPORT_GENERATING' || (!attempt?.caseStudyResponses?.length && !attempt?.adaptiveResponses?.length)}
            style={{ fontSize: '0.85rem' }}
          >
            {phaseState === 'REPORT_GENERATING' ? 'Finalizing...' : 'Submit & Exit'}
          </button>
        </div>
      </div>

      {/* Dynamic Progress Indicator */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {isCaseStudyPhase ? (
                <>Case Study Progress: Question {caseStudyStep} of {totalCaseStudyQuestions}</>
              ) : isAdaptivePhase ? (
                <>Adaptive AI Calibration: Question {adaptiveStep} of {totalAdaptiveTarget}</>
              ) : (
                <>Assessment Completion</>
              )}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: isCaseStudyPhase ? '#3b82f6' : '#10b981', fontWeight: '700' }}>
            {isCaseStudyPhase
              ? `${Math.round((caseStudyStep / totalCaseStudyQuestions) * 100)}% Phase 1`
              : `${Math.round((adaptiveStep / totalAdaptiveTarget) * 100)}% Phase 2`}
          </span>
        </div>

        <div style={{ height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: isCaseStudyPhase
                ? `${Math.min(100, Math.round((caseStudyStep / totalCaseStudyQuestions) * 100))}%`
                : `${Math.min(100, Math.round((adaptiveStep / totalAdaptiveTarget) * 100))}%`,
              background: isCaseStudyPhase
                ? 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* PHASE 1: CASE STUDY TWO-COLUMN LAYOUT */}
      {isCaseStudyPhase && currentQuestion && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* LEFT: Fixed Predefined Case Study Scenario */}
          <div
            className="glass-card"
            style={{
              padding: '1.75rem',
              maxHeight: '75vh',
              overflowY: 'auto',
              borderTop: '3px solid #3b82f6',
              position: 'sticky',
              top: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <IconBookOpen size={20} color="#60a5fa" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#93c5fd' }}>
                {caseStudy.title || 'Technical Operational Scenario'}
              </h3>
            </div>

            <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {caseStudy.scenario || 'Please review the case study requirements and answer the question on the right.'}
            </div>

            <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.15)', fontSize: '0.8rem', color: '#93c5fd' }}>
              ℹ️ This scenario remains available on the left while you answer each case study question on the right.
            </div>
          </div>

          {/* RIGHT: Current Case Study MCQ Only */}
          <div
            className="glass-card"
            style={{
              padding: '2rem 2.25rem',
              borderTop: '3px solid #3b82f6',
            }}
          >
            {/* Question Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  Skill: {currentQuestion.skillName}
                </span>
                {getDifficultyBadge(currentQuestion.difficulty)}
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                Weight: {currentQuestion.marks || 1} mark(s)
              </span>
            </div>

            {/* Question Text */}
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
                marginBottom: '1.75rem',
              }}
            >
              <span style={{ color: '#3b82f6', fontWeight: '700', marginRight: '8px' }}>
                Question #{caseStudyStep}:
              </span>
              {currentQuestion.questionText}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
              {currentQuestion.options?.map((opt) => {
                const isSelected = selectedOption === opt.label;

                return (
                  <div
                    key={opt.label}
                    onClick={() => setSelectedOption(opt.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 18px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.18)' : 'var(--shadow-xs)',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#3b82f6' : 'var(--bg-secondary)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        flexShrink: 0,
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

            {/* Action Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1.5rem',
              }}
            >
              <button
                className="btn btn-primary"
                onClick={handleSubmitCaseStudyAnswer}
                disabled={!selectedOption || phaseState === 'SUBMITTING_CASE_STUDY_ANSWER'}
                style={{ padding: '0.75rem 2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {phaseState === 'SUBMITTING_CASE_STUDY_ANSWER' ? (
                  <>
                    <span className="spinner-xs" />
                    <span>Saving Response...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer & Next</span>
                    <IconArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE TRANSITION LOADING SCREEN */}
      {isTransitioning && (
        <div className="glass-card" style={{ maxWidth: '640px', margin: '2rem auto', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '48px', height: '48px', borderColor: '#10b981', borderTopColor: 'transparent' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Case Study Complete! Calibrating Adaptive Assessment...
          </h3>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
            Consolidating case study evidence in chronological sequence, mapping initial competency thresholds, and dynamically generating your personalized adaptive challenges via Groq AI.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>
            <IconBrain size={16} />
            Calibrating Difficulty & Skills
          </div>
        </div>
      )}

      {/* PHASE 2 GENERATING NEXT ADAPTIVE QUESTION LOADING CARD */}
      {isGeneratingNextAdaptive && (
        <div
          className="glass-card"
          style={{
            maxWidth: '680px',
            margin: '2rem auto',
            padding: '3.5rem 2.5rem',
            textAlign: 'center',
            borderTop: '4px solid #10b981',
          }}
        >
          <div
            className="spinner"
            style={{
              margin: '0 auto 1.5rem',
              width: '52px',
              height: '52px',
              borderColor: '#10b981',
              borderTopColor: 'transparent',
            }}
          />
          <h3 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Analyzing Your Response...
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
            Updating your skill profile and generating your next adaptive challenge...
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.85rem', fontWeight: '600' }}>
            <IconBrain size={18} />
            Dynamically Calibrating Difficulty
          </div>
        </div>
      )}

      {/* PHASE 2: ADAPTIVE ERROR / RETRY STATE CARD */}
      {phaseState === 'ERROR' && !isCaseStudyPhase && !isTransitioning && (
        <div
          className="glass-card"
          style={{
            maxWidth: '640px',
            margin: '2rem auto',
            padding: '3rem 2.5rem',
            textAlign: 'center',
            borderTop: '4px solid #ef4444',
          }}
        >
          <IconAlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Unable to generate the next adaptive challenge.
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: '1.6' }}>
            {errorMsg || 'A temporary AI calibration interruption occurred. Click Retry to continue your assessment.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => handleRetryAdaptive()}
            style={{ padding: '0.75rem 2rem', fontWeight: '700' }}
          >
            Retry Challenge Generation
          </button>
        </div>
      )}

      {/* PHASE 2: ADAPTIVE AI ASSESSMENT FULL-WIDTH CARD */}
      {isAdaptivePhase && currentQuestion && currentQuestion.questionText && (
        <div
          className="glass-card"
          style={{
            maxWidth: '850px',
            margin: '0 auto',
            padding: '2.5rem',
            borderTop: '4px solid #10b981',
          }}
        >
          {/* Question Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconBrain size={13} />
                Adaptive Challenge: {currentQuestion.skillName}
              </span>
              {getDifficultyBadge(currentQuestion.difficulty)}
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Weight: {currentQuestion.marks || 1} mark(s)
            </span>
          </div>

          {/* Question Prompt */}
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              marginBottom: '2rem',
            }}
          >
            <span style={{ color: '#10b981', fontWeight: '700', marginRight: '8px' }}>
              Adaptive Question #{adaptiveStep}:
            </span>
            {currentQuestion.questionText}
          </h3>

          {/* Question Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2.25rem' }}>
            {currentQuestion.options?.map((opt) => {
              const isSelected = selectedOption === opt.label;

              return (
                <div
                  key={opt.label}
                  onClick={() => setSelectedOption(opt.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'var(--active-nav-bg)' : 'var(--bg-surface)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'var(--shadow-xs)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      flexShrink: 0,
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

          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1.5rem',
            }}
          >
            <button
              className="btn btn-primary"
              onClick={handleSubmitAdaptiveAnswer}
              disabled={!selectedOption || phaseState === 'SUBMITTING_ADAPTIVE_ANSWER'}
              style={{ padding: '0.75rem 2.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {phaseState === 'SUBMITTING_ADAPTIVE_ANSWER' ? (
                <>
                  <span className="spinner-xs" />
                  <span>Calibrating Competency...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer & Next</span>
                  <IconArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETION SCREEN */}
      {phaseState === 'COMPLETED' && (
        <div className="glass-card" style={{ maxWidth: '640px', margin: '2rem auto', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <IconCheckCircle size={56} color="#10b981" style={{ margin: '0 auto 1.25rem' }} />
          <h3 style={{ fontSize: '1.45rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Two-Phase Assessment Complete
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 2rem', lineHeight: '1.65' }}>
            You have successfully completed both the Predefined Case Study Scenario and Dynamic Adaptive AI challenges. Finalize your submission to compute your deterministic competency scores and generate your Skill Diagnostic Report.
          </p>

          <button
            className="btn btn-primary"
            onClick={handleFinalSubmit}
            disabled={phaseState === 'REPORT_GENERATING'}
            style={{ padding: '0.85rem 2.75rem', fontSize: '1rem', fontWeight: '700' }}
          >
            {phaseState === 'REPORT_GENERATING' ? 'Computing Deterministic Scores...' : 'Finalize & View Skill Report →'}
          </button>
        </div>
      )}

      {/* REPORT GENERATING SPINNER */}
      {phaseState === 'REPORT_GENERATING' && (
        <div className="glass-card" style={{ maxWidth: '560px', margin: '2rem auto', padding: '3rem 2rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '48px', height: '48px', borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Finalizing Skill Gap Analysis
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Deterministically scoring submitted responses and querying Groq AI diagnostic models for targeted remediation recommendations...
          </p>
        </div>
      )}
    </div>
  );
};

export default TraineeTakeAssessment;
