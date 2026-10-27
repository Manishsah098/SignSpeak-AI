import React, { useEffect, useRef, useState } from 'react';
import { Activity, AudioLines, Camera, CameraOff, CheckCircle2, CircleHelp, Languages, Mic2, RotateCcw, ShieldCheck, Sparkles, Volume2, Waves } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const phraseMap = {
  hello: {en:'Hello!', ne:'नमस्कार!', hi:'नमस्ते!'},
  thank_you: {en:'Thank you!', ne:'धन्यवाद!', hi:'धन्यवाद!'},
  welcome: {en:'You are welcome!', ne:'स्वागत छ!', hi:'आपका स्वागत है!'},
  sorry: {en:'I am sorry.', ne:'माफ गर्नुहोस्।', hi:'मुझे माफ़ कीजिए।'},
  help_me: {en:'Please help me.', ne:'कृपया मलाई मद्दत गर्नुहोस्।', hi:'कृपया मेरी मदद करें।'},
  emergency_help: {en:'This is an emergency. Please help me!', ne:'यो आपतकालीन अवस्था हो। कृपया मलाई मद्दत गर्नुहोस्!', hi:'यह आपातकाल है। कृपया मेरी मदद करें!'},
  how_are_you: {en:'How are you?', ne:'तपाईंलाई कस्तो छ?', hi:'आप कैसे हैं?'},
  yes: {en:'Yes.', ne:'हो।', hi:'हाँ।'},
  no: {en:'No.', ne:'होइन।', hi:'नहीं।'},
  water: {en:'I need water.', ne:'मलाई पानी चाहिन्छ।', hi:'मुझे पानी चाहिए।'},
  goodbye: {en:'Goodbye!', ne:'फेरि भेटौँला!', hi:'अलविदा!'}
};
const pretty = s => (s || '').replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase());

