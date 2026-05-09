import React from 'react';

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
      <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-white/30">
        {icon}
      </div>
    )}
    <p className="font-black text-slate-500 dark:text-ink-muted text-sm mb-1">{title}</p>
    {description && <p className="text-xs text-slate-400 dark:text-ink-muted/70 leading-relaxed max-w-xs">{description}</p>}
    {ctaLabel && onCta && (
      <button
        onClick={onCta}
        className="mt-5 px-6 py-3 bg-emerald-600 dark:bg-mint dark:text-navy-950 text-white text-xs font-black rounded-pill active:scale-95 transition-transform shadow-md shadow-emerald-200 dark:shadow-mint-glow"
      >
        {ctaLabel}
      </button>
    )}
  </div>
);
