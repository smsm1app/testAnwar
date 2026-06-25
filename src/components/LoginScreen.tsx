/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../api';
import { KeyRound, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AnwarLogo from './AnwarLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى كتابة اسم المستخدم ورمز المرور');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.login(username, password);
      if (!rememberMe) {
        // If user doesn't want to be remembered, clear persistent token
        // so session ends when browser closes (token stays in memory via api.ts)
        localStorage.removeItem('token');
      } else {
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. تأكد من صحة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Stunning Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url(/images/login-bg.png)' }}
      >
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-slate-950/90"></div>
      </div>

      {/* Floating Orbs for extra dynamic feel */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-amber-500/20 blur-[100px] animate-pulse-skeleton pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 p-8 sm:p-10 z-10 animate-fade-in relative overflow-hidden">

        {/* Shine effect across the card */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-amber-500/50 to-transparent"></div>

        <div className="flex flex-col items-center mb-8">
          <img src="/images/anwar-logo.png" alt="Anwar Al-Ibdaa Logo" className="w-24 h-24 mb-4 object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]" />
          <h1 className="text-3xl font-black text-white tracking-tight text-center font-sans drop-shadow-md">أنوار الإبداع</h1>
          <p className="text-xs text-amber-100/70 mt-2 text-center font-medium tracking-wide">بوابة الإدارة السحابية الموحدة</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 text-sm px-4 py-3 rounded-xl mb-6 text-center animate-shake backdrop-blur-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">اسم المستخدم</label>
            <div className="relative group">
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 group-focus-within:text-amber-400 transition-colors pointer-events-none">
                <User className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3.5 pr-12 pl-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
                placeholder="أدخل اسم الحساب..."
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">الرمز السري</label>
            <div className="relative group">
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 group-focus-within:text-amber-400 transition-colors pointer-events-none">
                <KeyRound className="w-4.5 h-4.5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3.5 pr-12 pl-12 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-amber-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 pt-2">
            <label className="flex items-center cursor-pointer select-none group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer appearance-none w-4.5 h-4.5 border border-slate-600 rounded bg-slate-950/50 checked:bg-amber-500 checked:border-amber-500 transition-all cursor-pointer ml-2"
                />
                <svg className="absolute w-3 h-3 text-slate-950 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity ml-2" viewBox="0 0 14 10" fill="none">
                  <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="group-hover:text-white transition-colors">تذكر الدخول</span>
            </label>
            <span className="text-amber-400/80 hover:text-amber-400 cursor-pointer transition-colors font-medium hover:underline underline-offset-4">نسيت الرمز؟</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {/* Button Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/40 to-transparent"></div>

            {loading ? (
              <span className="flex items-center justify-center gap-2 relative z-10">
                <svg className="animate-spin h-4.5 w-4.5 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جاري توثيق الدخول...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 relative z-10">
                <ShieldCheck className="w-5 h-5" />
                دخول للنظام الآمن
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center justify-center text-slate-400 text-[10px] space-y-1.5 font-medium">
          <span className="flex items-center gap-1.5"> نظام سحابي مشفر ومستضاف بالكامل</span>

        </div>
      </div>
    </div>
  );
}
