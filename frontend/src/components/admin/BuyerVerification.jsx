import React, { useState, useEffect, useCallback } from 'react';
import { getAllBuyers, verifyBuyer } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, ShieldAlert, Building2 } from 'lucide-react';

export default function BuyerVerification({ onActionComplete }) {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchBuyers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllBuyers();
      setBuyers(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load buyers', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  const handleToggleVerification = async (buyerId, newStatus) => {
    try {
      await verifyBuyer(buyerId, newStatus);
      showToast(`Buyer status ${newStatus ? 'verified and badged' : 'revoked'}.`, 'success');
      fetchBuyers();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Failed to update buyer verification', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3>B2B Buyer Verification & Badging</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Verify corporate buyers and export houses before permitting direct artisan bulk linkages to prevent exploitation.
          </p>
        </div>
        <span className="badge badge-info">{buyers.length} Registered Buyers</span>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Buyer Name & Account</th>
              <th>Contact Details</th>
              <th>Location</th>
              <th>Inquiries Sent</th>
              <th>Verification Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                  Loading buyer pipeline...
                </td>
              </tr>
            ) : buyers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No B2B buyers registered yet.
                </td>
              </tr>
            ) : (
              buyers.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.full_name}</strong>
                    <div>
                      <small className="text-muted">@{b.username}</small>
                    </div>
                  </td>
                  <td>
                    <div>{b.email || 'No email provided'}</div>
                    <small className="text-muted">{b.phone_number}</small>
                  </td>
                  <td>{b.state || 'National'}</td>
                  <td>
                    <span className="badge badge-info badge-sm">{b.inquiries_sent || 0} inquiry(ies)</span>
                  </td>
                  <td>
                    <span className={`badge ${b.is_verified ? 'badge-success' : 'badge-warning'}`}>
                      {b.is_verified ? '✓ Verified Buyer' : '⏳ Unverified'}
                    </span>
                  </td>
                  <td>
                    {!b.is_verified ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleToggleVerification(b.id, true)}
                      >
                        <ShieldCheck size={14} />
                        <span>Verify Buyer</span>
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleVerification(b.id, false)}
                      >
                        <ShieldAlert size={14} />
                        <span>Revoke Badge</span>
                      </button>
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

