import React, { useState, useEffect } from 'react';
import { Package, Eye, MessageCircle, TrendingUp, Bell, Star, Award, ChevronRight, Plus } from 'lucide-react';
import { getArtisanDashboard } from '../../api/artisan';

export default function ArtisanDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getArtisanDashboard()
      .then(setData)
      .catch(e => setError(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
      <div className="spinner" />
      <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>Loading your dashboard...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)' }}>{error}</p>
      <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  if (!data) return null;

  const statCards = [
    { icon: <Package size={28} />, label: 'Total Listings', value: data.total_listings, sub: `${data.active_listings} Active`, color: '#E67E22' },
    { icon: <Eye size={28} />, label: 'Product Views', value: data.total_views, sub: 'All time', color: '#3498DB' },
    { icon: <MessageCircle size={28} />, label: 'Inquiries', value: data.total_inquiries, sub: `${data.pending_inquiries} Pending`, color: '#2ECC71' },
    { icon: <TrendingUp size={28} />, label: 'Revenue Est.', value: `₹${(data.revenue_estimate || 0).toLocaleString('en-IN')}`, sub: 'Completed orders', color: '#9B59B6' },
  ];

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            🙏 Namaste, <span style={{ color: 'var(--primary)' }}>{data.artisan_name}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.88rem' }}>
            {data.craft_type || 'Artisan'} · {data.is_verified ? '✅ Verified' : '⏳ Pending Verification'}
          </p>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate && onNavigate('studio')}>
          <Plus size={16} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {statCards.map((card, i) => (
          <div key={i} className="card" style={{ padding: '16px 18px', borderLeft: `4px solid ${card.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: card.color, flexShrink: 0 }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.1 }}>{card.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{card.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{card.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-two-col" style={{ display: 'grid', gap: 16 }}>
        {/* Top Products */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0 }}>🏆 Top Products</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('inventory')}>View All</button>
          </div>
          {data.top_products && data.top_products.length > 0 ? (
            data.top_products.slice(0, 4).map((p, i) => (
              <div key={p.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.inquiry_count} inquiries · {p.view_count} views</div>
                </div>
                <span className={`status-badge status-${p.status?.toLowerCase().replace(' ', '-')}`}>{p.status}</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
              <Package size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p>No products yet</p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('studio')}>Create First Product</button>
            </div>
          )}
        </div>

        {/* Upcoming Exhibitions */}
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ margin: '0 0 16px' }}>🎪 Upcoming Exhibitions</h4>
          {data.upcoming_exhibitions && data.upcoming_exhibitions.length > 0 ? (
            data.upcoming_exhibitions.map((ex, i) => (
              <div key={ex.id} style={{ padding: '10px 0', borderBottom: i < data.upcoming_exhibitions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 500 }}>{ex.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📍 {ex.location} · {ex.start_date}</div>
                <span style={{ fontSize: '0.7rem', background: ex.reg_status === 'Approved' ? '#1a472a' : '#2d2d0a', color: ex.reg_status === 'Approved' ? '#2ECC71' : '#F1C40F', padding: '2px 8px', borderRadius: 4 }}>{ex.reg_status}</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
              <Star size={28} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: '0.85rem' }}>No exhibition registrations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 20, padding: 20 }}>
        <h4 style={{ margin: '0 0 14px' }}>⚡ Quick Actions</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'AI Studio', emoji: '📸', tab: 'studio' },
            { label: 'Inventory', emoji: '📦', tab: 'inventory' },
            { label: 'Analytics', emoji: '📊', tab: 'analytics' },
            { label: 'Inquiries', emoji: '💬', tab: 'inquiries' },
            { label: 'Notifications', emoji: '🔔', tab: 'notifications' },
            { label: 'My Profile', emoji: '👤', tab: 'profile' },
          ].map(action => (
            <button key={action.tab} className="btn btn-ghost" style={{ flexDirection: 'column', padding: '14px 8px', gap: 6, border: '1px solid var(--border)', borderRadius: 10 }}
              onClick={() => onNavigate && onNavigate(action.tab)}>
              <span style={{ fontSize: '1.8rem' }}>{action.emoji}</span>
              <span style={{ fontSize: '0.8rem' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
