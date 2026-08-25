import React from 'react';
import { Send, Tag, Building2, Package } from 'lucide-react';

export default function ProductCard({ product, onOpenInquiry }) {
  const defaultImages = {
    Textiles: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    Pottery: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
    Handicrafts: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80',
    Jewelry: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80',
    'Paintings & Art': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    Woodwork: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'
  };

  const displayImage = product.image_url || defaultImages[product.category] || defaultImages['Handicrafts'];

  return (
    <div className="product-card">
      <div className="product-img-wrapper">
        <img
          src={displayImage}
          alt={product.title_en}
          className="product-img"
          onError={(e) => {
            e.target.src = defaultImages['Handicrafts'];
          }}
        />
        <span
          className="badge badge-purple badge-sm"
          style={{ position: 'absolute', top: 12, right: 12, backdropFilter: 'blur(8px)' }}
        >
          {product.category}
        </span>
      </div>

      <div className="product-details">
        <div className="product-craft">
          {product.artisan_coop ? `🏫 ${product.artisan_coop}` : `👤 ${product.artisan_name || 'Independent Artisan'}`}
        </div>

        <h4 className="product-title">{product.title_en}</h4>
        {product.title_hi && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {product.title_hi}
          </p>
        )}

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px', flex: 1 }}>
          {product.description_en ? product.description_en.substring(0, 80) + '...' : 'Traditional handcrafted piece.'}
        </p>

        <div className="product-prices">
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
              ₹ {product.retail_price}
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              B2B Wholesale: ₹ {product.b2b_price || (product.retail_price * 0.85).toFixed(0)}
            </small>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenInquiry(product)}
            title="Submit Bulk Quotation Inquiry"
          >
            <Send size={14} />
            <span>Inquire</span>
          </button>
        </div>
      </div>
    </div>
  );
}

