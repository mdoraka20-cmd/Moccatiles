import React, { useState, useMemo } from 'react';
import { Customer, Payment } from '../types';
import { StorageService } from '../services/storage';
import { formatMoney, parseNum, getTodayLocalDateStr, getNowLocalTimeStr } from '../utils/numberWords';
import { Receipt, Search, Printer, Trash2, Check, RotateCcw, X } from 'lucide-react';

interface PayReceiptViewProps {
  customers: Customer[];
  payments: Payment[];
  onSavePayment: (payment: Payment, print: boolean) => void;
  onDeletePayment: (id: number) => void;
  onReprintPayment: (p: Payment) => void;
  onOpenCustomerPicker: () => void;
  selectedCustomerFromPicker?: Customer | null;
  onClearCustomerPicker: () => void;
  currentUser?: any;
  onRequireAdminAuth?: (actionTitle: string, onExecute: () => void, actionDetails?: string) => void;
}

export const PayReceiptView: React.FC<PayReceiptViewProps> = ({
  customers,
  payments,
  onSavePayment,
  onDeletePayment,
  onReprintPayment,
  onOpenCustomerPicker,
  selectedCustomerFromPicker,
  onClearCustomerPicker,
  currentUser,
  onRequireAdminAuth,
}) => {
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [payDate, setPayDate] = useState<string>(() => getTodayLocalDateStr());
  const [amount, setAmount] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [method, setMethod] = useState<'Cash' | 'Bank' | 'Bkash'>('Cash');
  const [remark, setRemark] = useState<string>('');
  const [selectedPay, setSelectedPay] = useState<Payment | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Payment history date range filter (defaults to current date so today's receipts appear automatically)
  const [filterDateFrom, setFilterDateFrom] = useState<string>(() => getTodayLocalDateStr());
  const [filterDateTo, setFilterDateTo] = useState<string>(() => getTodayLocalDateStr());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // If customer came from picker
  React.useEffect(() => {
    if (selectedCustomerFromPicker) {
      setSelectedCust(selectedCustomerFromPicker);
      onClearCustomerPicker();
    }
  }, [selectedCustomerFromPicker]);

  // Keep selectedCust and selectedPay synchronized with live updates/deletes
  React.useEffect(() => {
    if (selectedCust) {
      const live = customers.find((c) => c.id === selectedCust.id) || null;
      if (!live) setSelectedCust(null);
      else if (live !== selectedCust) setSelectedCust(live);
    }
  }, [customers, selectedCust]);

  React.useEffect(() => {
    if (selectedPay) {
      const live = payments.find((p) => p.id === selectedPay.id) || null;
      if (!live) setSelectedPay(null);
      else if (live !== selectedPay) setSelectedPay(live);
    }
  }, [payments, selectedPay]);

  const currentDue = selectedCust ? StorageService.getCustomerBalance(selectedCust.id) : 0;
  const enteredAmount = Math.max(0, parseNum(amount));
  const enteredDiscount = Math.max(0, parseNum(discount));
  const remainingDuePreview = currentDue - enteredAmount - enteredDiscount;

  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return payments.filter((p) => {
      const d = (p.date || '').trim().slice(0, 10);
      let inDateRange = true;
      if (filterDateFrom && filterDateTo) {
        const startD = filterDateFrom <= filterDateTo ? filterDateFrom : filterDateTo;
        const endD = filterDateFrom <= filterDateTo ? filterDateTo : filterDateFrom;
        inDateRange = d >= startD && d <= endD;
      } else if (filterDateFrom) {
        inDateRange = d >= filterDateFrom;
      } else if (filterDateTo) {
        inDateRange = d <= filterDateTo;
      }
      const matchesSearch =
        !q ||
        String(p.id).includes(q) ||
        p.custName.toLowerCase().includes(q) ||
        (p.method || '').toLowerCase().includes(q) ||
        (p.remark || '').toLowerCase().includes(q);
      return inDateRange && matchesSearch;
    });
  }, [payments, filterDateFrom, filterDateTo, searchQuery]);

  const filteredTotalAmount = useMemo(
    () => filteredPayments.reduce((s, p) => s + (p.amount || 0), 0),
    [filteredPayments]
  );

  const filteredTotalDiscount = useMemo(
    () => filteredPayments.reduce((s, p) => s + (p.discount || 0), 0),
    [filteredPayments]
  );

  const handleSave = (print: boolean) => {
    if (!selectedCust) {
      setStatusMsg({ text: 'গ্রাহক বাছাই করুন।', type: 'error' });
      return;
    }
    const amtVal = parseNum(amount);
    const discVal = parseNum(discount);
    if (amtVal < 0 || discVal < 0 || (amtVal <= 0 && discVal <= 0)) {
      setStatusMsg({ text: 'জমার সঠিক পরিমাণ অথবা ডিসকাউন্ট দিন।', type: 'error' });
      return;
    }

    const newPayment: Payment = {
      id: StorageService.nextPayId(),
      date: `${payDate} ${getNowLocalTimeStr()}`,
      custId: selectedCust.id,
      custName: selectedCust.name,
      amount: amtVal,
      discount: discVal > 0 ? discVal : 0,
      method,
      remark: remark.trim(),
    };

    onSavePayment(newPayment, print);
    setAmount('');
    setDiscount('');
    setRemark('');
    setStatusMsg({ text: `রশিদ #${newPayment.id} সফলভাবে সংরক্ষিত হয়েছে!`, type: 'success' });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 text-xs">
      {/* Form Card */}
      <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Receipt className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-sm text-slate-800">
            টাকা জমা ও মানি রিসিট (Pay Receipt Entry)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer select */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">গ্রাহক নির্বাচন (Customer) : *</label>
            <div className="flex gap-2">
              <select
                value={selectedCust ? selectedCust.id : ''}
                onChange={(e) => {
                  const match = customers.find((c) => c.id === Number(e.target.value));
                  setSelectedCust(match || null);
                }}
                className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium"
              >
                <option value="">-- গ্রাহক বাছুন --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || c.address})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onOpenCustomerPicker}
                title="গ্রাহক তালিকা থেকে বাছুন"
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shadow-xs"
              >
                ...
              </button>
            </div>
          </div>

          {/* Current balance display */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">বর্তমান বাকি (Current Due) :</label>
            <div className="bg-rose-50 border border-rose-300 rounded px-3 py-1.5 font-mono font-bold text-rose-800 text-sm">
              {selectedCust ? `৳ ${formatMoney(currentDue)}` : '—'}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">জমার তারিখ (Date) :</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
            />
          </div>

          {/* Amount, Discount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="block text-slate-700 font-semibold">জমার পরিমাণ (Amount ৳) : *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-emerald-800 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-semibold">ডিসকাউন্ট / ছাড় (Discount ৳) :</label>
              <input
                type="number"
                step="any"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-amber-300 rounded px-2.5 py-1.5 font-mono font-bold text-amber-800 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-semibold">মাধ্যম (Method) :</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800"
              >
                <option value="Cash">Cash (নগদ)</option>
                <option value="Bank">Bank (ব্যাংক)</option>
                <option value="Bkash">bKash (বিকাশ)</option>
              </select>
            </div>
          </div>

          {selectedCust && (enteredAmount > 0 || enteredDiscount > 0) && (
            <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-600">
                বর্তমান বাকি: <strong className="text-slate-900">৳ {formatMoney(currentDue)}</strong>
              </span>
              <span className="text-emerald-700">
                (-) জমা: <strong>৳ {formatMoney(enteredAmount)}</strong>
              </span>
              <span className="text-amber-700">
                (-) ডিসকাউন্ট: <strong>৳ {formatMoney(enteredDiscount)}</strong>
              </span>
              <span className="text-rose-800 font-bold">
                অবশিষ্ট বাকি: ৳ {formatMoney(remainingDuePreview)}
              </span>
            </div>
          )}

          {/* Remark */}
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-slate-700 font-semibold">মন্তব্য (Remark) :</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="জমার বিবরণ বা মন্তব্য"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
            />
          </div>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div
            className={`rounded px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between gap-2 border ${
              statusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button type="button" onClick={() => setStatusMsg(null)} className="cursor-pointer opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
          <button
            onClick={() => handleSave(false)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            জমা সংরক্ষণ (Save)
          </button>
          <button
            onClick={() => handleSave(true)}
            className="px-5 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Save + Print Receipt (রশিদসহ সংরক্ষণ)
          </button>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h4 className="font-bold text-slate-800 text-xs">
              টাকা জমার ইতিহাস (Payment Receipts)
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-600 font-semibold">রশিদ: {filteredPayments.length} টি</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                মোট জমা: ৳ {formatMoney(filteredTotalAmount)}
              </span>
              {filteredTotalDiscount > 0 && (
                <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  মোট ডিসকাউন্ট: ৳ {formatMoney(filteredTotalDiscount)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="রশিদ নং, গ্রাহক, মাধ্যম বা মন্তব্য দিয়ে খুঁজুন..."
                className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1 text-xs text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-600 font-semibold">From:</span>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-1 font-mono text-[11px]"
              />
              <span className="text-slate-600 font-semibold">To:</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-1 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() => {
                  const today = getTodayLocalDateStr();
                  setFilterDateFrom(today);
                  setFilterDateTo(today);
                }}
                className={`px-2 py-1 rounded font-bold text-[10px] border cursor-pointer transition ${
                  filterDateFrom === getTodayLocalDateStr() && filterDateTo === getTodayLocalDateStr()
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                আজকের
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className={`px-2 py-1 rounded font-bold text-[10px] border cursor-pointer transition ${
                  !filterDateFrom && !filterDateTo
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                সব তারিখ
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = getTodayLocalDateStr();
                  setSearchQuery('');
                  setFilterDateFrom(today);
                  setFilterDateTo(today);
                }}
                title="আজকের তারিখে রিসেট করুন"
                className="p-1 text-slate-600 hover:text-slate-900 border border-slate-300 rounded bg-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full min-w-[600px] text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
              <tr>
                <th className="p-2 text-center w-16">Receipt</th>
                <th className="p-2 w-32">তারিখ</th>
                <th className="p-2">গ্রাহকের নাম</th>
                <th className="p-2 text-right w-28">জমা (৳)</th>
                <th className="p-2 text-right w-24">ডিসকাউন্ট (৳)</th>
                <th className="p-2 text-center w-20">মাধ্যম</th>
                <th className="p-2">মন্তব্য</th>
                <th className="p-2 text-center w-24">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => {
                const isSelected = selectedPay?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPay(p)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-emerald-50 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-2 text-center font-mono font-bold text-slate-700">#{p.id}</td>
                    <td className="p-2 font-mono text-slate-600">{p.date?.slice(0, 16)}</td>
                    <td className="p-2 font-semibold text-slate-900">{p.custName}</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-800">
                      ৳ {formatMoney(p.amount)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-amber-700">
                      {(p.discount || 0) > 0 ? `৳ ${formatMoney(p.discount || 0)}` : '—'}
                    </td>
                    <td className="p-2 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {p.method}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600">{p.remark || '—'}</td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReprintPayment(p);
                          }}
                          title="পুনরায় রশিদ প্রিন্ট"
                          className="p-1 text-slate-700 hover:text-emerald-700 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const executeDelete = () => onDeletePayment(p.id);
                            if (onRequireAdminAuth) {
                              onRequireAdminAuth(
                                `জমা রশিদ #${p.id} মুছে ফেলা`,
                                executeDelete,
                                `গ্রাহক: ${p.custName} | পরিমাণ: ৳ ${formatMoney(p.amount)}${(p.discount || 0) > 0 ? ` | ডিসকাউন্ট: ৳ ${formatMoney(p.discount || 0)}` : ''} | মাধ্যম: ${p.method || 'Cash'}`
                              );
                            } else {
                              executeDelete();
                            }
                          }}
                          title="মুছুন"
                          className="p-1 text-slate-500 hover:text-rose-700 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    {payments.length === 0
                      ? 'কোনো জমা এন্ট্রি নেই'
                      : 'নির্বাচিত তারিখে কোনো পেমেন্ট রশিদ পাওয়া যায়নি — পুরাতন রশিদ দেখতে From/To তারিখ পরিবর্তন করুন'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
