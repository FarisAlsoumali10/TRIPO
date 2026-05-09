import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, MapPin, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SafeImage } from './ui';

export interface SlideItem {
  id: string;
  type: 'place' | 'tour' | 'rental' | 'event';
  name: string;
  image: string;
  subtitle: string;
  rating?: number;
  badge: string;
  badgeColor: string;
  isOfficial?: boolean;
}

const SLIDE_MS = 5000;

export const FeaturedSlideshow = ({
  items,
  onSelect,
  lang = 'en',
  height = 'h-72',
}: {
  items: SlideItem[];
  onSelect: (id: string) => void;
  lang?: 'en' | 'ar';
  height?: string;
}) => {
  const isRTL = lang === 'ar';
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
          className="slide-bg absolute inset-0 will-change-transform opacity-0 invisible"
        >
          <SafeImage src={item.image} alt={item.name} className="w-full h-full object-cover" fallbackType="placeholder" seed={item.id} />
        </div>
      ))}

      {/* 🌫️ Gradient Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-midnight/95 via-midnight/40 to-transparent" />

      {/* 🖱️ Clickable Area */}
      <button className="absolute inset-0 w-full h-full z-20 cursor-pointer" onClick={() => onSelect(active.id)} />

      {/* 🏷️ Badge */}
      <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-30 pointer-events-none flex flex-col gap-2 items-${isRTL ? 'end' : 'start'}`}>
        <span
          className="text-[10px] font-black px-3 py-1.5 rounded-full text-midnight uppercase tracking-widest shadow-lg backdrop-blur-md border border-white/20 w-fit"
          style={{ backgroundColor: active.badgeColor }}
        >
          {active.badge}
        </span>
        {active.isOfficial && (
          <div className="bg-oasis-spring/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-oasis-spring/20">
            <Shield className="w-3 h-3 text-midnight" />
            <span className="text-[10px] font-black text-midnight uppercase tracking-tighter">{isRTL ? 'رسمي' : 'Official'}</span>
          </div>
        )}
      </div>

      {/* ⭐ Rating */}
      {active.rating != null && (
        <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-30 flex items-center gap-1.5 bg-midnight/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full pointer-events-none shadow-lg`}>
          <Star className="w-3.5 h-3.5 fill-karam text-karam" />
          <span className="text-white text-xs font-black">{Number(active.rating).toFixed(1)}</span>
        </div>
      )}

      {/* ⬅️ Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); isRTL ? nextSlide() : prevSlide(); }}
            className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-10 h-10 bg-midnight/30 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-midnight/60 transition-all z-30 active:scale-90`}
          >
            {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); isRTL ? prevSlide() : nextSlide(); }}
            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-10 h-10 bg-midnight/30 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-midnight/60 transition-all z-30 active:scale-90`}
          >
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </>
      )}

      {/* 📝 Bottom Info & Pagination */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 z-30 pointer-events-none ${isRTL ? 'text-right' : 'text-left'}`}>
        <div ref={textContainerRef} className="mb-5">
          <h2 className="text-white font-black text-2xl tracking-tight drop-shadow-2xl">
            {active.name}
          </h2>
          <div className={`flex items-center gap-2 mt-1.5 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <MapPin className="w-4 h-4 text-oasis-spring drop-shadow-lg" />
            <p className="text-moon text-sm font-bold drop-shadow-lg">
              {active.subtitle}
            </p>
          </div>
        </div>

        {/* 🟢 Pagination */}
        <div className={`flex items-center gap-2 pointer-events-auto ${isRTL ? 'justify-end' : 'justify-start'}`}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); goTo(i); }}
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${i === cur ? 'w-8 bg-oasis-spring shadow-mint-glow' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};