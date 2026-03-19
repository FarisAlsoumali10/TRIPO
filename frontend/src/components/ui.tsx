import React from 'react';

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
