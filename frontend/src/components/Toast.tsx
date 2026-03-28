import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

// Any module can call this to show a toast without prop drilling
export const showToast = (message: string, type: ToastType = 'info') => {
  window.dispatchEvent(new CustomEvent('toast:show', { detail: { message, type } }));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as { message: string; type: ToastType };
      const id = `${Date.now()}-${Math.random()}`;
      setToasts(prev => [...prev, { id, type, message }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    window.addEventListener('toast:show', handler);
    return () => window.removeEventListener('toast:show', handler);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    info: <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  };

  const bg: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 z-[999] pointer-events-none px-4 lg:bottom-6">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`w-full max-w-sm flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg pointer-events-auto ${bg[t.type]}`}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm font-medium text-slate-800">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
