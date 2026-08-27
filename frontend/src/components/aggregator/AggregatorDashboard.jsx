import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAggregatorDashboard, 
  getAggregatorArtisans, 
  assistedOnboardArtisan, 
  relaySchemeToArtisans, 
  submitAggregatorReport 
} from '../../api/aggregator';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { 
  Users, 
  LayoutList, 
  AlertTriangle, 
  ShieldCheck, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  UserPlus, 
  Radio, 
  Send, 
  FileText, 
  RotateCcw, 
  Camera, 
  Mic, 
  CheckCircle, 
  Building2,
  Sparkles,
  MapPin,
  Phone
} from 'lucide-react';

export default function AggregatorDashboard() {
  const [data, setData] = useState(null);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [filterSupport, setFilterSupport] = useState('All');
  
  // Modals
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [relayModalOpen, setRelayModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  // Onboard form state
  const [onboardData, setOnboardData] = useState({
    full_name: '',
    phone_number: '',
    craft_type: 'Textiles & Handloom',
    state: 'Uttar Pradesh',
    district: '',
    preferred_language: 'Hindi',
    cluster_id: ''
  });

  // Relay Scheme form state
  const [relayData, setRelayData] = useState({
    scheme_name: 'PM-VIKAS Credit & Toolkit Assistance',
    message: 'New subsidized toolkit distribution and low-interest working capital credit announced for master weavers. Visit cluster center with Aadhaar.',
    cluster_id: ''
  });

  // Report form state
  const [reportData, setReportData] = useState({
    report_title: 'Monthly Cluster Cataloging & Welfare Progress',
    notes: 'Photography studio camps conducted for 12 weavers. 8 new craftspeople onboarded with assisted voice cataloging.'
  });

  const [submittingAction, setSubmittingAction] = useState(false);
  const { showToast } = useToast();

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [dashData, artisansData] = await Promise.all([
        getAggregatorDashboard(),
        getAggregatorArtisans()
      ]);
      setData(dashData);
      const list = Array.isArray(artisansData) ? artisansData : (artisansData?.artisans || []);
      setArtisans(list);
      if (isManual) showToast('Cluster data and artisan metrics refreshed', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to load aggregator dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Phone,Craft,State,Cluster,Listings,Needs Support,Support Reason\n" + 
      (artisans || []).map(a => `"${a.name || ''}","${a.phone || ''}","${a.craft_type || ''}","${a.state || ''}","${a.cluster_name || ''}",${a.listing_count || 0},"${a.needs_support ? 'Yes' : 'No'}","${a.support_reason || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cluster_artisans_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await assistedOnboardArtisan(onboardData);
      showToast(res.message || 'Artisan onboarded successfully!', 'success');
      setOnboardModalOpen(false);
      setOnboardData({
        full_name: '',
        phone_number: '',
        craft_type: 'Textiles & Handloom',
        state: 'Uttar Pradesh',
        district: '',
        preferred_language: 'Hindi',
        cluster_id: ''
      });
      loadData();
    } catch (err) {
      showToast(err.message || 'Onboarding failed', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRelaySubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await relaySchemeToArtisans(relayData);
      showToast(res.message || 'Scheme broadcast sent to artisans!', 'success');
      setRelayModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to broadcast alert', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const clusterName = data?.clusters?.[0]?.cluster_name || 'Assigned Handicraft Cluster';
      await submitAggregatorReport({
        report_title: reportData.report_title,
        cluster_name: clusterName,
        total_artisans: data?.total_artisans || artisans.length,
        active_listings: data?.total_active_listings || 0,
        support_needed_count: data?.artisans_needing_support || 0,
        notes: reportData.notes
      });
      showToast('Cluster progress report officially transmitted to MoSJE Admin!', 'success');
      setReportModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
        <div className="spinner" />
        <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>Loading cluster management workspace...</span>
      </div>
    );
  }

  const clusters = data?.clusters || [];
  const filteredArtisans = (artisans || []).filter(a => {
    if (filterSupport === 'NeedsHelp') return a.needs_support;
    if (filterSupport === 'Digitized') return !a.needs_support;
    return true;
  });

  return (
    <div className="container" style={{ padding: '24px 0 60px' }}>
      {/* Header & Quick Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2>🤝 Cluster Aggregator Console</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Managed by: <strong>{data.aggregator_name || 'Regional Coordinator'}</strong> · SHG Cooperative & Cluster Digitization Hub
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => loadData(true)} disabled={refreshing} title="Refresh">
            <RotateCcw size={14} className={refreshing ? 'btn-spinner' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setRelayModalOpen(true)}>
            <Radio size={14} />
            <span>Relay Scheme Alert</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setReportModalOpen(true)}>
            <FileText size={14} />
            <span>Submit MoSJE Report</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setOnboardModalOpen(true)}>
            <UserPlus size={14} />
            <span>Assisted Onboard</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3498DB' }}>
          <LayoutList size={24} color="#3498DB" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.6rem' }}>{data.total_clusters || 1}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Clusters</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #E67E22' }}>
          <Users size={24} color="#E67E22" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.6rem' }}>{data.total_artisans || artisans.length}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Managed Artisans</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #2ECC71' }}>
          <ShieldCheck size={24} color="#2ECC71" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.6rem' }}>{data.total_active_listings || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Digitized Products</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #E74C3C' }}>
          <AlertTriangle size={24} color="#E74C3C" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '1.6rem' }}>{data.artisans_needing_support || 0}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Need Photo/Catalog Help</p>
        </div>
      </div>

      {/* Cluster Monitoring & Catalogue Completion Status */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>📊 Cluster Catalogue Status & Assisted Support</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Track which artisans have digitized their craft and flag members requiring photography or voice assistance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['All', 'NeedsHelp', 'Digitized'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filterSupport === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterSupport(f)}
              >
                {f === 'NeedsHelp' ? '⚠️ Needs Support' : f === 'Digitized' ? '✅ Digitized' : 'All Artisans'}
              </button>
            ))}
          </div>
        </div>

        {clusters.map((cluster) => {
          const clusterArtisans = (filteredArtisans || []).filter(
            a => a.cluster_name === cluster.cluster_name || (!a.cluster_name && cluster.cluster_name.includes('Cooperative'))
          );

          return (
            <div key={cluster.cluster_id || cluster.cluster_name} className="card" style={{ marginBottom: '16px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer', 
                  background: 'var(--bg-surface-elevated)',
                  borderBottom: expandedCluster === cluster.cluster_name ? '1px solid var(--border-color)' : 'none'
                }}
                onClick={() => setExpandedCluster(expandedCluster === cluster.cluster_name ? null : cluster.cluster_name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={20} color="var(--primary)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{cluster.cluster_name}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      📍 {cluster.district ? `${cluster.district}, ` : ''}{cluster.state} · Specialization: {cluster.craft_specialization || 'Handicrafts'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="badge badge-purple badge-sm">
                    {cluster.artisans_with_listings || 0} / {cluster.total_artisans || 0} Digitized
                  </span>
                  {expandedCluster === cluster.cluster_name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
              
              {expandedCluster === cluster.cluster_name && (
                <div style={{ padding: '0 20px 20px', overflowX: 'auto' }}>
                  <table className="inventory-table" style={{ marginTop: '12px' }}>
                    <thead>
                      <tr>
                        <th>Artisan Name</th>
                        <th>Craft Type</th>
                        <th>Contact / Phone</th>
                        <th>Catalogue Status</th>
                        <th>Listings</th>
                        <th>Assisted Support Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusterArtisans.map((a) => (
                        <tr key={a.id || a.user_id}>
                          <td style={{ fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{a.name}</span>
                              {a.is_verified && <ShieldCheck size={14} color="var(--success)" title="Verified Artisan" />}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              {a.craft_type || 'Artisan'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <Phone size={11} style={{ marginRight: 4, display: 'inline' }} />
                            {a.phone || 'N/A'}
                          </td>
                          <td>
                            {a.listing_count > 0 ? (
                              <span className="status-badge status-active">
                                {a.listing_count} Active {a.listing_count === 1 ? 'Item' : 'Items'}
                              </span>
                            ) : (
                              <span className="status-badge status-sold-out">
                                0 Listings (Unlisted)
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>{a.listing_count || 0}</td>
                          <td>
                            {a.needs_support ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 600 }}>
                                <Camera size={14} />
                                <span>Needs Photography / Voice Help</span>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                                <CheckCircle size={14} />
                                <span>Self-Sufficient</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {clusterArtisans.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No artisans found under this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {clusters.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No cluster assignments found. Use "Assisted Onboard" to register your first artisan!
          </div>
        )}
      </div>

      {/* MODAL 1: Assisted Onboarding for Low-Literacy Artisans */}
      <Modal
        isOpen={onboardModalOpen}
        onClose={() => setOnboardModalOpen(false)}
        title="🤝 Assisted Artisan Onboarding"
        maxWidth="520px"
      >
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Onboard rural and low-literacy artisans into your cooperative cluster. You can later assist them in studio photography and AI voice-guided cataloging.
        </p>

        <form onSubmit={handleOnboardSubmit}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label htmlFor="onb-name">Artisan Full Name</label>
            <input
              id="onb-name"
              type="text"
              className="auth-input"
              value={onboardData.full_name}
              onChange={(e) => setOnboardData({ ...onboardData, full_name: e.target.value })}
              placeholder="e.g. Rameshwar Lal"
              required
            />
          </div>

          <div className="row" style={{ marginBottom: '12px' }}>
            <div className="col form-group">
              <label htmlFor="onb-phone">Mobile Phone</label>
              <input
                id="onb-phone"
                type="tel"
                className="auth-input"
                value={onboardData.phone_number}
                onChange={(e) => setOnboardData({ ...onboardData, phone_number: e.target.value })}
                placeholder="10-digit mobile number"
                required
              />
            </div>
            <div className="col form-group">
              <label htmlFor="onb-lang">Preferred Language</label>
              <select
                id="onb-lang"
                className="auth-input"
                value={onboardData.preferred_language}
                onChange={(e) => setOnboardData({ ...onboardData, preferred_language: e.target.value })}
              >
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="English">English</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label htmlFor="onb-craft">Craft Specialization</label>
            <select
              id="onb-craft"
              className="auth-input"
              value={onboardData.craft_type}
              onChange={(e) => setOnboardData({ ...onboardData, craft_type: e.target.value })}
            >
              <option value="Textiles & Handloom">Textiles & Handloom (Banarasi / Chanderi)</option>
              <option value="Clay & Blue Pottery">Clay & Blue Pottery</option>
              <option value="Tribal & Silver Jewelry">Tribal & Silver Jewelry</option>
              <option value="Folk Paintings & Art">Folk Paintings & Art (Madhubani / Pattachitra)</option>
              <option value="Wood Inlay & Carving">Wood Inlay & Carving</option>
              <option value="Handicrafts & Decor">Handicrafts & Metalwork</option>
            </select>
          </div>

          <div className="row" style={{ marginBottom: '18px' }}>
            <div className="col form-group">
              <label htmlFor="onb-state">State / Region</label>
              <input
                id="onb-state"
                type="text"
                className="auth-input"
                value={onboardData.state}
                onChange={(e) => setOnboardData({ ...onboardData, state: e.target.value })}
                required
              />
            </div>
            <div className="col form-group">
              <label htmlFor="onb-dist">District / Village</label>
              <input
                id="onb-dist"
                type="text"
                className="auth-input"
                value={onboardData.district}
                onChange={(e) => setOnboardData({ ...onboardData, district: e.target.value })}
                placeholder="e.g. Varanasi / Jaipur"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submittingAction}>
            <UserPlus size={16} />
            <span>{submittingAction ? 'Registering...' : 'Complete Assisted Registration'}</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 2: Relay Government Scheme / Opportunity Alert */}
      <Modal
        isOpen={relayModalOpen}
        onClose={() => setRelayModalOpen(false)}
        title="📢 Broadcast Scheme & Exhibition Alert"
        maxWidth="500px"
      >
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Transmit official MoSJE welfare schemes, working capital subsidies, and national exhibition opportunities to all artisans in your cluster.
        </p>

        <form onSubmit={handleRelaySubmit}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label htmlFor="rel-title">Scheme / Opportunity Title</label>
            <input
              id="rel-title"
              type="text"
              className="auth-input"
              value={relayData.scheme_name}
              onChange={(e) => setRelayData({ ...relayData, scheme_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label htmlFor="rel-msg">Broadcast Message (SMS / In-App)</label>
            <textarea
              id="rel-msg"
              rows={4}
              className="auth-input"
              value={relayData.message}
              onChange={(e) => setRelayData({ ...relayData, message: e.target.value })}
              placeholder="Application deadline, benefits, and documents required..."
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submittingAction}>
            <Radio size={16} />
            <span>{submittingAction ? 'Broadcasting...' : 'Broadcast to All Cluster Artisans'}</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 3: Submit Cluster Progress Report to MoSJE Admin */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="🏛️ Submit Report to MoSJE Admin"
        maxWidth="500px"
      >
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Directly submit your cluster's digitization progress, welfare milestones, and support requirements to Ministry Administrators.
        </p>

        <form onSubmit={handleReportSubmit}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label htmlFor="rep-title">Report Title</label>
            <input
              id="rep-title"
              type="text"
              className="auth-input"
              value={reportData.report_title}
              onChange={(e) => setReportData({ ...reportData, report_title: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label htmlFor="rep-notes">Field Notes & Welfare Assessment</label>
            <textarea
              id="rep-notes"
              rows={4}
              className="auth-input"
              value={reportData.notes}
              onChange={(e) => setReportData({ ...reportData, notes: e.target.value })}
              placeholder="Summarize digitization camps, photography drives, and key assistance needed..."
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submittingAction}>
            <Send size={16} />
            <span>{submittingAction ? 'Submitting...' : 'Submit Official Report to MoSJE Admin'}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
