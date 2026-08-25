import React, { useState } from 'react';
import Modal from '../common/Modal';
import { createInquiry } from '../../api/inquiries';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Send, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function InquiryModal({ isOpen, onClose, product }) {
  const { user, isAuthenticated } = useAuth();
  const [buyerName, setBuyerName] = useState(user?.full_name || user?.username || '');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [quantity, setQuantity] = useState('25');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);

    try {
      await createInquiry({
        product_id: product.id,
        buyer_name: buyerName || 'B2B Enterprise Buyer',
        buyer_email: buyerEmail,
        quantity: parseInt(quantity, 10) || 1,
        notes
      });
      showToast('Bulk inquiry sent directly to the artisan cooperative!', 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Inquiry submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`B2B Bulk Inquiry: ${product?.title_en || 'Product'}`}
      maxWidth="500px"
    >
      {user && user.role === 'Buyer' && !user.is_verified && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={16} />
          <span>Notice: Your buyer account is pending admin verification before direct outreach.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row" style={{ marginBottom: '14px' }}>
          <div className="col form-group">
            <label htmlFor="inq-name">Buyer / Enterprise Name</label>
            <input
              id="inq-name"
              type="text"
              className="auth-input"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="e.g. FabIndia Procurement Dept"
              required
            />
          </div>
          <div className="col form-group">
            <label htmlFor="inq-email">Business Email</label>
            <input
              id="inq-email"
              type="email"
              className="auth-input"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="procurement@brand.com"
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label htmlFor="inq-qty">Requested Bulk Quantity (Pieces)</label>
          <input
            id="inq-qty"
            type="number"
            className="auth-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label htmlFor="inq-notes">Order Specifications / Timeline Requirements</label>
          <textarea
            id="inq-notes"
            rows={3}
            className="auth-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Custom color requirements, packaging, delivery dates..."
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          <Send size={16} />
          <span>{submitting ? 'Transmitting Inquiry...' : 'Submit B2B Inquiry to Artisan'}</span>
        </button>
      </form>
    </Modal>
  );
}

