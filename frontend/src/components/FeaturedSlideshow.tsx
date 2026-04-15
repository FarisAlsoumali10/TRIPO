import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

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

const SLIDE_MS = 5000;

export const FeaturedSlideshow = ({
  items,
  onPress,
  height = 'h-72',
}: {
  items: SlideItem[];
  onPress: (item: SlideItem) => void;
  height?: string;
}) => {
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ 1. الإصلاح الجذري: هذا المتغير كان مفقوداً ويسبب شلل الواجهة!
  const isAnimating = useRef(false);

  const goTo = useCallback((index: number) => {
    // ✅ 2. نمنع النقر إذا كانت الحركة مستمرة لمنع التداخل (Overlap)
    if (index === cur || isAnimating.current) return;

    isAnimating.current = true; // نقفل الأزرار مؤقتاً
    setPrev(cur);
    setCur(index);
  }, [cur]);

  const nextSlide = useCallback(() => {
    goTo((cur + 1) % items.length);
  }, [cur, items.length, goTo]);

  const prevSlide = useCallback(() => {
    goTo((cur - 1 + items.length) % items.length);
  }, [cur, items.length, goTo]);

  useEffect(() => {
    timerRef.current = setTimeout(nextSlide, SLIDE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cur, nextSlide]);

  // ==========================================
  // 🎬 GSAP Animation Engine (The Right Way)
  // ==========================================
  // ✅ 3. نستخدم contextSafe لفصل الحركة عن دورة حياة React المدمرة
  const { contextSafe } = useGSAP({ scope: containerRef });

  const animateTransition = contextSafe((currentIndex: number, prevIndex: number) => {
    if (!items.length) return;
    const slides = gsap.utils.toArray('.slide-bg') as HTMLElement[];
    if (!slides.length) return;

    // حالة التحميل الأول (بدون تغيير الشريحة)
    if (currentIndex === prevIndex) {
      gsap.set(slides[currentIndex], { zIndex: 2, opacity: 1, visibility: 'visible', scale: 1 });
      gsap.to(slides[currentIndex], { scale: 1.1, duration: SLIDE_MS / 1000, ease: 'none' });
      return;
    }

    // 🔴 الشريحة السابقة: تبهت بنعومة وتختفي
    gsap.set(slides[prevIndex], { zIndex: 1 });
    gsap.to(slides[prevIndex], {
      opacity: 0,
      duration: 1.2,
      ease: 'power2.inOut'
    });

    // 🟢 الشريحة الجديدة: تظهر وتبدأ بالتكبير (Ken Burns)
    gsap.set(slides[currentIndex], { zIndex: 2, visibility: 'visible', opacity: 0, scale: 1 });

    // حركة الظهور
    gsap.to(slides[currentIndex], {
      opacity: 1,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => {
        isAnimating.current = false; // ✅ نفتح القفل فوراً بعد الظهور
      }
    });

    // التكبير المستمر المستقل
    gsap.to(slides[currentIndex], {
      scale: 1.1,
      duration: SLIDE_MS / 1000,
      ease: 'none'
    });

    // ✨ حركة النصوص المتتابعة
    if (textContainerRef.current) {
      gsap.fromTo(textContainerRef.current.children,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out' }
      );
    }
  });

  // ✅ 4. نستدعي الدالة الآمنة عندما تتغير الحالة
  useEffect(() => {
    animateTransition(cur, prev);
  }, [cur, prev, animateTransition]);

  if (!items.length) return null;
  const active = items[cur];

  return (
    <div ref={containerRef} className={`relative ${height} overflow-hidden bg-slate-900 rounded-2xl shadow-2xl`}>

      {/* 🖼️ Slides Layer */}
      {items.map((item) => (
        <div
          key={item.id}
          className="slide-bg absolute inset-0 bg-cover bg-center will-change-transform opacity-0 invisible"
          style={{ backgroundImage: `url(${item.image})` }}
        />
      ))}

      {/* 🌫️ Gradient Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* 🖱️ Clickable Area */}
      <button className="absolute inset-0 w-full h-full z-20" onClick={() => onPress(active)} />

      {/* 🏷️ Badge */}
      <div className="absolute top-4 left-4 z-30 pointer-events-none">
        <span
          className="text-[10px] font-bold px-3 py-1.5 rounded-full text-white uppercase tracking-wider shadow-lg backdrop-blur-md border border-white/20"
          style={{ backgroundColor: active.badgeColor }}
        >
          {active.badge}
        </span>
      </div>

      {/* ⭐ Rating */}
      {active.rating != null && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full pointer-events-none shadow-lg">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-white text-xs font-bold">{Number(active.rating).toFixed(1)}</span>
        </div>
      )}

      {/* ⬅️ Left Arrow */}
      {items.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prevSlide(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all z-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* ➡️ Right Arrow */}
      {items.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); nextSlide(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all z-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* 📝 Bottom Info & Pagination */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-30 pointer-events-none">
        <div ref={textContainerRef} className="mb-4">
          <h2 className="text-white font-black text-2xl tracking-tight drop-shadow-md">
            {active.name}
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-4 h-4 text-emerald-400 drop-shadow-md" />
            <p className="text-gray-200 text-sm font-medium drop-shadow-md">
              {active.subtitle}
            </p>
          </div>
        </div>

        {/* 🟢 Pagination */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); goTo(i); }}
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${i === cur ? 'w-8 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};