import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  AudioLines,
  BookOpen,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Hand,
  History,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Zap
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const PHRASES_DATA = {
  hello: {
    category: 'Greetings',
    en: 'Hello!',
    ne: 'नमस्कार!',
    ne_rom: 'Namaskar!',
    hi: 'नमस्ते!',
    instruction: 'Raise open dominant hand to head height, palm facing outward, and wave smoothly left and right.'
  },
  thank_you: {
    category: 'Politeness',
    en: 'Thank you!',
    ne: 'धन्यवाद!',
    ne_rom: 'Dhanyabad!',
    hi: 'धन्यवाद!',
    instruction: 'Touch the fingertips of your dominant hand to your chin, then extend the hand gently toward the recipient.'
  },
  welcome: {
    category: 'Politeness',
    en: 'You are welcome!',
    ne: 'स्वागत छ!',
    ne_rom: 'Swagat cha!',
    hi: 'आपका स्वागत है!',
    instruction: 'Extend both hands outward from chest height with palms upturned in a warm welcoming arc.'
  },
  sorry: {
    category: 'Politeness',
    en: 'I am sorry.',
    ne: 'माफ गर्नुहोस्।',
    ne_rom: 'Maaf garnuhos.',
    hi: 'मुझे माफ़ कीजिए।',
    instruction: 'Form a soft fist with thumb over fingers, place over center of chest, and make a gentle circular motion.'
  },
  help_me: {
    category: 'Emergency',
    en: 'Please help me.',
    ne: 'कृपया मलाई मद्दत गर्नुहोस्।',
    ne_rom: 'Kripaya malai maddat garnuhos.',
    hi: 'कृपया मेरी मदद करें।',
    instruction: 'Rest closed fist with thumb up on top of flat open palm of other hand and lift both slightly together.'
  },
  emergency_help: {
    category: 'Emergency',
    en: 'This is an emergency. Please help me!',
    ne: 'यो आपतकालीन अवस्था हो। कृपया मलाई मद्दत गर्नुहोस्!',
    ne_rom: 'Yo aapatkaalin awastha ho. Kripaya malai maddat garnuhos!',
    hi: 'यह आपातकाल है। कृपया मेरी मदद करें!',
    instruction: 'Cross both hands at the wrists or wave open hands repeatedly with urgent intent at chest height.'
  },
  how_are_you: {
    category: 'Greetings',
    en: 'How are you?',
    ne: 'तपाईंलाई कस्तो छ?',
    ne_rom: 'Tapailai kasto cha?',
    hi: 'आप कैसे हैं?',
    instruction: 'Point gently toward your partner, then rotate both cupped hands outward from chest level.'
  },
  yes: {
    category: 'Responses',
    en: 'Yes.',
    ne: 'हो।',
    ne_rom: 'Ho.',
    hi: 'हाँ।',
    instruction: 'Form a relaxed fist at chest level and nod the wrist up and down, mimicking an affirmative head nod.'
  },
  no: {
    category: 'Responses',
    en: 'No.',
    ne: 'होइन।',
    ne_rom: 'Hoina.',
    hi: 'नहीं।',
    instruction: 'Extend index and middle fingers together, then snap them down onto the thumb repeatedly in a crisp motion.'
  },
  water: {
    category: 'Needs',
    en: 'I need water.',
    ne: 'मलाई पानी चाहिन्छ।',
    ne_rom: 'Malai paani chaahincha.',
    hi: 'मुझे पानी चाहिए।',
    instruction: 'Form a "W" shape with index, middle, and ring fingers and lightly tap the index finger against your chin.'
  },
  goodbye: {
    category: 'Greetings',
    en: 'Goodbye!',
    ne: 'फेरि भेटौँला!',
    ne_rom: 'Pheri bhetaula!',
    hi: 'अलविदा!',
    instruction: 'Open hand held at shoulder height with fingers waving smoothly up and down towards the recipient.'
  }
};

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const pretty = s => (s || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Core system states
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'dictionary' | 'history' | 'settings'
  const [running, setRunning] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'tracking' | 'no_hand' | 'uncertain' | 'recognized'
  const [result, setResult] = useState(null);
  const [topPredictions, setTopPredictions] = useState([]);
  const [bufferFrames, setBufferFrames] = useState(0);
  const [requiredFrames, setRequiredFrames] = useState(30);
  const [handsDetected, setHandsDetected] = useState(0);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Settings & Preferences
  const [language, setLanguage] = useState('en'); // 'en' | 'ne' | 'hi'
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [soundFx, setSoundFx] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [history, setHistory] = useState([]);
  const [dictSearch, setDictSearch] = useState('');
  const [dictCategory, setDictCategory] = useState('All');

  // References for throttling & state sync
  const lastSpokenRef = useRef('');
  const lastSpeakAtRef = useRef(0);
  const inFlightRef = useRef(false);
  const latestLandmarksRef = useRef({});

  // Audio Context initialization helper
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playChime = (isEmergency = false) => {
    if (!soundFx) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      if (isEmergency) {
        // High alert siren tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Ascending harmonic chime (C5 -> E5 -> G5)
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.32);
        });
      }
    } catch {
      // Audio autoplay policy safety fallback
    }
  };

  // Check health and model status
  const checkBackendHealth = async () => {
    const startT = performance.now();
    try {
      const res = await fetch(`${API}/health`);
      if (res.ok) {
        const data = await res.json();
        setApiReady(true);
        setModelLoaded(Boolean(data.model_loaded));
        if (data.sequence_length) setRequiredFrames(data.sequence_length);
        setLatency(Math.round(performance.now() - startT));
        setError('');
      } else {
        setApiReady(false);
      }
    } catch {
      setApiReady(false);
      setError('Cannot connect to FastAPI backend at ' + API);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => () => stopCamera(), []);

  // Render Hand Landmarks onto Overlay Canvas
  const drawSkeleton = (landmarks) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showSkeleton || !landmarks) return;

    for (const [side, points] of Object.entries(landmarks)) {
      if (!points || points.length < 21) continue;
      const isLeft = side === 'left';
      const boneColor = isLeft ? 'rgba(56, 189, 248, 0.9)' : 'rgba(168, 85, 247, 0.9)';
      const jointColor = isLeft ? '#38bdf8' : '#a855f7';
      const tipColor = isLeft ? '#bae6fd' : '#e9d5ff';

      // Draw bones
      ctx.lineWidth = 3;
      ctx.strokeStyle = boneColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const [sIdx, eIdx] of HAND_CONNECTIONS) {
        const p1 = points[sIdx];
        const p2 = points[eIdx];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1[0] * canvas.width, p1[1] * canvas.height);
          ctx.lineTo(p2[0] * canvas.width, p2[1] * canvas.height);
          ctx.stroke();
        }
      }

      // Draw landmark nodes
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (!p) continue;
        const x = p[0] * canvas.width;
        const y = p[1] * canvas.height;
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 4.5 : (i === 0 ? 5.5 : 3.2);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isTip ? tipColor : jointColor;
        ctx.shadowColor = jointColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  };

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      setStatus('tracking');

      let frameCount = 0;
      let startT = performance.now();

      timerRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || inFlightRef.current || videoRef.current.readyState < 2) return;
        inFlightRef.current = true;
        const reqStart = performance.now();
        try {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          if (overlayCanvasRef.current) {
            overlayCanvasRef.current.width = video.videoWidth;
            overlayCanvasRef.current.height = video.videoHeight;
          }

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = canvas.toDataURL('image/jpeg', 0.72);

          const res = await fetch(`${API}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image,
              session_id: 'web-session',
              threshold: confidenceThreshold
            })
          });

          const data = await res.json();
          setLatency(Math.round(performance.now() - reqStart));
          setModelLoaded(Boolean(data.model_loaded));
          setStatus(data.status || 'tracking');
          setHandsDetected(data.hands_detected || 0);
          setBufferFrames(data.frames_ready || 0);

          if (data.landmarks) {
            latestLandmarksRef.current = data.landmarks;
            drawSkeleton(data.landmarks);
          } else {
            drawSkeleton(null);
          }

          if (data.top_predictions) {
            setTopPredictions(data.top_predictions);
          }

          if (data.recognized && data.phrase) {
            const phrase = data.phrase;
            const phraseInfo = PHRASES_DATA[phrase];
            setResult({
              phrase,
              confidence: data.confidence,
              translations: phraseInfo || null
            });

            const isEmergency = phrase.includes('emergency') || phrase.includes('help');
            playChime(isEmergency);

            const now = Date.now();
            if (autoSpeak && (lastSpokenRef.current !== phrase || now - lastSpeakAtRef.current > 4200)) {
              speakPhrase(phrase, language, speechRate, speechPitch);
              lastSpokenRef.current = phrase;
              lastSpeakAtRef.current = now;

              setHistory(old => [
                {
                  phrase,
                  at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  confidence: data.confidence,
                  translations: phraseInfo
                },
                ...old
              ].slice(0, 50));
            }
          }

          frameCount++;
          const elapsed = performance.now() - startT;
          if (elapsed >= 1000) {
            setFps(Math.round((frameCount * 1000) / elapsed));
            frameCount = 0;
            startT = performance.now();
          }
        } catch {
          setError('Lost connection to backend inference service.');
        } finally {
          inFlightRef.current = false;
        }
      }, 160);
    } catch (e) {
      setError(
        e.name === 'NotAllowedError'
          ? 'Camera permission denied. Please grant camera access in browser permissions.'
          : 'Could not access camera. Ensure your webcam is connected and the page is on localhost or HTTPS.'
      );
    }
  }

  function stopCamera() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
    setRunning(false);
    setStatus('idle');
    setBufferFrames(0);
    setHandsDetected(0);
    setFps(0);
  }

  async function resetPrediction() {
    setResult(null);
    setTopPredictions([]);
    setBufferFrames(0);
    lastSpokenRef.current = '';
    try {
      await fetch(`${API}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'web-session' })
      });
    } catch {}
  }

  function simulatePhrase(phraseKey) {
    const info = PHRASES_DATA[phraseKey];
    if (!info) return;
    const mockConf = 0.94;
    setResult({
      phrase: phraseKey,
      confidence: mockConf,
      translations: info
    });
    setTopPredictions([
      { phrase: phraseKey, confidence: mockConf },
      { phrase: 'welcome', confidence: 0.04 },
      { phrase: 'yes', confidence: 0.02 }
    ]);
    const isEmergency = phraseKey.includes('emergency') || phraseKey.includes('help');
    playChime(isEmergency);
    speakPhrase(phraseKey, language, speechRate, speechPitch);
    setHistory(old => [
      {
        phrase: phraseKey,
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        confidence: mockConf,
        translations: info
      },
      ...old
    ].slice(0, 50));
  }

  function speakPhrase(phrase, lang, rate = 0.95, pitch = 1.0) {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis is not supported by your browser.');
      return;
    }
    const item = PHRASES_DATA[phrase];
    const text = item ? (item[lang] || item.en) : pretty(phrase);

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langCodes = { en: 'en-US', ne: 'ne-NP', hi: 'hi-IN' };
    utterance.lang = langCodes[lang] || 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voices = window.speechSynthesis.getVoices();
    const prefix = utterance.lang.split('-')[0].toLowerCase();
    const matchedVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  }

  const handleCopyPhrase = () => {
    if (!result) return;
    const text = result.translations?.[language] || pretty(result.phrase);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportTranscript = (type = 'txt') => {
    if (!history.length) return;
    let content = '';
    let mime = 'text/plain';
    let filename = `signspeak-session-${new Date().toISOString().slice(0, 10)}`;

    if (type === 'json') {
      content = JSON.stringify(history, null, 2);
      mime = 'application/json';
      filename += '.json';
    } else {
      content = `SignSpeak AI Session Transcript\nGenerated: ${new Date().toLocaleString()}\n` +
        `Total Phrases: ${history.length}\n` +
        `--------------------------------------------------\n\n` +
        history.map((h, i) =>
          `[${h.at}] #${i + 1} | ${pretty(h.phrase)} (Conf: ${(h.confidence * 100).toFixed(1)}%)\n` +
          `  EN: ${h.translations?.en || ''}\n` +
          `  NE: ${h.translations?.ne || ''} (${h.translations?.ne_rom || ''})\n` +
          `  HI: ${h.translations?.hi || ''}\n`
        ).join('\n');
      filename += '.txt';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isEmergencyActive = result && (result.phrase.includes('emergency') || result.phrase.includes('help_me'));

  // Filter dictionary items
  const filteredPhrases = Object.entries(PHRASES_DATA).filter(([key, val]) => {
    const matchesCat = dictCategory === 'All' || val.category === dictCategory;
    const q = dictSearch.toLowerCase();
    const matchesSearch = !q || key.includes(q) || val.en.toLowerCase().includes(q) || val.ne.includes(q) || val.hi.includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className={`app-shell ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Top Professional App Header */}
      <header className="topbar">
        <div className="topbar-left">
          <a className="brand" href="#" onClick={e => { e.preventDefault(); setActiveTab('studio'); }}>
            <div className="brand-icon">
              <AudioLines size={22} />
            </div>
            <div className="brand-info">
              <div className="brand-title">
                SignSpeak<span className="brand-ai">AI</span>
                <span className="brand-badge">PROTOTYPE</span>
              </div>
              <small className="brand-subtitle">NSL Neural Sign-to-Speech Engine</small>
            </div>
          </a>

          {/* Navigation Tabs */}
          <nav className="nav-tabs">
            <button
              className={`nav-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
              onClick={() => setActiveTab('studio')}
            >
              <Activity size={16} /> Live Studio
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'dictionary' ? 'active' : ''}`}
              onClick={() => setActiveTab('dictionary')}
            >
              <BookOpen size={16} /> Sign Library
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} /> Transcript
              {history.length > 0 && <span className="tab-counter">{history.length}</span>}
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Sliders size={16} /> Diagnostics
            </button>
          </nav>
        </div>

        <div className="topbar-right">
          {/* Real-time System Indicators */}
          <div className="system-status-group">
            <div className={`status-tag ${apiReady ? 'status-green' : 'status-red'}`}>
              <span className="pulse-dot" />
              <span>{apiReady ? `API Online (${latency}ms)` : 'API Offline'}</span>
            </div>

            <div className={`status-tag ${modelLoaded ? 'status-green' : 'status-amber'}`}>
              <Layers size={13} />
              <span>{modelLoaded ? 'LSTM Model Active' : 'Model Untrained'}</span>
            </div>
          </div>

          <button
            className="icon-tool-btn"
            title={soundFx ? 'Mute Chimes' : 'Unmute Chimes'}
            onClick={() => setSoundFx(!soundFx)}
          >
            {soundFx ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          <button
            className="icon-tool-btn"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </header>

      {/* Main Content Area Based on Active Tab */}
      <main className="main-viewport">
        {activeTab === 'studio' && (
          <div className="studio-layout">
            {/* Left Vision & Sensor Stage */}
            <div className="vision-stage-card">
              <div className="stage-header">
                <div className="stage-title-wrap">
                  <span className="step-tag">STAGE 01</span>
                  <div>
                    <h3>Neural Vision Viewport</h3>
                    <p>Real-time MediaPipe Hand Mesh & Motion Trajectory</p>
                  </div>
                </div>

                <div className="stage-controls-right">
                  <button
                    className={`pill-toggle-btn ${showSkeleton ? 'active' : ''}`}
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    title="Toggle AR Skeleton Overlay"
                  >
                    {showSkeleton ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>AR Mesh</span>
                  </button>

                  <div className={`stage-state-pill ${running ? 'active' : ''}`}>
                    <span className="state-dot" />
                    <span>{running ? 'LIVE CAPTURE' : 'STANDBY'}</span>
                  </div>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="camera-viewport-frame">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={`camera-video ${running ? 'visible' : 'hidden'}`}
                />
                <canvas ref={canvasRef} className="hidden-source-canvas" />
                <canvas ref={overlayCanvasRef} className="ar-overlay-canvas" />

                {!running && (
                  <div className="viewport-placeholder">
                    <div className="placeholder-halo">
                      <Camera size={36} />
                    </div>
                    <h4>Camera Engine Idle</h4>
                    <p>
                      Click <b>Start Live Detection</b> to begin gesture capture.
                      <br />
                      Ensure good lighting, visible palms, and a clear background.
                    </p>
                  </div>
                )}

                {/* Live Overlays */}
                {running && (
                  <div className="hud-overlay-hud">
                    <div className="hud-badge top-left">
                      <span className="hud-live-tag">REC</span>
                      <span>{fps} FPS</span>
                      <span className="hud-divider">|</span>
                      <span>{latency} ms Latency</span>
                    </div>

                    <div className="hud-badge top-right">
                      <Hand size={14} />
                      <span>Hands: {handsDetected}/2 Tracked</span>
                    </div>

                    {/* Temporal Sequence Buffer Bar */}
                    <div className="hud-buffer-card">
                      <div className="buffer-info">
                        <span>LSTM TEMPORAL BUFFER</span>
                        <b>{bufferFrames} / {requiredFrames} Frames</b>
                      </div>
                      <div className="buffer-meter-track">
                        <div
                          className="buffer-meter-fill"
                          style={{ width: `${Math.min(100, Math.round((bufferFrames / requiredFrames) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Notification */}
              {error && (
                <div className="inline-alert alert-error">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Camera Action Toolbar */}
              <div className="camera-action-deck">
                {!running ? (
                  <button className="btn btn-primary" onClick={startCamera}>
                    <Camera size={17} /> Start Live Detection
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={stopCamera}>
                    <CameraOff size={17} /> Stop Camera
                  </button>
                )}

                <button className="btn btn-secondary" onClick={resetPrediction} title="Clear recognition window">
                  <RotateCcw size={16} /> Reset Buffer
                </button>

                {/* Quick Simulation Select for Live Testing */}
                <div className="quick-simulate-group">
                  <span className="simulate-label"><Zap size={14} /> Test:</span>
                  <select
                    className="quick-select"
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) {
                        simulatePhrase(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="" disabled>Simulate Sign...</option>
                    {Object.keys(PHRASES_DATA).map(k => (
                      <option key={k} value={k}>{pretty(k)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!modelLoaded && (
                <div className="inline-alert alert-warning">
                  <CircleHelp size={18} />
                  <div>
                    <b>Model Pipeline Notice:</b> The hand tracking engine is running, but the NSL temporal LSTM model is not trained yet.
                    Use the <i>ml/train_model.py</i> pipeline to train custom gestures, or test with the simulation picker.
                  </div>
                </div>
              )}
            </div>

            {/* Right Output & Speech Deck */}
            <div className="intelligence-deck">
              {/* Primary Translation Card */}
              <div className={`card translation-card ${isEmergencyActive ? 'emergency-mode-border' : ''}`}>
                <div className="card-header">
                  <div className="stage-title-wrap">
                    <span className="step-tag">STAGE 02</span>
                    <div>
                      <h3>Speech Intelligence</h3>
                      <p>Recognized Gesture Meaning & Pronunciation</p>
                    </div>
                  </div>
                  <Sparkles size={18} className="accent-icon" />
                </div>

                {/* Emergency High-Alert Banner */}
                {isEmergencyActive && (
                  <div className="emergency-alert-banner">
                    <AlertOctagon size={22} className="alert-pulse" />
                    <div>
                      <strong>EMERGENCY ASSISTANCE DETECTED</strong>
                      <p>Urgent request recognized. Immediate attention required.</p>
                    </div>
                  </div>
                )}

                <div className="translation-body">
                  <div className="status-label-row">
                    <span className="label-sub">CURRENT INTERPRETATION</span>
                    {result && (
                      <span className="category-pill">{result.translations?.category || 'General'}</span>
                    )}
                  </div>

                  {/* Big Recognized Output */}
                  <div className="primary-output-display">
                    {result ? (
                      <div className="recognized-title">{pretty(result.phrase)}</div>
                    ) : (
                      <div className="waiting-title">
                        {status === 'no_hand'
                          ? 'Position hands in front of camera'
                          : running
                          ? 'Awaiting gesture sequence…'
                          : 'Camera standing by'}
                      </div>
                    )}
                  </div>

                  {/* Trilingual Translation Display */}
                  <div className="multilang-translation-grid">
                    <div className={`lang-badge-box ${language === 'en' ? 'active' : ''}`}>
                      <span className="lang-code">🇬🇧 ENGLISH</span>
                      <div className="lang-text">{result ? (result.translations?.en || pretty(result.phrase)) : '—'}</div>
                    </div>

                    <div className={`lang-badge-box ${language === 'ne' ? 'active' : ''}`}>
                      <span className="lang-code">🇳🇵 नेपाली</span>
                      <div className="lang-text ne-font">{result ? (result.translations?.ne || '—') : '—'}</div>
                      {result?.translations?.ne_rom && (
                        <small className="rom-text">({result.translations.ne_rom})</small>
                      )}
                    </div>

                    <div className={`lang-badge-box ${language === 'hi' ? 'active' : ''}`}>
                      <span className="lang-code">🇮🇳 हिन्दी</span>
                      <div className="lang-text hi-font">{result ? (result.translations?.hi || '—') : '—'}</div>
                    </div>
                  </div>

                  {/* Neural Confidence Gauge */}
                  {result && (
                    <div className="confidence-assessment">
                      <div className="conf-label-row">
                        <span>Neural Model Confidence</span>
                        <b className={result.confidence >= 0.8 ? 'conf-high' : 'conf-mid'}>
                          {(result.confidence * 100).toFixed(1)}%
                        </b>
                      </div>
                      <div className="conf-progress-track">
                        <div
                          className={`conf-progress-fill ${result.confidence >= 0.8 ? 'fill-green' : 'fill-amber'}`}
                          style={{ width: `${Math.round(result.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Top-3 Candidates Matrix */}
                  {topPredictions.length > 0 && (
                    <div className="top-candidates-deck">
                      <span className="candidates-label">CANDIDATE PROBABILITY DISTRIBUTION</span>
                      <div className="candidates-list">
                        {topPredictions.map((pred, i) => (
                          <div className="candidate-row" key={pred.phrase}>
                            <span className="cand-rank">#{i + 1}</span>
                            <span className="cand-name">{pretty(pred.phrase)}</span>
                            <div className="cand-meter">
                              <div
                                className="cand-fill"
                                style={{ width: `${Math.round(pred.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="cand-pct">{(pred.confidence * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Translation Action Buttons */}
                  <div className="translation-action-row">
                    <button
                      className="btn btn-primary"
                      disabled={!result}
                      onClick={() => result && speakPhrase(result.phrase, language, speechRate, speechPitch)}
                    >
                      <Volume2 size={16} /> Speak Phrase
                    </button>

                    <button
                      className="btn btn-secondary"
                      disabled={!result}
                      onClick={handleCopyPhrase}
                    >
                      {copied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Voice Control Studio Section */}
                <div className="voice-controls-section">
                  <div className="field-group">
                    <label htmlFor="target-lang">
                      <Globe size={14} /> Spoken Target Language
                    </label>
                    <select
                      id="target-lang"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="form-control"
                    >
                      <option value="en">English (US)</option>
                      <option value="ne">नेपाली (Nepali)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>

                  <div className="toggle-control-row">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={autoSpeak}
                        onChange={e => setAutoSpeak(e.target.checked)}
                      />
                      <span className="slider-round" />
                    </label>
                    <div className="toggle-label-wrap">
                      <b>Auto-Voice Output</b>
                      <small>Speak immediately when a sign is verified</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sign Dictionary & Practice Guide Tab */}
        {activeTab === 'dictionary' && (
          <div className="dictionary-view">
            <div className="dictionary-hero">
              <div>
                <h2>Nepali Sign Language (NSL) Catalog</h2>
                <p>Interactive dictionary of trained vocabulary, gesture mechanics, and trilingual translations.</p>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="dict-toolbar">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search signs by name or translation..."
                    value={dictSearch}
                    onChange={e => setDictSearch(e.target.value)}
                  />
                  {dictSearch && (
                    <button className="clear-btn" onClick={() => setDictSearch('')}>×</button>
                  )}
                </div>

                <div className="category-filter-pills">
                  {['All', 'Greetings', 'Politeness', 'Needs', 'Responses', 'Emergency'].map(cat => (
                    <button
                      key={cat}
                      className={`filter-pill ${dictCategory === cat ? 'active' : ''}`}
                      onClick={() => setDictCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid of Sign Cards */}
            <div className="dict-grid">
              {filteredPhrases.map(([key, data]) => (
                <div className="dict-card" key={key}>
                  <div className="dict-card-head">
                    <span className="dict-category">{data.category}</span>
                    <button
                      className="dict-audio-btn"
                      title="Pronounce phrase"
                      onClick={() => speakPhrase(key, language, speechRate, speechPitch)}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  <h3 className="dict-sign-title">{pretty(key)}</h3>

                  <div className="dict-translations">
                    <div className="dict-trans-item">
                      <span className="d-label">EN:</span>
                      <span className="d-val">{data.en}</span>
                    </div>
                    <div className="dict-trans-item">
                      <span className="d-label">NE:</span>
                      <span className="d-val ne-font">{data.ne} <small>({data.ne_rom})</small></span>
                    </div>
                    <div className="dict-trans-item">
                      <span className="d-label">HI:</span>
                      <span className="d-val hi-font">{data.hi}</span>
                    </div>
                  </div>

                  <div className="dict-instruction">
                    <b>Gesture Mechanic:</b>
                    <p>{data.instruction}</p>
                  </div>

                  <div className="dict-card-footer">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        simulatePhrase(key);
                        setActiveTab('studio');
                      }}
                    >
                      <Play size={13} /> Test in Studio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History / Session Transcript Tab */}
        {activeTab === 'history' && (
          <div className="history-view">
            <div className="history-header">
              <div>
                <h2>Session Transcript</h2>
                <p>Complete timestamped log of recognized gestures and translations.</p>
              </div>

              <div className="history-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!history.length}
                  onClick={() => exportTranscript('txt')}
                >
                  <Download size={14} /> Export TXT
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={!history.length}
                  onClick={() => exportTranscript('json')}
                >
                  <Download size={14} /> Export JSON
                </button>
                <button
                  className="btn btn-danger-soft btn-sm"
                  disabled={!history.length}
                  onClick={() => setHistory([])}
                >
                  <Trash2 size={14} /> Clear Log
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="empty-history-state">
                <History size={42} className="empty-icon" />
                <h4>No Gestures Recognized Yet</h4>
                <p>Run the live camera or test signs from the Library to record transcript entries.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('studio')}>
                  Go to Live Studio
                </button>
              </div>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Recognized Sign</th>
                      <th>English</th>
                      <th>नेपाली (Nepali)</th>
                      <th>हिन्दी (Hindi)</th>
                      <th>Confidence</th>
                      <th>Audio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => (
                      <tr key={`${item.phrase}-${item.at}-${idx}`}>
                        <td className="time-col">{item.at}</td>
                        <td className="sign-col">
                          <b>{pretty(item.phrase)}</b>
                        </td>
                        <td>{item.translations?.en || pretty(item.phrase)}</td>
                        <td className="ne-font">{item.translations?.ne || '—'}</td>
                        <td className="hi-font">{item.translations?.hi || '—'}</td>
                        <td>
                          <span className={`conf-tag ${item.confidence >= 0.8 ? 'high' : 'mid'}`}>
                            {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td>
                          <button
                            className="table-play-btn"
                            title="Replay speech"
                            onClick={() => speakPhrase(item.phrase, language, speechRate, speechPitch)}
                          >
                            <Volume2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Diagnostics & Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-view">
            <div className="settings-grid">
              {/* Audio & Synthesizer Tuning */}
              <div className="card settings-card">
                <h3>Voice Synthesizer Studio</h3>
                <p className="card-sub">Fine-tune browser speech synthesis acoustics</p>

                <div className="setting-control">
                  <div className="slider-label-row">
                    <span>Speech Rate (Speed)</span>
                    <b>{speechRate}x</b>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.05"
                    value={speechRate}
                    onChange={e => setSpeechRate(parseFloat(e.target.value))}
                    className="slider-input"
                  />
                </div>

                <div className="setting-control">
                  <div className="slider-label-row">
                    <span>Voice Pitch</span>
                    <b>{speechPitch}x</b>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={speechPitch}
                    onChange={e => setSpeechPitch(parseFloat(e.target.value))}
                    className="slider-input"
                  />
                </div>

                <div className="setting-control">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => speakPhrase('hello', language, speechRate, speechPitch)}
                  >
                    <Volume2 size={15} /> Test Acoustic Output
                  </button>
                </div>
              </div>

              {/* Neural Recognition Parameters */}
              <div className="card settings-card">
                <h3>Recognition Model Calibration</h3>
                <p className="card-sub">Control inference threshold and model acceptance strictness</p>

                <div className="setting-control">
                  <div className="slider-label-row">
                    <span>Confidence Acceptance Threshold</span>
                    <b>{Math.round(confidenceThreshold * 100)}%</b>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={e => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="slider-input"
                  />
                  <small className="help-text">
                    Predictions below this probability will be marked as "Uncertain Sign" to prevent false positives.
                  </small>
                </div>

                <div className="setting-control">
                  <div className="slider-label-row">
                    <span>Temporal Sequence Length</span>
                    <b>{requiredFrames} Frames (~1.8 seconds)</b>
                  </div>
                  <small className="help-text">Fixed LSTM window configured on backend.</small>
                </div>
              </div>

              {/* System Diagnostics & Telemetry */}
              <div className="card settings-card full-width">
                <h3>System Telemetry & Architecture</h3>
                <div className="telemetry-grid">
                  <div className="telemetry-item">
                    <span className="tel-label">FASTAPI SERVER</span>
                    <span className="tel-val">{apiReady ? 'ONLINE' : 'UNREACHABLE'}</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="tel-label">INFERENCE LATENCY</span>
                    <span className="tel-val">{latency} ms</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="tel-label">FRAME CAPTURE RATE</span>
                    <span className="tel-val">{fps} FPS</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="tel-label">RECOGNITION MODEL</span>
                    <span className="tel-val">{modelLoaded ? 'sign_model.keras' : 'None'}</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="tel-label">VOCABULARY CLASSES</span>
                    <span className="tel-val">11 NSL Categories</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="tel-label">INPUT TOPOLOGY</span>
                    <span className="tel-val">126 Features (2x21x3D)</span>
                  </div>
                </div>

                <div className="telemetry-footer">
                  <button className="btn btn-secondary btn-sm" onClick={checkBackendHealth}>
                    <RotateCcw size={14} /> Refresh Health Ping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Professional Footer */}
      <footer className="footer-bar">
        <div className="footer-left">
          <div className="footer-brand">
            <AudioLines size={16} /> SignSpeak AI Neural Suite
          </div>
          <span className="footer-sep">•</span>
          <span>Privacy First: Video stays local; landmark arrays processed securely.</span>
        </div>
        <div className="footer-right">
          <span>Accessible Assistive Computing</span>
        </div>
      </footer>
    </div>
  );
}
