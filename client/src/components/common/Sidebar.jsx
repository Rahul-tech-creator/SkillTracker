import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  IconDashboard,
  IconBuilding,
  IconBookOpen,
  IconLayers,
  IconUsers,
  IconUserCheck,
  IconCertificate,
  IconUser,
  IconClose,
  IconGraduationCap,
  IconClock,
  IconActivity,
  IconBriefcase,
  IconTrendingUp,
  IconBrain,
  IconTarget,
  IconBarChart,
  IconDollarSign,
  IconClipboard,
  IconZap,
  IconSliders,
  IconShield,
  IconMapPin,
  IconPieChart,
} from './Icons';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, isProvider, isTrainee } = useAuth();

  const getNavGroups = () => {
    if (isAdmin) {
      return [
        {
          groupTitle: 'WORKSPACE',
          items: [
            { path: '/admin', label: 'Dashboard', icon: IconDashboard, end: true },
            { path: '/admin/assessments', label: 'Assessments', icon: IconClipboard },
            { path: '/admin/skill-gaps', label: 'Skill Gap Analysis', icon: IconTarget },
            { path: '/admin/provider-comparison', label: 'Provider Comparison', icon: IconBarChart },
            { path: '/admin/course-comparison', label: 'Course Comparison', icon: IconBookOpen },
          ],
        },
        {
          groupTitle: 'PROGRAM MANAGEMENT',
          items: [
            { path: '/admin/funding-schemes', label: 'Scheme Funding', icon: IconDollarSign },
            { path: '/admin/providers', label: 'Providers Directory', icon: IconBuilding },
            { path: '/admin/courses', label: 'Courses & Curricula', icon: IconBookOpen },
            { path: '/admin/batches', label: 'Batches & Cohorts', icon: IconLayers },
            { path: '/admin/trainees', label: 'Vocational Trainees', icon: IconUsers },
            { path: '/admin/enrollments', label: 'Enrollment Records', icon: IconUserCheck },
            { path: '/admin/certificates', label: 'Verified Certificates', icon: IconCertificate },
            { path: '/admin/outcomes', label: 'Outcomes & Careers', icon: IconTrendingUp },
            { path: '/admin/follow-ups', label: 'Follow-Up Pipeline', icon: IconActivity },
          ],
        },
        {
          groupTitle: 'INTELLIGENCE',
          items: [
            { path: '/admin/policy-insights', label: 'Policy Insights & Evidence', icon: IconBrain },
            { path: '/admin/district-analytics', label: 'District Performance', icon: IconMapPin },
            { path: '/admin/demographic-analytics', label: 'Demographic Equity', icon: IconPieChart },
            { path: '/admin/ai-insights', label: 'AI Intelligence Hub', icon: IconZap },
            { path: '/admin/data-quality', label: 'Data Quality Audit', icon: IconSliders },
          ],
        },
        {
          groupTitle: 'SYSTEM',
          items: [
            { path: '/admin/time-simulation', label: 'Time Simulation', icon: IconClock },
          ],
        },
      ];
    }

    if (isProvider) {
      return [
        {
          groupTitle: 'WORKSPACE',
          items: [
            { path: '/provider', label: 'Provider Dashboard', icon: IconDashboard, end: true },
            { path: '/provider/assessments', label: 'Course Assessments', icon: IconClipboard },
            { path: '/provider/skill-gaps', label: 'Skill Gap Analytics', icon: IconTarget },
            { path: '/provider/remedial-actions', label: 'Remedial Interventions', icon: IconZap },
          ],
        },
        {
          groupTitle: 'PROGRAM MANAGEMENT',
          items: [
            { path: '/provider/courses', label: 'My Courses', icon: IconBookOpen },
            { path: '/provider/batches', label: 'Active Batches', icon: IconLayers },
            { path: '/provider/trainees', label: 'Enrolled Trainees', icon: IconUsers },
            { path: '/provider/enrollments', label: 'Cohort Enrollments', icon: IconUserCheck },
            { path: '/provider/follow-ups', label: 'Outcome Follow-Ups', icon: IconActivity },
            { path: '/provider/outcomes', label: 'Graduate Outcomes', icon: IconBriefcase },
          ],
        },
        {
          groupTitle: 'SYSTEM',
          items: [
            { path: '/provider/profile', label: 'Organization Profile', icon: IconBuilding },
          ],
        },
      ];
    }

    if (isTrainee) {
      return [
        {
          groupTitle: 'WORKSPACE',
          items: [
            { path: '/trainee', label: 'Learning & Outcomes', icon: IconDashboard, end: true },
            { path: '/trainee/assessments', label: 'Skill Assessments', icon: IconClipboard },
            { path: '/trainee/skill-report', label: 'My Skill Gap Report', icon: IconTarget },
          ],
        },
      ];
    }

    return [];
  };

  const navGroups = getNavGroups();

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Clean Institutional Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <IconGraduationCap size={22} />
          </div>
          <div className="brand-text">
            <span className="brand-name">SKILLTRACKER</span>
            <span className="brand-sub">NATIONAL OUTCOME SYSTEM</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <IconClose size={18} />
          </button>
        </div>

        {/* Role & Institution Indicator */}
        <div className="sidebar-role-indicator">
          <div className="role-tag-row">
            <span className="role-status-dot"></span>
            <span className="role-label">
              {isAdmin ? 'DIRECTORATE GENERAL OF TRAINING' : isProvider ? 'TRAINING PROVIDER PORTAL' : 'VOCATIONAL TRAINEE PORTAL'}
            </span>
          </div>
          <div className="role-title-text">
            {isAdmin ? 'System Administration' : isProvider ? 'Training Provider' : 'Trainee Learning Space'}
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="sidebar-nav">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="nav-group-section">
              <div className="nav-group-heading">{group.groupTitle}</div>
              <ul className="nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path} className="nav-item">
                      <NavLink
                        to={item.path}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `nav-link ${isActive ? 'nav-link-active' : ''}`
                        }
                      >
                        <Icon size={17} className="nav-icon" />
                        <span className="nav-text">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Clean Institutional User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={user?.name || user?.username}>
                {user?.name || user?.username}
              </span>
              <span className="sidebar-user-role">
                {user?.role === 'ADMIN' ? 'Executive Director' : user?.role === 'PROVIDER' ? 'Authorized Provider' : 'Enrolled Trainee'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
