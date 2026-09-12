import React from 'react';

export const ConfidenceBadge = ({ confidence, sampleSize }) => {
  const conf = confidence || 'INSUFFICIENT';

  const config = {
    HIGH: { label: 'High Confidence', bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    MEDIUM: { label: 'Medium Confidence', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
    LOW: { label: 'Low Confidence', bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: 'rgba(234, 179, 8, 0.3)' },
    INSUFFICIENT: { label: 'Insufficient Data', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  };

  const style = config[conf] || config.INSUFFICIENT;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        letterSpacing: '0.02em',
      }}
      title={sampleSize ? `Based on ${sampleSize} trainees` : undefined}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: style.color,
        }}
      />
      {style.label} {sampleSize !== undefined && `(N=${sampleSize})`}
    </span>
  );
};
