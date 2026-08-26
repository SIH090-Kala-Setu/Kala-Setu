import React, { useState, useEffect } from 'react';
import { getArtisanAnalytics, getArtisanReport } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { BarChart2, Download, Eye, MessageCircle, DollarSign } from 'lucide-react';

export default function ArtisanAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    getArtisanAnalytics()
      .then(setData)
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleDownload = async () => {
    try {
      const res = await getArtisanReport();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'artisan_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Failed to download report', 'error');
    }
  };

  if (loading || !data) return <div>Loading...</div>;

  const maxViews = Math.max(...(data.product_performance || []).map(p => p.views || 0), 1);

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>📊 Analytics</h2>
        <button className="btn btn-primary btn-sm" onClick={handleDownload}><Download size={16} /> Download CSV</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', margin: '24px 0' }}>
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderTop: '4px solid #3498DB' }}>
          <Eye size={32} color="#3498DB" style={{ margin: '0 auto 12px' }} />
          <h3>{data.total_views}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Total Views</p>
        </div>
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderTop: '4px solid #2ECC71' }}>
          <MessageCircle size={32} color="#2ECC71" style={{ margin: '0 auto 12px' }} />
          <h3>{data.total_inquiries}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Total Inquiries</p>
        </div>
        <div className="card" style={{ padding: '24px', textAlign: 'center', borderTop: '4px solid #9B59B6' }}>
          <DollarSign size={32} color="#9B59B6" style={{ margin: '0 auto 12px' }} />
          <h3>₹{(data.revenue_estimate || 0).toLocaleString()}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Est. Revenue</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h4>Performance by Product</h4>
        <div style={{ marginTop: '20px' }}>
          {data.product_performance?.map(p => (
            <div key={p.id} className="analytics-bar-row">
              <div className="analytics-bar-label">{p.title}</div>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill" style={{ width: `${(p.views / maxViews) * 100}%` }}></div>
              </div>
              <div className="analytics-bar-value">{p.views} <Eye size={12} style={{ verticalAlign: 'middle', opacity: 0.7 }} /></div>
            </div>
          ))}
          {(!data.product_performance || data.product_performance.length === 0) && (
            <p style={{ color: 'var(--text-muted)' }}>No product data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
