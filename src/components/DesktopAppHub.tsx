import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Download,
  Terminal,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Laptop,
  FolderArchive,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface DesktopAppHubProps {
  onTriggerInstallPrompt?: () => void;
  canInstallPwa?: boolean;
  isInstalled?: boolean;
}

export const DesktopAppHub: React.FC<DesktopAppHubProps> = ({
  onTriggerInstallPrompt,
  canInstallPwa,
  isInstalled,
}) => {
  const [downloadMsg, setDownloadMsg] = useState('');

  const handleDownload = (filename: string, path: string) => {
    const link = document.createElement('a');
    link.href = path;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadMsg(`${filename} ডাউনলোড শুরু হয়েছে!`);
    setTimeout(() => setDownloadMsg(''), 4000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 text-xs">
      {/* Hero Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl p-6 shadow-md border border-slate-700 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            ডেস্কটপ অ্যাপ্লিকেশন হাব (Desktop App Installation Hub)
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            "inventory billing এপ্স" আপনার কম্পিউটারে ডেক্সটপ অ্যাপ হিসেবে চালানোর ৩টি সহজ পদ্ধতি
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            আপনি এটি সরাসরি ব্রাউজার ছাড়াই একটি স্বাধীন <strong>Windows Desktop App (.exe / Native App)</strong> হিসেবে আপনার পিসিতে ইনস্টল করে চালাতে পারেন। নিচে আপনার সুবিধাজনক যেকোনো একটি পদ্ধতি বেছে নিন:
          </p>
        </div>

        {downloadMsg && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold text-xs shadow-md">
            <CheckCircle2 className="w-4 h-4" /> {downloadMsg}
          </div>
        )}
      </div>

      {/* 3 Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Method 1: Instant PWA Desktop App */}
        <div className="bg-white border-2 border-emerald-600/80 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
            সবচেয়ে সহজ ও দ্রুত (1-Click)
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Monitor className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">
                পদ্ধতি ১: সরাসরি ডেস্কটপ অ্যাপ ইনস্টল (Desktop App PWA)
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Chrome বা Edge ব্রাউজার থেকে সরাসরি উইন্ডোজ ডেস্কটপে ইনস্টল হবে। কোনো জটিলতা নেই।
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-slate-700">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ডেস্কটপে নিজস্ব আইকন ও শর্টকাট</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ব্রাউজার বার ছাড়া স্বাধীন উইন্ডো</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>সম্পূর্ণ অফলাইন ডাটা সেভ সুবিধা</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-amber-50/60 p-2.5 rounded border border-amber-200/60">
              <p className="font-bold text-amber-900">ইনস্টল করার নিয়ম:</p>
              <p>১. নিচের সবুজ বাটনে চাপুন (অথবা ব্রাউজারের অ্যাড্রেস বারের ডানপাশে <span className="font-mono bg-white px-1 border border-slate-300 rounded">⊕ Install</span> আইকন চাপুন)।</p>
              <p>২. 'Install' নিশ্চিত করলেই তৎক্ষণাৎ ডেস্কটপে সফটওয়্যারটির শর্টকাট চলে আসবে!</p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            {canInstallPwa ? (
              <button
                onClick={onTriggerInstallPrompt}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer transition shadow-md flex items-center justify-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                ডেস্কটপে ইনস্টল করুন (Install Now)
              </button>
            ) : isInstalled ? (
              <div className="p-2 text-center bg-emerald-50 text-emerald-800 font-bold rounded border border-emerald-300">
                ✓ ডেস্কটপ অ্যাপ ইনস্টল করা আছে!
              </div>
            ) : (
              <button
                onClick={() => {
                  alert(
                    'আপনার ব্রাউজারের (Chrome / Edge) উপরের অ্যাড্রেস বারের ডানপাশে থাকা "Install" বা "Add to Desktop" আইকনে চাপুন।'
                  );
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs cursor-pointer transition shadow-xs flex items-center justify-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                ডেস্কটপে ইনস্টল করুন (Install App)
              </button>
            )}
          </div>
        </div>

        {/* Method 2: Native Windows .EXE via VB.NET / C# */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
              <Laptop className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">
                পদ্ধতি ২: অরিজিনাল Windows .EXE সফটওয়্যার
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Windows-এর নিজস্ব .NET কম্পাইলার দিয়ে তৈরি হবে <code className="font-mono text-cyan-900 font-bold">InventoryBilling.exe</code>।
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-slate-700">
              <div className="flex items-center gap-1.5 font-semibold text-cyan-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>১০০% পিওর Windows Executable (.exe)</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-cyan-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>লোকাল ড্রাইভে TSV ডাটাবেজ ব্যাকআপ</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-cyan-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Visual Studio ছাড়াই রান হবে</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-cyan-50/60 p-2.5 rounded border border-cyan-200/60">
              <p className="font-bold text-cyan-950">রান করার সহজ ৩টি ধাপ:</p>
              <p>১. নিচে থেকে <code className="font-bold text-slate-800">Billing.vb</code> ও <code className="font-bold text-slate-800">Install_VB.bat</code> ডাউনলোড করুন।</p>
              <p>২. দুটি ফাইল একই ফোল্ডারে রেখে <code className="font-bold text-slate-800">Install_VB.bat</code> ফাইলে ডাবল ক্লিক করুন।</p>
              <p>৩. সাথে সাথে <code className="font-mono font-bold">InventoryBilling.exe</code> তৈরি হয়ে ডেস্কটপ শর্টকাট সহ চালু হবে!</p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={() => handleDownload('Billing.vb', '/Billing.vb')}
              className="w-full py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg font-bold text-xs cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Billing.vb ডাউনলোড
            </button>
            <button
              onClick={() => handleDownload('Install_VB.bat', '/Install_VB.bat')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              Install_VB.bat (অটো বিল্ডার)
            </button>
          </div>
        </div>

        {/* Method 3: Electron / Standalone Setup Installer */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <FolderArchive className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">
                পদ্ধতি ৩: Electron ডেক্সটপ ইনস্টলার (.exe Installer)
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                আধুনিক ওয়েব ইন্টারফেসটিকে যেকোনো Windows কম্পিউটারে Setup.exe আকারে প্যাকেজিং।
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-slate-700">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>প্রফেশনাল Windows Setup উইজার্ড</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>উইন্ডোজ, ম্যাক ও লিনাক্স সাপোর্ট</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ডেস্কটপ নোটিফিকেশন ও অটো-আপডেট</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 bg-slate-900 text-slate-200 p-2.5 rounded font-mono leading-relaxed overflow-x-auto">
              <span className="text-emerald-400"># Electron প্যাকেজ তৈরি:</span>
              <br />
              npm install -D electron electron-builder
              <br />
              npx electron-builder --win
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <button
              onClick={() => {
                alert(
                  'পদ্ধতি ১ (PWA Desktop App) এবং পদ্ধতি ২ (VB.NET .EXE) সবচেয়ে দ্রুত ও সম্পূর্ণ কার্যকর। আপনি এই দুটি পদ্ধতি এখনই ব্যবহার করতে পারেন!'
                );
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs cursor-pointer transition shadow-xs flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              প্যাকেজিং গাইড দেখুন
            </button>
          </div>
        </div>
      </div>

      {/* Helpful Comparison Table */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-2xs space-y-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          কোন পদ্ধতিটি আপনার জন্য সবচেয়ে ভালো?
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2.5">বৈশিষ্ট্য</th>
                <th className="p-2.5 text-emerald-800">পদ্ধতি ১: PWA ডেক্সটপ ইনস্টল</th>
                <th className="p-2.5 text-cyan-800">পদ্ধতি ২: VB.NET / C# .EXE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2.5 font-semibold text-slate-700">ইনস্টল সময়</td>
                <td className="p-2.5 font-bold text-emerald-700">মাত্র ৫ সেকেন্ড (১-ক্লিক)</td>
                <td className="p-2.5 text-slate-800">১০ সেকেন্ড (Install_VB.bat ডাবল ক্লিক)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-slate-700">Windows ডেস্কটপ শর্টকাট</td>
                <td className="p-2.5 text-emerald-700 font-semibold">হ্যাঁ (স্বয়ংক্রিয়)</td>
                <td className="p-2.5 text-cyan-700 font-semibold">হ্যাঁ (স্বয়ংক্রিয়)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-slate-700">অফলাইন সুবিধা (ইন্টারনেট ছাড়া)</td>
                <td className="p-2.5 text-emerald-700 font-semibold">হ্যাঁ, ইন্টারনেট ছাড়াই কাজ করে</td>
                <td className="p-2.5 text-cyan-700 font-semibold">হ্যাঁ, ১০০% অফলাইন</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-slate-700">ডাটা সংরক্ষণ</td>
                <td className="p-2.5 text-slate-700">ব্রাউজার লোকাল স্টোরেজ + JSON/TSV ব্যাকআপ</td>
                <td className="p-2.5 text-slate-700">D:\InventoryBillingData ড্রাইভ ফোল্ডারে</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
