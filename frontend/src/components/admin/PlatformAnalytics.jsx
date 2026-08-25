import React, { useState, useEffect, useCallback } from 'react';
import { getAdminAnalytics } from '../../api/admin';
import { getProducts } from '../../api/products';
import { useToast } from '../../context/ToastContext';
import { TrendingUp, Award, DollarSign, Building2, MapPin } from 'lucide-react';

export default function PlatformAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, productsData] = await Promise.all([
        getAdminAnalytics(),
        getProducts()
      ]);
      setAnalytics(analyticsData);

      // Tally Category counts
      const counts = {};
      (productsData || []).forEach((p) => {
        counts[p.category] = (counts[p.category] || 0) + 1;
      });
      const defaultCats = ['Textiles', 'Handicrafts', 'Pottery', 'Jewelry', 'Paintings & Art', 'Woodwork'];
      defaultCats.forEach((c) => {
        if (!counts[c]) counts[c] = 0;
      });
      setCategoryCounts(counts);
    } catch (err) {
      showToast(err.message || 'Failed to load impact analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !analytics) {
    return <div style={{ textAlign: 'center', padding: '48px' }}>Loading platform impact analytics...</div>;
  }

  const totalArtisans = analytics.artisans_count || 0;
  const verifiedArtisans = analytics.verified_artisans_count || 0;
  const verifiedRate = totalArtisans > 0 ? ((verifiedArtisans / totalArtisans) * 100).toFixed(1) : 0;
  const regionalData = analytics.regional_breakdown || {};
  const maxStateCount = Math.max(...Object.values(regionalData), 1);
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3>Platform Impact & Mandate Tracking</h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Real-time metrics for MoSJE: monitoring income upliftment, digital literacy adoption, and regional penetration.
        </p>
      </div>

      {/* Top 4 Impact Metric Cards */}
      <div className="analytics-metric-grid">
        <div className="analytics-metric-card">
          <div className="analytics-metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Award size={22} />
          </div>
          <div>
            <div className="analytics-metric-val">{verifiedRate}%</div>
            <div className="analytics-metric-lbl">KYC Verification Rate</div>
          </div>
        </div>

        <div className="analytics-metric-card">
          <div className="analytics-metric-icon" style={{ backgroundColor: 'rgba(230, 126, 34, 0.1)', color: 'var(--primary)' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="analytics-metric-val">₹ {analytics.avg_product_price || 0}</div>
            <div className="analytics-metric-lbl">Avg. Listing Price</div>
          </div>
        </div>

        <div className="analytics-metric-card">
          <div className="analytics-metric-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--info)' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div className="analytics-metric-val">{analytics.clusters_count || 0}</div>
            <div className="analytics-metric-lbl">Active Cooperatives</div>
          </div>
        </div>

        <div className="analytics-metric-card">
          <div className="analytics-metric-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="analytics-metric-val">
              {analytics.verified_buyers_count || 0} / {analytics.buyers_count || 0}
            </div>
            <div className="analytics-metric-lbl">Verified B2B Buyers</div>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Distribution */}
      <div className="analytics-two-col">
        {/* Left Card: Regional Adoption Rates */}
        <div className="stats-card-panel">
          <h5>
            <MapPin size={16} color="var(--primary)" />
            <span>Regional Artisan Adoption (By State)</span>
          </h5>
          <div style={{ marginTop: '14px', maxHeight: '280px', overflowY: 'auto' }}>
            {Object.keys(regionalData).length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No state distribution data recorded.</p>
            ) : (
              Object.entries(regionalData).map(([state, count]) => {
                const pct = (count / maxStateCount) * 100;
                return (
                  <div key={state} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                      <span><strong>{state}</strong></span>
                      <span>{count} artisan(s)</span>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', height: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))', width: `${pct}%`, height: '100%' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Card: Cluster Performance Rankings */}
        <div className="stats-card-panel">
          <h5>
            <Building2 size={16} color="var(--purple)" />
            <span>Cluster Performance & Output</span>
          </h5>
          <div style={{ marginTop: '14px', maxHeight: '280px', overflowY: 'auto' }}>
            {(analytics.cluster_breakdown || []).length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No cluster performance data available.</p>
            ) : (
              analytics.cluster_breakdown.map((c) => (
                <div
                  key={c.cluster_id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.88rem' }}>{c.cluster_name}</strong>
                    <div>
                      <small className="text-muted">{c.state || ''} • {c.total_artisans || 0} artisans</small>
                    </div>
                  </div>
                  <div>
                    <span className="badge badge-purple badge-sm">{c.active_products || 0} active listings</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Craft Category Distribution Bar Chart */}
      <div className="stats-card-panel">
        <h5>📊 Catalog Distribution by Craft Categories</h5>
        <div style={{ marginTop: '16px' }}>
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const pct = (count / maxCategoryCount) * 100;
            return (
              <div key={cat} style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span><strong>{cat}</strong></span>
                  <span>{count} active listing(s)</span>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', height: '14px', width: '100%', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))', width: `${pct}%`, height: '100%', borderRadius: '5px' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

