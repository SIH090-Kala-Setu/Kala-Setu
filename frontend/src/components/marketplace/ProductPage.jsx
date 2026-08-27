import React, { useState, useEffect } from 'react';
import { getProductDetail, getProductQR } from '../../api/artisan';
import InquiryModal from './InquiryModal';
import { useToast } from '../../context/ToastContext';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Send, 
  QrCode, 
  Package, 
  Sparkles, 
  MapPin, 
  UserCheck, 
  CheckCircle2, 
  IndianRupee, 
  Share2, 
  Tag, 
  Layers, 
  Info,
  Clock
} from 'lucide-react';

export default function ProductPage({ productId, initialProduct = null, onBack }) {
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [activeLangTab, setActiveLangTab] = useState('en');
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await getProductDetail(productId);
      if (data) {
        setProduct(data);
      }
    } catch (err) {
      console.warn('Product detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading authentic craft details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h3>Product Not Found</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          The product listing you are looking for is unavailable or has been archived.
        </p>
        <button className="btn btn-primary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Marketplace</span>
        </button>
      </div>
    );
  }

  const defaultImages = {
    Textiles: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    Pottery: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    Handicrafts: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    Jewelry: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
    'Paintings & Art': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    Woodwork: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'
  };

  const categoryName = product.craft_category || product.category || 'Handicrafts';
  const displayImage = product.image_url || product.images?.[0] || defaultImages[categoryName] || defaultImages['Handicrafts'];
  
  const retailPrice = product.retail_price ?? product.base_price ?? 0;
  const b2bPrice = product.b2b_price ?? product.suggested_price ?? Math.round(retailPrice * 0.85);
  const stockUnits = product.stock ?? product.stock_count ?? 1;

  // Generate dynamic hashtags based on category, craft name, and materials
  const rawMaterials = Array.isArray(product.materials)
    ? product.materials
    : (product.material ? product.material.split(',') : ['Handmade', 'Natural']);
  
  const hashtags = [
    `#${categoryName.replace(/\s+/g, '')}`,
    '#HandmadeInIndia',
    '#VocalForLocal',
    '#ArtisanCraft',
    '#MoSJEVerified',
    ...rawMaterials.map(m => `#${m.trim().replace(/\s+/g, '')}`).filter(t => t.length > 2)
  ].slice(0, 6);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title_en || 'Artisan Craft on KalaSetu',
        text: `Check out ${product.title_en} handcrafted by verified Indian artisans on KalaSetu.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product page link copied to clipboard!', 'success');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '60px' }}>
      {/* Back to Marketplace Breadcrumb */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Marketplace</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowQRModal(true)} title="View QR Code">
            <QrCode size={16} />
            <span>Catalog QR</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleShare} title="Share Link">
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Main Product Layout */}
      <div className="row" style={{ gap: '36px', alignItems: 'flex-start' }}>
        {/* Left Column: Product Photo & Badges */}
        <div className="col" style={{ flex: '1 1 420px', maxWidth: '520px' }}>
          <div
            style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <img
              src={displayImage}
              alt={product.title_en || 'Handicraft'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transition: 'transform 0.3s ease'
              }}
            />

            {/* Category Tag */}
            <span
              className="badge badge-purple"
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              {categoryName}
            </span>

            {/* AI Studio Enhanced Badge */}
            <span
              className="badge badge-success badge-sm"
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              <Sparkles size={12} />
              <span>Studio AI Photo</span>
            </span>
          </div>

          {/* Hashtags Strip */}
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {hashtags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  padding: '4px 10px',
                  borderRadius: '20px'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: Details, Pricing, Artisan & Actions */}
        <div className="col" style={{ flex: '1 1 460px' }}>
          {/* Titles */}
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {product.title_en || 'Authentic Handcrafted Masterpiece'}
            </h2>
            {product.title_hi && (
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 500 }}>
                {product.title_hi}
              </p>
            )}
          </div>

          {/* Price & Stock Card */}
          <div
            style={{
              padding: '20px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <small style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  Direct Artisan Retail Price
                </small>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                  ₹ {retailPrice}
                </div>
              </div>

              <div>
                <small style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  B2B Bulk Wholesale
                </small>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--purple)', lineHeight: 1.1 }}>
                  ₹ {b2bPrice}
                </div>
              </div>

              {/* Stock Status Badge */}
              <div>
                {stockUnits > 0 ? (
                  <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                    ✓ In Stock ({stockUnits} Units)
                  </span>
                ) : (
                  <span className="badge badge-error" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                    Sold Out
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={16} color="var(--success)" />
              <span>100% Fair Wage Guaranteed to Native Craftsperson under MoSJE Standards.</span>
            </div>
          </div>

          {/* Description Section with Language Switcher */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Craft Story & Description</h4>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  className={`btn-ghost ${activeLangTab === 'en' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveLangTab('en')}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                >
                  English
                </button>
                <button
                  className={`btn-ghost ${activeLangTab === 'hi' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveLangTab('hi')}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                >
                  हिंदी
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)'
              }}
            >
              {activeLangTab === 'en' ? (
                product.description_en || 'Exquisite traditional craft handcrafted with traditional techniques and local heritage materials.'
              ) : (
                product.description_hi || 'पारंपरिक हस्तशिल्प तकनीक और स्थानीय शिल्पकारों द्वारा निर्मित प्रामाणिक कलाकृति।'
              )}
            </div>
          </div>

          {/* Specifications Table */}
          <div
            style={{
              marginBottom: '24px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--border-color)'
            }}
          >
            <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="var(--primary)" />
              <span>Product Specifications</span>
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.84rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{categoryName}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Materials:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {Array.isArray(product.materials) ? product.materials.join(', ') : (product.material || 'Organic / Traditional')}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Cluster / Origin:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {product.artisan_coop || product.artisan_state || 'Handicraft Cluster'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <div style={{ fontWeight: 600, color: 'var(--success)', marginTop: '2px' }}>
                  {product.status || 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Artisan & Cluster Information Card */}
          <div
            style={{
              padding: '18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(230, 126, 34, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  border: '1px solid var(--primary)'
                }}
              >
                {(product.artisan_name || 'A')[0].toUpperCase()}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                    {product.artisan_name || 'Verified Master Artisan'}
                  </strong>
                  <span className="badge badge-success badge-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={11} />
                    <span>MoSJE Verified</span>
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} />
                  <span>{product.artisan_coop || product.artisan_state || 'Traditional Artisan Cooperative'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowInquiryModal(true)}
              style={{ flex: '1 1 200px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}
            >
              <Send size={18} />
              <span>Inquire for Bulk Quotation</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowQRModal(true)}
              style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <QrCode size={18} />
              <span>Catalog QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* B2B Inquiry Modal */}
      <InquiryModal
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        product={product}
      />

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="qr-modal" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>Product Catalog QR Code</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Scan this QR code with any mobile camera to view this item directly.
            </p>
            <img
              src={getProductQR(product.id)}
              alt="QR Code"
              style={{ margin: '0 auto 16px', display: 'block', width: '180px', height: '180px', background: '#fff', padding: '8px', borderRadius: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <a href={getProductQR(product.id)} download={`craft_${product.id}_qr.png`} className="btn btn-primary btn-sm">
                Download QR
              </a>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowQRModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
