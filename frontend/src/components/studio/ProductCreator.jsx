import React, { useState, useEffect } from 'react';
import { createProduct } from '../../api/products';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PackagePlus, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ProductCreator({ prefillData = {}, onProductCreated }) {
  const [titleEn, setTitleEn] = useState(prefillData.title_en || '');
  const [titleHi, setTitleHi] = useState(prefillData.title_hi || '');
  const [descEn, setDescEn] = useState(prefillData.description_en || '');
  const [descHi, setDescHi] = useState(prefillData.description_hi || '');
  const [category, setCategory] = useState(prefillData.category || 'Handicrafts');
  const [materials, setMaterials] = useState(prefillData.materials?.join?.(', ') || prefillData.materials || 'Silk, Zari');
  const [retailPrice, setRetailPrice] = useState(prefillData.retail_price || 2500);
  const [b2bPrice, setB2bPrice] = useState(prefillData.b2b_price || 2100);
  const [stock, setStock] = useState(prefillData.stock || 10);
  const [imageUrl, setImageUrl] = useState(prefillData.image_url || '');
  const [submitting, setSubmitting] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Synchronize when prefillData updates from previous steps (Pricing / Cataloger / Enhancer)
  useEffect(() => {
    if (prefillData) {
      if (prefillData.title_en) setTitleEn(prefillData.title_en);
      if (prefillData.title_hi) setTitleHi(prefillData.title_hi);
      if (prefillData.description_en) setDescEn(prefillData.description_en);
      if (prefillData.description_hi) setDescHi(prefillData.description_hi);
      if (prefillData.category) setCategory(prefillData.category);
      if (prefillData.materials) {
        setMaterials(Array.isArray(prefillData.materials) ? prefillData.materials.join(', ') : prefillData.materials);
      }
      if (prefillData.retail_price) setRetailPrice(prefillData.retail_price);
      if (prefillData.b2b_price) setB2bPrice(prefillData.b2b_price);
      if (prefillData.stock) setStock(prefillData.stock);
      if (prefillData.image_url) setImageUrl(prefillData.image_url);
    }
  }, [prefillData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please sign in as an artisan to publish listings', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const matList = typeof materials === 'string'
        ? materials.split(',').map((m) => m.trim()).filter(Boolean)
        : (materials || []);

      const parsedRetail = parseFloat(retailPrice) || 0;
      const parsedB2B = parseFloat(b2bPrice) || (parsedRetail * 0.85);
      const parsedStock = parseInt(stock, 10) || 1;

      const res = await createProduct({
        title_en: titleEn,
        title_hi: titleHi,
        description_en: descEn,
        description_hi: descHi,
        category,
        materials: matList,
        tags: [],
        retail_price: parsedRetail,
        b2b_price: parsedB2B,
        stock: parsedStock,
        image_url: imageUrl || null
      });

      if (res.status === 'Pending Review') {
        showToast('Product published! Queued for MoSJE admin KYC moderation.', 'info');
      } else {
        showToast(`Product "${titleEn || 'Craft Item'}" successfully published with Price ₹${parsedRetail} and Stock ${parsedStock}!`, 'success');
      }

      if (onProductCreated) onProductCreated(res);
    } catch (err) {
      showToast(err.message || 'Failed to create product listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h4>Publish Cataloged Product Listing</h4>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Finalize your multilingual titles, descriptions, fair retail & wholesale pricing, and stock quantities to list your craft in the live inventory and marketplace.
        </p>
      </div>

      {user && !user.is_verified && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem',
            color: 'var(--warning)'
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Notice:</strong> Your artisan account KYC is currently pending. Your product will be submitted to the Admin Moderation Queue before going publicly active.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row" style={{ marginBottom: '16px' }}>
          <div className="col form-group">
            <label htmlFor="prod-title-en">Product Title (English)</label>
            <input
              id="prod-title-en"
              type="text"
              className="auth-input"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Handwoven Pure Silk Banarasi Saree"
              required
            />
          </div>
          <div className="col form-group">
            <label htmlFor="prod-title-hi">उत्पाद का नाम (Hindi)</label>
            <input
              id="prod-title-hi"
              type="text"
              className="auth-input"
              value={titleHi}
              onChange={(e) => setTitleHi(e.target.value)}
              placeholder="e.g. हथकरघा शुद्ध रेशम बनारसी साड़ी"
              required
            />
          </div>
        </div>

        <div className="row" style={{ marginBottom: '16px' }}>
          <div className="col form-group">
            <label htmlFor="prod-desc-en">Description (English)</label>
            <textarea
              id="prod-desc-en"
              rows={3}
              className="auth-input"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              placeholder="Detailed description, motifs, weave technique..."
            />
          </div>
          <div className="col form-group">
            <label htmlFor="prod-desc-hi">विवरण (Hindi)</label>
            <textarea
              id="prod-desc-hi"
              rows={3}
              className="auth-input"
              value={descHi}
              onChange={(e) => setDescHi(e.target.value)}
              placeholder="कलाकृति, सामग्री एवं बुनाई का विवरण..."
            />
          </div>
        </div>

        <div className="row" style={{ marginBottom: '16px' }}>
          <div className="col form-group">
            <label htmlFor="prod-cat">Craft Category</label>
            <select
              id="prod-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="auth-input"
            >
              <option value="Textiles">Textiles & Handloom</option>
              <option value="Handicrafts">Handicrafts & Decor</option>
              <option value="Pottery">Clay & Blue Pottery</option>
              <option value="Jewelry">Tribal & Silver Jewelry</option>
              <option value="Paintings & Art">Folk Paintings & Art</option>
              <option value="Woodwork">Wood Inlay & Carving</option>
            </select>
          </div>

          <div className="col form-group">
            <label htmlFor="prod-mat">Materials (Comma separated)</label>
            <input
              id="prod-mat"
              type="text"
              className="auth-input"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="e.g. Silk, Silver Zari"
            />
          </div>
        </div>

        <div className="row" style={{ marginBottom: '16px' }}>
          <div className="col form-group">
            <label htmlFor="prod-retail">Retail Price (₹) - D2C</label>
            <input
              id="prod-retail"
              type="number"
              className="auth-input"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className="col form-group">
            <label htmlFor="prod-b2b">B2B Wholesale Price (₹)</label>
            <input
              id="prod-b2b"
              type="number"
              className="auth-input"
              value={b2bPrice}
              onChange={(e) => setB2bPrice(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className="col form-group">
            <label htmlFor="prod-stock">Available Stock Units</label>
            <input
              id="prod-stock"
              type="number"
              className="auth-input"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              min="1"
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label htmlFor="prod-img">Attached Product Image</label>
          {imageUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', padding: '10px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <img
                src={imageUrl}
                alt="Product preview"
                style={{ width: '64px', height: '64px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#fff' }}
              />
              <div>
                <span className="badge badge-success badge-sm">✓ Image Attached</span>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>AI enhanced studio background</p>
              </div>
            </div>
          )}
          <input
            id="prod-img"
            type="text"
            className="auth-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/... or data:image/png..."
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting} style={{ padding: '14px' }}>
          <PackagePlus size={18} />
          <span>{submitting ? 'Publishing Listing...' : 'Publish Product to Live Catalog & Inventory'}</span>
        </button>
      </form>
    </div>
  );
}
