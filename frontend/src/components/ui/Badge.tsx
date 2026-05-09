import React from 'react';

export const Badge = ({ children, color = 'emerald' }: any) => {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    gray: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-ink-secondary",
    mint: "bg-mint/20 text-mint-600 dark:bg-mint/15 dark:text-mint",
    gold: "bg-gold/20 text-amber-700 dark:bg-gold/15 dark:text-gold",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
};
