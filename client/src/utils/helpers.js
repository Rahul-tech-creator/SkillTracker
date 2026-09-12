/**
 * Helper utility functions for the Skilling Outcome Tracking System
 */

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export const getStatusBadgeClass = (status) => {
  if (!status) return 'badge-neutral';
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'ENROLLED':
    case 'COMPLETED':
      return 'badge-success';
    case 'INACTIVE':
    case 'CANCELLED':
    case 'DROPPED':
      return 'badge-danger';
    case 'ONGOING':
      return 'badge-primary';
    case 'UPCOMING':
      return 'badge-warning';
    default:
      return 'badge-neutral';
  }
};

export const getModeBadgeClass = (mode) => {
  if (!mode) return 'badge-neutral';
  switch (mode.toUpperCase()) {
    case 'ONLINE':
      return 'badge-info';
    case 'OFFLINE':
      return 'badge-purple';
    case 'HYBRID':
      return 'badge-cyan';
    default:
      return 'badge-neutral';
  }
};

export const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export const truncateText = (text, maxLength = 60) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
