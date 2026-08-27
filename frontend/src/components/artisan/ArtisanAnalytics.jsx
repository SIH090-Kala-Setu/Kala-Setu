import React, { useState, useEffect } from 'react';
import { getArtisanAnalytics, getArtisanReport } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { BarChart2, Download, Eye, MessageCircle, IndianRupee, TrendingUp, CheckCircle, Package, Layers } from 'lucide-react';

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
      a.download = `artisan_sales_report_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Sales report downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download report', 'error');
    }
  };

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <p>Loading your income & performance analytics (बिक्री रिपोर्ट)...</p>
      </div>
    );
  }

  const productList = data.all_products || data.top_products || [];
  const maxViews = Math.max(...productList.map(p => p.view_count || p.views || 0), 1);
  const totalRevenue = data.total_revenue_estimate || data.revenue_estimate || 0;

  return (
    <div className="container" style={{ padding: '24px 0 60px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h2>📊 Income & Performance Analytics (आय व बिक्री)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Real-time breakdown of catalog discovery, wholesale inquiries, and estimated sales volume.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleDownload}>
          <Download size={15} />
          <span>Download Sales CSV (रिपोर्ट)</span>
        </button>
      </div>

      {/* 4 KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3498DB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Eye size={22} color="#3498DB" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Views (दृश्य)</span>
          </div>
          <h3 style={{ fontSize: '1.7rem', margin: 0 }}>{data.total_views || 0}</h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>All-time catalog traffic</p>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #2ECC71' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <MessageCircle size={22} color="#2ECC71" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bulk Inquiries (पूछताछ)</span>
          </div>
          <h3 style={{ fontSize: '1.7rem', margin: 0 }}>{data.total_inquiries || 0}</h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Wholesale B2B linkages</p>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #9B59B6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <IndianRupee size={22} color="#9B59B6" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estimated Income (आय)</span>
          </div>
          <h3 style={{ fontSize: '1.7rem', margin: 0 }}>₹{totalRevenue.toLocaleString('en-IN')}</h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Completed order value</p>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #E67E22' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Layers size={22} color="#E67E22" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Listings (उत्पाद)</span>
          </div>
          <h3 style={{ fontSize: '1.7rem', margin: 0 }}>{data.active_listings || data.total_listings || 0}</h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Live on national marketplace</p>
        </div>
      </div>

      {/* Visual Product Popularity & Inquiries Bar Chart */}
      <div className="card" style={{ padding: '24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem' }}>🏆 Product Discovery & Demand Breakdown</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {productList.map(p => {
            const views = p.view_count || p.views || 0;
            const inqs = p.inquiry_count || 0;
            const pct = Math.max(8, (views / maxViews) * 100);

            return (
              <div key={p.id || p.product_id} style={{ padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                    {p.title || p.title_en || 'Artisan Craft Item'}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#3498DB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={13} /> {views} Views
                    </span>
                    <span style={{ color: '#2ECC71', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageCircle size={13} /> {inqs} Inquiries
                    </span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      ₹{p.base_price || 0}
                    </span>
                  </div>
                </div>

                <div className="analytics-bar-track" style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    className="analytics-bar-fill" 
                    style={{ 
                      width: `${pct}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #3498DB, #2ECC71)',
                      borderRadius: '4px',
                      transition: 'width 0.6s ease'
                    }} 
                  />
                </div>
              </div>
            );
          })}

          {productList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p>No products digitized yet. Add your first craft product in AI Studio to see analytics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
