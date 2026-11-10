/**
 * Robust print helper designed for modern browsers, nested iframes, and sandboxed preview environments.
 */

export const generatePrintableHtmlDocument = (contentHtml: string, title: string): string => {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page { 
      margin: 6mm 8mm; 
      size: A4 portrait; 
    }
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    body {
      font-family: 'Hind Siliguri', 'Nirmala UI', sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 12px;
      font-size: 11px;
      line-height: 1.35;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
    }
    th, td { 
      border: 1px solid #475569; 
      padding: 4px 6px; 
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-semibold { font-weight: 600; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: 'JetBrains Mono', monospace, Courier; }
    .bg-slate-100 { background-color: #f1f5f9 !important; }
    .bg-slate-50 { background-color: #f8fafc !important; }
    .bg-emerald-50 { background-color: #ecfdf5 !important; }
    .border { border: 1px solid #94a3b8; }
    .border-b { border-bottom: 1px solid #94a3b8; }
    .border-t { border-top: 1px solid #94a3b8; }
    .border-b-2 { border-bottom: 2px solid #0f172a; }
    .border-t-2 { border-top: 2px solid #0f172a; }
    .border-slate-900 { border-color: #0f172a !important; }
    .border-slate-800 { border-color: #1e293b !important; }
    .border-slate-700 { border-color: #334155 !important; }
    .border-slate-400 { border-color: #94a3b8 !important; }
    .border-slate-300 { border-color: #cbd5e1 !important; }
    .border-slate-200 { border-color: #e2e8f0 !important; }
    .text-red-600 { color: #dc2626 !important; }
    .text-rose-700 { color: #be123c !important; }
    .text-rose-800 { color: #9f1239 !important; }
    .text-emerald-700 { color: #047857 !important; }
    .text-emerald-800 { color: #065f46 !important; }
    .text-emerald-900 { color: #064e3b !important; }
    .text-slate-950 { color: #020617 !important; }
    .text-slate-900 { color: #0f172a !important; }
    .text-slate-800 { color: #1e293b !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-600 { color: #475569 !important; }
    .text-slate-500 { color: #64748b !important; }
    .uppercase { text-transform: uppercase; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-tight { letter-spacing: -0.025em; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .justify-end { justify-content: flex-end; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .w-full { width: 100%; }
    .w-64 { width: 16rem; }
    .w-72 { width: 18rem; }
    .w-80 { width: 20rem; }
    .w-10 { width: 2.5rem; }
    .w-16 { width: 4rem; }
    .w-20 { width: 5rem; }
    .w-24 { width: 6rem; }
    .w-28 { width: 7rem; }
    .w-32 { width: 8rem; }
    .w-44 { width: 11rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-5 { margin-bottom: 1.25rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mt-0\\.5 { margin-top: 0.125rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.75rem; }
    .mt-4 { margin-top: 1rem; }
    .my-1 { margin-top: 0.25rem; margin-bottom: 0.25rem; }
    .my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; }
    .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .text-xs { font-size: 11px; }
    .text-sm { font-size: 13px; }
    .text-base { font-size: 14px; }
    .text-lg { font-size: 16px; }
    .text-xl { font-size: 18px; }
    .text-2xl { font-size: 22px; }
    .text-3xl { font-size: 26px; }
    .divide-y > * + * { border-top: 1px solid #cbd5e1; }
    .rounded { border-radius: 4px; }
    .rounded-sm { border-radius: 2px; }
    .rounded-lg { border-radius: 8px; }
    .italic { font-style: italic !important; }
    .text-blue-600 { color: #2563eb !important; }
    .text-teal-700 { color: #0f766e !important; }
    .text-teal-800 { color: #115e59 !important; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .gap-2 { gap: 0.5rem; }
    .gap-4 { gap: 1rem; }
    .shrink-0 { flex-shrink: 0; }
    .grow { flex-grow: 1; }
    .border-dotted { border-style: dotted !important; }
    .border-dashed { border-style: dashed !important; }
    .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .space-y-1\\.5 > * + * { margin-top: 0.375rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .mt-16 { margin-top: 4rem; }
    .mt-20 { margin-top: 5rem; }
    .pt-4 { padding-top: 1rem; }
    .pb-0\\.5 { padding-bottom: 0.125rem; }
    .capitalize { text-transform: capitalize; }
    .w-auto { width: auto; }
    .w-8 { width: 2rem; }
    .w-12 { width: 3rem; }
    .w-14 { width: 3.5rem; }
    .w-18 { width: 4.5rem; }
    .w-22 { width: 5.5rem; }
    .w-24 { width: 6rem; }
    .w-28 { width: 7rem; }
    .w-36 { width: 9rem; }
    .w-56 { width: 14rem; }
    
    @media print {
      body { padding: 0 !important; margin: 0 !important; }
      .no-print-bar { display: none !important; }
      th, td { border-color: #000000 !important; }
    }
  </style>
  <script>
    // Automatically trigger native print dialog when opened as standalone file
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</head>
<body>
  <div class="no-print-bar" style="margin-bottom: 14px; padding: 12px 16px; background: #0f172a; color: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
    <div>
      <strong style="font-size: 14px; color: #38bdf8;">🖨️ ${title}</strong>
      <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">প্রিন্ট বা PDF সংরক্ষণের জন্য প্রস্তুত (A4 Size)</div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="padding: 7px 18px; background: #059669; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">🖨️ প্রিন্ট করুন / Save as PDF</button>
    </div>
  </div>
  ${contentHtml}
</body>
</html>`;
};

export const downloadHtmlFile = (contentHtml: string, title: string): string => {
  const fullHtml = generatePrintableHtmlDocument(contentHtml, title);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = title.replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_') || 'Document';
  const finalFilename = `${safeFilename}.html`;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return finalFilename;
};

export const printHtmlContent = (contentHtml: string, title: string): { filename: string; printed: boolean } => {
  // 1. ALWAYS trigger download so user gets instant ready-to-print file even when Chrome sandbox disables window.print()
  const filename = downloadHtmlFile(contentHtml, title);

  // 2. Try hidden iframe print
  let printed = false;
  try {
    let printFrame = document.getElementById('app-print-service-frame') as HTMLIFrameElement | null;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'app-print-service-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      const fullHtml = generatePrintableHtmlDocument(contentHtml, title);
      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();
      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
        } catch (e) {
          // ignore
        }
      }, 250);
    }
  } catch (err) {
    // ignore
  }

  // 3. Also try window.print()
  try {
    window.focus();
    window.print();
    printed = true;
  } catch (e) {
    // ignore
  }

  return { filename, printed };
};
