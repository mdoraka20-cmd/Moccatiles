import React, { useState } from 'react';
import { Txn } from '../types';
import { StorageService } from '../services/storage';
import { formatMoney, parseNum } from '../utils/numberWords';
import { TrendingUp, Trash2, Plus, Check } from 'lucide-react';

interface IncomeExpenseViewProps {
  txns: Txn[];
  onSaveTxn: (t: Txn) => void;
  onDeleteTxn: (id: number) => void;
  currentUser?: any;
  onRequireAdminAuth?: (actionTitle: string, onExecute: () => void, actionDetails?: string) => void;
}

export const IncomeExpenseView: React.FC<IncomeExpenseViewProps> = ({
  txns,
  onSaveTxn,
  onDeleteTxn,
  currentUser,
  onRequireAdminAuth,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isIncome, setIsIncome] = useState<boolean>(false);
  const [head, setHead] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedTxn, setSelectedTxn] = useState<Txn | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIncome = txns
    .filter((t) => t.isIncome && t.date === todayStr)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const todayExpense = txns
    .filter((t) => !t.isIncome && t.date === todayStr)
    .reduce((s, t) => s + (t.amount || 0), 0);

  const handleSave = () => {
    const amtVal = parseNum(amount);
    if (amtVal <= 0) {
      alert('সঠিক পরিমাণ দিন।');
      return;
    }

    const t: Txn = {
      id: StorageService.nextTxnId(),
      date,
      isIncome,
      head: head.trim() || (isIncome ? 'বিবিধ আয়' : 'দৈনিক খরচ'),
      amount: amtVal,
    };

    onSaveTxn(t);
    setHead('');
    setAmount('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 text-xs">
      {/* Entry Form */}
      <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <TrendingUp className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-sm text-slate-800">
            দোকানের আয়-ব্যয় (Income & Expense Entry)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">তারিখ (Date) :</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">ধরন (Type) :</label>
            <select
              value={isIncome ? 'income' : 'expense'}
              onChange={(e) => setIsIncome(e.target.value === 'income')}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="expense">Expense (খরচ)</option>
              <option value="income">Income (আয়)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">বিবরণ / খাত (Head) : *</label>
            <input
              type="text"
              value={head}
              onChange={(e) => setHead(e.target.value)}
              placeholder="e.g. লেবার খরচ, চা-নাস্তা, পরিবহন ভাড়া, ইত্যাদি"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-700 font-semibold">পরিমাণ (Amount ৳) : *</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            সংরক্ষণ (Save)
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h4 className="font-bold text-slate-800 text-xs">আয়-ব্যয়ের তালিকা (Recent Transactions)</h4>
          <span className="text-slate-500 font-medium">মোট এন্ট্রি: {txns.length} টি</span>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
              <tr>
                <th className="p-2 text-center w-14">ID</th>
                <th className="p-2 w-28">তারিখ</th>
                <th className="p-2 w-28 text-center">ধরন (Type)</th>
                <th className="p-2">বিবরণ (Head)</th>
                <th className="p-2 text-right w-28">পরিমাণ (৳)</th>
                <th className="p-2 text-center w-16">মুছুন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txns.map((t) => {
                const isSelected = selectedTxn?.id === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-2 text-center font-mono font-bold text-slate-700">{t.id}</td>
                    <td className="p-2 font-mono text-slate-600">{t.date}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.isIncome
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {t.isIncome ? 'Income (আয়)' : 'Expense (খরচ)'}
                      </span>
                    </td>
                    <td className="p-2 font-medium text-slate-900">{t.head}</td>
                    <td
                      className={`p-2 text-right font-mono font-bold ${
                        t.isIncome ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      ৳ {formatMoney(t.amount)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const executeDelete = () => onDeleteTxn(t.id);
                          if (onRequireAdminAuth) {
                            onRequireAdminAuth(
                              `আয়-ব্যয় এন্ট্রি #${t.id} মুছে ফেলা`,
                              executeDelete,
                              `${t.isIncome ? 'আয়' : 'ব্যয়'}: ${t.head} | পরিমাণ: ৳ ${formatMoney(t.amount)} | তারিখ: ${t.date}`
                            );
                          } else {
                            executeDelete();
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-700 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {txns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    কোনো আয়-ব্যয়ের রেকর্ড নেই
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Totals */}
        <div className="p-3 bg-slate-100 border-t border-slate-300 flex flex-wrap justify-between items-center text-xs font-mono font-bold text-slate-800">
          <span className="text-emerald-800">আজকের আয়: ৳ {formatMoney(todayIncome)}</span>
          <span className="text-rose-800">আজকের খরচ: ৳ {formatMoney(todayExpense)}</span>
          <span className="text-slate-900 text-sm">
            আজকের ব্যালেন্স: ৳ {formatMoney(todayIncome - todayExpense)}
          </span>
        </div>
      </div>
    </div>
  );
};
