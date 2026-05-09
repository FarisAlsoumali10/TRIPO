import React from 'react';
import { Home, MapPin, Users, User as UserIcon, Plus } from 'lucide-react';

const BOTTOM_NAV_LEFT = [
  { id: 'home', icon: Home, key: 'tabHome' },
  { id: 'explore', icon: MapPin, key: 'tabExplore' },
] as const;

const BOTTOM_NAV_RIGHT = [
  { id: 'communities', icon: Users, key: 'tabCommunities' },
  { id: 'profile', icon: UserIcon, key: 'tabProfile' },
] as const;

export const BottomNavigation = ({
  activeTab,
  switchTab,
  t,
}: {
  activeTab: string;
  switchTab: (tab: string) => void;
  t: any;
}) => {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-navy-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 z-40 shadow-2xl transition-colors duration-300"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-end justify-around px-2 pt-2">
        {/* Left two items */}
        {BOTTOM_NAV_LEFT.map(nav => {
          const label = t?.nav?.[nav.key] || nav.id;
          return (
            <button
              key={nav.id}
              onClick={() => switchTab(nav.id)}
              aria-label={label}
              aria-current={activeTab === nav.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all min-w-0 flex-1 ${activeTab === nav.id ? 'text-emerald-600 dark:text-mint bg-emerald-50 dark:bg-mint/10' : 'text-slate-400 dark:text-ink-muted'}`}
            >
              <nav.icon className={`transition-transform ${activeTab === nav.id ? 'scale-110' : ''}`} style={{ width: 22, height: 22 }} aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            </button>
          );
        })}

        {/* Center FAB — elevated above nav bar */}
        <div className="flex flex-col items-center flex-shrink-0 -mt-5">
          <button
            onClick={() => switchTab('create')}
            aria-label={t?.tours?.addTourFAB || 'Add a Tour'}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 dark:from-mint dark:to-mint-600 text-white dark:text-navy-950 shadow-2xl shadow-emerald-900/40 dark:shadow-mint-glow active:scale-90 transition-transform hover:scale-105 flex items-center justify-center animate-pulse-soft border-4 border-white dark:border-navy-900"
          >
            <Plus className="w-6 h-6" aria-hidden="true" />
          </button>
          <span className="text-[9px] font-extrabold text-slate-500 dark:text-mint tracking-wide whitespace-nowrap mt-0.5">
            {t?.tours?.addTourFAB || 'Add a Tour'}
          </span>
        </div>

        {/* Right two items */}
        {BOTTOM_NAV_RIGHT.map(nav => {
          const label = t?.nav?.[nav.key] || nav.id;
          return (
            <button
              key={nav.id}
              onClick={() => switchTab(nav.id)}
              aria-label={label}
              aria-current={activeTab === nav.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all min-w-0 flex-1 ${activeTab === nav.id ? 'text-emerald-600 dark:text-mint bg-emerald-50 dark:bg-mint/10' : 'text-slate-400 dark:text-ink-muted'}`}
            >
              <nav.icon className={`transition-transform ${activeTab === nav.id ? 'scale-110' : ''}`} style={{ width: 22, height: 22 }} aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
