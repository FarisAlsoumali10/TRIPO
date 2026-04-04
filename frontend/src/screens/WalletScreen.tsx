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

const KARAM_LEVELS = [
  { min: 0,    max: 199,  label: 'Explorer',   color: '#64748b', bg: '#f8fafc', emoji: '🌱' },
  { min: 200,  max: 499,  label: 'Adventurer', color: '#10b981', bg: '#ecfdf5', emoji: '🌟' },
  { min: 500,  max: 999,  label: 'Pathfinder', color: '#6366f1', bg: '#eef2ff', emoji: '🥇' },
  { min: 1000, max: Infinity, label: 'Legend', color: '#f59e0b', bg: '#fffbeb', emoji: '💎' },
];

const EARN_WAYS = [
  { icon: '✍️', label: 'كتابة تقييم',     pts: '+50',  desc: 'لكل مكان أو جولة' },
  { icon: '🗺️', label: 'نشر رحلة',        pts: '+100', desc: 'عند نشر خط سير جديد' },
  { icon: '🤝', label: 'تقديم فزعة',       pts: 'متغير',desc: 'حسب قيمة الفزعة' },
  { icon: '📅', label: 'تسجيل دخول يومي',  pts: '+10',  desc: 'مرة يومياً كحد أقصى' },
  { icon: '✅', label: 'إتمام رحلة',       pts: '+75',  desc: 'عند إكمال رحلة مجموعة' },
  { icon: '👥', label: 'دعوة صديق',        pts: '+200', desc: 'عند انضمام صديقك' },
];

const SPEND_WAYS = [
  { icon: '🚨', label: 'مكافأة فزعة',   pts: 'متغير', desc: 'ادفع مكافأة لمن يساعدك' },
  { icon: '🏷️', label: 'خصومات الجولات', pts: 'قريباً', desc: 'استبدل نقاطك بخصم' },
  { icon: '🎁', label: 'هدايا المجتمع',  pts: 'قريباً', desc: 'أهدِ صديقاً نقاطاً' },
];

export const WalletScreen = ({ karamPoints, karamHistory, walletBalance = 0, t, lang }: WalletScreenProps) => {
  const [showAllHistory, setShowAllHistory] = useState(false);

  const currentLevel = KARAM_LEVELS.find(l => karamPoints >= l.min && karamPoints <= l.max) || KARAM_LEVELS[0];
  const nextLevel = KARAM_LEVELS[KARAM_LEVELS.indexOf(currentLevel) + 1];
  const progressToNext = nextLevel
    ? ((karamPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  const visibleHistory = showAllHistory ? karamHistory : karamHistory.slice(0, 5);

  return (
    <div className="min-h-full bg-slate-50 pb-28 overflow-y-auto">
      {/* Hero Balance Card */}
      <div
        className="mx-4 mt-6 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}
      >
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="relative">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">رصيد المحفظة</p>
          <p className="text-4xl font-black mb-0.5" style={{ direction: 'ltr' }}>{walletBalance.toFixed(2)} <span className="text-xl font-bold text-emerald-200">ر.س</span></p>
          <p className="text-emerald-200 text-xs mt-3">من الفزعات والمكافآت</p>
        </div>
      </div>

      {/* Karam Points Card */}
      <div className="mx-4 mt-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span className="font-black text-slate-800">نقاط الكرم</span>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-black"
            style={{ background: currentLevel.bg, color: currentLevel.color }}
          >
            {currentLevel.emoji} {currentLevel.label}
          </span>
        </div>

        <p className="text-4xl font-black text-amber-600 mb-4">{karamPoints.toLocaleString()}</p>

        {nextLevel && (
          <>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
              <span>{currentLevel.label}</span>
              <span>{nextLevel.min - karamPoints} نقطة للمستوى التالي</span>
              <span>{nextLevel.emoji} {nextLevel.label}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, progressToNext)}%`, background: currentLevel.color }}
              />
            </div>
          </>
        )}
        {!nextLevel && (
          <div className="flex items-center gap-2 text-amber-600 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" /> وصلت للمستوى الأعلى 🎉
          </div>
        )}
      </div>

      {/* How to Earn */}
      <div className="mx-4 mt-4">
        <h2 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" /> اكسب نقاط الكرم
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {EARN_WAYS.map(w => (
            <div key={w.label} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-start gap-3">
              <span className="text-2xl shrink-0">{w.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{w.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{w.desc}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full">{w.pts} نقطة</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Spend */}
      <div className="mx-4 mt-4">
        <h2 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-purple-600" /> استخدم نقاطك
        </h2>
        <div className="space-y-2">
          {SPEND_WAYS.map(w => (
            <div key={w.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
              <span className="text-2xl">{w.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-800">{w.label}</p>
                <p className="text-[10px] text-slate-400">{w.desc}</p>
              </div>
              <span className={`px-2 py-1 rounded-xl text-[10px] font-black ${w.pts === 'قريباً' ? 'bg-slate-100 text-slate-400' : 'bg-purple-50 text-purple-600'}`}>{w.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="mx-4 mt-4 mb-4">
        <h2 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" /> سجل النشاط
        </h2>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {karamHistory.length === 0 ? (
            <div className="text-center py-10">
              <Star className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-bold">لا يوجد سجل بعد</p>
              <p className="text-xs text-slate-300 mt-1">ابدأ بكتابة تقييم أو نشر رحلة</p>
            </div>
          ) : (
            <>
              {visibleHistory.map((h, i) => (
                <div key={h.id} className={`flex items-center gap-3 px-4 py-3 ${i < visibleHistory.length - 1 ? 'border-b border-slate-50' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${h.points > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {h.points > 0
                      ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                      : <ArrowUpCircle className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{h.label}</p>
                    <p className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className={`text-sm font-black shrink-0 ${h.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {h.points > 0 ? '+' : ''}{h.points}
                  </span>
                </div>
              ))}
              {karamHistory.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(v => !v)}
                  className="w-full py-3 text-xs font-black text-emerald-600 flex items-center justify-center gap-1 border-t border-slate-50"
                >
                  {showAllHistory ? <><ChevronUp className="w-3.5 h-3.5" /> عرض أقل</> : <><ChevronDown className="w-3.5 h-3.5" /> عرض الكل ({karamHistory.length})</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
