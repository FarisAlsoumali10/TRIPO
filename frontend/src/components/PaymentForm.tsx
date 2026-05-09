import React, { useState } from 'react';
import { usePayment } from '../hooks/usePayment';
import { CreditCard, Lock, CheckCircle, AlertCircle, Calendar, Hash, User } from 'lucide-react';

const formatCardNumber = (val: string) =>
  val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (val: string) =>
  val.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');

const detectBrand = (num: string): string => {
  const raw = num.replace(/\s/g, '');
  if (/^4/.test(raw)) return 'Visa';
  if (/^5[1-5]/.test(raw)) return 'Mastercard';
  if (/^9[0-9]/.test(raw)) return 'Mada';
  return 'Credit Card';
};

interface PaymentFormProps {
  itemType: 'event' | 'tour' | 'rental';
  itemId: string;
  quantity?: number;
  bookingId?: string;
  amount: number;
  onSuccess?: (paymentId: string) => void;
  lang?: 'en' | 'ar';
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ 
  itemType, 
  itemId, 
  quantity, 
  bookingId, 
  amount,
  onSuccess,
  lang = 'ar'
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry]         = useState('');
  const [cvv, setCvv]               = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const { processPayment, loading, error, success, mockPaymentId } = usePayment();

  const ar = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [month, shortYear] = expiry.split('/');
    const year = shortYear && shortYear.length === 2 ? `20${shortYear}` : shortYear;
    
    const ok = await processPayment({ 
      itemType,
      itemId,
      quantity,
      bookingId, 
      amount, 
      cardNumber, 
      expiryMonth: month, 
      expiryYear: year, 
      cvv,
      cardHolder,
    });
    
    if (ok && onSuccess && mockPaymentId) {
      setTimeout(() => onSuccess(mockPaymentId), 500);
    }
  };

  if (success) return (
    <div className="flex flex-col items-center gap-4 py-12 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-oasis-spring/20 rounded-full flex items-center justify-center mb-2 shadow-mint-glow">
        <CheckCircle className="w-12 h-12 text-oasis-spring" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">
          {ar ? 'تمت عملية الدفع!' : 'Payment Successful!'}
        </h2>
        <p className="text-sm text-moon font-medium">
          {ar ? 'تم تأكيد حجزك بنجاح ✓' : 'Your booking has been confirmed ✓'}
        </p>
      </div>
      <div className="mt-4 px-6 py-3 bg-lifted rounded-2xl border border-white/5 text-[10px] font-black text-moon uppercase tracking-widest">
        Ref: {mockPaymentId}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Visual Card Preview ── */}
      <div className="relative h-48 w-full rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 group perspective-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-midnight via-chamber to-lifted p-6 flex flex-col justify-between border border-white/10">
          <div className="flex justify-between items-start">
            <div className="w-12 h-10 bg-gradient-to-br from-amber-200 to-amber-500 rounded-lg opacity-80" />
            <div className="text-right">
              <p className="text-[10px] font-black text-oasis-spring uppercase tracking-widest opacity-60">
                {detectBrand(cardNumber)}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-xl font-mono text-white tracking-[0.2em] drop-shadow-lg">
              {cardNumber || '•••• •••• •••• ••••'}
            </p>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] font-black text-moon uppercase tracking-widest mb-1">Card Holder</p>
                <p className="text-xs font-black text-white uppercase tracking-wider truncate max-w-[150px]">
                  {cardHolder || 'FULL NAME'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-moon uppercase tracking-widest mb-1">Expires</p>
                <p className="text-xs font-black text-white font-mono">
                  {expiry || 'MM/YY'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-oasis-spring/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 mb-2 bg-oasis-spring/5 px-4 py-3 rounded-2xl border border-oasis-spring/10">
          <Lock className="w-4 h-4 text-oasis-spring" />
          <span className="text-[10px] font-black text-oasis-spring uppercase tracking-widest">
            {ar ? 'بيئة دفع آمنة ومحاكاة بنسبة 100%' : '100% SECURE SIMULATED PAYMENT'}
          </span>
        </div>

        {/* Card Holder */}
        <div>
          <label className={`text-[10px] font-black text-moon uppercase tracking-widest mb-2 block ${ar ? 'text-right' : 'text-left'}`}>
            {ar ? 'اسم حامل البطاقة' : 'Card Holder Name'}
          </label>
          <div className="relative group">
            <input
              value={cardHolder}
              onChange={e => setCardHolder(e.target.value)}
              placeholder={ar ? 'الاسم كما يظهر على البطاقة' : 'Name as it appears on card'}
              className="w-full bg-lifted/50 rounded-2xl px-5 py-4 pl-12 text-sm border border-white/5 outline-none focus:ring-2 focus:ring-oasis-spring/30 text-white font-bold transition-all placeholder:text-moon/30"
              required
            />
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moon/40 group-focus-within:text-oasis-spring transition-colors" />
          </div>
        </div>

        {/* Card Number */}
        <div>
          <label className={`text-[10px] font-black text-moon uppercase tracking-widest mb-2 block ${ar ? 'text-right' : 'text-left'}`}>
            {ar ? 'رقم البطاقة' : 'Card Number'}
          </label>
          <div className="relative group">
            <input
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className="w-full bg-lifted/50 rounded-2xl px-5 py-4 pl-12 text-sm border border-white/5 outline-none focus:ring-2 focus:ring-oasis-spring/30 text-white font-mono tracking-widest transition-all placeholder:text-moon/30"
              inputMode="numeric"
              required
            />
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moon/40 group-focus-within:text-oasis-spring transition-colors" />
          </div>
        </div>

        <div className="flex gap-4">
          {/* Expiry */}
          <div className="flex-1">
            <label className={`text-[10px] font-black text-moon uppercase tracking-widest mb-2 block ${ar ? 'text-right' : 'text-left'}`}>
              {ar ? 'تاريخ الانتهاء' : 'Expiry'}
            </label>
            <div className="relative group">
              <input
                value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full bg-lifted/50 rounded-2xl px-5 py-4 pl-12 text-sm border border-white/5 outline-none focus:ring-2 focus:ring-oasis-spring/30 text-white font-mono text-center transition-all placeholder:text-moon/30"
                inputMode="numeric"
                required
              />
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moon/40 group-focus-within:text-oasis-spring transition-colors" />
            </div>
          </div>

          {/* CVV */}
          <div className="w-32">
            <label className={`text-[10px] font-black text-moon uppercase tracking-widest mb-2 block ${ar ? 'text-right' : 'text-left'}`}>
              CVV
            </label>
            <input
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="•••"
              type="password"
              className="w-full bg-lifted/50 rounded-2xl px-5 py-4 text-sm border border-white/5 outline-none focus:ring-2 focus:ring-oasis-spring/30 text-white font-mono text-center tracking-widest transition-all placeholder:text-moon/30"
              inputMode="numeric"
              required
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-waypoint/10 border border-waypoint/20 rounded-2xl text-waypoint animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !cardNumber || !expiry || !cvv || !cardHolder}
          className="w-full py-5 bg-oasis-spring text-midnight rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-mint-glow hover:shadow-mint-glow-lg active:scale-[0.97] disabled:opacity-30 disabled:grayscale transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {ar ? 'جاري المعالجة...' : 'PROCESSING...'}
            </span>
          ) : (
            ar ? `دفع ${amount.toLocaleString()} ريال` : `PAY ${amount.toLocaleString()} SAR`
          )}
        </button>
        
        <p className="text-[9px] text-center text-moon/40 font-black uppercase tracking-[0.2em]">
          {ar ? 'تتم المعالجة عبر نظام تريبو الرقمي المشفر' : 'PROCESSED VIA TRIPO SECURE ENCRYPTION'}
        </p>
      </form>
    </div>
  );
};
