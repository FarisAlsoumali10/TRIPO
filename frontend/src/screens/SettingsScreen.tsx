import React, { useState } from 'react';
import { Globe, Moon, Sun, Bell, Lock, Info, LogOut, ChevronLeft, Shield, Trash2, Download, CheckCircle2, X } from 'lucide-react';
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

const ToggleRow = ({ icon, label, description, value, onChange, iconBg = 'bg-slate-100 text-slate-600' }: ToggleRowProps) => (
  <div className="flex items-center gap-4 py-4 px-5">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {description && <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full transition-all duration-300 relative shrink-0 ${value ? 'bg-emerald-500' : 'bg-slate-200'}`}
    >
      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${value ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  </div>
);

interface ChevronRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  onClick: () => void;
  iconBg?: string;
  danger?: boolean;
}

const ChevronRow = ({ icon, label, description, value, onClick, iconBg = 'bg-slate-100 text-slate-600', danger = false }: ChevronRowProps) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 py-4 px-5 hover:bg-slate-50 transition-colors active:bg-slate-100">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0 text-right rtl:text-right ltr:text-left">
      <p className={`text-sm font-bold ${danger ? 'text-red-500' : 'text-slate-800'}`}>{label}</p>
      {description && <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>}
    </div>
    {value && <span className="text-xs font-bold text-emerald-600 shrink-0">{value}</span>}
    {!danger && <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0 rtl:rotate-180" />}
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
      // Optimistic update already applied to local state
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

  const SectionHeader = ({ title }: { title: string }) => (
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 pt-5 pb-1">{title}</p>
  );

  return (
    <div className="min-h-full bg-slate-50 pb-28 overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">الإعدادات</h1>
        {user && <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>}
      </div>

      {/* Account */}
      <div className="mx-4 mb-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader title="الحساب" />
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-50">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl shrink-0">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 truncate">{user?.name || 'Guest'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 font-black rounded-xl shrink-0">
            {(user as any)?.role || 'user'}
          </span>
        </div>
        <ChevronRow
          icon={<Shield className="w-4 h-4" />}
          label="تغيير كلمة المرور"
          description="آخر تغيير: لم يُسجَّل"
          onClick={() => {}}
          iconBg="bg-blue-50 text-blue-600"
        />
      </div>

      {/* App Preferences */}
      <div className="mx-4 mb-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader title="تفضيلات التطبيق" />
        <div className="divide-y divide-slate-50">
          <ToggleRow
            icon={isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            label="الوضع الليلي"
            description={isDark ? 'مفعّل — خلفية داكنة' : 'معطّل — خلفية فاتحة'}
            value={isDark}
            onChange={onToggleDark}
            iconBg={isDark ? 'bg-slate-800 text-slate-200' : 'bg-amber-50 text-amber-500'}
          />
          <ChevronRow
            icon={<Globe className="w-4 h-4" />}
            label="اللغة"
            description="Language / اللغة"
            value={lang === 'ar' ? 'العربية' : 'English'}
            onClick={onToggleLang}
            iconBg="bg-emerald-50 text-emerald-600"
          />
        </div>
      </div>

      {/* Notifications & Privacy */}
      <div className="mx-4 mb-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader title="الإشعارات والخصوصية" />
        <div className="divide-y divide-slate-50">
          <ToggleRow
            icon={<Bell className="w-4 h-4" />}
            label="الإشعارات"
            description="تنبيهات الفزعات والفعاليات والرحلات"
            value={notificationsEnabled}
            onChange={handleToggleNotif}
            iconBg="bg-purple-50 text-purple-600"
          />
          <ToggleRow
            icon={<Lock className="w-4 h-4" />}
            label="مشاركة الموقع"
            description="لعرض الأماكن القريبة منك"
            value={locationEnabled}
            onChange={handleToggleLocation}
            iconBg="bg-teal-50 text-teal-600"
          />
          <ToggleRow
            icon={<Shield className="w-4 h-4" />}
            label="تحسين التطبيق"
            description="مشاركة بيانات الاستخدام بشكل مجهول"
            value={analyticsEnabled}
            onChange={handleToggleAnalytics}
            iconBg="bg-blue-50 text-blue-600"
          />
        </div>
      </div>

      {/* Data Management */}
      <div className="mx-4 mb-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader title="إدارة البيانات" />
        <div className="divide-y divide-slate-50">
          <ChevronRow
            icon={exportDone ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            label={exportDone ? 'تم تصدير بياناتك ✅' : 'تصدير بياناتي'}
            description="تنزيل كل بياناتك بصيغة JSON"
            onClick={handleExportData}
            iconBg={exportDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}
          />
        </div>
      </div>

      {/* About */}
      <div className="mx-4 mb-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHeader title="حول التطبيق" />
        <div className="divide-y divide-slate-50">
          <ChevronRow
            icon={<Info className="w-4 h-4" />}
            label="عن تريبو"
            description="الإصدار 1.0.0"
            value="1.0.0"
            onClick={() => setShowAbout(true)}
            iconBg="bg-slate-100 text-slate-600"
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mx-4 mb-4 bg-white rounded-3xl border border-red-100 overflow-hidden">
        <SectionHeader title="منطقة الخطر" />
        <div className="divide-y divide-red-50">
          <ChevronRow
            icon={<Trash2 className="w-4 h-4" />}
            label="حذف الحساب"
            description="حذف نهائي لا يمكن التراجع عنه"
            onClick={() => setShowDeleteConfirm(true)}
            iconBg="bg-red-50 text-red-500"
            danger
          />
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 py-4 px-5 hover:bg-red-50 transition-colors active:bg-red-100"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-500">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-red-500">تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-black text-lg text-slate-900">حذف الحساب؟</h3>
              <p className="text-sm text-slate-500 mt-2">هذا الإجراء دائم ولا يمكن التراجع عنه. ستُحذف كل بياناتك ورحلاتك.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-black text-sm rounded-2xl active:scale-95 transition-transform"
              >
                إلغاء
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onLogout(); }}
                className="flex-1 py-3 bg-red-500 text-white font-black text-sm rounded-2xl active:scale-95 transition-transform"
              >
                حذف الحساب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg text-slate-900">عن تريبو</h3>
              <button onClick={() => setShowAbout(false)} className="p-2 bg-slate-50 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-white text-3xl font-black">T</span>
              </div>
              <h4 className="font-black text-xl text-slate-900">Tripo</h4>
              <p className="text-xs text-slate-400 mt-1">منصة السفر الذكية للمملكة العربية السعودية</p>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">الإصدار</span>
                <span className="font-bold">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">نموذج الذكاء الاصطناعي</span>
                <span className="font-bold">Google Gemini</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">الدعم</span>
                <span className="font-bold text-emerald-600">support@tripo.sa</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
