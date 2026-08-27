import React, { useState, useEffect } from 'react';
import { getProducts } from '../../api/products';
import { updateProductStatus, updateProductStock, updateProductPrice, deleteProduct, getProductQR } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { Edit, Trash2, QrCode, Plus, Minus, Search, Check, X, Tag, Package } from 'lucide-react';

export default function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [qrModal, setQrModal] = useState(null);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await getProducts({});
      setProducts(data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateProductStatus(id, status);
      setProducts(products.map(p => p.id === id ? { ...p, status } : p));
      showToast('Status updated', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStockChange = async (id, newStock) => {
    if (newStock < 0) return;
    try {
      await updateProductStock(id, newStock);
      setProducts(products.map(p => p.id === id ? { ...p, stock_count: newStock, stock: newStock } : p));
      showToast(`Stock updated to ${newStock} units`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const startEditPrice = (p) => {
    setEditingPriceId(p.id);
    setEditPriceVal(p.base_price ?? p.retail_price ?? p.suggested_price ?? 0);
  };

  const savePrice = async (id) => {
    const num = parseFloat(editPriceVal);
    if (isNaN(num) || num < 0) {
      showToast('Please enter a valid positive price', 'warning');
      return;
    }
    try {
      const b2b = Math.round(num * 0.85);
      await updateProductPrice(id, num, b2b);
      setProducts(products.map(p => p.id === id ? { ...p, base_price: num, retail_price: num, suggested_price: b2b, b2b_price: b2b } : p));
      setEditingPriceId(null);
      showToast(`Price updated to ₹${num}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this product?')) return;
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      showToast('Product archived', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filtered = products.filter(p =>
    (filter === 'All' || p.status === filter) &&
    ((p.title_en || p.title_hi || '').toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
      <div className="spinner" /><span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>Loading inventory...</span>
    </div>
  );

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>📦 Live Inventory & Stock Manager</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Real-time stock quantity, price adjustments, and catalog QR code generator for your craft items.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['All', 'Active', 'Draft', 'Sold Out', 'Archived', 'Pending Review'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#888' }} />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="auth-input" style={{ paddingLeft: '32px', paddingBottom: '8px', paddingTop: '8px', minHeight: '36px' }} />
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Stock (Units)</th>
              <th>Retail Price (₹)</th>
              <th>B2B Wholesale (₹)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const currentStock = p.stock_count ?? p.stock ?? 0;
              const retailVal = p.base_price ?? p.retail_price ?? p.suggested_price ?? 0;
              const b2bVal = p.suggested_price ?? p.b2b_price ?? Math.round(retailVal * 0.85);

              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {(p.images?.[0] || p.image_url) ? (
                        <img
                          src={p.images?.[0] || p.image_url}
                          alt={p.title_en}
                          style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={20} color="var(--text-muted)" />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.title_en || '(Untitled Craft)'}</div>
                        {p.title_hi && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{p.title_hi}</div>}
                        <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '2px' }}>{p.craft_category || p.category || 'Handicrafts'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={p.status || 'Active'}
                      onChange={e => handleStatusChange(p.id, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                      <option value="Sold Out">Sold Out</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </td>
                  <td>
                    <div className="stock-counter">
                      <button type="button" onClick={() => handleStockChange(p.id, currentStock - 1)} title="Decrease Stock">
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>
                        {currentStock}
                      </span>
                      <button type="button" onClick={() => handleStockChange(p.id, currentStock + 1)} title="Increase Stock">
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    {editingPriceId === p.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          value={editPriceVal}
                          onChange={e => setEditPriceVal(e.target.value)}
                          style={{ width: '80px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--primary)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          min="0"
                        />
                        <button className="btn btn-sm btn-primary" onClick={() => savePrice(p.id)} style={{ padding: '4px 8px' }} title="Save">
                          <Check size={14} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditingPriceId(null)} style={{ padding: '4px 6px' }} title="Cancel">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.92rem' }}>₹{retailVal}</span>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => startEditPrice(p)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                          title="Edit Price"
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>₹{b2bVal}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setQrModal(p.id)} title="View & Download QR Code">
                        <QrCode size={16} color="var(--primary)" />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)} title="Archive Product" style={{ color: 'var(--error)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No products found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {qrModal && (
        <div className="qr-modal" onClick={() => setQrModal(null)}>
          <div className="qr-modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>Product Catalog QR Code</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Scan to instantly open the product page on mobile or share with wholesale buyers.
            </p>
            <img src={getProductQR(qrModal)} alt="QR Code" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <a href={getProductQR(qrModal)} download="craft_product_qr.png" className="btn btn-primary btn-sm">
                Download QR
              </a>
              <button className="btn btn-secondary btn-sm" onClick={() => setQrModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
