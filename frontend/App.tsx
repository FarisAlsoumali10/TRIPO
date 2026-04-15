import React, {
  useState, useEffect, useRef, Suspense, lazy, useCallback, useMemo,
} from 'react';
import {
  Home, Search, Plus, User as UserIcon, Settings, ChevronLeft, LogOut,
  Globe, Users, Menu, X, Heart, Shield, Users2, Sparkles, Download,
  Trash2, WifiOff, ChevronDown, ChevronUp, MapPin, Calendar, Star,
  Store, Tent, Compass, Lock, LayoutGrid, Camera, Sun, Moon, Bell,
  BookOpen,
} from 'lucide-react';
import { User, Itinerary, GroupTrip, PrivateTrip } from './src/types/index';
import { TRANSLATIONS } from './translations';
import { authAPI, itineraryAPI, groupTripAPI } from './src/services/api';
import { getOfflineItineraries, removeOfflineItinerary } from './src/screens/ItineraryDetailScreen';

// ── Eagerly-loaded screens ──────────────────────────────────────────────────
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CreateScreen } from './src/screens/CreateScreen';
import { ItineraryDetailScreen } from './src/screens/ItineraryDetailScreen';
import { GroupTripScreen } from './src/screens/GroupTripScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { MyTripsScreen } from './src/screens/MyTripsScreen';
import { PrivateTripScreen } from './src/screens/PrivateTripScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { BookingHistoryScreen, saveBooking } from './src/screens/BookingHistoryScreen';

// ── Lazily-loaded heavy screens ─────────────────────────────────────────────
const YourMoodScreen = lazy(() => import('./src/screens/YourMoodScreen').then(m => ({ default: m.YourMoodScreen })));
const CommunitiesScreen = lazy(() => import('./src/screens/CommunitiesScreen').then(m => ({ default: m.CommunitiesScreen })));
const AIAssistantLazy = lazy(() => import('./src/components/AIAssistant').then(m => ({ default: m.AIAssistant })));
const ARGuideScreen = lazy(() => import('./src/screens/ARGuideScreen').then(m => ({ default: m.ARGuideScreen })));
const AIPlannerScreen = lazy(() => import('./src/screens/AIPlannerScreen').then(m => ({ default: m.AIPlannerScreen })));
const EventsScreen = lazy(() => import('./src/screens/EventsScreen').then(m => ({ default: m.EventsScreen })));
const RentalsScreen = lazy(() => import('./src/screens/RentalsScreen').then(m => ({ default: m.RentalsScreen })));
const ToursScreen = lazy(() => import('./src/screens/ToursScreen').then(m => ({ default: m.ToursScreen })));
const PlacesScreen = lazy(() => import('./src/screens/PlacesScreen').then(m => ({ default: m.PlacesScreen })));
const AdminScreen = lazy(() => import('./src/screens/AdminScreen').then(m => ({ default: m.AdminScreen })));
const HostDashboardScreen = lazy(() => import('./src/screens/HostDashboardScreen').then(m => ({ default: m.HostDashboardScreen })));
const JournalScreen = lazy(() => import('./src/screens/JournalScreen').then(m => ({ default: m.default || m.JournalScreen })));
const PersonalListsScreen = lazy(() => import('./src/screens/PersonalListsScreen').then(m => ({ default: m.default || m.PersonalListsScreen })));

import { WishListModal } from './src/components/WishListModal';
import { NotificationPanel } from './src/components/NotificationPanel';
import { ToastContainer } from './src/components/Toast';
import { GlobalSearch } from './src/components/GlobalSearch';
import { SkeletonCard } from './src/components/ui';

// ─── Types ───────────────────────────────────────────────────────────────────
// Extend User with fields used across the app — avoids (user as any) casts
interface AppUser extends User {
  role?: 'admin' | 'user' | 'host';
  avatar?: string;
  walletBalance?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTIVE_TRIP_KEY = 'tripo_active_group_trip';
const KARAM_POINTS_KEY = 'tripo_karam_points';
const KARAM_HISTORY_KEY = 'tripo_karam_history';

// FIX #10 — static map to avoid purged dynamic Tailwind classes (grid-cols-${n})
const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

// ─── Pure helpers (defined once, module scope — never recreated) ──────────────
const getKaramLevel = (points: number, t?: any): string => {
  if (points >= 1000) return t?.karamLegend || 'Legend';
  if (points >= 500) return t?.karamPathfinder || 'Pathfinder';
  if (points >= 200) return t?.karamAdventurer || 'Adventurer';
  return t?.karamExplorer || 'Explorer';
};

const getContributionTier = (count: number, t?: any) => {
  if (count >= 50) return { label: t?.tierExpert || 'Expert Explorer', color: 'text-purple-700', bg: 'bg-purple-50', icon: '💎' };
  if (count >= 20) return { label: t?.tierGuide || 'Trusted Guide', color: 'text-blue-700', bg: 'bg-blue-50', icon: '🥇' };
  if (count >= 5) return { label: t?.tierActive || 'Active Traveller', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '🌟' };
  return { label: t?.tierNew || 'New Explorer', color: 'text-slate-600', bg: 'bg-slate-50', icon: '🌱' };
};

const parseLocalJSON = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};

const isMongoId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// ─── Reusable sub-components (defined OUTSIDE App — stable references) ────────

/** FIX #16 — ThemeToggle with proper aria-label */
const ThemeToggle = React.memo(({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
    style={{ backgroundColor: isDark ? '#10b981' : '#cbd5e1' }}
    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    <span
      className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300"
      style={{ transform: isDark ? 'translateX(28px)' : 'translateX(0px)' }}
    >
      {isDark
        ? <Moon className="w-3.5 h-3.5 text-emerald-600" />
        : <Sun className="w-3.5 h-3.5 text-amber-500" />}
    </span>
  </button>
));

/** FIX #10 — GridFallback uses static class map to avoid Tailwind purge */
const GridFallback = React.memo(({ cols = 2, count = 6 }: { cols?: number; count?: number }) => (
  <div className={`p-4 grid ${GRID_COLS_CLASS[cols] ?? 'grid-cols-2'} gap-3`}>
    {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
));

const ListFallback = React.memo(({ count = 4 }: { count?: number }) => (
  <div className="p-4 space-y-3">
    {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
));

const SpinnerFallback = React.memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
  </div>
));

class AuthErrorBoundary extends (React.Component as any) {
  constructor(props: any) { super(props); (this as any).state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = (this as any).state as { error: Error | null };
    const { children, onReset } = (this as any).props as { children: React.ReactNode; onReset: () => void };
    if (error) return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-500 text-xl font-bold" aria-hidden="true">!</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6">{error.message}</p>
        <button
          onClick={() => { (this as any).setState({ error: null }); onReset(); }}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >Go Back</button>
      </div>
    );
    return children;
  }
}

