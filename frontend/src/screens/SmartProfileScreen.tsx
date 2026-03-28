import React, { useState } from 'react';
import { Clock, Loader2, AlertCircle, Sparkles, Utensils, Landmark, Trees, ShoppingBag, Ticket, Coffee, Footprints, Car, Gem, Rocket } from 'lucide-react';
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
    { id: 'Food', label: 'Food', icon: <Utensils className="w-4 h-4" /> },
    { id: 'Culture', label: 'Culture', icon: <Landmark className="w-4 h-4" /> },
    { id: 'Nature', label: 'Nature', icon: <Trees className="w-4 h-4" /> },
    { id: 'Shopping', label: 'Shopping', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'Entertainment', label: 'Entertainment', icon: <Ticket className="w-4 h-4" /> },
    { id: 'Cafe', label: 'Cafe', icon: <Coffee className="w-4 h-4" /> }
  ];

  const budgetOptions = [
    { val: 'free', label: 'Free', desc: 'No cost', icon: <Sparkles className="w-6 h-6 mx-auto mb-1" /> },
    { val: 'low', label: '$', desc: '< 100 SAR', icon: <Footprints className="w-6 h-6 mx-auto mb-1" /> },
    { val: 'medium', label: '$$', desc: '100-300', icon: <Car className="w-6 h-6 mx-auto mb-1" /> },
    { val: 'high', label: '$$$', desc: '300+', icon: <Gem className="w-6 h-6 mx-auto mb-1" /> }
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
    <div className="min-h-screen bg-white text-slate-800">

      {/* Top Navbar (Web feel) */}
      <div className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="text-emerald-600" />
            <span>Smart Explorer</span>
          </div>
          <div className="text-sm text-slate-400 hidden md:block">
            Personalize your experience
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 px-6 py-10">

        {/* Left Side (Hero / Info) */}
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-extrabold leading-tight mb-6 text-slate-800">
            {t.profileTitle || 'Craft Your Perfect Day'}
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-lg">
            {t.profileDesc || 'Tell us what you like, and we will generate personalized experiences tailored just for you.'}
          </p>

          <div className="space-y-4 text-sm text-slate-500">
            <div>✨ Smart recommendations</div>
            <div>⚡ Instant planning</div>
            <div>📍 Based on your vibe</div>
          </div>
        </div>

        {/* Right Side (Card Form) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md space-y-8">

          {/* Interests */}
          <div>
            <p className="text-xs uppercase text-slate-500 mb-4">Interests</p>
            <div className="flex flex-wrap gap-3">
              {interestOptions.map(opt => {
                const selected = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all
                      ${selected
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white scale-105 shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div>
            <p className="text-xs uppercase text-slate-500 mb-4">Budget</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {budgetOptions.map(opt => {
                const selected = budget === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => setBudget(opt.val as any)}
                    className={`p-4 rounded-xl text-center transition-all border
                      ${selected
                        ? 'bg-white text-black shadow-lg scale-105'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    <div>{opt.icon}</div>
                    <div className="font-bold">{opt.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time */}
          <div>
            <p className="text-xs uppercase text-slate-500 mb-4">Time</p>
            <div className="flex items-center gap-4">
              <Clock className="text-emerald-600" />
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="font-bold">{hours}h</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex gap-2 items-center">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Button */}
          <Button
            onClick={handleStartExploring}
            disabled={!isFormValid || isLoading}
            className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all
              ${isFormValid
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:scale-105'
                : 'bg-slate-100 text-slate-400'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                {t.startExploring || 'Start Exploring'} <Rocket className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};