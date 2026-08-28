import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { X, Eye, EyeOff, Plus, Users, ShieldCheck } from 'lucide-react';
import { apiClient, getApiBase } from '../../api/client';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const CRAFT_TYPES = [
  { c: 'Textiles & Handloom', icon: '🧵' },
  { c: 'Clay & Pottery', icon: '🏺' },
  { c: 'Jewelry & Silver', icon: '💎' },
  { c: 'Woodwork & Inlay', icon: '🪵' },
  { c: 'Folk Paintings', icon: '🎨' },
  { c: 'Metal Craft', icon: '🔨' },
  { c: 'Bamboo & Cane', icon: '🎋' },
  { c: 'Leather Craft', icon: '👞' },
];

const LANGUAGES = ['English', 'हिंदी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'मराठी', 'ಕನ್ನಡ', 'ગુજરાતી'];

// Steps: 1=Language, 2=Details, 3=OTP, 4=Role, 5=CraftType(Artisan only), 6=Location+Cluster, 7=Password, 8=Success
const TOTAL_STEPS = 7; // visible steps excluding success

export default function OnboardingWizard({ onComplete, onClose }) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Cluster state (Aggregator only)
  const [clusterMode, setClusterMode] = useState('join');
  const [availableClusters, setAvailableClusters] = useState([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState('');
  const [newClusterName, setNewClusterName] = useState('');
  const [newClusterCraft, setNewClusterCraft] = useState('');

  const [formData, setFormData] = useState({
    language: 'English',
    full_name: '',
    phone: '',
    aadhaar: '',
    role: 'Artisan',
    craft_type: '',
    state: '',
    district: '',
    password: ''
  });

  const { register, login } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (step === 6 && formData.role === 'Aggregator') {
      setLoadingClusters(true);
      apiClient('/clusters?unassigned=true')
        .then(data => setAvailableClusters(Array.isArray(data) ? data : []))
        .catch(() => setAvailableClusters([]))
        .finally(() => setLoadingClusters(false));
    }
  }, [step, formData.role]);

  const set = (field, value) => setFormData(f => ({ ...f, [field]: value }));

  const handleNext = () => {
    setError('');
    setStep(s => s + 1);
  };

  const handlePrev = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSendOtpAndNext = async () => {
    if (!formData.phone || formData.phone.length !== 10) return;
    setSubmitting(true);
    setError('');
    try {
      await fetch(`${getApiBase()}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      });
      setIsOtpSent(true);
      setStep(3); // Go to OTP step
      showToast('OTP sent successfully', 'success');
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpAndNext = async () => {
    if (!otp || otp.length < 4) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP');
      
      if (data.is_registered) {
        // User already exists, log them in
        localStorage.setItem('artisan_token', data.access_token);
        window.location.href = '/'; // Reload to apply auth context
      } else {
        // Continue to role selection
        setStep(4);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Role → next: Artisan goes to step 5 (craft), others skip to step 6
  const handleRoleNext = () => {
    setError('');
    setStep(formData.role === 'Artisan' ? 5 : 6);
  };

  // Location back: Artisan came from step 5, others from step 4
  const handleLocationBack = () => {
    setError('');
    setStep(formData.role === 'Artisan' ? 5 : 4);
  };

  const handleSubmit = async () => {
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await register({
        username: formData.phone,
        password: formData.password,
        role: formData.role,
        full_name: formData.full_name,
        phone: formData.phone,
        preferred_lang: formData.language,
        craft_type: formData.craft_type || undefined,
        region: formData.state || undefined,
        aadhaar_number: formData.aadhaar || undefined,
        district: formData.district || undefined,
      });

      await login(formData.phone, formData.password);

      if (formData.role === 'Aggregator') {
        const token = localStorage.getItem('artisan_token');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

        if (clusterMode === 'join' && selectedClusterId) {
          await fetch(`${getApiBase()}/aggregator/join-cluster`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ cluster_id: selectedClusterId }),
          });
        } else if (clusterMode === 'create' && newClusterName) {
          await fetch(`${getApiBase()}/clusters`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              cluster_name: newClusterName,
              state: formData.state,
              district: formData.district,
              craft_specialization: newClusterCraft || formData.craft_type || 'General Crafts',
            }),
          });
        }
      }

      setStep(8); // success
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card" style={{ position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button
          type="button"
          className="modal-close"
          onClick={onClose || onComplete}
          style={{ position: 'absolute', top: '14px', right: '16px', zIndex: 10 }}
        >
          <X size={20} />
        </button>

        {step < 8 && (
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(i => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: '4px', borderRadius: '4px',
                    background: step > i ? 'var(--primary)' : step === i ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.3s'
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
              Step {Math.min(step, TOTAL_STEPS)} of {TOTAL_STEPS}
            </p>
          </div>
        )}

        {/* ── STEP 1: Language ── */}
        {step === 1 && (
          <div>
            <h3>🌐 Choose your Language</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              अपनी भाषा चुनें · Select your preferred language
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
              {LANGUAGES.map(lang => (
                <div
                  key={lang}
                  className={`lang-tile ${formData.language === lang ? 'selected' : ''}`}
                  onClick={() => { set('language', lang); handleNext(); }}
                >
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{lang}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '24px' }}>
              <button className="btn btn-secondary btn-md" onClick={onClose || onComplete}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Personal Details ── */}
        {step === 2 && (
          <div>
            <h3>👤 Your Details</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              This will appear on your verified profile and certificates.
            </p>
            <div>
              <label>Full Name *</label>
              <input
                type="text" className="auth-input"
                placeholder="e.g. Ramesh Kumar"
                value={formData.full_name}
                onChange={e => set('full_name', e.target.value)}
                style={{ marginBottom: '14px' }}
              />
              <label>Mobile Number *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600 }}>🇮🇳 +91</span>
                <input
                  type="tel" className="auth-input"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={formData.phone}
                  onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
                  style={{ flex: 1 }}
                />
              </div>
              <label>
                Aadhaar Number{' '}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>(optional · for faster KYC)</span>
              </label>
              <input
                type="text" className="auth-input"
                placeholder="12-digit Aadhaar Number"
                maxLength={12}
                value={formData.aadhaar}
                onChange={e => set('aadhaar', e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {error && <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: '8px' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button className="btn btn-secondary btn-md" onClick={handlePrev} disabled={submitting}>Back</button>
              <button
                className="btn btn-primary btn-md"
                onClick={handleSendOtpAndNext}
                disabled={!formData.full_name || formData.phone.length !== 10 || submitting}
              >
                {submitting ? 'Sending OTP...' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: OTP Verification ── */}
        {step === 3 && (
          <div>
            <h3>💬 Verify your Phone</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              We've sent a 6-digit code to +91 {formData.phone}
            </p>
            <div style={{ marginBottom: '14px' }}>
              <label>Enter OTP *</label>
              <input
                type="text" className="auth-input"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem', fontWeight: 600 }}
              />
            </div>
            {error && <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: '8px' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button className="btn btn-secondary btn-md" onClick={handlePrev} disabled={submitting}>Back</button>
              <button
                className="btn btn-primary btn-md"
                onClick={handleVerifyOtpAndNext}
                disabled={otp.length < 4 || submitting}
              >
                {submitting ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Role ── */}
        {step === 4 && (
          <div>
            <h3>🎭 What is your role?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '20px' }}>
              {[
                { r: 'Artisan', icon: '🎨', desc: 'I make and sell handcrafted products' },
                { r: 'Aggregator', icon: '🤝', desc: 'I manage a cluster or cooperative of artisans' },
                { r: 'Buyer', icon: '🛍️', desc: 'I want to discover and buy authentic crafts' },
              ].map(role => (
                <div
                  key={role.r}
                  className={`role-tile ${formData.role === role.r ? 'selected' : ''}`}
                  onClick={() => set('role', role.r)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                    <span style={{ fontSize: '2rem' }}>{role.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{role.r}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{role.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button className="btn btn-secondary btn-md" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary btn-md" onClick={handleRoleNext}>Next</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Craft Type (Artisan only) ── */}
        {step === 5 && (
          <div>
            <h3>🧵 What do you make?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginTop: '20px' }}>
              {CRAFT_TYPES.map(craft => (
                <div
                  key={craft.c}
                  className={`craft-tile ${formData.craft_type === craft.c ? 'selected' : ''}`}
                  onClick={() => set('craft_type', craft.c)}
                >
                  <span style={{ fontSize: '1.6rem' }}>{craft.icon}</span>
                  <span style={{ fontSize: '0.78rem', textAlign: 'center' }}>{craft.c}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button className="btn btn-secondary btn-md" onClick={handlePrev}>Back</button>
              <button className="btn btn-primary btn-md" onClick={handleNext} disabled={!formData.craft_type}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Location + Cluster (Aggregator) ── */}
        {step === 6 && (
          <div>
            <h3>📍 Where are you located?</h3>
            <div style={{ marginTop: '16px' }}>
              <label>State *</label>
              <select className="auth-input" value={formData.state} onChange={e => set('state', e.target.value)} style={{ marginBottom: '14px' }}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label>District *</label>
              <input type="text" className="auth-input" placeholder="e.g. Varanasi" value={formData.district} onChange={e => set('district', e.target.value)} />
            </div>

            {formData.role === 'Aggregator' && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '14px' }}>🏘️ Cluster Setup</div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <button type="button" onClick={() => setClusterMode('join')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid', borderColor: clusterMode === 'join' ? 'var(--primary)' : 'var(--border)', background: clusterMode === 'join' ? 'var(--primary)' : 'transparent', color: clusterMode === 'join' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                    <Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Join Existing
                  </button>
                  <button type="button" onClick={() => setClusterMode('create')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid', borderColor: clusterMode === 'create' ? 'var(--primary)' : 'var(--border)', background: clusterMode === 'create' ? 'var(--primary)' : 'transparent', color: clusterMode === 'create' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                    <Plus size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Create New
                  </button>
                </div>

                {clusterMode === 'join' && (
                  <div>
                    {loadingClusters ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading clusters...</p> : availableClusters.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No unassigned clusters available.</p> : (
                      <select className="auth-input" value={selectedClusterId} onChange={e => setSelectedClusterId(e.target.value)}>
                        <option value="">Select a cluster</option>
                        {availableClusters.map(c => <option key={c.id} value={c.id}>{c.cluster_name} — {c.state}</option>)}
                      </select>
                    )}
                  </div>
                )}
                {clusterMode === 'create' && (
                  <div>
                    <input type="text" className="auth-input" placeholder="Cluster Name *" value={newClusterName} onChange={e => setNewClusterName(e.target.value)} style={{ marginBottom: '12px' }} />
                    <input type="text" className="auth-input" placeholder="Craft Specialization" value={newClusterCraft} onChange={e => setNewClusterCraft(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button className="btn btn-secondary btn-md" onClick={handleLocationBack}>Back</button>
              <button className="btn btn-primary btn-md" onClick={handleNext} disabled={!formData.state || !formData.district}>Next</button>
            </div>
          </div>
        )}

        {/* ── STEP 7: Password ── */}
        {step === 7 && (
          <div>
            <h3>🔒 Create a Password</h3>
            <div style={{ marginBottom: '14px', marginTop: '20px' }}>
              <label>Password *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showPassword ? 'text' : 'password'} className="auth-input" value={formData.password} onChange={e => set('password', e.target.value)} style={{ width: '100%', paddingRight: '44px' }} />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div>
              <label>Confirm Password *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} className="auth-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', paddingRight: '44px' }} />
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '8px' }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button className="btn btn-secondary btn-md" onClick={handlePrev} disabled={submitting}>Back</button>
              <button className="btn btn-primary btn-md" onClick={handleSubmit} disabled={!formData.password || formData.password !== confirmPassword || submitting}>{submitting ? 'Registering...' : 'Finish & Sign In'}</button>
            </div>
          </div>
        )}

        {/* ── STEP 8: Success ── */}
        {step === 8 && (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
            <h3>Welcome to KalaSetu!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Your account has been created successfully.</p>
            <button className="btn btn-primary btn-lg" onClick={onComplete}>Go to Dashboard →</button>
          </div>
        )}
      </div>
    </div>
  );
}
