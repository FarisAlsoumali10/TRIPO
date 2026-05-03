import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Users, CreditCard, Check, Minus, Plus, AlertCircle, ExternalLink } from 'lucide-react';
import { Tour } from '../types';
import { paymentAPI, tourAPI } from '../services/api';

interface BookingModalProps {
  tour: Tour;
  onClose: () => void;
  onConfirm: (date: string, guests: number) => Promise<void>;
  isBooking: boolean;
}

// Generate the next N upcoming Fridays from today
const getUpcomingFridays = (count: number): Date[] => {
  const dates: Date[] = [];
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  for (let i = 0; i < count; i++) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
};

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-SA', { weekday: 'short', day: 'numeric', month: 'short' });

const SERVICE_FEE_RATE = 0.05;
const VAT_RATE = 0.15;

export const BookingModal: React.FC<BookingModalProps> = ({ tour, onClose, onConfirm, isBooking }) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [guests, setGuests] = useState(1);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build available dates: use tour's availableDates or fall back to next 4 Fridays
  const availableDates: Date[] = React.useMemo(() => {
    if (tour.availableDates && tour.availableDates.length > 0) {
      return tour.availableDates
        .map((d) => new Date(d))
        .filter((d) => d > new Date())
        .slice(0, 8);
    }
    return getUpcomingFridays(4);
  }, [tour.availableDates]);

  const basePrice = tour.pricePerPerson * guests;
  const serviceFee = Math.round(basePrice * SERVICE_FEE_RATE);
  const vat = Math.round(basePrice * VAT_RATE);
  const total = basePrice + serviceFee + vat;

  const difficultyColor =
    tour.difficulty === 'easy'
      ? 'text-emerald-700 bg-emerald-50'
      : tour.difficulty === 'moderate'
      ? 'text-amber-700 bg-amber-50'
      : 'text-red-700 bg-red-50';

  const handleNext = () => {
    setFormError('');
    if (step === 1 && !selectedDate) {
      setFormError('Please select a date to continue.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setFormError('');
    const tourId = (tour as any)._id || tour.id;
    if (!tourId) { setFormError('Tour ID is missing.'); return; }
    setIsSubmitting(true);
    try {
      // Step 1: create a pending booking to get a bookingId
      const bookingResult = await tourAPI.bookTour(tourId, { date: selectedDate, guests });
      const bookingId = bookingResult?.booking?._id;
      // Step 2: start checkout linked to that booking (stays true — page will redirect)
      const { url } = await paymentAPI.createCheckoutSession('tour', tourId, guests, bookingId);
      window.location.href = url;
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Could not start checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  const stepLabels = ['Choose Date', 'Group Size', 'Confirm & Pay'];

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{tour.category}</p>
            <h2 className="font-bold text-slate-900 text-base leading-tight truncate">{tour.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4 px-6">
          {stepLabels.map((label, i) => {
            const s = i + 1;
            const active = s === step;
            const done = s < step;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : active
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className={`text-[10px] font-medium ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* Step 1 — Date Selection */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Pick your date</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {availableDates.map((date) => {
                  const iso = date.toISOString();
                  const selected = selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      onClick={() => setSelectedDate(iso)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-100 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className={`text-sm font-bold ${selected ? 'text-emerald-800' : 'text-slate-800'}`}>
                        {formatDate(date)}
                      </p>
                      <p className={`text-xs mt-0.5 ${selected ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {tour.departureTime} · {tour.departureLocation.split(',')[0]}
                      </p>
                      {selected && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Group Size */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Group size</h3>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-lg">{guests} {guests === 1 ? 'Guest' : 'Guests'}</p>
                    <p className="text-sm text-slate-500">Max {tour.maxGroupSize} per booking</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      disabled={guests <= 1}
                      className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 disabled:opacity-30 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-extrabold text-slate-900 w-8 text-center">{guests}</span>
                    <button
                      onClick={() => setGuests((g) => Math.min(tour.maxGroupSize, g + 1))}
                      disabled={guests >= tour.maxGroupSize}
                      className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 disabled:opacity-30 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{tour.pricePerPerson} SAR × {guests} {guests === 1 ? 'guest' : 'guests'}</span>
                  <span className="font-semibold text-slate-800">{basePrice.toLocaleString()} SAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Service fee (5%)</span>
                  <span className="font-semibold text-slate-800">{serviceFee.toLocaleString()} SAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">VAT (15%)</span>
                  <span className="font-semibold text-slate-800">{vat.toLocaleString()} SAR</span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-extrabold text-xl text-emerald-700">{total.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Confirm & Pay */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Confirm & Pay</h3>
              </div>

              {/* Price Breakdown Card */}
              <div className="bg-emerald-50 rounded-2xl p-4 mb-5 border border-emerald-100">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">Price Breakdown</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{tour.pricePerPerson} SAR × {guests}</span>
                    <span className="font-semibold text-slate-800">{basePrice.toLocaleString()} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service fee (5%)</span>
                    <span className="font-semibold text-slate-800">{serviceFee.toLocaleString()} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">VAT (15%)</span>
                    <span className="font-semibold text-slate-800">{vat.toLocaleString()} SAR</span>
                  </div>
                  <div className="h-px bg-emerald-200 my-2" />
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">Total Due</span>
                    <span className="font-extrabold text-emerald-800 text-lg">{total.toLocaleString()} SAR</span>
                  </div>
                </div>
              </div>

              {/* Booking summary */}
              <div className="bg-slate-50 rounded-2xl p-3 mb-5 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Your trip date</p>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedDate ? formatDate(new Date(selectedDate)) : '—'} · {guests} {guests === 1 ? 'guest' : 'guests'}
                  </p>
                </div>
              </div>

              {/* Secure checkout notice */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Secure Payment</p>
                  <p className="text-xs text-slate-500 mt-0.5">You'll be redirected to a secure checkout page to complete your payment.</p>
                </div>
              </div>

              <p className="text-center text-xs text-slate-400 mt-4">
                Payments are processed securely. You will not be charged until checkout is complete.
              </p>
            </div>
          )}

          {/* Error message */}
          {formError && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => { setFormError(''); setStep((s) => s - 1); }}
              disabled={isBooking}
              className="flex items-center gap-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-600 transition active:scale-95"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-600 transition active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" /> Proceed to Payment
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
