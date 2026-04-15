import React, {
  useState, useRef, useEffect, useCallback, useId,
} from 'react';
import {
  Camera, X, MapPin, Navigation, Volume2, VolumeX,
  Send, RefreshCw, ChevronRight, ScanLine,
} from 'lucide-react';
import { aiAPI } from '../services/api';
import { Place, User } from '../types/index';
// FIX #11 — removed unused Mic import
// FIX #12 — removed unused Itinerary import

interface ARGuideScreenProps {
  onBack: () => void;
  user: User;
  t: any;
  lang: 'en' | 'ar';
  nearbyPlaces: Place[];
  itineraryPlaces: Place[];
}

interface ARResponse {
  identified: boolean;
  name: string;
  shortDescription: string;
  voiceScript: string;
  confidence: 'high' | 'medium' | 'low';
  disambiguationQuestion?: string;
  suggestedPlaces?: { name: string; reason: string; lat?: number; lng?: number }[];
  boundingBox?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

interface ChatMessage {
  id: string;    // FIX #9 — stable key, not array index
  role: 'user' | 'model';
  text: string;
}

// ── Pure helpers (module-level — never recreated) ─────────────────────────────

// FIX #10 — robust JSON extraction with 3 fallback strategies
function extractJSON(raw: string): any {
  // Strategy 1: fenced code block
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1].trim());
  // Strategy 2: first {...} block
  const braceStart = raw.indexOf('{');
  const braceEnd = raw.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart)
    return JSON.parse(raw.slice(braceStart, braceEnd + 1));
  // Strategy 3: raw (may throw — caller handles it)
  return JSON.parse(raw.trim());
}

