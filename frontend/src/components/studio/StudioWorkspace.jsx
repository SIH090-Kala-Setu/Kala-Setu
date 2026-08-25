import React, { useState } from 'react';
import ImageEnhancer from './ImageEnhancer';
import VoiceCataloger from './VoiceCataloger';
import PricingAssistant from './PricingAssistant';
import ProductCreator from './ProductCreator';
import { Sparkles, Image, Mic, Calculator, PackagePlus, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function StudioWorkspace({ onProductCreated }) {
  const [activeStep, setActiveStep] = useState('enhance');
  const [studioState, setStudioState] = useState({
    image_url: '',
    title_en: '',
    title_hi: '',
    description_en: '',
    description_hi: '',
    category: 'Handicrafts',
    materials: [],
    retail_price: 2500,
    b2b_price: 2100
  });

  const handleImageEnhanced = (url) => {
    setStudioState((prev) => ({ ...prev, image_url: url }));
    // Do NOT automatically force tab switch so the user can inspect the before/after preview!
  };

  const handleCatalogGenerated = (data) => {
    setStudioState((prev) => ({
      ...prev,
      title_en: data.title_en,
      title_hi: data.title_hi,
      description_en: data.description_en,
      description_hi: data.description_hi,
      category: data.category || prev.category,
      materials: data.materials || prev.materials
    }));
  };

  const handlePriceCalculated = (data) => {
    setStudioState((prev) => ({
      ...prev,
      retail_price: data.suggested_retail_price || data.suggested_price || prev.retail_price,
      b2b_price: data.b2b_wholesale_price || (data.suggested_price * 0.85).toFixed(0) || prev.b2b_price
    }));
  };

  const steps = [
    { id: 'enhance', label: '1. Photo Studio', icon: Image, completed: !!studioState.image_url },
    { id: 'catalog', label: '2. Multilingual Catalog', icon: Mic, completed: !!studioState.title_en },
    { id: 'pricing', label: '3. Pricing Assistant', icon: Calculator, completed: !!studioState.retail_price },
    { id: 'publish', label: '4. Publish Listing', icon: PackagePlus, completed: false }
  ];

  return (
    <div className="container" style={{ marginTop: '20px', marginBottom: '60px' }}>
      {/* Studio Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2>Artisan AI Studio & Virtual Manager</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '6px auto 0', fontSize: '0.92rem' }}>
          Digitize handmade craft inventory in 4 easy steps: Clean photo background, speak in your native dialect, compute fair pricing, and go live.
        </p>
      </div>

      {/* Persistent Active Craft Asset Banner (Visible when an image or title is ready) */}
      {studioState.image_url && (
        <div
          style={{
            maxWidth: '820px',
            margin: '0 auto 24px',
            padding: '12px 18px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={studioState.image_url}
              alt="Active Craft Asset"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                objectFit: 'contain',
                backgroundColor: '#fff',
                border: '1px solid var(--success)'
              }}
            />
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {studioState.title_en || 'Active Product Asset'}
              </div>
              <span className="badge badge-success badge-sm">✓ Studio Image Enhanced</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {studioState.retail_price && <span>Retail: ₹{studioState.retail_price}</span>}
            {studioState.category && <span>• {studioState.category}</span>}
          </div>
        </div>
      )}

      {/* Step Progress Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              style={{ padding: '8px 18px', borderRadius: '12px' }}
              onClick={() => setActiveStep(step.id)}
            >
              <Icon size={16} />
              <span>{step.label}</span>
              {step.completed && !isActive && (
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Step Panel */}
      <div className="dashboard-content" style={{ padding: '36px 32px' }}>
        {activeStep === 'enhance' && (
          <ImageEnhancer
            initialImage={studioState.image_url}
            onEnhanced={handleImageEnhanced}
            onNextStep={() => setActiveStep('catalog')}
          />
        )}

        {activeStep === 'catalog' && (
          <div>
            <VoiceCataloger onCatalogGenerated={handleCatalogGenerated} />
            {studioState.title_en && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button className="btn btn-primary btn-md" onClick={() => setActiveStep('pricing')}>
                  <span>Continue to Step 3: Pricing Assistant</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {activeStep === 'pricing' && (
          <div>
            <PricingAssistant onPriceCalculated={handlePriceCalculated} />
            {studioState.retail_price && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button className="btn btn-primary btn-md" onClick={() => setActiveStep('publish')}>
                  <span>Continue to Step 4: Publish Listing</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {activeStep === 'publish' && (
          <ProductCreator prefillData={studioState} onProductCreated={onProductCreated} />
        )}
      </div>
    </div>
  );
}
