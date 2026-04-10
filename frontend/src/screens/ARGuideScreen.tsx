import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, MapPin, Navigation, Volume2, VolumeX, Mic, Send, Image as ImageIcon, RefreshCw, ChevronRight } from 'lucide-react';
import { aiAPI } from '../services/api';
import { Place, Itinerary, User } from '../types/index';
import { Button } from '../components/ui';

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

export const ARGuideScreen: React.FC<ARGuideScreenProps> = ({ onBack, user, t, lang, nearbyPlaces, itineraryPlaces }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [arData, setArData] = useState<ARResponse | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const analysisInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (analysisInterval.current) clearInterval(analysisInterval.current);
    };
  }, []);

  // Attach stream to video element whenever stream or ref changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleVideoLoad = () => {
    startAnalysisLoop();
  };

  const startCamera = async () => {
    try {
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      } catch (envError) {
        console.log("Environment camera not found, trying default", envError);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startAnalysisLoop = () => {
    if (analysisInterval.current) clearInterval(analysisInterval.current);

    // Analyze every 2 seconds for better responsiveness
    analysisInterval.current = setInterval(() => {
      if (!analyzing) {
        captureAndAnalyze();
      }
    }, 2000);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Ensure video has dimensions
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

    setAnalyzing(true);

    // Draw video frame to canvas with resizing for performance
    const context = canvasRef.current.getContext('2d');
    if (context) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      // Scale down to max 512px dimension to speed up upload and inference
      const MAX_SIZE = 512;
      let drawWidth = videoWidth;
      let drawHeight = videoHeight;

      if (videoWidth > MAX_SIZE || videoHeight > MAX_SIZE) {
        if (videoWidth > videoHeight) {
          drawWidth = MAX_SIZE;
          drawHeight = (videoHeight / videoWidth) * MAX_SIZE;
        } else {
          drawHeight = MAX_SIZE;
          drawWidth = (videoWidth / videoHeight) * MAX_SIZE;
        }
      }

      canvasRef.current.width = drawWidth;
      canvasRef.current.height = drawHeight;
      context.drawImage(videoRef.current, 0, 0, drawWidth, drawHeight);

      // Use lower quality for faster transmission
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];

      try {
        await analyzeImage(imageData);
      } catch (err) {
        console.error("Analysis failed:", err);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const analyzeImage = async (base64Image: string) => {
    // Mock location for context (Riyadh) if real geolocation isn't available/mocked
    const mockLat = 24.7136;
    const mockLng = 46.6753;

    const promptText = `
      You are an expert AR Tour Guide. The user is pointing their camera at a landmark.
      
      Context:
      - User Language: ${lang}
      - Approximate Location: Lat ${mockLat}, Lng ${mockLng} (Riyadh, Saudi Arabia)
      - User Preferences: ${JSON.stringify(user.preferences || {})}
      - Nearby Known Places: ${JSON.stringify(nearbyPlaces.map(p => p.name))}
      - Itinerary Places: ${JSON.stringify(itineraryPlaces.map(p => p.name))}

      Task:
      1. Identify the MAIN place/monument in the image.
      2. Provide a concise on-screen description.
      3. Write a natural, engaging voice script (20-40 seconds) suitable for TTS.
      4. Suggest 1-2 nearby places to visit next (prioritize itinerary places).
      5. Provide a bounding box [ymin, xmin, ymax, xmax] (0-1000 scale) for the identified object.

      Output JSON format ONLY:
      {
        "identified": boolean,
        "name": "Place Name",
        "shortDescription": "Concise text for screen...",
        "voiceScript": "Natural speech text...",
        "confidence": "high" | "medium" | "low",
        "boundingBox": { "ymin": 0, "xmin": 0, "ymax": 0, "xmax": 0 },
        "suggestedPlaces": [
           { "name": "Place Name", "reason": "Why go here...", "lat": 0, "lng": 0 }
        ]
      }
    `;

    try {
      const response = await aiAPI.generateContent(promptText, undefined, base64Image);

      if (response.text) {
        // Find JSON block or parse directly
        let jsonStr = response.text;
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        
        const data = JSON.parse(jsonStr) as ARResponse;
        // Only update if we found something or if we previously had nothing
        if (data.identified || !arData) {
          setArData(data);
        }
      }
    } catch (err) {
      console.error("Gemini Analysis Error:", err);
      // Don't set global error to avoid blocking the view, just log it
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !arData) return;

    const newMessages = [...messages, { role: 'user' as const, text: inputMessage }];
    setMessages(newMessages);
    setInputMessage('');

    // Call Gemini for Q&A
    const prompt = `
      You are an AR Guide discussing "${arData.name}".
      User asked: "${inputMessage}"
      Answer briefly and naturally in ${lang}.
    `;

    try {
      const response = await aiAPI.generateContent(prompt);

      if (response.text) {
        setMessages([...newMessages, { role: 'model', text: response.text }]);
      }
    } catch (err) {
      console.error("Chat failed", err);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      utterance.onend = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startNavigation = (lat?: number, lng?: number, query?: string) => {
    let url = '';
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else if (query) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onBack} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
          <MapPin className="w-3 h-3 text-emerald-400" />
          <span className="text-xs font-medium text-white">Riyadh, SA</span>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleVideoLoad}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50">
            {error || "Starting Camera..."}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Badge */}
        <div className="absolute top-4 left-4 bg-red-500/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1.5 animate-pulse z-10">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          LIVE
        </div>

        {/* AR Overlay - Bounding Box & Label */}
        {arData && arData.boundingBox && arData.identified && (
          <div
            className="absolute transition-all duration-500 ease-out"
            style={{
              top: `${arData.boundingBox.ymin / 10}%`,
              left: `${arData.boundingBox.xmin / 10}%`,
              height: `${(arData.boundingBox.ymax - arData.boundingBox.ymin) / 10}%`,
              width: `${(arData.boundingBox.xmax - arData.boundingBox.xmin) / 10}%`,
            }}
          >
            {/* Pulsating Border */}
            <div className="absolute inset-0 border-2 border-emerald-400 rounded-lg shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-pulse" />

            {/* Corner Brackets for Viewfinder Look */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-lg" />

            {/* Label Tag */}
            <div className="absolute -top-12 left-0 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 border border-emerald-400">
              <div className="w-2 h-2 bg-white rounded-full animate-ping absolute opacity-75" />
              <div className="w-2 h-2 bg-white rounded-full relative" />
              {arData.name}
            </div>
          </div>
        )}

        {/* Scanning Indicator (when analyzing but no box yet) */}
        {analyzing && !arData?.boundingBox && (
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white tracking-wider">SCANNING</span>
          </div>
        )}
      </div>

      {/* Controls & Results */}
      <div className={`bg-white rounded-t-[30px] transition-all duration-500 ease-spring ${arData ? 'h-[60%]' : 'h-0 overflow-hidden'}`}>
        {arData && (
          <div className="h-full flex flex-col p-6">
            {/* Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{arData.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">{arData.identified ? 'Identified Landmark' : 'Uncertain Match'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => speak(arData.voiceScript)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-slate-700 leading-relaxed text-sm">{arData.shortDescription}</p>
              </div>

              {/* Chat Interface */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Ask the Guide</h3>

                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about history, height, etc..."
                    className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0 active:scale-95"
                  >
                    <Send className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </div>

              {/* Recommendations */}
              {arData.suggestedPlaces && arData.suggestedPlaces.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Nearby & Next</h3>
                  <div className="space-y-2">
                    {arData.suggestedPlaces.map((place, idx) => (
                      <button
                        key={idx}
                        onClick={() => startNavigation(place.lat, place.lng, place.name)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 shadow-sm rounded-xl active:bg-slate-50 text-left rtl:text-right"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                            <Navigation className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{place.name}</p>
                            <p className="text-[10px] text-slate-500">{place.reason}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 rtl:rotate-180" />
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
