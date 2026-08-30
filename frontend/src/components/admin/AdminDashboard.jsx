import React, { useState, useEffect, useCallback } from 'react';
import { getAdminAnalytics } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import ArtisanVerifications from './ArtisanVerifications';
import ClusterManagement from './ClusterManagement';
import GovtSchemes from './GovtSchemes';
import ExhibitionRegistry from './ExhibitionRegistry';
import ProductModeration from './ProductModeration';
import BuyerVerification from './BuyerVerification';
import PlatformAnalytics from './PlatformAnalytics';
import AuditTrails from './AuditTrails';
import {
  ShieldCheck,
  Building2,
  ScrollText,
  Tent,
  PackageCheck,
  UserCheck,
  BarChart3,
  FileClock,
  Users,
  Package,
  Mail,
  IndianRupee
} from 'lucide-react';

export default function AdminDashboard({ activePanel: propActivePanel, setActivePanel: propSetActivePanel }) {
  const [localActivePanel, setLocalActivePanel] = useState('verifications');
  const activePanel = propActivePanel || localActivePanel;
  const setActivePanel = propSetActivePanel || setLocalActivePanel;
  const [metrics, setMetrics] = useState(null);
  const { user } = useAuth();

  const fetchKPIs = useCallback(async () => {
    try {
      const data = await getAdminAnalytics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch admin KPIs:', err);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const navItems = [
    { id: 'verifications', label: 'Artisan Verifications', icon: ShieldCheck },
    { id: 'clusters', label: 'Cooperative Clusters', icon: Building2 },
    { id: 'schemes', label: 'Government Schemes', icon: ScrollText },
    { id: 'exhibitions', label: 'Exhibition Registry', icon: Tent },
    { id: 'moderation', label: 'Product Moderation', icon: PackageCheck, badge: metrics?.pending_moderation_count },
    { id: 'buyers', label: 'Buyer Verification', icon: UserCheck },
    { id: 'analytics', label: 'Platform Impact', icon: BarChart3 },
    { id: 'audit', label: 'System Audit Trails', icon: FileClock }
  ];

  return (
    <div className="container" style={{ marginTop: '20px', marginBottom: '60px' }}>
      {/* Title Row */}
      <div style={{ marginBottom: '28px' }}>
        <h2>MoSJE Administrative Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.92rem' }}>
          National administration console for monitoring usage metrics, verifying artisan identities, moderating listings, and managing government linkages.
        </p>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(230, 126, 34, 0.1)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div className="kpi-details">
            <h3>{metrics?.artisans_count || 0}</h3>
            <p>Registered Artisans</p>
            <span className="kpi-subtext">
              {metrics?.verified_artisans_count || 0} Verified ({metrics?.pending_verifications_count || 0} Pending)
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)' }}>
            <Package size={24} />
          </div>
          <div className="kpi-details">
            <h3>{metrics?.products_count || 0}</h3>
            <p>Digitized Listings</p>
            <span className="kpi-subtext">
              {metrics?.pending_moderation_count || 0} Pending Moderation
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--info)' }}>
            <UserCheck size={24} />
          </div>
          <div className="kpi-details">
            <h3>{metrics?.buyers_count || 0}</h3>
            <p>B2B Buyers</p>
            <span className="kpi-subtext">
              {metrics?.verified_buyers_count || 0} Verified Badged
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Mail size={24} />
          </div>
          <div className="kpi-details">
            <h3>{metrics?.inquiries_count || 0}</h3>
            <p>Buyer Inquiries</p>
            <span className="kpi-subtext">Direct Linkages</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <IndianRupee size={24} />
          </div>
          <div className="kpi-details">
            <h3>₹ {(metrics?.estimated_sales_value || 0).toLocaleString()}</h3>
            <p>Est. Transaction Value</p>
            <span className="kpi-subtext">B2B Volume</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar + Panel Content */}
      <div className="dashboard-grid">
        <aside className="dashboard-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                className={`dash-link ${activePanel === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActivePanel(item.id);
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="badge badge-warning badge-sm" style={{ padding: '1px 6px' }}>
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </aside>

        <main className="dashboard-content">
          {activePanel === 'verifications' && <ArtisanVerifications onActionComplete={fetchKPIs} />}
          {activePanel === 'clusters' && <ClusterManagement onActionComplete={fetchKPIs} />}
          {activePanel === 'schemes' && <GovtSchemes onActionComplete={fetchKPIs} />}
          {activePanel === 'exhibitions' && <ExhibitionRegistry onActionComplete={fetchKPIs} />}
          {activePanel === 'moderation' && <ProductModeration onActionComplete={fetchKPIs} />}
          {activePanel === 'buyers' && <BuyerVerification onActionComplete={fetchKPIs} />}
          {activePanel === 'analytics' && <PlatformAnalytics />}
          {activePanel === 'audit' && <AuditTrails />}
        </main>
      </div>
    </div>
  );
}

