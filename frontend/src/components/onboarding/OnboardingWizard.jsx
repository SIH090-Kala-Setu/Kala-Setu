import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    language: 'English',
    full_name: '',
    phone: '',
    role: 'Artisan',
    craft_type: '',
    state: '',
    district: '',
    password: ''
  });
  const { register } = useAuth();
  const { showToast } = useToast();

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    try {
      await register({
        username: formData.phone,
        password: formData.password,
        role: formData.role,
        full_name: formData.full_name,
        phone: formData.phone,
      });
      setStep(7);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <div className="wizard-steps">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className={`wizard-step-dot ${step >= i ? 'done' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h3>Choose your Language</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
              {['English', 'हिंदी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'मराठी'].map(lang => (
                <div key={lang} className={`lang-tile ${formData.language === lang ? 'selected' : ''}`} onClick={() => { setFormData({...formData, language: lang}); handleNext(); }}>
                  <span style={{ fontSize: '1.2rem' }}>{lang}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Your Details</h3>
            <div style={{ marginTop: '20px' }}>
              <label>Full Name</label>
              <input type="text" className="auth-input" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} style={{ marginBottom: '16px' }} />
              <label>Phone Number (will be your username)</label>
              <input type="tel" className="auth-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={handlePrev}>Back</button>
              <button className="btn btn-primary" onClick={handleNext} disabled={!formData.full_name || !formData.phone}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>What is your role?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '20px' }}>
              {[
                { r: 'Artisan', icon: '🎨', desc: 'I make and sell products' },
                { r: 'Aggregator', icon: '🤝', desc: 'I manage a group of artisans' },
                { r: 'Buyer', icon: '🛍️', desc: 'I want to buy products' }
              ].map(role => (
                <div key={role.r} className={`role-tile ${formData.role === role.r ? 'selected' : ''}`} onClick={() => setFormData({...formData, role: role.r})}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                    <span style={{ fontSize: '2rem' }}>{role.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{role.r}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{role.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={handlePrev}>Back</button>
              <button className="btn btn-primary" onClick={() => formData.role === 'Artisan' ? handleNext() : setStep(5)}>Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3>What do you make?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
              {[
                { c: 'Textiles', icon: '🧵' },
                { c: 'Pottery', icon: '🏺' },
                { c: 'Jewelry', icon: '💍' },
                { c: 'Woodcraft', icon: '🪵' },
                { c: 'Paintings', icon: '🎨' },
                { c: 'Metal Craft', icon: '🔨' }
              ].map(craft => (
                <div key={craft.c} className={`craft-tile ${formData.craft_type === craft.c ? 'selected' : ''}`} onClick={() => setFormData({...formData, craft_type: craft.c})}>
                  <span>{craft.icon}</span>
                  <span>{craft.c}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={handlePrev}>Back</button>
              <button className="btn btn-primary" onClick={handleNext}>Next</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3>Where are you located?</h3>
            <div style={{ marginTop: '20px' }}>
              <label>State</label>
              <select className="auth-input" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} style={{ marginBottom: '16px' }}>
                <option value="">Select State</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Maharashtra">Maharashtra</option>
              </select>
              <label>District</label>
              <input type="text" className="auth-input" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={() => formData.role === 'Artisan' ? handlePrev() : setStep(3)}>Back</button>
              <button className="btn btn-primary" onClick={handleNext} disabled={!formData.state || !formData.district}>Next</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3>Create a Password</h3>
            <div style={{ marginTop: '20px' }}>
              <input type="password" placeholder="Password" className="auth-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={handlePrev}>Back</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!formData.password}>Finish</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
            <h3>Registration Successful!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Welcome to KalaSetu.</p>
            <button className="btn btn-primary btn-lg" onClick={onComplete}>Go to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
