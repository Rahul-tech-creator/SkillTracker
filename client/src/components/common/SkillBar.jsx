import React from 'react';

export const SkillBar = ({ skillName, percentage, classification, score, maxScore, wrongTopics = [] }) => {
  const getClassificationConfig = (cls) => {
    switch (cls) {
      case 'STRONG':
        return { label: 'Strong (≥80%)', color: '#15803D', bg: '#DCEBDD' };
      case 'DEVELOPING':
        return { label: 'Developing (60-79%)', color: '#2F855A', bg: '#EAF4EC' };
      case 'WEAK':
        return { label: 'Moderate / Weak (40-59%)', color: '#B7791F', bg: '#FEF3C7' };
      case 'CRITICAL_GAP':
      default:
        return { label: 'Critical Gap (<40%)', color: '#C2413B', bg: '#FEE2E2' };
    }
  };

  const config = getClassificationConfig(classification);

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <div>
          <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.925rem' }}>{skillName}</span>
          {score !== undefined && maxScore !== undefined && (
            <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({score}/{maxScore} marks)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: '700',
              backgroundColor: config.bg,
              color: config.color,
            }}
          >
            {config.label}
          </span>
          <span style={{ fontWeight: '800', fontSize: '0.95rem', color: config.color, minWidth: '46px', textAlign: 'right' }}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div
        style={{
          width: '100%',
          height: '9px',
          backgroundColor: '#E8E1D5',
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            height: '100%',
            backgroundColor: config.color,
            borderRadius: '999px',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* Wrong answer topics indicator */}
      {wrongTopics && wrongTopics.length > 0 && (
        <div style={{ marginTop: '6px', fontSize: '0.775rem', color: '#B45309' }}>
          <span style={{ fontWeight: '700' }}>Remediation Focus: </span>
          {wrongTopics.map((t, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-block',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                color: '#92400E',
                padding: '1px 6px',
                borderRadius: '4px',
                margin: '2px 4px 2px 0',
                fontSize: '0.72rem',
                fontWeight: '600',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
