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
            <span className="quick-access-title">Demo Pre-Seeded Profiles</span>
            <div className="quick-access-pills">
              <button
                type="button"
                className="quick-pill pill-admin"
                onClick={() => handleQuickFill('admin', 'admin123')}
                title="System Administrator (National HQ)"
              >
                <IconShield size={14} /> Admin
              </button>
              <button
                type="button"
                className="quick-pill pill-provider"
                onClick={() => handleQuickFill('apex_provider', 'provider123')}
                title="Apex Institute Provider"
              >
                <IconBuilding size={14} /> Provider
              </button>
              <button
                type="button"
                className="quick-pill pill-trainee"
                onClick={() => handleQuickFill('rahul', 'trainee123')}
                title="Rahul Sharma (MERN Cohort Alpha)"
              >
                <IconUsers size={14} /> Trainee
              </button>
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
