import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div style={{ maxWidth: '500px' }}>
          <div className="logo" style={{ marginBottom: '8px' }}>
            <span className="logo-emoji">🛡️</span>
            <span className="logo-text">
              Kala<span className="highlight">Setu</span>
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Ministry of Social Justice and Empowerment (MoSJE) — National AI-Driven Market Linkage & Smart Cataloging Platform for Marginalized Artisans (SIH26090).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '32px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div>
            <h5 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.9rem' }}>Mandate Focus</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>• Inclusive Development</span>
              <span>• Digital Identity KYC</span>
              <span>• Cluster Linkages</span>
            </div>
          </div>
          <div>
            <h5 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.9rem' }}>National Fairs</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>• Shilp Samagam</span>
              <span>• Surajkund Mela</span>
              <span>• Dilli Haat</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Ministry of Social Justice & Empowerment. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}

