import React, { useState, useEffect } from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
  const baseStyle = "px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700",
    secondary: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, ...props }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <input 
      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
      {...props} 
    />
  </div>
);

// ── Skeleton loader ────────────────────────────────────────────────────────
// Use instead of spinners for content-shaped placeholders
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`relative overflow-hidden bg-slate-100 rounded-xl ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
    <Skeleton className="h-40 w-full rounded-xl" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <div className="flex gap-2 pt-1">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center gap-3">
        <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// ── EmptyState ─────────────────────────────────────────────────────────────
// Contextual, encouraging empty states with optional CTA
export const EmptyState = ({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  className = '',
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
    {icon && (
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
        {icon}
      </div>
    )}
    <p className="font-black text-slate-500 text-sm mb-1">{title}</p>
    {description && <p className="text-xs text-slate-400 leading-relaxed max-w-xs">{description}</p>}
    {ctaLabel && onCta && (
      <button
        onClick={onCta}
        className="mt-5 px-6 py-3 bg-emerald-600 text-white text-xs font-black rounded-2xl active:scale-95 transition-transform shadow-md shadow-emerald-200"
      >
        {ctaLabel}
      </button>
    )}
  </div>
);

// ── FeatureTip ─────────────────────────────────────────────────────────────
// One-time contextual tooltip per feature key, stored in localStorage
const TIPS_KEY = 'tripo_seen_tips';
function getSeenTips(): string[] {
  try { return JSON.parse(localStorage.getItem(TIPS_KEY) || '[]'); } catch { return []; }
}
function markTipSeen(key: string) {
  const seen = getSeenTips();
  if (!seen.includes(key)) {
    localStorage.setItem(TIPS_KEY, JSON.stringify([...seen, key]));
  }
}

export const FeatureTip = ({
  tipKey,
  title,
  description,
  position = 'bottom',
  children,
}: {
  tipKey: string;
  title: string;
  description?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = getSeenTips();
    if (!seen.includes(tipKey)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [tipKey]);

  const dismiss = () => {
    markTipSeen(tipKey);
    setVisible(false);
  };

  const posStyle: Record<string, string> = {
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    top:    'bottom-full mb-2 left-1/2 -translate-x-1/2',
    left:   'right-full mr-2 top-1/2 -translate-y-1/2',
    right:  'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div className="relative inline-block">
      {children}
      {visible && (
        <div
          className={`absolute z-[500] w-56 bg-slate-900 text-white rounded-2xl shadow-2xl p-3 ${posStyle[position]}`}
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
        >
          {/* Arrow */}
          {position === 'bottom' && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 rounded-sm" />}
          {position === 'top'    && <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 rounded-sm" />}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-black text-white">{title}</p>
              {description && <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-white transition-colors shrink-0 mt-0.5" aria-label="Dismiss tip">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <button onClick={dismiss} className="mt-2 w-full text-[10px] font-black text-emerald-400 hover:text-emerald-300 text-right transition-colors">
            تمام، فهمت ✓
          </button>
        </div>
      )}
    </div>
  );
};

export const Badge = ({ children, color = 'emerald' }: any) => {
  const colors = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    gray: "bg-slate-100 text-slate-600"
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${colors[color as keyof typeof colors]}`}>
      {children}
    </span>
  );
};
