import React, { useState, useRef } from 'react';
import { enhanceImage } from '../../api/products';
import { useToast } from '../../context/ToastContext';
import { Upload, Sparkles, Check, Download, ArrowRight, RefreshCw } from 'lucide-react';

export default function ImageEnhancer({ onEnhanced, onNextStep, initialImage = null }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [enhancedUrl, setEnhancedUrl] = useState(initialImage);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP)', 'warning');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setEnhancedUrl(null);
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;
    setLoading(true);

    try {
      const blob = await enhanceImage(selectedFile);
      
      // Convert blob to Data URL for reliable persistence and image rendering
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        setEnhancedUrl(dataUrl);
        if (onEnhanced) onEnhanced(dataUrl);
        showToast('AI background removal & studio lighting completed!', 'success');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      showToast(err.message || 'Image processing failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (enhancedUrl && onNextStep) {
      onNextStep();
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h4>AI Background Removal & Studio Lighting Enhancer</h4>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Upload your raw craft photo. The AI automatically removes messy background objects, balances exposure, and centers your craft on a pristine e-commerce canvas.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div
        className="upload-dropzone"
        onClick={() => fileInputRef.current?.click()}
        style={{ marginBottom: '24px' }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <Upload size={36} color="var(--primary)" style={{ marginBottom: '10px' }} />
        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
          {selectedFile ? selectedFile.name : 'Click to select or drag & drop a product photo'}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Supports JPEG, PNG, WEBP from your phone camera or computer
        </p>
      </div>

      {/* Process Button */}
      {selectedFile && !enhancedUrl && (
        <button
          className="btn btn-primary btn-full"
          onClick={handleProcessImage}
          disabled={loading}
          style={{ marginBottom: '28px' }}
        >
          <Sparkles size={18} />
          <span>
            {loading
              ? 'Processing: Removing background & enhancing lighting...'
              : 'Run AI Background Removal & Lighting Correction'}
          </span>
        </button>
      )}

      {/* Loading Progress State */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div className="btn-spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--primary)' }}></div>
          </div>
          <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            Processing with AI Engine...
          </strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Clearing workshop background • Applying CLAHE contrast balancing • Centering subject
          </p>
        </div>
      )}

      {/* Before / After Comparison Results */}
      {(previewUrl || enhancedUrl) && (
        <div>
          <div className="row" style={{ gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {/* Original Photo */}
            {previewUrl && (
              <div className="col" style={{ minWidth: '260px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  ORIGINAL RAW PHOTO
                </div>
                <div
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    height: '280px',
                    backgroundColor: '#0a0a0c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Original Upload"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}

            {/* Enhanced Output */}
            {enhancedUrl && (
              <div className="col" style={{ minWidth: '260px' }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--success)',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} />
                  <span>AI ENHANCED E-COMMERCE LISTING</span>
                </div>
                <div
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2px solid var(--success)',
                    height: '280px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.15)'
                  }}
                >
                  <img
                    src={enhancedUrl}
                    alt="Enhanced Product"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <a
                    href={enhancedUrl}
                    download="enhanced_artisan_craft.png"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Download size={14} />
                    <span>Download PNG</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Action Step Controls */}
          {enhancedUrl && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <strong style={{ color: 'var(--success)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> Image Ready for Cataloging!
                </strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  This clean image will be attached to your product listing.
                </p>
              </div>

              <button className="btn btn-primary btn-md" onClick={handleProceed}>
                <span>Continue to Step 2: Voice Cataloger</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
