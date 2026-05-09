import React from 'react';

export const Input = ({ label, ...props }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-slate-500 dark:text-ink-muted uppercase tracking-wider mb-1">{label}</label>
    <input
      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/8 border border-slate-200 dark:border-white/14 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-mint dark:text-white dark:placeholder:text-ink-muted transition-all"
      {...props}
    />
  </div>
);