const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-300">{children}</div>
);
const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[100dvh] w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300">{children}</div>
);

// ─── Bottom nav — static constant, defined outside component ──────────────────
const BOTTOM_NAV = [
  { id: 'home', icon: Home, labelEn: 'Home', labelAr: 'الرئيسية' },
  { id: 'explore', icon: Search, labelEn: 'Explore', labelAr: 'استكشف' },
  { id: 'communities', icon: Users, labelEn: 'Community', labelAr: 'المجتمع' },
  { id: 'profile', icon: UserIcon, labelEn: 'Profile', labelAr: 'حسابي' },
] as const;

const MORE_TABS = new Set([
  'places', 'tours', 'my_trips', 'ar', 'your_mood', 'ai_planner',
  'events', 'rentals', 'wallet', 'notifications', 'booking_history',
  'settings', 'admin', 'host', 'journal', 'personal_lists',
]);

// ══════════════════════════════════════════════════════════════════════════════
export const App = () => {
  // ── View / Navigation ─────────────────────────────────────────────────────
  const [view, setView] = useState<'welcome' | 'auth' | 'main' | 'itinerary' | 'group' | 'loading' | 'privateTrip'>('loading');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('home');

  // FIX #4 — ref mirror so switchTab deps stay empty (stable reference forever)
  const activeTabRef = useRef('home');
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // FIX #1 — skip redundant getMe() call when profile was already fetched on init
  const profileFetchedOnInit = useRef(false);

  // ── User ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<AppUser | null>(null);

  // ── UI Toggles ────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showWishLists, setShowWishLists] = useState(false);
  const [showOfflineTrips, setShowOfflineTrips] = useState(false);
  const [showKaramHistory, setShowKaramHistory] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('tripo_theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // ── Profile Edit ──────────────────────────────────────────────────────────
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileAvatar, setEditProfileAvatar] = useState('');
  // FIX #8 — track avatar load error to restore letter fallback
  const [avatarImgError, setAvatarImgError] = useState(false);
  // Reset error when URL changes
  useEffect(() => { setAvatarImgError(false); }, [editProfileAvatar]);

  // ── Trip State ────────────────────────────────────────────────────────────
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [activeTrip, setActiveTrip] = useState<GroupTrip | null>(null);
  const [selectedPrivateTrip, setSelectedPrivateTrip] = useState<PrivateTrip | null>(null);

  // ── Profile Counters ──────────────────────────────────────────────────────
  const [userReviewCount, setUserReviewCount] = useState<number>(() => parseInt(localStorage.getItem('tripo_review_count') || '0', 10));
  const [profileItineraryCount, setProfileItineraryCount] = useState<number | null>(null);
  const [offlineTrips, setOfflineTrips] = useState<Itinerary[]>(() => getOfflineItineraries());

  // ── Karam Points ──────────────────────────────────────────────────────────
  const [karamPoints, setKaramPoints] = useState<number>(() => parseInt(localStorage.getItem(KARAM_POINTS_KEY) || '0', 10));
  const [karamHistory, setKaramHistory] = useState<{ id: string; action: string; points: number; label: string; timestamp: number }[]>(
    () => parseLocalJSON(KARAM_HISTORY_KEY, [])
  );

  // ── Deep-link pending navigation ──────────────────────────────────────────
  const [pendingDeepLink, setPendingDeepLink] = useState<{ tab: string; id: string } | null>(null);
  const [createInitialTitle, setCreateInitialTitle] = useState<string | undefined>(undefined);

  // ── Scroll position memory ────────────────────────────────────────────────
  const scrollPositions = useRef<Record<string, number>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Derived (memoized) ────────────────────────────────────────────────────
  const t = TRANSLATIONS[lang];
  const isRTL = lang === 'ar';
  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role]);
  const tier = useMemo(() => getContributionTier(userReviewCount, t), [userReviewCount, t]);

  const hasClaimedPlaces = useMemo(() => {
    try {
      const claimed = JSON.parse(localStorage.getItem('tripo_claimed_places') || '[]');
      return Array.isArray(claimed) && claimed.length > 0;
    } catch { return false; }
  }, [user?.id]);

  // ── Stable helpers ────────────────────────────────────────────────────────

  // FIX #4 — switchTab uses activeTabRef so it never needs activeTab in deps
  const switchTab = useCallback((tabId: string) => {
    if (contentRef.current) scrollPositions.current[activeTabRef.current] = contentRef.current.scrollTop;
    setActiveTab(tabId);
  }, []); // ✅ empty deps — reference never changes

  const restoreActiveTrip = useCallback(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
      if (!raw) return;
      const trip: GroupTrip = JSON.parse(raw);
      if (trip?.id && trip?.itinerary) setActiveTrip(trip);
    } catch (e) { console.warn('Failed to restore active group trip:', e); }
  }, []);

  const toggleLanguage = useCallback(() => setLang(prev => prev === 'en' ? 'ar' : 'en'), []);
  const toggleDark = useCallback(() => setIsDark(d => !d), []);

  // FIX #5 — shared navigate handler uses switchTab (saves scroll) not setActiveTab
  const navigate = useCallback((tab: string, id?: string) => {
    switchTab(tab);
    if (id) setPendingDeepLink({ tab, id });
  }, [switchTab]);

  // ── Side-effects ──────────────────────────────────────────────────────────

  // FIX #11 — isRTL is derived from lang, redundant as dep
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]); // ✅ lang is sufficient

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('tripo_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (!contentRef.current) return;
    const saved = scrollPositions.current[activeTab] || 0;
    requestAnimationFrame(() => { if (contentRef.current) contentRef.current.scrollTop = saved; });
  }, [activeTab]);

  // Global 401 interceptor → force logout
  useEffect(() => {
    const handler = () => { setUser(null); setView('auth'); };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  // FIX #1 — auto-login: set flag so fetchProfileData skips the redundant getMe()
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token) { setView('welcome'); return; }

      try {
        const profile = await authAPI.getProfile();
        profileFetchedOnInit.current = true; // ← skip getMe() in the next effect
        setUser(profile as AppUser);
        localStorage.setItem('user', JSON.stringify(profile));
        setView('main');
        restoreActiveTrip();
      } catch (e) {
        console.warn('Fresh profile fetch failed, falling back to localStorage', e);
        if (storedUser) {
          try {
            profileFetchedOnInit.current = true;
            setUser(JSON.parse(storedUser) as AppUser);
            setView('main');
            restoreActiveTrip();
          } catch { handleLogout(); }
        } else { handleLogout(); }
      }
    };
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FIX #1 + #2 — no double fetch; stale closure fixed via functional setUser
  useEffect(() => {
    if (!user?.id) return;

    // FIX #1 — skip on initial load when profile was already fetched above
    if (profileFetchedOnInit.current) {
      profileFetchedOnInit.current = false;
      return;
    }

    const fetchProfileData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return; // guest user — no API calls

      try {
        const freshUser = await authAPI.getMe();
        // FIX #2 — functional updater reads current state, not stale closure value
        setUser(prev => {
          if (!prev) return freshUser as AppUser;
          const merged = { ...prev, ...freshUser } as AppUser;
          localStorage.setItem('user', JSON.stringify(merged));
          return merged;
        });
      } catch { /* fall back silently */ }

      try {
        const itins = await itineraryAPI.getItineraries({ limit: 200 });
        const userId = user.id;
        const mine = Array.isArray(itins)
          ? itins.filter((it: any) => {
            if (typeof it.userId === 'object' && it.userId !== null)
              return (it.userId._id || it.userId.id) === userId;
            return it.userId === userId || it.authorId === userId;
          })
          : [];
        setProfileItineraryCount(mine.length);
      } catch { /* leave count as null */ }

      setUserReviewCount(parseInt(localStorage.getItem('tripo_review_count') || '0', 10));
    };

    fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Daily Karam bonus
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem('tripo_last_login_date');
    if (lastLogin !== today) {
      localStorage.setItem('tripo_last_login_date', today);
      awardKaramPoints('daily_login', 10, 'First login of the day');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Auth handlers ─────────────────────────────────────────────────────────

  // FIX #3 — never trust stale localStorage on login; always validate with server
  const handleLogin = useCallback(async () => {
    setView('loading');
    try {
      const profile = await authAPI.getProfile();
      profileFetchedOnInit.current = true;
      setUser(profile as AppUser);
      localStorage.setItem('user', JSON.stringify(profile));
      setView('main');
      restoreActiveTrip();
    } catch { setView('auth'); }
  }, [restoreActiveTrip]);

  // FIX #14 — handleRegister also calls restoreActiveTrip (was missing)
  const handleRegister = useCallback(async () => {
    setView('loading');
    try {
      const profile = await authAPI.getProfile();
      profileFetchedOnInit.current = true;
      setUser(profile as AppUser);
      localStorage.setItem('user', JSON.stringify(profile));
      setView('main');
      restoreActiveTrip(); // ✅ was missing
    } catch { setView('auth'); }
  }, [restoreActiveTrip]);

  const handleGuestLogin = useCallback(() => {
    setUser({ id: 'guest', name: 'Guest', email: '' } as AppUser);
    setView('main');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    setUser(null);
    setActiveTrip(null);
    setView('welcome');
  }, []);

  // ── Karam Points ──────────────────────────────────────────────────────────
  const awardKaramPoints = useCallback((action: string, points: number, label: string) => {
    const entry = { id: `${action}_${Date.now()}`, action, points, label, timestamp: Date.now() };
    setKaramPoints(prev => {
      const next = prev + points;
      localStorage.setItem(KARAM_POINTS_KEY, String(next));
      return next;
    });
    setKaramHistory(prev => {
      const next = [entry, ...prev].slice(0, 50);
      localStorage.setItem(KARAM_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Trip handlers ─────────────────────────────────────────────────────────
  const openItinerary = useCallback((it: Itinerary) => {
    setSelectedItinerary(it); setView('itinerary');
  }, []);

  const startGroupTrip = useCallback(async () => {
    if (!selectedItinerary || !user) return;
    const itineraryBackendId = selectedItinerary._id || selectedItinerary.id;

    const newTrip: GroupTrip = {
      id: Date.now().toString(),
      itinerary: selectedItinerary,
      members: [user],
      chatMessages: [],
      expenses: [],
    };

    if (itineraryBackendId && isMongoId(itineraryBackendId)) {
      try {
        const backendTrip = await groupTripAPI.create(itineraryBackendId, selectedItinerary.title);
        newTrip.backendId = backendTrip._id || backendTrip.id;
      } catch (e) { console.warn('Could not create backend group trip, running locally:', e); }
    }

    try { localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(newTrip)); }
    catch (e) { console.warn('Could not persist group trip:', e); }

    setActiveTrip(newTrip);
    setView('group');
  }, [selectedItinerary, user]);

  const handleUpdateTrip = useCallback((tripOrUpdater: GroupTrip | ((prev: GroupTrip) => GroupTrip)) => {
    setActiveTrip(prev => {
      const resolved = typeof tripOrUpdater === 'function'
        ? (prev ? (tripOrUpdater as (p: GroupTrip) => GroupTrip)(prev) : prev)
        : tripOrUpdater;
      if (resolved) {
        try { localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(resolved)); } catch { /* noop */ }
      }
      return resolved;
    });
  }, []);

  const handleEndTrip = useCallback(() => {
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    setActiveTrip(null);
    setView('main');
  }, []);

  const handleRemoveOfflineTrip = useCallback((id: string) => {
    removeOfflineItinerary(id);
    setOfflineTrips(getOfflineItineraries());
  }, []);

  const handleOpenOfflineItinerary = useCallback((it: Itinerary) => {
    setSelectedItinerary(it); setView('itinerary');
  }, []);

  // FIX #9 — booking complete handler extracted to useCallback
  const handleBookingComplete = useCallback((itinerary: Itinerary, groupTrip: any) => {
    saveBooking({
      id: (groupTrip._id || groupTrip.id || Date.now().toString()),
      tourId: itinerary._id || itinerary.id || '',
      tourTitle: itinerary.title,
      // استخدمنا (as any) للخصائص غير الموجودة صراحة في نوع Itinerary
      tourImage: (itinerary as any).heroImage || (itinerary as any).image || '',
      guideName: (itinerary as any).guideName || 'مرشد تريبو',
      date: new Date().toISOString().split('T')[0],
      guests: groupTrip.guests || 1,
      totalPrice: itinerary.estimatedCost || 0,
      currency: 'SAR',
      status: 'confirmed',
      departureLocation: itinerary.city || (itinerary as any).departureLocation || 'الرياض',
      duration: Math.round((itinerary.estimatedDuration || 0) / 60) || 4,
      bookedAt: Date.now(),
    });
    const trip: GroupTrip = {
      id: groupTrip._id || groupTrip.id || Date.now().toString(),
      backendId: groupTrip._id || groupTrip.id,
      itinerary,
      members: user ? [user] : [],
      chatMessages: [],
      expenses: [],
    };
    setActiveTrip(trip);
    setView('group');
  }, [user]);

  // FIX #6 — profile save calls backend; falls back to optimistic local update
  const handleSaveProfile = useCallback(async () => {
    if (!editProfileName.trim() || !user) return;
    const payload = {
      name: editProfileName.trim(),
      avatar: editProfileAvatar.trim() || undefined,
    };
    try {
      const updated = await authAPI.updateProfile(payload) as AppUser;
      setUser(prev => {
        if (!prev) return updated;
        const merged = { ...prev, ...updated };
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
    } catch {
      // Optimistic local fallback if backend endpoint not yet implemented
      setUser(prev => {
        if (!prev) return prev;
        const merged = { ...prev, ...payload };
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
    }
    setShowEditProfile(false);
  }, [editProfileName, editProfileAvatar, user]);

  // ── Sidebar nav items (memoized) ──────────────────────────────────────────
  const sidebarNavItems = useMemo(() => [
    { id: 'home', icon: Home, label: t.tabHome },
    { id: 'explore', icon: Search, label: t.tabExplore },
    { id: 'places', icon: MapPin, label: (t as any).tabPlaces || 'Places' },
    { id: 'tours', icon: Compass, label: (t as any).tabTours || 'Tours' },
    { id: 'my_trips', icon: Lock, label: (t as any).tabMyTrips || 'My Private Trips' },
    { id: 'journal', icon: BookOpen, label: isRTL ? 'مذكراتي' : 'Journal' },
    { id: 'personal_lists', icon: LayoutGrid, label: isRTL ? 'قوائمي' : 'My Lists' },
    { id: 'create', icon: Plus, label: (t as any).tabCreate || 'New Trip' },
    { id: 'communities', icon: Users, label: t.tabCommunities },
    { id: 'your_mood', icon: Heart, label: (t as any).tabYourMood || 'Your Mood' },
    { id: 'ar', icon: Camera, label: (t as any).tabAR || 'AR Guide' },
    { id: 'ai_planner', icon: Sparkles, label: `✨ ${(t as any).tabAIPlanner || 'AI Planner'}` },
    { id: 'events', icon: Calendar, label: (t as any).tabEvents || 'Events' },
    { id: 'rentals', icon: Tent, label: (t as any).tabRentals || 'Rentals' },
    { id: 'profile', icon: UserIcon, label: t.tabProfile },
    { id: 'wallet', icon: Star, label: (t as any).tabWallet || (isRTL ? 'محفظتي' : 'Wallet') },
    { id: 'notifications', icon: Bell, label: (t as any).tabNotifs || (isRTL ? 'الإشعارات' : 'Notifications') },
    { id: 'booking_history', icon: BookOpen, label: (t as any).tabBookings || (isRTL ? 'حجوزاتي' : 'Bookings') },
    { id: 'settings', icon: Settings, label: t.settings },
    ...(isAdmin ? [{ id: 'admin', icon: Shield, label: (t as any).tabAdmin || 'Admin' }] : []),
    ...(hasClaimedPlaces ? [{ id: 'host', icon: Store, label: (t as any).tabHost || 'Host Dashboard' }] : []),
  ], [t, isRTL, isAdmin, hasClaimedPlaces]);

  // ── More sheet items (memoized) ───────────────────────────────────────────
  const moreSheetItems = useMemo(() => [
    { id: 'places', icon: MapPin, label: (t as any).tabPlaces || 'Places', lightColor: 'bg-slate-100 text-slate-600', darkColor: 'bg-slate-800 text-slate-300' },
    { id: 'tours', icon: Compass, label: (t as any).tabTours || 'Tours', lightColor: 'bg-teal-50 text-teal-600', darkColor: 'bg-teal-900/50 text-teal-400' },
    { id: 'my_trips', icon: Lock, label: (t as any).moreMyTrips || 'My Trips', lightColor: 'bg-emerald-50 text-emerald-600', darkColor: 'bg-emerald-900/50 text-emerald-400' },
    { id: 'ar', icon: Camera, label: (t as any).moreARGuide || 'AR Guide', lightColor: 'bg-orange-50 text-orange-600', darkColor: 'bg-orange-900/50 text-orange-400' },
    { id: 'ai_planner', icon: Sparkles, label: (t as any).moreAIPlanner || 'AI Planner', lightColor: 'bg-purple-50 text-purple-600', darkColor: 'bg-purple-900/50 text-purple-400' },
    { id: 'events', icon: Calendar, label: (t as any).tabEvents || 'Events', lightColor: 'bg-blue-50 text-blue-600', darkColor: 'bg-blue-900/50 text-blue-400' },
    { id: 'wallet', icon: Star, label: (t as any).tabWallet || (isRTL ? 'محفظتي' : 'Wallet'), lightColor: 'bg-amber-50 text-amber-600', darkColor: 'bg-amber-900/50 text-amber-400' },
    { id: 'notifications', icon: Bell, label: (t as any).tabNotifs || (isRTL ? 'الإشعارات' : 'Notifs'), lightColor: 'bg-purple-50 text-purple-600', darkColor: 'bg-purple-900/50 text-purple-400' },
    { id: 'booking_history', icon: BookOpen, label: (t as any).tabBookings || (isRTL ? 'حجوزاتي' : 'Bookings'), lightColor: 'bg-teal-50 text-teal-600', darkColor: 'bg-teal-900/50 text-teal-400' },
    { id: 'settings', icon: Settings, label: t.settings, lightColor: 'bg-slate-100 text-slate-600', darkColor: 'bg-slate-800 text-slate-300' },
    { id: 'journal', icon: BookOpen, label: isRTL ? 'مذكراتي' : 'Journals', lightColor: 'bg-rose-50 text-rose-600', darkColor: 'bg-rose-900/50 text-rose-400' },
    { id: 'personal_lists', icon: LayoutGrid, label: isRTL ? 'قوائمي' : 'My Lists', lightColor: 'bg-indigo-50 text-indigo-600', darkColor: 'bg-indigo-900/50 text-indigo-400' },
    ...(isAdmin ? [{ id: 'admin', icon: Shield, label: (t as any).tabAdmin || 'Admin', lightColor: 'bg-red-50 text-red-600', darkColor: 'bg-red-900/50 text-red-400' }] : []),
    ...(hasClaimedPlaces ? [{ id: 'host', icon: Store, label: (t as any).moreHost || 'Host', lightColor: 'bg-emerald-50 text-emerald-600', darkColor: 'bg-emerald-900/50 text-emerald-400' }] : []),
  ], [t, isRTL, isAdmin, hasClaimedPlaces]);

  // ── Early-return views ────────────────────────────────────────────────────
  if (view === 'loading') return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-50" role="status" aria-label="Loading">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
    </div>
  );

  if (view === 'welcome') return (
    <WelcomeScreen
      onGetStarted={() => { setAuthMode('register'); setView('auth'); }}
      onSignIn={() => { setAuthMode('login'); setView('auth'); }}
    />
  );

  if (view === 'auth') return (
    <AuthErrorBoundary onReset={() => setView('welcome')}>
      <AuthScreen
        onLogin={handleLogin} onRegister={handleRegister}
        onGuestLogin={handleGuestLogin} t={t} lang={lang}
        onToggleLang={toggleLanguage} initialMode={authMode}
      />
    </AuthErrorBoundary>
  );

  if (view === 'itinerary' && selectedItinerary) return (
    <ModalWrapper>
      <ItineraryDetailScreen
        itinerary={selectedItinerary} onBack={() => setView('main')}
        onStartGroup={startGroupTrip} t={t} onAwardKaramPoints={awardKaramPoints}
      />
    </ModalWrapper>
  );

  if (view === 'group' && activeTrip && user) return (
    <AppWrapper><ModalWrapper>
      <GroupTripScreen
        trip={activeTrip} currentUser={user} onBack={handleEndTrip}
        onUpdateTrip={handleUpdateTrip as any} t={t}
      />
    </ModalWrapper></AppWrapper>
  );

  if (view === 'privateTrip' && selectedPrivateTrip && user) return (
    <AppWrapper><ModalWrapper>
      <PrivateTripScreen
        trip={selectedPrivateTrip} currentUser={user}
        onBack={() => { setView('main'); switchTab('my_trips'); }}
        onUpdateTrip={setSelectedPrivateTrip}
      />
    </ModalWrapper></AppWrapper>
  );

  // ── Main shell ────────────────────────────────────────────────────────────
  return (
    <AppWrapper>
      <div className="flex h-full relative">

        {/* Sidebar overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-800/40 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* FIX #17 — outer container is now <nav> with id for aria-controls */}
        <nav
          id="main-sidebar"
          aria-label="Main navigation"
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/8 transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="h-full flex flex-col pt-6 pb-4">

            {/* Logo */}
            <div className="px-6 flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md" aria-hidden="true">
                  <span className="text-white font-bold">T</span>
                </div>
                <span className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">Tripo</span>
              </div>
              {/* FIX #16 — aria-label on close button */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Global search — FIX #5: uses navigate (which calls switchTab) */}
            <div className="px-4 mb-4">
              <GlobalSearch onNavigate={(tab, id) => {
                navigate(tab, id);
                setIsSidebarOpen(false);
              }} />
            </div>

            {/* Nav links */}
            <ul className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar list-none" role="list">
              {sidebarNavItems.map(nav => (
                <li key={nav.id}>
                  <button
                    onClick={() => { switchTab(nav.id); setIsSidebarOpen(false); }}
                    aria-current={activeTab === nav.id ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === nav.id ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-medium'}`}
                  >
                    <nav.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === nav.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true" />
                    {nav.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* Sidebar user footer */}
            <div className="mt-auto px-4 pt-4 border-t border-slate-100 dark:border-white/8">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm flex-shrink-0" aria-hidden="true">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'Guest'}</p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content column */}
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">

          {/* Mobile header */}
          <header className="lg:hidden bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-white/8 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
            {/* FIX #16 — aria-expanded + aria-controls on hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
              aria-label="Open navigation"
              aria-expanded={isSidebarOpen}
              aria-controls="main-sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-black text-lg text-slate-800 dark:text-white tracking-tight" aria-label="Tripo">Tripo</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileSearch(true)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>
              <ThemeToggle isDark={isDark} onToggle={toggleDark} />
              <NotificationPanel />
            </div>
          </header>

          {/* Desktop top bar */}
          <div className="hidden lg:flex bg-white dark:bg-slate-900 px-6 py-2.5 border-b border-slate-200 dark:border-white/8 items-center justify-end gap-3 sticky top-0 z-30 transition-colors duration-300">
            <ThemeToggle isDark={isDark} onToggle={toggleDark} />
            <NotificationPanel />
          </div>

          {/* Scrollable content */}
          <main ref={contentRef} className="flex-1 overflow-y-auto w-full" id="main-content">
            <div className="max-w-7xl mx-auto h-full page-enter">

              {/* HOME */}
              {activeTab === 'home' && user && (
                <>
                  {activeTrip && (
                    <div className="mx-6 mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-4" role="alert" aria-live="polite">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
                          <Users2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{(t as any).activeGroupTrip || 'Active Group Trip'}</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{activeTrip.itinerary.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setView('group')} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition">
                          {(t as any).resumeBtn || 'Resume'}
                        </button>
                        <button onClick={handleEndTrip} className="px-3 py-2 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition">
                          {(t as any).endBtn || 'End'}
                        </button>
                      </div>
                    </div>
                  )}
                  <HomeScreen
                    user={user} lang={lang} onOpenItinerary={openItinerary}
                    t={t} onOpenAR={() => switchTab('ar')} onNavigate={navigate}
                  />
                </>
              )}

              {/* PLACES */}
              {activeTab === 'places' && (
                <Suspense fallback={<GridFallback cols={2} count={6} />}>
                  <PlacesScreen
                    t={t}
                    initialPlaceId={pendingDeepLink?.tab === 'places' ? pendingDeepLink.id : undefined}
                    onPlaceOpened={() => setPendingDeepLink(null)}
                  />
                </Suspense>
              )}

              {/* EXPLORE — FIX #7: onOpenPlace now navigates properly */}
              {activeTab === 'explore' && (
                <ExploreScreen
                  t={t}
                  onOpenPlace={(p: any) => navigate('places', p?.id || p?._id)}
                />
              )}

              {/* TOURS — FIX #9: onBookingComplete is now a stable useCallback */}
              {activeTab === 'tours' && (
                <Suspense fallback={<GridFallback cols={1} count={4} />}>
                  <ToursScreen
                    t={t}
                    initialTourId={pendingDeepLink?.tab === 'tours' ? pendingDeepLink.id : undefined}
                    onTourOpened={() => setPendingDeepLink(null)}
                    onBookingComplete={handleBookingComplete}
                  />
                </Suspense>
              )}

              {/* MY TRIPS */}
              {activeTab === 'my_trips' && user && (
                <MyTripsScreen
                  currentUser={user}
                  onOpenTrip={(trip) => { setSelectedPrivateTrip(trip); setView('privateTrip'); }}
                />
              )}

              {/* CREATE */}
              {activeTab === 'create' && user && (
                <CreateScreen
                  onSave={() => {
                    awardKaramPoints('publish_itinerary', 100, 'Published a trip');
                    setCreateInitialTitle(undefined);
                    switchTab('home');
                  }}
                  t={t} initialTitle={createInitialTitle} currentUser={user}
                  onPrivateTripCreated={() => { setCreateInitialTitle(undefined); switchTab('my_trips'); }}
                />
              )}

              {/* COMMUNITIES */}
              {activeTab === 'communities' && (
                <Suspense fallback={<ListFallback count={5} />}>
                  <CommunitiesScreen
                    t={t} lang={lang} onOpenItinerary={openItinerary}
                    initialCommunityId={pendingDeepLink?.tab === 'communities' ? pendingDeepLink.id : undefined}
                    onCommunityOpened={() => setPendingDeepLink(null)}
                  />
                </Suspense>
              )}

              {/* AI PLANNER */}
              {activeTab === 'ai_planner' && (
                <Suspense fallback={<SpinnerFallback />}>
                  <div className="flex flex-col" style={{ height: 'calc(100dvh - 120px)' }}>
                    <AIPlannerScreen user={user} />
                  </div>
                </Suspense>
              )}

              {/* EVENTS */}
              {activeTab === 'events' && (
                <Suspense fallback={<ListFallback count={4} />}>
                  <EventsScreen
                    t={t} lang={lang}
                    onCreateWithEvent={(title: string) => { setCreateInitialTitle(title); switchTab('create'); }}
                    initialEventId={pendingDeepLink?.tab === 'events' ? pendingDeepLink.id : undefined}
                    onEventOpened={() => setPendingDeepLink(null)}
                  />
                </Suspense>
              )}

              {/* RENTALS */}
              {activeTab === 'rentals' && (
                <Suspense fallback={<GridFallback cols={1} count={4} />}>
                  <RentalsScreen
                    t={t}
                    initialRentalId={pendingDeepLink?.tab === 'rentals' ? pendingDeepLink.id : undefined}
                    onRentalOpened={() => setPendingDeepLink(null)}
                  />
                </Suspense>
              )}

              {/* AR GUIDE */}
              {activeTab === 'ar' && user && (
                <Suspense fallback={<SpinnerFallback />}>
                  <ARGuideScreen onBack={() => switchTab('home')} t={t} user={user} lang={lang} nearbyPlaces={[]} itineraryPlaces={[]} />
                </Suspense>
              )}

              {/* YOUR MOOD */}
              {activeTab === 'your_mood' && user && (
                <Suspense fallback={<ListFallback count={3} />}>
                  <YourMoodScreen t={t} user={user} onNavigate={navigate} />
                </Suspense>
              )}

              {/* WALLET */}
              {activeTab === 'wallet' && (
                <WalletScreen karamPoints={karamPoints} karamHistory={karamHistory} walletBalance={user?.walletBalance || 0} t={t} lang={lang} />
              )}

              {/* NOTIFICATIONS */}
              {activeTab === 'notifications' && <NotificationsScreen t={t} lang={lang} />}

              {/* BOOKING HISTORY */}
              {activeTab === 'booking_history' && <BookingHistoryScreen t={t} lang={lang} user={user} />}

              {/* SETTINGS */}
              {activeTab === 'settings' && user && (
                <SettingsScreen
                  user={user} lang={lang} isDark={isDark}
                  onToggleLang={toggleLanguage} onToggleDark={toggleDark}
                  onUpdateUser={(u) => setUser(u as AppUser)} onLogout={handleLogout} t={t}
                />
              )}

              {/* ADMIN */}
              {activeTab === 'admin' && isAdmin && <Suspense fallback={null}><AdminScreen t={t} /></Suspense>}

              {/* HOST */}
              {activeTab === 'host' && <Suspense fallback={null}><HostDashboardScreen /></Suspense>}

              {/* JOURNAL */}
              {activeTab === 'journal' && (
                <Suspense fallback={<ListFallback count={3} />}>
                  <JournalScreen user={user} t={t} />
                </Suspense>
              )}

              {/* PERSONAL LISTS */}
              {activeTab === 'personal_lists' && (
                <Suspense fallback={<ListFallback count={5} />}>
                  <PersonalListsScreen t={t} />
                </Suspense>
              )}

              {/* PROFILE */}
              {activeTab === 'profile' && user && (
                <div className="p-6 pt-10 max-w-3xl mx-auto">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-white/8">
                    <div className="text-center mb-6">
                      <div
                        className="w-32 h-32 rounded-full mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/40 border-4 border-slate-50 dark:border-slate-800 shadow-md flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-extrabold text-5xl"
                        aria-label={`${user.name}'s avatar`}
                      >
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{user.name}</h2>
                      <p className="text-lg text-slate-500 dark:text-slate-400">{user.email}</p>
                      <span className="inline-block mt-3 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-sm font-bold rounded-full uppercase tracking-wider">
                        {user.role || 'User'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-8 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{profileItineraryCount !== null ? profileItineraryCount : '—'}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{(t as any).profileTripsLabel || 'Trips'}</p>
                      </div>
                      <div className="w-px bg-slate-100 dark:bg-white/8" />
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{userReviewCount}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{(t as any).profileReviewsLabel || 'Reviews'}</p>
                      </div>
                    </div>

                    {/* Contribution tier */}
                    <div className={`flex items-center gap-3 p-4 ${tier.bg} rounded-2xl border border-slate-100 dark:border-white/8 mb-6`}>
                      <span className="text-2xl" aria-hidden="true">{tier.icon}</span>
                      <div>
                        <p className={`font-bold text-sm ${tier.color}`}>{tier.label}</p>
                        <p className="text-xs text-slate-500">{userReviewCount} {(t as any).profileReviewsLabel || 'Reviews'}</p>
                      </div>
                    </div>

                    {/* Karam Points */}
                    <div className="mb-4 border border-amber-200 dark:border-amber-800/40 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500 fill-amber-400" aria-hidden="true" />
                            <span className="font-bold text-amber-800 dark:text-amber-400 text-sm">{(t as any).profileKaramPoints || 'Karam Points'}</span>
                          </div>
                          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800/40">
                            {getKaramLevel(karamPoints, t)}
                          </span>
                        </div>
                        <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-400">{karamPoints.toLocaleString()}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{(t as any).profilePointsEarned || 'points earned'}</p>
                        <button
                          onClick={() => setShowKaramHistory(v => !v)}
                          className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
                          aria-expanded={showKaramHistory}
                        >
                          {(t as any).profileViewHistory || 'View History'}
                          {showKaramHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {showKaramHistory && (
                        <div className="border-t border-amber-100 dark:border-amber-800/40 bg-white dark:bg-slate-900 divide-y divide-amber-50 dark:divide-white/5">
                          {karamHistory.length === 0
                            ? <p className="text-center text-xs text-slate-400 py-4">{(t as any).profileNoHistory || 'No history yet'}</p>
                            : karamHistory.slice(0, 10).map(h => (
                              <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{h.label}</p>
                                  <p className="text-xs text-slate-400">{new Date(h.timestamp).toLocaleDateString()}</p>
                                </div>
                                <span className="text-sm font-bold text-amber-600">+{h.points}</span>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>

                    {/* Offline trips */}
                    <div className="mb-4 border border-slate-100 dark:border-white/8 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => { setOfflineTrips(getOfflineItineraries()); setShowOfflineTrips(v => !v); }}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-expanded={showOfflineTrips}
                      >
                        <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-sm">
                          <WifiOff className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                          {(t as any).profileOfflineTrips || 'Offline Trips'}
                          {offlineTrips.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">{offlineTrips.length}</span>
                          )}
                        </span>
                        {showOfflineTrips ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {showOfflineTrips && (
                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                          {offlineTrips.length === 0 ? (
                            <div className="text-center py-8 bg-white dark:bg-slate-900">
                              <Download className="w-8 h-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" aria-hidden="true" />
                              <p className="text-sm text-slate-400 font-medium">{(t as any).profileNoOffline || 'No offline trips saved yet.'}</p>
                            </div>
                          ) : offlineTrips.map(it => {
                            const itId = it._id || it.id || '';
                            return (
                              <div key={itId} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900">
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                  <MapPin className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{it.title}</p>
                                  <p className="text-xs text-slate-400">{it.places?.length ?? 0} stops</p>
                                </div>
                                <button onClick={() => handleOpenOfflineItinerary(it)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition flex-shrink-0">
                                  {(t as any).profileOpen || 'Open'}
                                </button>
                                <button onClick={() => handleRemoveOfflineTrip(itId)} className="p-1.5 text-slate-400 hover:text-red-500 transition flex-shrink-0" aria-label={`Remove ${it.title} from offline`}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Active trip resume */}
                    {activeTrip && (
                      <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Users2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{(t as any).profileActiveTrip || 'Active Trip'}</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{activeTrip.itinerary.title}</p>
                          </div>
                        </div>
                        <button onClick={() => setView('group')} className="flex-shrink-0 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition">
                          {(t as any).profileResumeTripFull || 'Resume Trip'}
                        </button>
                      </div>
                    )}

                    {/* Profile actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => { setEditProfileName(user.name || ''); setEditProfileAvatar(user.avatar || ''); setShowEditProfile(true); }}
                        className="flex items-center justify-between p-5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors rounded-2xl font-medium border border-emerald-100 dark:border-emerald-800/40 md:col-span-2"
                      >
                        <span className="flex items-center gap-3 text-emerald-800 dark:text-emerald-400 font-bold">
                          <Sparkles className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                          {(t as any).profileEditPrefs || 'Edit Profile & Preferences'}
                        </span>
                        <ChevronLeft className={`w-4 h-4 text-emerald-400 ${isRTL ? '' : 'rotate-180'}`} aria-hidden="true" />
                      </button>
                      <button onClick={() => switchTab('wallet')} className="flex items-center justify-between p-5 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors rounded-2xl font-medium border border-amber-100 dark:border-amber-800/30">
                        <span className="flex items-center gap-3 text-amber-800 dark:text-amber-400 font-bold"><Star className="w-5 h-5 text-amber-500" aria-hidden="true" /> {(t as any).tabWallet || (isRTL ? 'محفظتي' : 'My Wallet')}</span>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{karamPoints} pts</span>
                      </button>
                      <button onClick={() => switchTab('booking_history')} className="flex items-center justify-between p-5 bg-teal-50 dark:bg-teal-900/10 hover:bg-teal-100 dark:hover:bg-teal-900/20 transition-colors rounded-2xl font-medium border border-teal-100 dark:border-teal-800/30">
                        <span className="flex items-center gap-3 text-teal-800 dark:text-teal-400 font-bold"><Calendar className="w-5 h-5 text-teal-600" aria-hidden="true" /> {(t as any).tabBookings || (isRTL ? 'حجوزاتي' : 'My Bookings')}</span>
                        <ChevronLeft className={`w-4 h-4 text-teal-400 ${isRTL ? '' : 'rotate-180'}`} aria-hidden="true" />
                      </button>
                      <button onClick={toggleLanguage} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-2xl font-medium border border-slate-100 dark:border-white/8">
                        <span className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold"><Globe className="w-5 h-5 text-emerald-600" aria-hidden="true" /> Language / اللغة</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{lang === 'en' ? 'English' : 'العربية'}</span>
                      </button>
                      <button onClick={() => switchTab('settings')} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-2xl font-medium border border-slate-100 dark:border-white/8">
                        <span className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold"><Settings className="w-5 h-5 text-emerald-600" aria-hidden="true" /> {t.settings}</span>
                        <ChevronLeft className={`w-4 h-4 text-slate-400 ${isRTL ? '' : 'rotate-180'}`} aria-hidden="true" />
                      </button>
                      <button onClick={() => setShowWishLists(true)} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-2xl font-medium border border-slate-100 dark:border-white/8">
                        <span className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold"><Heart className="w-5 h-5 text-emerald-600" aria-hidden="true" /> {(t as any).profileWishLists || 'My Wish Lists'}</span>
                        <ChevronLeft className={`w-4 h-4 text-slate-400 ${isRTL ? '' : 'rotate-180'}`} aria-hidden="true" />
                      </button>
                      <button onClick={handleLogout} className="flex items-center justify-center p-5 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 rounded-2xl font-bold border border-red-100 dark:border-red-800/30 shadow-sm md:col-span-2">
                        <span className="flex items-center gap-3"><LogOut className="w-5 h-5" aria-hidden="true" /> {t.logout}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>

        {/* Floating AI assistant */}
        {user && (
          <Suspense fallback={null}>
            <AIAssistantLazy user={user as any} t={t} lang={lang} />
          </Suspense>
        )}

        {/* FIX #6 + #8 — Profile edit modal with backend save & avatar error handling */}
        {showEditProfile && user && (
          <div
            className="fixed inset-0 z-[200] bg-black/50 flex items-end"
            onClick={() => setShowEditProfile(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <div className="bg-white dark:bg-slate-900 w-full rounded-t-3xl shadow-2xl p-6 space-y-5 max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-slate-200 dark:bg-white/20 rounded-full mx-auto mb-2" aria-hidden="true" />
              <div className="flex items-center justify-between">
                <h3 id="edit-profile-title" className="text-xl font-black text-slate-900 dark:text-white">{(t as any).profileEditPrefs || 'Edit Profile'}</h3>
                <button onClick={() => setShowEditProfile(false)} className="p-2 bg-slate-50 dark:bg-white/10 rounded-full" aria-label="Close edit profile">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Avatar preview — FIX #8 */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border-4 border-slate-50 dark:border-slate-700 shadow overflow-hidden flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black text-2xl flex-shrink-0">
                  {editProfileAvatar && !avatarImgError
                    ? (
                      <img
                        src={editProfileAvatar}
                        alt={`${editProfileName}'s avatar preview`}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarImgError(true)}
                      />
                    )
                    : <span>{editProfileName?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1">
                  <label htmlFor="avatar-url" className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
                    {isRTL ? 'رابط الصورة' : 'Avatar URL'}
                  </label>
                  <input
                    id="avatar-url"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    placeholder="https://..."
                    value={editProfileAvatar}
                    onChange={e => setEditProfileAvatar(e.target.value)}
                  />
                  {avatarImgError && (
                    <p className="text-xs text-red-500 mt-1">{isRTL ? 'تعذّر تحميل الصورة' : 'Could not load image'}</p>
                  )}
                </div>
              </div>

              {/* Name field */}
              <div>
                <label htmlFor="profile-name" className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
                  {isRTL ? 'الاسم' : 'Name'}
                </label>
                <input
                  id="profile-name"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  placeholder={isRTL ? 'اسمك الكامل' : 'Full name'}
                  value={editProfileName}
                  onChange={e => setEditProfileName(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-black text-sm rounded-2xl active:scale-95 transition-transform"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={!editProfileName.trim()}
                  className="flex-1 py-3.5 bg-emerald-600 disabled:bg-emerald-300 text-white font-black text-sm rounded-2xl active:scale-95 transition-transform"
                >
                  {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wish lists modal */}
        {showWishLists && <WishListModal onClose={() => setShowWishLists(false)} />}

        {/* Bottom nav (mobile) */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/8 px-1 pt-2 flex justify-around items-center z-40 shadow-2xl transition-colors duration-300"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
          aria-label="Bottom navigation"
        >
          {BOTTOM_NAV.map(nav => (
            <button
              key={nav.id}
              onClick={() => switchTab(nav.id)}
              aria-label={isRTL ? nav.labelAr : nav.labelEn}
              aria-current={activeTab === nav.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all min-w-0 ${activeTab === nav.id ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/12' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <nav.icon className={`transition-transform ${activeTab === nav.id ? 'scale-110' : ''}`} style={{ width: 22, height: 22 }} aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wide">{isRTL ? nav.labelAr : nav.labelEn}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMoreSheet(true)}
            aria-label={(t as any).navMore || (isRTL ? 'المزيد' : 'More options')}
            aria-expanded={showMoreSheet}
            aria-haspopup="dialog"
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all min-w-0 ${MORE_TABS.has(activeTab) ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/12' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <Menu className="w-[22px] h-[22px]" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-wide">{(t as any).navMore || (isRTL ? 'المزيد' : 'More')}</span>
          </button>
        </nav>

        {/* FAB — create */}
        <button
          onClick={() => switchTab('create')}
          aria-label={isRTL ? 'إنشاء رحلة جديدة' : 'Create new trip'}
          className="lg:hidden fixed z-50 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full shadow-2xl shadow-emerald-900/60 active:scale-90 transition-transform hover:scale-105 flex items-center justify-center"
          style={{
            width: 52, height: 52,
            bottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 56px + 12px)',
            right: isRTL ? 'auto' : 20,
            left: isRTL ? 20 : 'auto',
          }}
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </button>

        {/* More sheet */}
        {showMoreSheet && (
          <>
            <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[60] lg:hidden" onClick={() => setShowMoreSheet(false)} aria-hidden="true" />
            <div
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl z-[70] lg:hidden shadow-2xl border-t border-slate-100 dark:border-white/8 transition-colors duration-300"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
              role="dialog"
              aria-modal="true"
              aria-label={isRTL ? 'قائمة التنقل الإضافية' : 'More navigation options'}
            >
              <div className="flex justify-between items-center px-6 pt-5 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white">{(t as any).moreTitle || (isRTL ? 'المزيد' : 'More')}</h3>
                <button onClick={() => setShowMoreSheet(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition" aria-label="Close">
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 px-6 pb-2">
                {moreSheetItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { switchTab(item.id); setShowMoreSheet(false); }}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${activeTab === item.id ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'border-slate-100 dark:border-white/8 hover:border-slate-200 dark:hover:border-white/20'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? item.darkColor : item.lightColor}`} aria-hidden="true">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Mobile search overlay — FIX #5: uses navigate */}
        {showMobileSearch && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex flex-col lg:hidden"
            onClick={() => setShowMobileSearch(false)}
            role="dialog"
            aria-modal="true"
            aria-label={isRTL ? 'البحث' : 'Search'}
          >
            <div className="bg-white dark:bg-slate-900 px-4 pt-4 pb-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{isRTL ? 'البحث' : 'Search'}</span>
                <button onClick={() => setShowMobileSearch(false)} className="ml-auto p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close search">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <GlobalSearch onNavigate={(tab, id) => {
                navigate(tab, id); // ✅ switchTab via navigate
                setShowMobileSearch(false);
              }} />
            </div>
          </div>
        )}

      </div>

      <ToastContainer />
    </AppWrapper>
  );
};
