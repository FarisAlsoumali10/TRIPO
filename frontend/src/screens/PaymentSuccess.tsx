import React, { useEffect, useRef, useState } from 'react';
import { 
  CheckCircle, XCircle, Loader2, Calendar, CreditCard, 
  ChevronRight, Home, ReceiptText, MapPin, Users, 
  Clock, ShieldCheck, Sparkles, ArrowRight, Wallet
} from 'lucide-react';
import api from '../services/api';

export const PaymentSuccess: React.FC<{ t: any; lang?: 'en' | 'ar'; onNavigate?: (tab: string, id?: string) => void }> = ({ t, lang, onNavigate }) => {
  const isRTL = lang === 'ar';
  const tp = t.payment;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const paymentId = searchParams.get('id');
  const hasVerified = useRef(false);

  const navigate = (path: string) => {
    if (onNavigate) {
      if (path === '/') onNavigate('home');
      else if (path.includes('booking_history')) onNavigate('booking_history');
      else window.location.href = path;
    } else {
      window.location.href = path;
    }
  };

  useEffect(() => {
    if (hasVerified.current) return;
    if (!paymentId) {
      setStatus('error');
      setErrorMessage(tp.failedDesc);
      return;
    }

    const verifyPayment = async () => {
      hasVerified.current = true;
      try {
        const response = await api.post('/payments/verify', { paymentId });
        if (response.data && response.data.success) {
          setPaymentData(response.data.data);
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(response.data?.message || tp.failedDesc);
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setStatus('error');
        setErrorMessage(err.response?.data?.message || 'Network error occurred.');
      }
    };

    verifyPayment();
  }, [paymentId]);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-midnight p-6">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-oasis-spring/20 rounded-full"></div>
          <Loader2 className="w-20 h-20 text-oasis-spring animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{tp.verifying}</h2>
        <p className="text-moon font-medium italic">{tp.preparing}</p>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-midnight p-6">
      <div className="max-w-md w-full bg-chamber rounded-[2.5rem] p-10 text-center border border-waypoint/10">
        <div className="w-20 h-20 bg-waypoint/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <XCircle className="w-12 h-12 text-waypoint" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{tp.failedTitle}</h2>
        <p className="text-moon font-medium mb-10">{errorMessage || tp.failedDesc}</p>
        <button 
          onClick={() => navigate('/')} 
          className="w-full py-4 bg-white text-midnight rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
        >
          {tp.returnHome}
        </button>
      </div>
    </div>
  );

  const cashbackEarned = Math.round((paymentData?.amount || 0) * 0.05);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-midnight p-6 transition-colors duration-500 overflow-hidden">
      
      {/* CSS Confetti Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className={`absolute w-3 h-3 rounded-sm animate-confetti-fall opacity-60`}
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#7CF7C8', '#F7C948', '#FF6B7A', '#1EC99A', '#B8C2D6'][i % 5],
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl w-full animate-in fade-in zoom-in duration-700">
        {/* Header Celebration */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-oasis-spring/10 text-oasis-spring rounded-full text-xs font-black uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> {tp.bookingConfirmed}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            {tp.packBags}
          </h1>
        </div>

        {/* The Ticket Card */}
        <div className="bg-chamber rounded-[3rem] overflow-hidden border border-white/5 relative">
          
          {/* Ticket Top: Hero Section */}
          <div className="relative h-56">
            <img 
              src={paymentData?.tourImage || 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80'} 
              className="w-full h-full object-cover" 
              alt="Destination" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/20 to-transparent" />
            <div className={`absolute bottom-6 ${isRTL ? 'right-8' : 'left-8'} ${isRTL ? 'left-8' : 'right-8'} ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="px-2 py-0.5 bg-oasis-spring text-midnight text-[10px] font-black rounded-md uppercase tracking-wider">
                  {paymentData?.difficulty || tp.expertChoice}
                </span>
              </div>
              <h2 className="text-white font-black text-2xl md:text-3xl leading-tight drop-shadow-md">
                {paymentData?.itemTitle || tp.unforgettable}
              </h2>
              <div className={`flex items-center gap-1.5 text-moon text-sm mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MapPin className="w-4 h-4 text-oasis-spring" />
                <span className="font-bold">{paymentData?.departureLocation || (isRTL ? 'السعودية' : 'Saudi Arabia')}</span>
              </div>
            </div>
          </div>

          {/* Ticket Middle: Perforated Divider */}
          <div className="relative flex items-center py-4 bg-chamber">
            <div className="absolute -left-4 w-8 h-8 rounded-full bg-midnight border border-white/5 shadow-inner" />
            <div className="flex-1 border-t-4 border-dashed border-white/5 mx-6" />
            <div className="absolute -right-4 w-8 h-8 rounded-full bg-midnight border border-white/5 shadow-inner" />
          </div>

          {/* Ticket Body: Details Grid */}
          <div className={`px-8 pb-8 pt-2 grid grid-cols-2 md:grid-cols-4 gap-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-moon uppercase tracking-widest">{tp.date}</p>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar className="w-4 h-4 text-oasis-spring" />
                <span className="text-sm font-black text-slate-200">
                  {paymentData?.date ? new Date(paymentData.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' }) : tp.pending}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-moon uppercase tracking-widest">{tp.guests}</p>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Users className="w-4 h-4 text-oasis-spring" />
                <span className="text-sm font-black text-slate-200">{tp.persons.replace('{n}', String(paymentData?.guests || 1))}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-moon uppercase tracking-widest">{tp.duration}</p>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Clock className="w-4 h-4 text-oasis-spring" />
                <span className="text-sm font-black text-slate-200">{paymentData?.duration || (isRTL ? 'يوم كامل' : 'Full Day')}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-moon uppercase tracking-widest">{tp.guide}</p>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-5 h-5 rounded-full bg-oasis-spring/20 flex items-center justify-center text-[10px] font-black text-oasis-spring">
                  {paymentData?.guideName?.charAt(0) || 'G'}
                </div>
                <span className="text-sm font-black text-slate-200 truncate">{paymentData?.guideName || tp.verifiedGuide}</span>
              </div>
            </div>
          </div>

          {/* Cashback Banner */}
          {cashbackEarned > 0 && (
            <div className={`mx-8 mb-8 p-4 bg-lifted rounded-2xl flex items-center justify-between border border-white/5 group hover:bg-white/5 transition-all cursor-default ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <div className="w-10 h-10 bg-karam/10 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-karam" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-moon uppercase">{tp.cashback}</p>
                  <p className="text-base font-black text-white">+{cashbackEarned.toLocaleString(isRTL ? 'ar-SA' : 'en-US')} <span className="text-karam">{tp.points}</span></p>
                </div>
              </div>
              <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-white">
                <ArrowRight className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
              </div>
            </div>
          )}

          {/* Payment Summary Footer */}
          <div className={`px-8 py-6 bg-lifted/50 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <div className="p-3 bg-chamber rounded-2xl border border-white/10">
                <CreditCard className="w-6 h-6 text-moon" />
              </div>
              <div>
                <p className="text-[10px] font-black text-moon uppercase tracking-wider">{tp.method}</p>
                <p className="text-sm font-black text-slate-200">**** **** **** {paymentData?.cardLastFour || '4242'}</p>
              </div>
            </div>
            <div className={`${isRTL ? 'text-left' : 'text-right'}`}>
              <p className="text-[10px] font-black text-moon uppercase tracking-wider">{tp.amountPaid}</p>
              <p className="text-2xl font-black text-oasis-spring leading-none">
                {paymentData?.amount?.toLocaleString(isRTL ? 'ar-SA' : 'en-US') || '0'} <span className="text-sm">{isRTL ? 'ر.س' : 'SAR'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Reference & Security */}
        <div className={`mt-6 flex items-center justify-between px-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 text-moon ${isRTL ? 'flex-row-reverse' : ''}`}>
            <ShieldCheck className="w-4 h-4 text-oasis-spring" />
            <span className="text-[10px] font-black uppercase tracking-widest">{tp.reference}: #{paymentId?.slice(-8).toUpperCase()}</span>
          </div>
          <p className="text-[10px] font-bold text-moon uppercase tracking-widest">
            {tp.securedBy}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/?tab=booking_history')}
            className={`group py-5 bg-oasis-spring text-midnight rounded-[1.5rem] font-black uppercase tracking-widest transition-all shadow-mint-glow hover:shadow-mint-glow animate-pulse-soft active:scale-95 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {tp.manageBookings}
            <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/')}
            className={`py-5 bg-lifted border border-white/10 text-white rounded-[1.5rem] font-black uppercase tracking-widest transition-all hover:bg-white/5 flex items-center justify-center gap-2 active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Home className="w-5 h-5 text-moon" />
            {tp.backToHome}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(720deg); }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccess;
