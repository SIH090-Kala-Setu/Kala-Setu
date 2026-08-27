import React, { useState, useEffect } from 'react';
import { getArtisanProfile, updateArtisanProfile } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { Save, User, MapPin, Briefcase, CreditCard, ShieldCheck, ShieldAlert, Building2, CheckCircle } from 'lucide-react';

export default function ArtisanProfile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getArtisanProfile()
      .then(setProfile)
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(profile).forEach(([key, val]) => {
        if (val !== null && val !== undefined && typeof val !== 'object') {
          fd.append(key, val);
        }
      });
      await updateArtisanProfile(fd);
      showToast('Profile and bank details updated successfully! (प्रोफ़ाइल अपडेट सफल)', 'success');
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <p>Loading your artisan profile...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '30px auto 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2>👤 Artisan Profile & Verification (प्रोफ़ाइल व बैंक)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Maintain your craft identity, government linkages, Aadhaar number, and direct bank settlement details.
          </p>
        </div>

        {profile.is_verified ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(16,185,129,0.12)', border: '1px solid var(--success)', borderRadius: '20px', color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
            <ShieldCheck size={18} />
            <span>MoSJE Verified Artisan</span>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(245,158,11,0.12)', border: '1px solid var(--warning)', borderRadius: '20px', color: 'var(--warning)', fontWeight: 600, fontSize: '0.85rem' }}>
            <ShieldAlert size={18} />
            <span>Verification Pending</span>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        {/* Section 1: Personal Info */}
        <div className="card" style={{ padding: '24px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '1.05rem' }}>
            <User size={18} color="var(--primary)" />
            <span>Personal & Identity Details (व्यक्तिगत जानकारी)</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label>Full Name (नाम)</label>
              <input type="text" name="full_name" value={profile.full_name || ''} onChange={handleChange} className="auth-input" required />
            </div>
            <div className="form-group">
              <label>Preferred Language (भाषा)</label>
              <select name="preferred_language" value={profile.preferred_language || 'Hindi'} onChange={handleChange} className="auth-input">
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="English">English</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Aadhaar Number (आधार संख्या)</label>
              <input type="text" name="aadhaar_number" value={profile.aadhaar_number || ''} onChange={handleChange} className="auth-input" placeholder="12-digit Aadhaar" />
            </div>
          </div>
        </div>

        {/* Section 2: Craft & Cluster Details */}
        <div className="card" style={{ padding: '24px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '1.05rem' }}>
            <Briefcase size={18} color="var(--purple)" />
            <span>Craft & Cooperative Cluster (शिल्प व क्लस्टर)</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label>Craft Specialization (शिल्प प्रकार)</label>
              <select name="craft_type" value={profile.craft_type || 'Textiles & Handloom'} onChange={handleChange} className="auth-input">
                <option value="Textiles & Handloom">Textiles & Handloom (Banarasi / Chanderi / Pashmina)</option>
                <option value="Clay & Blue Pottery">Clay & Blue Pottery (Khurja / Jaipur)</option>
                <option value="Tribal & Silver Jewelry">Tribal & Silver Jewelry (Dhokra / Filigree)</option>
                <option value="Folk Paintings & Art">Folk Paintings & Art (Madhubani / Pattachitra)</option>
                <option value="Wood Inlay & Carving">Wood Inlay & Carving (Saharanpur / Mysore)</option>
                <option value="Handicrafts & Decor">Handicrafts & Brass Metalware (Moradabad)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assigned Cooperative Cluster (क्लस्टर)</label>
              <input 
                type="text" 
                value={profile.cluster?.name || profile.cluster_name || 'Varanasi Silk Weaver Cooperative'} 
                disabled 
                className="auth-input" 
                style={{ opacity: 0.75, cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Geographic Location */}
        <div className="card" style={{ padding: '24px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '1.05rem' }}>
            <MapPin size={18} color="var(--info)" />
            <span>Geographic Origin (स्थान)</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label>State / Union Territory (राज्य)</label>
              <input type="text" name="state" value={profile.state || ''} onChange={handleChange} className="auth-input" required />
            </div>
            <div className="form-group">
              <label>District / Village (जिला / गाँव)</label>
              <input type="text" name="district" value={profile.district || ''} onChange={handleChange} className="auth-input" placeholder="e.g. Varanasi" />
            </div>
          </div>
        </div>

        {/* Section 4: Bank Account & Settlement Details */}
        <div className="card" style={{ padding: '24px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '1.05rem' }}>
            <CreditCard size={18} color="var(--success)" />
            <span>Bank & Direct Payment Settlement (बैंक खाता व UPI)</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label>Bank Account Number (खाता संख्या)</label>
              <input type="text" name="bank_account" value={profile.bank_account || ''} onChange={handleChange} className="auth-input" placeholder="e.g. 501004928172" />
            </div>
            <div className="form-group">
              <label>IFSC Code (आईएफएससी कोड)</label>
              <input type="text" name="ifsc_code" value={profile.ifsc_code || ''} onChange={handleChange} className="auth-input" placeholder="e.g. SBIN0001234" />
            </div>
            <div className="form-group">
              <label>UPI ID (यूपीआई आईडी)</label>
              <input type="text" name="upi_id" value={profile.upi_id || ''} onChange={handleChange} className="auth-input" placeholder="e.g. artisan@upi" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-md" disabled={saving} style={{ justifySelf: 'start', padding: '12px 24px' }}>
          <Save size={18} />
          <span>{saving ? 'Saving Changes...' : 'Save Profile & Bank Details (सहेजें)'}</span>
        </button>
      </form>
    </div>
  );
}
