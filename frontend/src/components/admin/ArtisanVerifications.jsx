import React, { useState, useEffect, useCallback } from 'react';
import { getVerifications, reviewVerification } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, XCircle, Clock, Shield, Search } from 'lucide-react';

export default function ArtisanVerifications({ onActionComplete }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVerifications(statusFilter);
      setVerifications(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load verifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleReview = async (id, status) => {
    let reason = '';
    if (status === 'Rejected') {
      const promptReason = window.prompt('Enter rejection reason for KYC verification (Required):');
      if (promptReason === null) return;
      if (!promptReason.trim()) {
        showToast('Rejection reason is required.', 'error');
        return;
      }
      reason = promptReason.trim();
    }

    try {
      await reviewVerification(id, {
        status,
        rejection_reason: reason,
        aadhaar_verified: status === 'Approved',
        bank_verified: status === 'Approved'
      });
      showToast(`Artisan verification ${status.toLowerCase()} successfully!`, 'success');
      fetchVerifications();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Review action failed', 'error');
    }
  };

  const filtered = verifications.filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (v.artisan_name && v.artisan_name.toLowerCase().includes(term)) ||
      (v.craft_type && v.craft_type.toLowerCase().includes(term)) ||
      (v.state && v.state.toLowerCase().includes(term)) ||
      (v.phone_number && v.phone_number.includes(term))
    );
  });

  return (
    <div>
      {/* Header with Title & Filter Tabs */}
      <div className="admin-header-flex">
        <div>
          <h3>Artisan Identity & Onboarding Approval Pipeline</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Verify Aadhaar credentials, craft specialization, and scheme eligibility before listings go live.
          </p>
        </div>

        <div>
          <div className="filter-btn-group">
            {['all', 'Pending', 'Approved', 'Rejected'].map((st) => (
              <button
                key={st}
                className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by artisan name, craft, state, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="auth-input"
          style={{ width: '100%', maxWidth: '420px' }}
        />
      </div>

      {/* Verification Data Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>ID</th>
              <th style={{ minWidth: '160px' }}>Artisan & Craft</th>
              <th style={{ minWidth: '140px' }}>Location & Contact</th>
              <th style={{ minWidth: '150px' }}>Aadhaar & Bank Status</th>
              <th style={{ minWidth: '110px' }}>KYC Status</th>
              <th style={{ minWidth: '140px' }}>Review Decision</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>
                  Loading Verification Pipeline...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No verifications found in this view.
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {v.id.substring(0, 8)}...
                  </td>
                  <td>
                    <strong>{v.artisan_name}</strong>
                    <span className="badge badge-purple badge-sm" style={{ marginLeft: 6 }}>
                      {v.craft_type || 'Handicrafts'}
                    </span>
                    {v.cluster_name && (
                      <div>
                        <small className="text-muted">🏫 {v.cluster_name}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{v.phone_number}</div>
                    <small className="text-muted">
                      {[v.district, v.state].filter(Boolean).join(', ') || 'Varanasi, UP'}
                    </small>
                  </td>
                  <td>
                    <div>
                      {v.aadhaar_verified ? (
                        <span className="badge badge-success badge-sm">✓ Aadhaar Verified</span>
                      ) : (
                        <span className="badge badge-warning badge-sm">⏳ Aadhaar Pending</span>
                      )}
                    </div>
                    <div style={{ marginTop: '3px' }}>
                      {v.bank_verified ? (
                        <span className="badge badge-success badge-sm">✓ Bank Linked</span>
                      ) : (
                        <span className="badge badge-sm">⏳ Bank Pending</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        v.status === 'Approved'
                          ? 'badge-success'
                          : v.status === 'Rejected'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {v.status}
                    </span>
                    {v.reviewed_by_name && (
                      <div>
                        <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                          By: {v.reviewed_by_name}
                        </small>
                      </div>
                    )}
                    {v.rejection_reason && (
                      <div>
                        <small style={{ color: 'var(--error)', fontSize: '0.72rem' }}>
                          Reason: {v.rejection_reason}
                        </small>
                      </div>
                    )}
                  </td>
                  <td>
                    {v.status === 'Pending' ? (
                      <div className="table-actions">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleReview(v.id, 'Approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleReview(v.id, 'Rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

