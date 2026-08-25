import React, { useState, useEffect, useCallback } from 'react';
import {
  getGovtSchemes,
  createGovtScheme,
  updateGovtScheme,
  broadcastSchemeAlert,
  getSchemeAlertHistory
} from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { Plus, Bell, History, Play, Pause } from 'lucide-react';

export default function GovtSchemes({ onActionComplete }) {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Create Form State
  const [schemeName, setSchemeName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Broadcast Form State
  const [targetState, setTargetState] = useState('');
  const [targetCraft, setTargetCraft] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const { showToast } = useToast();

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGovtSchemes();
      setSchemes(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load schemes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    try {
      await createGovtScheme({
        scheme_name: schemeName,
        description,
        eligibility_criteria: criteria,
        application_url: appUrl || null,
        valid_until: validUntil || null
      });
      showToast('Government Scheme added successfully!', 'success');
      setIsCreateOpen(false);
      setSchemeName('');
      setDescription('');
      setCriteria('');
      setAppUrl('');
      setValidUntil('');
      fetchSchemes();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Failed to add scheme', 'error');
    }
  };

  const handleToggleActive = async (scheme) => {
    try {
      await updateGovtScheme(scheme.id, { is_active: !scheme.is_active });
      showToast(`Scheme ${!scheme.is_active ? 'activated' : 'deactivated'} successfully.`, 'info');
      fetchSchemes();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleOpenBroadcast = (scheme) => {
    setSelectedScheme(scheme);
    setTargetState('');
    setTargetCraft('');
    setIsBroadcastOpen(true);
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!selectedScheme) return;
    setBroadcasting(true);

    try {
      const res = await broadcastSchemeAlert(selectedScheme.id, {
        target_state: targetState.trim() || null,
        target_craft_type: targetCraft.trim() || null
      });
      showToast(`Alert broadcast successfully sent to ${res.recipients_count} artisans!`, 'success');
      setIsBroadcastOpen(false);
    } catch (err) {
      showToast(err.message || 'Broadcast failed', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleOpenHistory = async (scheme) => {
    setSelectedScheme(scheme);
    setIsHistoryOpen(true);
    setHistoryLoading(true);

    try {
      const logs = await getSchemeAlertHistory(scheme.id);
      setAlertHistory(logs || []);
    } catch (err) {
      showToast(err.message || 'Failed to load alert history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3>Government Schemes & Support Policies</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Publish MoSJE financial assistance programs and push targeted notifications to eligible artisan groups.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} />
          <span>Add Support Scheme</span>
        </button>
      </div>

      {/* Schemes Data Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Scheme Title & Details</th>
              <th>Eligibility Criteria</th>
              <th>Status</th>
              <th>Valid Until</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>
                  Loading schemes...
                </td>
              </tr>
            ) : schemes.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No schemes published yet.
                </td>
              </tr>
            ) : (
              schemes.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.scheme_name}</strong>
                    <br />
                    <small className="text-muted">{s.description.substring(0, 90)}...</small>
                  </td>
                  <td>{s.eligibility_criteria || 'All registered artisans'}</td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{s.valid_until ? new Date(s.valid_until).toLocaleDateString() : 'Continuous'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenBroadcast(s)}
                        title="Broadcast Notification to Artisans"
                      >
                        <Bell size={14} />
                        <span>Alert</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenHistory(s)}
                        title="View Broadcast History"
                      >
                        <History size={14} />
                        <span>History</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleActive(s)}
                        title={s.is_active ? 'Deactivate Scheme' : 'Activate Scheme'}
                      >
                        {s.is_active ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Create Scheme */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Government Support Scheme">
        <form onSubmit={handleCreateScheme}>
          <div className="form-group">
            <label htmlFor="scheme-title">Scheme Header / Title</label>
            <input
              id="scheme-title"
              type="text"
              className="auth-input"
              placeholder="e.g. National Handicraft Subsidy Scheme 2026"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="scheme-desc">Detailed Policy Description</label>
            <textarea
              id="scheme-desc"
              rows={3}
              className="auth-input"
              placeholder="Describe policy, guidelines, benefits, and financial grant..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="scheme-criteria">Eligibility Criteria</label>
            <input
              id="scheme-criteria"
              type="text"
              className="auth-input"
              placeholder="e.g. Registered weavers in Uttar Pradesh with Aadhaar KYC"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
            />
          </div>
          <div className="row">
            <div className="col form-group">
              <label htmlFor="scheme-url">Application URL</label>
              <input
                id="scheme-url"
                type="url"
                className="auth-input"
                placeholder="https://scheme.gov.in/apply"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
              />
            </div>
            <div className="col form-group">
              <label htmlFor="scheme-date">Valid Until (Optional)</label>
              <input
                id="scheme-date"
                type="date"
                className="auth-input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4">
            Publish Support Scheme
          </button>
        </form>
      </Modal>

      {/* Modal 2: Broadcast Alert */}
      <Modal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        title={`Broadcast Scheme Alert: ${selectedScheme?.scheme_name}`}
      >
        <form onSubmit={handleSendBroadcast}>
          <div className="form-group">
            <label>Selected Target Scheme</label>
            <input type="text" className="auth-input" value={selectedScheme?.scheme_name || ''} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="target-state">Target State Filter (Optional)</label>
            <input
              id="target-state"
              type="text"
              className="auth-input"
              placeholder="e.g. Uttar Pradesh (leave empty for all states)"
              value={targetState}
              onChange={(e) => setTargetState(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="target-craft">Target Craft Specialization (Optional)</label>
            <input
              id="target-craft"
              type="text"
              className="auth-input"
              placeholder="e.g. Silk Weaving (leave empty for all crafts)"
              value={targetCraft}
              onChange={(e) => setTargetCraft(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={broadcasting}>
            <Bell size={16} />
            <span>{broadcasting ? 'Broadcasting...' : 'Broadcast to Matching Artisans'}</span>
          </button>
        </form>
      </Modal>

      {/* Modal 3: Alert Broadcast History */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Alert History: ${selectedScheme?.scheme_name}`}
        maxWidth="600px"
      >
        <div className="data-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Broadcast Time</th>
                <th>Sent By</th>
                <th>Target State</th>
                <th>Target Craft</th>
                <th>Recipients</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                    Loading history...
                  </td>
                </tr>
              ) : alertHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No alerts sent for this scheme yet.
                  </td>
                </tr>
              ) : (
                alertHistory.map((a) => (
                  <tr key={a.alert_id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {new Date(a.sent_at).toLocaleString()}
                    </td>
                    <td>{a.sent_by}</td>
                    <td>{a.target_state || 'All States'}</td>
                    <td>{a.target_craft_type || 'All Crafts'}</td>
                    <td>
                      <strong style={{ color: 'var(--success)' }}>{a.recipients_count}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-full mt-4"
          onClick={() => setIsHistoryOpen(false)}
        >
          Close History
        </button>
      </Modal>
    </div>
  );
}

