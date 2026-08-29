import React, { useState, useRef, useEffect } from 'react';
import { enhanceImage } from '../../api/products';
import { useToast } from '../../context/ToastContext';
import { Upload, Camera, Sparkles, Check, Download, ArrowRight, RefreshCw, X, Video } from 'lucide-react';

export default function ImageEnhancer({ onEnhanced, onNextStep, initialImage = null }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [enhancedUrl, setEnhancedUrl] = useState(initialImage);
  const [loading, setLoading] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { showToast } = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP)', 'warning');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setEnhancedUrl(null);
  };

  // Open native mobile camera or trigger camera input
  const handleTriggerMobileCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Start live webcam for desktop / web browser
  const handleStartWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setWebcamStream(stream);
      setIsWebcamOpen(true);
    } catch (err) {
      console.warn('Webcam access error:', err);
      // Fallback to native mobile camera file input if getUserMedia fails
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        showToast('Camera access denied or not available. Please upload a photo.', 'warning');
      }
    }
  };

  useEffect(() => {
    if (isWebcamOpen && videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [isWebcamOpen, webcamStream]);

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamOpen(false);
  };

  // Capture still photo from live webcam stream
  const captureWebcamPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `craft_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        setEnhancedUrl(null);
        stopWebcam();
        showToast('Photo captured successfully! Ready for AI enhancement.', 'success');
      }
    }, 'image/jpeg', 0.95);
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;
    setLoading(true);

    try {
      const res = await enhanceImage(selectedFile);
      
      if (res instanceof Blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          setEnhancedUrl(dataUrl);
          if (onEnhanced) onEnhanced(dataUrl);
          showToast('AI background removal & studio lighting completed!', 'success');
        };
        reader.readAsDataURL(res);
      } else if (typeof res === 'string') {
        const dataUrl = res.startsWith('data:') ? res : `data:image/png;base64,${res}`;
        setEnhancedUrl(dataUrl);
        if (onEnhanced) onEnhanced(dataUrl);
        showToast('AI background removal & studio lighting completed!', 'success');
      } else if (res && res.enhanced_image) {
        const dataUrl = res.enhanced_image.startsWith('data:') ? res.enhanced_image : `data:image/png;base64,${res.enhanced_image}`;
        setEnhancedUrl(dataUrl);
        if (onEnhanced) onEnhanced(dataUrl);
        showToast('AI background removal & studio lighting completed!', 'success');
      } else {
        throw new Error('Unexpected response format from image processor.');
      }
    } catch (err) {
      console.error('Enhance error:', err);
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
          Capture directly with your phone camera or upload a craft photo. The AI automatically removes cluttered backgrounds, balances exposure, and centers your craft on an e-commerce canvas.
        </p>
      </div>

      {/* Hidden file & camera inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      {/* Mobile Direct Camera Trigger */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
      />

      {/* Action Buttons: Camera & Upload */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleTriggerMobileCamera}
          style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}
        >
          <Camera size={18} />
          <span>Take Photo (Camera)</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleStartWebcam}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 16px' }}
          title="Open live desktop webcam"
        >
          <Video size={18} />
          <span>Live Webcam</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}
        >
          <Upload size={18} />
          <span>Choose from Gallery</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <div
        className="upload-dropzone"
        onClick={() => fileInputRef.current?.click()}
        style={{ marginBottom: '24px', cursor: 'pointer', padding: '28px 16px' }}
      >
        <Upload size={32} color="var(--primary)" style={{ marginBottom: '8px' }} />
        <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>
          {selectedFile ? `Selected: ${selectedFile.name}` : 'Tap here to browse photos or drag & drop'}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Supports high-res JPEG, PNG, WEBP from mobile cameras and DSLR photos
        </p>
      </div>

      {/* Live Webcam Modal */}
      {isWebcamOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <strong style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} color="var(--primary)" />
                <span>Live Camera Viewfinder</span>
              </strong>
              <button
                className="btn-ghost"
                onClick={stopWebcam}
                style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#000',
                aspectRatio: '4/3',
                marginBottom: '20px',
                position: 'relative'
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={stopWebcam}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={captureWebcamPhoto} style={{ minWidth: '160px' }}>
                <Camera size={18} />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Button */}
      {selectedFile && !enhancedUrl && (
        <button
          className="btn btn-primary btn-full"
          onClick={handleProcessImage}
          disabled={loading}
          style={{ marginBottom: '28px', padding: '14px' }}
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
            Processing with AI Studio Engine...
          </strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Clearing workshop background • Applying unsharp mask sharpness • Color vibrance lift
          </p>
        </div>
      )}

      {/* Before / After Comparison Results */}
      {(previewUrl || enhancedUrl) && (
        <div>
          <div className="row" style={{ gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {/* Original Photo */}
            {previewUrl && (
              <div className="col" style={{ minWidth: '260px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>ORIGINAL RAW PHOTO</span>
                  <button
                    type="button"
                    onClick={handleTriggerMobileCamera}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Retake
                  </button>
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
