import React, { useState, useEffect, useCallback } from 'react';
import {
  getClusters,
  createCluster,
  getClusterMembers,
  addArtisanToCluster,
  getClusterStats,
  getAllUsers
} from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { Plus, Users, BarChart3, UserPlus } from 'lucide-react';

export default function ClusterManagement({ onActionComplete }) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected cluster for member view
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [clusterStats, setClusterStats] = useState(null);

  // Form states
  const [clusterName, setClusterName] = useState('');
  const [craftSpec, setCraftSpec] = useState('');
  const [clusterState, setClusterState] = useState('');
  const [clusterDistrict, setClusterDistrict] = useState('');

  // Assign Artisan state
  const [artisanList, setArtisanList] = useState([]);
  const [selectedArtisanId, setSelectedArtisanId] = useState('');

  const { showToast } = useToast();

  const fetchClusters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClusters();
      setClusters(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load clusters', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  const handleSelectCluster = async (cluster) => {
    setSelectedCluster(cluster);
    setMembersLoading(true);
    try {
      const data = await getClusterMembers(cluster.id);
      setMembers(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load members', 'error');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleOpenStats = async (cluster) => {
    setSelectedCluster(cluster);
    try {
      const stats = await getClusterStats(cluster.id);
      setClusterStats(stats);
      setIsStatsOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to fetch cluster statistics', 'error');
    }
  };

  const handleCreateCluster = async (e) => {
    e.preventDefault();
    try {
      await createCluster({
        cluster_name: clusterName,
        state: clusterState,
        district: clusterDistrict,
        craft_specialization: craftSpec
      });
      showToast('Cluster cooperative registered successfully!', 'success');
      setIsCreateOpen(false);
      setClusterName('');
      setCraftSpec('');
      setClusterState('');
      setClusterDistrict('');
      fetchClusters();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Failed to create cluster', 'error');
    }
  };

  const handleOpenAssignModal = async () => {
    try {
      const users = await getAllUsers();
      const artisans = users.filter((u) => u.role === 'Artisan');
      setArtisanList(artisans);
      if (artisans.length > 0) setSelectedArtisanId(artisans[0].id);
      setIsAssignOpen(true);
    } catch (err) {
      showToast('Failed to load artisan list', 'error');
    }
  };

  const handleAssignArtisan = async (e) => {
    e.preventDefault();
    if (!selectedCluster || !selectedArtisanId) return;

    try {
      await addArtisanToCluster(selectedCluster.id, selectedArtisanId);
      showToast('Artisan assigned to cluster successfully!', 'success');
      setIsAssignOpen(false);
      handleSelectCluster(selectedCluster);
      fetchClusters();
    } catch (err) {
      showToast(err.message || 'Assignment failed', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3>Artisan Cooperatives & Clusters</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage cluster programs, track member artisans, and evaluate cluster-level performance.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} />
          <span>Register New Cluster</span>
        </button>
      </div>

      {/* Cluster Directory Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cluster Name</th>
              <th>Craft Specialization</th>
              <th>State & District</th>
              <th>Artisans Enrolled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>
                  Loading clusters...
                </td>
              </tr>
            ) : clusters.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No clusters registered yet.
                </td>
              </tr>
            ) : (
              clusters.map((c) => (
                <tr key={c.id} style={{ background: selectedCluster?.id === c.id ? 'rgba(230, 126, 34, 0.05)' : 'transparent' }}>
                  <td>
                    <strong>{c.cluster_name}</strong>
                  </td>
                  <td>{c.craft_specialization || 'Handicrafts'}</td>
                  <td>
                    {c.district}, {c.state}
                  </td>
                  <td>
                    <span className="badge badge-purple badge-sm">{c.total_artisans || 0} member(s)</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectCluster(c)}
                        title="View Cluster Artisans"
                      >
                        <Users size={14} />
                        <span>Members</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenStats(c)}
                        title="Inspect Performance Metrics"
                      >
                        <BarChart3 size={14} />
                        <span>Performance</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Cluster Members Subview */}
      {selectedCluster && (
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4>
              Members of <span style={{ color: 'var(--primary)' }}>{selectedCluster.cluster_name}</span>
            </h4>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenAssignModal}>
              <UserPlus size={14} />
              <span>Assign Artisan</span>
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Artisan Name</th>
                  <th>Contact Phone</th>
                  <th>Location</th>
                  <th>KYC Status</th>
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                      Loading cluster members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No artisans assigned to this cooperative yet.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.full_name || m.username}</strong>
                      </td>
                      <td>{m.phone_number || 'N/A'}</td>
                      <td>{m.district || m.region || 'Uttar Pradesh'}</td>
                      <td>
                        {m.is_verified ? (
                          <span className="badge badge-success badge-sm">✓ Verified</span>
                        ) : (
                          <span className="badge badge-warning badge-sm">⏳ Pending KYC</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Register New Cluster */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register Artisan Cooperative Cluster">
        <form onSubmit={handleCreateCluster}>
          <div className="form-group">
            <label htmlFor="cluster-name">Cooperative / Cluster Name</label>
            <input
              id="cluster-name"
              type="text"
              className="auth-input"
              placeholder="e.g. Varanasi Weavers Co-Op"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="cluster-spec">Craft Specialization</label>
            <input
              id="cluster-spec"
              type="text"
              className="auth-input"
              placeholder="e.g. Silk Handloom, Banarasi Brocade"
              value={craftSpec}
              onChange={(e) => setCraftSpec(e.target.value)}
              required
            />
          </div>
          <div className="row">
            <div className="col form-group">
              <label htmlFor="cluster-state">State</label>
              <input
                id="cluster-state"
                type="text"
                className="auth-input"
                placeholder="e.g. Uttar Pradesh"
                value={clusterState}
                onChange={(e) => setClusterState(e.target.value)}
                required
              />
            </div>
            <div className="col form-group">
              <label htmlFor="cluster-district">District</label>
              <input
                id="cluster-district"
                type="text"
                className="auth-input"
                placeholder="e.g. Varanasi"
                value={clusterDistrict}
                onChange={(e) => setClusterDistrict(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4">
            Register Cluster
          </button>
        </form>
      </Modal>

      {/* Modal 2: Assign Artisan to Cluster */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title={`Assign Artisan to ${selectedCluster?.cluster_name}`}>
        <form onSubmit={handleAssignArtisan}>
          <div className="form-group">
            <label htmlFor="assign-artisan-select">Choose Registered Artisan</label>
            <select
              id="assign-artisan-select"
              value={selectedArtisanId}
              onChange={(e) => setSelectedArtisanId(e.target.value)}
              className="auth-input"
              required
            >
              {artisanList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.username} ({a.phone_number}) — {a.region || a.state || 'Varanasi'}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4">
            Confirm Assignment
          </button>
        </form>
      </Modal>

      {/* Modal 3: Cluster Performance Stats */}
      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} title={`${clusterStats?.cluster_name || 'Cluster'} Analytics`}>
        {clusterStats && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {clusterStats.craft_specialization || 'Handicrafts'} • {clusterStats.district}, {clusterStats.state}
            </p>

            <div className="analytics-metric-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
              <div className="stats-metric-box">
                <h4>{clusterStats.total_artisans || 0}</h4>
                <p>Enrolled Artisans</p>
              </div>
              <div className="stats-metric-box">
                <h4 style={{ color: 'var(--success)' }}>{clusterStats.verified_artisans || 0}</h4>
                <p>Verified Artisans</p>
              </div>
              <div className="stats-metric-box">
                <h4 style={{ color: 'var(--purple)' }}>{clusterStats.active_product_listings || 0}</h4>
                <p>Active Listed Products</p>
              </div>
              <div className="stats-metric-box">
                <h4 style={{ color: 'var(--info)' }}>{clusterStats.total_buyer_inquiries || 0}</h4>
                <p>Buyer Inquiries</p>
              </div>
            </div>

            <button type="button" className="btn btn-secondary btn-full" onClick={() => setIsStatsOpen(false)}>
              Close Overview
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

