import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Users, CreditCard, Check, Minus, Plus, AlertCircle, ExternalLink } from 'lucide-react';
import { Tour } from '../types';
import { paymentAPI, tourAPI } from '../services/api';
import { PaymentForm } from './PaymentForm';

interface BookingModalProps {
  tour: Tour;
  onClose: () => void;
  onConfirm: (date: string, guests: number) => Promise<void>;
  isBooking: boolean;
  lang?: 'en' | 'ar';
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

export const BookingModal: React.FC<BookingModalProps> = ({ tour, onClose, onConfirm, isBooking, lang = 'ar' }) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [guests, setGuests] = useState(1);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');

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
      ? 'text-oasis-spring bg-oasis-spring/10'
      : tour.difficulty === 'moderate'
      ? 'text-karam bg-karam/10'
      : 'text-waypoint bg-waypoint/10';

  const handleNext = async () => {
    setFormError('');
    if (step === 1 && !selectedDate) {
      setFormError('Please select a date to continue.');
      return;
    }
    
    if (step === 2) {
      setIsSubmitting(true);
      try {
        const tourId = (tour as any)._id || tour.id;
        const bookingResult = await tourAPI.bookTour(tourId, { date: selectedDate, guests });
        const bId = bookingResult?.data?.booking?._id || bookingResult?.booking?._id || bookingResult?._id;
        if (!bId) throw new Error('Booking ID missing');
        setBookingId(bId);
        setStep(3);
      } catch (err: any) {
        setFormError(err?.response?.data?.error || 'Failed to create booking. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setStep((s) => s + 1);
  };

  const stepLabels = ['Choose Date', 'Group Size', 'Confirm & Pay'];

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div
        className="bg-chamber w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-glass-depth border border-white/10 flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-oasis-spring">{tour.category}</p>
            <h2 className="font-bold text-white text-base leading-tight truncate">{tour.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 w-9 h-9 rounded-full bg-lifted hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-moon" />
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
                        ? 'bg-oasis-spring text-midnight'
                        : active
                        ? 'bg-oasis-spring text-midnight ring-4 ring-oasis-spring/20'
                        : 'bg-lifted text-moon'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className={`text-[10px] font-medium ${active ? 'text-oasis-spring' : 'text-moon'}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 ${done ? 'bg-oasis-spring' : 'bg-white/10'}`} />
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
                <Calendar className="w-5 h-5 text-oasis-spring" />
                <h3 className="font-bold text-white">Pick your date</h3>
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
                          ? 'border-oasis-spring bg-oasis-spring/10'
                          : 'border-white/10 bg-lifted hover:border-oasis-spring/30'
                      }`}
                    >
                      <p className={`text-sm font-bold ${selected ? 'text-oasis-spring' : 'text-white'}`}>
                        {formatDate(date)}
                      </p>
                      <p className={`text-xs mt-0.5 ${selected ? 'text-oasis-spring/70' : 'text-moon'}`}>
                        {tour.departureTime} · {tour.departureLocation.split(',')[0]}
                      </p>
                      {selected && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-oasis-spring text-midnight text-[10px] font-bold rounded-full">
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
                <Users className="w-5 h-5 text-oasis-spring" />
                <h3 className="font-bold text-white">Group size</h3>
              </div>

              <div className="bg-lifted rounded-2xl p-5 mb-5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-lg">{guests} {guests === 1 ? 'Guest' : 'Guests'}</p>
                    <p className="text-sm text-moon">Max {tour.maxGroupSize} per booking</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      disabled={guests <= 1}
                      className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center text-moon hover:border-white/20 disabled:opacity-30 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-extrabold text-white w-8 text-center">{guests}</span>
                    <button
                      onClick={() => setGuests((g) => Math.min(tour.maxGroupSize, g + 1))}
                      disabled={guests >= tour.maxGroupSize}
                      className="w-10 h-10 rounded-full bg-oasis-spring flex items-center justify-center text-midnight hover:opacity-90 disabled:opacity-30 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-moon">{tour.pricePerPerson} SAR × {guests} {guests === 1 ? 'guest' : 'guests'}</span>
                  <span className="font-semibold text-white">{basePrice.toLocaleString()} SAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-moon">Service fee (5%)</span>
                  <span className="font-semibold text-white">{serviceFee.toLocaleString()} SAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-moon">VAT (15%)</span>
                  <span className="font-semibold text-white">{vat.toLocaleString()} SAR</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-white">Total</span>
                  <span className="font-extrabold text-xl text-oasis-spring">{total.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Confirm & Pay */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-oasis-spring" />
                <h3 className="font-bold text-white">Confirm & Pay</h3>
              </div>

              <div className="bg-oasis-spring/10 rounded-2xl p-4 mb-5 border border-oasis-spring/20">
                <p className="text-xs font-bold uppercase tracking-widest text-oasis-spring mb-3">Price Breakdown</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-moon">{tour.pricePerPerson} SAR × {guests}</span>
                    <span className="font-semibold text-white">{basePrice.toLocaleString()} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-moon">Service fee (5%)</span>
                    <span className="font-semibold text-white">{serviceFee.toLocaleString()} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-moon">VAT (15%)</span>
                    <span className="font-semibold text-white">{vat.toLocaleString()} SAR</span>
                  </div>
                  <div className="h-px bg-oasis-spring/20 my-2" />
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Total Due</span>
                    <span className="font-extrabold text-oasis-spring text-lg">{total.toLocaleString()} SAR</span>
                  </div>
                </div>
              </div>

              <div className="bg-lifted rounded-2xl p-3 mb-5 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-oasis-spring flex-shrink-0" />
                <div>
                  <p className="text-xs text-moon">Your trip date</p>
                  <p className="text-sm font-bold text-white">
                    {selectedDate ? formatDate(new Date(selectedDate)) : '—'} · {guests} {guests === 1 ? 'guest' : 'guests'}
                  </p>
                </div>
              </div>

              <div className="bg-lifted rounded-2xl p-4 border border-white/10 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-oasis-spring flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">Secure Payment</p>
                    <p className="text-xs text-moon mt-0.5">Enter your card details to complete the booking.</p>
                  </div>
                </div>

                <PaymentForm
                  itemType="tour"
                  itemId={(tour as any)._id || tour.id}
                  quantity={guests}
                  bookingId={bookingId}
                  amount={total}
                  lang={lang}
                  onSuccess={(mockId) => {
                    setTimeout(() => {
                      window.location.href = `/payment-success?id=${mockId}&status=paid&type=tour`;
                    }, 2000);
                  }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {formError && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200">{formError}</p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-white/5 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => { setFormError(''); setStep((s) => s - 1); }}
              disabled={isBooking}
              className="flex items-center gap-1 px-4 py-3 rounded-xl border border-white/10 bg-lifted text-moon font-semibold hover:border-oasis-spring/30 transition disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 3 && (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-oasis-spring text-midnight font-bold rounded-xl hover:opacity-90 transition active:scale-95 disabled:opacity-60 shadow-mint-glow"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
