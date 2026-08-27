import React, { useState, useEffect, useCallback } from 'react';
import { getBuyerDashboard } from '../../api/buyer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  ShoppingBag, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  Tag,
  RotateCcw,
  Package
} from 'lucide-react';

export default function BuyerDashboard({ onSelectProduct }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const { user } = useAuth();
  const { showToast } = useToast();

  const fetchBuyerData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await getBuyerDashboard();
      setData(res);
      if (isManual) showToast('Inquiries and matched artisans updated!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to load buyer workspace', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBuyerData();
  }, [fetchBuyerData]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading B2B Buyer workspace...</p>
      </div>
    );
  }

  if (!data) return null;

  const isVerifiedBuyer = user?.is_verified ?? false;
  const filteredInquiries = (data.inquiry_history || data.inquiries || []).filter(i => filter === 'All' || i.status === filter);

  return (
    <div className="container" style={{ padding: '24px 0 60px' }}>
      {/* Header & Verified Buyer Trust Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2>🛍️ Enterprise Buyer Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Manage direct artisan bulk inquiries, track wholesale quotations, and discover verified handicraft clusters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchBuyerData(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Inquiries & Responses"
          >
            <RotateCcw size={14} className={refreshing ? 'btn-spinner' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {isVerifiedBuyer ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid var(--success)',
                borderRadius: '30px',
                color: 'var(--success)',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              <ShieldCheck size={18} />
              <span>MoSJE Verified Buyer Badge</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid var(--warning)',
                borderRadius: '30px',
                color: 'var(--warning)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <ShieldAlert size={18} />
              <span>Buyer Verification Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
          <MessageSquare size={24} color="var(--primary)" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.6rem' }}>{data.total_inquiries || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Bulk Inquiries</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--warning)' }}>
          <Clock size={24} color="var(--warning)" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.6rem' }}>{data.pending_inquiries || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Pending Artisan Responses</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--success)' }}>
          <CheckCircle size={24} color="var(--success)" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.6rem' }}>{data.completed_inquiries || (data.total_inquiries - data.pending_inquiries) || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Responded & Active Orders</p>
        </div>
      </div>

      {/* Inquiries Tracker Section */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>📋 Sent Quotation Inquiries & Order History</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['All', 'Pending', 'Responded', 'Completed'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product Inquired</th>
                <th>Artisan / Cluster</th>
                <th>Quantity</th>
                <th>Order Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map(i => (
                <tr key={i.id || i.inquiry_id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {i.created_at ? new Date(i.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {i.product_title || '(Artisan Craft Item)'}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{i.artisan_name || 'Verified Artisan'}</div>
                  </td>
                  <td>
                    <span className="badge badge-sm" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      {i.quantity || 1} Pcs
                    </span>
                  </td>
                  <td style={{ maxWidth: '240px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {i.message || 'Standard B2B quotation request.'}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${(i.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                      {i.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredInquiries.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No inquiries found matching "{filter}". Explore the Marketplace to connect with artisans!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggested Artisan Matches */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🌟 Matched Native Artisans (Based on Interests)</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {(data.suggested_artisans || []).map(a => (
            <div
              key={a.id || a.user_id}
              className="card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                transition: 'transform 0.2s ease',
                backgroundColor: 'var(--bg-surface)'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(230, 126, 34, 0.15)',
                  color: 'var(--primary)',
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  border: '1px solid var(--primary)'
                }}
              >
                {(a.name || 'A')[0].toUpperCase()}
              </div>

              <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem' }}>{a.name}</h4>
              <span className="badge badge-purple badge-sm" style={{ marginBottom: '8px' }}>
                {a.craft_type || 'Master Craftsperson'}
              </span>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                <MapPin size={12} />
                <span>{a.location || a.state || 'India'}</span>
              </p>

              {a.is_verified && (
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle size={11} />
                  <span>MoSJE Verified Artisan</span>
                </div>
              )}
            </div>
          ))}

          {(!data.suggested_artisans || data.suggested_artisans.length === 0) && (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No personalized artisan recommendations yet. Submit inquiries on marketplace products to train your procurement matching engine.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
