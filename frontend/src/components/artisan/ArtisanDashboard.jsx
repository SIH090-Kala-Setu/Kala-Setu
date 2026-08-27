import React, { useState, useEffect, useCallback } from 'react';
import { Package, Eye, MessageCircle, TrendingUp, Bell, Star, Award, ChevronRight, Plus, Tent, CheckCircle2, RotateCcw } from 'lucide-react';
import { getArtisanDashboard, getExhibitions, registerForExhibition } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';

export default function ArtisanDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [allExhibitions, setAllExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeringExhibId, setRegisteringExhibId] = useState(null);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const loadDashboard = useCallback(async () => {
    try {
      const [dashData, exhibsData] = await Promise.all([
        getArtisanDashboard(),
        getExhibitions().catch(() => [])
      ]);
      setData(dashData);
      setAllExhibitions(exhibsData || []);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRegisterExhibition = async (exhibId, exhibName) => {
    setRegisteringExhibId(exhibId);
    try {
      await registerForExhibition(exhibId);
      showToast(`Successfully registered for ${exhibName}! Your stall application is submitted.`, 'success');
      loadDashboard();
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setRegisteringExhibId(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
      <div className="spinner" />
      <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>Loading your artisan workspace...</span>
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
    { icon: <Package size={28} />, label: 'Total Listings (उत्पाद)', value: data.total_listings, sub: `${data.active_listings} Active`, color: '#E67E22' },
    { icon: <Eye size={28} />, label: 'Product Views (दृश्य)', value: data.total_views, sub: 'All time catalog views', color: '#3498DB' },
    { icon: <MessageCircle size={28} />, label: 'Buyer Inquiries (पूछताछ)', value: data.total_inquiries, sub: `${data.pending_inquiries} Pending Response`, color: '#2ECC71' },
    { icon: <TrendingUp size={28} />, label: 'Estimated Revenue (अनुमानित आय)', value: `₹${(data.revenue_estimate || 0).toLocaleString('en-IN')}`, sub: 'From inquiries & sales', color: '#9B59B6' },
  ];

  // Registered exhibition IDs
  const registeredIds = new Set((data.upcoming_exhibitions || []).map(e => e.id));

  return (
    <div className="container" style={{ padding: '24px 0 60px' }}>
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            🙏 Namaste, <span style={{ color: 'var(--primary)' }}>{data.artisan_name}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.88rem' }}>
            {data.craft_type || 'Master Artisan'} · {data.is_verified ? '✅ MoSJE Verified Craftsperson' : '⏳ Identity Verification Pending'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-md" onClick={() => loadDashboard()}>
            <RotateCcw size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-md" onClick={() => onNavigate && onNavigate('studio')}>
            <Plus size={16} />
            <span>Add New Craft Product</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
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
            <h4 style={{ margin: 0 }}>🏆 Top Performing Products</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('inventory')}>Manage Inventory</button>
          </div>
          {data.top_products && data.top_products.length > 0 ? (
            data.top_products.slice(0, 4).map((p, i) => (
              <div key={p.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ₹{p.base_price} · {p.inquiry_count} Inquiries · {p.view_count} Views
                  </div>
                </div>
                <span className={`status-badge status-${p.status?.toLowerCase().replace(' ', '-')}`}>{p.status}</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
              <Package size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p>No digitized products yet</p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('studio')}>Create First Product</button>
            </div>
          )}
        </div>

        {/* Upcoming Government Exhibitions */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0 }}>🎪 Government Exhibitions & Melas</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MoSJE Linked</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allExhibitions.slice(0, 3).map((ex) => {
              const isRegistered = registeredIds.has(ex.id) || (data.upcoming_exhibitions || []).some(r => r.id === ex.id || r.name === ex.name);
              return (
                <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-surface-elevated)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ex.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {ex.location} · {ex.start_date}</div>
                  </div>
                  {isRegistered ? (
                    <span className="badge badge-success badge-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Registered
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={registeringExhibId === ex.id}
                      onClick={() => handleRegisterExhibition(ex.id, ex.name)}
                    >
                      {registeringExhibId === ex.id ? 'Registering...' : 'Register Stall'}
                    </button>
                  )}
                </div>
              );
            })}

            {allExhibitions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                <Tent size={28} style={{ opacity: 0.4, marginBottom: 6 }} />
                <p style={{ fontSize: '0.85rem' }}>No upcoming exhibitions scheduled at this time.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 20, padding: 20 }}>
        <h4 style={{ margin: '0 0 14px' }}>⚡ Quick Tools & Actions</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'AI Studio (उत्पाद फोटो)', emoji: '📸', tab: 'studio' },
            { label: 'Inventory (स्टॉक व मूल्य)', emoji: '📦', tab: 'inventory' },
            { label: 'Analytics (बिक्री रिपोर्ट)', emoji: '📊', tab: 'analytics' },
            { label: 'Inquiries & Alerts (पूछताछ)', emoji: '📬', tab: 'notifications' },
            { label: 'My Profile (प्रोफ़ाइल व बैंक)', emoji: '👤', tab: 'profile' },
          ].map(action => (
            <button key={action.tab} className="btn btn-ghost" style={{ flexDirection: 'column', padding: '14px 8px', gap: 6, border: '1px solid var(--border)', borderRadius: 10 }}
              onClick={() => onNavigate && onNavigate(action.tab)}>
              <span style={{ fontSize: '1.6rem' }}>{action.emoji}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
