import React, { useState, useEffect } from 'react';
import { Home, Search, Plus, User as UserIcon, Settings, ChevronLeft, LogOut, Globe, Users, Menu, X } from 'lucide-react';
import { User, Itinerary, GroupTrip, SmartProfile } from './src/types/index';
import { TRANSLATIONS } from './translations';
import { authAPI } from './src/services/api';

// Screens
import { AuthScreen } from './src/screens/AuthScreen';
import { SmartProfileScreen } from './src/screens/SmartProfileScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CreateScreen } from './src/screens/CreateScreen';
import { ItineraryDetailScreen } from './src/screens/ItineraryDetailScreen';
import { GroupTripScreen } from './src/screens/GroupTripScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { CommunitiesScreen } from './src/screens/CommunitiesScreen';
import { AIAssistant } from './src/components/AIAssistant';
import { ARGuideScreen } from './src/screens/ARGuideScreen';

export const App = () => {
  const [view, setView] = useState<'auth' | 'onboarding' | 'main' | 'itinerary' | 'group' | 'ar' | 'loading'>('loading');
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Navigation State
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [activeTrip, setActiveTrip] = useState<GroupTrip | null>(null);

  // Derived translation object
  const t = TRANSLATIONS[lang];

  // Handle RTL
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

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

          if (!profile.smartProfile) {
            setView('onboarding');
          } else {
            setView('main');
          }
        } catch (e) {
          console.error("Failed to fetch fresh profile, falling back to local storage...", e);
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              if (!parsedUser.smartProfile) {
                setView('onboarding');
              } else {
                setView('main');
              }
            } catch (err) {
              console.error("Local storage user parse failed", err);
              handleLogout();
            }
          } else {
            handleLogout();
          }
        }
      } else {
        setView('auth');
      }
    };

    initializeAuth();
  }, []);

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  const handleLogin = async () => {
    setView('loading');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      if (!u.smartProfile) {
        setView('onboarding');
      } else {
        setView('main');
      }
    } else {
      // Backup in case localStorage isn't set instantly by AuthScreen
      try {
        const profile = await authAPI.getProfile();
        setUser(profile);
        if (!profile.smartProfile) setView('onboarding');
        else setView('main');
      } catch (e) {
        setView('auth');
      }
    }
  };

  const handleGuestLogin = () => {
    setView('onboarding');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('auth');
  };

  const handleOnboardingComplete = (prefs: SmartProfile) => {
    if (user) {
      const updatedUser = { ...user, smartProfile: prefs };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setView('main');
    }
  };

  const openItinerary = (it: Itinerary) => {
    setSelectedItinerary(it);
    setView('itinerary');
  };

  const startGroupTrip = () => {
    if (!selectedItinerary || !user) return;
    const newTrip: GroupTrip = {
      id: Date.now().toString(),
      itinerary: selectedItinerary,
      members: [user, { id: 'u3', name: 'Sara K.', avatar: 'https://i.pravatar.cc/150?u=u3', email: 's@s.com' } as User],
      chatMessages: [],
      expenses: []
    };
    setActiveTrip(newTrip);
    setView('group');
  };

  // Base wrappers for unified styling
  const AppWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {children}
    </div>
  );

  const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="h-screen w-full max-w-2xl mx-auto bg-white shadow-2xl relative overflow-hidden flex flex-col">
      {children}
    </div>
  );

  if (view === 'loading') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (view === 'auth') return <AuthScreen onLogin={handleLogin} onGuestLogin={handleGuestLogin} t={t} lang={lang} onToggleLang={toggleLanguage} />;
  if (view === 'onboarding') return <ModalWrapper><SmartProfileScreen onComplete={handleOnboardingComplete} t={t} /></ModalWrapper>;
  if (view === 'itinerary' && selectedItinerary) return <ModalWrapper><ItineraryDetailScreen itinerary={selectedItinerary} onBack={() => setView('main')} onStartGroup={startGroupTrip} t={t} /></ModalWrapper>;
  if (view === 'group' && activeTrip && user) return <ModalWrapper><GroupTripScreen trip={activeTrip} currentUser={user} onBack={() => setView('main')} onUpdateTrip={setActiveTrip} t={t} /></ModalWrapper>;

  // 🔴 الشاشة المضافة للواقع المعزز 
  if (view === 'ar') return <ARGuideScreen onBack={() => setView('main')} t={t} user={user!} lang={lang} nearbyPlaces={[]} itineraryPlaces={[]} />;  // Main Desktop/Mobile Shell
  return (
    <AppWrapper>
      <div className="flex h-full relative">

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar (Desktop fixed, Mobile sliding) */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 rtl:translate-x-full lg:rtl:translate-x-0'}`}>
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

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-2">
              {[
                { id: 'home', icon: Home, label: t.tabHome },
                { id: 'explore', icon: Search, label: t.tabExplore },
                { id: 'create', icon: Plus, label: (t as any).tabCreate || 'Create' },
                { id: 'communities', icon: Users, label: t.tabCommunities },
                { id: 'profile', icon: UserIcon, label: t.tabProfile }
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
                <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-200 bg-white" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email || 'Guest'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">

          {/* Mobile Header (Shows Hamburger) */}
          <div className="lg:hidden bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-30">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg text-slate-800">Tripo</span>
            <div className="w-8"></div> {/* Spacer to center title */}
          </div>

          {/* Scrollable Content View */}
          <div className="flex-1 overflow-y-auto w-full">
            <div className="max-w-7xl mx-auto h-full">
              {activeTab === 'home' && user && <HomeScreen user={user} onOpenItinerary={openItinerary} t={t} onOpenAR={() => setView('ar')} />}

              {activeTab === 'explore' && <ExploreScreen t={t} onOpenPlace={(p) => console.log('Place clicked', p)} />}

              {/* 🔴 الشاشة المضافة لإنشاء الرحلات */}
              {activeTab === 'create' && <CreateScreen onSave={(it) => { console.log('Saved:', it); setActiveTab('home'); }} t={t} />}

              {activeTab === 'communities' && <CommunitiesScreen t={t} lang={lang} onOpenItinerary={openItinerary} />}

              {activeTab === 'profile' && user && (
                <div className="p-6 pt-10 max-w-3xl mx-auto">
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="text-center mb-10">
                      <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="Avatar" className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-slate-50 bg-slate-100 shadow-md" />
                      <h2 className="text-3xl font-extrabold text-slate-900">{user.name}</h2>
                      <p className="text-lg text-slate-500">{user.email}</p>
                      <span className="inline-block mt-3 px-4 py-1.5 bg-emerald-100 text-emerald-800 text-sm font-bold rounded-full uppercase tracking-wider">
                        {(user as any)?.role || 'User'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button onClick={toggleLanguage} className="flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl font-medium border border-slate-100">
                        <span className="flex items-center gap-3 text-slate-700 font-bold"><Globe className="w-5 h-5 text-emerald-600" /> Language / اللغة</span>
                        <span className="text-sm font-bold text-emerald-600">{lang === 'en' ? 'English' : 'العربية'}</span>
                      </button>
                      <button className="flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl font-medium border border-slate-100">
                        <span className="flex items-center gap-3 text-slate-700 font-bold"><Settings className="w-5 h-5 text-emerald-600" /> {t.settings}</span>
                        <span className="text-sm font-bold text-emerald-600">{t.settings}</span>
                      </button>
                      <button onClick={handleLogout} className="md:col-span-2 flex items-center justify-center p-5 bg-red-50 hover:bg-red-100 transition-colors text-red-600 rounded-2xl font-bold border border-red-100 shadow-sm mt-4">
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

        {/* Mobile Bottom Nav (Hidden on Desktop) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center z-40 pb-safe">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-emerald-100' : ''}`} />
          </button>
          <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'explore' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Search className={`w-6 h-6 ${activeTab === 'explore' ? 'fill-emerald-100' : ''}`} />
          </button>
          <div className="relative -top-6">
            <button onClick={() => setActiveTab('create')} className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-200 active:scale-95 transition-transform hover:scale-105">
              <Plus className="w-7 h-7" />
            </button>
          </div>
          <button onClick={() => setActiveTab('communities')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'communities' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Users className={`w-6 h-6 ${activeTab === 'communities' ? 'fill-emerald-100' : ''}`} />
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <UserIcon className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-emerald-100' : ''}`} />
          </button>
        </div>

      </div>
    </AppWrapper>
  );
};