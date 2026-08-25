import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, ShieldAlert } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, defaultRole = 'Artisan' }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [region, setRegion] = useState('Uttar Pradesh');
  const [preferredLang, setPreferredLang] = useState('Hindi');
  const [craftType, setCraftType] = useState('Handicrafts');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({
          username,
          password,
          role,
          region,
          preferred_lang: preferredLang,
          craft_type: craftType,
          aadhaar_number: aadhaarNumber || null
        });
        // Auto-login after registration
        await login(username, password);
      } else {
        await login(username, password);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRegister ? 'Create Account' : 'Sign In to KalaSetu'}
      maxWidth="480px"
    >
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏛️</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegister
            ? 'Enroll your artisan profile, buyer credentials, or administrative account.'
            : 'Access your specialized dashboard, studio workspace, or moderation queue.'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Username */}
        <div className="form-group">
          <label htmlFor="auth-username">Username or Phone</label>
          <input
            id="auth-username"
            type="text"
            className="auth-input"
            placeholder="e.g. superadmin or 9876543210"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </div>

        {/* Registration Extra Fields */}
        {isRegister && (
          <>
            <div className="form-group">
              <label htmlFor="auth-role">Role</label>
              <select
                id="auth-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="auth-input"
              >
                <option value="Artisan">Artisan / Weaver</option>
                <option value="Buyer">B2B Buyer / Export House</option>
                <option value="Aggregator">Cooperative Aggregator</option>
                <option value="Admin">MoSJE Admin</option>
              </select>
            </div>

            {role === 'Artisan' && (
              <>
                <div className="row">
                  <div className="col form-group">
                    <label htmlFor="auth-region">State / Region</label>
                    <input
                      id="auth-region"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Uttar Pradesh"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    />
                  </div>
                  <div className="col form-group">
                    <label htmlFor="auth-craft">Craft Specialization</label>
                    <input
                      id="auth-craft"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Silk Weaving"
                      value={craftType}
                      onChange={(e) => setCraftType(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="auth-aadhaar">Aadhaar Number (Optional for KYC)</label>
                  <input
                    id="auth-aadhaar"
                    type="text"
                    className="auth-input"
                    placeholder="12-digit Aadhaar Number"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                  />
                </div>
              </>
            )}
          </>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full mt-4"
          disabled={submitting}
        >
          {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
          <span>{submitting ? 'Authenticating...' : isRegister ? 'Register & Sign In' : 'Sign In'}</span>
        </button>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.84rem' }}>
          {isRegister ? (
            <span style={{ color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setIsRegister(false)}
              >
                Sign In here
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>
              New to the platform?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setIsRegister(true)}
              >
                Create an account
              </button>
            </span>
          )}
        </div>
      </form>
    </Modal>
  );
}

