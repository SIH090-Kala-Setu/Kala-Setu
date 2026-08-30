import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getVerifications, reviewVerification } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Search,
  CreditCard,
  Building,
  Eye,
  EyeOff,
  User,
  Filter,
  CheckCheck,
  AlertCircle,
  FileText,
  MapPin,
  Phone,
  Sparkles
} from 'lucide-react';

export default function ArtisanVerifications({ onActionComplete }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kycFilter, setKycFilter] = useState('all'); // 'all' | 'aadhaar_given' | 'aadhaar_and_bank' | 'none' | 'all_approved'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [showAadhaarMap, setShowAadhaarMap] = useState({});
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const { showToast } = useToast();

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch data using the backend API
      const data = await getVerifications(
        statusFilter !== 'all' ? statusFilter : null,
        kycFilter !== 'all' ? kycFilter : null
      );
      setVerifications(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load verifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kycFilter, showToast]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  // Helper check methods for verification items
  const checkHasAadhaar = (v) => {
    if (typeof v.has_aadhaar === 'boolean') return v.has_aadhaar;
    return Boolean(v.aadhaar_number && String(v.aadhaar_number).trim().length > 0);
  };

  const checkHasBank = (v) => {
    if (typeof v.has_bank === 'boolean') return v.has_bank;
    const hasAcc = v.bank_account && String(v.bank_account).trim() !== '' && String(v.bank_account) !== '000000000000';
    const hasUpi = v.upi_id && String(v.upi_id).trim() !== '' && !String(v.upi_id).endsWith('@upi');
    const hasIfsc = v.ifsc_code && String(v.ifsc_code).trim() !== '' && String(v.ifsc_code) !== 'SBIN0000001';
    return Boolean(hasAcc || hasUpi || hasIfsc);
  };

  const checkIsAllApproved = (v) => {
    return v.status === 'Approved' && (v.aadhaar_verified ?? true) && (v.bank_verified ?? true);
  };

  const toggleAadhaarVisibility = (id) => {
    setShowAadhaarMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatMaskedAadhaar = (aadhaar, isVisible) => {
    if (!aadhaar) return 'Not Provided';
    const clean = String(aadhaar).replace(/\s+/g, '');
    if (isVisible) {
      return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    }
    if (clean.length >= 4) {
      return `•••• •••• ${clean.slice(-4)}`;
    }
    return '•••• •••• ••••';
  };

  // Review handler (Approve or Reject)
  const handleReview = async (id, status, customReason = '') => {
    let reason = customReason;
    if (status === 'Rejected' && !reason) {
      const promptReason = window.prompt('Enter rejection reason for KYC verification (Required):');
      if (promptReason === null) return;
      if (!promptReason.trim()) {
        showToast('Rejection reason is required.', 'error');
        return;
      }
      reason = promptReason.trim();
    }

    setActionLoadingId(id);
    try {
      await reviewVerification(id, {
        status,
        rejection_reason: reason,
        aadhaar_verified: status === 'Approved',
        bank_verified: status === 'Approved'
      });
      showToast(`Artisan verification ${status.toLowerCase()} successfully!`, 'success');
      if (selectedDossier && selectedDossier.id === id) {
        setSelectedDossier((prev) => ({
          ...prev,
          status,
          aadhaar_verified: status === 'Approved',
          bank_verified: status === 'Approved',
          rejection_reason: reason
        }));
      }
      fetchVerifications();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      showToast(err.message || 'Review action failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Compute filter metrics for stats bar
  const metrics = useMemo(() => {
    let total = verifications.length;
    let aadhaarGivenCount = 0;
    let aadhaarAndBankCount = 0;
    let noneCount = 0;
    let allApprovedCount = 0;
    let pendingCount = 0;

    verifications.forEach((v) => {
      const hasAadhaar = checkHasAadhaar(v);
      const hasBank = checkHasBank(v);
      const isApproved = checkIsAllApproved(v);

      if (hasAadhaar) aadhaarGivenCount++;
      if (hasAadhaar && hasBank) aadhaarAndBankCount++;
      if (!hasAadhaar && !hasBank) noneCount++;
      if (isApproved) allApprovedCount++;
      if (v.status === 'Pending') pendingCount++;
    });

    return {
      total,
      aadhaarGivenCount,
      aadhaarAndBankCount,
      noneCount,
      allApprovedCount,
      pendingCount
    };
  }, [verifications]);

  // Client-side filtering logic for instant search & active filter match
  const filtered = useMemo(() => {
    return verifications.filter((v) => {
      const hasAadhaar = checkHasAadhaar(v);
      const hasBank = checkHasBank(v);
      const isApproved = checkIsAllApproved(v);

      // KYC Filter condition
      if (kycFilter === 'aadhaar_given' && !hasAadhaar) return false;
      if (kycFilter === 'aadhaar_and_bank' && !(hasAadhaar && hasBank)) return false;
      if (kycFilter === 'none' && (hasAadhaar || hasBank)) return false;
      if (kycFilter === 'all_approved' && !isApproved) return false;

      // Status Filter condition
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;

      // Search Term condition
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = v.artisan_name && v.artisan_name.toLowerCase().includes(term);
        const matchesCraft = v.craft_type && v.craft_type.toLowerCase().includes(term);
        const matchesState = v.state && v.state.toLowerCase().includes(term);
        const matchesDistrict = v.district && v.district.toLowerCase().includes(term);
        const matchesPhone = v.phone_number && v.phone_number.includes(term);
        const matchesAadhaar = v.aadhaar_number && String(v.aadhaar_number).includes(term);
        const matchesBank = v.bank_account && String(v.bank_account).includes(term);
        const matchesUPI = v.upi_id && v.upi_id.toLowerCase().includes(term);
        return (
          matchesName ||
          matchesCraft ||
          matchesState ||
          matchesDistrict ||
          matchesPhone ||
          matchesAadhaar ||
          matchesBank ||
          matchesUPI
        );
      }

      return true;
    });
  }, [verifications, kycFilter, statusFilter, searchTerm]);

  // Filter definitions for the tabs
  const kycFilterOptions = [
    {
      id: 'all',
      label: 'All Records',
      icon: Filter,
      count: metrics.total,
      desc: 'All KYC submissions'
    },
    {
      id: 'aadhaar_given',
      label: 'Aadhaar Given',
      icon: Shield,
      count: metrics.aadhaarGivenCount,
      badgeColor: 'badge-purple',
      desc: 'Artisans with Aadhaar submitted'
    },
    {
      id: 'aadhaar_and_bank',
      label: 'Aadhaar + Bank',
      icon: CreditCard,
      count: metrics.aadhaarAndBankCount,
      badgeColor: 'badge-info',
      desc: 'Complete identity & payout dossier'
    },
    {
      id: 'none',
      label: 'None / Incomplete',
      icon: AlertCircle,
      count: metrics.noneCount,
      badgeColor: 'badge-warning',
      desc: 'Missing identity & banking details'
    },
    {
      id: 'all_approved',
      label: 'All Approved',
      icon: CheckCheck,
      count: metrics.allApprovedCount,
      badgeColor: 'badge-success',
      desc: 'Certified and active artisans'
    }
  ];

  return (
    <div>
      {/* Top Header */}
      <div className="admin-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} style={{ color: 'var(--primary)' }} />
            Artisan Identity & KYC Verification Pipeline
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Verify Aadhaar credentials, bank account linkage, and official certification before marketplace listings go live.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => fetchVerifications()}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div
          onClick={() => setKycFilter('all')}
          style={{
            backgroundColor: kycFilter === 'all' ? 'rgba(230, 126, 34, 0.12)' : 'var(--bg-surface)',
            border: `1px solid ${kycFilter === 'all' ? 'var(--primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Pipeline
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {metrics.pendingCount} Pending Review
          </div>
        </div>

        <div
          onClick={() => setKycFilter('aadhaar_given')}
          style={{
            backgroundColor: kycFilter === 'aadhaar_given' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-surface)',
            border: `1px solid ${kycFilter === 'aadhaar_given' ? 'var(--purple)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🪪 Aadhaar Given
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--purple)', marginTop: '4px' }}>
            {metrics.aadhaarGivenCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Identity Submitted
          </div>
        </div>

        <div
          onClick={() => setKycFilter('aadhaar_and_bank')}
          style={{
            backgroundColor: kycFilter === 'aadhaar_and_bank' ? 'rgba(2, 132, 199, 0.12)' : 'var(--bg-surface)',
            border: `1px solid ${kycFilter === 'aadhaar_and_bank' ? 'var(--info)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            💳 Aadhaar + Bank
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--info)', marginTop: '4px' }}>
            {metrics.aadhaarAndBankCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Full KYC Dossier
          </div>
        </div>

        <div
          onClick={() => setKycFilter('none')}
          style={{
            backgroundColor: kycFilter === 'none' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-surface)',
            border: `1px solid ${kycFilter === 'none' ? 'var(--warning)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⏳ None / Incomplete
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>
            {metrics.noneCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Awaiting Credentials
          </div>
        </div>

        <div
          onClick={() => setKycFilter('all_approved')}
          style={{
            backgroundColor: kycFilter === 'all_approved' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
            border: `1px solid ${kycFilter === 'all_approved' ? 'var(--success)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ✅ All Approved
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
            {metrics.allApprovedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Fully Certified
          </div>
        </div>
      </div>

      {/* Primary Filter Tabs Bar (Aadhaar Given, Aadhaar + Bank, None, All Approved, All) */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          padding: '12px 14px',
          marginBottom: '16px'
        }}
      >
        <div style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Identity & KYC Dossier Filters:
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '8px',
            width: '100%'
          }}
        >
          {kycFilterOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = kycFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setKycFilter(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 10px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                  color: isActive ? '#fff' : 'var(--text-primary)',
                  border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.82rem',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition-smooth)',
                  width: '100%'
                }}
              >
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span>{opt.label}</span>
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    marginLeft: '2px'
                  }}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Controls: Search & KYC Status Filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1', maxWidth: '420px', minWidth: '260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Search by artisan name, craft, phone, Aadhaar, state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="auth-input"
            style={{ width: '100%', paddingLeft: '36px' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter buttons */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px' }}>
            Decision Status:
          </span>
          {['all', 'Pending', 'Approved', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                backgroundColor: statusFilter === st ? 'var(--bg-surface-elevated)' : 'transparent',
                color: statusFilter === st ? 'var(--primary)' : 'var(--text-secondary)',
                border: `1px solid ${statusFilter === st ? 'var(--primary)' : 'var(--border-color)'}`,
                fontWeight: statusFilter === st ? '600' : '400'
              }}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Description Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface-elevated)',
          padding: '8px 14px',
          borderRadius: 'var(--border-radius-sm)',
          marginBottom: '14px',
          fontSize: '0.82rem',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Sparkles size={15} style={{ color: 'var(--primary)' }} />
          <span>
            Showing <strong>{filtered.length}</strong> matching records for filter:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {kycFilterOptions.find((o) => o.id === kycFilter)?.label || 'All'}
            </strong>
            {statusFilter !== 'all' && (
              <span>
                {' '}• Status: <strong style={{ color: 'var(--text-primary)' }}>{statusFilter}</strong>
              </span>
            )}
            {searchTerm && (
              <span>
                {' '}• Matching: "<em>{searchTerm}</em>"
              </span>
            )}
          </span>
        </div>

        {(kycFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
          <button
            onClick={() => {
              setKycFilter('all');
              setStatusFilter('all');
              setSearchTerm('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Verification Data Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th style={{ minWidth: '180px' }}>Artisan & Craft</th>
              <th style={{ minWidth: '140px' }}>Location & Contact</th>
              <th style={{ minWidth: '180px' }}>Aadhaar Details</th>
              <th style={{ minWidth: '170px' }}>Bank & Payout Details</th>
              <th style={{ minWidth: '110px' }}>KYC Status</th>
              <th style={{ minWidth: '140px' }}>Review Decision</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Clock className="spin" size={18} /> Loading Verification Pipeline...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <AlertCircle size={28} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                  <div>No artisan verifications match the selected filters.</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    Try selecting a different filter tab or clearing the search query.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((v) => {
                const hasAadhaar = checkHasAadhaar(v);
                const hasBank = checkHasBank(v);
                const isAadhaarVisible = Boolean(showAadhaarMap[v.id]);

                return (
                  <tr key={v.id}>
                    {/* ID */}
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {v.id.substring(0, 8)}...
                    </td>

                    {/* Artisan & Craft */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            fontSize: '0.85rem',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          {v.artisan_name ? v.artisan_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <strong>{v.artisan_name}</strong>
                          <div>
                            <span className="badge badge-purple badge-sm" style={{ marginTop: '2px' }}>
                              {v.craft_type || 'Handicrafts'}
                            </span>
                            {v.cluster_name && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                🏫 {v.cluster_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location & Contact */}
                    <td>
                      <div style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{v.phone_number}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        <span>{[v.district, v.state].filter(Boolean).join(', ') || 'Uttar Pradesh'}</span>
                      </div>
                    </td>

                    {/* Aadhaar Details */}
                    <td>
                      {hasAadhaar ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: '600' }}>
                              {formatMaskedAadhaar(v.aadhaar_number, isAadhaarVisible)}
                            </span>
                            <button
                              onClick={() => toggleAadhaarVisibility(v.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px'
                              }}
                              title={isAadhaarVisible ? 'Mask Aadhaar' : 'Reveal Aadhaar'}
                            >
                              {isAadhaarVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>

                          <div style={{ marginTop: '4px' }}>
                            {v.aadhaar_verified ? (
                              <span className="badge badge-success badge-sm">✓ Aadhaar Verified</span>
                            ) : (
                              <span className="badge badge-purple badge-sm">🪪 Aadhaar Given (Pending)</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="badge badge-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                            ✕ Aadhaar Not Given
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Bank & Payout Details */}
                    <td>
                      {hasBank ? (
                        <div>
                          {v.bank_account && String(v.bank_account) !== '000000000000' && (
                            <div style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                              A/C: ••••{String(v.bank_account).slice(-4)}
                            </div>
                          )}
                          {v.ifsc_code && String(v.ifsc_code) !== 'SBIN0000001' && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              IFSC: {v.ifsc_code}
                            </div>
                          )}
                          {v.upi_id && !String(v.upi_id).endsWith('@upi') && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--info)' }}>
                              UPI: {v.upi_id}
                            </div>
                          )}
                          <div style={{ marginTop: '3px' }}>
                            {v.bank_verified ? (
                              <span className="badge badge-success badge-sm">✓ Bank Linked</span>
                            ) : (
                              <span className="badge badge-info badge-sm">🏦 Details Submitted</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="badge badge-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                            ⏳ Bank Not Linked
                          </span>
                        </div>
                      )}
                    </td>

                    {/* KYC Status */}
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
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            By: {v.reviewed_by_name}
                          </small>
                        </div>
                      )}
                      {v.rejection_reason && (
                        <div>
                          <small style={{ color: 'var(--error)', fontSize: '0.7rem' }} title={v.rejection_reason}>
                            Reason: {v.rejection_reason.substring(0, 24)}...
                          </small>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {v.status === 'Pending' ? (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={actionLoadingId === v.id}
                              onClick={() => handleReview(v.id, 'Approved')}
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={actionLoadingId === v.id}
                              onClick={() => handleReview(v.id, 'Rejected')}
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedDossier(v)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            View Details
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDossier(v)}
                          title="View Full KYC Dossier"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <FileText size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Artisan KYC Full Dossier Modal */}
      {selectedDossier && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedDossier(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-lg)',
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(230, 126, 34, 0.15)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700'
                  }}
                >
                  {selectedDossier.artisan_name ? selectedDossier.artisan_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{selectedDossier.artisan_name}</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    KYC Dossier ID: {selectedDossier.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDossier(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  padding: '12px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Artisan Information
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <div><strong>Craft:</strong> {selectedDossier.craft_type || 'Handicrafts'}</div>
                  <div><strong>Cluster:</strong> {selectedDossier.cluster_name || 'Independent Artisan'}</div>
                  <div><strong>Phone:</strong> {selectedDossier.phone_number || 'N/A'}</div>
                  <div><strong>Email:</strong> {selectedDossier.email || 'N/A'}</div>
                  <div><strong>Region:</strong> {[selectedDossier.district, selectedDossier.state].filter(Boolean).join(', ') || 'Uttar Pradesh'}</div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  padding: '12px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Aadhaar Credential Verification
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.9rem' }}>
                      {selectedDossier.aadhaar_number || 'Not Provided'}
                    </span>
                  </div>
                  <div>
                    {selectedDossier.aadhaar_verified ? (
                      <span className="badge badge-success badge-sm">✓ Verified</span>
                    ) : selectedDossier.aadhaar_number ? (
                      <span className="badge badge-purple badge-sm">🪪 Submitted</span>
                    ) : (
                      <span className="badge badge-warning badge-sm">Missing</span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  padding: '12px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Bank & Payout Gateway
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <div><strong>Account No:</strong> {selectedDossier.bank_account || 'N/A'}</div>
                  <div><strong>IFSC Code:</strong> {selectedDossier.ifsc_code || 'N/A'}</div>
                  <div><strong>UPI ID:</strong> {selectedDossier.upi_id || 'N/A'}</div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  padding: '12px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Verification Status
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className={`badge ${
                      selectedDossier.status === 'Approved'
                        ? 'badge-success'
                        : selectedDossier.status === 'Rejected'
                        ? 'badge-danger'
                        : 'badge-warning'
                    }`}
                  >
                    {selectedDossier.status}
                  </span>
                  {selectedDossier.submitted_at && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Submitted: {new Date(selectedDossier.submitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {selectedDossier.rejection_reason && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--error)' }}>
                    <strong>Rejection Reason:</strong> {selectedDossier.rejection_reason}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDossier(null)}>
                Close
              </button>
              {selectedDossier.status !== 'Approved' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleReview(selectedDossier.id, 'Approved')}
                >
                  Approve Verification
                </button>
              )}
              {selectedDossier.status !== 'Rejected' && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleReview(selectedDossier.id, 'Rejected')}
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
