import React, { useState } from 'react';
import {
  DeliveryChallan,
  DeliveryItem,
  Invoice,
  Product,
  ShopConfig,
  StockInItem,
  StockInRecord,
  Customer,
  AppUser,
  StaffPermissions,
} from '../types';
import { StorageService } from '../services/storage';
import { formatMoney, formatQty, parseNum, formatDateBangla, formatDateTimeBangla } from '../utils/numberWords';
import {
  Package,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Check,
  X,
  FileText,
  Lock,
} from 'lucide-react';
import { ProductSearchSelect } from './ProductSearchSelect';

interface StockInventoryViewProps {
  products: Product[];
  invoices: Invoice[];
  shop: ShopConfig;
  onStockUpdated: () => void;
  onOpenPrintModal: (payload: {
    isOpen: boolean;
    type: 'invoice' | 'challan' | 'receipt' | 'report' | 'delivery_challan' | 'stock_in';
    invoice?: Invoice;
    deliveryChallan?: DeliveryChallan;
    stockInRecord?: StockInRecord;
  }) => void;
  currentUser?: AppUser;
  permissions?: StaffPermissions;
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  products,
  invoices,
  shop,
  onStockUpdated,
  onOpenPrintModal,
  currentUser,
  permissions,
}) => {
  const [subTab, setSubTab] = useState<'overview' | 'stock_in' | 'pending_challan' | 'challan_history'>('pending_challan');

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');

  // ================= Stock In State =================
  const [vendorName, setVendorName] = useState('');
  const [vendorChallanNo, setVendorChallanNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [stockInDate, setStockInDate] = useState(new Date().toISOString().slice(0, 10));
  const [stockInNote, setStockInNote] = useState('');
  const [stockInItems, setStockInItems] = useState<StockInItem[]>([]);

  // Registered vendors list for automatic selection
  const registeredVendors = React.useMemo(() => {
    const list = StorageService.getVendors();
    products.forEach((p) => {
      if (p.vendor && !list.includes(p.vendor)) list.push(p.vendor);
    });
    return Array.from(new Set(list)).sort();
  }, [products]);

  // Item row inputs for stock in
  const [inProdId, setInProdId] = useState('');
  const [inBox, setInBox] = useState('');
  const [inPiece, setInPiece] = useState('');
  const [inSft, setInSft] = useState('');
  const [inRate, setInRate] = useState('');
  const [inTotal, setInTotal] = useState('0.00');

  // ================= Split Delivery Modal State =================
  const [deliveryModalInvoice, setDeliveryModalInvoice] = useState<Invoice | null>(null);
  const [deliveryDispatchInputs, setDeliveryDispatchInputs] = useState<{
    [productId: number]: { box: string; piece: string; sft: string };
  }>({});
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState('');

  const canDispatch = currentUser?.role === 'admin' || (permissions ? permissions.canDispatchDelivery : true);
  const canStockIn = currentUser?.role === 'admin' || (permissions ? permissions.canStockIn : true);

  const showMsg = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // ================= Stock In Helpers =================
  const handleSelectStockInProduct = (pId: string) => {
    setInProdId(pId);
    const p = products.find((pr) => pr.id === Number(pId));
    if (p) {
      setInRate(String(p.rate || 0));
      calcStockInTotal(p, parseNum(inBox), parseNum(inPiece), p.rate);
    }
  };

  const calcStockInTotal = (prod: Product, b: number, pc: number, r: number) => {
    let sft = 0;
    let tot = 0;
    if (prod.isTile) {
      sft = b * (prod.sftPack || 0) + (prod.qtyPack > 0 ? (pc * (prod.sftPack || 0)) / prod.qtyPack : 0);
      sft = Math.round(sft * 100) / 100;
      tot = Math.round(sft * r * 100) / 100;
      setInSft(sft.toFixed(2));
    } else {
      tot = Math.round(pc * r * 100) / 100;
      setInSft('0.00');
    }
    setInTotal(tot.toFixed(2));
  };

  const handleAddStockInItem = () => {
    const prod = products.find((pr) => pr.id === Number(inProdId));
    if (!prod) {
      alert('পণ্য নির্বাচন করুন।');
      return;
    }
    const b = parseNum(inBox);
    const pc = parseNum(inPiece);
    if (b <= 0 && pc <= 0) {
      alert('বক্স বা পিস সংখ্যা দিন।');
      return;
    }

    const newItem: StockInItem = {
      productId: prod.id,
      name: prod.name,
      dim: prod.isTile ? `${prod.w.toFixed(2)} X ${prod.h.toFixed(2)}` : '0.00 X 0.00',
      box: b,
      piece: pc,
      sft: parseNum(inSft),
      rate: parseNum(inRate),
      total: parseNum(inTotal),
      isTile: prod.isTile,
    };

    setStockInItems([...stockInItems, newItem]);
    setInProdId('');
    setInBox('');
    setInPiece('');
    setInSft('');
    setInRate('');
    setInTotal('0.00');
  };

  const handleSaveStockIn = () => {
    if (!canStockIn) {
      alert('এডমিন কর্তৃক স্টাফদের স্টক ইন এন্ট্রি করার পারমিশন বন্ধ রাখা হয়েছে।');
      return;
    }
    if (!vendorName.trim()) {
      alert('ভেন্ডর / সরবরাহকারীর নাম দিন।');
      return;
    }
    if (stockInItems.length === 0) {
      alert('কমপক্ষে একটি পণ্য স্টক ইন তালিকায় যোগ করুন।');
      return;
    }

    const totalAmt = stockInItems.reduce((s, it) => s + (it.total || 0), 0);
    const record: StockInRecord = {
      id: StorageService.nextStockInId(),
      vendorName: vendorName.trim(),
      vendorChallanNo: vendorChallanNo.trim() || '—',
      referenceNo: referenceNo.trim() || '—',
      date: `${stockInDate} ${new Date().toLocaleTimeString('en-GB')}`,
      note: stockInNote.trim(),
      items: stockInItems,
      totalAmount: totalAmt,
      receivedBy: StorageService.getCurrentUser().name,
    };

    StorageService.addStockInRecord(record);
    onStockUpdated();
    showMsg(`স্টক ইন রেকর্ড #${record.id} সফলভাবে সংরক্ষিত হয়েছে!`);

    // Reset stock in form
    setVendorName('');
    setVendorChallanNo('');
    setReferenceNo('');
    setStockInNote('');
    setStockInItems([]);

    // Open receipt
    onOpenPrintModal({
      isOpen: true,
      type: 'stock_in',
      stockInRecord: record,
    });
  };

  // ================= Split & Full Delivery Handlers =================
  const openDeliveryModal = (inv: Invoice) => {
    if (!canDispatch) {
      alert('এডমিন কর্তৃক স্টাফদের চালান ডেলিভারি ডিসপ্যাচ করার পারমিশন বন্ধ রাখা হয়েছে।');
      return;
    }
    const statusObj = StorageService.getInvoiceDeliveryStatus(inv.no);
    const inputs: { [productId: number]: { box: string; piece: string; sft: string } } = {};
    statusObj.itemStatuses.forEach((it) => {
      // By default prefill with remaining
      inputs[it.productId] = {
        box: String(it.remainingBox || 0),
        piece: String(it.remainingPiece || 0),
        sft: String(it.remainingSft || 0),
      };
    });

    setDeliveryDispatchInputs(inputs);
    setDeliveryModalInvoice(inv);
    setVehicleNo('');
    setDriverName('');
    setDriverPhone('');
    setDeliveryNote('');
  };

  // 1-Click Full Delivery directly from table
  const handleFullDeliveryInstant = (inv: Invoice) => {
    if (!canDispatch) {
      alert('এডমিন কর্তৃক স্টাফদের চালান ডেলিভারি ডিসপ্যাচ করার পারমিশন বন্ধ রাখা হয়েছে।');
      return;
    }
    const statusObj = StorageService.getInvoiceDeliveryStatus(inv.no);
    if (statusObj.isFullyDelivered) {
      alert('এই চালানের সমস্ত মাল ইতিমধ্যে ডেলিভারি সম্পন্ন হয়েছে!');
      return;
    }

    if (!confirm(`চালান #${inv.no} এর সকল অবশিষ্ট পণ্য ১-ক্লিকে ফুল ডেলিভারি নিশ্চিত করবেন?`)) {
      return;
    }

    const dispatchItems: DeliveryItem[] = statusObj.itemStatuses
      .filter((it) => it.remainingBox > 0 || it.remainingPiece > 0)
      .map((it) => ({
        productId: it.productId,
        name: it.name,
        dim: it.dim,
        box: it.remainingBox,
        piece: it.remainingPiece,
        sft: it.remainingSft,
        isTile: it.isTile,
      }));

    if (dispatchItems.length === 0) {
      alert('ডেলিভারি করার মতো কোনো অবশিষ্ট পণ্য নেই।');
      return;
    }

    const tripIndex = statusObj.dispatchesCount + 1;
    const challanNo = `CH-${inv.no}-${tripIndex}`;
    const deliveryChallan: DeliveryChallan = {
      id: StorageService.nextDeliveryChallanId(),
      challanNo,
      invoiceNo: inv.no,
      custId: inv.custId,
      custName: inv.custName,
      address: inv.address,
      phone: inv.phone,
      deal: inv.deal,
      date: new Date().toISOString().replace('T', ' ').slice(0, 19),
      vehicleNo: 'ফুল ডেলিভারি',
      note: '১-ক্লিকে সম্পূর্ণ চালান ডেলিভারি সম্পন্ন',
      dispatchedBy: StorageService.getCurrentUser().name,
      items: dispatchItems,
    };

    StorageService.addDeliveryChallan(deliveryChallan);
    onStockUpdated();
    showMsg(`চালান ${challanNo} সম্পূর্ণ ডেলিভারি সম্পন্ন ও স্টক আউট হয়েছে!`);

    // Open delivery challan slip print
    onOpenPrintModal({
      isOpen: true,
      type: 'delivery_challan',
      deliveryChallan,
    });
  };

  // Confirm custom / split delivery from modal
  const handleConfirmSplitDelivery = () => {
    if (!deliveryModalInvoice) return;
    const statusObj = StorageService.getInvoiceDeliveryStatus(deliveryModalInvoice.no);

    const dispatchItems: DeliveryItem[] = [];
    let hasQty = false;

    for (const it of statusObj.itemStatuses) {
      const input = deliveryDispatchInputs[it.productId] || { box: '0', piece: '0', sft: '0' };
      const b = parseNum(input.box);
      const pc = parseNum(input.piece);

      if (b > it.remainingBox || (b === it.remainingBox && pc > it.remainingPiece)) {
        alert(
          `পণ্য '${it.name}' এর অবশিষ্ট বাকি আছে ${it.remainingBox} বক্স ${it.remainingPiece} পিস। এর চেয়ে বেশি ডেলিভারি দেওয়া সম্ভব নয়।`
        );
        return;
      }

      if (b > 0 || pc > 0) {
        hasQty = true;
        const prod = products.find((pr) => pr.id === it.productId);
        let sft = 0;
        if (prod && prod.isTile) {
          sft = b * (prod.sftPack || 0) + (prod.qtyPack > 0 ? (pc * (prod.sftPack || 0)) / prod.qtyPack : 0);
          sft = Math.round(sft * 100) / 100;
        }
        dispatchItems.push({
          productId: it.productId,
          name: it.name,
          dim: it.dim,
          box: b,
          piece: pc,
          sft,
          isTile: it.isTile,
        });
      }
    }

    if (!hasQty) {
      alert('কমপক্ষে একটি পণ্যের ডেলিভারি বক্স বা পিস সংখ্যা দিন।');
      return;
    }

    const tripIndex = statusObj.dispatchesCount + 1;
    const challanNo = `CH-${deliveryModalInvoice.no}-${tripIndex}`;
    const deliveryChallan: DeliveryChallan = {
      id: StorageService.nextDeliveryChallanId(),
      challanNo,
      invoiceNo: deliveryModalInvoice.no,
      custId: deliveryModalInvoice.custId,
      custName: deliveryModalInvoice.custName,
      address: deliveryModalInvoice.address,
      phone: deliveryModalInvoice.phone,
      deal: deliveryModalInvoice.deal,
      date: new Date().toISOString().replace('T', ' ').slice(0, 19),
      vehicleNo: vehicleNo.trim() || '—',
      driverName: driverName.trim() || '—',
      driverPhone: driverPhone.trim() || '—',
      note: deliveryNote.trim(),
      dispatchedBy: StorageService.getCurrentUser().name,
      items: dispatchItems,
    };

    StorageService.addDeliveryChallan(deliveryChallan);
    onStockUpdated();
    setDeliveryModalInvoice(null);
    showMsg(`চালান ${challanNo} সফলভাবে ডেলিভারি ও স্টক আউট হয়েছে!`);

    // Open delivery slip print
    onOpenPrintModal({
      isOpen: true,
      type: 'delivery_challan',
      deliveryChallan,
    });
  };

  const deliveryChallansHistory = StorageService.getDeliveryChallans();
  const stockInHistory = StorageService.getStockInRecords();

  // Pending challans: all invoices with delivery status
  const pendingInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const statusObj = StorageService.getInvoiceDeliveryStatus(inv.no);
    const matchesSearch =
      !q ||
      String(inv.no).includes(q) ||
      inv.custName.toLowerCase().includes(q) ||
      inv.phone.includes(q) ||
      inv.deal.toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 text-xs">
      {/* Top Header & Sub-Navigation */}
      <div className="bg-white border border-slate-300 rounded-lg p-3 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-700" />
          <div>
            <h2 className="font-bold text-sm text-slate-800">
              ইনভেন্টরি স্টক ও চালান ডেলিভারি সিস্টেম (Stock In / Stock Out & Challan Delivery)
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              ভেঙ্গে ভেঙ্গে ডেলিভারি, ১-ক্লিকে ফুল চালান ডেলিভারি ও ভেন্ডর স্টক ইন
            </p>
          </div>
        </div>

        {feedbackMsg && (
          <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-300 font-semibold flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {feedbackMsg}
          </span>
        )}

        {/* Sub Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSubTab('pending_challan')}
            className={`px-3 py-1.5 rounded font-bold cursor-pointer transition flex items-center gap-1.5 ${
              subTab === 'pending_challan'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            পেন্ডিং চালান ও ডেলিভারি ({invoices.filter((i) => StorageService.getInvoiceDeliveryStatus(i.no).status !== 'delivered').length})
          </button>
          <button
            onClick={() => setSubTab('stock_in')}
            className={`px-3 py-1.5 rounded font-bold cursor-pointer transition flex items-center gap-1.5 ${
              subTab === 'stock_in'
                ? 'bg-cyan-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            স্টক ইন (Vendor Purchase)
          </button>
          <button
            onClick={() => setSubTab('overview')}
            className={`px-3 py-1.5 rounded font-bold cursor-pointer transition flex items-center gap-1.5 ${
              subTab === 'overview'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            বর্তমান স্টক খতিয়ান (Stock Overview)
          </button>
          <button
            onClick={() => setSubTab('challan_history')}
            className={`px-3 py-1.5 rounded font-bold cursor-pointer transition flex items-center gap-1.5 ${
              subTab === 'challan_history'
                ? 'bg-indigo-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            ডেলিভারি চালান ইতিহাস ({deliveryChallansHistory.length})
          </button>
        </div>
      </div>

      {/* ================= SUB-TAB 1: PENDING CHALLANS & DELIVERY QUEUE ================= */}
      {subTab === 'pending_challan' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="চালান নং, গ্রাহক, ফোন বা ডিলার দিয়ে খুঁজুন..."
                className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1.5 text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> পেন্ডিং / আংশিক ডেলিভারি
              </span>
              <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> সম্পূর্ণ ডেলিভারি সম্পন্ন
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 text-center w-14">Invoice</th>
                  <th className="p-2 w-28">তারিখ</th>
                  <th className="p-2">গ্রাহকের নাম ও মোবাইল</th>
                  <th className="p-2">Cust. Deal</th>
                  <th className="p-2 text-center w-36">ডেলিভারি স্ট্যাটাস</th>
                  <th className="p-2 text-right w-36">অর্ডার / ডেলিভারি / বাকি</th>
                  <th className="p-2 text-center w-52">ডেলিভারি অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingInvoices.map((inv) => {
                  const statusObj = StorageService.getInvoiceDeliveryStatus(inv.no);
                  const isDelivered = statusObj.isFullyDelivered;
                  return (
                    <tr
                      key={inv.no}
                      className={`hover:bg-slate-50 transition ${
                        isDelivered ? 'bg-slate-50/60 opacity-80' : ''
                      }`}
                    >
                      <td className="p-2 text-center font-mono font-bold text-slate-900">
                        #{inv.no}
                      </td>
                      <td className="p-2 font-mono text-slate-600">{inv.date?.slice(0, 10)}</td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{inv.custName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{inv.phone || inv.address || '—'}</div>
                      </td>
                      <td className="p-2">
                        {inv.deal ? (
                          <span className="font-semibold text-slate-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {inv.deal}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {isDelivered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> ডেলিভারি সম্পন্ন ({statusObj.dispatchesCount} বার)
                          </span>
                        ) : statusObj.status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3" /> আংশিক ডেলিভারি ({statusObj.dispatchesCount} ট্রিপ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            পেন্ডিং (অপেক্ষমাণ)
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono text-[11px]">
                        <div>অর্ডার: <strong className="text-slate-900">{statusObj.orderedTotalBox}B / {statusObj.orderedTotalPiece}P</strong></div>
                        <div className="text-emerald-700">ডেলিভারি: <strong>{statusObj.deliveredTotalBox}B / {statusObj.deliveredTotalPiece}P</strong></div>
                        <div className="text-rose-700 font-bold">বাকি: <strong>{statusObj.remainingTotalBox}B / {statusObj.remainingTotalPiece}P</strong></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isDelivered && (
                            <>
                              <button
                                onClick={() => openDeliveryModal(inv)}
                                disabled={!canDispatch}
                                title={!canDispatch ? 'এডমিন কর্তৃক চালান ডেলিভারি ডিসপ্যাচ পারমিশন বন্ধ' : 'ভেঙ্গে আংশিক ডেলিভারি চালান'}
                                className={`px-2.5 py-1 rounded font-bold transition text-[11px] flex items-center gap-1 ${
                                  canDispatch
                                    ? 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-xs'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {canDispatch ? <Truck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                ভেঙ্গে ডেলিভারি
                              </button>
                              <button
                                onClick={() => handleFullDeliveryInstant(inv)}
                                disabled={!canDispatch}
                                title={!canDispatch ? 'এডমিন কর্তৃক চালান ডেলিভারি ডিসপ্যাচ পারমিশন বন্ধ' : '১ ক্লিকে সম্পূর্ণ চালান ডেলিভারি'}
                                className={`px-2.5 py-1 rounded font-bold transition text-[11px] ${
                                  canDispatch
                                    ? 'bg-cyan-800 hover:bg-cyan-700 text-white cursor-pointer shadow-xs'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                ফুল ডেলিভারি
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              onOpenPrintModal({
                                isOpen: true,
                                type: 'challan',
                                invoice: inv,
                              });
                            }}
                            title="চালান প্রিন্ট"
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pendingInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      কোনো পেন্ডিং চালান পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: STOCK IN (VENDOR PURCHASE) ================= */}
      {subTab === 'stock_in' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-cyan-800" />
                <h3 className="font-bold text-sm text-slate-800">
                  নতুন স্টক ইন এন্ট্রি (Stock In / Vendor Purchase Entry)
                </h3>
              </div>
              <span className="text-slate-500 text-[11px]">
                ভেন্ডরের মালামাল গ্রহণ ও স্টক বৃদ্ধি
              </span>
            </div>

            {/* Vendor & Challan info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-semibold">ভেন্ডর / সরবরাহকারী : *</label>
                  <span className="text-[10px] text-cyan-800 font-bold">অটোমেটিক তালিকা</span>
                </div>
                
                {/* Automatic Vendor Selector Dropdown */}
                <select
                  value={registeredVendors.includes(vendorName) ? vendorName : ''}
                  onChange={(e) => {
                    if (e.target.value) setVendorName(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-900 focus:border-cyan-700 focus:outline-hidden text-xs"
                >
                  <option value="">-- ভেন্ডরের তালিকা থেকে বাছুন --</option>
                  {registeredVendors.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>

                {/* Direct edit or custom vendor typing input */}
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="বা সরাসরি ভেন্ডরের নাম লিখুন..."
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-medium placeholder:text-slate-400"
                />

                {/* Quick selection chips */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {registeredVendors.slice(0, 5).map((v) => {
                    const shortName = v.split(' ')[0] || v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVendorName(v)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition cursor-pointer ${
                          vendorName === v
                            ? 'bg-cyan-700 text-white border-cyan-800 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ভেন্ডর চালান নম্বর (Challan No) :</label>
                <input
                  type="text"
                  value={vendorChallanNo}
                  onChange={(e) => setVendorChallanNo(e.target.value)}
                  placeholder="e.g. CH-9901"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">রেফারেন্স / PO নম্বর :</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. PO-2026-08"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">স্টক ইন তারিখ :</label>
                <input
                  type="date"
                  value={stockInDate}
                  onChange={(e) => setStockInDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-slate-700 font-semibold mb-1">মন্তব্য / গোডাউনের স্থান (Note) :</label>
                <input
                  type="text"
                  value={stockInNote}
                  onChange={(e) => setStockInNote(e.target.value)}
                  placeholder="e.g. প্রধান গোডাউন তাক নং ৩"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                />
              </div>
            </div>

            {/* Item add row for stock in */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3">
              <span className="font-bold text-slate-800 block mb-2 text-xs">স্টক ইন পণ্য যোগ করুন:</span>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-600 mb-0.5 flex items-center justify-between">
                    <span>পণ্য নির্বাচন (Product) :</span>
                    <span className="text-[10px] text-slate-500 font-normal">কিবোর্ডে টাইপ করে সাজেশান পান</span>
                  </label>
                  <ProductSearchSelect
                    products={products}
                    selectedProductId={inProdId}
                    onSelectProduct={(p) => handleSelectStockInProduct(p ? String(p.id) : '')}
                    placeholder="কিবোর্ডে পণ্য কোড/নাম লিখুন..."
                  />
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-slate-600 mb-0.5 text-center">বক্স</label>
                  <input
                    type="text"
                    value={inBox}
                    onChange={(e) => {
                      setInBox(e.target.value);
                      const p = products.find((pr) => pr.id === Number(inProdId));
                      if (p) calcStockInTotal(p, parseNum(e.target.value), parseNum(inPiece), parseNum(inRate));
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-center font-mono"
                  />
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-slate-600 mb-0.5 text-center">পিস</label>
                  <input
                    type="text"
                    value={inPiece}
                    onChange={(e) => {
                      setInPiece(e.target.value);
                      const p = products.find((pr) => pr.id === Number(inProdId));
                      if (p) calcStockInTotal(p, parseNum(inBox), parseNum(e.target.value), parseNum(inRate));
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-center font-mono"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-slate-600 mb-0.5 text-center">SFT</label>
                  <input
                    type="text"
                    value={inSft}
                    onChange={(e) => setInSft(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-center font-mono font-semibold"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-slate-600 mb-0.5 text-center">ক্রয় দর (Rate)</label>
                  <input
                    type="text"
                    value={inRate}
                    onChange={(e) => {
                      setInRate(e.target.value);
                      const p = products.find((pr) => pr.id === Number(inProdId));
                      if (p) calcStockInTotal(p, parseNum(inBox), parseNum(inPiece), parseNum(e.target.value));
                    }}
                    placeholder="0.00"
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-right font-mono font-bold"
                  />
                </div>

                <div className="col-span-8 sm:col-span-1">
                  <label className="block text-slate-600 mb-0.5 text-center">মোট (৳)</label>
                  <div className="w-full bg-slate-200 border border-slate-300 rounded px-1 py-1 text-right font-mono font-bold text-slate-900 truncate">
                    {inTotal}
                  </div>
                </div>

                <div className="col-span-4 sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddStockInItem}
                    className="w-full bg-cyan-800 hover:bg-cyan-700 text-white rounded py-1 font-bold cursor-pointer transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Added stock in items table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 text-center w-8">SL</th>
                    <th className="p-2">পণ্যের নাম</th>
                    <th className="p-2 text-center w-20">মাপ</th>
                    <th className="p-2 text-center w-16">Box</th>
                    <th className="p-2 text-center w-16">Piece</th>
                    <th className="p-2 text-right w-20">SFT</th>
                    <th className="p-2 text-right w-24">ক্রয় দর</th>
                    <th className="p-2 text-right w-28">মোট টাকা</th>
                    <th className="p-2 text-center w-12">মুছুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockInItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-medium text-slate-900">{it.name}</td>
                      <td className="p-2 text-center font-mono text-[11px]">{it.dim}</td>
                      <td className="p-2 text-center font-mono font-bold text-cyan-900">{formatQty(it.box)}</td>
                      <td className="p-2 text-center font-mono font-bold text-cyan-900">{formatQty(it.piece)}</td>
                      <td className="p-2 text-right font-mono font-semibold">{(it.isTile ? it.sft : it.piece).toFixed(2)}</td>
                      <td className="p-2 text-right font-mono">{formatMoney(it.rate)}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{formatMoney(it.total)}</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => setStockInItems(stockInItems.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stockInItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        উপরে পণ্য ও পরিমাণ নির্বাচন করে 'Add' বাটনে চাপুন
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {stockInItems.length > 0 && (
                <div className="p-3 bg-slate-100 border-t border-slate-300 flex justify-between items-center text-xs font-mono font-bold text-slate-900">
                  <span>মোট আইটেম: {stockInItems.length} টি</span>
                  <span className="text-cyan-950 text-sm">
                    সর্বমোট স্টক ইন মূল্য: ৳ {formatMoney(stockInItems.reduce((s, it) => s + (it.total || 0), 0))}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveStockIn}
                className="px-6 py-2.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded font-bold cursor-pointer transition shadow-md flex items-center gap-2 text-xs"
              >
                <Check className="w-4 h-4" />
                স্টক ইন নিশ্চিত করুন (Save & Add to Stock)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: STOCK OVERVIEW ================= */}
      {subTab === 'overview' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-700" />
              রিয়েল-টাইম পণ্য স্টক খতিয়ান (Live Inventory Stock)
            </h3>
            <span className="text-slate-500 font-semibold">
              মোট পণ্য: {products.length} টি
            </span>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 text-center w-16">PID</th>
                  <th className="p-2">Product Code & Name</th>
                  <th className="p-2">Category</th>
                  <th className="p-2 text-center w-20">মাপ (Dim)</th>
                  <th className="p-2 text-center w-24">বর্তমান স্টক (Box)</th>
                  <th className="p-2 text-center w-24">বর্তমান স্টক (Pcs)</th>
                  <th className="p-2 text-right w-24">মোট স্টক SFT</th>
                  <th className="p-2 text-right w-24">বিক্রয় মূল্য</th>
                  <th className="p-2 text-center w-28">স্টক স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const sBox = p.stockBox || 0;
                  const sPc = p.stockPiece || 0;
                  const sSft = p.stockSft || 0;
                  const isLow = p.isTile ? sBox < 10 : sPc < 5;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-2 text-center font-mono font-bold text-slate-700">{p.id}</td>
                      <td className="p-2 font-bold text-slate-900">{p.name}</td>
                      <td className="p-2 text-slate-600">{p.category || '—'}</td>
                      <td className="p-2 text-center font-mono text-[11px] text-slate-600">
                        {p.isTile ? `${formatQty(p.w)} X ${formatQty(p.h)}` : '—'}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800 text-sm">
                        {sBox}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800 text-sm">
                        {sPc}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold text-slate-900">
                        {sSft.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold text-slate-800">
                        ৳ {formatMoney(p.price)}
                      </td>
                      <td className="p-2 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3" /> কম স্টক (Low)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            পর্যাপ্ত (Available)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 4: DELIVERY CHALLANS HISTORY ================= */}
      {subTab === 'challan_history' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-700" />
              ডেলিভারি চালান ও ট্রিপ ইতিহাস (Dispatched Challans Log)
            </h3>
            <span className="text-slate-500 font-semibold">
              মোট চালান: {deliveryChallansHistory.length} টি
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 text-center w-28">Challan No</th>
                  <th className="p-2 text-center w-20">Invoice</th>
                  <th className="p-2 w-32">তারিখ</th>
                  <th className="p-2">গ্রাহকের নাম ও ঠিকানা</th>
                  <th className="p-2">Cust. Deal</th>
                  <th className="p-2">গাড়ি ও ড্রাইভার</th>
                  <th className="p-2 text-right w-28">ডেলিভারি পরিমাণ</th>
                  <th className="p-2 text-center w-20">প্রিন্ট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryChallansHistory.map((ch) => {
                  const totBox = ch.items.reduce((s, it) => s + (it.box || 0), 0);
                  const totPc = ch.items.reduce((s, it) => s + (it.piece || 0), 0);
                  const totSft = ch.items.reduce((s, it) => s + (it.sft || 0), 0);

                  return (
                    <tr key={ch.id} className="hover:bg-slate-50 transition">
                      <td className="p-2 text-center font-mono font-bold text-emerald-900">
                        {ch.challanNo}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-slate-700">
                        #{ch.invoiceNo}
                      </td>
                      <td className="p-2 font-mono text-slate-600">{ch.date?.slice(0, 16)}</td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{ch.custName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{ch.address || ch.phone || '—'}</div>
                      </td>
                      <td className="p-2 font-medium text-slate-700">{ch.deal || '—'}</td>
                      <td className="p-2 text-slate-700">
                        <div>{ch.vehicleNo || '—'}</div>
                        <div className="text-[11px] text-slate-500">{ch.driverName}</div>
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">
                        {totBox} Box, {totPc} Pcs <br />
                        <span className="text-[10px] text-slate-500 font-normal">({totSft.toFixed(2)} Sft)</span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => {
                            onOpenPrintModal({
                              isOpen: true,
                              type: 'delivery_challan',
                              deliveryChallan: ch,
                            });
                          }}
                          className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded font-bold cursor-pointer transition shadow-xs inline-flex items-center gap-1 text-[11px]"
                        >
                          <Printer className="w-3 h-3" />
                          চালান
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {deliveryChallansHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      কোনো ডেলিভারি চালান ইতিহাস নেই
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SPLIT DELIVERY MODAL (ভেঙ্গে ভেঙ্গে ডেলিভারি চালান) ================= */}
      {deliveryModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="px-4 py-3 bg-emerald-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  ভেঙ্গে ডেলিভারি চালান তৈরি (Split Delivery - Invoice #{deliveryModalInvoice.no})
                </h3>
              </div>
              <button
                onClick={() => setDeliveryModalInvoice(null)}
                className="p-1 hover:bg-emerald-700 rounded text-emerald-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">গ্রাহকের নাম:</span>
                  <strong className="text-slate-900">{deliveryModalInvoice.custName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">মোবাইল:</span>
                  <span className="font-mono text-slate-800">{deliveryModalInvoice.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Cust. Deal:</span>
                  <span className="font-semibold text-slate-800">{deliveryModalInvoice.deal || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">মোট বিল:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ৳ {formatMoney(StorageService.getInvoiceTotals(deliveryModalInvoice).sub2)}
                  </span>
                </div>
              </div>

              {/* Delivery Items Input Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="p-2 bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-xs">
                  পণ্যভিত্তিক ডেলিভারি পরিমাণ নির্ধারণ করুন (আজকের ট্রিপে কতটুকু মাল দিচ্ছেন):
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2">পণ্যের নাম</th>
                      <th className="p-2 text-center w-24">অর্ডারকৃত</th>
                      <th className="p-2 text-center w-24">ইতিপূর্বে ডেলিভারি</th>
                      <th className="p-2 text-center w-24 text-rose-700">বাকি আছে</th>
                      <th className="p-2 text-center w-28 bg-emerald-50 text-emerald-900">বর্তমান ট্রিপে (Box)</th>
                      <th className="p-2 text-center w-28 bg-emerald-50 text-emerald-900">বর্তমান ট্রিপে (Pcs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {StorageService.getInvoiceDeliveryStatus(deliveryModalInvoice.no).itemStatuses.map((it) => {
                      const inp = deliveryDispatchInputs[it.productId] || { box: '0', piece: '0', sft: '0' };
                      return (
                        <tr key={it.productId} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-900">
                            {it.name}
                            <span className="block text-[10px] text-slate-500 font-mono">{it.dim}</span>
                          </td>
                          <td className="p-2 text-center font-mono">{it.orderedBox}B / {it.orderedPiece}P</td>
                          <td className="p-2 text-center font-mono text-emerald-800">{it.deliveredBox}B / {it.deliveredPiece}P</td>
                          <td className="p-2 text-center font-mono font-bold text-rose-700">{it.remainingBox}B / {it.remainingPiece}P</td>
                          <td className="p-2 text-center bg-emerald-50/50">
                            <input
                              type="number"
                              min="0"
                              max={it.remainingBox}
                              value={inp.box}
                              onChange={(e) => {
                                setDeliveryDispatchInputs({
                                  ...deliveryDispatchInputs,
                                  [it.productId]: { ...inp, box: e.target.value },
                                });
                              }}
                              className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 text-center font-mono font-bold text-emerald-900"
                            />
                          </td>
                          <td className="p-2 text-center bg-emerald-50/50">
                            <input
                              type="number"
                              min="0"
                              max={it.remainingPiece}
                              value={inp.piece}
                              onChange={(e) => {
                                setDeliveryDispatchInputs({
                                  ...deliveryDispatchInputs,
                                  [it.productId]: { ...inp, piece: e.target.value },
                                });
                              }}
                              className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 text-center font-mono font-bold text-emerald-900"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vehicle & Driver details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-0.5">গাড়ি নম্বর (Vehicle No) :</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. ঢাকা মেট্রো-ন ১২-৩৪৫৬"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-0.5">ড্রাইভার / ডেলিভারিম্যান :</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="ড্রাইভারের নাম"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-0.5">ড্রাইভারের মোবাইল :</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="মোবাইল নম্বর"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-slate-800"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-semibold mb-0.5">ডেলিভারি নোট :</label>
                  <input
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="e.g. সাইটে মালামাল আনলোড করার নির্দেশনা"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-100 border-t border-slate-300 flex justify-end gap-2">
              <button
                onClick={() => setDeliveryModalInvoice(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleConfirmSplitDelivery}
                className="px-5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer shadow-sm transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                ডেলিভারি চালান তৈরি ও স্টক আউট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
