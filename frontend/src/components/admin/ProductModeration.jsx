import React, { useState, useEffect, useCallback } from 'react';
import { getFlaggedProducts, moderateProduct } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function ProductModeration({ onActionComplete }) {
  const [flaggedProducts, setFlaggedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reject Modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFlaggedProducts();
      setFlaggedProducts(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load flagged listings', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFlagged();
  }, [fetchFlagged]);

  const handleApprove = async (productId) => {
    try {
      await moderateProduct(productId, 'Active');
      showToast('Product approved and live on marketplace!', 'success');
      fetchFlagged();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleOpenReject = (productId) => {
    setSelectedProductId(productId);
    setRejectReason('');
    setIsRejectOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setSubmitting(true);

    try {
      await moderateProduct(selectedProductId, 'Archived', rejectReason);
      showToast('Product listing rejected and archived.', 'info');
      setIsRejectOpen(false);
      fetchFlagged();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3>Product Listing Moderation Queue</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Review artisan listings queued for quality assurance and compliance before they go live.
          </p>
        </div>
        <span className="badge badge-warning">
          {flaggedProducts.length} Listing(s) Pending Review
        </span>
      </div>

      {/* Moderation Queue Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Product Title</th>
              <th>Artisan & Cooperative</th>
              <th>Category & Material</th>
              <th>Retail / B2B Price</th>
              <th>Stock</th>
              <th>Moderation Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                  Loading moderation queue...
                </td>
              </tr>
            ) : flaggedProducts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  🎉 Moderation queue is clear! No products pending review.
                </td>
              </tr>
            ) : (
              flaggedProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.title_en}
                        className="product-thumb"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/48?text=Craft';
                        }}
                      />
                    ) : (
                      <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🎨
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{p.title_en}</strong>
                    {p.title_hi && (
                      <div>
                        <small className="text-muted">{p.title_hi}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{p.artisan_name || 'Independent Artisan'}</div>
                    {p.artisan_coop && (
                      <small className="text-muted">🏫 {p.artisan_coop}</small>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-purple badge-sm">{p.category}</span>
                    {p.materials && p.materials.length > 0 && (
                      <div>
                        <small className="text-muted">{p.materials.join(', ')}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    <div>Retail: ₹ {p.retail_price}</div>
                    <small className="text-muted">B2B: ₹ {p.b2b_price}</small>
                  </td>
                  <td>{p.stock} pcs</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(p.id)}
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleOpenReject(p.id)}
                      >
                        <XCircle size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Reject Listing with Reason */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Reject / Archive Listing">
        <form onSubmit={handleConfirmReject}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Provide constructive feedback to the artisan explaining why this product did not meet platform quality standards.
          </p>
          <div className="form-group">
            <label htmlFor="mod-reject-reason">Rejection Reason</label>
            <textarea
              id="mod-reject-reason"
              rows={3}
              className="auth-input"
              placeholder="e.g. Photo lighting insufficient, inaccurate dimensions, or craft category mismatch."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-danger btn-full mt-4" disabled={submitting}>
            {submitting ? 'Archiving...' : 'Confirm Rejection & Notify Artisan'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

