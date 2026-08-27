import React, { useState, useEffect, useCallback } from 'react';
import { getProducts } from '../../api/products';
import ProductCard from './ProductCard';
import InquiryModal from './InquiryModal';
import { useToast } from '../../context/ToastContext';
import { Search, Filter, ShoppingBag } from 'lucide-react';

export default function Marketplace({ onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductForInquiry, setSelectedProductForInquiry] = useState(null);
  const { showToast } = useToast();

  const categories = ['All', 'Textiles', 'Handicrafts', 'Pottery', 'Jewelry', 'Paintings & Art', 'Woodwork'];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProducts({
        category: selectedCategory !== 'All' ? selectedCategory : null,
        search: searchTerm.trim() || null
      });
      setProducts(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="container" style={{ marginTop: '20px', marginBottom: '60px' }}>
      {/* Marketplace Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2>National Craft Marketplace & B2B Directory</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '6px auto 0', fontSize: '0.92rem' }}>
          Discover authentic handcrafted treasures directly from verified artisans, handloom weavers, and cooperative clusters across India.
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        {/* Category Pills */}
        <div className="filter-btn-group" style={{ overflowX: 'auto', maxWidth: '100%' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="Search products by title or craft..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="auth-input"
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading digitized artisan catalog...
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h4>No products found</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Try adjusting your category filter or search keywords.
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onOpenInquiry={(prod) => setSelectedProductForInquiry(prod)}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}

      {/* B2B Inquiry Modal */}
      <InquiryModal
        isOpen={!!selectedProductForInquiry}
        onClose={() => setSelectedProductForInquiry(null)}
        product={selectedProductForInquiry}
      />
    </div>
  );
}
