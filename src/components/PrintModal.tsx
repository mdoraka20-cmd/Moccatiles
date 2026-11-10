import React, { useRef, useState } from 'react';
import { Customer, DeliveryChallan, Invoice, Payment, ShopConfig, StockInRecord } from '../types';
import { formatMoney, formatQty, inWords, formatDateBangla, formatDateTimeBangla } from '../utils/numberWords';
import { Printer, X, Download, Truck, CheckCircle2 } from 'lucide-react';
import { StorageService } from '../services/storage';
import { printHtmlContent, downloadHtmlFile } from '../utils/printHelper';

interface PrintModalProps {
  type: 'invoice' | 'challan' | 'receipt' | 'report' | 'delivery_challan' | 'stock_in';
  invoice?: Invoice;
  payment?: Payment;
  deliveryChallan?: DeliveryChallan;
  stockInRecord?: StockInRecord;
  reportData?: {
    title: string;
    period: string;
    info?: string[];
    blocks: Array<{
      caption?: string;
      heads: string[];
      rows: string[][];
      total?: string[];
    }>;
    summary?: Array<[string, string]>;
    reportType?: 'stock_report' | 'customer_transaction' | 'standard';
    supplierName?: string;
    stockDate?: string;
    printDate?: string;
    customerHeader?: string;
    totalsRight?: {
      debit: string;
      credit: string;
      due: string;
    };
  };
  shop: ShopConfig;
  onClose: () => void;
}

// NTT Company House Logo matching user reference images
const NttLogo: React.FC = () => (
  <div className="flex flex-col items-center shrink-0">
    <svg width="84" height="68" viewBox="0 0 100 82" className="inline-block">
      {/* Outer Roof triangle */}
      <polygon points="50,2 3,34 97,34" fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinejoin="round" />
      {/* Inner Roof triangle */}
      <polygon points="50,9 13,33 87,33" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
      {/* NTT Text */}
      <text x="50" y="28" textAnchor="middle" fontSize="15" fontWeight="900" fill="#0f172a" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="1">
        NTT
      </text>
      {/* Building Body Outline */}
      <rect x="18" y="34" width="64" height="32" fill="none" stroke="#0f172a" strokeWidth="3.5" />
      {/* Vertical Window Grid */}
      <line x1="34" y1="34" x2="34" y2="66" stroke="#0f172a" strokeWidth="2.2" />
      <line x1="50" y1="34" x2="50" y2="66" stroke="#0f172a" strokeWidth="2.2" />
      <line x1="66" y1="34" x2="66" y2="66" stroke="#0f172a" strokeWidth="2.2" />
      {/* Horizontal Window Grid */}
      <line x1="18" y1="45" x2="82" y2="45" stroke="#0f172a" strokeWidth="2" />
      <line x1="18" y1="56" x2="82" y2="56" stroke="#0f172a" strokeWidth="2" />
      {/* Bottom Text */}
      <text x="50" y="78" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0f172a" fontFamily="'Hind Siliguri', sans-serif">
        Noor Tiles &amp; Fittings
      </text>
    </svg>
  </div>
);

// Circular DUE / PAID Rubber Seal Stamp matching invoice reference image
const DuePaidStamp: React.FC<{ isPaid: boolean }> = ({ isPaid }) => {
  const color = isPaid ? '#15803d' : '#b91c1c';
  const label = isPaid ? 'PAID' : 'DUE';

  return (
    <div className="select-none pointer-events-none transform -rotate-6 inline-block">
      <svg width="105" height="105" viewBox="0 0 120 120">
        <defs>
          <path id="topCurve" d="M 18,60 A 42,42 0 0,1 102,60" fill="none" />
          <path id="bottomCurve" d="M 102,60 A 42,42 0 0,1 18,60" fill="none" />
        </defs>
        {/* Outer dashed circle */}
        <circle cx="60" cy="60" r="56" fill="none" stroke={color} strokeWidth="3" strokeDasharray="3 2" opacity="0.85" />
        <circle cx="60" cy="60" r="51" fill="none" stroke={color} strokeWidth="1.8" />
        <circle cx="60" cy="60" r="33" fill="none" stroke={color} strokeWidth="1.2" />

        {/* Curved text */}
        <text fontSize="8.5" fontWeight="bold" fill={color} letterSpacing="0.8">
          <textPath href="#topCurve" startOffset="50%" textAnchor="middle">
            Noor Tiles &amp; Fittings
          </textPath>
        </text>
        <text fontSize="8" fontWeight="bold" fill={color} letterSpacing="1">
          <textPath href="#bottomCurve" startOffset="50%" textAnchor="middle">
            ★ Thank You ★
          </textPath>
        </text>

        {/* Center Mini House */}
        <polygon points="60,37 46,47 74,47" fill="none" stroke={color} strokeWidth="1.5" />
        
        {/* Center Banner */}
        <rect x="25" y="49" width="70" height="22" rx="3" fill={color} />
        <text x="60" y="65" textAnchor="middle" fontSize="15" fontWeight="900" fill="#ffffff" fontFamily="sans-serif" letterSpacing="1.5">
          {label}
        </text>
      </svg>
    </div>
  );
};

