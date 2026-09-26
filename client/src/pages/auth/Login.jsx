import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  IconGraduationCap,
  IconUser,
  IconKey,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconShield,
  IconBuilding,
  IconUsers,
} from '../../components/common/Icons';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'PROVIDER') {
        navigate('/provider', { replace: true });
      } else if (user.role === 'TRAINEE') {
        navigate('/trainee', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const loggedUser = await login(username.trim(), password);

      if (loggedUser.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (loggedUser.role === 'PROVIDER') {
        navigate('/provider', { replace: true });
      } else if (loggedUser.role === 'TRAINEE') {
        navigate('/trainee', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  const demoProfiles = [
    {
      label: 'Admin',
      icon: <IconShield size={14} />,
      username: 'admin',
      password: 'admin123',
      className: 'pill-admin',
      title: 'System Administrator (National HQ)',
    },
    {
      label: 'Provider',
      icon: <IconBuilding size={14} />,
      username: 'apex_provider',
      password: 'provider123',
      className: 'pill-provider',
      title: 'Apex Institute Provider',
    },
    {
      label: 'Trainee',
      icon: <IconUsers size={14} />,
      username: 'rahul',
      password: 'trainee123',
      className: 'pill-trainee',
      title: 'Rahul Sharma (MERN Cohort Alpha)',
    },
  ];

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand-header">
          <div className="login-logo-circle">
            <IconGraduationCap size={30} />
          </div>
          <div className="login-gov-tag">GOVERNMENT OF INDIA • SKILLING IMPACT SYSTEM</div>
          <h1 className="login-system-title">SKILLTRACKER</h1>
          <p className="login-system-subtitle">National Skilling Outcomes & Longitudinal Analytics Portal</p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Sign In to Dashboard</h2>
            <p className="login-card-desc">Enter your institutional credentials to access your designated workspace</p>
          </div>

          {error && (
            <div className="login-error-alert">
              <IconAlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="loginUsername">
                Username / Identifier
              </label>
              <div className="input-with-icon">
                <IconUser size={18} className="input-prefix-icon" />
                <input
                  id="loginUsername"
                  type="text"
                  className="form-input with-prefix"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="loginPassword">
                Password
              </label>
              <div className="input-with-icon">
                <IconKey size={18} className="input-prefix-icon" />
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input with-prefix with-suffix"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                'Sign In to Dashboard →'
              )}
            </button>
          </form>

          <div className="quick-access-box">
            <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.78rem', color: 'var(--text-muted, #667085)', textAlign: 'center', fontWeight: 500 }}>
              Click the buttons below to login
            </p>
            <div className="quick-access-pills">
              {demoProfiles.map((profile) => (
                <button
                  key={profile.label}
                  type="button"
                  className={`quick-pill ${profile.className}`}
                  onClick={() => handleQuickFill(profile.username, profile.password)}
                  title={profile.title}
                >
                  {profile.icon} {profile.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-subtle, #E4E1DA)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #667085)', marginBottom: '0.45rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Demo Credentials
              </div>
              <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.75rem' }}>
                {demoProfiles.map((profile) => (
                  <div
                    key={`${profile.label}-credentials`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-surface-secondary, #F2F1EB)',
                      padding: '0.4rem 0.65rem',
                      borderRadius: 'var(--radius-xs, 6px)',
                      border: '1px solid var(--border-subtle, #E4E1DA)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-main, #1F2933)' }}>{profile.label}</span>
                    <span style={{ color: 'var(--text-muted, #667085)' }}>
                      Username: <code style={{ color: 'var(--primary-dark, #0F3F21)', fontWeight: 600 }}>{profile.username}</code> &nbsp;|&nbsp; Password: <code style={{ color: 'var(--primary-dark, #0F3F21)', fontWeight: 600 }}>{profile.password}</code>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>National Skilling Framework • Smart India Hackathon Edition • WCAG Compliant</p>
        </div>
      </div>
    </div>
  );
};
