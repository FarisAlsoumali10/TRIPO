import React from 'react';

import { XCircle, ArrowLeft } from 'lucide-react';

export const PaymentCancelled: React.FC = () => {
  const navigate = (path: string) => { window.location.href = path; };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 text-center transition-colors duration-300 border border-slate-100 dark:border-white/10">
        <div className="flex flex-col items-center justify-center py-4 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-12 h-12 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Payment Cancelled</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            You have cancelled the payment process. No charges were made to your account.
          </p>
          <button
            onClick={() => navigate('/')} // Update to your home route
            className="w-full py-3.5 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Go back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;
