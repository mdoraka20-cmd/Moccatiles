import React, { useState, useMemo } from 'react';
import { AppUser, Customer, Invoice, Payment, SmsComposeRequest, SmsRecipientPayload, StaffPermissions } from '../types';
import { StorageService } from '../services/storage';
import { formatMoney, getTodayLocalDateStr } from '../utils/numberWords';
import { AlertCircle, Search, Download, Printer, ArrowRight, MessageSquare, CheckSquare, Square, Users } from 'lucide-react';
import { printHtmlContent } from '../utils/printHelper';

interface DueListViewProps {
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  currentUser?: AppUser;
  permissions?: StaffPermissions;
  onSelectCustomerForPayment: (cust: Customer) => void;
  onNavigateToPayment: () => void;
  onOpenSmsComposer?: (req: SmsComposeRequest) => void;
}

export const DueListView: React.FC<DueListViewProps> = ({
  customers,
  invoices,
  currentUser,
  permissions,
  onSelectCustomerForPayment,
  onNavigateToPayment,
  onOpenSmsComposer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustIds, setSelectedCustIds] = useState<number[]>([]);
  const canSendSms = currentUser?.role !== 'staff' || permissions?.canSendSms !== false;

  // Calculate live due for all customers
  const customersWithDue = useMemo(
    () =>
      customers
        .map((c) => {
          const balance = StorageService.getCustomerBalance(c.id);
          return {
            ...c,
            balance,
          };
        })
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance),
    [customers]
  );

  // Lookup last invoice per customer for auto-populating {invoice_no} & {total_amount}
  const latestInvoiceByCustomer = useMemo(() => {
    const map = new Map<number, Invoice>();
    invoices.forEach((inv) => {
      const existing = map.get(inv.custId);
      if (!existing || inv.no > existing.no) {
        map.set(inv.custId, inv);
      }
    });
    return map;
  }, [invoices]);

  const filtered = customersWithDue.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.address.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  const totalDueAmount = filtered.reduce((s, c) => s + c.balance, 0);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedCustIds.includes(c.id));

  const toggleSelectOne = (custId: number) => {
    setSelectedCustIds((prev) =>
      prev.includes(custId) ? prev.filter((id) => id !== custId) : [...prev, custId]
    );
  };

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filtered.map((c) => c.id));
      setSelectedCustIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedCustIds, ...filtered.map((c) => c.id)]);
      setSelectedCustIds(Array.from(merged));
    }
  };

  const buildRecipientPayload = (c: (typeof filtered)[number]): SmsRecipientPayload => {
    const lastInv = latestInvoiceByCustomer.get(c.id);
    const invTotal = lastInv
      ? lastInv.items.reduce((s, it) => s + (it.total || 0), 0) + (lastInv.labor || 0) - (lastInv.discount || 0)
      : c.balance;
    const invPaid = lastInv
      ? (lastInv.cash || 0) + (lastInv.bank || 0) + (lastInv.bkash || 0)
      : 0;
    return {
      custId: c.id,
      custName: c.name,
      phone: c.phone || '',
      invoiceNo: lastInv ? String(lastInv.no) : 'বকেয়া',
      totalAmount: invTotal,
      paidAmount: invPaid,
      dueAmount: c.balance,
      date: getTodayLocalDateStr(),
      smsOptOut: c.smsOptOut,
      smsConsent: c.smsConsent,
    };
  };

  const handleSendSingleSms = (c: (typeof filtered)[number]) => {
    if (!onOpenSmsComposer) return;
    onOpenSmsComposer({
      triggerType: 'due_reminder',
      title: `${c.name} — বকেয়া SMS পাঠান`,
      recipients: [buildRecipientPayload(c)],
    });
  };

  const handleSendBulkSms = () => {
    if (!onOpenSmsComposer) return;
    const targetList =
      selectedCustIds.length > 0
        ? filtered.filter((c) => selectedCustIds.includes(c.id))
        : filtered;
    if (targetList.length === 0) return;

    onOpenSmsComposer({
      triggerType: 'bulk',
      title:
        selectedCustIds.length > 0
          ? `নির্বাচিত ${targetList.length} জন গ্রাহককে Bulk SMS`
          : `সকল বাকিদার (${targetList.length} জন) — Bulk SMS`,
      recipients: targetList.map(buildRecipientPayload),
    });
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFID,Name,Address,Mobile,Due\n';
    filtered.forEach((c) => {
      const escName = `"${c.name.replace(/"/g, '""')}"`;
      const escAddr = `"${c.address.replace(/"/g, '""')}"`;
      csv += `${c.id},${escName},${escAddr},${c.phone},${c.balance.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'due_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    let rowsHtml = '';
    filtered.forEach((c) => {
      rowsHtml += `<tr>
        <td style="text-align:center; font-family:monospace;">${c.id}</td>
        <td style="font-weight:bold;">${c.name}</td>
        <td>${c.address || '—'}</td>
        <td style="font-family:monospace;">${c.phone || '—'}</td>
        <td>${c.deal || '—'}</td>
        <td style="text-align:right; font-family:monospace; font-weight:bold; color:#be123c;">৳ ${formatMoney(c.balance)}</td>
      </tr>`;
    });

    const contentHtml = `
      <div style="text-align:center; margin-bottom:14px; border-bottom:2px solid #0f172a; padding-bottom:8px;">
        <h2 style="font-size:18px; margin:0; font-weight:bold;">বাকির তালিকা (Customer Due List)</h2>
        <p style="margin:2px 0; color:#64748b; font-size:11px;">তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট বাকিদার: ${filtered.length} জন | সর্বমোট পাওনা বাকি: ৳ ${formatMoney(totalDueAmount)}</p>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom:2px solid #475569;">
            <th style="border:1px solid #94a3b8; padding:5px;">ID</th>
            <th style="border:1px solid #94a3b8; padding:5px; text-align:left;">নাম</th>
            <th style="border:1px solid #94a3b8; padding:5px; text-align:left;">ঠিকানা</th>
            <th style="border:1px solid #94a3b8; padding:5px; text-align:left;">মোবাইল</th>
            <th style="border:1px solid #94a3b8; padding:5px; text-align:left;">ডিল</th>
            <th style="border:1px solid #94a3b8; padding:5px; text-align:right;">মোট বাকি (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #0f172a;">
            <td colspan="5" style="border:1px solid #94a3b8; padding:6px; text-align:right;">সর্বমোট বাকি =</td>
            <td style="border:1px solid #94a3b8; padding:6px; text-align:right; color:#be123c;">৳ ${formatMoney(totalDueAmount)}</td>
          </tr>
        </tbody>
      </table>
    `;

    printHtmlContent(contentHtml, 'Customer_Due_List');
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 text-xs">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-700" />
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              বাকির তালিকা (Customers Outstanding Due List)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              যেসব গ্রাহকের কাছে দোকানের পাওনা বাকি রয়েছে — সিঙ্গেল বা বাল্ক তাগাদা SMS পাঠান
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenSmsComposer && canSendSms && (
            <button
              type="button"
              onClick={handleSendBulkSms}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white rounded font-bold cursor-pointer transition shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              {selectedCustIds.length > 0
                ? `Bulk SMS পাঠান (${selectedCustIds.length} জন নির্বাচিত)`
                : `সকল গ্রাহককে Bulk SMS (${filtered.length} জন)`}
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold cursor-pointer transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-semibold cursor-pointer transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print List
          </button>
        </div>
      </div>

      {/* Filter, Selection & Search */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="গ্রাহকের নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন..."
              className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1.5 text-slate-800"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenSmsComposer && canSendSms && (
              <>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-sky-700" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {allFilteredSelected ? 'সব আনসিলেক্ট' : 'সকল সিলেক্ট'}
                </button>
                {selectedCustIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustIds([])}
                    className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-semibold cursor-pointer"
                  >
                    সিলেকশন মুছুন ({selectedCustIds.length})
                  </button>
                )}
              </>
            )}
            <span className="font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
              বাকিদার: {filtered.length} জন
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full min-w-[780px] text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
              <tr>
                {onOpenSmsComposer && canSendSms && (
                  <th className="p-2.5 text-center w-10">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      title="সকল সিলেক্ট / আনসিলেক্ট"
                      className="cursor-pointer align-middle"
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="p-2.5 text-center w-16">ID</th>
                <th className="p-2.5">গ্রাহকের নাম (Name)</th>
                <th className="p-2.5">ঠিকানা (Address)</th>
                <th className="p-2.5">মোবাইল (Mobile)</th>
                <th className="p-2.5">ডিল / রেফারেন্স</th>
                <th className="p-2.5 text-right w-32">মোট বাকি (Due ৳)</th>
                <th className="p-2.5 text-center w-44">অ্যাকশন (SMS / জমা)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const isChecked = selectedCustIds.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`transition ${isChecked ? 'bg-sky-50/70' : 'hover:bg-slate-50'}`}
                  >
                    {onOpenSmsComposer && canSendSms && (
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(c.id)}
                          className="w-4 h-4 accent-sky-700 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-2.5 text-center font-mono font-bold text-slate-700">{c.id}</td>
                    <td className="p-2.5 font-bold text-slate-900">
                      <span>{c.name}</span>
                      {c.smsOptOut && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-bold">
                          Opt-Out
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-600">{c.address || '—'}</td>
                    <td className="p-2.5 font-mono text-slate-700">{c.phone || '—'}</td>
                    <td className="p-2.5 text-slate-600">{c.deal || '—'}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-700 text-sm">
                      ৳ {formatMoney(c.balance)}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onOpenSmsComposer && canSendSms && (
                          <button
                            type="button"
                            onClick={() => handleSendSingleSms(c)}
                            title={c.smsOptOut ? 'গ্রাহক Opt-Out করেছেন (প্রিভিউ দেখুন)' : 'সিঙ্গেল বকেয়া SMS পাঠান'}
                            className="px-2 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1 text-[11px]"
                          >
                            <MessageSquare className="w-3 h-3" />
                            SMS
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onSelectCustomerForPayment(c);
                            onNavigateToPayment();
                          }}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1 text-[11px]"
                        >
                          জমা <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={onOpenSmsComposer && canSendSms ? 8 : 7} className="p-8 text-center text-slate-400">
                    কোনো গ্রাহকের বাকি পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total Summary Row */}
        <div className="p-3 bg-slate-100 border-t border-slate-300 flex flex-wrap justify-between items-center gap-2 text-sm font-bold">
          <span className="text-slate-800">
            মোট বাকিদার গ্রাহক: {filtered.length} জন
            {selectedCustIds.length > 0 ? ` (নির্বাচিত: ${selectedCustIds.length} জন)` : ''}
          </span>
          <span className="text-rose-800 font-mono text-base">
            সর্বমোট পাওনা বাকি: ৳ {formatMoney(totalDueAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};
