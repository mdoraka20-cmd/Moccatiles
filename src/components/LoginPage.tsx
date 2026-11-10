import React, { useState } from 'react';
import { AppUser, ShopConfig } from '../types';
import { StorageService } from '../services/storage';
import {
  Lock,
  User,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Package,
  FileText,
  Truck,
} from 'lucide-react';

interface LoginPageProps {
  shop: ShopConfig;
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ shop, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const users = StorageService.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const trimmedUser = username.trim().toLowerCase();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === trimmedUser && u.password === password
    );

    setTimeout(() => {
      setIsLoading(false);
      if (!foundUser) {
        setErrorMsg('ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়। পুনরায় চেষ্টা করুন।');
        return;
      }

      StorageService.setCurrentUser(foundUser);
      StorageService.setAuthSession(true);
      setSuccessMsg(`স্বাগতম, ${foundUser.name}! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...`);
      setTimeout(() => {
        onLoginSuccess(foundUser);
      }, 500);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-xs select-none">
      {/* Top Windows Style Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
            IB
          </div>
          <span className="font-semibold text-slate-200 font-mono tracking-wide text-xs">
            inventory billing এপ্স - System Authentication Gateway
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-medium">{shop.name}</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <div className="flex items-center gap-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Server Ready (Port 3000)</span>
          </div>
        </div>
      </div>

      {/* Main Center Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
          {/* Header Banner */}
          <div className="bg-linear-to-b from-slate-800 to-slate-900 p-6 text-center border-b border-slate-800 relative">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl mb-3 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              লগিন প্যানেল (User Login)
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              inventory billing এপ্স - Tiles & Inventory System
            </p>
            <div className="mt-2 text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 py-1 px-3 rounded-full inline-block border border-emerald-800/60">
              {shop.name}
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl text-rose-300 flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="font-medium text-xs">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-300 flex items-center gap-2.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-medium text-xs">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">
                  ইউজারনেম (Username):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="আপনার ইউজারনেম দিন"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">
                  পাসওয়ার্ড (Password):
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড দিন"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium font-mono focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer transition flex items-center justify-center gap-2 mt-2 text-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>লগিন করে ড্যাশবোর্ডে প্রবেশ করুন</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800 text-center text-slate-500 text-[11px]">
            লগিন করার পর ড্যাশবোর্ড, বিক্রয় বিল, চালান ডেলিভারি, স্টক ইন ও সকল রিপোর্ট আনলক হবে।
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="py-2.5 px-4 bg-slate-900 border-t border-slate-800 text-slate-500 text-center text-[11px]">
        {shop.name} &bull; {shop.address} &bull; হেল্পলাইন: {shop.phones}
      </div>
    </div>
  );
};
