import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ photos, initialIndex = 0, onClose }) => {
  const [idx, setIdx] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setIdx(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (!photos.length) return null;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe-top py-3 flex-shrink-0">
        <span className="text-white/60 text-sm font-semibold">{idx + 1} / {photos.length}</span>
        <button
          onClick={onClose}
          className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <img
          key={idx}
          src={photos[idx]}
          alt={`Photo ${idx + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          style={{ animation: 'lbFadeIn 0.22s ease' }}
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80';
          }}
        />

        {/* Prev / Next arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && photos.length <= 12 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === idx ? 20 : 6,
                height: 6,
                background: i === idx ? '#10b981' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex-shrink-0 px-4 pb-safe-bottom pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  i === idx ? 'border-emerald-400 opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
                }`}
              >
                <img src={src} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes lbFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
