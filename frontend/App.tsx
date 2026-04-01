import React, { useState, useEffect } from 'react';
import { Home, Search, Plus, User as UserIcon, Settings, ChevronLeft, LogOut, Globe, Users, Menu, X, Heart, Shield, Users2, Sparkles, Download, Trash2, WifiOff, ChevronDown, ChevronUp, MapPin, Calendar, Star, Store, Tent, Compass, Lock, LayoutGrid, Camera, Sun, Moon } from 'lucide-react';
import { User, Itinerary, GroupTrip, SmartProfile, PrivateTrip } from './src/types/index';
import { TRANSLATIONS } from './translations';
import { authAPI, itineraryAPI, groupTripAPI } from './src/services/api';
import { getOfflineItineraries, removeOfflineItinerary } from './src/screens/ItineraryDetailScreen';

// Screens
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { YourMoodScreen } from './src/screens/YourMoodScreen';
import { CreateScreen } from './src/screens/CreateScreen';
import { ItineraryDetailScreen } from './src/screens/ItineraryDetailScreen';
import { GroupTripScreen } from './src/screens/GroupTripScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { CommunitiesScreen } from './src/screens/CommunitiesScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { HostDashboardScreen } from './src/screens/HostDashboardScreen';
import { AIAssistant } from './src/components/AIAssistant';
import { ARGuideScreen } from './src/screens/ARGuideScreen';
import { AIPlannerScreen } from './src/screens/AIPlannerScreen';
import { WishListModal } from './src/components/WishListModal';
import { NotificationPanel } from './src/components/NotificationPanel';
import { EventsScreen } from './src/screens/EventsScreen';
import { RentalsScreen } from './src/screens/RentalsScreen';
import { ToastContainer } from './src/components/Toast';
import { GlobalSearch } from './src/components/GlobalSearch';
import { ToursScreen } from './src/screens/ToursScreen';
import { PlacesScreen } from './src/screens/PlacesScreen';
import { MyTripsScreen } from './src/screens/MyTripsScreen';
import { PrivateTripScreen } from './src/screens/PrivateTripScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';

// Error boundary to prevent blank screens on render crashes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class AuthErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    (this as any).state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = (this as any).state as { error: Error | null };
    const { children, onReset } = (this as any).props as { children: React.ReactNode; onReset: () => void };
    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6">{error.message}</p>
          <button
            onClick={() => { (this as any).setState({ error: null }); onReset(); }}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      );
    }
    return children;
  }
}

// Stable layout wrappers — must be defined OUTSIDE App so React doesn't
// treat them as new component types on every render (which would unmount children).
const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-300">
    {children}
  </div>
);

const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="h-screen w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300">
    {children}
  </div>
);

// localStorage key for active group trip persistence (Feature 4)
const ACTIVE_TRIP_KEY = 'tripo_active_group_trip';

// Karam Points localStorage keys
const KARAM_POINTS_KEY = 'tripo_karam_points';
const KARAM_HISTORY_KEY = 'tripo_karam_history';

const getKaramLevel = (points: number, t?: any): string => {
  if (points >= 1000) return t?.karamLegend    || 'Legend';
  if (points >= 500)  return t?.karamPathfinder || 'Pathfinder';
  if (points >= 200)  return t?.karamAdventurer || 'Adventurer';
  return t?.karamExplorer || 'Explorer';
};

const getContributionTier = (count: number, t?: any) => {
  if (count >= 50) return { label: t?.tierExpert  || 'Expert Explorer',  color: 'text-purple-700',  bg: 'bg-purple-50',  icon: '💎' };
  if (count >= 20) return { label: t?.tierGuide   || 'Trusted Guide',    color: 'text-blue-700',    bg: 'bg-blue-50',    icon: '🥇' };
  if (count >= 5)  return { label: t?.tierActive  || 'Active Traveller', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '🌟' };
  return           { label: t?.tierNew    || 'New Explorer',            color: 'text-slate-600',   bg: 'bg-slate-50',   icon: '🌱' };
};

