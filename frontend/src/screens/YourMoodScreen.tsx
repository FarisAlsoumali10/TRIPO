// frontend/src/screens/YourMoodScreen.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Star, MapPin, Clock, ChevronRight, ChevronLeft, Pencil, Sparkles, Compass,
  Heart, X, RefreshCw, Flame, Zap,
} from 'lucide-react';
import { User, Place, Tour, Rental } from '../types/index';
import { placeAPI, tourAPI, rentalAPI } from '../services/api';
import { showToast } from '../components/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  { id: 'Nature', labelAr: 'طبيعة', emoji: '🌿', tKey: 'interestNature' },
  { id: 'Heritage', labelAr: 'تراث', emoji: '🏛️', tKey: 'interestHeritage' },
  { id: 'Adventure', labelAr: 'مغامرة', emoji: '🧗', tKey: 'interestAdventure' },
  { id: 'Food', labelAr: 'مأكولات', emoji: '🍽️', tKey: 'interestFood' },
  { id: 'Beach', labelAr: 'شاطئ', emoji: '🏖️', tKey: 'interestBeach' },
  { id: 'Sports', labelAr: 'رياضة', emoji: '⚽', tKey: 'interestSports' },
  { id: 'Culture', labelAr: 'ثقافة', emoji: '🎭', tKey: 'interestCulture' },
  { id: 'Urban', labelAr: 'مدني', emoji: '🏙️', tKey: 'interestUrban' },
  { id: 'Nightlife', labelAr: 'ليلية', emoji: '🌙', tKey: 'interestNightlife' },
];

const BUDGET_OPTIONS = [
  { val: 'free', labelAr: 'مجاني', tKey: 'budgetFree', descKey: 'budgetFreeDesc', symbol: 'Free' },
  { val: 'low', labelAr: 'منخفض', tKey: 'budgetLow', descKey: 'budgetLowDesc', symbol: '＄' },
  { val: 'medium', labelAr: 'متوسط', tKey: 'budgetMedium', descKey: 'budgetMediumDesc', symbol: '＄＄' },
  { val: 'high', labelAr: 'مرتفع', tKey: 'budgetHigh', descKey: 'budgetHighDesc', symbol: '＄＄＄' },
];

const VIBE_OPTIONS = [
  { val: 'chill', labelAr: 'هادئ', tKey: 'vibeChill', emoji: '😌', color: 'from-blue-400 to-cyan-400' },
  { val: 'active', labelAr: 'نشيط', tKey: 'vibeActive', emoji: '🏃', color: 'from-orange-400 to-amber-400' },
  { val: 'cultural', labelAr: 'ثقافي', tKey: 'vibeCultural', emoji: '🔍', color: 'from-purple-400 to-violet-400' },
  { val: 'social', labelAr: 'اجتماعي', tKey: 'vibeSocial', emoji: '🎉', color: 'from-pink-400 to-rose-400' },
];

const GROUP_OPTIONS = [
  { val: 'solo', emoji: '🧍', label: 'Just Me', labelAr: 'أنا فقط' },
  { val: 'partner', emoji: '💑', label: 'Partner', labelAr: 'مع شريك' },
  { val: 'friends', emoji: '👫', label: 'Friends', labelAr: 'أصدقاء' },
  { val: 'family', emoji: '👨‍👩‍👧', label: 'Family', labelAr: 'عائلة' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoodPrefs {
  date: string;
  interests: string[];
  budget: string;
  hours: number;
  vibe: string;
  group?: string;
  isSurprise?: boolean;
}

// ─── Local Storage (For daily transient streak data ONLY) ───────────────────

const MOOD_KEY = 'tripo_mood';
const STREAK_KEY = 'tripo_mood_streak_dates';

const todayStr = () => new Date().toISOString().split('T')[0];

function loadPrefs(): MoodPrefs | null {
  try {
    const raw = localStorage.getItem(MOOD_KEY);
    if (!raw) return null;
    const p: MoodPrefs = JSON.parse(raw);
    return p.date === todayStr() ? p : null;
  } catch { return null; }
}

function savePrefs(p: MoodPrefs) {
  localStorage.setItem(MOOD_KEY, JSON.stringify({ ...p, date: todayStr() }));
}

function loadStreakDates(): string[] {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '[]'); } catch { return []; }
}

