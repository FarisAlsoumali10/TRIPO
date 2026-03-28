import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { SmartProfile, BudgetLevel } from '../types/index';
import { authAPI } from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete: (prefs: SmartProfile) => void;
}

// ── Static data ──────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  { id: 'Nature',    label: 'Nature',    emoji: '🌿' },
  { id: 'History',   label: 'History',   emoji: '🏛️' },
  { id: 'Food',      label: 'Food',      emoji: '🍽️' },
  { id: 'Shopping',  label: 'Shopping',  emoji: '🛍️' },
  { id: 'Adventure', label: 'Adventure', emoji: '🧗' },
  { id: 'Culture',   label: 'Culture',   emoji: '🎭' },
  { id: 'Family',    label: 'Family',    emoji: '👨‍👩‍👧' },
];

interface BudgetOption {
  val: BudgetLevel;
  label: string;
  symbol: string;
  desc: string;
}

const BUDGET_OPTIONS: BudgetOption[] = [
  { val: 'free',   label: 'Free',      symbol: '🆓', desc: 'No cost activities' },
  { val: 'low',    label: 'Budget',    symbol: '＄',  desc: 'Under 100 SAR' },
  { val: 'medium', label: 'Mid-range', symbol: '＄＄', desc: '100 – 300 SAR' },
  { val: 'high',   label: 'Premium',   symbol: '＄＄＄', desc: '300+ SAR' },
];

// ── Progress dots ─────────────────────────────────────────────────────────────

const ProgressDots = ({ step, total }: { step: number; total: number }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-300 ${
          i < step
            ? 'w-6 h-2 bg-emerald-600'
            : i === step
            ? 'w-6 h-2 bg-emerald-400'
            : 'w-2 h-2 bg-slate-200'
        }`}
      />
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep]             = useState(0); // 0 = interests, 1 = budget, 2 = welcome
  const [direction, setDirection]   = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating]   = useState(false);
  const [interests, setInterests]   = useState<string[]>([]);
  const [budget, setBudget]         = useState<BudgetLevel>('medium');
  const [saving, setSaving]         = useState(false);

  const TOTAL_STEPS = 3;

  // ── helpers ──────────────────────────────────────────────────────────────

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const goToStep = (next: number, dir: 'forward' | 'back' = 'forward') => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    // allow exit animation to run for 200ms then swap step
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  };

  const handleFinish = async () => {
    setSaving(true);
    const prefs: SmartProfile = {
      interests,
      preferredBudget: budget,
      activityStyles: [],
      typicalFreeTimeWindow: 120,
      city: 'Riyadh',
    };

    // Best-effort API call – do not block completion on failure
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await authAPI.updateSmartProfile(prefs);
      }
    } catch (_) {
      // silently ignore
    }

    localStorage.setItem('tripo_onboarded', 'true');
    setSaving(false);
    onComplete(prefs);
  };

  // ── slide transition classes ──────────────────────────────────────────────

  const slideClass = animating
    ? direction === 'forward'
      ? 'translate-x-8 opacity-0'
      : '-translate-x-8 opacity-0'
    : 'translate-x-0 opacity-100';

  // ── step content ─────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Step 0: Interests ─────────────────────────────────────────────────
      case 0:
        return (
          <div className={`transition-all duration-200 ease-out ${slideClass}`}>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1 text-center">
              What do you love?
            </h2>
            <p className="text-slate-500 text-center mb-7 text-sm">
              Pick your interests and we'll tailor your Tripo feed.
            </p>

            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {INTEREST_OPTIONS.map(opt => {
                const selected = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all duration-150 select-none
                      ${selected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-105'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-600'
                      }`}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToStep(1, 'forward')}
              disabled={interests.length === 0}
              className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all
                ${interests.length > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );

      // ── Step 1: Budget ────────────────────────────────────────────────────
      case 1:
        return (
          <div className={`transition-all duration-200 ease-out ${slideClass}`}>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1 text-center">
              What's your budget?
            </h2>
            <p className="text-slate-500 text-center mb-7 text-sm">
              We'll prioritize experiences that match your spend preference.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {BUDGET_OPTIONS.map(opt => {
                const selected = budget === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => setBudget(opt.val)}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 font-semibold transition-all
                      ${selected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md scale-[1.03]'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                      }`}
                  >
                    <span className="text-2xl mb-1">{opt.symbol}</span>
                    <span className="text-sm font-bold">{opt.label}</span>
                    <span className="text-xs text-slate-400 mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => goToStep(0, 'back')}
                className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
              >
                Back
              </button>
              <button
                onClick={() => goToStep(2, 'forward')}
                className="flex-[2] py-3.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all"
              >
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      // ── Step 2: Welcome ───────────────────────────────────────────────────
      case 2:
        return (
          <div className={`transition-all duration-200 ease-out ${slideClass}`}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
                You're all set!
              </h2>
              <p className="text-slate-500 text-base max-w-xs leading-relaxed">
                Tripo will personalize your feed based on your preferences.
              </p>
            </div>

            {/* Summary chips */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-8 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">Interests</span>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map(i => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide w-20 flex-shrink-0">Budget</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full capitalize">
                  {BUDGET_OPTIONS.find(b => b.val === budget)?.label}
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {saving ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Start Exploring
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ── overlay ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-center pt-10 pb-2 px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">Tripo</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="px-6 pt-4">
        <ProgressDots step={step} total={TOTAL_STEPS} />
      </div>

      {/* Step content — centred card */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 overflow-y-auto">
        <div className="w-full max-w-sm">
          {renderStep()}
        </div>
      </div>

      {/* Step counter at bottom */}
      <div className="pb-8 text-center">
        <span className="text-xs text-slate-400">
          Step {step + 1} of {TOTAL_STEPS}
        </span>
      </div>
    </div>
  );
};
