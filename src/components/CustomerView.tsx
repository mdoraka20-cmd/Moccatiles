import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Customer, Invoice } from '../types';
import { StorageService } from '../services/storage';
import { formatMoney, parseNum } from '../utils/numberWords';
import { Users, Search, Plus, Save, Trash2, ShoppingBag, X, Phone, MapPin, AlertCircle } from 'lucide-react';

interface CustomerViewProps {
  customers: Customer[];
  invoices: Invoice[];
  onSaveCustomer: (cust: Customer) => void;
  onDeleteCustomer: (id: number) => void;
  isPickMode?: boolean;
  onPickCustomer?: (cust: Customer) => void;
  onClosePickModal?: () => void;
  currentUser?: any;
  onRequireAdminAuth?: (actionTitle: string, onExecute: () => void, actionDetails?: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  invoices,
  onSaveCustomer,
  onDeleteCustomer,
  isPickMode = false,
  onPickCustomer,
  onClosePickModal,
  currentUser,
  onRequireAdminAuth,
}) => {
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [deal, setDeal] = useState('');
  const [openDue, setOpenDue] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Suggestion dropdown states
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const phoneFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nameFieldRef.current && !nameFieldRef.current.contains(e.target as Node)) {
        setShowNameSuggestions(false);
      }
      if (phoneFieldRef.current && !phoneFieldRef.current.contains(e.target as Node)) {
        setShowPhoneSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Matched existing customers for Name field
  const nameMatchedCustomers = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => c.id !== selectedCust?.id && c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, name, selectedCust]);

  // Matched existing customers for Phone field (matches phone OR falls back to name matches so both fields show suggestions)
  const phoneMatchedCustomers = useMemo(() => {
    const pQ = phone.trim().toLowerCase();
    const nQ = name.trim().toLowerCase();
    if (!pQ && !nQ) return [];
    return customers
      .filter((c) => {
        if (c.id === selectedCust?.id) return false;
        const phoneMatch = pQ ? (c.phone || '').toLowerCase().includes(pQ) : false;
        const nameMatch = nQ ? c.name.toLowerCase().includes(nQ) : false;
        if (pQ && nQ) return phoneMatch || nameMatch;
        return pQ ? phoneMatch : nameMatch;
      })
      .slice(0, 8);
  }, [customers, phone, name, selectedCust]);

  // Product purchase history modal state
  const [showProductHistory, setShowProductHistory] = useState(false);
  const [productFilter, setProductFilter] = useState<string>('all');

  const handleSelectRow = (cust: Customer) => {
    setSelectedCust(cust);
    setName(cust.name);
    setAddress(cust.address);
    setPhone(cust.phone);
    setDeal(cust.deal);
    setOpenDue(String(cust.openDue || 0));
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setStatusMsg(null);
  };

  const handlePickSuggestion = (cust: Customer) => {
    handleSelectRow(cust);
    setStatusMsg({
      text: `পুরাতন গ্রাহক "${cust.name}" (ID: #${cust.id}) লোড করা হয়েছে। নতুন গ্রাহক যোগ করতে চাইলে 'নতুন (New)' চাপুন।`,
      type: 'info',
    });
  };

  const handleNew = () => {
    setSelectedCust(null);
    setName('');
    setAddress('');
    setPhone('');
    setDeal('');
    setOpenDue('0');
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setStatusMsg(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setStatusMsg({ text: 'গ্রাহকের নাম দিন।', type: 'error' });
      return;
    }

    const cust: Customer = {
      id: selectedCust ? selectedCust.id : StorageService.nextCustId(),
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      deal: deal.trim(),
      openDue: parseNum(openDue),
    };

    onSaveCustomer(cust);
    setSelectedCust(cust);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setStatusMsg({ text: `গ্রাহক সংরক্ষিত হয়েছে! ID: ${cust.id}`, type: 'success' });
  };

  const handleDelete = () => {
    if (!selectedCust) return;
    const executeDelete = () => {
      onDeleteCustomer(selectedCust.id);
      handleNew();
    };

    if (onRequireAdminAuth) {
      onRequireAdminAuth(
        `গ্রাহক '${selectedCust.name}' এর তথ্য মুছে ফেলা`,
        executeDelete,
        `গ্রাহক আইডি: #${selectedCust.id} | মোবাইল: ${selectedCust.phone || '—'} | ডিলার: ${selectedCust.deal || '—'}`
      );
    } else {
      executeDelete();
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.address.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  // Purchased items for currently selected customer
  const customerInvoices = selectedCust
    ? invoices.filter((v) => v.custId === selectedCust.id)
    : [];

  const allPurchasedItems: Array<{
    invoiceNo: number;
    date: string;
    name: string;
    qty: number;
    unit: number;
    total: number;
  }> = [];

  for (const inv of customerInvoices) {
    for (const it of inv.items) {
      allPurchasedItems.push({
        invoiceNo: inv.no,
        date: inv.date?.slice(0, 10) || '',
        name: it.name,
        qty: it.isTile ? it.sft : it.piece,
        unit: it.unit,
        total: it.total,
      });
    }
  }

  const distinctProductNames = Array.from(new Set(allPurchasedItems.map((p) => p.name))).sort();
  const filteredPurchasedItems =
    productFilter === 'all'
      ? allPurchasedItems
      : allPurchasedItems.filter((p) => p.name === productFilter);

  const totalPurchasedQty = filteredPurchasedItems.reduce((s, it) => s + it.qty, 0);
  const totalPurchasedAmount = filteredPurchasedItems.reduce((s, it) => s + it.total, 0);

  return (
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto space-y-4 ${isPickMode ? 'bg-white' : ''}`}>
      {/* Pick mode header if opened as modal */}
      {isPickMode && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-base text-slate-800">গ্রাহক বাছাই করুন (Select Customer)</h2>
          </div>
          {onClosePickModal && (
            <button
              onClick={onClosePickModal}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Form Fields Card */}
      <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-2xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">গ্রাহক আইডি (Customer ID):</label>
            <div className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-700">
              {selectedCust ? selectedCust.id : '(নতুন আইডি স্বয়ংক্রিয় হবে)'}
            </div>
          </div>

          <div ref={nameFieldRef} className="relative">
            <label className="block text-slate-700 font-semibold mb-1">গ্রাহকের নাম (Name) : *</label>
            <input
              type="text"
              value={name}
              onFocus={() => setShowNameSuggestions(true)}
              onChange={(e) => {
                setName(e.target.value);
                setShowNameSuggestions(true);
                if (!selectedCust && e.target.value.trim()) {
                  setShowPhoneSuggestions(true);
                }
              }}
              placeholder="পূর্ণ নাম"
              autoComplete="off"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
            {showNameSuggestions && nameMatchedCustomers.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-amber-400 rounded-md shadow-xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-100">
                <div className="px-2.5 py-1 bg-amber-50 text-[10px] font-bold text-amber-800 flex items-center justify-between sticky top-0 border-b border-amber-200">
                  <span>পুরাতন গ্রাহকের নামের মিল ({nameMatchedCustomers.length} জন)</span>
                  <button
                    type="button"
                    onClick={() => setShowNameSuggestions(false)}
                    className="text-amber-700 hover:text-amber-950 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {nameMatchedCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handlePickSuggestion(c);
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {c.name} <span className="text-[10px] font-mono text-slate-500">(#{c.id})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 truncate">
                        <span className="inline-flex items-center gap-0.5 font-mono text-emerald-700 font-semibold">
                          <Phone className="w-2.5 h-2.5" /> {c.phone || 'নম্বর নেই'}
                        </span>
                        {c.address && (
                          <span className="inline-flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5" /> {c.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      বাছাই
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={phoneFieldRef} className="relative">
            <label className="block text-slate-700 font-semibold mb-1">মোবাইল (Phone) :</label>
            <input
              type="text"
              value={phone}
              onFocus={() => setShowPhoneSuggestions(true)}
              onChange={(e) => {
                setPhone(e.target.value);
                setShowPhoneSuggestions(true);
              }}
              placeholder="মোবাইল নম্বর"
              autoComplete="off"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
            {showPhoneSuggestions && phoneMatchedCustomers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-amber-400 rounded-md shadow-xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div className="px-2.5 py-1 bg-amber-50 text-[10px] font-bold text-amber-800 flex items-center justify-between sticky top-0 border-b border-amber-200">
                    <span>পুরাতন গ্রাহকের নম্বর সাজেশন ({phoneMatchedCustomers.length} জন)</span>
                    <button
                      type="button"
                      onClick={() => setShowPhoneSuggestions(false)}
                      className="text-amber-700 hover:text-amber-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {phoneMatchedCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePickSuggestion(c);
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-emerald-800 text-xs">
                          {c.phone || 'নম্বর নেই'}
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold truncate">
                          {c.name} <span className="text-[10px] font-mono text-slate-500">(#{c.id})</span>
                          {c.address ? ` — ${c.address}` : ''}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        বাছাই
                      </span>
                    </button>
                  ))}
                </div>
              )}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">সংক্ষিপ্ত ঠিকানা (Address) :</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ঠিকানা"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Deal / Contact :</label>
            <input
              type="text"
              value={deal}
              onChange={(e) => setDeal(e.target.value)}
              placeholder="ডিলার / কন্টাক্টর বিবরণ"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">পুরাতন প্রারম্ভিক বাকি (Opening Due) :</label>
            <input
              type="text"
              value={openDue}
              onChange={(e) => setOpenDue(e.target.value)}
              placeholder="0"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-rose-700 font-bold"
            />
          </div>
        </div>

        {/* Name-match warning & status message */}
        {!selectedCust && nameMatchedCustomers.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded px-3 py-1.5 text-[11px] text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>সাজেশন:</strong> "{name.trim()}" নামের সাথে {nameMatchedCustomers.length} জন পুরাতন গ্রাহকের মিল পাওয়া গেছে — নাম অথবা মোবাইল ঘর থেকে বাছাই করতে পারেন।
            </span>
          </div>
        )}

        {statusMsg && (
          <div
            className={`rounded px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between gap-2 border ${
              statusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : statusMsg.type === 'info'
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button type="button" onClick={() => setStatusMsg(null)} className="cursor-pointer opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              নতুন (New)
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              সংরক্ষণ (Save)
            </button>
            <button
              onClick={handleDelete}
              disabled={!selectedCust}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              মুছুন (Delete)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isPickMode && onPickCustomer && (
              <button
                onClick={() => {
                  if (selectedCust) onPickCustomer(selectedCust);
                  else setStatusMsg({ text: 'একজন গ্রাহক বাছুন।', type: 'error' });
                }}
                disabled={!selectedCust}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded font-bold transition cursor-pointer shadow-xs text-xs"
              >
                বাছাই সম্পন্ন (Select)
              </button>
            )}

            <button
              onClick={() => {
                if (selectedCust) setShowProductHistory(true);
                else setStatusMsg({ text: 'প্রথমে একজন গ্রাহক বাছুন।', type: 'error' });
              }}
              disabled={!selectedCust}
              className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 disabled:opacity-40 text-white rounded font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              কেনা পণ্যের তালিকা (Product List)
            </button>
          </div>
        </div>
      </div>

      {/* Search & Grid */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, মোবাইল, ঠিকানা বা আইডি দিয়ে খুঁজুন..."
              className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1.5 text-xs text-slate-800"
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            মোট গ্রাহক: {filteredCustomers.length} জন
          </span>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full min-w-[650px] text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
              <tr>
                <th className="p-2 text-center w-16">ID</th>
                <th className="p-2">গ্রাহকের নাম (Name)</th>
                <th className="p-2">ঠিকানা (Address)</th>
                <th className="p-2">মোবাইল (Mobile)</th>
                <th className="p-2">Deal / Contact</th>
                <th className="p-2 text-right w-28">বর্তমান বাকি (Balance)</th>
                <th className="p-2 text-center w-12">মুছুন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCust?.id === cust.id;
                const balance = StorageService.getCustomerBalance(cust.id);
                return (
                  <tr
                    key={cust.id}
                    onClick={() => handleSelectRow(cust)}
                    onDoubleClick={() => {
                      handleSelectRow(cust);
                      if (isPickMode && onPickCustomer) onPickCustomer(cust);
                    }}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-emerald-100 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-2 text-center font-mono font-bold text-slate-700">{cust.id}</td>
                    <td className="p-2 font-semibold text-slate-900">{cust.name}</td>
                    <td className="p-2 text-slate-600">{cust.address || '—'}</td>
                    <td className="p-2 font-mono text-slate-700">{cust.phone || '—'}</td>
                    <td className="p-2 text-slate-600">{cust.deal || '—'}</td>
                    <td className="p-2 text-right font-mono font-bold">
                      {balance > 0 ? (
                        <span className="text-rose-700">৳ {formatMoney(balance)}</span>
                      ) : (
                        <span className="text-slate-500">৳ 0.00</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const executeDelete = () => {
                            onDeleteCustomer(cust.id);
                            if (selectedCust?.id === cust.id) {
                              handleNew();
                            }
                          };
                          if (currentUser?.role === 'admin') {
                            executeDelete();
                          } else if (onRequireAdminAuth) {
                            onRequireAdminAuth(
                              `গ্রাহক '${cust.name}' মুছে ফেলা`,
                              executeDelete,
                              `গ্রাহক আইডি: #${cust.id} | মোবাইল: ${cust.phone || '—'}`
                            );
                          } else {
                            executeDelete();
                          }
                        }}
                        title={currentUser?.role === 'admin' ? 'সরাসরি গ্রাহক মুছুন (Admin Delete)' : 'এডমিন পারমিশন নিয়ে মুছুন'}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    কোনো গ্রাহক খুঁজে পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Purchased Products Modal (CustomerProductForm in Billing.cs) */}
      {showProductHistory && selectedCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-4 py-3 bg-teal-800 text-white">
              <h3 className="font-bold text-sm tracking-wide">
                গ্রাহকের কেনা পণ্যের খতিয়ান (Customer Purchased Products)
              </h3>
              <button
                onClick={() => setShowProductHistory(false)}
                className="p-1 hover:bg-teal-700 rounded text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">গ্রাহকের নাম:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedCust.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedCust.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ঠিকানা:</span>
                <span className="text-slate-700">{selectedCust.address || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">মোবাইল:</span>
                <span className="font-mono text-slate-700">{selectedCust.phone || '—'}</span>
              </div>
            </div>

            <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">পণ্য ফিল্টার:</span>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-medium"
              >
                <option value="all">(সব পণ্য)</option>
                {distinctProductNames.map((pName) => (
                  <option key={pName} value={pName}>
                    {pName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full min-w-[600px] text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="p-2 text-center w-10">SL</th>
                    <th className="p-2 text-center w-24">Invoice No</th>
                    <th className="p-2 w-24">Date</th>
                    <th className="p-2">Product Name</th>
                    <th className="p-2 text-right w-24">Sales Qty</th>
                    <th className="p-2 text-right w-24">Sales Price</th>
                    <th className="p-2 text-right w-28">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchasedItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-800">#{it.invoiceNo}</td>
                      <td className="p-2 font-mono text-slate-600">{it.date}</td>
                      <td className="p-2 font-medium text-slate-900">{it.name}</td>
                      <td className="p-2 text-right font-mono font-semibold">{it.qty.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono">{formatMoney(it.unit)}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{formatMoney(it.total)}</td>
                    </tr>
                  ))}
                  {filteredPurchasedItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        এই গ্রাহকের কোনো পণ্য ক্রয়ের রেকর্ড নেই
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-300 flex justify-between items-center text-xs font-mono font-bold text-slate-800">
              <span>মোট পরিমাণ: {totalPurchasedQty.toFixed(2)}</span>
              <span className="text-emerald-800 text-sm">মোট টাকা: ৳ {formatMoney(totalPurchasedAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
