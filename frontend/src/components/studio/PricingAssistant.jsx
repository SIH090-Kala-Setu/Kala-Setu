import React, { useState } from 'react';
import { suggestPrice } from '../../api/products';
import { useToast } from '../../context/ToastContext';
import { Calculator, Sparkles, TrendingUp, IndianRupee, HelpCircle, ShieldCheck, Tag, Info } from 'lucide-react';

export default function PricingAssistant({ onPriceCalculated }) {
  const [category, setCategory] = useState('Textiles');
  const [materialCost, setMaterialCost] = useState('850');
  const [manufacturingHours, setManufacturingHours] = useState('16');
  const [productDesc, setProductDesc] = useState('Handloom silk saree with gold zari border');
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const { showToast } = useToast();

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await suggestPrice({
        category,
        material_cost: parseFloat(materialCost) || 0,
        manufacturing_hours: parseFloat(manufacturingHours) || 1,
        product_description: productDesc
      });
      setBreakdown(res);
      showToast('Fair market price breakdown computed!', 'success');
      if (onPriceCalculated) onPriceCalculated(res);
    } catch (err) {
      showToast(err.message || 'Pricing calculation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h4>AI Dynamic Pricing & Fair Wage Assistant</h4>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Guarantees fair hourly artisan wages (₹150/hr minimum living wage), accounts for raw material costs, and applies craft value multipliers for retail & B2B bulk pricing.
        </p>
      </div>

      <form onSubmit={handleCalculate}>
        <div className="row" style={{ marginBottom: '16px' }}>
          <div className="col form-group">
            <label htmlFor="price-cat">Craft Category</label>
            <select
              id="price-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="auth-input"
            >
              <option value="Textiles">Textiles & Handloom (1.5x Multiplier)</option>
              <option value="Handicrafts">Handicrafts & Decor (1.4x Multiplier)</option>
              <option value="Pottery">Clay & Blue Pottery (1.3x Multiplier)</option>
              <option value="Jewelry">Tribal & Silver Jewelry (1.8x Multiplier)</option>
              <option value="Paintings & Art">Folk Paintings & Art (2.0x Multiplier)</option>
              <option value="Woodwork">Wood Inlay & Carving (1.4x Multiplier)</option>
            </select>
          </div>

          <div className="col form-group">
            <label htmlFor="mat-cost">Raw Material Cost (₹)</label>
            <input
              id="mat-cost"
              type="number"
              className="auth-input"
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className="col form-group">
            <label htmlFor="mfg-hours">Production Labor (Hours)</label>
            <input
              id="mfg-hours"
              type="number"
              className="auth-input"
              value={manufacturingHours}
              onChange={(e) => setManufacturingHours(e.target.value)}
              min="0.5"
              step="0.5"
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label htmlFor="price-desc">Short Item Specification / Technique</label>
          <input
            id="price-desc"
            type="text"
            className="auth-input"
            placeholder="e.g. Pure mulberry silk Banarasi weave with real gold zari"
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          <Calculator size={18} />
          <span>{loading ? 'Analyzing Market Pricing & Fair Wage Data...' : 'Calculate Fair Pricing Recommendation'}</span>
        </button>
      </form>

      {/* Pricing Breakdown Cards */}
      {breakdown && (
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h5 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} color="var(--success)" />
              <span>Recommended Fair Price Points</span>
            </h5>
            {breakdown.competitor_range && (
              <span className="badge badge-purple badge-sm">
                Market Range: {breakdown.competitor_range}
              </span>
            )}
          </div>

          <div className="analytics-metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {/* D2C Retail Price */}
            <div className="stats-metric-box" style={{ borderColor: 'var(--primary)', padding: '16px' }}>
              <h4 style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>
                ₹ {breakdown.suggested_retail_price || breakdown.suggested_price || 0}
              </h4>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                Recommended Retail (D2C)
              </p>
              <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Includes craft multiplier</small>
            </div>

            {/* B2B Wholesale Price */}
            <div className="stats-metric-box" style={{ borderColor: 'var(--purple)', padding: '16px' }}>
              <h4 style={{ color: 'var(--purple)', fontSize: '1.4rem' }}>
                ₹ {breakdown.suggested_b2b_price || Math.round((breakdown.suggested_retail_price || 0) * 0.85)}
              </h4>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                B2B Bulk Wholesale
              </p>
              <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>15% volume discount</small>
            </div>

            {/* Fair Labor Wage */}
            <div className="stats-metric-box" style={{ borderColor: 'var(--success)', padding: '16px' }}>
              <h4 style={{ color: 'var(--success)', fontSize: '1.4rem' }}>
                ₹ {breakdown.labor_cost || (parseFloat(manufacturingHours) * 150)}
              </h4>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                Artisan Labor Earnings
              </p>
              <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>₹150/hr × {manufacturingHours} hrs</small>
            </div>

            {/* Breakeven Cost */}
            <div className="stats-metric-box" style={{ padding: '16px' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '1.4rem' }}>
                ₹ {(breakdown.base_material_cost || parseFloat(materialCost) || 0) + (breakdown.labor_cost || (parseFloat(manufacturingHours) * 150))}
              </h4>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                Min. Production Floor
              </p>
              <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Materials + Labor base</small>
            </div>
          </div>

          {/* Pricing Strategy & Intelligence Notes */}
          {breakdown.pricing_strategy_notes && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                fontSize: '0.86rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5
              }}
            >
              <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Info size={16} />
                <span>Pricing Intelligence Rationale:</span>
              </strong>
              {breakdown.pricing_strategy_notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
