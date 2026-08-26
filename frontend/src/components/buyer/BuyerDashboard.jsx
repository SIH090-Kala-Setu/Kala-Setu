import React, { useState, useEffect } from 'react';
import { getBuyerDashboard } from '../../api/buyer';
import { useToast } from '../../context/ToastContext';
import { ShoppingBag, MessageSquare, CheckCircle, Clock } from 'lucide-react';

export default function BuyerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const { showToast } = useToast();

  useEffect(() => {
    getBuyerDashboard()
      .then(setData)
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading || !data) return <div>Loading...</div>;

  const filteredInquiries = (data.inquiry_history || data.inquiries || []).filter(i => filter === 'All' || i.status === filter);

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <h2 style={{ marginBottom: '24px' }}>🛍️ Buyer Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3498DB' }}>
          <MessageSquare size={24} color="#3498DB" />
          <h3 style={{ margin: '8px 0 4px' }}>{data.total_inquiries || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Inquiries</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #F39C12' }}>
          <Clock size={24} color="#F39C12" />
          <h3 style={{ margin: '8px 0 4px' }}>{data.pending_inquiries || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Pending Responses</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #2ECC71' }}>
          <CheckCircle size={24} color="#2ECC71" />
          <h3 style={{ margin: '8px 0 4px' }}>{data.completed_inquiries || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Completed Orders</p>
        </div>
      </div>

      <h3>My Inquiries</h3>
      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        {['All', 'Pending', 'Responded', 'Completed'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Artisan</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInquiries.map(i => (
              <tr key={i.id || i.inquiry_id}>
                <td>{i.created_at ? new Date(i.created_at).toLocaleDateString() : '—'}</td>
                <td style={{ fontWeight: 500 }}>{i.product_title || '(Unknown Item)'}</td>
                <td>{i.artisan_name || 'Artisan'}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.message || '—'}</td>
                <td>
                  <span className={`status-badge status-${(i.status || 'pending').toLowerCase().replace(' ', '-')}`}>{i.status}</span>
                </td>
              </tr>
            ))}
            {filteredInquiries.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No inquiries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>🌟 Suggested Artisans</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {(data.suggested_artisans || []).map(a => (
          <div key={a.id || a.user_id} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              👤
            </div>
            <h4 style={{ margin: '0 0 4px' }}>{a.name}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{a.craft_type}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>📍 {a.location || a.state || ''}</p>
          </div>
        ))}
        {(!data.suggested_artisans || data.suggested_artisans.length === 0) && (
          <p style={{ color: 'var(--text-muted)' }}>No suggestions at this time.</p>
        )}
      </div>
    </div>
  );
}
