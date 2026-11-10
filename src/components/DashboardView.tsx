import { Customer, Invoice, Payment, Product, ShopConfig, AppUser } from '../types';
import { formatMoney } from '../utils/numberWords';
import {
  FileText,
  DollarSign,
  CreditCard,
  AlertCircle,
  Users,
  Package,
  PlusCircle,
  ArrowRight,
  Printer,
  Receipt,
  FileSpreadsheet,
  Truck,
  ShieldCheck,
  ArrowDownToLine,
  Briefcase,
  Lock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  payments: Payment[];
  shop: ShopConfig;
  onNavigate: (tab: any) => void;
  onPrintInvoice: (inv: Invoice, isChallan: boolean) => void;
  onSelectCustomerForPayment: (cust: Customer) => void;
  currentUser?: AppUser;
  onOpenLoginModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  customers,
  products,
  payments,
  shop,
  onNavigate,
  onPrintInvoice,
  onSelectCustomerForPayment,
  currentUser,
  onOpenLoginModal,
}) => {
  const today = new Date().toISOString().slice(0, 10);

  // Daily invoices
  const todayInvoices = invoices.filter((inv) => (inv.date || '').startsWith(today));
  const dailyBillsCount = todayInvoices.length;

  // Daily sales (Sub2 total)
  const dailySalesAmount = todayInvoices.reduce((sum, inv) => {
    const lineSum = inv.items.reduce((s, it) => s + (it.total || 0), 0);
    const sub2 = lineSum + (inv.labor || 0) - (inv.discount || 0);
    return sum + sub2;
  }, 0);

  // Daily collections: (cash+bank+bkash from today's invoices) + (today's payment receipts)
  const invoicePaidToday = todayInvoices.reduce(
    (sum, inv) => sum + (inv.cash || 0) + (inv.bank || 0) + (inv.bkash || 0),
    0
  );
  const paymentReceiptsToday = payments
    .filter((p) => (p.date || '').startsWith(today))
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const dailyCollection = invoicePaidToday + paymentReceiptsToday;

  // Total Outstanding Due
  let totalDue = 0;
  const customersWithDue = customers
    .map((cust) => {
      let b = cust.openDue || 0;
      for (const inv of invoices) {
        if (inv.custId === cust.id) {
          const lsum = inv.items.reduce((s, it) => s + (it.total || 0), 0);
          const sub2 = lsum + (inv.labor || 0) - (inv.discount || 0);
          const paid = (inv.cash || 0) + (inv.bank || 0) + (inv.bkash || 0);
          b += sub2 - paid;
        }
      }
      for (const p of payments) {
        if (p.custId === cust.id) {
          b -= p.amount || 0;
        }
      }
      if (b > 0) totalDue += b;
      return { ...cust, currentDue: b };
    })
    .filter((c) => c.currentDue > 0)
    .sort((a, b) => b.currentDue - a.currentDue);

  const tiles = [
    {
      title: 'দৈনিক বিল',
      subtitle: 'Daily Invoices Count',
      value: String(dailyBillsCount),
      unit: 'টি বিল',
      bgColor: 'bg-blue-600',
      icon: FileText,
      action: () => onNavigate('order'),
    },
    {
      title: 'দৈনিক বিক্রয়',
      subtitle: 'Today Sales Volume',
      value: `৳ ${formatMoney(dailySalesAmount)}`,
      unit: '',
      bgColor: 'bg-emerald-700',
      icon: DollarSign,
      action: () => onNavigate('order'),
    },
    {
      title: 'দৈনিক জমা',
      subtitle: 'Cash, Bank & bKash Collection',
      value: `৳ ${formatMoney(dailyCollection)}`,
      unit: '',
      bgColor: 'bg-pink-700',
      icon: CreditCard,
      action: () => onNavigate('payment'),
    },
    {
      title: 'মোট বাকি',
      subtitle: 'Total Customer Outstanding',
      value: `৳ ${formatMoney(totalDue)}`,
      unit: `${customersWithDue.length} জন গ্রাহক`,
      bgColor: 'bg-rose-800',
      icon: AlertCircle,
      action: () => onNavigate('due_list'),
    },
    {
      title: 'মোট গ্রাহক',
      subtitle: 'Registered Customers',
      value: String(customers.length),
      unit: 'জন',
      bgColor: 'bg-teal-700',
      icon: Users,
      action: () => onNavigate('customer'),
    },
    {
      title: 'মোট পণ্য',
      subtitle: 'Active Products Catalog',
      value: String(products.length),
      unit: 'আইটেম',
      bgColor: 'bg-indigo-700',
      icon: Package,
      action: () => onNavigate('products'),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 6 Large Metrics Tiles (Faithful to MainForm in Billing.cs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile, idx) => {
          const Icon = tile.icon;
          return (
            <div
              key={idx}
              onClick={tile.action}
              className={`${tile.bgColor} text-white rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden group border border-white/10`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">{tile.title}</h3>
                  <p className="text-xs text-white/80 font-medium">{tile.subtitle}</p>
                </div>
                <div className="p-2 bg-white/15 rounded-lg">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight drop-shadow-xs">
                  {tile.value}
                </span>
                {tile.unit && (
                  <span className="text-xs font-semibold text-white/85 bg-black/20 px-2 py-0.5 rounded">
                    {tile.unit}
                  </span>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-xs text-white/80 group-hover:text-white transition">
                <span>বিস্তারিত দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            দ্রুত কাজ (Quick Actions):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('order')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            নতুন বিল (New Order)
          </button>
          <button
            onClick={() => onNavigate('payment')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-700 hover:bg-pink-600 text-white rounded text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            টাকা জমা রশিদ (Pay Receipt)
          </button>
          <button
            onClick={() => onNavigate('customer')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            নতুন গ্রাহক (Add Customer)
          </button>
          <button
            onClick={() => onNavigate('products')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Package className="w-3.5 h-3.5" />
            নতুন পণ্য (Add Product)
          </button>
          <button
            onClick={() => onNavigate('sales_report')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            রিপোর্ট ও খতিয়ান
          </button>
        </div>
      </div>

      {/* Main Grid: Recent Sales vs Top Due Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Recent Invoices */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h4 className="font-bold text-slate-800 text-sm">সাম্প্রতিক বিক্রয় চালান (Recent Invoices)</h4>
            </div>
            <button
              onClick={() => onNavigate('order')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              সব চালান দেখুন <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-2.5 text-center">Invoice No</th>
                  <th className="p-2.5">গ্রাহকের নাম</th>
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5 text-right">বিক্রয় মূল্য</th>
                  <th className="p-2.5 text-right">জমা</th>
                  <th className="p-2.5 text-right">বাকি</th>
                  <th className="p-2.5 text-center">প্রিন্ট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.slice(0, 8).map((inv) => {
                  const lineSum = inv.items.reduce((s, it) => s + (it.total || 0), 0);
                  const sub2 = lineSum + (inv.labor || 0) - (inv.discount || 0);
                  const paid = (inv.cash || 0) + (inv.bank || 0) + (inv.bkash || 0);
                  const due = sub2 - paid;
                  return (
                    <tr key={inv.no} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                        #{inv.no}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-800">{inv.custName}</div>
                        <div className="text-[11px] text-slate-500">{inv.phone || inv.address || '—'}</div>
                      </td>
                      <td className="p-2.5 text-slate-600 text-[11px] whitespace-nowrap">
                        {inv.date?.slice(0, 10)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        ৳ {formatMoney(sub2)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-700">
                        ৳ {formatMoney(paid)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {due > 0 ? (
                          <span className="text-rose-700">৳ {formatMoney(due)}</span>
                        ) : (
                          <span className="text-slate-500">পরিশোধ</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrintInvoice(inv, false)}
                            title="বিল প্রিন্ট (Invoice)"
                            className="p-1 text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPrintInvoice(inv, true)}
                            title="চালান প্রিন্ট (Challan)"
                            className="p-1 text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded cursor-pointer text-[10px] font-bold"
                          >
                            চ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      কোনো চালান পাওয়া যায়নি। উপরে 'নতুন বিল' বোতামে চাপুন।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1 col): Top Due Customers */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700" />
              <h4 className="font-bold text-slate-800 text-sm">সর্বোচ্চ বাকিদার গ্রাহকগণ</h4>
            </div>
            <button
              onClick={() => onNavigate('due_list')}
              className="text-xs text-rose-700 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              বাকির তালিকা <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
            {customersWithDue.slice(0, 6).map((c) => (
              <div key={c.id} className="p-3 hover:bg-slate-50 transition flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-slate-800">{c.name}</h5>
                  <p className="text-[11px] text-slate-500">
                    {c.phone || c.address || `ID: ${c.id}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-rose-700">
                    ৳ {formatMoney(c.currentDue)}
                  </div>
                  <button
                    onClick={() => {
                      onSelectCustomerForPayment(c);
                      onNavigate('payment');
                    }}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
                  >
                    জমা নিন &rarr;
                  </button>
                </div>
              </div>
            ))}
            {customersWithDue.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs">
                কোনো বাকি অবশিষ্ট নেই! সব পরিশোধিত।
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local Data Storage Status footer matching Billing.cs */}
      <div className="bg-slate-100 border border-slate-200 rounded-md p-2.5 text-xs text-slate-600 flex items-center justify-between">
        <span className="font-medium">
          ডাটা সংরক্ষিত আছে (লোকাল ব্রাউজার স্টোরেজ / TSV কম্প্যাটিবল): <span className="font-mono font-semibold text-slate-800">D:\InventoryBillingData</span>
        </span>
        <button
          onClick={() => onNavigate('data_backup')}
          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
        >
          ব্যাকআপ / এক্সপোর্ট করুন
        </button>
      </div>
    </div>
  );
};
