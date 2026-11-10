import React, { useState } from 'react';
import { Customer, Invoice, Payment, Product, ShopConfig, Txn } from '../types';
import { StorageService } from '../services/storage';
import { Database, Download, Upload, RefreshCw, AlertTriangle, Check, FileCode } from 'lucide-react';

interface DataBackupViewProps {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  txns: Txn[];
  shop: ShopConfig;
  onDataReload: () => void;
}

export const DataBackupView: React.FC<DataBackupViewProps> = ({
  products,
  customers,
  invoices,
  payments,
  txns,
  shop,
  onDataReload,
}) => {
  const [msg, setMsg] = useState('');

  // JSON export
  const handleExportJSON = () => {
    const jsonStr = StorageService.exportAllAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `InventoryBilling_Backup_${new Date().toISOString().slice(0, 10)}.json`);
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

  // JSON import
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const success = StorageService.importFromJSON(reader.result as string);
          if (success) {
            onDataReload();
            setMsg('ডাটা রিস্টোর সম্পন্ন হয়েছে!');
            setTimeout(() => setMsg(''), 4000);
          } else {
            alert('ভুল ফাইল ফরম্যাট। সঠিক JSON ফাইল প্রদান করুন।');
          }
        } catch {
          alert('ফাইল পড়তে সমস্যা হয়েছে।');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetToSample = () => {
    if (confirm('আপনি কি টেস্ট নমুনা ডাটায় ফিরে যেতে চান? বর্তমান সকল ডাটা প্রতিস্থাপিত হবে।')) {
      StorageService.resetToDefaults();
      onDataReload();
      setMsg('নমুনা ডাটা সেট করা হয়েছে!');
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 text-xs">
      <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
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
            লোকাল ডাটা স্টোরেজ ও ফাইল ব্যাকআপ সংক্রান্ত তথ্য:
          </p>
          <p>
            আসল C# / VB.NET অ্যাপে ডাটা সংরক্ষিত থাকে <code className="font-mono text-emerald-800 font-bold">D:\TilesBillingData</code> অথবা <code className="font-mono text-emerald-800 font-bold">C:\TilesBillingData</code> ফোল্ডারে TSV আকারে। এই ওয়েব সংস্করণে সব ডাটা ব্রাউজারের লোকাল স্টোরেজে নিরাপদে সংরক্ষিত থাকে।
          </p>
          <p className="mt-1">
            যেকোনো সময় ১-ক্লিকে সম্পূর্ণ ব্যাকআপ নিতে পারেন অথবা আসল অ্যাপের মতো পৃথক <code className="font-mono text-slate-700 font-bold">.tsv</code> ফাইল হিসেবে এক্সপোর্ট করতে পারবেন।
          </p>
        </div>

        {/* Section 1: Full JSON Backup & Restore */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
          <h4 className="font-bold text-slate-800 text-sm">১. সম্পূর্ণ ডাটা ব্যাকআপ ও রিস্টোর (Full Backup)</h4>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              ব্যাকআপ ডাউনলোড (Download Backup JSON)
            </button>

            <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              ব্যাকআপ ফাইল থেকে রিস্টোর (Restore from JSON)
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
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

        {/* Section 3: Reset / Seed demo */}
        <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/40 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-amber-950 text-xs">নমুনা ডেমো ডাটা রিসেট (Sample Demo Data)</h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              শুরুর ডিফল্ট প্রোডাক্ট, কাস্টমার এবং বিলিং তথ্যে ফিরে যেতে চাইলে রিসেট চাপুন।
            </p>
          </div>
          <button
            onClick={handleResetToSample}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded font-semibold transition cursor-pointer flex items-center gap-1 text-xs shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            রিসেট করুন
          </button>
        </div>
      </div>
    </div>
  );
};
