import React, { useEffect, useState, useRef } from 'react';
import { Compass, ChevronRight, MapPin } from 'lucide-react';

// Saudi Arabia iconic landmarks slideshow
// Replace any URL with a higher-res photo of your choice
const LANDMARKS = [
  {
    name: 'Burj Al Mamlaka',
    city: 'Riyadh',
    url: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=900&q=85&fit=crop',
  },
  {
    name: 'Hegra (Mada\'in Saleh)',
    city: 'AlUla',
    url: 'https://images.unsplash.com/photo-1614699816050-f87e2b2b9b84?w=900&q=85&fit=crop',
  },
  {
    name: 'Rub\' al Khali',
    city: 'Empty Quarter',
    url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&q=85&fit=crop',
  },
  {
    name: 'Al-Balad',
    city: 'Jeddah',
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=900&q=85&fit=crop',
  },
  {
    name: 'At-Turaif District',
    city: 'Diriyah',
    url: 'https://images.unsplash.com/photo-1583373834259-46cc92173cb7?w=900&q=85&fit=crop',
  },
];

const SLIDE_DURATION = 4500; // ms per slide

export const WelcomeScreen = ({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted: () => void;
  onSignIn: () => void;
}) => {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [uiVisible, setUiVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload images
  useEffect(() => {
    LANDMARKS.forEach(l => { const img = new Image(); img.src = l.url; });
  }, []);

  // Fade-in UI on mount
  useEffect(() => {
    const t = setTimeout(() => setUiVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance slideshow
  const advance = (from: number) => {
    const to = (from + 1) % LANDMARKS.length;
    setNext(to);
    setFading(true);
    timerRef.current = setTimeout(() => {
      setCurrent(to);
      setNext(null);
      setFading(false);
    }, 900); // crossfade duration
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => advance(current), SLIDE_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const goTo = (i: number) => {
    if (i === current || fading) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setNext(i);
    setFading(true);
    timerRef.current = setTimeout(() => {
      setCurrent(i);
      setNext(null);
      setFading(false);
    }, 900);
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative bg-black">

      {/* — Slideshow layers — */}

      {/* Current slide */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-900"
        style={{
          backgroundImage: `url(${LANDMARKS[current].url})`,
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.9s ease',
        }}
      />

      {/* Next slide (fades in during transition) */}
      {next !== null && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${LANDMARKS[next].url})`,
            opacity: fading ? 1 : 0,
            transition: 'opacity 0.9s ease',
          }}
        />
      )}

      {/* Gradient overlays for readability */}
      {/* Top: logo area darkening */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* Subtle emerald tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(145deg, rgba(5,46,22,0.25) 0%, transparent 60%)' }}
      />

      {/* — Content — */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Top: logo + current landmark badge */}
        <div
          className="flex items-start justify-between px-6 pt-14 pb-4"
          style={{
            opacity: uiVisible ? 1 : 0,
            transform: uiVisible ? 'translateY(0)' : 'translateY(-16px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/50 blur-md" />
              <div className="relative w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Compass className="w-6 h-6 text-white" strokeWidth={1.8} />
              </div>
            </div>
            <span className="text-2xl font-black text-white tracking-tight drop-shadow-lg">TRIPO</span>
          </div>

          {/* Landmark badge */}
          <div
            key={next ?? current}
            className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5"
            style={{ animation: 'fadeIn 0.5s ease' }}
          >
            <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="text-white/90 text-xs font-semibold">{LANDMARKS[next ?? current].city}</span>
          </div>
        </div>

        {/* Center: landmark name */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div
            key={`name-${next ?? current}`}
            className="text-center"
            style={{ animation: 'fadeSlideUp 0.7s ease' }}
          >
            <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              Now Showing
            </p>
            <h2 className="text-3xl font-black text-white leading-tight drop-shadow-2xl text-center px-4">
              {LANDMARKS[next ?? current].name}
            </h2>
          </div>
        </div>

        {/* Bottom: tagline + dots + buttons */}
        <div
          className="px-6 pb-12"
          style={{
            opacity: uiVisible ? 1 : 0,
            transform: uiVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s ease 300ms, transform 0.7s ease 300ms',
          }}
        >
          {/* Tagline */}
          <div className="text-center mb-6">
            <p className="text-white/70 text-base font-medium">
              Discover Saudi Arabia's wonders
            </p>
            <p className="text-white/45 text-sm mt-0.5">
              Plan trips, explore together, earn rewards
            </p>
          </div>

          {/* Slide indicator dots */}
          <div className="flex items-center justify-center gap-2 mb-7">
            {LANDMARKS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all duration-300"
                style={{
                  width: i === current ? 24 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === current ? '#10b981' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <button
              onClick={onGetStarted}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #10b981, #0d9488)',
                boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
              }}
            >
              Get Started
              <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
            </button>

            <button
              onClick={onSignIn}
              className="w-full py-4 rounded-2xl font-semibold text-base text-white/85 border border-white/25 bg-white/10 backdrop-blur-sm active:scale-95 transition-all"
            >
              Sign In
            </button>

            <p className="text-center text-white/30 text-xs pt-1">
              By continuing you agree to our Terms &amp; Privacy Policy
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
