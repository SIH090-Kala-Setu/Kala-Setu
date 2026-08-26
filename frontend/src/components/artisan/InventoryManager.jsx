import React, { useState, useEffect } from 'react';
import { getProducts } from '../../api/products';
import { updateProductStatus, updateProductStock, deleteProduct, getProductQR } from '../../api/artisan';
import { useToast } from '../../context/ToastContext';
import { Edit, Trash2, QrCode, Plus, Minus, Search } from 'lucide-react';

export default function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [qrModal, setQrModal] = useState(null);
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
      setProducts(products.map(p => p.id === id ? { ...p, stock_count: newStock } : p));
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
    (p.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <h2>📦 Inventory Manager</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Active', 'Draft', 'Sold Out', 'Archived'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#888' }} />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="auth-input" style={{ paddingLeft: '32px', paddingBottom: '8px', paddingTop: '8px', minHeight: '36px' }} />
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {p.image_url && <img src={`http://localhost:8000${p.image_url}`} alt={p.title} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />}
                    <span style={{ fontWeight: 500 }}>{p.title}</span>
                  </div>
                </td>
                <td>
                  <select value={p.status || 'Active'} onChange={e => handleStatusChange(p.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Sold Out">Sold Out</option>
                    <option value="Archived">Archived</option>
                  </select>
                </td>
                <td>
                  <div className="stock-counter">
                    <button onClick={() => handleStockChange(p.id, p.stock_count - 1)}><Minus size={14} /></button>
                    <span>{p.stock_count}</span>
                    <button onClick={() => handleStockChange(p.id, p.stock_count + 1)}><Plus size={14} /></button>
                  </div>
                </td>
                <td>₹{p.price}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setQrModal(p.id)} title="QR Code"><QrCode size={16} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)} title="Archive" style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {qrModal && (
        <div className="qr-modal" onClick={() => setQrModal(null)}>
          <div className="qr-modal-card" onClick={e => e.stopPropagation()}>
            <h3>Product QR Code</h3>
            <img src={getProductQR(qrModal)} alt="QR" style={{ margin: '20px 0' }} />
            <br />
            <button className="btn btn-secondary" onClick={() => setQrModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
