import React, { useState, useEffect } from 'react';
import { MapPin, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button, Input } from '../components/ui';
import { authAPI, socialAuthAPI } from '../services/api';

// Isolated so `useGoogleLogin` hook only runs when a real clientId is available
const GoogleLoginButton = ({ onSocialAuth, isLoading, t }: { onSocialAuth: (token: string) => void; isLoading: boolean; t?: any }) => {
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (res) => onSocialAuth(res.access_token),
    onError: () => { /* silently ignore */ },
    flow: 'implicit',
  });
  return (
    <button
      type="button"
      onClick={() => handleGoogleLogin()}
      disabled={isLoading}
      className="flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all hover:border-slate-300 disabled:opacity-50 shadow-sm"
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span className="text-sm font-semibold text-slate-700">{t?.continueWithGoogle || 'Continue with Google'}</span>
    </button>
  );
};

export const AuthScreen = ({ onLogin, onRegister, onGuestLogin, t, lang, onToggleLang, initialMode }: any) => {
  const [isLoginView, setIsLoginView] = useState(initialMode !== 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // حالات الاتصال بالخادم
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Social auth helper ────────────────────────────────────────────────────
  const handleSocialAuth = async (provider: 'google', token: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await socialAuthAPI.login(provider, token);
      localStorage.setItem('token', response.token);
      if ((response as any).refreshToken) localStorage.setItem('refreshToken', (response as any).refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      if (!isLoginView && onRegister) {
        onRegister();
      } else {
        onLogin();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `${provider} sign-in failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // تنظيف الأخطاء السابقة

    if (!isLoginView && !name) {
      setError(t?.fullNameRequired || 'Please enter your full name');
      return;
    }

    if (!email || !password) {
      setError(t?.emailPasswordRequired || 'Please enter your email and password');
      return;
    }

    if (!isLoginView && password !== confirmPassword) {
      setError(t?.passwordsMismatchMsg || 'Passwords do not match. Please try again.');
      return;
    }

    try {
      setIsLoading(true);

      // إرسال الطلب للباك-إند
      const response = isLoginView
        ? await authAPI.login({ email, password })
        : await authAPI.register({ name, email, password, language: 'en' });

      localStorage.setItem('token', response.token);
      if ((response as any).refreshToken) localStorage.setItem('refreshToken', (response as any).refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      // After registration, trigger onboarding wizard; after login, go straight to main
      if (!isLoginView && onRegister) {
        onRegister();
      } else {
        // إخبار التطبيق بنجاح الدخول للانتقال للشاشة الرئيسية
        onLogin();
      }

    } catch (err: any) {
      const data = err.response?.data;
      const errorMessage =
        data?.errors?.[0]?.message ||
        data?.error ||
        data?.message ||
        (isLoginView ? (t?.loginFailedMsg || 'Login failed. Check your email and password.') : (t?.registerFailedMsg || 'Could not create account. Make sure your password is at least 8 characters.'));
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-slate-50 font-sans">

      {/* Left Half: Login Form */}
      <div className="flex-[1] flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 relative z-10 bg-white shadow-2xl lg:shadow-none order-2 lg:order-1">

        {/* Logo */}
        <div className="absolute top-6 left-6 lg:left-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-200">
              <MapPin className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">{lang === 'en' ? 'Tripo' : 'تريبو'}</span>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="absolute top-6 right-6 lg:right-12">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full text-sm font-bold text-slate-700 shadow-sm shadow-slate-200"
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>

        <div className="max-w-md w-full mx-auto mt-12 lg:mt-0">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-wide">{isLoginView ? t.welcome : (t?.createAccount || 'Create Account')}</h1>
            <p className="text-lg text-slate-500">{isLoginView ? t.tagline : (t?.signUpTagline || 'Sign up to discover new places and experiences')}</p>
          </div>

          {/* Error Message UI */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md flex items-center gap-3 animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginView && (
              <div>
                <Input
                  label={t.nameLabel || "Full Name"}
                  type="text"
                  placeholder={t?.fullNamePlaceholder || "Full name"}
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>
            )}
            <div>
              <Input
                label={t.emailLabel || "Email Address"}
                type="email"
                placeholder="hello@tripo.sa"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                label={t.passwordLabel || "Password"}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
              {!isLoginView && (
                <p className="text-xs text-slate-400 mt-1 ml-1">{t?.minPassword || 'Minimum 8 characters'}</p>
              )}
            </div>
            {!isLoginView && (
              <div>
                <Input
                  label={t?.confirmPasswordLabel || "Confirm Password"}
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e: any) => setConfirmPassword(e.target.value)}
                  className="w-full"
                  disabled={isLoading}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{t?.passwordsNoMatch || 'Passwords do not match'}</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-emerald-600 mt-1 ml-1 font-medium">{t?.passwordsMatch || 'Passwords match'}</p>
                )}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full py-4 mt-8 bg-emerald-600 border-none hover:bg-emerald-700 shadow-lg shadow-emerald-100 text-lg flex items-center justify-center gap-2 rounded-xl transition-all hover:scale-[1.02]">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : <span className="text-white">{isLoginView ? (t.loginBtn || "Login") : (t.signUp || "Sign up")}</span>}
            </Button>

            {/* ── Social auth (always shown) ── */}
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">{t?.continueWith || 'or continue with'}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="flex justify-center">
                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <GoogleLoginButton
                    isLoading={isLoading}
                    onSocialAuth={(token) => handleSocialAuth('google', token)}
                    t={t}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setError(t?.googleSignIn || 'Google sign-in is not configured yet.')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all hover:border-slate-300 disabled:opacity-50 shadow-sm"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-semibold text-slate-700">{t?.continueWithGoogle || 'Continue with Google'}</span>
                  </button>
                )}
              </div>
            </>
          </form>

          {isLoginView ? (
            <p className="mt-10 text-center text-sm text-slate-500 font-medium">
              {t.noAccount || "Don't have an account?"} <span onClick={() => { setIsLoginView(false); setError(''); setConfirmPassword(''); }} className="text-emerald-600 font-bold cursor-pointer hover:underline">{t.signUp || "Sign up"}</span>
            </p>
          ) : (
            <p className="mt-10 text-center text-sm text-slate-500 font-medium">
              {t?.alreadyHaveAccount || "Already have an account?"} <span onClick={() => { setIsLoginView(true); setError(''); setConfirmPassword(''); }} className="text-emerald-600 font-bold cursor-pointer hover:underline">{t.loginBtn || "Login"}</span>
            </p>
          )}
          <div className="mt-4 text-center">
            <button onClick={onGuestLogin} className="text-sm font-medium text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline">
              {t.guestBtn || "Continue as guest"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Half: Saudi landmark photo */}
      <div className="flex-[1] relative overflow-hidden order-1 lg:order-2 min-h-[30vh] lg:min-h-0">
        {/* Al-Ula / Hegra landmark photo */}
        <img
          src="https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200&q=80&auto=format&fit=crop"
          alt="Hegra, AlUla — Saudi Arabia"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Desktop text content */}
        <div className="absolute inset-0 hidden lg:flex flex-col justify-end p-10 text-white">
          <div className="mb-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 w-fit">
            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">{lang === 'ar' ? 'الحِجر · العُلا، المملكة العربية السعودية' : 'Hegra · AlUla, Saudi Arabia'}</span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-black mb-4 leading-[1.05] tracking-tight drop-shadow-lg">
            {t?.heroTitle || 'Discover Your Next'}<br />
            <span className="text-emerald-300">{t?.heroHighlight || 'Micro-Escape.'}</span>
          </h2>
          <p className="text-base text-white/80 leading-relaxed font-medium max-w-sm mb-6">
            {t?.heroDesc || 'Explore the hidden gems and breathtaking landscapes of Saudi Arabia with Tripo.'}
          </p>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t?.heroExplorers || 'Thousands of explorers discovering Saudi Arabia'}</span>
          </div>
        </div>

        {/* Mobile compact overlay */}
        <div className="absolute inset-0 lg:hidden flex flex-col justify-end p-6 text-white">
          <h2 className="text-2xl font-black mb-1 leading-tight drop-shadow-md">
            {t?.heroMobileTitle || 'Discover Saudi Arabia'}
          </h2>
          <p className="text-sm text-white/70">{t?.heroMobileJoin || 'Join Tripo and start exploring.'}</p>
        </div>
      </div>

    </div>
  );
};