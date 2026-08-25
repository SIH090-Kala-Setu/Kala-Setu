import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { FileText } from 'lucide-react';

export default function AuditTrails() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load audit trails', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3>Administrative Action Audit Trail</h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Tamper-evident log of administrative verifications, scheme broadcasts, buyer badging, and product moderation.
        </p>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Admin User</th>
              <th>Action Taken</th>
              <th>Entity Reference</th>
              <th>Change Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>
                  Loading audit trails...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No administrative actions logged yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td>
                    <strong>{l.admin_name}</strong>
                  </td>
                  <td>{l.action}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {l.entity_id ? `${l.entity_type} (${l.entity_id.substring(0, 8)}...)` : 'System'}
                  </td>
                  <td>
                    <small
                      className="text-muted"
                      style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                    >
                      {l.change_snapshot ? JSON.stringify(l.change_snapshot) : 'None'}
                    </small>
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

