import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { markNotificationRead, markAllNotificationsRead } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { Bell, Check, MessageCircle, Shield, Info } from 'lucide-react';

export default function NotificationsCenter({ filterType }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(filterType || 'All');
  const { showToast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await apiClient('/notifications');
      setNotifications(data || []);
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
    } catch (err) {
      showToast(err.message, 'error');
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

  const filtered = notifications.filter(n => {
    if (filter === 'Unread') return !n.is_read;
    if (filter === 'Inquiry') return n.type === 'Inquiry';
    if (filter === 'Scheme') return n.type === 'Scheme';
    return true;
  });

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>🔔 Notifications</h2>
        <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}><Check size={16} /> Mark all read</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['All', 'Unread', 'Inquiry', 'Scheme'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
        ) : filtered.length > 0 ? (
          filtered.map(n => (
            <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && handleMarkRead(n.id)}>
              <div className="notif-icon">{getIcon(n.type)}</div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-text">{n.message}</div>
                <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
        )}
      </div>
    </div>
  );
}
