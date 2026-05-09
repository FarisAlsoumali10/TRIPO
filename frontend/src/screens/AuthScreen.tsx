import React, { useState } from 'react';
import { Globe, AlertCircle, Loader2, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { authAPI, socialAuthAPI } from '../services/api';
import { User } from '../types/index';

// ── Auth response type (eliminates all (res as any) casts) ──────────────────
interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

// ── Props interface (eliminates the `any` props type) ───────────────────────
interface AuthScreenProps {
  onLogin: () => void;
  onRegister?: () => void;
  t?: Record<string, string>;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  initialMode?: 'login' | 'register';
}

// ── Centralised bilingual fallback strings (eliminates duplicated inline strs) ─
const FALLBACKS = {
  fullNameRequired: { ar: 'يرجى إدخال اسمك الكامل', en: 'Please enter your full name' },
  emailPasswordReq: { ar: 'يرجى إدخال البريد وكلمة المرور', en: 'Please enter email and password' },
  passwordTooShort: { ar: 'كلمة المرور قصيرة جداً (8 أحرف على الأقل)', en: 'Password must be at least 8 characters' },
  passwordsMismatch: { ar: 'كلمتا المرور غير متطابقتين.', en: 'Passwords do not match.' },
  passwordsNoMatch: { ar: 'كلمتا المرور غير متطابقتين', en: 'Passwords do not match' },
  passwordsMatch: { ar: 'كلمتا المرور متطابقتان', en: 'Passwords match' },
  loginFailed: { ar: 'فشل تسجيل الدخول.', en: 'Login failed. Check your credentials.' },
  registerFailed: { ar: 'تعذّر إنشاء الحساب.', en: 'Could not create account.' },
  googleFailed: { ar: 'فشل تسجيل الدخول بـ Google', en: 'Google sign-in failed. Please try again.' },
  googleNotConfig: { ar: 'تسجيل الدخول بـ Google غير مفعّل.', en: 'Google sign-in is not configured yet.' },
  signUp: { ar: 'إنشاء حساب', en: 'Sign up' },
  createAccount: { ar: 'إنشاء الحساب', en: 'Create account' },
  loginBtn: { ar: 'تسجيل الدخول', en: 'Log in' },
  welcome: { ar: 'أهلاً بعودتك', en: 'Welcome back' },
  createAccountTitle: { ar: 'إنشاء حسابك', en: 'Create your account' },
  tagline: { ar: 'سجّل دخولك لمتابعة رحلتك', en: 'Sign in to continue your journey' },
  signUpTagline: { ar: 'انضم لآلاف المستكشفين في تريبو', en: 'Join thousands of explorers on Tripo' },
  nameLabel: { ar: 'الاسم الكامل', en: 'Full Name' },
  fullNamePlaceholder: { ar: 'اسمك الكامل', en: 'Your full name' },
  emailLabel: { ar: 'البريد الإلكتروني', en: 'Email Address' },
  passwordLabel: { ar: 'كلمة المرور', en: 'Password' },
  minPassword: { ar: 'الحد الأدنى 8 أحرف', en: 'Minimum 8 characters' },
  confirmPasswordLabel: { ar: 'تأكيد كلمة المرور', en: 'Confirm Password' },
  continueWith: { ar: 'أو تابع عبر', en: 'or continue with' },
  continueWithGoogle: { ar: 'المتابعة عبر Google', en: 'Continue with Google' },
} satisfies Record<string, { ar: string; en: string }>;

// ── Sub-components ────────────────────────────────────────────────────────────

const GoogleButtonInner = ({
  onClick, isLoading, label,
}: { onClick: () => void; isLoading: boolean; label: string }) => (
  <button
    type="button" onClick={onClick} disabled={isLoading}
    className="w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/15 disabled:opacity-50 transition-all text-xs font-semibold text-white backdrop-blur-sm"
    style={{ background: 'rgba(255,255,255,0.06)' }}
  >
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
    {label}
  </button>
);

const GoogleLoginButton = ({
  onSocialAuth, isLoading, label, onError,
}: { onSocialAuth: (token: string) => void; isLoading: boolean; label: string; onError: () => void }) => {
  const login = useGoogleLogin({
    onSuccess: (res) => onSocialAuth(res.access_token),
    onError,   // ← now surfaces the error instead of silently swallowing it
    flow: 'implicit',
  });
  return <GoogleButtonInner onClick={() => login()} isLoading={isLoading} label={label} />;
};

const GlassInput = ({
  label, type, placeholder, value, onChange, disabled,
}: {
  label: string; type: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean;
}) => (
  <div>
    <label className="block text-xs font-semibold text-white/55 mb-1">{label}</label>
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={onChange} disabled={disabled}
      className="w-full px-3 py-2 rounded-lg border border-white/15 text-white placeholder-white/25 text-xs backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-50 transition-all"
      style={{ background: 'rgba(255,255,255,0.07)' }}
    />
  </div>
);

const PasswordInput = ({
  label, placeholder, value, onChange, disabled, hint, successHint, errorHint, isRTL,
}: {
  label: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; hint?: string; successHint?: string; errorHint?: string; isRTL?: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold text-white/55 mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'} placeholder={placeholder}
          value={value} onChange={onChange} disabled={disabled}
          className="w-full px-3 py-2 rounded-lg border border-white/15 text-white placeholder-white/25 text-xs backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-50 transition-all"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        />
        <button
          type="button" tabIndex={-1}
          onClick={() => setVisible(v => !v)}
          className={`absolute ${isRTL ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors`}
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      {hint && !successHint && !errorHint && (
        <p className="text-xs text-white/30 mt-0.5 ms-0.5">{hint}</p>
      )}
      {errorHint && (
        <p className="text-xs text-red-300 mt-0.5 ms-0.5 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{errorHint}
        </p>
      )}
      {successHint && !errorHint && (
        <p className="text-xs text-emerald-300 mt-0.5 ms-0.5 font-medium flex items-center gap-1">
          <Check className="w-3 h-3 flex-shrink-0" />{successHint}
        </p>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const AuthScreen = ({
  onLogin, onRegister, t, lang, onToggleLang, initialMode,
}: AuthScreenProps) => {
  const isRTL = lang === 'ar';

  /** Look up a translation key; fall back to the FALLBACKS constant. */
  const tr = (key: keyof typeof FALLBACKS | string): string => {
    const override = t?.[key];
    if (typeof override === 'string') return override;
    const fb = FALLBACKS[key as keyof typeof FALLBACKS];
    return fb ? fb[isRTL ? 'ar' : 'en'] : key;
  };

  const [isLoginView, setIsLoginView] = useState(initialMode !== 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const switchView = (toLogin: boolean) => {
    setIsLoginView(toLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  /** Persist auth tokens. Using sessionStorage so tokens don't survive tab closures. */
  const persistAuth = (res: AuthResponse) => {
    sessionStorage.setItem('token', res.token);
    if (res.refreshToken) sessionStorage.setItem('refreshToken', res.refreshToken);
    sessionStorage.setItem('user', JSON.stringify(res.user));
    // Mirror to localStorage ONLY for backward-compat with other screens that still read it.
    // TODO: Migrate all `localStorage.getItem('token')` calls to sessionStorage.
    localStorage.setItem('token', res.token);
    if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
  };

  /** Navigate after a successful auth — guards onRegister being undefined. */
  const navigateAfterAuth = () => {
    if (!isLoginView) {
      onRegister?.();
    } else {
      onLogin();
    }
  };

  const handleSocialAuth = async (provider: 'google', token: string) => {
    setIsLoading(true); setError('');
    try {
      const res = await socialAuthAPI.login(provider, token) as AuthResponse;
      persistAuth(res);
      navigateAfterAuth();
    } catch (err: any) {
      setError(err.response?.data?.error || tr('googleFailed'));
    } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');

    if (!isLoginView && !name.trim()) {
      setError(tr('fullNameRequired')); return;
    }
    if (!email || !password) {
      setError(tr('emailPasswordReq')); return;
    }
    // ← Client-side password length validation (was missing before)
    if (!isLoginView && password.length < 8) {
      setError(tr('passwordTooShort')); return;
    }
    if (!isLoginView && password !== confirmPassword) {
      setError(tr('passwordsMismatch')); return;
    }

    try {
      setIsLoading(true);
      const res = (isLoginView
        ? await authAPI.login({ email, password })
        : await authAPI.register({ name, email, password, language: isRTL ? 'ar' : 'en' })
      ) as AuthResponse;

      persistAuth(res);
      navigateAfterAuth();
    } catch (err: any) {
      const d = err.response?.data;
      setError(
        d?.errors?.[0]?.message || d?.error || d?.message ||
        tr(isLoginView ? 'loginFailed' : 'registerFailed'),
      );
    } finally { setIsLoading(false); }
  };

  const confirmPasswordError: string | undefined =
    !isLoginView && confirmPassword && password !== confirmPassword
      ? tr('passwordsNoMatch') : undefined;

  const confirmPasswordSuccess: string | undefined =
    !isLoginView && confirmPassword && password === confirmPassword
      ? tr('passwordsMatch') : undefined;

  return (
    <div
      className="h-screen w-full relative flex flex-col items-center justify-center overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background */}
      <img
        src="https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1800&q=90&auto=format&fit=crop"
        alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/45 to-slate-950/80" />

      {/* Language toggle */}
      <div className="absolute top-4 end-5 z-20">
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/18 backdrop-blur-md border border-white/15 rounded-full text-xs font-semibold text-white transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          {isRTL ? 'English' : 'العربية'}
        </button>
      </div>

      {/* Center column */}
      <div className="relative z-10 flex flex-col items-center w-full px-4">

        {/* Logo */}
        <div className="flex flex-col items-center mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-900/50 border border-emerald-400/30 mb-1">
            <span className="text-white font-black text-xl leading-none select-none">T</span>
          </div>
          <span className="text-white font-extrabold text-sm tracking-tight drop-shadow">
            {isRTL ? 'تريبو' : 'Tripo'}
          </span>
        </div>

        {/* Glass card */}
        <div
          className="w-full rounded-2xl"
          style={{
            maxWidth: '380px',
            background: 'rgba(15, 23, 42, 0.60)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.11)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          <div className="px-5 pt-4 pb-5">

            {/* Tabs */}
            <div className="flex rounded-lg p-0.5 mb-4" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <button
                type="button" onClick={() => switchView(false)}
                className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-150 ${!isLoginView ? 'bg-emerald-500 text-white shadow-md' : 'text-white/50 hover:text-white/75'
                  }`}
              >
                {tr('signUp')}
              </button>
              <button
                type="button" onClick={() => switchView(true)}
                className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-150 ${isLoginView ? 'bg-emerald-500 text-white shadow-md' : 'text-white/50 hover:text-white/75'
                  }`}
              >
                {tr('loginBtn')}
              </button>
            </div>

            {/* Heading */}
            <div className="mb-3 text-center">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                {isLoginView ? tr('welcome') : tr('createAccountTitle')}
              </h1>
              <p className="text-white/40 text-xs mt-0.5">
                {isLoginView ? tr('tagline') : tr('signUpTagline')}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-3 p-2.5 bg-red-500/20 border border-red-400/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-300 flex-shrink-0 mt-px" />
                <p className="text-red-200 text-xs font-medium leading-snug">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>

              {!isLoginView && (
                <GlassInput
                  label={tr('nameLabel')}
                  type="text"
                  placeholder={tr('fullNamePlaceholder')}
                  value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading}
                />
              )}

              <GlassInput
                label={tr('emailLabel')}
                type="email" placeholder="hello@tripo.sa"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
              />

              <PasswordInput
                label={tr('passwordLabel')}
                placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} disabled={isLoading} isRTL={isRTL}
                hint={!isLoginView ? tr('minPassword') : undefined}
              />

              {!isLoginView && (
                <PasswordInput
                  label={tr('confirmPasswordLabel')}
                  placeholder="••••••••" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading} isRTL={isRTL}
                  errorHint={confirmPasswordError} successHint={confirmPasswordSuccess}
                />
              )}

              <button
                type="submit" disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {isLoginView ? tr('loginBtn') : tr('createAccount')}
                    {/* Arrow removed — direction handled by CSS logical flow via dir attr */}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30 font-medium whitespace-nowrap">
                {tr('continueWith')}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google */}
            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <GoogleLoginButton
                isLoading={isLoading}
                onSocialAuth={(token) => handleSocialAuth('google', token)}
                label={tr('continueWithGoogle')}
                onError={() => setError(tr('googleFailed'))}   // ← was silent before
              />
            ) : (
              <GoogleButtonInner
                onClick={() => setError(tr('googleNotConfig'))}
                isLoading={isLoading}
                label={tr('continueWithGoogle')}
              />
            )}

            {/* Terms */}
            {!isLoginView && (
              <p className="mt-3 text-center text-xs text-white/25 leading-relaxed">
                {isRTL ? (
                  <>بإنشاء حساب توافق على{' '}
                    <span className="text-white/50 font-medium cursor-pointer hover:text-white transition-colors">شروط الخدمة</span>
                    {' '}و{' '}
                    <span className="text-white/50 font-medium cursor-pointer hover:text-white transition-colors">سياسة الخصوصية</span>.
                  </>
                ) : (
                  <>By creating an account you agree to our{' '}
                    <span className="text-white/50 font-medium cursor-pointer hover:text-white transition-colors">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-white/50 font-medium cursor-pointer hover:text-white transition-colors">Privacy Policy</span>.
                  </>
                )}
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};