function recordToday() {
  const today = todayStr();
  const dates = loadStreakDates();
  if (!dates.includes(today)) {
    const updated = [...dates.slice(-29), today];
    localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  }
}

function computeStreak(dates: string[]): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() - i);
    const ds = copy.toISOString().split('T')[0];
    if (dates.includes(ds)) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function pct(score: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.round((score / max) * 90 + (score > 0 ? 10 : 0)));
}

type ScoredPlace = { place: Place; score: number; matchPct: number };
type ScoredTour = { tour: Tour; score: number; matchPct: number };
type ScoredRental = { rental: Rental; score: number; matchPct: number };

function scoredPlacesAll(places: Place[], prefs: MoodPrefs): ScoredPlace[] {
  if (prefs.isSurprise) {
    return [...places]
      .sort((a, b) => (b.ratingSummary?.avgRating ?? 0) - (a.ratingSummary?.avgRating ?? 0))
      .slice(0, 12)
      .map(place => ({ place, score: 3, matchPct: 85 }));
  }
  const maxScore = Math.max(prefs.interests.length, 1);
  return [...places]
    .map(p => {
      const tags = [...(p.categoryTags || []), p.category || ''].map(t => t.toLowerCase());
      const score = prefs.interests.filter(i => tags.some(t => t.includes(i.toLowerCase()))).length;
      return { place: p, score, matchPct: pct(score, maxScore) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.place.ratingSummary?.avgRating ?? 0) - (a.place.ratingSummary?.avgRating ?? 0));
}

const VIBE_MAP: Record<string, string[]> = {
  chill: ['heritage', 'culture', 'food', 'urban'],
  active: ['adventure', 'nature', 'hiking', 'desert'],
  cultural: ['heritage', 'history', 'culture', 'traditional'],
  social: ['group', 'food', 'community', 'fun'],
};

function scoredToursAll(tours: Tour[], prefs: MoodPrefs): ScoredTour[] {
  const vibeKeywords = VIBE_MAP[prefs.vibe] || [];
  if (prefs.isSurprise) {
    return [...tours]
      .filter(t => prefs.group !== 'family' || t.difficulty !== 'challenging')
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 8)
      .map(tour => ({ tour, score: 3, matchPct: 85 }));
  }
  const maxScore = Math.max(prefs.interests.length * 2 + vibeKeywords.length, 1);
  return [...tours]
    .filter(t => prefs.group !== 'family' || t.difficulty !== 'challenging')
    .map(t => {
      const haystack = [t.category || '', t.title || '', ...(t.tags || [])].join(' ').toLowerCase();
      const iScore = prefs.interests.filter(i => haystack.includes(i.toLowerCase())).length * 2;
      const vScore = vibeKeywords.filter(k => haystack.includes(k)).length;
      const score = iScore + vScore;
      return { tour: t, score, matchPct: pct(score, maxScore) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (Number(b.tour.rating) || 0) - (Number(a.tour.rating) || 0));
}

function scoredRentalsAll(rentals: Rental[], sports: Rental[], prefs: MoodPrefs): ScoredRental[] {
  const wantsSports = prefs.interests.includes('Sports');
  const wantsNightlife = prefs.interests.includes('Nightlife');
  const pool = wantsSports ? [...sports, ...rentals] : rentals;
  const budgetMax: Record<string, number> = { free: 0, low: 100, medium: 300, high: 99999 };
  const max = budgetMax[prefs.budget] ?? 99999;
  return pool
    .filter(r => prefs.budget === 'free' ? (Number(r.price) || 0) === 0 : (Number(r.price) || 0) <= max || prefs.budget === 'high')
    .map(r => {
      const haystack = [r.type || '', r.title || ''].join(' ').toLowerCase();
      const iScore = prefs.interests.filter(i => haystack.includes(i.toLowerCase())).length;
      const nightBonus = wantsNightlife ? 1 : 0;
      const score = iScore + nightBonus + 1;
      const matchPct = Math.min(95, 45 + (iScore * 15) + (r.rating ?? 0) * 5);
      return { rental: r, score, matchPct: Math.round(matchPct) };
    })
    .sort((a, b) => b.score - a.score || (b.rental.rating ?? 0) - (a.rental.rating ?? 0));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const getGreeting = (t?: any) => {
  const h = new Date().getHours();
  if (h < 12) return t?.goodMorning || 'Good morning';
  if (h < 17) return t?.goodAfternoon || 'Good afternoon';
  return t?.goodEvening || 'Good evening';
};

function getContextualLine(ar: boolean): string {
  const day = new Date().getDay();
  const hour = new Date().getHours();
  if (ar) {
    if (day === 5) return "الجمعة هنا — وقت مثالي لرحلة! 🚗";
    if (day === 6) return "طاقة الويكند موجودة ✨";
    if (day === 0) return "استمتع بيوم الأحد 🌟";
    if (hour < 10) return "صباح رائع لتخطيط مغامرة! ☀️";
    if (hour >= 20) return "أمسية مثالية تنتظرك 🌙";
    return "مستعد لمغامرة اليوم؟ 🗺️";
  }
  if (day === 5) return "It's Friday — perfect for a day trip! 🚗";
  if (day === 6) return "Weekend energy is here ✨";
  if (day === 0) return "Make the most of your Sunday 🌟";
  if (hour < 10) return "Great morning to plan an adventure! ☀️";
  if (hour >= 20) return "A perfect evening outing awaits 🌙";
  return "Ready for today's adventure? 🗺️";
}

const vibeGradient: Record<string, string> = {
  chill: 'from-blue-600 via-cyan-500 to-teal-500',
  active: 'from-orange-500 via-amber-500 to-yellow-400',
  cultural: 'from-purple-600 via-violet-500 to-indigo-500',
  social: 'from-pink-500 via-rose-500 to-red-400',
  default: 'from-emerald-600 via-teal-500 to-cyan-500',
};

const STEP_LABELS_EN = ['Interests', 'Vibe', 'Group', 'Budget', 'Time'];
const STEP_LABELS_AR = ['الاهتمامات', 'المزاج', 'المجموعة', 'الميزانية', 'الوقت'];

// ─── Main component ───────────────────────────────────────────────────────────

export const YourMoodScreen = ({ user, onNavigate, t, lang }: { user: User; onNavigate?: (tab: string, id?: string) => void; t?: any; lang?: 'en' | 'ar' }) => {
  const ar = lang === 'ar';
  const STEP_LABELS = ar ? STEP_LABELS_AR : STEP_LABELS_EN;
  const [prefs, setPrefs] = useState<MoodPrefs | null>(() => loadPrefs());
  const [editing, setEditing] = useState(!loadPrefs());

  const [step, setStep] = useState(0);

  const [interests, setInterests] = useState<string[]>(prefs?.interests || []);
  const [budget, setBudget] = useState(prefs?.budget || 'medium');
  const [hours, setHours] = useState(prefs?.hours || 3);
  const [vibe, setVibe] = useState(prefs?.vibe || '');
  const [group, setGroup] = useState(prefs?.group || 'solo');

  // Backend Data
  const [places, setPlaces] = useState<Place[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(false);

  // Network Saved State
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savedTourIds, setSavedTourIds] = useState<Set<string>>(new Set());
  const [savedRentalIds, setSavedRentalIds] = useState<Set<string>>(new Set());

  // Results UX
  const [activeTab, setActiveTab] = useState<'all' | 'places' | 'tours' | 'rentals'>('all');
  const [dismissedPlaceIds, setDismissedPlaceIds] = useState<Set<string>>(new Set());
  const [dismissedTourIds, setDismissedTourIds] = useState<Set<string>>(new Set());
  const [dismissedRentalIds, setDismissedRentalIds] = useState<Set<string>>(new Set());

  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledPlaces, setShuffledPlaces] = useState<ScoredPlace[]>([]);
  const [shuffledTours, setShuffledTours] = useState<ScoredTour[]>([]);
  const [shuffledRentals, setShuffledRentals] = useState<ScoredRental[]>([]);

  // Streak tracker
  const streakDates = useMemo(() => loadStreakDates(), [prefs]);
  const streakCount = useMemo(() => computeStreak(streakDates), [streakDates]);
  const last7Days = useMemo(() => getLast7Days(), []);

  // Fetch real data on mount (No Mock Fallbacks)
  useEffect(() => {
    if (prefs) {
      setLoading(true);
      Promise.allSettled([
        placeAPI.getPlaces(),
        tourAPI.getTours(),
        rentalAPI.getRentals(),
        placeAPI.getSavedPlaces(),
        tourAPI.getSavedTours(),
        // rentalAPI.getSavedRentals() // Ensure rentalAPI exports this if supported
      ])
        .then(([p, tt, r, sp, st]) => {
          setPlaces(p.status === 'fulfilled' ? p.value : []);
          setTours(tt.status === 'fulfilled' ? tt.value : []);
          setRentals(r.status === 'fulfilled' ? r.value : []);

          if (sp.status === 'fulfilled') setSavedPlaceIds(new Set(sp.value || []));
          if (st.status === 'fulfilled') setSavedTourIds(new Set(st.value || []));
        })
        .finally(() => setLoading(false));
    }
  }, [prefs]);

  useEffect(() => { setIsShuffled(false); }, [prefs, places, tours, rentals]);

  // ── Scoring ──────────────────────────────────────────────────────────────────
  const allScoredPlaces = useMemo(() => prefs ? scoredPlacesAll(places, prefs) : [], [places, prefs]);
  const allScoredTours = useMemo(() => prefs ? scoredToursAll(tours, prefs) : [], [tours, prefs]);
  const allScoredRentals = useMemo(() => prefs ? scoredRentalsAll(rentals, [], prefs) : [], [rentals, prefs]);

  const basePlaces = isShuffled ? shuffledPlaces : allScoredPlaces;
  const baseTours = isShuffled ? shuffledTours : allScoredTours;
  const baseRentals = isShuffled ? shuffledRentals : allScoredRentals;

  const visiblePlaces = basePlaces.filter(x => !dismissedPlaceIds.has(x.place._id || x.place.id || '')).slice(0, 6);
  const visibleTours = baseTours.filter(x => !dismissedTourIds.has(x.tour.id || (x.tour as any)._id || '')).slice(0, 4);
  const visibleRentals = baseRentals.filter(x => !dismissedRentalIds.has(x.rental.id || '')).slice(0, 4);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const toggleInterest = (id: string) =>
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = () => {
    if (!interests.length || !vibe) return;
    const newPrefs: MoodPrefs = { date: todayStr(), interests, budget, hours, vibe, group };
    savePrefs(newPrefs);
    recordToday();
    setPrefs(newPrefs);
    setEditing(false);
    setStep(0);
    setDismissedPlaceIds(new Set());
    setDismissedTourIds(new Set());
    setDismissedRentalIds(new Set());
    setIsShuffled(false);
  };

  const handleEdit = () => {
    if (prefs) {
      setInterests(prefs.interests);
      setBudget(prefs.budget);
      setHours(prefs.hours);
      setVibe(prefs.vibe);
      setGroup(prefs.group || 'solo');
    }
    setStep(0);
    setEditing(true);
  };

  const handleSurpriseMe = () => {
    const vibeIdx = Math.floor(Math.random() * VIBE_OPTIONS.length);
    const groupIdx = Math.floor(Math.random() * GROUP_OPTIONS.length);
    const surprise: MoodPrefs = {
      date: todayStr(),
      interests: ['Nature', 'Heritage', 'Food', 'Culture'],
      budget: 'medium',
      hours: 4,
      vibe: VIBE_OPTIONS[vibeIdx].val,
      group: GROUP_OPTIONS[groupIdx].val,
      isSurprise: true,
    };
    savePrefs(surprise);
    recordToday();
    setPrefs(surprise);
    setEditing(false);
    setStep(0);
    setDismissedPlaceIds(new Set());
    setDismissedTourIds(new Set());
    setDismissedRentalIds(new Set());
    setIsShuffled(false);
  };

  const handleShuffle = () => {
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    setShuffledPlaces(shuffle(allScoredPlaces));
    setShuffledTours(shuffle(allScoredTours));
    setShuffledRentals(shuffle(allScoredRentals));
    setIsShuffled(true);
    setDismissedPlaceIds(new Set());
    setDismissedTourIds(new Set());
    setDismissedRentalIds(new Set());
  };

  // Optimistic Network Toggles
  const handleTogglePlaceSave = async (id: string) => {
    setSavedPlaceIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try { await placeAPI.toggleSavedPlace(id); } catch { setSavedPlaceIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); showToast('Sync failed', 'error'); }
  };

  const handleToggleTourSave = async (id: string) => {
    setSavedTourIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try { await tourAPI.toggleSavedTour(id); } catch { setSavedTourIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); showToast('Sync failed', 'error'); }
  };

  const handleToggleRentalSave = async (id: string) => {
    setSavedRentalIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // Add rentalAPI.toggleSavedRental(id) if your backend supports it
  };

  const canNext = (s: number) => {
    if (s === 0) return interests.length > 0;
    if (s === 1) return vibe !== '';
    if (s === 2) return group !== '';
    return true;
  };

  const canSubmit = interests.length > 0 && vibe !== '';

  // ── Wizard Form ────────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 px-6 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-200" />
            <span className="text-emerald-100 text-sm font-bold uppercase tracking-widest">{t?.moodTitle || 'Your Mood'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            {t?.moodVibePrompt || "What's your vibe today"}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}? ✨
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            {t?.moodSubtitle || "Answer a few quick questions and we'll pick the perfect spots for you."}
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-emerald-200 text-xs font-bold">{STEP_LABELS[step]}</span>
              <span className="text-emerald-200 text-xs">{ar ? `خطوة ${step + 1} من ${STEP_LABELS.length}` : `Step ${step + 1} of ${STEP_LABELS.length}`}</span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
              />
            </div>
          </div>

          {step === 0 && (
            <button
              onClick={handleSurpriseMe}
              className="mt-4 flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <Zap className="w-4 h-4 text-yellow-300" />
              {ar ? 'فاجئني — تخطَّ النموذج!' : 'Surprise Me — skip the form!'}
            </button>
          )}
        </div>

        <div className="px-4 py-6">
          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {t?.moodQuestion1 || 'What are you in the mood for?'} <span className="text-red-400">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(opt => {
                  const sel = interests.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleInterest(opt.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all select-none ${sel
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-105'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-slate-50'
                        }`}
                    >
                      <span>{opt.emoji}</span> {t?.[opt.tKey] || opt.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {t?.moodQuestion2 || "What's your vibe?"} <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {VIBE_OPTIONS.map(opt => {
                  const sel = vibe === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => setVibe(opt.val)}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all ${sel
                        ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.03]'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-3xl mb-2">{opt.emoji}</span>
                      <span className="text-sm font-bold text-slate-800">{t?.[opt.tKey] || opt.val}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {ar ? 'مع من ستذهب؟' : 'Who are you going with?'} <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {GROUP_OPTIONS.map(opt => {
                  const sel = group === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => setGroup(opt.val)}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all ${sel
                        ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.03]'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-3xl mb-2">{opt.emoji}</span>
                      <span className="text-sm font-bold text-slate-800">{ar ? opt.labelAr : opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {t?.moodQuestion3 || 'Budget for today'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {BUDGET_OPTIONS.map(opt => {
                  const sel = budget === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => setBudget(opt.val)}
                      className={`flex flex-col items-center p-5 rounded-2xl border-2 transition-all ${sel
                        ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.03]'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-2xl mb-1">{opt.symbol}</span>
                      <span className="text-sm font-bold text-slate-800">{t?.[opt.tKey] || opt.val}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{t?.[opt.descKey] || ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {t?.moodQuestion4 || 'How much time do you have?'}
              </p>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-2">
                  <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.5}
                    value={hours}
                    onChange={e => setHours(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-extrabold text-slate-900 w-12 text-right">{hours}{ar ? 'س' : 'h'}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                  <span>{ar ? 'ساعة' : '1 hr'}</span><span>{ar ? '4س' : '4 hrs'}</span><span>{ar ? '8س' : '8 hrs'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-5 py-3 border border-slate-300 rounded-2xl font-bold text-slate-600 text-sm hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" /> {ar ? 'رجوع' : 'Back'}
              </button>
            )}
            {step < STEP_LABELS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext(step)}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${canNext(step)
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {ar ? 'التالي' : 'Next'} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${canSubmit
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-200 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                <Sparkles className="w-5 h-5" />
                {t?.moodSubmit || 'Show My Recommendations'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Results View ──────────────────────────────────────────────────────────────
  if (!prefs) return null;

  const vibeOption = VIBE_OPTIONS.find(v => v.val === prefs.vibe);
  const groupOption = GROUP_OPTIONS.find(g => g.val === prefs.group);
  const gradient = vibeGradient[prefs.vibe] || vibeGradient.default;

  const hasAny = visiblePlaces.length > 0 || visibleTours.length > 0 || visibleRentals.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-28">
      {/* Hero header */}
      <div className={`bg-gradient-to-br ${gradient} px-6 pt-10 pb-6 relative overflow-hidden`}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-1/2 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative animate-in fade-in">
          <p className="text-white/80 text-xs font-medium mb-0.5">{getContextualLine(ar)}</p>
          <p className="text-white/80 text-sm font-medium">{getGreeting(t)},</p>
          <h1 className="text-white text-2xl font-extrabold leading-tight mt-0.5">
            {user?.name?.split(' ')[0] || 'Explorer'} — {t?.moodHereYourDay || "here's your day 🎯"}
          </h1>

          {streakCount > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                <Flame className="w-3.5 h-3.5 text-orange-300" />
                <span className="text-white text-xs font-extrabold">{ar ? `${streakCount} يوم متتالي!` : `${streakCount}-day streak!`}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {last7Days.map((day, i) => (
                  <div
                    key={i}
                    title={day}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${streakDates.includes(day) ? 'bg-white shadow-sm scale-110' : 'bg-white/25'
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {prefs.interests.map(i => {
              const opt = INTEREST_OPTIONS.find(o => o.id === i);
              return (
                <span key={i} className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25">
                  {opt?.emoji} {ar ? (t?.[opt?.tKey || ''] || opt?.labelAr || i) : (t?.[opt?.tKey || ''] || i)}
                </span>
              );
            })}
            {vibeOption && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25">
                {vibeOption.emoji} {ar ? (t?.[vibeOption.tKey] || vibeOption.labelAr) : (t?.[vibeOption.tKey] || vibeOption.val)}
              </span>
            )}
            {groupOption && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25">
                {groupOption.emoji} {ar ? groupOption.labelAr : groupOption.label}
              </span>
            )}
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25">
              ⏱ {prefs.hours}{ar ? 'س' : 'h'}
            </span>
            {prefs.isSurprise && (
              <span className="bg-yellow-400/30 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-yellow-300/40">
                🎲 {ar ? 'اختيار عشوائي' : 'Surprise pick'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5" /> {t?.moodChangeMood || "Change Mood"}
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {ar ? 'تغيير النتائج' : 'Shuffle picks'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="bg-white border-b border-slate-100 px-4 pt-3 pb-0 sticky top-0 z-10 shadow-sm">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {(['all', 'places', 'tours', 'rentals'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-bold capitalize border-b-2 transition-all ${activeTab === tab
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-t-lg'
                    }`}
                >
                  {tab === 'all' ? (ar ? '✨ الكل' : '✨ All') : tab === 'places' ? (ar ? '📍 أماكن' : '📍 Places') : tab === 'tours' ? (ar ? '🧭 جولات' : '🧭 Tours') : (ar ? '🏕️ إيجارات' : '🏕️ Rentals')}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pt-5 space-y-8">
            {/* ── Places ── */}
            {(activeTab === 'all' || activeTab === 'places') && visiblePlaces.length > 0 && (
              <section className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-900">{t?.moodPlacesSection || '📍 Places for You'}</h2>
                  <span className="text-xs text-slate-400">{visiblePlaces.length} {t?.moodMatches || 'matches'}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 snap-x">
                  {visiblePlaces.map(({ place, matchPct }) => {
                    const pid = place._id || place.id || '';
                    const img = place.photos?.[0] || place.image;
                    const rating = place.ratingSummary?.avgRating ?? place.rating;
                    return (
                      <div key={pid} className="snap-start flex-shrink-0 w-48 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative group">
                        <button
                          className="w-full text-left hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                          onClick={() => onNavigate?.('places', pid)}
                        >
                          <div className="h-32 bg-slate-200 relative overflow-hidden">
                            {img ? (
                              <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={place.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100"><Compass className="w-8 h-8 text-slate-300" /></div>
                            )}
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600/90 backdrop-blur-sm text-white text-[9px] font-extrabold rounded-full shadow">
                              {matchPct}%{ar ? ' تطابق' : ' match'}
                            </span>
                            {rating && (
                              <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-bold text-slate-700">{Number(rating).toFixed(1)}</span>
                              </div>
                            )}
                            {place.categoryTags?.[0] && (
                              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow">
                                {place.categoryTags[0]}
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-bold text-slate-900 text-sm truncate">{place.name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {place.city || 'Saudi Arabia'}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleTogglePlaceSave(pid)}
                          className="absolute bottom-3 right-2 w-7 h-7 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${savedPlaceIds.has(pid) ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`} />
                        </button>
                        <button
                          onClick={() => setDismissedPlaceIds(prev => new Set([...prev, pid]))}
                          className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Tours ── */}
            {(activeTab === 'all' || activeTab === 'tours') && visibleTours.length > 0 && (
              <section className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-900">{t?.moodToursSection || '🧭 Tours for You'}</h2>
                  <span className="text-xs text-slate-400">{visibleTours.length} {t?.moodMatches || 'matches'}</span>
                </div>
                <div className="space-y-3">
                  {visibleTours.map(({ tour, matchPct }) => {
                    const tid = tour.id || (tour as any)._id || '';
                    return (
                      <div key={tid} className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group">
                        <button
                          onClick={() => onNavigate?.('tours', tid)}
                          className="w-full flex text-left hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.99]"
                        >
                          <div className="w-28 h-28 flex-shrink-0 bg-slate-200 relative overflow-hidden">
                            {tour.heroImage ? (
                              <img src={tour.heroImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={tour.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100"><Compass className="w-8 h-8 text-slate-300" /></div>
                            )}
                            <span className={`absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shadow ${tour.difficulty === 'easy' ? 'bg-emerald-500' : tour.difficulty === 'moderate' ? 'bg-amber-500' : 'bg-red-500'
                              }`}>{ar ? (tour.difficulty === 'easy' ? 'سهل' : tour.difficulty === 'moderate' ? 'متوسط' : 'صعب') : tour.difficulty}</span>
                          </div>
                          <div className="flex-1 p-3 min-w-0 pr-10 flex flex-col justify-between">
                            <div>
                              <span className="inline-block mb-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded-full">
                                {matchPct}%{ar ? ' تطابق' : ' match'}
                              </span>
                              <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{tour.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{tour.departureLocation}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" />{tour.totalDuration}h</span>
                              {tour.rating && (
                                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{Number(tour.rating).toFixed(1)}</span>
                              )}
                              <span className="font-extrabold text-emerald-700 ml-auto">{tour.pricePerPerson} SAR</span>
                            </div>
                          </div>
                          <div className="flex items-center pr-3">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                          </div>
                        </button>
                        <button
                          onClick={() => handleToggleTourSave(tid)}
                          className="absolute top-3 right-8 w-7 h-7 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-colors"
                        >
                          <Heart className={`w-3.5 h-3.5 ${savedTourIds.has(tid) ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                        </button>
                        <button
                          onClick={() => setDismissedTourIds(prev => new Set([...prev, tid]))}
                          className="absolute top-3 right-2 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Rentals ── */}
            {(activeTab === 'all' || activeTab === 'rentals') && visibleRentals.length > 0 && (
              <section className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-900">{t?.moodRentalsSection || '🏕️ Rentals for You'}</h2>
                  <span className="text-xs text-slate-400">{visibleRentals.length} {t?.moodMatches || 'matches'}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 snap-x">
                  {visibleRentals.map(({ rental, matchPct }) => {
                    const rid = rental.id || '';
                    const img = (rental.images && rental.images[0]) || rental.image;
                    return (
                      <div key={rid} className="snap-start flex-shrink-0 w-56 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative group">
                        <button
                          className="w-full text-left hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                          onClick={() => onNavigate?.('rentals', rid)}
                        >
                          <div className="h-32 bg-slate-200 relative overflow-hidden">
                            {img ? (
                              <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={rental.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100"><Compass className="w-8 h-8 text-slate-300" /></div>
                            )}
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600/90 backdrop-blur-sm text-white text-[9px] font-extrabold rounded-full shadow">
                              {matchPct}%{ar ? ' تطابق' : ' match'}
                            </span>
                            {rental.rating && (
                              <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-bold text-slate-700">{Number(rental.rating).toFixed(1)}</span>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow">
                              {rental.type}
                            </div>
                          </div>
                          <div className="p-3 pr-8">
                            <p className="font-bold text-slate-900 text-sm truncate">{rental.title}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />{rental.locationName}
                            </p>
                            <p className="text-sm font-extrabold text-emerald-700 mt-1.5">
                              {rental.price} <span className="text-xs font-normal text-slate-400">{ar ? 'ريال/ليلة' : 'SAR/night'}</span>
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleToggleRentalSave(rid)}
                          className="absolute bottom-3 right-2.5 w-7 h-7 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${savedRentalIds.has(rid) ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`} />
                        </button>
                        <button
                          onClick={() => setDismissedRentalIds(prev => new Set([...prev, rid]))}
                          className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty state */}
            {!hasAny && (
              <div className="text-center py-16 animate-in fade-in">
                <Compass className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                <p className="font-semibold text-slate-500">{t?.moodNoMatches || 'No exact matches found'}</p>
                <p className="text-slate-400 text-sm mt-1">{t?.moodAdjustPrefs || 'Try shuffling or updating your preferences'}</p>
                <div className="flex gap-3 justify-center mt-4">
                  <button onClick={handleShuffle} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                    <RefreshCw className="w-4 h-4" /> {ar ? 'تغيير' : 'Shuffle'}
                  </button>
                  <button onClick={handleEdit} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm">
                    {t?.moodUpdatePrefs || 'Update Preferences'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};