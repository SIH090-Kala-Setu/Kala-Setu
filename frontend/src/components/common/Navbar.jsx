import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Sparkles, Store, LogIn, LogOut, UserCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth }) {
  const { user, isAuthenticated, logout, backendStatus, isAdmin } = useAuth();

  return (
    <header className="navbar">
      <div className="nav-container">
        {/* Brand Logo */}
        <div className="logo" onClick={() => setActiveTab(isAdmin ? 'admin' : 'studio')}>
          <span className="logo-emoji">🛡️</span>
          <span className="logo-text">
            Kala<span className="highlight">Setu</span>
          </span>
          <span className="badge badge-sm badge-info" style={{ marginLeft: 6 }}>
            MoSJE
          </span>
        </div>

        {/* Center View Switcher Tabs */}
        <div className="nav-tabs-group">
          {isAdmin && (
            <button
              className={`nav-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <ShieldCheck size={16} />
              <span>Admin Console</span>
            </button>
          )}

          <button
            className={`nav-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <Sparkles size={16} />
            <span>AI Studio</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            <Store size={16} />
            <span>B2B Marketplace</span>
          </button>
        </div>

        {/* Right Actions: Connection Status & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Status Indicator */}
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span
              className={`status-indicator ${backendStatus.online ? 'online' : 'offline'}`}
            ></span>
            <span style={{ fontSize: '0.78rem' }}>
              {backendStatus.online ? 'API Online' : 'API Offline'}
            </span>
          </div>

          {/* User Profile / Auth Button */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                className="badge badge-sm badge-purple"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <UserCheck size={12} />
                {user.username || user.full_name} ({user.role})
              </span>
              <button className="btn btn-secondary btn-sm" onClick={logout} title="Sign Out">
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

