import React, { useState } from 'react';
import { Customer, Payment } from '../types';
import { StorageService } from '../services/storage';
import { formatMoney, parseNum, formatDateTimeBangla } from '../utils/numberWords';
import { Receipt, Search, Printer, Trash2, Check, UserCheck } from 'lucide-react';

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
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'Cash' | 'Bank' | 'Bkash'>('Cash');
  const [remark, setRemark] = useState<string>('');
  const [selectedPay, setSelectedPay] = useState<Payment | null>(null);

  // If customer came from picker
  React.useEffect(() => {
    if (selectedCustomerFromPicker) {
      setSelectedCust(selectedCustomerFromPicker);
      onClearCustomerPicker();
    }
  }, [selectedCustomerFromPicker]);

  const currentDue = selectedCust ? StorageService.getCustomerBalance(selectedCust.id) : 0;

  const handleSave = (print: boolean) => {
    if (!selectedCust) {
      alert('গ্রাহক বাছাই করুন।');
      return;
    }
    const amtVal = parseNum(amount);
    if (amtVal <= 0) {
      alert('জমার সঠিক পরিমাণ দিন।');
      return;
    }

    const newPayment: Payment = {
      id: StorageService.nextPayId(),
      date: `${payDate} ${new Date().toLocaleTimeString('en-GB')}`,
      custId: selectedCust.id,
      custName: selectedCust.name,
      amount: amtVal,
      method,
      remark: remark.trim(),
    };

    onSavePayment(newPayment, print);
    setAmount('');
    setRemark('');
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

          {/* Amount & Method */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-slate-700 font-semibold">জমার পরিমাণ (Amount ৳) : *</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-emerald-800 text-sm"
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

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
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
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="font-bold text-slate-800 text-xs">টাকা জমার ইতিহাস (Recent Payment Receipts)</h4>
          <span className="text-slate-500 font-medium">মোট রশিদ: {payments.length} টি</span>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
              <tr>
                <th className="p-2 text-center w-16">Receipt</th>
                <th className="p-2 w-32">তারিখ</th>
                <th className="p-2">গ্রাহকের নাম</th>
                <th className="p-2 text-right w-28">পরিমাণ (৳)</th>
                <th className="p-2 text-center w-20">মাধ্যম</th>
                <th className="p-2">মন্তব্য</th>
                <th className="p-2 text-center w-24">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => {
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
                                `গ্রাহক: ${p.custName} | পরিমাণ: ৳ ${formatMoney(p.amount)} | মাধ্যম: ${p.method || 'Cash'}`
                              );
                            } else {
                              if (confirm(`Receipt #${p.id} (${formatMoney(p.amount)} ৳) মুছে ফেলবেন?`)) {
                                executeDelete();
                              }
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
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    কোনো জমা এন্ট্রি নেই
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
