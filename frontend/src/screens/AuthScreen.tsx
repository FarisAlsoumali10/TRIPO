import React, { useState } from 'react';
import { MapPin, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Input } from '../components/ui';
// ⚠️ تأكد أن مسار الاستيراد هذا صحيح ويشير إلى ملف api.ts الخاص بك
import { authAPI } from '../services/api';

export const AuthScreen = ({ onLogin, onRegister, onGuestLogin, t, lang, onToggleLang }: any) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // حالات الاتصال بالخادم
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // تنظيف الأخطاء السابقة

    if (!isLoginView && !name) {
      setError('الرجاء إدخال الاسم الكامل');
      return;
    }

    if (!email || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      setIsLoading(true);

      // إرسال الطلب للباك-إند
      const response = isLoginView
        ? await authAPI.login({ email, password })
        : await authAPI.register({ name, email, password, language: 'en' });

      // حفظ تذكرة المرور (Token) وبيانات المستخدم في المتصفح
      localStorage.setItem('token', response.token);
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
        (isLoginView ? 'Login failed. Check your email and password.' : 'Could not create account. Make sure your password is at least 8 characters.');
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
            <span className="font-bold text-xl text-slate-800 tracking-tight">Tripo</span>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="absolute top-6 right-6 lg:right-12">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full text-sm font-bold text-slate-700 shadow-sm shadow-slate-200"
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            {lang === 'en' ? 'Arabic' : 'English'}
          </button>
        </div>

        <div className="max-w-md w-full mx-auto mt-12 lg:mt-0">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-wide">{isLoginView ? t.welcome : t.signUp || 'Create Account'}</h1>
            <p className="text-lg text-slate-500">{isLoginView ? t.tagline : 'Sign up to discover new places and experiences'}</p>
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
                  placeholder="John Doe"
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
                <p className="text-xs text-slate-400 mt-1 ml-1">Minimum 8 characters</p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full py-4 mt-8 bg-emerald-600 border-none hover:bg-emerald-700 shadow-lg shadow-emerald-100 text-lg flex items-center justify-center gap-2 rounded-xl transition-all hover:scale-[1.02]">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : <span className="text-white">{isLoginView ? (t.loginBtn || "Login") : (t.signUp || "Sign up")}</span>}
            </Button>
          </form>

          {isLoginView ? (
            <p className="mt-10 text-center text-sm text-slate-500 font-medium">
              {t.noAccount || "Don't have an account?"} <span onClick={() => { setIsLoginView(false); setError(''); }} className="text-emerald-600 font-bold cursor-pointer hover:underline">{t.signUp || "Sign up"}</span>
            </p>
          ) : (
            <p className="mt-10 text-center text-sm text-slate-500 font-medium">
              Already have an account? <span onClick={() => { setIsLoginView(true); setError(''); }} className="text-emerald-600 font-bold cursor-pointer hover:underline">{t.loginBtn || "Login"}</span>
            </p>
          )}
          <div className="mt-4 text-center">
            <button onClick={onGuestLogin} className="text-sm font-medium text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline">
              {t.guestBtn || "Continue as guest"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Half: Blue Gradient Backdrop with Messaging */}
      <div className="flex-[1] flex flex-col justify-center relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-8 lg:p-24 text-white order-1 lg:order-2 min-h-[30vh] lg:min-h-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 min-h-full min-w-full"></div>
        <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 transition-transform duration-1000 animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] bg-teal-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 transition-transform duration-1000 delay-500 animate-pulse"></div>

        <div className="relative z-10 max-w-lg mx-auto transform transition-all hover:scale-105 duration-700 hidden lg:flex flex-col h-full justify-center">
          <div>
            <div className="mb-10 inline-flex items-center justify-center p-5 bg-white/10 backdrop-blur-md rounded-3xl ring-1 ring-white/20 shadow-2xl">
              <MapPin className="w-14 h-14 text-emerald-100" />
            </div>
            <h2 className="text-5xl lg:text-7xl font-black mb-6 leading-[1.1] tracking-tight text-white drop-shadow-md">
              Discover Your Next<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 drop-shadow-none">Micro-Escape.</span>
            </h2>
            <p className="text-xl text-emerald-100/90 leading-relaxed font-medium mb-12 max-w-md drop-shadow-sm">
              Join thousands of travelers exploring the hidden gems and breathtaking landscapes of Saudi Arabia with Tripo.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold text-emerald-100 mt-auto">
            <div className="flex -space-x-3">
              <img className="w-10 h-10 rounded-full border-2 border-emerald-800 object-cover shadow-sm" src="https://i.pravatar.cc/100?img=33" alt="User 1" />
              <img className="w-10 h-10 rounded-full border-2 border-emerald-800 object-cover shadow-sm" src="https://i.pravatar.cc/100?img=47" alt="User 2" />
              <img className="w-10 h-10 rounded-full border-2 border-emerald-800 object-cover shadow-sm" src="https://i.pravatar.cc/100?img=12" alt="User 3" />
              <div className="w-10 h-10 rounded-full border-2 border-emerald-800 bg-emerald-600 flex items-center justify-center text-xs font-bold shadow-md z-10 text-white">
                +2k
              </div>
            </div>
            <p className="opacity-90 tracking-wide">Active explorers today</p>
          </div>
        </div>

        {/* Mobile Title View */}
        <div className="relative z-10 lg:hidden text-center flex flex-col items-center justify-center flex-1">
          <div className="mb-6 inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl ring-1 ring-white/20 shadow-xl">
            <MapPin className="w-8 h-8 text-emerald-100" />
          </div>
          <h2 className="text-3xl font-black mb-2 leading-tight tracking-tight text-white">
            Discover Your Next<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">Micro-Escape.</span>
          </h2>
        </div>
      </div>

    </div>
  );
};