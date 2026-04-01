import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

export interface SlideItem {
  id: string;
  type: 'place' | 'tour' | 'rental' | 'event';
  name: string;
  image: string;
  subtitle: string;
  rating?: number;
  badge: string;
  badgeColor: string;
}

const SLIDE_MS = 4000;

export const FeaturedSlideshow = ({
  items,
  onPress,
  height = 'h-56',
}: {
  items: SlideItem[];
  onPress: (item: SlideItem) => void;
  height?: string;
}) => {
  const [cur, setCur] = useState(0);
  const [nxt, setNxt] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback((from: number) => {
    if (items.length < 2) return;
    const to = (from + 1) % items.length;
    setNxt(to);
    setFading(true);
    timerRef.current = setTimeout(() => {
      setCur(to);
      setNxt(null);
      setFading(false);
    }, 800);
  }, [items.length]);

  useEffect(() => {
    timerRef.current = setTimeout(() => advance(cur), SLIDE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cur, advance]);

  const goTo = (i: number) => {
    if (i === cur || fading) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setNxt(i);
    setFading(true);
    timerRef.current = setTimeout(() => {
      setCur(i);
      setNxt(null);
      setFading(false);
    }, 800);
  };

  if (!items.length) return null;

  const active = items[nxt ?? cur];

  return (
    <div className={`relative ${height} overflow-hidden bg-slate-900`}>
      {/* Current slide */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${items[cur].image})`,
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.8s ease',
        }}
      />
      {/* Next slide */}
      {nxt !== null && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${items[nxt].image})`,
            opacity: fading ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}
        />
      )}

      {/* Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.72) 100%)' }}
      />

      {/* Clickable overlay */}
      <button className="absolute inset-0 w-full h-full" onClick={() => onPress(active)} />

      {/* Badge — top left */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide shadow"
          style={{ backgroundColor: active.badgeColor }}
        >
          {active.badge}
        </span>
      </div>

      {/* Rating — top right */}
      {active.rating != null && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full pointer-events-none">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-white text-xs font-bold">{Number(active.rating).toFixed(1)}</span>
        </div>
      )}

      {/* Left arrow */}
      {items.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); goTo((cur - 1 + items.length) % items.length); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/55 transition z-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Right arrow */}
      {items.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); goTo((cur + 1) % items.length); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/55 transition z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Bottom info + dots */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pointer-events-none">
        <p
          key={`name-${nxt ?? cur}`}
          className="text-white font-extrabold text-lg leading-tight drop-shadow-lg"
          style={{ animation: 'featFadeUp 0.5s ease' }}
        >
          {active.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-white/70 flex-shrink-0" />
          <p className="text-white/75 text-xs font-medium">{active.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 pointer-events-auto">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); goTo(i); }}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === cur ? 20 : 5,
                height: 5,
                background: i === cur ? '#10b981' : 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes featFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
