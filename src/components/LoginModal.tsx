import React, { useState } from 'react';
import { AppUser, UserRole } from '../types';
import { StorageService } from '../services/storage';
import { Lock, User, KeyRound, Shield, CheckCircle2, AlertCircle, X, LogIn } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const users = StorageService.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedUser = username.trim().toLowerCase();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === trimmedUser && u.password === password
    );

    if (!foundUser) {
      setErrorMsg('ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়। পুনরায় চেষ্টা করুন।');
      return;
    }

    StorageService.setCurrentUser(foundUser);
    StorageService.setAuthSession(true);
    onLoginSuccess(foundUser);
    setSuccessMsg(`স্বাগতম, ${foundUser.name}!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden text-xs">
        {/* WinForms Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 rounded-md">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">সিস্টেম লগিন ও ইউজার সুইচ</h3>
              <p className="text-[10px] text-slate-400">Inventory & Billing Security Login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active User Status */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">বর্তমান লগিন:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              {currentUser.role === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <User className="w-3.5 h-3.5 text-blue-600" />
              )}
              {currentUser.name}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              currentUser.role === 'admin'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}
          >
            {currentUser.role}
          </span>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                ইউজারনেম (Username):
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="আপনার ইউজারনেম দিন"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:border-emerald-600 focus:bg-white text-slate-900 font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                পাসওয়ার্ড (Password):
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="আপনার পাসওয়ার্ড দিন"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:border-emerald-600 focus:bg-white text-slate-900 font-medium font-mono"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-sm cursor-pointer transition flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              লগিন করুন (Sign In)
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded cursor-pointer transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
