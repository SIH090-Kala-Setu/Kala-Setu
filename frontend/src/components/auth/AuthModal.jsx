import React, { useState } from 'react';
import Modal from '../common/Modal';
import OnboardingWizard from '../onboarding/OnboardingWizard';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, defaultRole = 'Artisan' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWizard = () => {
    onClose(); // Close the login modal first
    setShowWizard(true);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
  };

  // Show wizard overlay (outside of modal)
  if (showWizard) {
    return (
      <OnboardingWizard
        onComplete={handleWizardComplete}
        onClose={() => setShowWizard(false)}
      />
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign In to KalaSetu"
      maxWidth="420px"
    >
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏛️</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Access your artisan studio, aggregator dashboard, or buyer marketplace.
        </p>
      </div>

      <form onSubmit={handleLogin}>
        {/* Username */}
        <div className="form-group">
          <label htmlFor="auth-username">Phone Number / Username</label>
          <input
            id="auth-username"
            type="text"
            className="auth-input"
            placeholder="e.g. 9876543210 or admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="auth-password">Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ width: '100%', paddingRight: '44px' }}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: '8px' }}>{error}</p>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full mt-4"
          disabled={submitting}
        >
          <LogIn size={16} />
          <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
        </button>
      </form>

      {/* Link to OnboardingWizard */}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.84rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          New to KalaSetu?{' '}
          <button
            type="button"
            style={{
              background: 'none', border: 'none',
              color: 'var(--primary)', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.84rem'
            }}
            onClick={handleOpenWizard}
          >
            Create an account →
          </button>
        </span>
      </div>
    </Modal>
  );
}
