import React, { useState, useEffect } from 'react';

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
    const TIPS_KEY = 'tripo_seen_tips';
    const seen = JSON.parse(localStorage.getItem(TIPS_KEY) || '[]');
    if (!seen.includes(tipKey)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [tipKey]);

  const dismiss = () => {
    const TIPS_KEY = 'tripo_seen_tips';
    const seen = JSON.parse(localStorage.getItem(TIPS_KEY) || '[]');
    if (!seen.includes(tipKey)) {
      localStorage.setItem(TIPS_KEY, JSON.stringify([...seen, tipKey]));
    }
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
          className={`absolute z-[500] w-56 bg-slate-900 dark:bg-navy-900 dark:border dark:border-white/14 text-white rounded-2xl shadow-2xl p-3 ${posStyle[position]}`}
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
        >
          {position === 'bottom' && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 dark:bg-navy-900 rotate-45 rounded-sm" />}
          {position === 'top'    && <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 dark:bg-navy-900 rotate-45 rounded-sm" />}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-black text-white">{title}</p>
              {description && <p className="text-[10px] text-slate-400 dark:text-ink-muted mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-white transition-colors shrink-0 mt-0.5" aria-label="Dismiss tip">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <button onClick={dismiss} className="mt-2 w-full text-[10px] font-black text-emerald-400 dark:text-mint hover:opacity-80 text-right transition-colors">
            تمام، فهمت ✓
          </button>
        </div>
      )}
    </div>
  );
};
