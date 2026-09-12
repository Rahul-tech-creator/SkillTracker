import React from 'react';

export const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = '#166534', badge }) => {
  // Map raw colors to institutional palette if needed
  let displayColor = color;
  if (color === '#8b5cf6' || color === '#6366f1') displayColor = '#166534';
  if (color === '#3b82f6') displayColor = '#2563EB';
  if (color === '#10b981') displayColor = '#15803D';
  if (color === '#ef4444') displayColor = '#C2413B';
  if (color === '#f59e0b') displayColor = '#B7791F';

  return (
    <div
      className="card metric-card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `4px solid ${displayColor}`,
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        borderTop: '1px solid var(--border-subtle)',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.2' }}>
            {value !== undefined && value !== null ? value : '—'}
          </div>
        </div>
        {Icon && (
          <div
            style={{
              padding: '8px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-sage-subtle)',
              color: displayColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--primary-sage-light)',
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '4px' }}>
        {subtitle && <span>{subtitle}</span>}
        {badge && (
          <span className="badge badge-neutral" style={{ fontSize: '0.675rem' }}>
            {badge}
          </span>
        )}
        {trend && (
          <span style={{ color: trend > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '700' }}>
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
    </div>
  );
};
