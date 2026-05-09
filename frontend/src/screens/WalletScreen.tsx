import React, { useState } from 'react';
import { Star, TrendingUp, ArrowDownCircle, ArrowUpCircle, Gift, Zap, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface KaramEntry {
  id: string;
  action: string;
  points: number;
  label: string;
  timestamp: number;
}

interface WalletScreenProps {
  karamPoints: number;
  karamHistory: KaramEntry[];
  walletBalance?: number;
  t: any;
  lang?: string;
}

const getKaramLevels = (t: any) => [
  { min: 0,    max: 199,  label: t.karam.explorer,   color: '#B8C2D6', bg: 'rgba(184,194,214,0.1)', emoji: '🌱' },
  { min: 200,  max: 499,  label: t.karam.adventurer, color: '#7CF7C8', bg: 'rgba(124,247,200,0.1)', emoji: '🌟' },
  { min: 500,  max: 999,  label: t.karam.pathfinder, color: '#6366f1', bg: 'rgba(99,102,241,0.1)',   emoji: '🥇' },
  { min: 1000, max: Infinity, label: t.karam.legend, color: '#F7C948', bg: 'rgba(247,201,72,0.1)',   emoji: '💎' },
];

const getEarnWays = (t: any) => [
  { icon: '✍️', label: t.karam.earnReview,     pts: '+50',  desc: t.karam.earnReviewDesc },
  { icon: '🗺️', label: t.karam.earnTrip,        pts: '+100', desc: t.karam.earnTripDesc },
  { icon: '🤝', label: t.karam.earnFaza,       pts: t.karam.variable || 'Varies', desc: t.karam.earnFazaDesc },
  { icon: '📅', label: t.karam.earnDaily,      pts: '+10',  desc: t.karam.earnDailyDesc },
  { icon: '✅', label: t.karam.earnComplete,    pts: '+75',  desc: t.karam.earnCompleteDesc },
  { icon: '👥', label: t.karam.earnInvite,      pts: '+200', desc: t.karam.earnInviteDesc },
];

const getSpendWays = (t: any) => [
  { icon: '🚨', label: t.karam.spendFaza,   pts: t.karam.variable || 'Varies', desc: t.karam.spendFazaDesc },
  { icon: '🏷️', label: t.karam.spendDiscount, pts: t.karam.comingSoon, desc: t.karam.spendDiscountDesc },
  { icon: '🎁', label: t.karam.spendGift,  pts: t.karam.comingSoon, desc: t.karam.spendGiftDesc },
];

export const WalletScreen = ({ karamPoints, karamHistory, walletBalance = 0, t, lang }: WalletScreenProps) => {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const isRTL = lang === 'ar';
  const KARAM_LEVELS = getKaramLevels(t);
  const EARN_WAYS = getEarnWays(t);
  const SPEND_WAYS = getSpendWays(t);

  const currentLevel = KARAM_LEVELS.find(l => karamPoints >= l.min && karamPoints <= l.max) || KARAM_LEVELS[0];
  const nextLevel = KARAM_LEVELS[KARAM_LEVELS.indexOf(currentLevel) + 1];
  const progressToNext = nextLevel
    ? ((karamPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  const visibleHistory = showAllHistory ? karamHistory : karamHistory.slice(0, 5);

  return (
    <div className="min-h-full bg-white dark:bg-navy-900 pb-28 overflow-y-auto no-scrollbar transition-colors duration-300">
      {/* Hero Balance Card */}
      <div
        className="mx-4 mt-6 rounded-3xl p-6 text-midnight shadow-mint-glow relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7CF7C8,#4ade80)' }}
      >
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white dark:bg-navy-900/20 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white dark:bg-navy-900/20 rounded-full" />
        <div className="relative">
          <p className="text-midnight/60 text-xs font-bold uppercase tracking-widest mb-1">{t.karam.walletBalance}</p>
          <p className={`text-4xl font-black mb-0.5 ${isRTL ? 'text-right' : 'text-left'}`} style={{ direction: 'ltr' }}>{walletBalance.toFixed(2)} <span className="text-xl font-bold text-midnight/40">SAR</span></p>
          <p className="text-midnight/40 text-xs mt-3">{t.karam.fromFaza}</p>
          <div className={`flex gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'tours' }))}
              className="flex-1 py-2.5 bg-midnight text-oasis-spring font-black text-xs rounded-2xl active:scale-95 transition-transform shadow-md"
            >
              Book a Tour →
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'rentals' }))}
              className="flex-1 py-2.5 bg-midnight/10 text-midnight font-black text-xs rounded-2xl active:scale-95 transition-transform border border-midnight/10"
            >
              Find a Stay →
            </button>
          </div>
        </div>
      </div>

      {/* Karam Points Card */}
      <div className="mx-4 mt-4 bg-white dark:bg-navy-900 rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm dark:shadow-black/30 p-5 transition-colors">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Star className="w-5 h-5 text-karam fill-karam" />
            <span className="font-black text-slate-900 dark:text-white">{t.karam.pointsTitle}</span>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-black"
            style={{ background: currentLevel.bg, color: currentLevel.color }}
          >
            {currentLevel.emoji} {currentLevel.label}
          </span>
        </div>

        <p className="text-4xl font-black text-karam mb-4">{karamPoints.toLocaleString()}</p>

        {nextLevel && (
          <>
            <div className={`flex justify-between text-[10px] text-slate-500 dark:text-slate-500 font-bold mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>{currentLevel.label}</span>
              <span>{nextLevel.min - karamPoints} {t.karam.pointsSubtitle}</span>
              <span>{nextLevel.emoji} {nextLevel.label}</span>
            </div>
            <div className="h-2 bg-white dark:bg-navy-900/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, progressToNext)}%`, background: currentLevel.color }}
              />
            </div>
          </>
        )}
        {!nextLevel && (
          <div className={`flex items-center gap-2 text-karam text-sm font-bold ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <CheckCircle2 className="w-4 h-4" /> {t.karam.topLevelReached}
          </div>
        )}
      </div>

      {/* How to Earn */}
      <div className="mx-4 mt-4">
        <h2 className={`font-black text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <TrendingUp className="w-4 h-4 text-oasis-spring" /> {t.karam.howToEarn}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {EARN_WAYS.map(w => (
            <div key={w.label} className={`bg-white dark:bg-navy-900 rounded-2xl border border-slate-100 dark:border-white/8 p-3 flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <span className="text-2xl shrink-0">{w.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{w.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{w.desc}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 bg-karam/10 text-karam text-[10px] font-black rounded-full`}>{w.pts} {t.karam.pts}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Spend */}
      <div className="mx-4 mt-4">
        <h2 className={`font-black text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <Gift className="w-4 h-4 text-purple-400" /> {t.karam.howToSpend}
        </h2>
        <div className="space-y-2">
          {SPEND_WAYS.map(w => (
            <div key={w.label} className={`bg-white dark:bg-navy-900 rounded-2xl border border-slate-100 dark:border-white/8 p-4 flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <span className="text-2xl">{w.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900 dark:text-white">{w.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500">{w.desc}</p>
              </div>
              <span className={`px-2 py-1 rounded-xl text-[10px] font-black ${w.pts === t.karam.comingSoon ? 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500' : 'bg-purple-500/10 text-purple-400'}`}>{w.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="mx-4 mt-4 mb-4">
        <h2 className={`font-black text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <Zap className="w-4 h-4 text-blue-400" /> {t.karam.activityHistory}
        </h2>
        <div className="bg-white dark:bg-navy-900 rounded-3xl border border-slate-100 dark:border-white/8 shadow-sm dark:shadow-black/30 overflow-hidden">
          {karamHistory.length === 0 ? (
            <div className="text-center py-10">
              <Star className="w-8 h-8 text-moon/10 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-500 font-bold">{t.karam.noHistory}</p>
              <p className="text-xs text-slate-500/40 dark:text-slate-500/40 mt-1">{t.karam.startEarning}</p>
            </div>
          ) : (
            <>
              {visibleHistory.map((h, i) => (
                <div key={h.id} className={`flex items-center gap-3 px-4 py-3 ${isRTL ? 'flex-row-reverse text-right' : ''} ${i < visibleHistory.length - 1 ? 'border-b border-slate-100 dark:border-white/8' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${h.points > 0 ? 'bg-oasis-spring/10' : 'bg-red-500/10'}`}>
                    {h.points > 0
                      ? <ArrowDownCircle className="w-4 h-4 text-oasis-spring" />
                      : <ArrowUpCircle className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{h.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">{new Date(h.timestamp).toLocaleDateString(isRTL ? 'ar-SA' : 'en-SA')}</p>
                  </div>
                  <span className={`text-sm font-black shrink-0 ${h.points > 0 ? 'text-oasis-spring' : 'text-red-500'}`}>
                    {h.points > 0 ? '+' : ''}{h.points}
                  </span>
                </div>
              ))}
              {karamHistory.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(v => !v)}
                  className="w-full py-3 text-xs font-black text-oasis-spring flex items-center justify-center gap-1 border-t border-slate-100 dark:border-white/8"
                >
                  {showAllHistory ? <><ChevronUp className="w-3.5 h-3.5" /> {t.karam.viewLess}</> : <><ChevronDown className="w-3.5 h-3.5" /> {t.karam.viewMore} ({karamHistory.length})</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
