import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { markNotificationRead, markAllNotificationsRead, respondToInquiry } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { Bell, Check, MessageCircle, Shield, Info, Send, Clock, User, Package, Reply } from 'lucide-react';

export default function NotificationsCenter({ filterType }) {
  const [notifications, setNotifications] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(filterType === 'Inquiry' ? 'inquiries' : 'notifications');
  const [filter, setFilter] = useState('All');
  const [replyingInquiryId, setReplyingInquiryId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifsData, inqsData] = await Promise.all([
        apiClient('/notifications').catch(() => []),
        apiClient('/inquiries').catch(() => [])
      ]);
      setNotifications(notifsData || []);
      setInquiries(inqsData || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSendReply = async (inquiryId) => {
    if (!replyText.trim()) {
      showToast('Please type a response message', 'warning');
      return;
    }
    setSendingReply(true);
    try {
      await respondToInquiry(inquiryId, replyText);
      setInquiries(inquiries.map(i => i.id === inquiryId ? { ...i, status: 'Responded' } : i));
      setReplyingInquiryId(null);
      setReplyText('');
      showToast('Response transmitted directly to buyer!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send response', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Inquiry': return <MessageCircle size={20} color="#3498DB" />;
      case 'Verification': return <Shield size={20} color="#2ECC71" />;
      case 'System': return <Info size={20} color="#9B59B6" />;
      default: return <Bell size={20} color="#E67E22" />;
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'Unread') return !n.is_read;
    if (filter === 'Inquiry') return n.type === 'Inquiry';
    if (filter === 'Scheme') return n.type === 'Scheme';
    return true;
  });

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '30px auto 60px' }}>
      {/* View Switcher: Buyer Inquiries vs System Notifications */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2>📬 Inquiries & Notifications Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Manage direct wholesale quotation inquiries from enterprise buyers and official government scheme alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'inquiries' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('inquiries')}
          >
            <MessageCircle size={15} />
            <span>Buyer Inquiries ({inquiries.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={15} />
            <span>System Alerts ({notifications.filter(n => !n.is_read).length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <p>Loading messages & inquiry history...</p>
        </div>
      ) : activeTab === 'inquiries' ? (
        /* Direct Buyer Inquiries Feed */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Direct Wholesale & Bulk Requests</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {inquiries.filter(i => i.status === 'Pending').length} Pending Response
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                className="card"
                style={{
                  padding: '20px',
                  borderLeft: inq.status === 'Pending' ? '4px solid var(--warning)' : '4px solid var(--success)',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {inq.buyer_name || 'B2B Wholesale Buyer'}
                      </strong>
                      <span className="badge badge-purple badge-sm">
                        {inq.quantity || 1} Pieces Requested
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Buyer Contact: {inq.buyer_email || 'Verified Buyer'}
                    </div>
                  </div>

                  <span className={`status-badge status-${(inq.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                    {inq.status || 'Pending'}
                  </span>
                </div>

                {/* Inquired Product Info */}
                {inq.product && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px', marginBottom: '12px' }}>
                    <Package size={16} color="var(--primary)" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                      Product: {inq.product.title_en}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
                      ₹{inq.product.retail_price} / unit
                    </span>
                  </div>
                )}

                {/* Inquiry Custom Notes */}
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                  <strong>Buyer Request: </strong>
                  {inq.notes || inq.message || 'Standard wholesale inquiry regarding delivery dates and bulk pricing.'}
                </div>

                {/* Reply Section */}
                {replyingInquiryId === inq.id ? (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <textarea
                      rows={3}
                      className="auth-input"
                      placeholder="Type your response to the buyer (quotation details, lead time, customization options)..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ marginBottom: '10px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setReplyingInquiryId(null)}>
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={sendingReply}
                        onClick={() => handleSendReply(inq.id)}
                      >
                        <Send size={14} />
                        <span>{sendingReply ? 'Transmitting...' : 'Send Response'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setReplyingInquiryId(inq.id);
                        setReplyText(`Thank you for your interest in our craft! We can supply ${inq.quantity} units within ...`);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Reply size={14} />
                      <span>{inq.status === 'Responded' ? 'Send Follow-up Message' : 'Reply & Quote Price'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {inquiries.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <MessageCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <h4>No buyer inquiries yet</h4>
                <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>
                  When B2B buyers find your products on the Marketplace, their quotation requests will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* System Notifications Feed */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'Unread', 'Inquiry', 'Scheme'].map(f => (
                <button
                  key={f}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
              <Check size={14} />
              <span>Mark all read</span>
            </button>
          </div>

          <div className="card" style={{ padding: '8px 16px' }}>
            {filteredNotifs.length > 0 ? (
              filteredNotifs.map(n => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="notif-icon">{getIcon(n.type)}</div>
                  <div className="notif-body">
                    <div className="notif-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{n.title}</span>
                      {!n.is_read && <span className="badge badge-primary badge-sm">New</span>}
                    </div>
                    <div className="notif-text">{n.body || n.message || ''}</div>
                    <div className="notif-time">{n.sent_at ? new Date(n.sent_at).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No notifications found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
