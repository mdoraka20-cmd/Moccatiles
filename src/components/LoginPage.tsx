import React, { useState } from 'react';
import { AppUser, ShopConfig } from '../types';
import { StorageService } from '../services/storage';
import {
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  Building2,
} from 'lucide-react';

interface LoginPageProps {
  shop: ShopConfig;
  users?: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ shop, users: propUsers, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const users = propUsers && propUsers.length > 0 ? propUsers : StorageService.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const trimmedUser = username.trim().toLowerCase();
    const latestUsers = propUsers && propUsers.length > 0 ? propUsers : StorageService.getUsers();
    const foundUser = latestUsers.find(
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
      }, 400);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-xs select-none">
      {/* Top Clean Shop Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-100 font-bold truncate">{shop.name}</span>
        </div>
      </div>

      {/* Main Center Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
          {/* Header Banner */}
          <div className="bg-linear-to-b from-slate-800 to-slate-900 p-5 sm:p-6 text-center border-b border-slate-800">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl mb-3 shadow-inner">
              <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              লগিন প্যানেল (User Login)
            </h1>
            <p className="mt-1.5 text-xs text-emerald-400 font-semibold">
              {shop.name}
            </p>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl text-rose-300 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="font-medium text-xs">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-medium text-xs">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">
                  ইউজারনেম (Username):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="আপনার ইউজারনেম দিন"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">
                  পাসওয়ার্ড (Password):
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড দিন"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium font-mono text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 p-0.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer transition flex items-center justify-center gap-2 mt-2 text-sm min-h-[46px]"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>লগিন করে প্রবেশ করুন</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800 text-center text-slate-500 text-[11px]">
            প্রতিবার ব্রাউজার বন্ধ করে পুনরায় ওপেন করলে নিরাপত্তার জন্য নতুন করে লগিন করতে হবে।
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="py-2.5 px-4 bg-slate-900 border-t border-slate-800 text-slate-500 text-center text-[11px] leading-relaxed">
        {shop.name} &bull; {shop.address} &bull; হেল্পলাইন: {shop.phones}
      </div>
    </div>
  );
};

