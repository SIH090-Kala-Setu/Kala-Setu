import React, { useState, useRef, useEffect } from 'react';
import { generateCatalog } from '../../api/products';
import { useToast } from '../../context/ToastContext';
import { Mic, MicOff, Upload, FileText, Sparkles, Check, Copy, Square, RotateCcw, Volume2, Edit3 } from 'lucide-react';

export default function VoiceCataloger({ onCatalogGenerated }) {
  const [mode, setMode] = useState('live_record'); // 'live_record' | 'upload' | 'text'
  const [lang, setLang] = useState('Hindi');
  const [loading, setLoading] = useState(false);
  const [catalogResult, setCatalogResult] = useState(null);

  // Live Speech Recognition Transcript & Text state
  const [liveTranscript, setLiveTranscript] = useState('');
  const [textDesc, setTextDesc] = useState('');

  // Audio Upload State
  const [uploadedAudioFile, setUploadedAudioFile] = useState(null);
  const fileInputRef = useRef(null);

  // Live Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  const { showToast } = useToast();

  // Language code mapping for browser SpeechRecognition API
  const langCodeMap = {
    Hindi: 'hi-IN',
    English: 'en-IN',
    Bengali: 'bn-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
    Marathi: 'mr-IN',
    Gujarati: 'gu-IN',
    Kannada: 'kn-IN',
    Odia: 'or-IN'
  };

  const sampleTemplates = [
    {
      title: 'Banarasi Saree',
      text: 'यह शुद्ध रेशम की बनारसी साड़ी है जिसमें ज़री का काम है। इसे बनाने में 45 घंटे लगे।',
      lang: 'Hindi'
    },
    {
      title: 'Blue Pottery Vase',
      text: 'हाथ से बना हुआ नीली मिट्टी का फूलदान, पारंपरिक जयपुरी कला, पुष्प पैटर्न।',
      lang: 'Hindi'
    },
    {
      title: 'Kashmiri Pashmina',
      text: 'Pure handwoven fine Pashmina wool shawl with intricate Sozni embroidery border.',
      lang: 'English'
    },
    {
      title: 'Teak Wood Carving',
      text: 'हाथ से तराशी हुई शीशम की नक्काशीदार लकड़ी की मूर्ति और सजावटी दीवार का फ्रेम।',
      lang: 'Hindi'
    }
  ];

  // Clean up recording stream and speech recognition on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // --- Live Recording with Speech-To-Text ---
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Live microphone recording is not supported in this browser.', 'error');
        return;
      }

      // 1. Start audio capture stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setRecordedBlob(null);
      setRecordedAudioUrl(null);
      setLiveTranscript('');

      // 2. Initialize Browser Real-Time Speech Recognition (Web Speech API)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langCodeMap[lang] || 'hi-IN';

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setLiveTranscript(currentTranscript.trim());
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition notice:', event.error);
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn('SpeechRecognition start notice:', e);
        }
      }

      // 3. Start Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      showToast(`Microphone live in ${lang}! Start speaking about your craft...`, 'info');
    } catch (err) {
      console.error('Microphone access error:', err);
      showToast('Microphone permission denied or device not found.', 'error');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    showToast('Voice note captured! You can review your transcription below.', 'success');
  };

  const resetRecording = () => {
    if (isRecording) stopRecording();
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setLiveTranscript('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  // --- Generate Catalog Handler ---
  const handleGenerate = async (e) => {
    e.preventDefault();

    let audioToSend = null;
    let textToSend = null;

    if (mode === 'live_record') {
      if (!recordedBlob && !liveTranscript.trim()) {
        showToast('Please record a voice note first by clicking the microphone button.', 'warning');
        return;
      }
      if (recordedBlob) {
        const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
        audioToSend = new File([recordedBlob], `live_voice_note.${ext}`, { type: recordedBlob.type });
      }
      // Also pass the live transcript so Gemini/backend has the exact speech text
      textToSend = liveTranscript.trim() || null;
    } else if (mode === 'upload') {
      if (!uploadedAudioFile) {
        showToast('Please select or upload an audio file.', 'warning');
        return;
      }
      audioToSend = uploadedAudioFile;
    } else if (mode === 'text') {
      if (!textDesc.trim()) {
        showToast('Please enter a description note in your language.', 'warning');
        return;
      }
      textToSend = textDesc.trim();
    }

    setLoading(true);
    try {
      const res = await generateCatalog({
        audioFile: audioToSend,
        textDesc: textToSend,
        lang
      });

      setCatalogResult(res);
      showToast('AI Multilingual Catalog generated successfully!', 'success');
      if (onCatalogGenerated) onCatalogGenerated(res);
    } catch (err) {
      showToast(err.message || 'Voice catalog generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'info');
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h4>Multilingual Voice & Text AI Catalog Generator</h4>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Speak in your native language. The AI converts your live speech to text in real-time and produces professional SEO-optimized e-commerce listings in English and Hindi.
        </p>
      </div>

      {/* Input Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          type="button"
          className={`btn ${mode === 'live_record' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setMode('live_record')}
        >
          <Mic size={16} />
          <span>🎙️ Live Voice Recording</span>
        </button>

        <button
          type="button"
          className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setMode('upload')}
        >
          <Upload size={16} />
          <span>Upload Audio File</span>
        </button>

        <button
          type="button"
          className={`btn ${mode === 'text' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setMode('text')}
        >
          <FileText size={16} />
          <span>Regional Text Note</span>
        </button>
      </div>

      {/* Language Selector */}
      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label htmlFor="cat-lang">Artisan Spoken / Written Language</label>
        <select
          id="cat-lang"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="auth-input"
          style={{ maxWidth: '320px' }}
        >
          <option value="Hindi">Hindi (हिंदी)</option>
          <option value="English">English</option>
          <option value="Bengali">Bengali (বাংলা)</option>
          <option value="Tamil">Tamil (தமிழ்)</option>
          <option value="Telugu">Telugu (తెలుగు)</option>
          <option value="Marathi">Marathi (मराठी)</option>
          <option value="Gujarati">Gujarati (ગુજરાતી)</option>
          <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
          <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
        </select>
      </div>

      {/* MODE 1: LIVE VOICE RECORDING WITH REAL-TIME TRANSCRIPTION */}
      {mode === 'live_record' && (
        <div className={`voice-recorder-card ${isRecording ? 'is-recording' : ''}`}>
          {/* Main Record / Stop Button */}
          {!isRecording ? (
            <button
              type="button"
              className="record-btn"
              onClick={startRecording}
              title="Click to start speaking"
            >
              <Mic size={36} />
            </button>
          ) : (
            <button
              type="button"
              className="record-btn recording"
              onClick={stopRecording}
              title="Click to stop recording"
            >
              <Square size={30} />
            </button>
          )}

          {/* Recording Status & Waveform */}
          <div>
            {isRecording ? (
              <div>
                <div className="recording-timer">{formatTimer(recordingSeconds)} / 01:00</div>
                <div className="waveform-bar-container">
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                </div>
                <p style={{ color: 'var(--error)', fontSize: '0.86rem', fontWeight: 600 }}>
                  🔴 Listening live in {lang}... Speak now and click the red square when done.
                </p>
              </div>
            ) : recordedAudioUrl ? (
              <div>
                <span className="badge badge-success badge-sm" style={{ marginBottom: '8px' }}>
                  ✓ Voice Note Captured ({formatTimer(recordingSeconds)})
                </span>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  You can listen to your recording or edit the transcribed speech below.
                </p>
              </div>
            ) : (
              <div>
                <h5 style={{ marginBottom: '4px' }}>Click Microphone & Speak in {lang}</h5>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Describe your craft name, materials (silk, wood, clay), colors, and techniques.
                </p>
              </div>
            )}
          </div>

          {/* Real-time Live Speech Transcript Box */}
          {(liveTranscript || isRecording) && (
            <div
              style={{
                marginTop: '20px',
                textAlign: 'left',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit3 size={14} />
                  <span>LIVE SPEECH-TO-TEXT TRANSCRIPT ({lang}):</span>
                </span>
                {isRecording && <span className="badge badge-warning badge-sm">Live Transcribing...</span>}
              </div>

              <textarea
                rows={3}
                className="auth-input"
                style={{ fontSize: '0.92rem', backgroundColor: 'var(--bg-surface-elevated)' }}
                value={liveTranscript}
                onChange={(e) => setLiveTranscript(e.target.value)}
                placeholder="Your spoken words will appear here in real-time..."
              />
            </div>
          )}

          {/* Audio Playback Player */}
          {recordedAudioUrl && !isRecording && (
            <div className="audio-player-wrapper">
              <audio controls src={recordedAudioUrl} style={{ width: '100%' }} />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={resetRecording}
                title="Discard and record again"
              >
                <RotateCcw size={14} />
                <span>Re-Record</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: UPLOAD AUDIO FILE */}
      {mode === 'upload' && (
        <div
          className="upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: '24px' }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setUploadedAudioFile(e.target.files[0])}
            accept="audio/*"
            style={{ display: 'none' }}
          />
          <Volume2 size={36} color="var(--primary)" style={{ marginBottom: '10px' }} />
          <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
            {uploadedAudioFile ? uploadedAudioFile.name : 'Click to select or drop an audio voice recording'}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Supports MP3, WAV, M4A, OGG, AAC voice notes
          </p>
        </div>
      )}

      {/* MODE 3: REGIONAL TEXT NOTE */}
      {mode === 'text' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              TRY PRESET SAMPLES:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {sampleTemplates.map((tpl) => (
                <button
                  key={tpl.title}
                  type="button"
                  className="filter-btn"
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-elevated)' }}
                  onClick={() => {
                    setTextDesc(tpl.text);
                    setLang(tpl.lang);
                  }}
                >
                  ✨ {tpl.title}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cat-desc">Artisan Regional Text Description</label>
            <textarea
              id="cat-desc"
              rows={4}
              className="auth-input"
              placeholder="Type what you made, materials used, size, colors, or production details in your language..."
              value={textDesc}
              onChange={(e) => setTextDesc(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        className="btn btn-primary btn-full"
        onClick={handleGenerate}
        disabled={loading || isRecording}
        style={{ marginBottom: '28px' }}
      >
        <Sparkles size={18} />
        <span>
          {loading
            ? 'AI Engine is Transcribing, Translating & Generating Catalog...'
            : 'Generate Multilingual Product Catalog with AI'}
        </span>
      </button>

      {/* Result Display */}
      {catalogResult && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h5 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={18} />
              <span>AI Bilingual Catalog Generated</span>
            </h5>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-info">{catalogResult.detected_language || lang}</span>
              <span className="badge badge-purple">{catalogResult.category || 'Handicrafts'}</span>
            </div>
          </div>

          {/* Raw transcription notice */}
          {catalogResult.raw_transcription && (
            <div style={{ marginBottom: '18px', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.84rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Transcribed Speech: </span>
              <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{catalogResult.raw_transcription}"</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* English Card */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>ENGLISH LISTING</strong>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => copyToClipboard(`${catalogResult.title_en}\n\n${catalogResult.description_en}`)}
                  title="Copy English content"
                >
                  <Copy size={13} />
                </button>
              </div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>{catalogResult.title_en}</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {catalogResult.description_en}
              </p>
            </div>

            {/* Hindi Card */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>हिंदी लिस्टिंग</strong>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => copyToClipboard(`${catalogResult.title_hi}\n\n${catalogResult.description_hi}`)}
                  title="Copy Hindi content"
                >
                  <Copy size={13} />
                </button>
              </div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>{catalogResult.title_hi}</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {catalogResult.description_hi}
              </p>
            </div>
          </div>

          {/* Metadata Extracted */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            {catalogResult.materials && catalogResult.materials.length > 0 && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Materials: </span>
                <strong>{catalogResult.materials.join(', ')}</strong>
              </div>
            )}
            {catalogResult.tags && catalogResult.tags.length > 0 && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>SEO Keywords: </span>
                {catalogResult.tags.map((t) => (
                  <span key={t} className="badge badge-sm badge-info" style={{ marginRight: 4 }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
