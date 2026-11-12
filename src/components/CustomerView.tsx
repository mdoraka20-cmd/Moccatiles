import React, { useState } from 'react';
import { Customer, Invoice } from '../types';
import { StorageService } from '../services/storage';
import { formatMoney, parseNum } from '../utils/numberWords';
import { Users, Search, Plus, Save, Trash2, ShoppingBag, X } from 'lucide-react';

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
  };

  const handleNew = () => {
    setSelectedCust(null);
    setName('');
    setAddress('');
    setPhone('');
    setDeal('');
    setOpenDue('0');
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('গ্রাহকের নাম দিন।');
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
    alert(`গ্রাহক সংরক্ষিত হয়েছে! ID: ${cust.id}`);
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

          <div>
            <label className="block text-slate-700 font-semibold mb-1">গ্রাহকের নাম (Name) : *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="পূর্ণ নাম"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">মোবাইল (Phone) :</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="মোবাইল নম্বর"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
            />
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
                  else alert('একজন গ্রাহক বাছুন।');
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
                else alert('প্রথমে একজন গ্রাহক বাছুন।');
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
          <table className="w-full text-xs text-left border-collapse">
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

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-xs text-left border-collapse">
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
