import React, { useState } from 'react';
import { Clock, Loader2, AlertCircle, Sparkles, Utensils, Landmark, Trees, ShoppingBag, Ticket, Coffee, Footprints, Car, Gem, Rocket, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui';
import { SmartProfile } from '../types/index';
import { authAPI } from '../services/api';

export const SmartProfileScreen = ({ onComplete, t }: { onComplete: (p: SmartProfile) => void, t: any }) => {
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState<'free' | 'low' | 'medium' | 'high'>('medium');
  const [hours, setHours] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const interestOptions = [
    { id: 'Food', label: t.mood?.interestFood || 'Food', icon: <Utensils className="w-4 h-4" /> },
    { id: 'Culture', label: t.mood?.interestCulture || 'Culture', icon: <Landmark className="w-4 h-4" /> },
    { id: 'Nature', label: t.mood?.interestNature || 'Nature', icon: <Trees className="w-4 h-4" /> },
    { id: 'Shopping', label: t.mood?.interestShopping || 'Shopping', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'Adventure', label: t.mood?.interestAdventure || 'Adventure', icon: <Rocket className="w-4 h-4" /> },
    { id: 'Cafe', label: t.mood?.interestCafe || 'Cafe', icon: <Coffee className="w-4 h-4" /> }
  ];

  const budgetOptions = [
    { val: 'free', label: t.mood?.budgetFree || 'Free', desc: t.mood?.budgetFreeDesc || 'No cost', icon: <Sparkles className="w-6 h-6 mx-auto mb-1" /> },
    { val: 'low', label: t.mood?.budgetLow || 'Budget', desc: t.mood?.budgetLowDesc || '< 100 SAR', icon: <Footprints className="w-6 h-6 mx-auto mb-1" /> },
    { val: 'medium', label: t.mood?.budgetMedium || 'Mid-range', desc: t.mood?.budgetMediumDesc || '100-300', icon: <Car className="w-6 h-6 mx-auto mb-1" /> },
    { val: 'high', label: t.mood?.budgetHigh || 'Premium', desc: t.mood?.budgetHighDesc || '300+', icon: <Gem className="w-6 h-6 mx-auto mb-1" /> }
  ];

  const toggleInterest = (i: string) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const isFormValid = interests.length > 0;

  const handleStartExploring = async () => {
    if (!isFormValid) {
      setError('Please select at least one interest');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const payload: Partial<SmartProfile> = {
        interests,
        preferredBudget: budget,
        typicalFreeTimeWindow: Math.round(hours * 60),
        activityStyles: [],
        city: 'Riyadh'
      };

      const token = localStorage.getItem('token');
      if (token) {
        await authAPI.updateSmartProfile(payload);
      }
      onComplete(payload as SmartProfile);

    } catch (err: any) {
      const details = err.response?.data?.details;
      if (details) {
        const errorMsg = Array.isArray(details)
          ? details.map((d: any) => `${d.field ? `${d.field}: ` : ''}${d.message}`).join(', ')
          : JSON.stringify(details);
        setError(errorMsg);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight text-white flex flex-col overflow-y-auto no-scrollbar">

      {/* Header (App Style) */}
      <div className="flex-shrink-0 bg-gradient-to-br from-midnight via-chamber to-midnight border-b border-white/5 pt-12 pb-6 px-6 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-lifted rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-black/20">
            <Sparkles className="text-oasis-spring w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-tight">
              {t.profile?.title || 'Smart Profile'}
            </h1>
            <p className="text-moon/60 text-[10px] font-bold tracking-widest uppercase mt-0.5">
              Personalize Your Micro-Escape
            </p>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 py-8">

        {/* Hero Section */}
        <div className="flex flex-col justify-center animate-in fade-in slide-in-from-left-4 duration-700">
          <h2 className="text-4xl md:text-5xl font-black leading-[1.1] mb-6 text-white tracking-tighter">
            {t.profile?.heroTitle || 'Craft Your Perfect Day'}
          </h2>
          <p className="text-moon/70 text-base md:text-lg mb-8 max-w-md leading-relaxed font-bold">
            {t.profile?.desc || 'Tell us what you like, and we will generate personalized experiences tailored just for you.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Smart recommendations',
              'Instant planning',
              'Based on your vibe',
              'Real-time updates'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                <div className="w-2 h-2 rounded-full bg-oasis-spring shadow-mint-glow" />
                <span className="text-xs text-moon font-black uppercase tracking-wider">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-chamber border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="space-y-8">
            {/* Interests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase text-moon/40 font-black tracking-[0.2em]">{t.profile?.interestsLabel || 'Interests'}</p>
                <span className="text-[9px] bg-white/5 px-2 py-1 rounded-lg text-moon/40 font-black">{interests.length} Selected</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {interestOptions.map(opt => {
                  const selected = interests.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleInterest(opt.id)}
                      className={`px-5 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-black transition-all duration-300 border
                        ${selected
                          ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow scale-[1.03]'
                          : 'bg-lifted/50 text-moon/60 border-white/5 hover:border-white/20 hover:bg-lifted'
                        }`}
                    >
                      <span className={selected ? 'text-midnight' : 'text-oasis-spring/60'}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-4">
              <p className="text-[10px] uppercase text-moon/40 font-black tracking-[0.2em]">{t.profile?.budgetLabel || 'Budget Level'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {budgetOptions.map(opt => {
                  const selected = budget === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => setBudget(opt.val as any)}
                      className={`p-4 rounded-2xl text-center transition-all duration-300 border group
                        ${selected
                          ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow scale-[1.03]'
                          : 'bg-lifted/50 text-moon/60 border-white/5 hover:border-white/20 hover:bg-lifted'
                        }`}
                    >
                      <div className={`mb-2 transition-transform duration-500 ${selected ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {opt.icon}
                      </div>
                      <div className="font-black text-xs tracking-tight">{opt.label}</div>
                      <div className={`text-[8px] font-bold mt-0.5 uppercase tracking-wider ${selected ? 'text-midnight/60' : 'text-moon/30'}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase text-moon/40 font-black tracking-[0.2em]">{t.profile?.freeTimeLabel || 'Free Time'}</p>
                <span className="text-lg font-black text-oasis-spring tracking-tighter">{hours}h</span>
              </div>
              <div className="bg-lifted/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <Clock className="text-oasis-spring w-5 h-5 shrink-0 opacity-50" />
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value))}
                  className="flex-1 accent-oasis-spring h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-400/10 border border-red-400/20 text-red-400 p-4 rounded-2xl flex gap-3 items-center animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold leading-snug">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleStartExploring}
              disabled={!isFormValid || isLoading}
              className={`w-full py-4.5 rounded-2xl font-black flex justify-center items-center gap-3 transition-all duration-500 shadow-2xl relative overflow-hidden group
                ${isFormValid
                  ? 'bg-oasis-spring text-midnight shadow-mint-glow hover:scale-[1.02] active:scale-95'
                  : 'bg-white/5 text-moon/20 cursor-not-allowed border border-white/5'
                }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span className="tracking-widest uppercase text-xs">Processing...</span>
                </>
              ) : (
                <>
                  <span className="tracking-widest uppercase text-xs">
                    {t.profile?.startExploring || 'Start Exploring'}
                  </span>
                  <Rocket className={`w-5 h-5 transition-transform duration-500 ${isFormValid ? 'group-hover:translate-x-1 group-hover:-translate-y-1' : ''}`} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartProfileScreen;