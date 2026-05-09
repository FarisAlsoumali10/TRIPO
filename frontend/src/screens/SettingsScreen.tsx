import React, { useState } from 'react';
import { Globe, Moon, Sun, Bell, Lock, Info, LogOut, ChevronLeft, Shield, Trash2, Download, CheckCircle2, X, Sparkles } from 'lucide-react';
import { User } from '../types/index';
import { authAPI } from '../services/api';

interface SettingsScreenProps {
  user: User | null;
  lang: 'en' | 'ar';
  isDark: boolean;
  onToggleLang: () => void;
  onToggleDark: () => void;
  onUpdateUser: (u: User) => void;
  onLogout: () => void;
  t: any;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  iconBg?: string;
}

const ToggleRow = ({ icon, label, description, value, onChange, iconBg = 'bg-lifted text-moon/60', isRTL }: ToggleRowProps & { isRTL: boolean }) => (
  <div className={`flex items-center gap-4 py-4 px-5 active:bg-white dark:bg-navy-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner ${iconBg}`}>
      {icon}
    </div>
    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{label}</p>
      {description && <p className="text-[10px] text-moon/40 font-bold mt-0.5 tracking-wide uppercase">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full transition-all duration-500 relative shrink-0 border border-slate-200 dark:border-white/10 ${value ? 'bg-oasis-spring border-oasis-spring/30 shadow-mint-glow' : 'bg-slate-100 dark:bg-navy-800'}`}
    >
      <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-navy-900 rounded-full shadow-lg transition-all duration-500 ${value ? (isRTL ? 'left-0.5' : 'right-0.5') : (isRTL ? 'right-0.5' : 'left-0.5')}`} />
    </button>
  </div>
);

const ChevronRow = ({ icon, label, description, value, onClick, iconBg = 'bg-lifted text-moon/60', danger = false, isRTL }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 py-4 px-5 hover:bg-slate-50 dark:hover:bg-navy-800 transition-all active:bg-slate-100 dark:active:bg-navy-950 group ${isRTL ? 'flex-row-reverse' : ''}`}>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/10 shadow-inner transition-colors ${iconBg}`}>
      {icon}
    </div>
    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
      <p className={`text-sm font-black tracking-tight ${danger ? 'text-red-400' : 'text-slate-900 dark:text-white'}`}>{label}</p>
      {description && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 tracking-wide uppercase">{description}</p>}
    </div>
    {value && <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${danger ? 'bg-red-500/10 text-red-400' : 'bg-oasis-spring/10 text-oasis-spring border border-oasis-spring/20'}`}>{value}</span>}
    {!danger && <ChevronLeft className={`w-4 h-4 text-slate-500 dark:text-slate-500 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-0 group-hover:translate-x-[-4px]' : 'rotate-180'}`} />}
  </button>
);

export const SettingsScreen = ({ user, lang, isDark, onToggleLang, onToggleDark, onUpdateUser, onLogout, t }: SettingsScreenProps) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => user?.preferences?.notifications ?? true
  );
  const [locationEnabled, setLocationEnabled] = useState(
    () => user?.preferences?.locationSharing ?? true
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    () => user?.preferences?.analytics ?? true
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const updatePreference = async (key: 'notifications' | 'locationSharing' | 'analytics', value: boolean) => {
    const newPrefs = {
      notifications: notificationsEnabled,
      locationSharing: locationEnabled,
      analytics: analyticsEnabled,
      [key]: value,
    };
    try {
      const updated = await authAPI.updateProfile({ preferences: newPrefs });
      if (user && onUpdateUser) onUpdateUser({ ...user, preferences: updated.preferences ?? newPrefs });
    } catch {
      // Optimistic update
    }
  };

  const handleToggleNotif = (v: boolean) => {
    setNotificationsEnabled(v);
    updatePreference('notifications', v);
  };
  const handleToggleLocation = (v: boolean) => {
    setLocationEnabled(v);
    updatePreference('locationSharing', v);
  };
  const handleToggleAnalytics = (v: boolean) => {
    setAnalyticsEnabled(v);
    updatePreference('analytics', v);
  };

  const handleExportData = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('tripo_')) {
        try { data[key] = JSON.parse(localStorage.getItem(key) || ''); } catch { data[key] = localStorage.getItem(key); }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tripo_data.json'; a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  const isRTL = lang === 'ar';
  const st = t.settings;

  const SectionHeader = ({ title }: { title: string }) => (
    <p className={`text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] px-6 pt-6 pb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{title}</p>
  );

  return (
    <div className={`min-h-full bg-white dark:bg-navy-900 pb-28 overflow-y-auto no-scrollbar transition-colors duration-500 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-navy-900 border-b border-slate-100 dark:border-white/8 pt-14 pb-6 px-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">{st.label}</h1>
        {user && <p className="text-slate-500 dark:text-slate-500 text-[10px] font-bold tracking-widest uppercase mt-1">{user.email}</p>}
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Account Section */}
        <div className="bg-white dark:bg-navy-900 rounded-[2rem] border border-slate-100 dark:border-white/8 shadow-xl overflow-hidden">
          <SectionHeader title={st.account} />
          <div className={`flex items-center gap-4 px-6 py-5 border-b border-slate-100 dark:border-white/8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-14 h-14 rounded-[1.25rem] bg-oasis-spring/10 border border-oasis-spring/20 flex items-center justify-center text-oasis-spring font-black text-2xl shrink-0 shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-black text-slate-900 dark:text-white text-lg tracking-tight truncate leading-tight">{user?.name || 'Guest'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5">{user?.email}</p>
            </div>
            <span className="text-[10px] px-3 py-1 bg-oasis-spring/10 text-oasis-spring font-black rounded-full border border-oasis-spring/20 shadow-mint-glow/10">
              {user?.role === 'admin' ? st.roleAdmin : user?.role === 'host' ? st.roleHost : st.roleUser}
            </span>
          </div>
          <ChevronRow
            icon={<Shield className="w-5 h-5" />}
            label={st.changePassword}
            description={st.lastChangedNever}
            onClick={() => {}}
            iconBg="bg-blue-400/10 text-blue-400 border-blue-400/20"
            isRTL={isRTL}
          />
        </div>

        {/* Preferences Section */}
        <div className="bg-white dark:bg-navy-900 rounded-[2rem] border border-slate-100 dark:border-white/8 shadow-xl overflow-hidden">
          <SectionHeader title={st.appPrefs} />
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ToggleRow
              icon={isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              label={st.darkMode}
              description={isDark ? st.darkModeOn : st.darkModeOff}
              value={isDark}
              onChange={onToggleDark}
              iconBg={isDark ? 'bg-midnight text-oasis-spring' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'}
              isRTL={isRTL}
            />
            <ChevronRow
              icon={<Globe className="w-5 h-5" />}
              label={st.language}
              description={st.languageSub}
              value={lang === 'ar' ? 'العربية' : 'English'}
              onClick={onToggleLang}
              iconBg="bg-oasis-spring/10 text-oasis-spring border-oasis-spring/20"
              isRTL={isRTL}
            />
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-white dark:bg-navy-900 rounded-[2rem] border border-slate-100 dark:border-white/8 shadow-xl overflow-hidden">
          <SectionHeader title={st.privacy} />
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ToggleRow
              icon={<Bell className="w-5 h-5" />}
              label={st.notifications}
              description={st.notificationsDesc}
              value={notificationsEnabled}
              onChange={handleToggleNotif}
              iconBg="bg-purple-400/10 text-purple-400 border-purple-400/20"
              isRTL={isRTL}
            />
            <ToggleRow
              icon={<Lock className="w-5 h-5" />}
              label={st.location}
              description={st.locationDesc}
              value={locationEnabled}
              onChange={handleToggleLocation}
              iconBg="bg-blue-400/10 text-blue-400 border-blue-400/20"
              isRTL={isRTL}
            />
            <ToggleRow
              icon={<Shield className="w-5 h-5" />}
              label={st.analytics}
              description={st.analyticsDesc}
              value={analyticsEnabled}
              onChange={handleToggleAnalytics}
              iconBg="bg-oasis-spring/10 text-oasis-spring border-oasis-spring/20"
              isRTL={isRTL}
            />
          </div>
        </div>

        {/* Data & Info Section */}
        <div className="bg-white dark:bg-navy-900 rounded-[2rem] border border-slate-100 dark:border-white/8 shadow-xl overflow-hidden">
          <SectionHeader title={st.dataManagement} />
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ChevronRow
              icon={exportDone ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
              label={exportDone ? st.exportSuccess : st.exportData}
              description={st.exportDesc}
              onClick={handleExportData}
              iconBg={exportDone ? 'bg-oasis-spring/10 text-oasis-spring border-oasis-spring/20' : 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500'}
              isRTL={isRTL}
            />
            <ChevronRow
              icon={<Info className="w-5 h-5" />}
              label={st.about}
              description={st.aboutDesc}
              value="1.0.0"
              onClick={() => setShowAbout(true)}
              iconBg="bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500"
              isRTL={isRTL}
            />
          </div>
        </div>

        {/* Logout & Danger Zone */}
        <div className="space-y-4 pt-4">
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-4 py-5 px-6 bg-slate-100 dark:bg-navy-800 rounded-2xl border border-slate-100 dark:border-white/8 active:scale-95 transition-all group ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-navy-900 text-slate-500 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <span className={`text-sm font-black text-slate-500 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{st.logout}</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={`w-full flex items-center gap-4 py-5 px-6 bg-red-400/5 rounded-2xl border border-red-400/10 active:scale-95 transition-all group ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-400/10 text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <span className={`text-sm font-black text-red-400 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{st.deleteAccount}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {(showDeleteConfirm || showAbout) && (
        <div className="fixed inset-0 z-[100] bg-white/80 dark:bg-navy-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          {showDeleteConfirm && (
            <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-400/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-400/20 shadow-lg">
                  <Trash2 className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{st.deleteConfirmTitle}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-3 leading-relaxed font-bold">{st.deleteConfirmDesc}</p>
              </div>
              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all border border-slate-100 dark:border-white/8"
                >
                  {st.cancel}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); onLogout(); }}
                  className="flex-1 py-4 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg"
                >
                  {st.deleteAccount}
                </button>
              </div>
            </div>
          )}

          {showAbout && (
            <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
              <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{st.about}</h3>
                <button onClick={() => setShowAbout(false)} className="w-10 h-10 bg-slate-100 dark:bg-navy-800 rounded-full flex items-center justify-center border border-slate-100 dark:border-white/8">
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-500" />
                </button>
              </div>
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-oasis-spring rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-mint-glow shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-midnight text-5xl font-black">T</span>
                </div>
                <h4 className="font-black text-2xl text-slate-900 dark:text-white tracking-tighter">TRIPO</h4>
                <p className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mt-2">{st.aboutDesc}</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: st.version, value: '1.0.0' },
                  { label: st.aiModel, value: 'Google Gemini' },
                  { label: st.support, value: 'support@tripo.sa', highlight: true },
                ].map((item, idx) => (
                  <div key={idx} className={`flex justify-between py-3 border-b border-slate-100 dark:border-white/8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-slate-500 dark:text-slate-500 font-black uppercase tracking-wider">{item.label}</span>
                    <span className={`text-xs font-black ${item.highlight ? 'text-oasis-spring' : 'text-slate-900 dark:text-white'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsScreen;
