import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
  const baseStyle = "px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700",
    secondary: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:border-white/14 dark:hover:bg-white/15",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 dark:text-ink-secondary dark:hover:bg-white/8",
    mint: "bg-mint text-navy-950 font-bold shadow-mint-glow hover:bg-mint-600 rounded-pill",
    gold: "bg-gold text-navy-950 font-bold hover:opacity-90 rounded-pill",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants] ?? variants.primary} ${className}`}
    >
      {children}
    </button>
  );
};
