import React from 'react';
import { getStatusBadgeClass, getModeBadgeClass } from '../../utils/helpers';

export const Badge = ({ children, variant = 'neutral', type = 'status', className = '' }) => {
  let badgeClass = 'badge-neutral';

  if (variant && variant !== 'neutral') {
    badgeClass = `badge-${variant}`;
  } else if (type === 'mode') {
    badgeClass = getModeBadgeClass(children);
  } else {
    badgeClass = getStatusBadgeClass(children);
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      <span className="badge-dot"></span>
      {children}
    </span>
  );
};
