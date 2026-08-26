import React, { useState, useEffect } from 'react';
import { getAggregatorDashboard, getAggregatorArtisans } from '../../api/aggregator';
import { useToast } from '../../context/ToastContext';
import { Users, LayoutList, AlertTriangle, ShieldCheck, Download, ChevronDown, ChevronUp } from 'lucide-react';

export default function AggregatorDashboard() {
  const [data, setData] = useState(null);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([getAggregatorDashboard(), getAggregatorArtisans()])
      .then(([dashData, artisansData]) => {
        setData(dashData);
        setArtisans(artisansData);
      })
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading || !data) return <div>Loading...</div>;

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Craft,Verified,Listings,Needs Support\n" + 
      artisans.map(a => `${a.name},${a.craft_type},${a.is_verified},${a.listing_count},${a.needs_support}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "artisans.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clusters = [...new Set(artisans.map(a => a.cluster_name || 'Unassigned'))];

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>🤝 Aggregator Dashboard</h2>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={16} /> Export List</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3498DB' }}>
          <LayoutList size={24} color="#3498DB" />
          <h3 style={{ margin: '8px 0 4px' }}>{data.total_clusters}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Clusters</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #E67E22' }}>
          <Users size={24} color="#E67E22" />
          <h3 style={{ margin: '8px 0 4px' }}>{data.total_artisans}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Managed Artisans</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #2ECC71' }}>
          <ShieldCheck size={24} color="#2ECC71" />
          <h3 style={{ margin: '8px 0 4px' }}>{data.active_listings}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Listings</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #E74C3C' }}>
          <AlertTriangle size={24} color="#E74C3C" />
          <h3 style={{ margin: '8px 0 4px' }}>{data.artisans_needing_support}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Need Support</p>
        </div>
      </div>

      <h3>Cluster Management</h3>
      <div style={{ marginTop: '16px' }}>
        {clusters.map(cluster => (
          <div key={cluster} className="card" style={{ marginBottom: '12px' }}>
            <div 
              style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
              onClick={() => setExpandedCluster(expandedCluster === cluster ? null : cluster)}
            >
              <h4 style={{ margin: 0 }}>📍 {cluster}</h4>
              {expandedCluster === cluster ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            
            {expandedCluster === cluster && (
              <div style={{ padding: '0 20px 20px' }}>
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Artisan Name</th>
                      <th>Craft Type</th>
                      <th>Status</th>
                      <th>Listings</th>
                      <th>Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artisans.filter(a => (a.cluster_name || 'Unassigned') === cluster).map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.name}</td>
                        <td>{a.craft_type}</td>
                        <td>{a.is_verified ? <span style={{ color: 'var(--success)' }}>✅ Verified</span> : <span style={{ color: 'var(--warning)' }}>⏳ Pending</span>}</td>
                        <td>{a.listing_count}</td>
                        <td>{a.needs_support ? <span className="status-badge status-sold-out">Needs Help</span> : <span className="status-badge status-active">OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {clusters.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No clusters or artisans found.</p>}
      </div>
    </div>
  );
}
