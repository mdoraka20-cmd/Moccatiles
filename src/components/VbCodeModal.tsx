import React, { useState } from 'react';
import { Code2, Download, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export const VbCodeModal: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const sampleBat = `@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo   inventory billing এপ্স - VB.NET Build and Install
echo ============================================================

set "VBC=%windir%\\Microsoft.NET\\Framework64\\v4.0.30319\\vbc.exe"
if not exist "%VBC%" set "VBC=%windir%\\Microsoft.NET\\Framework\\v4.0.30319\\vbc.exe"
if not exist "%VBC%" (
  echo [ERROR] .NET Framework 4 Visual Basic Compiler (vbc.exe) not found.
  pause
  exit /b 1
)

echo Compiling InventoryBilling.exe with VB.NET Compiler (vbc.exe)...
"%VBC%" /nologo /target:winexe /optimize+ /codepage:65001 /out:InventoryBilling.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Core.dll Billing.vb

set "DEST=%LOCALAPPDATA%\\InventoryBilling"
if not exist "%DEST%" mkdir "%DEST%"
copy /y InventoryBilling.exe "%DEST%\\InventoryBilling.exe" >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))){ $s=$w.CreateShortcut($d+'\\Inventory Billing.lnk'); $s.TargetPath='%DEST%\\InventoryBilling.exe'; $s.WorkingDirectory='%DEST%'; $s.Save() }"

echo Application Installed to: %DEST%
start "" "%DEST%\\InventoryBilling.exe"
pause`;

  const handleDownloadVb = () => {
    const link = document.createElement('a');
    link.href = '/Billing.vb';
    link.download = 'Billing.vb';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBat = () => {
    const link = document.createElement('a');
    link.href = '/Install_VB.bat';
    link.download = 'Install_VB.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCode = async () => {
    try {
      const res = await fetch('/Billing.vb');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert('সোর্স কোড কপি করতে সমস্যা হয়েছে। সরাসরি ডাউনলোড বাটন ব্যবহার করুন।');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 text-xs">
      <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-2xs space-y-4">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Visual Basic .NET (VB.NET) সোর্স কোড ও ইনস্টলার
              </h3>
              <p className="text-[11px] text-slate-500">
                ব্যবহারকারীর নির্দেশনা মোতাবেক পুরো <code className="font-mono font-bold text-slate-700">Billing.cs</code> ফাইলটিকে <code className="font-mono font-bold text-emerald-800">Billing.vb</code> (VB.NET) এ রূপান্তর করা হয়েছে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold transition cursor-pointer shadow-xs text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'কপি সম্পন্ন!' : 'VB কোড কপি করুন'}
            </button>
            <button
              onClick={handleDownloadVb}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold transition cursor-pointer shadow-xs text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Billing.vb ডাউনলোড
            </button>
            <button
              onClick={handleDownloadBat}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded font-bold transition cursor-pointer shadow-xs text-xs"
            >
              <Terminal className="w-3.5 h-3.5" />
              Install_VB.bat ডাউনলোড
            </button>
          </div>
        </div>

        {/* Instructions in Bengali */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4 space-y-2 text-slate-800">
          <h4 className="font-bold text-emerald-950 text-xs">
            Windows পিসিতে VB.NET সংস্করণ সরাসরি বিল্ড ও রান করার নিয়ম:
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 leading-relaxed font-medium">
            <li>
              উপরের <strong>Billing.vb</strong> এবং <strong>Install_VB.bat</strong> ফাইল দুটি ডাউনলোড করে যেকোনো একটি ফোল্ডারে রাখুন।
            </li>
            <li>
              <strong>Install_VB.bat</strong> ফাইলে ডাবল ক্লিক করুন। Windows-এর বিল্ট-ইন VB.NET কম্পাইলার (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">vbc.exe</code>) দিয়ে সরাসরি <code className="font-mono font-bold">InventoryBilling.exe</code> তৈরি হয়ে ইনস্টল হবে।
            </li>
            <li>
              ডেস্কটপে এবং স্টার্ট মেনুতে <strong>"Inventory Billing"</strong> শর্টকাট তৈরি হবে এবং সফটওয়্যারটি তৎক্ষণাৎ চালু হবে!
            </li>
            <li>
              ডাটা স্টোরেজ আগের মতোই স্বয়ংক্রিয়ভাবে <code className="font-mono font-bold">D:\InventoryBillingData</code> (বা C:\) ফোল্ডারে সংরক্ষিত থাকবে।
            </li>
          </ol>
        </div>

        {/* Bat Preview */}
        <div className="space-y-1.5">
          <span className="font-bold text-slate-700 block">ইনস্টলেশন ব্যাচ স্ক্রিপ্ট প্রিভিউ (Install_VB.bat):</span>
          <pre className="p-3 bg-slate-900 text-emerald-300 rounded font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
            {sampleBat}
          </pre>
        </div>
      </div>
    </div>
  );
};
