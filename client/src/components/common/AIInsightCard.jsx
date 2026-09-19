import React from 'react';
import { IconBrain, IconZap, IconAlertCircle, IconAward, IconCheckCircle, IconBookOpen, IconTarget, IconActivity } from './Icons';

export const AIInsightCard = ({
  title = 'AI Analytics Diagnostic Insight',
  model = 'grok-3-mini',
  analyzedAt,
  data,
  isLoading,
  onRefresh,
  emptyMessage = 'No AI analysis generated yet.',
}) => {
  if (isLoading) {
    return (
      <div
        className="card"
        style={{
          border: '1px solid var(--border-subtle)',
          backgroundColor: '#FFFFFF',
          padding: '2rem',
          textAlign: 'center',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--primary)' }}>
          <IconBrain size={24} className="animate-spin" />
          <span style={{ fontWeight: '700', fontSize: '1rem' }}>Synthesizing Evidence-Based Diagnostics...</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Evaluating assessment marks, cognitive error boundaries, and longitudinal performance without generative hallucination...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="card"
        style={{
          border: '1px dashed var(--border-light)',
          backgroundColor: '#FFFFFF',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          borderRadius: '16px',
        }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-sage-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <IconBrain size={24} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: onRefresh ? '14px' : '0' }}>{emptyMessage}</p>
        {onRefresh && (
          <button className="btn btn-primary btn-sm" onClick={onRefresh}>
            <IconBrain size={16} /> Generate AI Diagnostic Analysis
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="card ai-insight-card"
      style={{
        border: '1px solid var(--border-subtle)',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--primary-sage-subtle)', border: '1px solid var(--primary-sage-light)', padding: '7px', borderRadius: '10px', color: 'var(--primary)' }}>
            <IconBrain size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>{title}</h3>
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ANALYTICS ASSISTANT</span>
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              DIAGNOSTIC ENGINE • {model}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {analyzedAt && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Evaluated: {new Date(analyzedAt).toLocaleDateString()}
            </span>
          )}
          {onRefresh && (
            <button className="btn btn-secondary btn-sm" onClick={onRefresh} title="Re-analyze with latest evidence">
              <IconZap size={14} /> Re-evaluate
            </button>
          )}
        </div>
      </div>

      {/* Summary Narrative */}
      {data.summary && (
        <div
          style={{
            marginBottom: '1.25rem',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '1rem 1.15rem',
            borderRadius: '10px',
            borderLeft: '4px solid var(--primary)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', marginBottom: '4px' }}>
            EXECUTIVE INTERPRETATION SUMMARY
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.55', color: 'var(--text-main)' }}>
            {data.summary}
          </p>
        </div>
      )}

      {/* Career Readiness & Industry Benchmarking */}
      {data.careerReadiness && (
        <div
          style={{
            marginBottom: '1.25rem',
            backgroundColor: '#FAFAF7',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Career Readiness & Employability Index
            </span>
            <span
              className={data.careerReadiness.rating === 'JOB_READY' ? 'badge badge-success' : 'badge badge-warning'}
            >
              {data.careerReadiness.rating} {data.careerReadiness.readinessScore != null ? `(${data.careerReadiness.readinessScore}%)` : ''}
            </span>
          </div>

          {data.careerReadiness.justification && (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-main)', margin: '0 0 8px 0', lineHeight: '1.45' }}>
              {data.careerReadiness.justification}
            </p>
          )}

          {data.careerReadiness.suggestedRoles && data.careerReadiness.suggestedRoles.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>Matching Industry Roles:</span>
              {data.careerReadiness.suggestedRoles.map((role, idx) => (
                <span
                  key={idx}
                  className="badge badge-info"
                  style={{ fontSize: '0.72rem', textTransform: 'none' }}
                >
                  {role}
                </span>
              ))}
            </div>
          )}

          {data.careerReadiness.salaryGrowthPotential && (
            <div style={{ marginTop: '8px', fontSize: '0.775rem', color: 'var(--primary)' }}>
              <strong>Expected Earning Uplift: </strong>{data.careerReadiness.salaryGrowthPotential}
            </div>
          )}
        </div>
      )}

      {/* Cognitive Dimension Breakdown (Bloom's Taxonomy) */}
      {data.cognitiveBreakdown && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: 0, fontWeight: '800' }}>
              Cognitive Proficiency Dimensions (Bloom's Taxonomy)
            </h4>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', fontWeight: '600' }}>
              {data.cognitiveBreakdown.evidenceStatus === 'INSUFFICIENT_EVIDENCE' ? 'INSUFFICIENT EVIDENCE' : 'ASSESSMENT EVIDENCE'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
            <div style={{ backgroundColor: '#FAFAF7', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Factual Recall</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>
                {data.cognitiveBreakdown.recallScore != null ? `${data.cognitiveBreakdown.recallScore}%` : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Insufficient Evidence</span>}
              </div>
            </div>
            <div style={{ backgroundColor: '#FAFAF7', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Application</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>
                {data.cognitiveBreakdown.applicationScore != null ? `${data.cognitiveBreakdown.applicationScore}%` : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Insufficient Evidence</span>}
              </div>
            </div>
            <div style={{ backgroundColor: '#FAFAF7', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Analysis</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--warning)' }}>
                {data.cognitiveBreakdown.analysisScore != null ? `${data.cognitiveBreakdown.analysisScore}%` : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Insufficient Evidence</span>}
              </div>
            </div>
            <div style={{ backgroundColor: '#FAFAF7', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Synthesis</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--info)' }}>
                {data.cognitiveBreakdown.synthesisScore != null ? `${data.cognitiveBreakdown.synthesisScore}%` : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Insufficient Evidence</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Identified Core Strengths */}
      {data.strongSkills && data.strongSkills.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--success)', margin: '0 0 6px 0', fontWeight: '800' }}>
            Verified Core Competencies & Strengths
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
            {data.strongSkills.map((s, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {typeof s === 'object' ? (
                  <>
                    <strong style={{ color: 'var(--success)' }}>{s.skill || s.name}</strong>: {s.evidence || s.reason || ''}
                  </>
                ) : (
                  s
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conceptual Misconception Diagnostics */}
      {data.misconceptionAnalysis && data.misconceptionAnalysis.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning)', margin: '0 0 6px 0', fontWeight: '800' }}>
            Conceptual Error Boundaries & Root Causes
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.misconceptionAnalysis.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                }}
              >
                <div style={{ fontWeight: '700', color: '#92400E', fontSize: '0.85rem', marginBottom: '3px' }}>
                  {item.topic}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#B45309', marginBottom: '3px' }}>
                  <strong>Identified Flaw: </strong>{item.identifiedMisconception}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                  <strong>Correct Model: </strong>{item.correctMentalModel}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Phase Remedial Milestone Roadmap */}
      {data.remedialRoadmap && data.remedialRoadmap.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', margin: '0 0 6px 0', fontWeight: '800' }}>
            Targeted Remedial Milestone Roadmap
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.remedialRoadmap.map((road, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FAFAF7',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.85rem' }}>{road.phase}</span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.675rem' }}>{road.duration}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                  <strong>Focus Area: </strong>{road.focus}
                </div>
                {road.milestones && road.milestones.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {road.milestones.map((m, mIdx) => (
                      <li key={mIdx}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Pedagogical Interventions */}
      {data.providerActions && data.providerActions.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', margin: '0 0 6px 0', fontWeight: '800' }}>
            Recommended Provider Pedagogical Interventions
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
            {data.providerActions.map((action, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Trust & Transparency Verification Footer */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.75rem',
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          backgroundColor: '#FAFAF7',
          padding: '0.6rem 0.75rem',
          borderRadius: '8px',
        }}
      >
        <IconAlertCircle size={15} style={{ flexShrink: 0, color: 'var(--primary)' }} />
        <span>
          <strong>Data Trust Principle:</strong> AI analysis represents an assistive interpretation computed from verified assessment submissions. Official certifications and administrative decisions remain human-governed.
        </span>
      </div>
    </div>
  );
};
