import React, { useState, useEffect, useCallback } from 'react';
import {
  getExhibitions,
  createExhibition,
  updateExhibitionStatus,
  getExhibitionRegistrationsDetailed,
  reviewExhibitionRegistration
} from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { Plus, Users, Calendar } from 'lucide-react';

export default function ExhibitionRegistry({ onActionComplete }) {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected exhibition for sign-up review
  const [selectedExhib, setSelectedExhib] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);

  // Schedule Modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { showToast } = useToast();

  const fetchExhibitions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExhibitions();
      setExhibitions(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load exhibitions', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchExhibitions();
  }, [fetchExhibitions]);

  const handleScheduleExhibition = async (e) => {
    e.preventDefault();
    try {
      await createExhibition({ name, location, start_date: startDate, end_date: endDate });
      showToast('National exhibition scheduled successfully!', 'success');
      setIsScheduleOpen(false);
      setName('');
      setLocation('');
      setStartDate('');
      setEndDate('');
      fetchExhibitions();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Failed to schedule exhibition', 'error');
    }
  };

  const handleStatusChange = async (exhibId, newStatus) => {
    try {
      await updateExhibitionStatus(exhibId, newStatus);
      showToast(`Exhibition status updated to '${newStatus}'.`, 'success');
      fetchExhibitions();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleSelectExhib = async (exhib) => {
    setSelectedExhib(exhib);
    setRegsLoading(true);

    try {
      const res = await getExhibitionRegistrationsDetailed(exhib.id);
      setRegistrations(res.registrations || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch sign-ups', 'error');
    } finally {
      setRegsLoading(false);
    }
  };

  const handleReviewReg = async (regId, status) => {
    try {
      await reviewExhibitionRegistration(regId, status);
      showToast(`Registration request ${status.toLowerCase()}!`, 'success');
      if (selectedExhib) handleSelectExhib(selectedExhib);
    } catch (err) {
      showToast(err.message || 'Failed to update registration status', 'error');
    }
  };

  return (
    <div>
      <div className="admin-header-flex">
        <div>
          <h3>National Fairs & Exhibitions Directory</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Coordinate Shilp Samagam, Surajkund Mela, and Dilli Haat digitizations and review artisan signups.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsScheduleOpen(true)} style={{ whiteSpace: 'nowrap' }}>
          <Plus size={16} />
          <span>Schedule Exhibition</span>
        </button>
      </div>

      {/* Exhibitions Data Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: '160px' }}>Exhibition Name</th>
              <th style={{ minWidth: '130px' }}>Location Venue</th>
              <th style={{ minWidth: '150px' }}>Duration</th>
              <th style={{ minWidth: '100px' }}>Status</th>
              <th style={{ minWidth: '130px' }}>Lifecycle Stage</th>
              <th style={{ minWidth: '130px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                  Loading exhibitions...
                </td>
              </tr>
            ) : exhibitions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No exhibitions scheduled.
                </td>
              </tr>
            ) : (
              exhibitions.map((e) => (
                <tr
                  key={e.id}
                  style={{ background: selectedExhib?.id === e.id ? 'rgba(230, 126, 34, 0.05)' : 'transparent' }}
                >
                  <td>
                    <strong>{e.name}</strong>
                  </td>
                  <td>{e.location}</td>
                  <td>
                    {new Date(e.start_date).toLocaleDateString()} — {new Date(e.end_date).toLocaleDateString()}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        e.status === 'Upcoming'
                          ? 'badge-info'
                          : e.status === 'Ongoing'
                          ? 'badge-success'
                          : 'badge-danger'
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-select-sm"
                      value={e.status}
                      onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleSelectExhib(e)} style={{ whiteSpace: 'nowrap' }}>
                      <Users size={14} />
                      <span>View Signups</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Exhibition Signups Subview */}
      {selectedExhib && (
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '16px' }}>
            Artisan Sign-ups for <span style={{ color: 'var(--primary)' }}>{selectedExhib.name}</span>
          </h4>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '140px' }}>Artisan Name</th>
                  <th style={{ minWidth: '130px' }}>Contact Info</th>
                  <th style={{ minWidth: '140px' }}>Craft & State</th>
                  <th style={{ minWidth: '110px' }}>Registration Status</th>
                  <th style={{ minWidth: '140px' }}>Review Decision</th>
                </tr>
              </thead>
              <tbody>
                {regsLoading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                      Loading registrations...
                    </td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No artisans registered for this exhibition yet.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r) => (
                    <tr key={r.registration_id}>
                      <td>
                        <strong>{r.artisan_name}</strong>
                      </td>
                      <td>
                        <div>{r.phone_number || 'N/A'}</div>
                        <small className="text-muted">{r.email || ''}</small>
                      </td>
                      <td>
                        {r.craft_type || 'Handicrafts'} • {r.state || 'India'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === 'Approved'
                              ? 'badge-success'
                              : r.status === 'Rejected'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleReviewReg(r.registration_id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleReviewReg(r.registration_id, 'Rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reviewed</span>
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

      {/* Modal: Schedule Exhibition */}
      <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title="Schedule National Exhibition / Fair">
        <form onSubmit={handleScheduleExhibition}>
          <div className="form-group">
            <label htmlFor="exhib-name">Exhibition / Fair Name</label>
            <input
              id="exhib-name"
              type="text"
              className="auth-input"
              placeholder="e.g. Surajkund International Crafts Mela 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="exhib-loc">Location Venue</label>
            <input
              id="exhib-loc"
              type="text"
              className="auth-input"
              placeholder="e.g. Surajkund, Faridabad, Haryana"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          <div className="row">
            <div className="col form-group">
              <label htmlFor="exhib-start">Start Date</label>
              <input
                id="exhib-start"
                type="date"
                className="auth-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="col form-group">
              <label htmlFor="exhib-end">End Date</label>
              <input
                id="exhib-end"
                type="date"
                className="auth-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4">
            <Calendar size={16} />
            <span>Schedule Fair on KalaSetu</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}

