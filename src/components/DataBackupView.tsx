import React, { useState } from 'react';
import { AppUser, Customer, Invoice, Payment, Product, ShopConfig, Txn } from '../types';
import { StorageService } from '../services/storage';
import { FirestoreSyncService } from '../services/firestoreSync';
import { Database, Download, Upload, RefreshCw, AlertTriangle, Check, X } from 'lucide-react';
import { getTodayLocalDateStr } from '../utils/numberWords';

interface DataBackupViewProps {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  txns: Txn[];
  shop: ShopConfig;
  currentUser: AppUser;
  onRequireAdminAuth: (actionTitle: string, onExecute: () => void, actionDetails?: string) => void;
  onDataReload: () => void;
}

export const DataBackupView: React.FC<DataBackupViewProps> = ({
  products,
  customers,
  invoices,
  payments,
  txns,
  shop,
  currentUser,
  onRequireAdminAuth,
  onDataReload,
}) => {
  const [msg, setMsg] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // JSON export
  const handleExportJSON = () => {
    const jsonStr = StorageService.exportAllAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `InventoryBilling_Backup_${getTodayLocalDateStr()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMsg('JSON ব্যাকআপ ডাউনলোড সম্পন্ন হয়েছে!');
    setTimeout(() => setMsg(''), 4000);
  };

  // TSV Exports matching original Billing.cs
  const handleExportTSV = (fileKey: string) => {
    let content = '';
    let fileName = '';

    if (fileKey === 'products') {
      fileName = 'products.tsv';
      content = products
        .map((p) =>
          [
            p.id,
            p.code,
            p.category,
            p.name,
            p.isTile ? '1' : '0',
            p.w,
            p.h,
            p.scm,
            p.sftPack,
            p.qtyPack,
            p.rate,
            p.price,
          ].join('\t')
        )
        .join('\n');
    } else if (fileKey === 'customers') {
      fileName = 'customers.tsv';
      content = customers
        .map((c) => [c.id, c.name, c.address, c.phone, c.deal, c.openDue].join('\t'))
        .join('\n');
    } else if (fileKey === 'invoices') {
      fileName = 'invoices.tsv';
      content = invoices
        .map((v) => {
          const itemsStr = v.items
            .map(
              (m) =>
                `${m.productId}~${m.name}~${m.dim}~${m.box}~${m.piece}~${m.sft}~${m.unit}~${m.total}~${
                  m.isTile ? '1' : '0'
                }`
            )
            .join('|');
          return [
            v.no,
            v.date,
            v.custId,
            v.custName,
            v.address,
            v.phone,
            v.deal,
            v.labor,
            v.discount,
            v.prevDue,
            v.cash,
            v.comment,
            itemsStr,
            v.bank,
            v.bkash,
          ].join('\t');
        })
        .join('\n');
    } else if (fileKey === 'payments') {
      fileName = 'payments.tsv';
      content = payments
        .map((p) => [p.id, p.date, p.custId, p.custName, p.amount, p.remark, p.method].join('\t'))
        .join('\n');
    } else if (fileKey === 'txns') {
      fileName = 'txns.tsv';
      content = txns
        .map((t) => [t.id, t.date, t.isIncome ? '1' : '0', t.head, t.amount].join('\t'))
        .join('\n');
    } else if (fileKey === 'shop') {
      fileName = 'shop.txt';
      content = [
        shop.name,
        shop.address,
        shop.phones,
        shop.web,
        shop.note.replace(/\n/g, '\\n'),
        shop.preparedBy,
        shop.startInvoiceNo,
        shop.footerText,
      ].join('\n');
    }

    const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON import (requires Admin authorization before overwriting Cloud Firestore)
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const jsonContent = reader.result as string;
      onRequireAdminAuth(
        'ব্যাকআপ JSON থেকে ডাটা রিস্টোর',
        async () => {
          setIsBusy(true);
          try {
            const success = await FirestoreSyncService.syncFullRestoreFromJSON(jsonContent);
            if (success) {
              onDataReload();
              setMsg('ডাটা রিস্টোর ও ক্লাউড সিঙ্ক সম্পন্ন হয়েছে!');
            } else {
              setMsg('❌ ভুল ফাইল ফরম্যাট। সঠিক JSON ফাইল প্রদান করুন।');
            }
          } catch {
            setMsg('❌ ফাইল পড়তে সমস্যা হয়েছে।');
          } finally {
            setIsBusy(false);
            setTimeout(() => setMsg(''), 4000);
          }
        },
        `ফাইল "${file.name}" থেকে ক্লাউড ডাটাবেস রিস্টোর করা হবে। বর্তমান ডাটা প্রতিস্থাপিত হবে।`
      );
    };
    reader.readAsText(file);
  };

  const executeResetToSample = async () => {
    setIsBusy(true);
    try {
      StorageService.resetToDefaults();
      const jsonStr = StorageService.exportAllAsJSON();
      await FirestoreSyncService.syncFullRestoreFromJSON(jsonStr);
      onDataReload();
      setIsResetModalOpen(false);
      setMsg('ডিফল্ট নমুনা ডাটা সফলভাবে সেট এবং ক্লাউড সিঙ্ক করা হয়েছে (ইউজার একাউন্ট অক্ষুণ্ণ রয়েছে)।');
    } catch {
      setMsg('❌ ডাটা রিসেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsBusy(false);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const handleRequestResetToSample = () => {
    onRequireAdminAuth(
      'নমুনা ডেমো ডাটা রিসেট (Demo Data Reset)',
      () => setIsResetModalOpen(true),
      'সতর্কতা: এটি পুরো ব্যবসার চালান, ক্রেতা ও পণ্য ডেমো ডাটায় রিসেট করবে।'
    );
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 text-xs">
      <div className="bg-white border border-slate-300 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-sm text-slate-800">
              ডাটা ব্যাকআপ, রিস্টোর ও TSV এক্সপোর্ট (Data Management)
            </h3>
          </div>
          {msg && (
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {msg}
            </span>
          )}
        </div>

        {/* Info card */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 mb-1">
            ক্লাউড ও লোকাল ডাটা স্টোরেজ সংক্রান্ত তথ্য:
          </p>
          <p>
            আপনার সকল বিল, গ্রাহক, পণ্য ও হিসাব রিয়েল-টাইম ক্লাউড ডাটাবেস (Firestore) এবং ব্রাউজারের লোকাল স্টোরেজে সংরক্ষিত থাকে।
          </p>
          <p className="mt-1">
            নিয়মিত সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড করে রাখুন — যেকোনো সময় ১টি JSON ফাইল থেকেই পুরো ব্যবসার ডাটা ফিরিয়ে আনা যাবে।
          </p>
        </div>

        {/* Section 1: Full JSON Backup & Restore */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
          <h4 className="font-bold text-slate-800 text-sm">১. সম্পূর্ণ ডাটা ব্যাকআপ ও রিস্টোর (Full Backup)</h4>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportJSON}
              disabled={isBusy}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              ব্যাকআপ ডাউনলোড (Download Backup JSON)
            </button>

            <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              {isBusy ? 'প্রসেস হচ্ছে...' : 'ব্যাকআপ ফাইল থেকে রিস্টোর (Restore from JSON)'}
              <input type="file" accept=".json" disabled={isBusy} onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* Section 2: Original TSV Files Export */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
          <h4 className="font-bold text-slate-800 text-sm">
            ২. অরিজিনাল সফটওয়্যার ফরম্যাটে TSV ফাইল এক্সপোর্ট (Original Format TSV)
          </h4>
          <p className="text-[11px] text-slate-500">
            এই ফাইলগুলো Windows Desktop সফটওয়্যারের Data ফোল্ডারে কপি করে সরাসরি ব্যবহার করা যায়।
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleExportTSV('products')}
              className="p-2 bg-white border border-slate-300 hover:border-emerald-600 rounded font-semibold text-slate-800 transition cursor-pointer flex items-center justify-between"
            >
              <span>products.tsv</span>
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleExportTSV('customers')}
              className="p-2 bg-white border border-slate-300 hover:border-emerald-600 rounded font-semibold text-slate-800 transition cursor-pointer flex items-center justify-between"
            >
              <span>customers.tsv</span>
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleExportTSV('invoices')}
              className="p-2 bg-white border border-slate-300 hover:border-emerald-600 rounded font-semibold text-slate-800 transition cursor-pointer flex items-center justify-between"
            >
              <span>invoices.tsv</span>
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleExportTSV('payments')}
              className="p-2 bg-white border border-slate-300 hover:border-emerald-600 rounded font-semibold text-slate-800 transition cursor-pointer flex items-center justify-between"
            >
              <span>payments.tsv</span>
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleExportTSV('txns')}
              className="p-2 bg-white border border-slate-300 hover:border-emerald-600 rounded font-semibold text-slate-800 transition cursor-pointer flex items-center justify-between"
            >
              <span>txns.tsv</span>
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleExportTSV('shop')}
              className="p-2 bg-white border border-slate-300 hover:border-emerald-600 rounded font-semibold text-slate-800 transition cursor-pointer flex items-center justify-between"
            >
              <span>shop.txt</span>
              <Download className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Section 3: Reset / Seed demo (Admin Only + Protected Confirmation) */}
        {currentUser.role === 'admin' && (
          <div className="border border-rose-200 rounded-lg p-4 bg-rose-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                নমুনা ডেমো ডাটা রিসেট (Admin Only - Sample Demo Data)
              </h4>
              <p className="text-[11px] text-rose-800 mt-0.5">
                সতর্কতা: রিসেট করলে ক্লাউডের সকল বর্তমান ইনভয়েস, ক্রেতা ও পণ্যের ডাটা মুছে শুরুর ডেমো ডাটা বসবে (শুধু ইউজার লগিন থাকবে)।
              </p>
            </div>
            <button
              onClick={handleRequestResetToSample}
              disabled={isBusy}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded font-semibold transition cursor-pointer flex items-center gap-1 text-xs shadow-xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ডেমো ডাটা রিসেট
            </button>
          </div>
        )}
      </div>

      {/* Explicit Confirmation Modal for Sample Demo Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-rose-500 overflow-hidden text-xs">
            <div className="bg-rose-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-200" />
                <span>সতর্কতা: ডেমো ডাটা রিসেট নিশ্চিত করুন</span>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 hover:bg-rose-600 rounded text-rose-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-slate-800 leading-relaxed font-medium">
                আপনি কি নিশ্চিতভাবে সকল বর্তমান ইনভয়েস, ক্রেতা, পেমেন্ট, পণ্য ও দোকানের তথ্য মুছে শুরুর নমুনা ডেমো ডাটায় ফিরে যেতে চান?
              </p>
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-900 text-[11px]">
                এটি ক্লাউড ডাটাবেস থেকেও সকল বর্তমান রেকর্ড মুছে ফেলবে। তবে আপনার এডমিন ও স্টাফ ইউজার একাউন্ট অক্ষুণ্ণ থাকবে। আগে JSON ব্যাকআপ ডাউনলোড করে নেওয়ার পরামর্শ দেওয়া হলো।
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isBusy}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded cursor-pointer"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={executeResetToSample}
                  disabled={isBusy}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                  {isBusy ? 'রিসেট হচ্ছে...' : 'হ্যাঁ, রিসেট করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
