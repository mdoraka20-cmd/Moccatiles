import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Check, X, AlertTriangle } from 'lucide-react';
import { StorageService } from '../services/storage';

interface AdminAuthModalProps {
  isOpen: boolean;
  actionTitle: string;
  actionDetails?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  actionTitle,
  actionDetails,
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('অনুগ্রহ করে এডমিন পাসওয়ার্ড লিখুন');
      return;
    }

    if (StorageService.verifyAdminPassword(password)) {
      setError('');
      onSuccess();
    } else {
      setError('ভুল এডমিন পাসওয়ার্ড! অনুমতি দেওয়া সম্ভব নয়।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-amber-500 overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/30 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">এডমিন অনুমতি প্রয়োজন (Admin Permission)</h3>
              <p className="text-[10px] text-amber-200">ইউজার / স্টাফের জন্য সংরক্ষিত কার্যকলাপ</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-amber-800 rounded text-amber-200 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-xs">{actionTitle}</div>
              {actionDetails && <div className="text-[11px] text-amber-800">{actionDetails}</div>}
              <div className="text-[10px] text-amber-700 pt-1 border-t border-amber-200/60">
                এই তথ্য ডিলেট বা পরিবর্তন করতে প্রধান এডমিনের অনুমতি ও পাসওয়ার্ড প্রয়োজন।
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              এডমিন পাসওয়ার্ড দিন :
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="এডমিনের পাসওয়ার্ড লিখুন..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none"
            />
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer transition shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              অনুমোদন ও সম্পাদন করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