export const App = () => {
  const [view, setView] = useState<'welcome' | 'auth' | 'main' | 'itinerary' | 'group' | 'loading' | 'privateTrip'>('loading');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userReviewCount, setUserReviewCount] = useState<number>(
    parseInt(localStorage.getItem('tripo_review_count') || '0', 10)
  );
  const [showWishLists, setShowWishLists] = useState(false);
  const [profileItineraryCount, setProfileItineraryCount] = useState<number | null>(null);
  const [offlineTrips, setOfflineTrips] = useState<Itinerary[]>(() => getOfflineItineraries());
  const [showOfflineTrips, setShowOfflineTrips] = useState(false);
  const [karamPoints, setKaramPoints] = useState<number>(() => {
    const stored = localStorage.getItem(KARAM_POINTS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [karamHistory, setKaramHistory] = useState<{id: string; action: string; points: number; label: string; timestamp: number}[]>(() => {
    try {
      const raw = localStorage.getItem(KARAM_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [showKaramHistory, setShowKaramHistory] = useState(false);
  const [createInitialTitle, setCreateInitialTitle] = useState<string | undefined>(undefined);
  const [pendingEventId, setPendingEventId] = useState<string | undefined>(undefined);
  const [pendingTourId, setPendingTourId] = useState<string | undefined>(undefined);
  const [pendingPlaceId, setPendingPlaceId] = useState<string | undefined>(undefined);
  const [pendingRentalId, setPendingRentalId] = useState<string | undefined>(undefined);
  const [pendingCommunityId, setPendingCommunityId] = useState<string | undefined>(undefined);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('tripo_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Navigation State
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [activeTrip, setActiveTrip] = useState<GroupTrip | null>(null);
  const [selectedPrivateTrip, setSelectedPrivateTrip] = useState<PrivateTrip | null>(null);

  // Derived translation object
  const t = TRANSLATIONS[lang];

  // Handle RTL
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Sync dark mode class on <html> + persist
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('tripo_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Handle 401 unauthorized from API interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setView('auth');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Fetch fresh user data and itinerary count whenever the user state is set
  useEffect(() => {
    if (!user) return;
    const fetchProfileData = async () => {
      try {
        const freshUser = await authAPI.getMe();
        setUser(prev => prev ? { ...prev, ...freshUser } : freshUser);
        localStorage.setItem('user', JSON.stringify({ ...user, ...freshUser }));
      } catch (_) {
        // silently fall back to stored user — already displayed
      }
      try {
        const itins = await itineraryAPI.getItineraries({ limit: 200 });
        const userId = user.id;
        const mine = Array.isArray(itins)
          ? itins.filter((it: any) => {
              if (typeof it.userId === 'object' && it.userId !== null) {
                return (it.userId._id || it.userId.id) === userId;
              }
              return it.userId === userId || it.authorId === userId;
            })
          : [];
        setProfileItineraryCount(mine.length);
      } catch (_) {
        // leave count as null — will not render
      }
      // Sync review count from localStorage in case it changed
      setUserReviewCount(parseInt(localStorage.getItem('tripo_review_count') || '0', 10));
    };
    fetchProfileData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-Login and initial data load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token) {
        try {
          // Attempt to fetch fresh profile from API
          const profile = await authAPI.getProfile();
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));

          setView('main');
            // Feature 4: Restore active group trip after successful auth
            try {
              const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
              if (raw) {
                const trip: GroupTrip = JSON.parse(raw);
                if (trip?.id && trip?.itinerary) setActiveTrip(trip);
              }
            } catch (_) { /* noop */ }
        } catch (e) {
          console.error("Failed to fetch fresh profile, falling back to local storage...", e);
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setView('main');
              // Feature 4: Restore active group trip from localStorage
              try {
                const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
                if (raw) {
                  const trip: GroupTrip = JSON.parse(raw);
                  if (trip?.id && trip?.itinerary) setActiveTrip(trip);
                }
              } catch (_) { /* noop */ }
            } catch (err) {
              console.error("Local storage user parse failed", err);
              handleLogout();
            }
          } else {
            handleLogout();
          }
        }
      } else {
        setView('welcome');
      }
    };

    initializeAuth();
  }, []);

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  const handleLogin = async () => {
    setView('loading');
    const restoreTrip = () => {
      try {
        const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
        if (raw) {
          const trip: GroupTrip = JSON.parse(raw);
          if (trip?.id && trip?.itinerary) setActiveTrip(trip);
        }
      } catch (_) { /* noop */ }
    };
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
        setView('main');
        restoreTrip();
      } catch (_) {
        setView('auth');
      }
    } else {
      // Backup in case localStorage isn't set instantly by AuthScreen
      try {
        const profile = await authAPI.getProfile();
        setUser(profile);
        setView('main');
        restoreTrip();
      } catch (_) {
        setView('auth');
      }
    }
  };

  const handleRegister = async () => {
    setView('loading');
    const storedUser = localStorage.getItem('user');
    let resolvedUser: User | null = null;
    if (storedUser) {
      try { resolvedUser = JSON.parse(storedUser); } catch (_) { /* ignore */ }
    }
    if (!resolvedUser) {
      try {
        resolvedUser = await authAPI.getProfile();
        localStorage.setItem('user', JSON.stringify(resolvedUser));
      } catch (_) {
        setView('auth');
        return;
      }
    }
    setUser(resolvedUser);
    setView('main');
  };

  const handleGuestLogin = () => {
    setUser({ id: 'guest', name: 'Guest', email: '' } as any);
    setView('main');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    setUser(null);
    setActiveTrip(null);
    setView('welcome');
  };

  // Karam Points: award points for actions
  const awardKaramPoints = (action: string, points: number, label: string) => {
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
  };

  // First daily login check — award 10 points on first login of the day
  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem('tripo_last_login_date');
    if (lastLogin !== today) {
      localStorage.setItem('tripo_last_login_date', today);
      awardKaramPoints('daily_login', 10, 'First login of the day');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Feature 4: Restore persisted active group trip from localStorage
  const restoreActiveTrip = () => {
    try {
      const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
      if (raw) {
        const trip: GroupTrip = JSON.parse(raw);
        if (trip && trip.id && trip.itinerary) {
          setActiveTrip(trip);
        }
      }
    } catch (e) {
      console.warn('Failed to restore active group trip:', e);
    }
  };

  const openItinerary = (it: Itinerary) => {
    setSelectedItinerary(it);
    setView('itinerary');
  };

  const handleRemoveOfflineTrip = (id: string) => {
    removeOfflineItinerary(id);
    setOfflineTrips(getOfflineItineraries());
  };

  const handleOpenOfflineItinerary = (it: Itinerary) => {
    setSelectedItinerary(it);
    setView('itinerary');
  };

  const startGroupTrip = async () => {
    if (!selectedItinerary || !user) return;
    const itineraryBackendId = selectedItinerary._id || selectedItinerary.id;
    const isMongoId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

    const newTrip: GroupTrip = {
      id: Date.now().toString(),
      itinerary: selectedItinerary,
      members: [user],
      chatMessages: [],
      expenses: []
    };

    if (itineraryBackendId && isMongoId(itineraryBackendId)) {
      try {
        const backendTrip = await groupTripAPI.create(itineraryBackendId, selectedItinerary.title);
        newTrip.backendId = backendTrip._id || backendTrip.id;
      } catch (e) {
        console.warn('Could not create backend group trip, running locally:', e);
      }
    }

    // Feature 4: Persist group trip to localStorage so it survives refresh
    try {
      localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(newTrip));
    } catch (e) {
      console.warn('Could not persist group trip to localStorage:', e);
    }

    setActiveTrip(newTrip);
    setView('group');
  };

  // Feature 4: Wrapper around setActiveTrip that also syncs to localStorage
  const handleUpdateTrip = (tripOrUpdater: GroupTrip | ((prev: GroupTrip) => GroupTrip)) => {
    setActiveTrip(prev => {
      const resolved = typeof tripOrUpdater === 'function'
        ? (prev ? (tripOrUpdater as (p: GroupTrip) => GroupTrip)(prev) : prev)
        : tripOrUpdater;
      if (resolved) {
        try {
          localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(resolved));
        } catch (_) { /* noop */ }
      }
      return resolved;
    });
  };

  // Feature 4: End trip and clear localStorage
  const handleEndTrip = () => {
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    setActiveTrip(null);
    setView('main');
  };

  if (view === 'loading') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (view === 'welcome') return (
    <WelcomeScreen
      onGetStarted={() => { setAuthMode('register'); setView('auth'); }}
      onSignIn={() => { setAuthMode('login'); setView('auth'); }}
    />
  );
  if (view === 'auth') return (
    <AuthErrorBoundary onReset={() => setView('welcome')}>
      <AuthScreen onLogin={handleLogin} onRegister={handleRegister} onGuestLogin={handleGuestLogin} t={t} lang={lang} onToggleLang={toggleLanguage} initialMode={authMode} />
    </AuthErrorBoundary>
  );
  if (view === 'itinerary' && selectedItinerary) return <ModalWrapper><ItineraryDetailScreen itinerary={selectedItinerary} onBack={() => setView('main')} onStartGroup={startGroupTrip} t={t} onAwardKaramPoints={awardKaramPoints} /></ModalWrapper>;
  if (view === 'group' && activeTrip && user) return <AppWrapper><ModalWrapper><GroupTripScreen trip={activeTrip} currentUser={user} onBack={handleEndTrip} onUpdateTrip={handleUpdateTrip as any} t={t} /></ModalWrapper></AppWrapper>;
  if (view === 'privateTrip' && selectedPrivateTrip && user) return (
    <AppWrapper>
      <ModalWrapper>
        <PrivateTripScreen
          trip={selectedPrivateTrip}
          currentUser={user}
          onBack={() => { setView('main'); setActiveTab('my_trips'); }}
          onUpdateTrip={(updated) => setSelectedPrivateTrip(updated)}
        />
      </ModalWrapper>
    </AppWrapper>
  );


  const tier = getContributionTier(userReviewCount, t);
  const isAdmin = (user as any)?.role === 'admin';

  // Feature 2: Check if user has any claimed places
  const hasClaimedPlaces = (() => {
    try {
      const claimed = JSON.parse(localStorage.getItem('tripo_claimed_places') || '[]');
      return Array.isArray(claimed) && claimed.length > 0;
    } catch { return false; }
  })();

  // Main Desktop/Mobile Shell
  return (
    <AppWrapper>
      <div className="flex h-full relative">

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-800/40 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar (Desktop fixed, Mobile sliding) */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/8 transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="h-full flex flex-col pt-6 pb-4">

            {/* Logo / Header */}
            <div className="px-6 flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">T</span>
                </div>
                <span className="font-bold text-xl text-slate-800 tracking-tight">Tripo</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Global Search */}
            <div className="px-4 mb-4">
              <GlobalSearch onNavigate={(tab, id) => {
                  setActiveTab(tab);
                  setIsSidebarOpen(false);
                  if (id) {
                    if (tab === 'places')  setPendingPlaceId(id);
                    if (tab === 'tours')   setPendingTourId(id);
                    if (tab === 'rentals') setPendingRentalId(id);
                    if (tab === 'events')  setPendingEventId(id);
                  }
                }} />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-2">
              {[
                { id: 'home', icon: Home, label: t.tabHome },
                { id: 'explore', icon: Search, label: t.tabExplore },
                { id: 'places', icon: MapPin, label: (t as any).tabPlaces || 'Places' },
                { id: 'tours', icon: Compass, label: (t as any).tabTours || 'Tours' },
                { id: 'my_trips', icon: Lock, label: (t as any).tabMyTrips || 'My Private Trips' },
                { id: 'create', icon: Plus, label: (t as any).tabCreate || 'New Trip' },
                { id: 'communities', icon: Users, label: t.tabCommunities },
                { id: 'your_mood', icon: Heart, label: (t as any).tabYourMood || 'Your Mood' },
                { id: 'ar', icon: Camera, label: (t as any).tabAR || 'AR Guide' },
                { id: 'ai_planner', icon: Sparkles, label: `✨ ${(t as any).tabAIPlanner || 'AI Planner'}` },
                { id: 'events', icon: Calendar, label: (t as any).tabEvents || 'Events' },
                { id: 'rentals', icon: Tent, label: (t as any).tabRentals || 'Rentals' },
                { id: 'profile', icon: UserIcon, label: t.tabProfile },
                ...(isAdmin ? [{ id: 'admin', icon: Shield, label: (t as any).tabAdmin || 'Admin' }] : []),
                ...(hasClaimedPlaces ? [{ id: 'host', icon: Store, label: (t as any).tabHost || 'Host Dashboard' }] : []),
              ].map((nav) => (
                <button
                  key={nav.id}
                  onClick={() => { setActiveTab(nav.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === nav.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                >
                  <nav.icon className={`w-5 h-5 ${activeTab === nav.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {nav.label}
                </button>
              ))}
            </nav>

            {/* Sidebar Footer User Info */}
            <div className="mt-auto px-4">
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-slate-200 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email || 'Guest'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">

          {/* Mobile Header (Shows Hamburger + Notification Bell + Theme Toggle) */}
          <div className="lg:hidden bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-white/8 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-black text-lg text-slate-800 dark:text-white tracking-tight">Tripo</span>
            <div className="flex items-center gap-2">
              {/* Mobile Search */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              {/* Dark / Light toggle */}
              <button
                onClick={() => setIsDark(d => !d)}
                className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                style={{ backgroundColor: isDark ? '#10b981' : '#cbd5e1' }}
                aria-label="Toggle theme"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300"
                  style={{ transform: isDark ? 'translateX(28px)' : 'translateX(0px)' }}
                >
                  {isDark
                    ? <Moon className="w-3.5 h-3.5 text-emerald-600" />
                    : <Sun  className="w-3.5 h-3.5 text-amber-500" />
                  }
                </span>
              </button>
              <NotificationPanel />
            </div>
          </div>

          {/* Desktop Notification Bar (top-right, visible on lg+) */}
          <div className="hidden lg:flex bg-white dark:bg-slate-900 px-6 py-2.5 border-b border-slate-200 dark:border-white/8 items-center justify-end gap-3 sticky top-0 z-30 transition-colors duration-300">
            {/* Dark / Light toggle */}
            <button
              onClick={() => setIsDark(d => !d)}
              className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              style={{ backgroundColor: isDark ? '#10b981' : '#cbd5e1' }}
              aria-label="Toggle theme"
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300"
                style={{ transform: isDark ? 'translateX(28px)' : 'translateX(0px)' }}
              >
                {isDark
                  ? <Moon className="w-3.5 h-3.5 text-emerald-600" />
                  : <Sun  className="w-3.5 h-3.5 text-amber-500" />
                }
              </span>
            </button>
            <NotificationPanel />
          </div>

          {/* Scrollable Content View */}
          <div className="flex-1 overflow-y-auto w-full">
            <div className="max-w-7xl mx-auto h-full">
              {activeTab === 'home' && user && (
                <>
                  {/* Feature 4: Resume Trip banner on home screen */}
                  {activeTrip && (
                    <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Users2 className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{(t as any).activeGroupTrip || 'Active Group Trip'}</p>
                          <p className="text-sm font-semibold text-slate-800 truncate">{activeTrip.itinerary.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setView('group')}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition"
                        >
                          {(t as any).resumeBtn || 'Resume'}
                        </button>
                        <button
                          onClick={handleEndTrip}
                          className="px-3 py-2 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-100 transition"
                        >
                          {(t as any).endBtn || 'End'}
                        </button>
                      </div>
                    </div>
                  )}
                  <HomeScreen user={user} lang={lang} onOpenItinerary={openItinerary} t={t} onOpenAR={() => setActiveTab('ar')} onNavigate={(tab: string, id?: string) => { setActiveTab(tab); if (id && tab === 'events') setPendingEventId(id); if (id && tab === 'tours') setPendingTourId(id); if (id && tab === 'places') setPendingPlaceId(id); if (id && tab === 'rentals') setPendingRentalId(id); if (id && tab === 'communities') setPendingCommunityId(id); }} />
                </>
              )}

              {activeTab === 'places' && <PlacesScreen t={t} initialPlaceId={pendingPlaceId} onPlaceOpened={() => setPendingPlaceId(undefined)} />}

              {activeTab === 'explore' && <ExploreScreen t={t} onOpenPlace={(p) => console.log('Place clicked', p)} />}

              {activeTab === 'tours' && (
                <ToursScreen
                  t={t}
                  initialTourId={pendingTourId}
                  onTourOpened={() => setPendingTourId(undefined)}
                  onBookingComplete={(itinerary, groupTrip) => {
                    const trip: GroupTrip = {
                      id: (groupTrip as any)._id || (groupTrip as any).id || Date.now().toString(),
                      backendId: (groupTrip as any)._id || (groupTrip as any).id,
                      itinerary,
                      members: user ? [user] : [],
                      chatMessages: [],
                      expenses: [],
                    };
                    setActiveTrip(trip);
                    setView('group');
                  }}
                />
              )}

              {activeTab === 'my_trips' && user && (
                <MyTripsScreen
                  currentUser={user}
                  onOpenTrip={(trip) => {
                    setSelectedPrivateTrip(trip);
                    setView('privateTrip');
                  }}
                />
              )}

              {activeTab === 'create' && user && <CreateScreen onSave={(_it) => { awardKaramPoints('publish_itinerary', 100, 'Published a trip'); setCreateInitialTitle(undefined); setActiveTab('home'); }} t={t} initialTitle={createInitialTitle} currentUser={user} onPrivateTripCreated={() => { setCreateInitialTitle(undefined); setActiveTab('my_trips'); }} />}

              {activeTab === 'communities' && <CommunitiesScreen t={t} lang={lang} onOpenItinerary={openItinerary} initialCommunityId={pendingCommunityId} onCommunityOpened={() => setPendingCommunityId(undefined)} />}

              {activeTab === 'ai_planner' && (
                <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
                  <AIPlannerScreen />
                </div>
              )}

              {activeTab === 'events' && <EventsScreen t={t} lang={lang} onCreateWithEvent={(title) => { setCreateInitialTitle(title); setActiveTab('create'); }} initialEventId={pendingEventId} onEventOpened={() => setPendingEventId(undefined)} />}

              {activeTab === 'rentals' && <RentalsScreen t={t} initialRentalId={pendingRentalId} onRentalOpened={() => setPendingRentalId(undefined)} />}

              {activeTab === 'ar' && user && (
                <ARGuideScreen onBack={() => setActiveTab('home')} t={t} user={user} lang={lang} nearbyPlaces={[]} itineraryPlaces={[]} />
              )}

              {activeTab === 'your_mood' && user && (
                <YourMoodScreen
                  t={t}
                  user={user}
                  onNavigate={(tab, id) => {
                    setActiveTab(tab);
                    if (id && tab === 'places')  setPendingPlaceId(id);
                    if (id && tab === 'tours')   setPendingTourId(id);
                    if (id && tab === 'rentals') setPendingRentalId(id);
                  }}
                />
              )}

              {activeTab === 'admin' && isAdmin && <AdminScreen t={t} />}

              {activeTab === 'host' && <HostDashboardScreen />}

              {activeTab === 'profile' && user && (
                <div className="p-6 pt-10 max-w-3xl mx-auto">
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="text-center mb-6">
                      <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-emerald-100 border-4 border-slate-50 shadow-md flex items-center justify-center text-emerald-700 font-extrabold text-5xl">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <h2 className="text-3xl font-extrabold text-slate-900">{user.name}</h2>
                      <p className="text-lg text-slate-500">{user.email}</p>
                      <span className="inline-block mt-3 px-4 py-1.5 bg-emerald-100 text-emerald-800 text-sm font-bold rounded-full uppercase tracking-wider">
                        {(user as any)?.role || 'User'}
                      </span>
                    </div>

                    {/* Stats Row */}
                    <div className="flex justify-center gap-8 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-slate-900">
                          {profileItineraryCount !== null ? profileItineraryCount : '—'}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{(t as any).profileTripsLabel || 'Trips'}</p>
                      </div>
                      <div className="w-px bg-slate-100" />
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-slate-900">{userReviewCount}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{(t as any).profileReviewsLabel || 'Reviews'}</p>
                      </div>
                    </div>

                    {/* Contribution Tier Badge */}
                    <div className={`flex items-center gap-3 p-4 ${tier.bg} rounded-2xl border border-slate-100 mb-6`}>
                      <span className="text-2xl">{tier.icon}</span>
                      <div>
                        <p className={`font-bold text-sm ${tier.color}`}>{tier.label}</p>
                        <p className="text-xs text-slate-500">{userReviewCount} {(t as any).profileReviewsLabel || 'Reviews'}</p>
                      </div>
                    </div>

                    {/* Karam Points Card */}
                    <div className="mb-4 border border-amber-200 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                            <span className="font-bold text-amber-800 text-sm">{(t as any).profileKaramPoints || 'Karam Points'}</span>
                          </div>
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                            {getKaramLevel(karamPoints, t)}
                          </span>
                        </div>
                        <p className="text-3xl font-extrabold text-amber-700">{karamPoints.toLocaleString()}</p>
                        <p className="text-xs text-amber-600 mt-0.5">{(t as any).profilePointsEarned || 'points earned'}</p>
                        <div className="mt-3 text-xs text-amber-500 space-y-0.5">
                          <p>{(t as any).profileKaramDesc1 || 'Write a review: +50 pts · Create trip: +100 pts'}</p>
                          <p>{(t as any).profileKaramDesc2 || 'Complete trip: +75 pts · Daily login: +10 pts'}</p>
                        </div>
                        <button
                          onClick={() => setShowKaramHistory(v => !v)}
                          className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
                        >
                          {(t as any).profileViewHistory || 'View History'}
                          {showKaramHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {showKaramHistory && (
                        <div className="border-t border-amber-100 bg-white divide-y divide-amber-50">
                          {karamHistory.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-4">{(t as any).profileNoHistory || 'No history yet'}</p>
                          ) : karamHistory.slice(0, 10).map(h => (
                            <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                              <div>
                                <p className="text-xs font-semibold text-slate-700">{h.label}</p>
                                <p className="text-xs text-slate-400">{new Date(h.timestamp).toLocaleDateString()}</p>
                              </div>
                              <span className="text-sm font-bold text-amber-600">+{h.points}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Offline Trips Section */}
                    <div className="mb-4 border border-slate-100 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => { setOfflineTrips(getOfflineItineraries()); setShowOfflineTrips(v => !v); }}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                          <WifiOff className="w-4 h-4 text-emerald-600" />
                          {(t as any).profileOfflineTrips || 'Offline Trips'}
                          {offlineTrips.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{offlineTrips.length}</span>
                          )}
                        </span>
                        {showOfflineTrips ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {showOfflineTrips && (
                        <div className="divide-y divide-slate-50">
                          {offlineTrips.length === 0 ? (
                            <div className="text-center py-8 bg-white">
                              <Download className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                              <p className="text-sm text-slate-400 font-medium">{(t as any).profileNoOffline || 'No offline trips saved yet.'}</p>
                              <p className="text-xs text-slate-300 mt-1">{(t as any).profileSaveOfflineHint || 'Tap "Save Offline" on any trip.'}</p>
                            </div>
                          ) : offlineTrips.map(it => {
                            const itId = it._id || it.id || '';
                            return (
                              <div key={itId} className="flex items-center gap-3 p-4 bg-white">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <MapPin className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm truncate">{it.title}</p>
                                  <p className="text-xs text-slate-400">{it.places?.length ?? 0} stops</p>
                                </div>
                                <button
                                  onClick={() => handleOpenOfflineItinerary(it)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition flex-shrink-0"
                                >
                                  {(t as any).profileOpen || 'Open'}
                                </button>
                                <button
                                  onClick={() => handleRemoveOfflineTrip(itId)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 transition flex-shrink-0"
                                  aria-label="Remove offline trip"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Feature 4: Resume Trip card in profile */}
                    {activeTrip && (
                      <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Users2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{(t as any).profileActiveTrip || 'Active Trip'}</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">{activeTrip.itinerary.title}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setView('group')}
                          className="flex-shrink-0 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition"
                        >
                          {(t as any).profileResumeTripFull || 'Resume Trip'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button onClick={() => setShowEditProfile(true)} className="flex items-center justify-between p-5 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl font-medium border border-emerald-100 md:col-span-2">
                        <span className="flex items-center gap-3 text-emerald-800 font-bold"><Sparkles className="w-5 h-5 text-emerald-600" /> {(t as any).profileEditPrefs || 'Edit Travel Preferences'}</span>
                        <ChevronLeft className="w-4 h-4 text-emerald-400 rotate-180" />
                      </button>
                      <button onClick={toggleLanguage} className="flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl font-medium border border-slate-100">
                        <span className="flex items-center gap-3 text-slate-700 font-bold"><Globe className="w-5 h-5 text-emerald-600" /> Language / اللغة</span>
                        <span className="text-sm font-bold text-emerald-600">{lang === 'en' ? 'English' : 'العربية'}</span>
                      </button>
                      <button onClick={() => setShowSettings(true)} className="flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl font-medium border border-slate-100">
                        <span className="flex items-center gap-3 text-slate-700 font-bold"><Settings className="w-5 h-5 text-emerald-600" /> {t.settings}</span>
                        <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180" />
                      </button>
                      <button onClick={() => setShowWishLists(true)} className="flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl font-medium border border-slate-100">
                        <span className="flex items-center gap-3 text-slate-700 font-bold"><Heart className="w-5 h-5 text-emerald-600" /> {(t as any).profileWishLists || 'My Wish Lists'}</span>
                        <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180" />
                      </button>
                      <button onClick={handleLogout} className="flex items-center justify-center p-5 bg-red-50 hover:bg-red-100 transition-colors text-red-600 rounded-2xl font-bold border border-red-100 shadow-sm">
                        <span className="flex items-center gap-3"><LogOut className="w-5 h-5" /> {t.logout}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Assistant - Floating Button */}
        {user && <AIAssistant user={user as any} t={t} lang={lang} />}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">{t.settings}</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-slate-100 transition"><ChevronLeft className="w-5 h-5 text-slate-400 rotate-180" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-medium text-slate-700">Language / اللغة</span>
                  <button onClick={toggleLanguage} className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition">
                    {lang === 'en' ? 'العربية' : 'English'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-medium text-slate-700">{(t as any).settingsAccount || 'Account'}</span>
                  <span className="text-sm text-slate-500">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-medium text-slate-700">{(t as any).settingsVersion || 'Version'}</span>
                  <span className="text-sm text-slate-400">1.0.0</span>
                </div>
                <button onClick={() => { setShowSettings(false); handleLogout(); }} className="w-full p-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition text-sm">
                  {t.logout}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wish Lists Modal */}
        {showWishLists && <WishListModal onClose={() => setShowWishLists(false)} />}

        {/* Mobile Bottom Nav — 5 tabs */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/8 px-1 pt-2 pb-safe flex justify-around items-center z-40 shadow-2xl transition-colors duration-300" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          {[
            { id: 'home',        icon: Home,   label: (t as any).navHome      || (lang === 'ar' ? 'الرئيسية' : 'Home') },
            { id: 'explore',     icon: Search, label: (t as any).navMap       || (lang === 'ar' ? 'الخريطة'  : 'Map') },
            { id: 'rentals',     icon: Tent,   label: (t as any).navRentals   || (lang === 'ar' ? 'الإيجارات': 'Rentals') },
            { id: 'communities', icon: Users,  label: (t as any).navCommunity || (lang === 'ar' ? 'المجتمع'  : 'Community') },
          ].map(nav => (
            <button
              key={nav.id}
              onClick={() => setActiveTab(nav.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all min-w-0 ${
                activeTab === nav.id
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/12'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <nav.icon className={`w-5.5 h-5.5 transition-all ${activeTab === nav.id ? 'scale-110' : ''}`} style={{ width: 22, height: 22 }} />
              <span className="text-[10px] font-bold tracking-wide">{nav.label}</span>
            </button>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMoreSheet(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all min-w-0 ${
              ['places','tours','my_trips','ar','your_mood','ai_planner','events','profile','admin','host'].includes(activeTab)
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/12'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Menu className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-bold tracking-wide">{(t as any).navMore || (lang === 'ar' ? 'المزيد' : 'More')}</span>
          </button>
        </div>

        {/* Floating Action Button — above nav bar, for creating trips/itineraries */}
        <button
          onClick={() => setActiveTab('create')}
          className="lg:hidden fixed z-50 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full shadow-2xl shadow-emerald-900/60 active:scale-90 transition-transform hover:scale-105 flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            bottom: 'calc(max(env(safe-area-inset-bottom), 8px) + 56px + 12px)',
            right: lang === 'ar' ? 'auto' : 20,
            left: lang === 'ar' ? 20 : 'auto',
          }}
          title={(t as any).newTrip || (lang === 'ar' ? 'رحلة جديدة' : 'New Trip')}
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* More Sheet */}
        {showMoreSheet && (
          <>
            <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[60] lg:hidden" onClick={() => setShowMoreSheet(false)} />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl z-[70] lg:hidden shadow-2xl pb-safe border-t border-slate-100 dark:border-white/8 transition-colors duration-300">
              <div className="flex justify-between items-center px-6 pt-5 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white">{(t as any).moreTitle || 'More'}</h3>
                <button onClick={() => setShowMoreSheet(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition">
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 px-6 pb-8">
                {[
                  { id: 'places',     icon: MapPin,    label: (t as any).tabPlaces    || 'Places',     lightColor: 'bg-slate-100 text-slate-600',   darkColor: 'bg-slate-800 text-slate-300' },
                  { id: 'tours',      icon: Compass,   label: (t as any).tabTours     || 'Tours',      lightColor: 'bg-teal-50 text-teal-600',      darkColor: 'bg-teal-900/50 text-teal-400' },
                  { id: 'my_trips',   icon: Lock,      label: (t as any).moreMyTrips  || 'My Trips',   lightColor: 'bg-emerald-50 text-emerald-600', darkColor: 'bg-emerald-900/50 text-emerald-400' },
                  { id: 'ar',         icon: Camera,    label: (t as any).moreARGuide  || 'AR Guide',   lightColor: 'bg-orange-50 text-orange-600',   darkColor: 'bg-orange-900/50 text-orange-400' },
                  { id: 'ai_planner', icon: Sparkles,  label: (t as any).moreAIPlanner|| 'AI Planner', lightColor: 'bg-purple-50 text-purple-600',   darkColor: 'bg-purple-900/50 text-purple-400' },
                  { id: 'events',     icon: Calendar,  label: (t as any).tabEvents    || 'Events',     lightColor: 'bg-blue-50 text-blue-600',       darkColor: 'bg-blue-900/50 text-blue-400' },
                  { id: 'profile',    icon: UserIcon,  label: t.tabProfile,                            lightColor: 'bg-slate-100 text-slate-600',    darkColor: 'bg-slate-800 text-slate-300' },
                  ...(isAdmin       ? [{ id: 'admin', icon: Shield, label: (t as any).tabAdmin || 'Admin', lightColor: 'bg-red-50 text-red-600', darkColor: 'bg-red-900/50 text-red-400' }] : []),
                  ...(hasClaimedPlaces ? [{ id: 'host', icon: Store, label: (t as any).moreHost || 'Host', lightColor: 'bg-emerald-50 text-emerald-600', darkColor: 'bg-emerald-900/50 text-emerald-400' }] : []),
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setShowMoreSheet(false); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      activeTab === item.id
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-600'
                        : 'border-slate-100 dark:border-white/8 hover:border-slate-200 dark:hover:border-white/20'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? item.darkColor : item.lightColor}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col lg:hidden" onClick={() => setShowMobileSearch(false)}>
          <div className="bg-white dark:bg-slate-900 pt-safe-top px-4 pt-4 pb-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Search</span>
              <button onClick={() => setShowMobileSearch(false)} className="ml-auto p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <GlobalSearch onNavigate={(tab, id) => {
              setActiveTab(tab);
              setShowMobileSearch(false);
              if (id) {
                if (tab === 'places')  setPendingPlaceId(id);
                if (tab === 'tours')   setPendingTourId(id);
                if (tab === 'rentals') setPendingRentalId(id);
                if (tab === 'events')  setPendingEventId(id);
              }
            }} />
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer />


    </AppWrapper>
  );
};