// Formats dimensions like "10x16" into "10.00 X 16.00"
const formatDimension = (dim?: string): string => {
  if (!dim || dim === '—') return '';
  const match = dim.match(/^(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const w = parseFloat(match[1]).toFixed(2);
    const h = parseFloat(match[2]).toFixed(2);
    return `${w} X ${h}`;
  }
  return dim;
};

// Formats sales date and time e.g. "10/11/2026 08:14:53 PM"
const formatSalesDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${day}/${month}/${year}  ${strHours}:${minutes}:${seconds} ${ampm}`;
};

// Formats currency with commas and 2 decimals
const formatAmountCommas = (val: number): string => {
  return (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PrintModal: React.FC<PrintModalProps> = ({
  type,
  invoice,
  payment,
  deliveryChallan,
  stockInRecord,
  reportData,
  shop,
  onClose,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);
  const [printNotice, setPrintNotice] = useState<string>('');

  const getDocTitle = () => {
    return type === 'invoice'
      ? `Invoice_${invoice?.no || ''}`
      : type === 'challan'
      ? `Challan_${invoice?.no || ''}`
      : type === 'delivery_challan'
      ? `DeliveryChallan_${deliveryChallan?.challanNo || ''}`
      : type === 'stock_in'
      ? `StockIn_${stockInRecord?.id || ''}`
      : type === 'receipt'
      ? `MoneyReceipt_${payment?.id || ''}`
      : `Report_${reportData?.title?.replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_') || 'Print'}`;
  };

  // Reliable print method for modern browsers and iframes
  const handlePrint = () => {
    if (!printableRef.current) return;
    const { filename } = printHtmlContent(printableRef.current.innerHTML, getDocTitle());
    setPrintNotice(`🖨️ প্রিন্ট ফাইলটি (${filename}) ডাউনলোড সম্পন্ন হয়েছে! ফাইলটিতে ক্লিক করলেই সরাসরি প্রিন্ট ও PDF উইন্ডো চলে আসবে।`);
  };

  // Direct download standalone HTML / PDF printable file
  const handleDownloadDocument = () => {
    if (!printableRef.current) return;
    const filename = downloadHtmlFile(printableRef.current.innerHTML, getDocTitle());
    setPrintNotice(`📥 ফাইলটি (${filename}) ডাউনলোড হয়েছে। অফলাইনে প্রিন্ট করতে পারবেন।`);
  };

  const totals = invoice ? StorageService.getInvoiceTotals(invoice) : null;
  const isPaid = totals ? totals.due <= 0 && totals.net > 0 : false;

  // If type is delivery_challan or challan for a specific invoice, find split delivery info
  const deliveryStatus = invoice ? StorageService.getInvoiceDeliveryStatus(invoice.no) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex flex-col bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[96vh] overflow-hidden border border-slate-300">
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white border-b border-slate-700">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">
              {type === 'invoice' && `বিক্রয় চালান / ইনভয়েস প্রিভিউ (Invoice #${invoice?.no})`}
              {type === 'challan' && `ডেলিভারি চালান প্রিভিউ (Challan #${invoice?.no})`}
              {type === 'delivery_challan' && `ডেলিভারি ট্রিপ চালান (${deliveryChallan?.challanNo})`}
              {type === 'stock_in' && `স্টক ইন / ভেন্ডর চালান রিসিট (#${stockInRecord?.id})`}
              {type === 'receipt' && `টাকা জমার রশিদ প্রিভিউ (Money Receipt #${payment?.id})`}
              {type === 'report' && `রিপোর্ট প্রিন্ট প্রিভিউ (${reportData?.title})`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="সরাসরি প্রিন্ট বা ব্রাউজার Save as PDF করুন"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer shadow-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট বা PDF ডাউনলোড (Print / PDF)
            </button>
            <button
              onClick={handleDownloadDocument}
              title="ডকুমেন্ট ফাইল আকারে অফলাইনে ডাউনলোড করুন"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold cursor-pointer shadow-sm transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              ডাউনলোড (Download)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action feedback banner */}
        {printNotice && (
          <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-emerald-800 shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{printNotice}</span>
            </div>
            <button
              onClick={() => setPrintNotice('')}
              className="text-emerald-200 hover:text-white font-bold ml-3 text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-emerald-800"
            >
              ✕ বন্ধ করুন
            </button>
          </div>
        )}

        {/* Printable Paper Canvas */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-200 flex justify-center flex-1">
          <div
            ref={printableRef}
            id="printable-area"
            className="bg-white p-6 sm:p-8 w-full max-w-[800px] min-h-[950px] shadow-md border border-slate-300 text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
            style={{ fontFamily: "'Hind Siliguri', 'Nirmala UI', sans-serif" }}
          >
            {/* Header with Shop Details for non-invoice/challan/report types */}
            {type !== 'report' && type !== 'invoice' && type !== 'challan' && (
              <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center relative">
                {shop.logoUrl && (
                  <img
                    src={shop.logoUrl}
                    alt="Shop Logo"
                    className="absolute left-0 top-0 h-16 w-16 object-contain rounded"
                  />
                )}
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 leading-snug">
                  {shop.name || 'NOOR TILES & FITTINGS'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-700 mt-0.5 font-medium">{shop.address}</p>
                <p className="text-xs text-slate-600 font-medium">মোবাইল: {shop.phones}</p>
                {shop.web && <p className="text-xs text-slate-500">{shop.web}</p>}
              </div>
            )}

            {/* ========== EXACT INVOICE & CHALLAN VIEW (Matching c_report and report images) ========== */}
            {(type === 'invoice' || type === 'challan') && invoice && totals && (
              <div>
                {/* 1. Header with NTT Logo on Left and Centered Shop Info */}
                <div className="flex items-center justify-between pb-1">
                  <NttLogo />
                  <div className="text-center grow pr-16">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase" style={{ letterSpacing: '0.5px' }}>
                      {shop.name || 'NOOR TILES & FITTINGS'}
                    </h1>
                    <p className="text-xs text-slate-800 font-medium mt-0.5">
                      {shop.address || 'Abu Taher Plaza, Puniout Bypass, Brahmanbaria'}
                    </p>
                    <p className="text-xs text-slate-800 font-medium">
                      {shop.phones || '01748-293 800 (BKash) , 01996-701 702 , 01996-701 707'}
                    </p>
                    <p className="text-[11px] text-slate-700">
                      {shop.web || 'Web : http://noortiles.wordpress.com, Gmail : tilesnoor@gmail.com'}
                    </p>
                  </div>
                </div>

                {/* Horizontal dividing line */}
                <hr className="border-t border-slate-900 my-2" />

                {/* 2. Metadata Section (Customer Underlined Lines on Left, Teal Outline Doc Title on Right) */}
                <div className="flex justify-between items-start gap-4 mb-3 text-xs">
                  {/* Left: 4 underlined lines */}
                  <div className="grow space-y-1.5 pr-4">
                    <div className="flex border-b border-slate-900 pb-0.5">
                      <span className="font-bold shrink-0 w-28 text-slate-900">To Customer :</span>
                      <span className="font-semibold text-slate-950 uppercase">{invoice.custName}</span>
                    </div>
                    <div className="flex border-b border-slate-900 pb-0.5">
                      <span className="font-bold shrink-0 w-28 text-slate-900">Address :</span>
                      <span className="text-slate-800">{invoice.address || ''}</span>
                    </div>
                    <div className="flex border-b border-slate-900 pb-0.5">
                      <span className="font-bold shrink-0 w-28 text-slate-900">Contact No :</span>
                      <span className="font-mono text-slate-800">{invoice.phone || ''}</span>
                    </div>
                    <div className="flex border-b border-slate-900 pb-0.5">
                      <span className="font-bold shrink-0 w-28 text-slate-900">Coustomer Deal :</span>
                      <span className="text-slate-800">
                        {invoice.deal ? `${invoice.deal} (যে কোনো প্রয়োজনে)` : '(যে কোনো প্রয়োজনে)'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Large Teal Hollow Outline Title + Invoice Metadata */}
                  <div className="shrink-0 w-60 text-right flex flex-col items-end">
                    <div className="mb-1">
                      <svg width="180" height="38" viewBox="0 0 180 38">
                        <text
                          x="100%"
                          y="29"
                          textAnchor="end"
                          fill="none"
                          stroke="#457b7d"
                          strokeWidth="1.8"
                          fontFamily="Arial, sans-serif"
                          fontSize="31"
                          fontWeight="800"
                          letterSpacing="2"
                        >
                          {type === 'challan' ? 'CHALLAN' : 'INVOICE'}
                        </text>
                      </svg>
                    </div>
                    <div className="text-xs space-y-0.5 text-slate-900">
                      <div>
                        <span className="font-bold">Invoice No: </span>
                        <span className="font-mono font-semibold ml-2">{invoice.no}</span>
                      </div>
                      <div>
                        <span className="font-bold">Sales Date : </span>
                        <span className="font-mono text-[11px] ml-2">{formatSalesDateTime(invoice.date)}</span>
                      </div>
                      <div>
                        <span className="font-bold">Customer id : </span>
                        <span className="font-mono font-semibold ml-2">{invoice.custId || '4216428'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Items Table */}
                {type === 'challan' ? (
                  /* ================= CHALLAN TABLE (Matching c_report_d768e5b1.jpg) ================= */
                  <div className="mb-4">
                    <table className="w-full text-xs border-collapse border border-slate-900">
                      <thead>
                        <tr className="border border-slate-900 bg-white text-slate-900 font-bold">
                          <th rowSpan={2} className="border border-slate-900 px-1 py-1 text-center w-8">SL</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center">Product Name</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-24">Dimension</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-16">Sft</th>
                          <th colSpan={2} className="border border-slate-900 px-1 py-0.5 text-center">Delivery note</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-14">Remark</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-14">Remark</th>
                        </tr>
                        <tr className="border border-slate-900 bg-white text-slate-900 font-bold">
                          <th className="border border-slate-900 px-1 py-0.5 text-center w-12">Box</th>
                          <th className="border border-slate-900 px-1 py-0.5 text-center w-12">Piece</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((it, idx) => (
                          <tr key={idx} className="border-b border-slate-900">
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{idx + 1}</td>
                            <td className="border border-slate-900 px-2 py-1 font-medium italic">{it.name}</td>
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{formatDimension(it.dim)}</td>
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic font-semibold text-blue-600" style={{ color: '#2563eb' }}>
                              {(it.isTile ? it.sft : it.piece).toFixed(2)}
                            </td>
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{it.box || 0}</td>
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{it.piece || 0}</td>
                            <td className="border border-slate-900 px-1 py-1 text-center"></td>
                            <td className="border border-slate-900 px-1 py-1 text-center"></td>
                          </tr>
                        ))}
                        {/* Total row matching c_report image */}
                        <tr className="border-t-2 border-slate-900 font-bold">
                          <td colSpan={3} className="text-right px-2 py-1 border border-slate-900">
                            Total =
                          </td>
                          <td className="text-center px-1 py-1 border border-slate-900 font-mono italic font-bold text-blue-600" style={{ color: '#2563eb' }}>
                            {invoice.items.reduce((s, i) => s + (i.isTile ? i.sft : i.piece), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-center px-1 py-1 border border-slate-900 font-mono italic">
                            {invoice.items.reduce((s, i) => s + (i.box || 0), 0)}
                          </td>
                          <td className="text-center px-1 py-1 border border-slate-900 font-mono italic">
                            {invoice.items.reduce((s, i) => s + (i.piece || 0), 0)}
                          </td>
                          <td className="border border-slate-900"></td>
                          <td className="border border-slate-900"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* ================= INVOICE TABLE (Matching report_e9e943c0.jpg) ================= */
                  <div className="mb-3">
                    <table className="w-full text-xs border-collapse border border-slate-900">
                      <thead>
                        <tr className="border border-slate-900 bg-white text-slate-900 font-bold">
                          <th rowSpan={2} className="border border-slate-900 px-1 py-1 text-center w-8">SL</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center">Product Name</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-24">Dimension</th>
                          <th colSpan={2} className="border border-slate-900 px-1 py-0.5 text-center">Delivery note</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-14">Sft</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-18">Unit Price</th>
                          <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center w-22">Line Total</th>
                        </tr>
                        <tr className="border border-slate-900 bg-white text-slate-900 font-bold">
                          <th className="border border-slate-900 px-1 py-0.5 text-center w-12">Box</th>
                          <th className="border border-slate-900 px-1 py-0.5 text-center w-12">Piece</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((it, idx) => (
                          <tr key={idx} className="border-b border-slate-900">
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{idx + 1}</td>
                            <td className="border border-slate-900 px-2 py-1 font-medium italic">{it.name}</td>
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{formatDimension(it.dim)}</td>
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{it.box || 0}</td>
                            <td className="border border-slate-900 px-1 py-1 text-center font-mono italic">{it.piece || 0}</td>
                            <td className="border border-slate-900 px-1 py-1 text-right font-mono italic">
                              {(it.isTile ? it.sft : it.piece).toFixed(2)}
                            </td>
                            <td className="border border-slate-900 px-1 py-1 text-right font-mono italic">
                              {it.unit.toFixed(2)}
                            </td>
                            <td className="border border-slate-900 px-1 py-1 text-right font-mono italic">
                              {it.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. Bottom Section for Invoice: Memo, Inword, Warning, Rubber Stamp & Calculation Box */}
                {type === 'invoice' && (
                  <div className="flex justify-between items-start gap-4 mt-2">
                    {/* Left: Boxed memo, Inword, Special notice, Rubber Stamp */}
                    <div className="w-[58%] flex flex-col justify-between min-h-[220px]">
                      <div>
                        {/* Memo box */}
                        <div className="border border-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 mb-3 w-full">
                          {invoice.comment ? invoice.comment : `দোকান বাকি # ${invoice.no}`}
                        </div>

                        {/* Inword */}
                        <div className="text-xs mb-3">
                          <div className="font-bold text-slate-900">Inword</div>
                          <div className="font-semibold text-slate-800 italic uppercase">
                            {totals.paid > 0 ? `${inWords(totals.paid)} ONLY` : 'ONLY'}
                          </div>
                        </div>

                        {/* Special Bengali Notice */}
                        <div className="text-xs text-slate-900 leading-snug font-medium mb-3">
                          <div className="font-bold">বিশেষ দ্র:</div>
                          <div>চায়না, ভেজা, সিমেন্ট লাগানো টাইলস</div>
                          <div>ফেরত যোগ্য নয়। অবশ্যই ২ মাসের</div>
                          <div>ভিতর টাইলস ফেরত দিতে হবে।</div>
                        </div>
                      </div>

                      {/* Rubber Stamp (DUE or PAID) */}
                      <div className="self-end mr-6 -mt-16">
                        <DuePaidStamp isPaid={isPaid} />
                      </div>
                    </div>

                    {/* Right: Bordered Calculation Box */}
                    <div className="w-[38%] border border-slate-900 p-2.5 text-xs font-mono">
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-900">
                          <span className="font-bold">Total :</span>
                          <span className="font-bold">{formatAmountCommas(totals.lineSum)}</span>
                        </div>
                        <div className="flex justify-between text-slate-800">
                          <span className="font-bold">Labor Cost :</span>
                          <span>{formatAmountCommas(invoice.labor || 0)}</span>
                        </div>

                        <div className="border-t border-slate-900 pt-1 flex justify-between text-slate-900">
                          <span className="font-bold">Sub Total :</span>
                          <span className="font-semibold">{formatAmountCommas(totals.sub1)}</span>
                        </div>

                        <div className="flex justify-between text-slate-800">
                          <span className="font-bold">Discount :</span>
                          <span>{formatAmountCommas(invoice.discount || 0)}</span>
                        </div>

                        <div className="border-t border-slate-900 pt-1 flex justify-between text-slate-900">
                          <span className="font-bold">Sub Total :</span>
                          <span className="font-semibold">{formatAmountCommas(totals.sub2)}</span>
                        </div>

                        <div className="flex justify-between text-slate-800">
                          <span className="font-bold">Previous Due :</span>
                          <span>{formatAmountCommas(invoice.prevDue || 0)}</span>
                        </div>

                        <div className="border-t border-slate-900 pt-1 flex justify-between text-slate-900">
                          <span className="font-bold">Net Payable :</span>
                          <span className="font-bold">{formatAmountCommas(totals.net)}</span>
                        </div>

                        <div className="flex justify-between text-slate-800">
                          <span className="font-bold">: </span>
                          <span>{formatAmountCommas(invoice.cash + invoice.bank + invoice.bkash)}</span>
                        </div>

                        <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between text-sm font-black text-slate-950">
                          <span>Due :</span>
                          <span>{formatAmountCommas(totals.due)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Four Dotted Signature Lines at Bottom */}
                <div className="grid grid-cols-4 gap-4 mt-20 pt-4 text-center text-xs font-medium text-slate-900">
                  <div>
                    <div className="border-b border-dotted border-slate-900 mb-1 mx-2"></div>
                    <span className="capitalize">{type === 'invoice' ? 'customer signature' : 'Customer Signature'}</span>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] font-bold text-slate-900 mb-0.5">
                      {shop.preparedBy ? (shop.preparedBy.startsWith('#') ? shop.preparedBy : `#${shop.preparedBy}#`) : '#AnayeT#'}
                    </div>
                    <div className="border-b border-dotted border-slate-900 mb-1 mx-2"></div>
                    <span>Prepared by</span>
                  </div>
                  <div>
                    <div className="border-b border-dotted border-slate-900 mb-1 mx-2"></div>
                    <span>Store incharge</span>
                  </div>
                  <div>
                    <div className="border-b border-dotted border-slate-900 mb-1 mx-2"></div>
                    <span>Authorised by</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========== SPECIFIC SPLIT DELIVERY CHALLAN (ডেলিভারি ট্রিপ চালান) ========== */}
            {type === 'delivery_challan' && deliveryChallan && (
              <div>
                <div className="flex justify-between items-start gap-4 mb-4 text-xs">
                  <div className="space-y-1 border border-slate-300 rounded p-2.5 w-1/2 bg-slate-50/50">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      মাল ডেলিভারি গ্রহীতা (Delivery To)
                    </p>
                    <p className="font-bold text-slate-900 text-sm">{deliveryChallan.custName}</p>
                    <p className="text-slate-700">ঠিকানা: {deliveryChallan.address || '—'}</p>
                    <p className="text-slate-700">মোবাইল: {deliveryChallan.phone || '—'}</p>
                    {deliveryChallan.deal && (
                      <p className="text-slate-800 font-semibold bg-amber-50 px-1 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                        Cust. Deal: {deliveryChallan.deal}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 border border-slate-300 rounded p-2.5 w-1/2 text-right bg-slate-50/50">
                    <div className="inline-block bg-emerald-800 text-white font-bold text-base px-3 py-0.5 rounded uppercase tracking-wider">
                      DELIVERY SLIP (ডেলিভারি চালান)
                    </div>
                    <p className="font-semibold text-slate-800">
                      Challan No: <span className="font-mono font-bold text-base text-emerald-900">{deliveryChallan.challanNo}</span>
                    </p>
                    <p className="text-slate-700">
                      Invoice Ref: <span className="font-mono font-bold">#{deliveryChallan.invoiceNo}</span>
                    </p>
                    <p className="text-slate-600 font-medium">
                      ডেলিভারি তারিখ: {formatDateTimeBangla(deliveryChallan.date)}
                    </p>
                    {deliveryChallan.vehicleNo && (
                      <p className="text-slate-700 font-semibold">
                        গাড়ি নং: {deliveryChallan.vehicleNo}
                      </p>
                    )}
                    {deliveryChallan.driverName && (
                      <p className="text-slate-600">
                        ড্রাইভার: {deliveryChallan.driverName} {deliveryChallan.driverPhone ? `(${deliveryChallan.driverPhone})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items in this specific delivery */}
                <h4 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-700" />
                  বর্তমান ট্রিপে পাঠানো মালের বিবরণ (Items Dispatched in this Trip):
                </h4>
                <table className="w-full text-xs border-collapse border border-slate-400 mb-4">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-400 font-bold">
                      <th className="border border-slate-400 p-1.5 w-8 text-center">SL</th>
                      <th className="border border-slate-400 p-1.5 text-left">পণ্যের বিবরণ (Product)</th>
                      <th className="border border-slate-400 p-1.5 text-center w-20">মাপ (Dim)</th>
                      <th className="border border-slate-400 p-1.5 text-center w-16">বক্স (Box)</th>
                      <th className="border border-slate-400 p-1.5 text-center w-16">পিস (Piece)</th>
                      <th className="border border-slate-400 p-1.5 text-right w-20">মোট SFT</th>
                      <th className="border border-slate-400 p-1.5 text-center w-24">মন্তব্য</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryChallan.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-medium">{it.name}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px]">{it.dim}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-emerald-800">
                          {formatQty(it.box)}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-emerald-800">
                          {formatQty(it.piece)}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">
                          {(it.isTile ? it.sft : it.piece).toFixed(2)}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-400 italic"></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={3} className="border border-slate-400 p-1.5 text-right">
                        বর্তমান চালানে মোট =
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center font-mono">
                        {formatQty(deliveryChallan.items.reduce((s, i) => s + (i.box || 0), 0))}
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center font-mono">
                        {formatQty(deliveryChallan.items.reduce((s, i) => s + (i.piece || 0), 0))}
                      </td>
                      <td className="border border-slate-400 p-1.5 text-right font-mono">
                        {deliveryChallan.items
                          .reduce((s, i) => s + (i.isTile ? i.sft : i.piece), 0)
                          .toFixed(2)}
                      </td>
                      <td className="border border-slate-400 p-1.5"></td>
                    </tr>
                  </tbody>
                </table>

                {deliveryChallan.note && (
                  <div className="border border-slate-300 rounded p-2 text-xs bg-slate-50 mb-4">
                    <span className="font-bold text-slate-700">ডেলিভারি নোট: </span>
                    <span className="text-slate-800">{deliveryChallan.note}</span>
                  </div>
                )}

                <div className="border border-slate-300 rounded p-2 text-[10px] text-slate-600 bg-amber-50/40 mb-10 whitespace-pre-line">
                  {shop.note}
                </div>

                {/* 4 Signatures */}
                <div className="grid grid-cols-4 gap-4 mt-16 pt-3 text-center text-xs font-semibold text-slate-700">
                  <div className="border-t border-dashed border-slate-400 pt-1.5">
                    মাল বুঝিয়া পাইলাম (গ্রহীতা)
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1.5">
                    ডেলিভারিম্যান / ড্রাইভার
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1.5">
                    স্টোর ইনচার্জ
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1.5">
                    অনুমোদিত স্বাক্ষর
                  </div>
                </div>
              </div>
            )}

            {/* ========== STOCK IN / VENDOR PURCHASE RECEIPT ========== */}
            {type === 'stock_in' && stockInRecord && (
              <div>
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-800 inline-block px-4 pb-1">
                    STOCK IN / VENDOR PURCHASE RECEIPT (স্টক ইন রশিদ)
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs border border-slate-300 rounded p-3 bg-slate-50/50">
                  <div>
                    <span className="text-slate-500 block">ভেন্ডর / সরবরাহকারী:</span>
                    <span className="font-bold text-slate-900 text-sm">{stockInRecord.vendorName}</span>
                    <p className="text-slate-600 mt-1">ভেন্ডর চালান নং: <strong className="font-mono text-slate-800">{stockInRecord.vendorChallanNo || '—'}</strong></p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-600">রেফারেন্স / PO: <strong className="font-mono text-slate-900">{stockInRecord.referenceNo || '—'}</strong></p>
                    <p className="text-slate-600">তারিখ: <strong className="font-mono">{formatDateTimeBangla(stockInRecord.date)}</strong></p>
                    <p className="text-slate-600">রিসিভ করেছেন: <strong>{stockInRecord.receivedBy}</strong></p>
                  </div>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-400 mb-4">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <th className="border border-slate-400 p-1.5 text-center w-8">SL</th>
                      <th className="border border-slate-400 p-1.5 text-left">পণ্য (Product)</th>
                      <th className="border border-slate-400 p-1.5 text-center w-20">মাপ (Dim)</th>
                      <th className="border border-slate-400 p-1.5 text-center w-14">Box</th>
                      <th className="border border-slate-400 p-1.5 text-center w-14">Piece</th>
                      <th className="border border-slate-400 p-1.5 text-right w-16">SFT</th>
                      <th className="border border-slate-400 p-1.5 text-right w-20">ক্রয় দর</th>
                      <th className="border border-slate-400 p-1.5 text-right w-24">মোট মূল্য</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockInRecord.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-medium">{it.name}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px]">{it.dim}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{formatQty(it.box)}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{formatQty(it.piece)}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">{(it.isTile ? it.sft : it.piece).toFixed(2)}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">{formatMoney(it.rate)}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{formatMoney(it.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={3} className="border border-slate-400 p-1.5 text-right">সর্বমোট =</td>
                      <td className="border border-slate-400 p-1.5 text-center font-mono">{formatQty(stockInRecord.items.reduce((s, i) => s + (i.box || 0), 0))}</td>
                      <td className="border border-slate-400 p-1.5 text-center font-mono">{formatQty(stockInRecord.items.reduce((s, i) => s + (i.piece || 0), 0))}</td>
                      <td className="border border-slate-400 p-1.5 text-right font-mono">{stockInRecord.items.reduce((s, i) => s + (i.isTile ? i.sft : i.piece), 0).toFixed(2)}</td>
                      <td className="border border-slate-400 p-1.5"></td>
                      <td className="border border-slate-400 p-1.5 text-right font-mono font-bold text-emerald-900">৳ {formatMoney(stockInRecord.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>

                {stockInRecord.note && (
                  <div className="border border-slate-300 rounded p-2 text-xs bg-slate-50 mb-6">
                    <span className="font-bold text-slate-700">নোট: </span>
                    <span className="text-slate-800">{stockInRecord.note}</span>
                  </div>
                )}

                <div className="flex justify-between mt-16 pt-3 text-xs font-semibold text-slate-700">
                  <div className="border-t border-dashed border-slate-400 w-44 text-center pt-1.5">
                    রিসিভ করেছেন (Store Incharge)
                  </div>
                  <div className="border-t border-dashed border-slate-400 w-44 text-center pt-1.5">
                    অনুমোদিত স্বাক্ষর (Authorised)
                  </div>
                </div>
              </div>
            )}

            {/* ========== MONEY RECEIPT ========== */}
            {type === 'receipt' && payment && (
              <div className="max-w-xl mx-auto py-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-800 inline-block px-4 pb-1">
                    MONEY RECEIPT (টাকা জমার রশিদ)
                  </h2>
                </div>

                <div className="border border-slate-300 rounded-lg p-5 bg-slate-50/50 space-y-3.5 text-sm font-medium">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Receipt No:</span>
                    <span className="font-mono font-bold text-slate-900 text-base">#{payment.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">তারিখ ও সময়:</span>
                    <span className="font-semibold text-slate-800">{formatDateTimeBangla(payment.date)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">গ্রাহকের নাম:</span>
                    <span className="font-bold text-slate-900 text-base">{payment.custName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">জমার মাধ্যম:</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      {payment.method}
                    </span>
                  </div>
                  <div className="flex justify-between border-b-2 border-slate-400 pb-2 text-base">
                    <span className="text-slate-800 font-bold">প্রাপ্ত টাকা (Received Amount):</span>
                    <span className="font-mono font-bold text-emerald-800 text-lg">
                      ৳ {formatMoney(payment.amount)}
                    </span>
                  </div>
                  <div className="border-b border-slate-200 pb-2 text-xs">
                    <span className="text-slate-600 block mb-0.5">কথায় (In Word):</span>
                    <span className="font-semibold text-slate-800 italic">{inWords(payment.amount)}</span>
                  </div>
                  {payment.remark && (
                    <div className="border-b border-slate-200 pb-2 text-xs">
                      <span className="text-slate-600">মন্তব্য: </span>
                      <span className="text-slate-800">{payment.remark}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="text-rose-700 font-semibold">বর্তমান অবশিষ্ট বাকি (Current Balance):</span>
                    <span className="font-mono font-bold text-rose-800">
                      ৳ {formatMoney(StorageService.getCustomerBalance(payment.custId))}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between mt-16 pt-4 text-xs font-semibold text-slate-700">
                  <div className="border-t border-dashed border-slate-400 w-44 text-center pt-1.5">
                    Customer Signature
                  </div>
                  <div className="border-t border-dashed border-slate-400 w-44 text-center pt-1.5">
                    Authorised Signature
                  </div>
                </div>
              </div>
            )}

            {/* ========== REPORT PRINT VIEW ========== */}
            {type === 'report' && reportData && (
              <div>
                {/* 1. CUSTOMER TRANSACTION DETAIL PRINT (Matching transaction.jpg) */}
                {reportData.reportType === 'customer_transaction' ? (
                  <div>
                    <div className="text-center pb-2">
                      <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">{shop.name}</h1>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">{shop.address}</p>
                      <p className="text-xs font-semibold text-slate-700">{shop.phones}</p>

                      <div className="my-3 flex justify-center">
                        <div className="border border-slate-900 px-6 py-1 text-sm font-bold text-slate-900">
                          ক্রেতা (Customer) Transaction Detail
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-900 mb-2 font-mono">
                      {reportData.customerHeader}
                    </div>

                    {reportData.blocks.map((block, bIdx) => (
                      <div key={bIdx} className="mb-4">
                        <table className="w-full text-xs border-collapse border border-slate-900">
                          <thead className="bg-white text-slate-900 font-bold border-b border-slate-900">
                            <tr>
                              {block.heads.map((h, hIdx) => (
                                <th
                                  key={hIdx}
                                  className={`border border-slate-900 p-1.5 ${
                                    h === 'SL'
                                      ? 'text-center w-10'
                                      : h === 'Debit' || h === 'Credit'
                                      ? 'text-right'
                                      : 'text-left'
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-400">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`border border-slate-400 p-1.5 ${
                                      cIdx === 0
                                        ? 'text-center font-mono w-10'
                                        : cIdx === 5 || cIdx === 6
                                        ? 'text-right font-mono'
                                        : 'text-left'
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Right Bottom Summary matching transaction.jpg */}
                    {reportData.totalsRight && (
                      <div className="flex justify-end mt-4">
                        <div className="w-64 font-mono text-xs">
                          <div className="flex justify-between py-1 font-bold text-slate-800">
                            <span>সর্বমোট ডে.</span>
                            <span>{reportData.totalsRight.debit}</span>
                          </div>
                          <div className="flex justify-between py-1 font-bold text-slate-800">
                            <span>সর্বমোট ক্রে.</span>
                            <span>{reportData.totalsRight.credit}</span>
                          </div>
                          <div className="border-t border-slate-900 my-1"></div>
                          <div className="flex justify-between py-1 font-black text-sm text-red-600">
                            <span>মোট বকেয়া</span>
                            <span>{reportData.totalsRight.due}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : reportData.reportType === 'stock_report' ? (
                  /* 2. STOCK REPORT PRINT (Matching stock report.jpg) */
                  <div>
                    <div className="text-center pb-1">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{shop.name}</h1>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">{shop.address}</p>
                      <h2 className="text-base font-bold text-slate-900 mt-2">{reportData.supplierName}</h2>
                      <p className="text-xs text-slate-600">Stock Date: {reportData.stockDate}</p>
                    </div>

                    <div className="flex justify-end text-[11px] text-slate-700 font-mono mb-1">
                      | Print Date : {reportData.printDate}
                    </div>

                    {reportData.blocks.map((block, bIdx) => (
                      <div key={bIdx} className="mb-4">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-800 text-slate-900 font-bold text-left">
                              {block.heads.map((h, hIdx) => (
                                <th
                                  key={hIdx}
                                  className={`py-1.5 px-2 ${
                                    h === 'GradeName'
                                      ? 'text-center'
                                      : h === 'Closing Cartoon|Pcs' || h === 'Stock(Sft)'
                                      ? 'text-left'
                                      : 'text-left'
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {block.rows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`py-1.5 px-2 ${
                                      cIdx === 0
                                        ? 'text-left font-mono font-medium text-slate-800'
                                        : cIdx === 3
                                        ? 'text-center font-bold text-slate-800'
                                        : 'text-left'
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {block.total && (
                              <tr className="font-bold border-t-2 border-slate-800 bg-slate-50">
                                {block.total.map((tCell, tIdx) => (
                                  <td
                                    key={tIdx}
                                    className={`py-1.5 px-2 ${tIdx === 3 ? 'text-center' : 'text-left'}`}
                                  >
                                    {tCell}
                                  </td>
                                ))}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Stock Summary Box */}
                    {reportData.summary && (
                      <div className="flex justify-end mt-4">
                        <div className="w-80 border border-slate-400 rounded p-2.5 bg-slate-50 text-xs font-mono space-y-1">
                          {reportData.summary.map(([label, val], sIdx) => (
                            <div key={sIdx} className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="font-medium text-slate-600">{label}:</span>
                              <span className="font-bold text-slate-900">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 3. STANDARD REPORT VIEW */
                  <div>
                    <div className="text-center mb-4">
                      <h2 className="text-xl font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-700 inline-block px-4 pb-1">
                        {reportData.title}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 font-semibold">{reportData.period}</p>
                    </div>

                    {reportData.info && reportData.info.length > 0 && (
                      <div className="mb-3 text-xs font-semibold text-slate-800 space-y-0.5 bg-slate-50 p-2 rounded border border-slate-200">
                        {reportData.info.map((inf, i) => (
                          <p key={i}>{inf}</p>
                        ))}
                      </div>
                    )}

                    {/* Report Data Blocks */}
                    {reportData.blocks.map((block, bIdx) => (
                      <div key={bIdx} className="mb-6">
                        {block.caption && (
                          <h3 className="text-sm font-bold text-slate-800 bg-slate-200 px-2 py-1 rounded-t border-t border-x border-slate-300 inline-block">
                            {block.caption}
                          </h3>
                        )}
                        <table className="w-full text-xs border-collapse border border-slate-400">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-400">
                              {block.heads.map((h, hIdx) => (
                                <th key={hIdx} className="border border-slate-400 p-1.5 text-center">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-300">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`border border-slate-300 p-1.5 ${
                                      cIdx === 0
                                        ? 'text-center font-mono w-10'
                                        : cIdx >= row.length - 2
                                        ? 'text-right font-mono font-medium'
                                        : 'text-left'
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {block.total && (
                              <tr className="bg-slate-100 font-bold border-t-2 border-slate-500">
                                {block.total.map((tCell, tIdx) => (
                                  <td
                                    key={tIdx}
                                    className={`border border-slate-400 p-1.5 ${
                                      tIdx >= block.total!.length - 2 ? 'text-right font-mono' : 'text-left'
                                    }`}
                                  >
                                    {tCell}
                                  </td>
                                ))}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Summary Box */}
                    {reportData.summary && reportData.summary.length > 0 && (
                      <div className="flex justify-end mt-4">
                        <div className="w-72 border-2 border-slate-700 rounded p-3 bg-slate-50 text-xs font-mono space-y-1.5 shadow-sm">
                          {reportData.summary.map(([label, val], sIdx) => (
                            <div key={sIdx} className="flex justify-between border-b border-slate-200 pb-1">
                              <span className="font-semibold text-slate-700">{label}:</span>
                              <span className="font-bold text-slate-900">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
