import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight, Flame, MapPin } from 'lucide-react';

export const TrendingCards = ({
  items,
  onSelect,
  label = '🔥 Trending',
}: {
  items: TrendingItem[];
  onSelect: (item: TrendingItem) => void;
  label?: string;
}) => {
  if (!items.length) return null;
  return (
    <div className="mt-6 mb-2">
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-bold text-slate-800">{label}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="h-24 relative overflow-hidden bg-slate-200">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-slate-300" />
                </div>
              )}
              {item.rating != null && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-bold text-slate-700">{Number(item.rating).toFixed(1)}</span>
                </div>
              )}
              <div
                className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wide"
                style={{ backgroundColor: item.badgeColor }}
              >
                {item.badge}
              </div>
            </div>
            <div className="p-2">
              <p className="font-bold text-slate-900 text-xs truncate">{item.name}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export interface TrendingItem {
  id: string;
  image: string;
  name: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  rating?: number;
}

const SLIDE_MS = 3500;

export const TrendingSlideshow = ({
  items,
  onSelect,
  label = '🔥 Trending',
}: {
  items: TrendingItem[];
  onSelect: (item: TrendingItem) => void;
  label?: string;
}) => {
  const [cur, setCur] = useState(0);
  const [nxt, setNxt] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((to: number) => {
    if (to === cur || fading || items.length < 2) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setNxt(to);
    setFading(true);
    timerRef.current = setTimeout(() => {
      setCur(to);
      setNxt(null);
      setFading(false);
    }, 700);
  }, [cur, fading, items.length]);

  const next = useCallback(() => goTo((cur + 1) % items.length), [cur, goTo, items.length]);
  const prev = useCallback(() => goTo((cur - 1 + items.length) % items.length), [cur, goTo, items.length]);

  // Auto-advance
  useEffect(() => {
    if (items.length < 2) return;
    timerRef.current = setTimeout(next, SLIDE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cur, next, items.length]);

  // Reset to 0 when items list changes
  useEffect(() => { setCur(0); setNxt(null); setFading(false); }, [items.length]);

  if (!items.length) return null;

  const active = items[nxt ?? cur];

  return (
    <div className="px-4 pt-3 pb-1">
      {/* Section label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-bold text-slate-800">{label}</span>
        <span className="text-xs text-slate-400 font-medium ml-1">Tap to open</span>
      </div>

      {/* Slide card */}
      <div className="relative h-48 rounded-2xl overflow-hidden shadow-md bg-slate-900">

        {/* Current image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${items[cur].image})`,
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.7s ease',
          }}
        />

        {/* Next image */}
        {nxt !== null && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${items[nxt].image})`,
              opacity: fading ? 1 : 0,
              transition: 'opacity 0.7s ease',
            }}
          />
        )}

        {/* Gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)' }}
        />

        {/* Clickable area */}
        <button className="absolute inset-0 w-full" onClick={() => onSelect(active)} />

        {/* Badge — top left */}
        <div className="absolute top-2.5 left-3 pointer-events-none">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide shadow"
            style={{ backgroundColor: active.badgeColor }}
          >
            {active.badge}
          </span>
        </div>

        {/* Rating — top right */}
        {active.rating != null && (
          <div className="absolute top-2.5 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full pointer-events-none">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-white text-xs font-bold">{Number(active.rating).toFixed(1)}</span>
          </div>
        )}

        {/* Left arrow */}
        {items.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/55 transition z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right arrow */}
        {items.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/35 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/55 transition z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Bottom info + dots */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pointer-events-none">
          <p
            key={`n-${nxt ?? cur}`}
            className="text-white font-extrabold text-base leading-tight drop-shadow"
            style={{ animation: 'trendFadeUp 0.5s ease' }}
          >
            {active.name}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-white/70 flex-shrink-0" />
            <p className="text-white/75 text-xs font-medium truncate">{active.subtitle}</p>
          </div>

          {/* Dot indicators */}
          {items.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2 pointer-events-auto">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); goTo(i); }}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: i === cur ? 18 : 5,
                    height: 5,
                    background: i === cur ? '#10b981' : 'rgba(255,255,255,0.50)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes trendFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
