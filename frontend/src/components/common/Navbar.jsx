import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Sparkles, Store, LogIn, LogOut, UserCheck, LayoutDashboard, Menu, X, Package, BarChart2, Users } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth, onOpenOnboarding, user, role, onLogout }) {
  const { isAuthenticated, backendStatus } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = {
    Admin: [
      { id: 'admin', label: 'Admin Console', icon: <ShieldCheck size={16} /> }
    ],
    Artisan: [
      { id: 'artisan-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { id: 'studio', label: 'AI Studio', icon: <Sparkles size={16} /> },
      { id: 'marketplace', label: 'Marketplace', icon: <Store size={16} /> },
      { id: 'inventory', label: 'Inventory', icon: <Package size={16} /> },
      { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} /> }
    ],
    Aggregator: [
      { id: 'aggregator-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { id: 'marketplace', label: 'Marketplace', icon: <Store size={16} /> }
    ],
    Buyer: [
      { id: 'buyer-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { id: 'marketplace', label: 'Browse Catalog', icon: <Store size={16} /> }
    ],
    Guest: [
      { id: 'marketplace', label: 'Marketplace', icon: <Store size={16} /> }
    ]
  };

  const tabs = isAuthenticated ? navItems[role] || navItems.Guest : navItems.Guest;

  return (
    <header className="navbar">
      <div className="nav-container">
        {/* Brand Logo */}
        <div className="logo" onClick={() => setActiveTab(tabs[0]?.id || 'marketplace')}>
          <span className="logo-emoji">🛡️</span>
          <span className="logo-text">
            Kala<span className="highlight">Setu</span>
          </span>
          <span className="badge badge-sm badge-info" style={{ marginLeft: 6 }}>
            MoSJE
          </span>
        </div>

        {/* Center View Switcher Tabs */}
        <div className="nav-tabs-group" style={{ display: 'none' }}>
          {/* Desktop tabs - controlled by media query usually, handled in css */}
        </div>
        <div className="nav-tabs-group hide-on-mobile">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Actions: Connection Status & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Status Indicator */}
          <div className="hide-on-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status-indicator ${backendStatus.online ? 'online' : 'offline'}`}></span>
            <span style={{ fontSize: '0.78rem' }}>{backendStatus.online ? 'API Online' : 'API Offline'}</span>
          </div>

          {/* User Profile / Auth Button */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="profile-dropdown" style={{ position: 'relative' }}>
                <button className="badge badge-sm badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none', background: 'var(--purple)', color: 'white' }} onClick={() => setActiveTab(role === 'Artisan' ? 'profile' : `${role.toLowerCase()}-dashboard`)}>
                  <UserCheck size={12} />
                  <span className="hide-on-mobile">{user?.username || user?.full_name} ({role})</span>
                </button>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={onLogout} title="Sign Out">
                <LogOut size={14} />
                <span className="hide-on-mobile">Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={onOpenOnboarding}>Register</button>
              <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
            </div>
          )}
          
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'none' }}>
             {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div style={{ background: 'var(--bg-surface)', padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tabs.map(tab => (
               <button
                 key={tab.id}
                 className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                 onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                 style={{ width: '100%', justifyContent: 'flex-start', padding: '12px' }}
               >
                 {tab.icon}
                 <span>{tab.label}</span>
               </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
