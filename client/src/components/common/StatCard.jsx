import React from 'react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorScheme = 'primary', // primary | emerald | amber | violet | cyan | warning | info
  loading = false,
  onClick,
}) => {
  return (
    <div
      className={`stat-card stat-${colorScheme} ${onClick ? 'stat-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-card-inner">
        <div className="stat-info">
          <span className="stat-title">{title}</span>
          <div className="stat-value-row">
            {loading ? (
              <span className="stat-skeleton"></span>
            ) : (
              <h2 className="stat-value">{value ?? 0}</h2>
            )}
            {trend && <span className={`stat-trend ${trend.startsWith('+') ? 'trend-positive' : 'trend-negative'}`}>{trend}</span>}
          </div>
          {description && <p className="stat-desc">{description}</p>}
        </div>
        {Icon && (
          <div className="stat-icon-wrapper">
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
};
