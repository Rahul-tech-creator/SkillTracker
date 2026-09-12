import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTime } from '../../hooks/useTime';
import { NotificationsDropdown } from './NotificationsDropdown';
import { IconMenu, IconLogOut, IconClock, IconShield } from './Icons';
import { getInitials, formatDate } from '../../utils/helpers';

export const Navbar = ({ onToggleSidebar, title }) => {
  const { user, logout } = useAuth();
  const { isSimulationActive, logicalDate } = useTime();
  const navigate = useNavigate();

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'NATIONAL DIRECTORATE (ADMIN)';
      case 'PROVIDER':
        return 'TRAINING PROVIDER';
      case 'TRAINEE':
        return 'TRAINEE CANDIDATE';
      default:
        return role;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="nav-role-badge role-admin">ADMIN</span>;
      case 'PROVIDER':
        return <span className="nav-role-badge role-provider">PROVIDER</span>;
      case 'TRAINEE':
        return <span className="nav-role-badge role-trainee">TRAINEE</span>;
      default:
        return null;
    }
  };

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          className="mobile-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
        >
          <IconMenu size={20} />
        </button>
        <div className="navbar-title-container">
          <div className="navbar-breadcrumb">
            <span className="breadcrumb-root">PORTAL</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-role">{user?.role || 'SYSTEM'}</span>
          </div>
          <h1 className="navbar-page-title">{title || 'Overview'}</h1>
        </div>
      </div>

      <div className="navbar-right">
        {/* Logical Clock Indicator */}
        <div
          className={`nav-time-badge ${isSimulationActive ? 'simulation-mode' : 'real-mode'}`}
          onClick={() => user?.role === 'ADMIN' && navigate('/admin/time-simulation')}
          title={
            user?.role === 'ADMIN'
              ? 'Click to manage Time Simulation Engine'
              : `Current logical date: ${formatDate(logicalDate)}`
          }
          style={{ cursor: user?.role === 'ADMIN' ? 'pointer' : 'default' }}
        >
          <div className="nav-time-icon-wrap">
            <IconClock size={15} />
          </div>
          <div className="nav-time-text">
            <span className="time-mode-label">
              {isSimulationActive ? 'SIMULATION MODE' : 'OFFICIAL TIME'}
            </span>
            <span className="time-date-label">{formatDate(logicalDate)}</span>
          </div>
        </div>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* User Profile Summary */}
        <div className="user-profile-summary">
          <div className="user-avatar-circle">
            {getInitials(user?.name || user?.username)}
          </div>
          <div className="user-details">
            <span className="user-fullname" title={user?.name || user?.username}>
              {user?.name || user?.username}
            </span>
            <div className="user-meta">
              <span className="user-handle">{getRoleLabel(user?.role)}</span>
              {getRoleBadge(user?.role)}
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          className="navbar-logout-btn"
          onClick={logout}
          title="Sign out of account"
        >
          <IconLogOut size={16} />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
};
