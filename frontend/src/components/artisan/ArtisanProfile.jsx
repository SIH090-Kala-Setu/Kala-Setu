import React, { useState, useEffect } from 'react';
import { getArtisanProfile, updateArtisanProfile } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { Save, User, MapPin, Briefcase, CreditCard, ShieldCheck } from 'lucide-react';

export default function ArtisanProfile() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    getArtisanProfile()
      .then(setProfile)
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(profile).forEach(([key, val]) => fd.append(key, val || ''));
      await updateArtisanProfile(fd);
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '40px auto' }}>
      <h2>My Profile {profile.is_verified && <span style={{ color: 'var(--success)', fontSize: '1.2rem' }}><ShieldCheck size={20} /> Verified</span>}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h4><User size={18} /> Personal Info</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div>
              <label>Full Name</label>
              <input type="text" name="full_name" value={profile.full_name || ''} onChange={handleChange} className="auth-input" />
            </div>
            <div>
              <label>Language</label>
              <select name="language" value={profile.language || 'English'} onChange={handleChange} className="auth-input">
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
            <div>
              <label>Aadhaar Number</label>
              <input type="text" name="aadhaar_number" value={profile.aadhaar_number || ''} onChange={handleChange} className="auth-input" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h4><Briefcase size={18} /> Craft Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
            <div>
              <label>Craft Type</label>
              <input type="text" name="craft_type" value={profile.craft_type || ''} onChange={handleChange} className="auth-input" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h4><MapPin size={18} /> Location</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div>
              <label>State</label>
              <input type="text" name="state" value={profile.state || ''} onChange={handleChange} className="auth-input" />
            </div>
            <div>
              <label>District</label>
              <input type="text" name="district" value={profile.district || ''} onChange={handleChange} className="auth-input" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h4><CreditCard size={18} /> Bank Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div>
              <label>Bank Account Number</label>
              <input type="text" name="bank_account" value={profile.bank_account || ''} onChange={handleChange} className="auth-input" />
            </div>
            <div>
              <label>IFSC Code</label>
              <input type="text" name="ifsc_code" value={profile.ifsc_code || ''} onChange={handleChange} className="auth-input" />
            </div>
            <div>
              <label>UPI ID</label>
              <input type="text" name="upi_id" value={profile.upi_id || ''} onChange={handleChange} className="auth-input" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-md"><Save size={18} /> Save Changes</button>
      </form>
    </div>
  );
}
