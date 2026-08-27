import React, { useState, useEffect, useCallback } from 'react';
import { getProducts } from '../../api/products';
import ProductCard from './ProductCard';
import InquiryModal from './InquiryModal';
import { useToast } from '../../context/ToastContext';
import { Search, Filter, ShoppingBag, MapPin, Layers, IndianRupee, RotateCcw, SlidersHorizontal } from 'lucide-react';

export default function Marketplace({ onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedMaterial, setSelectedMaterial] = useState('All');
  const [priceRange, setPriceRange] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedProductForInquiry, setSelectedProductForInquiry] = useState(null);
  const { showToast } = useToast();

  const categories = ['All', 'Textiles', 'Handicrafts', 'Pottery', 'Jewelry', 'Paintings & Art', 'Woodwork'];
  
  const regions = [
    'All',
    'Uttar Pradesh',
    'Rajasthan',
    'Gujarat',
    'West Bengal',
    'Odisha',
    'Jammu & Kashmir',
    'Madhya Pradesh',
    'Karnataka',
    'Tamil Nadu',
    'Assam'
  ];

  const materials = [
    'All',
    'Silk',
    'Cotton',
    'Clay',
    'Silver',
    'Brass',
    'Wood',
    'Marble',
    'Terracotta',
    'Jute'
  ];

  const priceRanges = [
    { label: 'All Prices', min: null, max: null },
    { label: 'Under ₹1,000', min: 0, max: 1000 },
    { label: '₹1,000 - ₹5,000', min: 1000, max: 5000 },
    { label: '₹5,000 - ₹15,000', min: 5000, max: 15000 },
    { label: 'Above ₹15,000', min: 15000, max: null }
  ];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const activeRange = priceRanges.find(r => r.label === priceRange) || {};
      const data = await getProducts({
        category: selectedCategory !== 'All' ? selectedCategory : null,
        region: selectedRegion !== 'All' ? selectedRegion : null,
        material: selectedMaterial !== 'All' ? selectedMaterial : null,
        min_price: activeRange.min,
        max_price: activeRange.max,
        search: searchTerm.trim() || null
      });
      setProducts(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedRegion, selectedMaterial, priceRange, searchTerm, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedRegion('All');
    setSelectedMaterial('All');
    setPriceRange('All');
    setSearchTerm('');
  };

  const hasActiveFilters = selectedCategory !== 'All' || selectedRegion !== 'All' || selectedMaterial !== 'All' || priceRange !== 'All' || searchTerm.trim() !== '';

  return (
    <div className="container" style={{ marginTop: '20px', marginBottom: '60px' }}>
      {/* Marketplace Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2>National Craft Marketplace & B2B Directory</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', margin: '6px auto 0', fontSize: '0.92rem' }}>
          Discover authentic handcrafted treasures directly from verified artisans, handloom weavers, and cooperative clusters across India.
        </p>
      </div>

      {/* Main Search & Category Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        {/* Category Pills */}
        <div className="filter-btn-group" style={{ overflowX: 'auto', maxWidth: '100%', paddingBottom: '4px' }}>
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

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: 'auto' }}>
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search by title, craft, material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="auth-input"
              style={{ paddingLeft: '34px', minHeight: '38px', paddingBottom: '6px', paddingTop: '6px' }}
            />
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: 12 }} />
          </div>

          <button
            type="button"
            className={`btn btn-sm ${showAdvancedFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '38px' }}
            title="Filter by Region, Material, Price"
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleResetFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Drawer (Region, Material, Price Range) */}
      {showAdvancedFilters && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '28px',
            boxShadow: 'var(--shadow-md)',
            animation: 'drawerSlideDown 0.2s ease-out'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            {/* Region Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <MapPin size={13} color="var(--primary)" />
                <span>Craft Region / State</span>
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="auth-input"
                style={{ padding: '8px 12px', minHeight: '38px', fontSize: '0.85rem' }}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r === 'All' ? 'All Regions across India' : r}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Layers size={13} color="var(--purple)" />
                <span>Primary Material</span>
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="auth-input"
                style={{ padding: '8px 12px', minHeight: '38px', fontSize: '0.85rem' }}
              >
                {materials.map((m) => (
                  <option key={m} value={m}>
                    {m === 'All' ? 'All Materials' : m}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <IndianRupee size={13} color="var(--success)" />
                <span>Price Bracket</span>
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="auth-input"
                style={{ padding: '8px 12px', minHeight: '38px', fontSize: '0.85rem' }}
              >
                {priceRanges.map((pr) => (
                  <option key={pr.label} value={pr.label}>
                    {pr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Active Filters:</span>
          {selectedCategory !== 'All' && (
            <span className="badge badge-purple badge-sm">Category: {selectedCategory}</span>
          )}
          {selectedRegion !== 'All' && (
            <span className="badge badge-primary badge-sm">Region: {selectedRegion}</span>
          )}
          {selectedMaterial !== 'All' && (
            <span className="badge badge-sm" style={{ background: 'rgba(255,255,255,0.08)' }}>Material: {selectedMaterial}</span>
          )}
          {priceRange !== 'All' && (
            <span className="badge badge-success badge-sm">Price: {priceRange}</span>
          )}
          {searchTerm && (
            <span className="badge badge-sm" style={{ background: 'rgba(255,255,255,0.08)' }}>"{searchTerm}"</span>
          )}
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Showing {products.length} {products.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <p>Filtering digitized artisan catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h4>No products found</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Try adjusting your region, material, price range, or search keywords.
          </p>
          {hasActiveFilters && (
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters} style={{ marginTop: '16px' }}>
              Clear All Filters
            </button>
          )}
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