// ── Component ─────────────────────────────────────────────────────────────────
export const ARGuideScreen: React.FC<ARGuideScreenProps> = ({
  onBack, user, t, lang, nearbyPlaces, itineraryPlaces,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [arData, setArData] = useState<ARResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);    // FIX #8 — auto-scroll anchor
  const analysisInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);                   // FIX #5 — unmount guard

  // FIX #1 — stream stored in ref so stopCamera always sees the live value
  const streamRef = useRef<MediaStream | null>(null);

  // FIX #7 — sync flags for interval callback (avoid reading React state in timers)
  const isAnalyzingRef = useRef(false);
  const isIdentifiedRef = useRef(false);

  // FIX #4 — concurrent send guard
  const isSendingRef = useRef(false);

  // FIX #9 — stable id prefix
  const idBase = useId();
  const nextId = useRef(0);
  const makeId = () => `${idBase}-${nextId.current++}`;

  // ── Camera lifecycle ────────────────────────────────────────────────────────

  // FIX #1 — stopCamera reads from ref, not stale closure
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (isMountedRef.current) setStream(null);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = mediaStream;  // FIX #1 — store in ref immediately
      if (isMountedRef.current) { setStream(mediaStream); setError(null); }
    } catch (err) {
      console.error('Camera error:', err);
      if (isMountedRef.current) setError('Could not access camera. Please check permissions.');
    }
  }, []);

  // Mount / unmount
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      stopCamera();
      if (analysisInterval.current) clearInterval(analysisInterval.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [startCamera, stopCamera]);

  // Attach stream to video element
  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // FIX #8 — auto-scroll chat to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Analysis loop ──────────────────────────────────────────────────────────

  // FIX #7 — interval reads refs (sync), never React state
  const startAnalysisLoop = useCallback(() => {
    if (analysisInterval.current) clearInterval(analysisInterval.current);
    analysisInterval.current = setInterval(() => {
      if (!isAnalyzingRef.current && !isIdentifiedRef.current) {
        captureAndAnalyze();
      }
    }, 2500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // FIX #14 + #15 — stable callback, safe to pass as onLoadedMetadata
  const handleVideoLoad = useCallback(() => {
    startAnalysisLoop();
  }, [startAnalysisLoop]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const { videoWidth, videoHeight } = videoRef.current;
    if (videoWidth === 0 || videoHeight === 0) return;

    isAnalyzingRef.current = true;  // FIX #7
    setAnalyzing(true);

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) { isAnalyzingRef.current = false; setAnalyzing(false); return; }

    const MAX = 512;
    const scale = Math.min(MAX / videoWidth, MAX / videoHeight, 1);
    const drawWidth = Math.round(videoWidth * scale);
    const drawHeight = Math.round(videoHeight * scale);

    canvasRef.current.width = drawWidth;
    canvasRef.current.height = drawHeight;
    ctx.drawImage(videoRef.current, 0, 0, drawWidth, drawHeight);

    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];

    try {
      await analyzeImage(imageData);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      isAnalyzingRef.current = false;  // FIX #7
      if (isMountedRef.current) setAnalyzing(false);
    }
  };

  const analyzeImage = async (base64Image: string) => {
    const promptText = `
      You are an expert AR Tour Guide. The user is pointing their camera at a landmark in Saudi Arabia.
      Respond ENTIRELY in ${lang === 'ar' ? 'Arabic' : 'English'}.
      
      Tasks:
      1. Identify the MAIN place/monument in the image.
      2. Provide a concise on-screen description.
      3. Write a natural, engaging voice script (20-40 seconds) for TTS.
      4. Suggest 1-2 nearby places to visit next.
      5. Provide a bounding box [ymin, xmin, ymax, xmax] (0-1000 scale).

      Output strict JSON only — no markdown, no extra text:
      {
        "identified": boolean,
        "name": "Place Name",
        "shortDescription": "...",
        "voiceScript": "...",
        "confidence": "high" | "medium" | "low",
        "boundingBox": { "ymin": 0, "xmin": 0, "ymax": 0, "xmax": 0 },
        "suggestedPlaces": [{ "name": "...", "reason": "...", "lat": 0, "lng": 0 }]
      }
    `;

    const response = await aiAPI.generateContent(promptText, undefined, base64Image);
    if (!response?.text) return;

    try {
      // FIX #10 — robust multi-strategy JSON extraction
      const data = extractJSON(response.text) as ARResponse;
      if (data.identified && isMountedRef.current) {
        isIdentifiedRef.current = true;  // FIX #7 — stop the interval from re-scanning
        setArData(data);
        speak(data.voiceScript);
      }
    } catch (err) {
      console.warn('JSON parse failed for AR response:', err);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  // FIX #3 — correct toggle: cancel only when stopping, not always
  // FIX #5 — onend guarded by isMountedRef
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel(); // clear any orphaned speech before starting
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.onend = () => { if (isMountedRef.current) setIsPlaying(false); }; // FIX #5
    utterance.onerror = () => { if (isMountedRef.current) setIsPlaying(false); };
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, [isPlaying, lang]);

  // FIX #4 — concurrent send guard
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !arData || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', text: inputMessage.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');

    const prompt = `
      You are an AR Guide discussing "${arData.name}".
      User asked: "${userMsg.text}"
      Answer briefly and naturally in ${lang === 'ar' ? 'Arabic' : 'English'}.
    `;

    try {
      const response = await aiAPI.generateContent(prompt);
      if (response?.text && isMountedRef.current) {
        const modelMsg: ChatMessage = { id: makeId(), role: 'model', text: response.text };
        setMessages(prev => [...prev, modelMsg]);
      }
    } catch (err) {
      console.error('Chat failed:', err);
    } finally {
      isSendingRef.current = false;
    }
  }, [inputMessage, arData, lang]);

  const handleRescan = useCallback(() => {
    isIdentifiedRef.current = false;  // FIX #7 — re-enable scanning
    setArData(null);
    setMessages([]);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const startNavigation = useCallback((lat?: number, lng?: number, query?: string) => {
    const url = (lat && lng)
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : query
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        : '';
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  }, [handleSendMessage]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        {/* FIX #16 — aria-label on close button */}
        <button
          onClick={onBack}
          className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={lang === 'ar' ? 'رجوع' : 'Go back'}
        >
          <X className="w-6 h-6" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
          <MapPin className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          <span className="text-xs font-medium text-white">
            {lang === 'ar' ? 'الواقع المعزز' : 'AR Scanner'}
          </span>
        </div>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleVideoLoad}  // FIX #14 — stable callback
            className="w-full h-full object-cover"
            aria-label="Camera view"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
            {error || (lang === 'ar' ? 'جاري تشغيل الكاميرا...' : 'Starting Camera...')}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {/* LIVE badge */}
        <div
          className="absolute top-4 left-4 bg-red-500/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1.5 animate-pulse z-10"
          aria-live="polite"
          aria-label="Live camera feed"
        >
          <div className="w-1.5 h-1.5 bg-white rounded-full" aria-hidden="true" />
          LIVE
        </div>

        {/* Rescan button */}
        {arData?.identified && (
          <button
            onClick={handleRescan}
            className="absolute top-4 left-20 bg-black/50 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5 z-10 hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={lang === 'ar' ? 'مسح معلم جديد' : 'Scan a new landmark'}
          >
            <ScanLine className="w-3 h-3 text-emerald-400" aria-hidden="true" />
            {lang === 'ar' ? 'مسح جديد' : 'Scan New'}
          </button>
        )}

        {/* AR bounding box overlay */}
        {arData?.identified && arData.boundingBox && (
          <div
            className="absolute transition-all duration-500 ease-out"
            style={{
              top: `${Math.max(0, arData.boundingBox.ymin / 10)}%`,
              left: `${Math.max(0, arData.boundingBox.xmin / 10)}%`,
              height: `${(arData.boundingBox.ymax - arData.boundingBox.ymin) / 10}%`,
              width: `${(arData.boundingBox.xmax - arData.boundingBox.xmin) / 10}%`,
            }}
            role="img"
            aria-label={`Identified: ${arData.name}`}
          >
            <div className="absolute inset-0 border-2 border-emerald-400 rounded-lg shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-pulse" />
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-lg" />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 whitespace-nowrap border border-emerald-400">
              {arData.name}
            </div>
          </div>
        )}

        {/* Scanning indicator */}
        {analyzing && !arData?.identified && (
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 shadow-xl z-20"
            role="status"
            aria-live="polite"
          >
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" aria-hidden="true" />
            <span className="text-xs font-bold text-white tracking-wider">
              {lang === 'ar' ? 'جاري المسح...' : 'SCANNING...'}
            </span>
          </div>
        )}
      </div>

      {/* Results panel — FIX #13: ease-spring → ease-out (valid Tailwind) */}
      <div className={`bg-white rounded-t-[30px] transition-all duration-500 ease-out ${arData ? 'h-[60%]' : 'h-0 overflow-hidden'}`}>
        {arData && (
          <div className="h-full flex flex-col p-6">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" aria-hidden="true" />

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-6">

              {/* Header row */}
              <div className="flex justify-between items-start">
                <div className="pr-2">
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{arData.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    {lang === 'ar' ? 'تم التعرف على المعلم' : 'Identified Landmark'}
                  </p>
                </div>
                {/* FIX #17 — aria-label on volume toggle */}
                <button
                  onClick={() => speak(arData.voiceScript)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isPlaying ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}
                  aria-label={isPlaying
                    ? (lang === 'ar' ? 'إيقاف الصوت' : 'Stop audio')
                    : (lang === 'ar' ? 'تشغيل الصوت' : 'Play audio')}
                >
                  {isPlaying
                    ? <VolumeX className="w-5 h-5" aria-hidden="true" />
                    : <Volume2 className="w-5 h-5" aria-hidden="true" />}
                </button>
              </div>

              {/* Description */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-slate-700 leading-relaxed text-sm">{arData.shortDescription}</p>
              </div>

              {/* Chat */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {lang === 'ar' ? 'اسأل المرشد' : 'Ask the Guide'}
                </h3>

                <div className="space-y-3 max-h-40 overflow-y-auto pr-1" role="log" aria-live="polite" aria-label="Chat with guide">
                  {/* FIX #9 — stable id keys */}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {/* FIX #8 — auto-scroll anchor */}
                  <div ref={chatBottomRef} aria-hidden="true" />
                </div>

                <div className="flex gap-2">
                  {/* FIX #18 — aria-label on input */}
                  <input
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={lang === 'ar' ? 'اسأل عن التاريخ، العمر، إلخ...' : 'Ask about history, age, etc...'}
                    className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    aria-label={lang === 'ar' ? 'سؤالك للمرشد' : 'Ask the guide a question'}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSendingRef.current}
                    className="w-11 h-11 bg-emerald-600 disabled:bg-emerald-600/50 rounded-xl flex items-center justify-center text-white shrink-0 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-label={lang === 'ar' ? 'إرسال' : 'Send message'}
                  >
                    <Send className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Nearby suggestions */}
              {arData.suggestedPlaces && arData.suggestedPlaces.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                    {lang === 'ar' ? 'أماكن قريبة مقترحة' : 'Nearby & Next'}
                  </h3>
                  <div className="space-y-2">
                    {/* FIX #19 — aria-label on nav buttons */}
                    {arData.suggestedPlaces.map((place, idx) => (
                      <button
                        key={`${place.name}-${idx}`}
                        onClick={() => startNavigation(place.lat, place.lng, place.name)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 shadow-sm rounded-xl active:bg-slate-50 text-left rtl:text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        aria-label={`${lang === 'ar' ? 'الانتقال إلى' : 'Navigate to'} ${place.name}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-orange-600">
                            <Navigation className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{place.name}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{place.reason}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 rtl:rotate-180 shrink-0" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};