export default function App() {
  const videoRef = useRef(null), canvasRef = useRef(null), timerRef = useRef(null);
  const [running, setRunning] = useState(false), [apiReady, setApiReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false), [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null), [language, setLanguage] = useState('en');
  const [autoSpeak, setAutoSpeak] = useState(true), [history, setHistory] = useState([]);
  const [error, setError] = useState(''), [fps, setFps] = useState(0);
  const lastSpokenRef = useRef(''), lastSpeakAtRef = useRef(0), inFlightRef = useRef(false);

  useEffect(() => { fetch(`${API}/health`).then(r=>r.json()).then(d=>{setApiReady(true);setModelLoaded(d.model_loaded)}).catch(()=>setError('Backend not connected. Start the FastAPI server first.')); }, []);
  useEffect(() => () => { stopCamera(); }, []);

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:640},height:{ideal:480}},audio:false});
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setRunning(true); setStatus('tracking');
      let frames = 0, start = performance.now();
      timerRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || inFlightRef.current || videoRef.current.readyState < 2) return;
        inFlightRef.current = true;
        try {
          const canvas = canvasRef.current, video = videoRef.current;
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
          const image = canvas.toDataURL('image/jpeg',0.72);
          const res = await fetch(`${API}/predict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,session_id:'web-session'})});
          const data = await res.json();
          setModelLoaded(Boolean(data.model_loaded));
          setStatus(data.status || 'tracking');
          if (data.recognized && data.phrase) {
            const phrase = data.phrase;
            setResult({phrase,confidence:data.confidence, translations:phraseMap[phrase] || null});
            const now = Date.now();
            if (autoSpeak && (lastSpokenRef.current !== phrase || now-lastSpeakAtRef.current > 4500)) {
              speakPhrase(phrase, language);
              lastSpokenRef.current = phrase; lastSpeakAtRef.current = now;
              setHistory(old => [{phrase,at:new Date().toLocaleTimeString(),confidence:data.confidence},...old].slice(0,8));
            }
          }
          frames++;
          const elapsed = performance.now()-start;
          if (elapsed >= 1000) { setFps(Math.round(frames*1000/elapsed)); frames=0; start=performance.now(); }
        } catch { setError('Lost connection to the AI backend.'); }
        finally { inFlightRef.current = false; }
      }, 180);
    } catch(e) { setError(e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access and try again.':'Could not open camera. Use HTTPS or localhost and check your camera.'); }
  }
  function stopCamera() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach(t=>t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }
  async function resetPrediction() {
    setResult(null); setStatus('tracking'); lastSpokenRef.current='';
    try { await fetch(`${API}/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:'web-session'})}); } catch {}
  }
  function speakPhrase(phrase, lang) {
    const text = phraseMap[phrase]?.[lang] || phraseMap[phrase]?.en || pretty(phrase);
    if (!('speechSynthesis' in window)) { setError('Speech synthesis is not supported by this browser.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ({en:'en-US',ne:'ne-NP',hi:'hi-IN'})[lang] || 'en-US';
    utterance.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const prefix = utterance.lang.split('-')[0];
    const voice = voices.find(v=>v.lang.toLowerCase().startsWith(prefix));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }
  const phraseText = result ? (result.translations?.[language] || pretty(result.phrase)) : 'Waiting for a sign…';
  const statusLabel = !apiReady ? 'Backend offline' : !modelLoaded ? 'Model not trained' : status==='recognized' ? 'Sign recognized' : status==='uncertain' ? 'Uncertain sign' : status==='no_hand' ? 'Show your hands' : 'Live tracking';

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon"><AudioLines size={23}/></span><span>SignSpeak<span className="brand-ai"> AI</span><small>COMMUNICATION WITHOUT BARRIERS</small></span></a>
      <div className="top-right"><span className="secure"><ShieldCheck size={15}/> Privacy-first prototype</span><span className="live-dot">{running?'LIVE':'READY'}</span></div>
    </header>
    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> REAL-TIME SIGN LANGUAGE ASSISTANT</div>
        <h1>Your signs.<br/><span>Your voice.</span></h1>
        <p className="hero-copy">Turn recognized Nepali Sign Language gestures into spoken communication in English, नेपाली, or हिन्दी.</p>
        <div className="hero-chips"><span><Activity size={15}/> Live gesture tracking</span><span><Waves size={15}/> Voice output</span><span><Languages size={15}/> 3 languages</span></div>
      </section>

      <section className="workspace">
        <div className="camera-panel panel">
          <div className="panel-heading"><div><span className="step">01</span><div><h2>Live camera</h2><p>Position your hands clearly in the frame</p></div></div><span className={`status-pill ${modelLoaded?'ready':''}`}><i/>{statusLabel}</span></div>
          <div className="camera-stage">
            <video ref={videoRef} muted playsInline className={running?'video-visible':'video-hidden'}/>
            <canvas ref={canvasRef} className="hidden-canvas"/>
            {!running && <div className="camera-placeholder"><div className="camera-orb"><Camera size={34}/></div><strong>Your camera preview appears here</strong><span>Good lighting · Hands fully visible · Plain background</span></div>}
            {running && <div className="camera-overlay"><span><i className="live-dot-small"/> CAMERA ACTIVE</span><span>{fps} FPS</span></div>}
          </div>
          {error && <div className="error-msg"><CircleHelp size={16}/>{error}</div>}
          <div className="camera-actions">
            {!running ? <button className="primary-btn" onClick={startCamera}><Camera size={17}/> Start live detection</button> : <button className="primary-btn stop-btn" onClick={stopCamera}><CameraOff size={17}/> Stop camera</button>}
            <button className="secondary-btn" onClick={resetPrediction}><RotateCcw size={16}/> Reset</button>
          </div>
          {!modelLoaded && <div className="training-note"><CircleHelp size={17}/><span><b>Recognition model not installed.</b> The camera interface can run, but phrase recognition stays disabled until you collect NSL examples and train the model.</span></div>}
        </div>

        <div className="output-column">
          <div className="panel result-panel">
            <div className="panel-heading"><div><span className="step">02</span><div><h2>Detected meaning</h2><p>Translated phrase and confidence</p></div></div><span className="sparkle-mark"><Sparkles size={19}/></span></div>
            <div className="result-content">
              <div className="result-icon"><AudioLines size={25}/></div>
              <div className="result-label">{result ? 'RECOGNIZED SIGN' : 'TRANSLATION OUTPUT'}</div>
              <div className="result-text">{phraseText}</div>
              {result ? <div className="confidence"><span>Model confidence</span><b>{Math.round((result.confidence||0)*100)}%</b><div className="confidence-track"><i style={{width:`${Math.round((result.confidence||0)*100)}%`}}/></div></div> : <p className="result-hint">{modelLoaded ? 'Make a supported sign and hold the movement clearly.' : 'Your recognized phrase will appear here after a trained model is loaded.'}</p>}
            </div>
            <div className="result-controls">
              <label className="field-label" htmlFor="language">Spoken language</label>
              <select id="language" value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="ne">नेपाली (Nepali)</option><option value="hi">हिन्दी (Hindi)</option></select>
              <label className="toggle-row"><span><Volume2 size={17}/> Auto-speak recognized signs</span><input type="checkbox" checked={autoSpeak} onChange={e=>setAutoSpeak(e.target.checked)}/><i/></label>
              <button className="speak-btn" disabled={!result} onClick={()=>result&&speakPhrase(result.phrase,language)}><Volume2 size={17}/> Speak phrase</button>
            </div>
          </div>
          <div className="panel history-panel">
            <div className="panel-heading"><div><span className="step">03</span><div><h2>Recent signs</h2><p>This session only</p></div></div><CheckCircle2 className="history-check" size={19}/></div>
            {history.length ? <div className="history-list">{history.map((item,i)=><div className="history-item" key={`${item.phrase}-${item.at}-${i}`}><span className="history-number">{String(i+1).padStart(2,'0')}</span><span className="history-phrase">{pretty(item.phrase)}</span><span className="history-time">{item.at}</span></div>)}</div> : <div className="empty-history">Recognized signs will be listed here.</div>}
          </div>
        </div>
      </section>

      <section className="phrase-section">
        <div className="section-heading"><div><span className="eyebrow">DESIGNED FOR EVERYDAY NEEDS</span><h2>Useful phrases to train</h2></div><p>These are target labels, not signs recognized out of the box.</p></div>
        <div className="phrase-grid">{Object.entries(phraseMap).map(([key,translations])=><div className="phrase-card" key={key}><span className="phrase-icon"><Mic2 size={18}/></span><div><b>{pretty(key)}</b><span>{translations.en}</span></div><span className="not-trained">Train</span></div>)}</div>
      </section>
      <footer><div className="footer-brand"><AudioLines size={18}/> SignSpeak AI</div><p>Assistive prototype · Recognition requires a validated NSL dataset and trained model.</p><span>Built for more accessible communication</span></footer>
    </main>
  </div>;
}
