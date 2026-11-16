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
import { FirestoreSyncService } from '../services/firestoreSync';
import { formatMoney, formatQty, parseNum, formatDateBangla, formatDateTimeBangla, getTodayLocalDateStr, getNowLocalTimeStr, getNowLocalDateTimeStr } from '../utils/numberWords';
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
  Trash2,
  History,
  MinusCircle,
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
    reportData?: any;
  }) => void;
  currentUser?: AppUser;
  permissions?: StaffPermissions;
  onDeletePendingChallan?: (invoiceNo: number) => void;
  onDeleteDeliveryChallan?: (challanId: number) => void;
  onRequireAdminAuth?: (actionTitle: string, onExecute: () => void, actionDetails?: string) => void;
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  products,
  invoices,
  shop,
  onStockUpdated,
  onOpenPrintModal,
  currentUser,
  permissions,
  onDeletePendingChallan,
  onDeleteDeliveryChallan,
  onRequireAdminAuth,
}) => {
  const [subTab, setSubTab] = useState<
    'overview' | 'stock_in' | 'stock_out' | 'pending_challan' | 'challan_history' | 'product_history'
  >('pending_challan');

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');

  // ================= Stock In State =================
  const [vendorName, setVendorName] = useState('');
  const [vendorChallanNo, setVendorChallanNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [stockInDate, setStockInDate] = useState(getTodayLocalDateStr());
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

  // ================= Manual Stock Out State =================
  const [manualRefInput, setManualRefInput] = useState(() => `M-${StorageService.nextDeliveryChallanId()}`);
  const [manualOutDate, setManualOutDate] = useState(getTodayLocalDateStr());
  const [manualOutRecipient, setManualOutRecipient] = useState('');
  const [manualOutNote, setManualOutNote] = useState('');
  const [manualOutItems, setManualOutItems] = useState<DeliveryItem[]>([]);
  const [outProdId, setOutProdId] = useState('');
  const [outBox, setOutBox] = useState('');
  const [outPiece, setOutPiece] = useState('');
  const [outSft, setOutSft] = useState('');
  const [manualOutError, setManualOutError] = useState('');

  // ================= Stock Product History Filter State =================
  const [historyProdId, setHistoryProdId] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'in' | 'challan_out' | 'manual_out'>('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [deleteChallanTarget, setDeleteChallanTarget] = useState<Invoice | null>(null);
  const [deleteDeliveryHistoryTarget, setDeleteDeliveryHistoryTarget] = useState<DeliveryChallan | null>(null);
  const [storageTick, setStorageTick] = useState(0);

  React.useEffect(() => {
    const onUpdate = () => setStorageTick((t) => t + 1);
    window.addEventListener('app-storage-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('app-storage-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  const canDispatch = currentUser?.role === 'admin' || (permissions ? permissions.canDispatchDelivery : true);
  const canStockIn = currentUser?.role === 'admin' || (permissions ? permissions.canStockIn : true);
  const canDeletePending =
    currentUser?.role === 'admin' || Boolean(permissions?.canDeletePendingChallan);
  const canDeleteDeliveryHistory =
    currentUser?.role === 'admin' || Boolean(permissions?.canDeleteDeliveryChallan);

  const showMsg = (msg: string) => {
    setActionErrorMsg('');
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 5500);
  };

  const showErrorMsg = (msg: string) => {
    setFeedbackMsg('');
    setActionErrorMsg(msg);
    setTimeout(() => setActionErrorMsg(''), 7000);
  };

  const executeDeletePendingChallan = (inv: Invoice) => {
    if (onDeletePendingChallan) {
      onDeletePendingChallan(inv.no);
    } else {
      const updated = StorageService.getInvoices().filter((i) => i.no !== inv.no);
      StorageService.saveInvoices(updated);
      FirestoreSyncService.syncDeleteInvoice(inv.no).catch(console.error);
      FirestoreSyncService.syncDeleteDeliveryChallansByInvoice(inv.no).catch(console.error);
    }
    setDeleteChallanTarget(null);
    onStockUpdated();
    showMsg(`পেন্ডিং চালান #${inv.no} সফলভাবে মুছে ফেলা হয়েছে!`);
  };

  const handleDeletePendingChallanClick = (inv: Invoice) => {
    if (canDeletePending) {
      setDeleteChallanTarget(inv);
    } else if (onRequireAdminAuth) {
      onRequireAdminAuth(
        `পেন্ডিং চালান #${inv.no} মুছে ফেলা`,
        () => executeDeletePendingChallan(inv),
        `গ্রাহক: ${inv.custName} | তারিখ: ${inv.date?.slice(0, 10)}`
      );
    }
  };

  const executeDeleteDeliveryHistory = (ch: DeliveryChallan) => {
    if (onDeleteDeliveryChallan) {
      onDeleteDeliveryChallan(ch.id);
    } else {
      FirestoreSyncService.syncDeleteDeliveryChallan(ch.id).catch(console.error);
      onStockUpdated();
    }
    setDeleteDeliveryHistoryTarget(null);
    showMsg(`ডেলিভারি চালান ${ch.challanNo} মুছে ফেলা হয়েছে এবং স্টক সমন্বয় করা হয়েছে!`);
  };

  const handleDeleteDeliveryHistoryClick = (ch: DeliveryChallan) => {
    if (canDeleteDeliveryHistory) {
      setDeleteDeliveryHistoryTarget(ch);
    } else if (onRequireAdminAuth) {
      onRequireAdminAuth(
        `ডেলিভারি চালান ${ch.challanNo} মুছে ফেলা`,
        () => executeDeleteDeliveryHistory(ch),
        `ইনভয়েস #${ch.invoiceNo} | গ্রাহক: ${ch.custName}`
      );
    }
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
      showErrorMsg('পণ্য নির্বাচন করুন।');
      return;
    }
    const b = parseNum(inBox);
    const pc = parseNum(inPiece);
    if (b <= 0 && pc <= 0) {
      showErrorMsg('বক্স বা পিস সংখ্যা দিন।');
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
    setActionErrorMsg('');
  };

  const handleSaveStockIn = () => {
    if (!canStockIn) {
      showErrorMsg('এডমিন কর্তৃক স্টাফদের স্টক ইন এন্ট্রি করার পারমিশন বন্ধ রাখা হয়েছে।');
      return;
    }
    if (!vendorName.trim()) {
      showErrorMsg('ভেন্ডর / সরবরাহকারীর নাম দিন।');
      return;
    }
    if (stockInItems.length === 0) {
      showErrorMsg('কমপক্ষে একটি পণ্য স্টক ইন তালিকায় যোগ করুন।');
      return;
    }

    const totalAmt = stockInItems.reduce((s, it) => s + (it.total || 0), 0);
    const record: StockInRecord = {
      id: StorageService.nextStockInId(),
      vendorName: vendorName.trim(),
      vendorChallanNo: vendorChallanNo.trim() || '—',
      referenceNo: referenceNo.trim() || '—',
      date: `${stockInDate} ${getNowLocalTimeStr()}`,
      note: stockInNote.trim(),
      items: stockInItems,
      totalAmount: totalAmt,
      receivedBy: StorageService.getCurrentUser().name,
    };

    FirestoreSyncService.syncAddStockInRecord(record).catch(console.error);
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

  // ================= Manual Stock Out Helpers =================
  const selectedManualOutProd = products.find((pr) => pr.id === Number(outProdId));

  const handleSelectManualOutProduct = (pId: string) => {
    setManualOutError('');
    setOutProdId(pId);
    setOutBox('');
    setOutPiece('');
    setOutSft('');
  };

  const calcManualOutSft = (prod: Product, b: number, pc: number) => {
    if (prod.isTile) {
      const sft =
        b * (prod.sftPack || 0) + (prod.qtyPack > 0 ? (pc * (prod.sftPack || 0)) / prod.qtyPack : 0);
      setOutSft((Math.round(sft * 100) / 100).toFixed(2));
    } else {
      setOutSft('0.00');
    }
  };

  const handleAddManualOutItem = () => {
    setManualOutError('');
    const prod = products.find((pr) => pr.id === Number(outProdId));
    if (!prod) {
      setManualOutError('তালিকা থেকে সঠিক পণ্য নির্বাচন করুন।');
      return;
    }
    if (manualOutItems.some((it) => it.productId === prod.id)) {
      setManualOutError(`"${prod.name}" ইতিমধ্যে ম্যানুয়াল স্টক আউট তালিকায় যোগ করা আছে।`);
      return;
    }
    const b = parseNum(outBox);
    const pc = parseNum(outPiece);
    if (b <= 0 && pc <= 0) {
      setManualOutError('বক্স বা পিস সংখ্যা দিন।');
      return;
    }

    const avail = StorageService.getAvailableProductStock(prod);
    if (!avail.hasStock) {
      setManualOutError(`পণ্য "${prod.name}" বর্তমানে স্টকে নেই (০ স্টক) — স্টক আউট করা যাবে না।`);
      return;
    }

    if (prod.isTile && (prod.qtyPack || 0) > 0) {
      const reqPcs = b * prod.qtyPack + pc;
      if (reqPcs > avail.totalPieces) {
        setManualOutError(
          `পণ্য "${prod.name}" এর বর্তমান স্টক আছে ${avail.stockBox} বক্স ${avail.stockPiece} পিস। এর চেয়ে বেশি স্টক আউট করা যাবে না।`
        );
        return;
      }
    } else if (b > avail.stockBox || pc > avail.stockPiece) {
      setManualOutError(
        `পণ্য "${prod.name}" এর বর্তমান স্টক আছে ${avail.stockBox} বক্স ${avail.stockPiece} পিস। এর চেয়ে বেশি স্টক আউট করা যাবে না।`
      );
      return;
    }

    const finalSft = prod.isTile ? parseNum(outSft) : 0;
    const newItem: DeliveryItem = {
      productId: prod.id,
      name: prod.name,
      dim: prod.isTile ? `${prod.w.toFixed(2)} X ${prod.h.toFixed(2)}` : '0.00 X 0.00',
      box: b,
      piece: pc,
      sft: finalSft,
      isTile: prod.isTile,
    };

    setManualOutItems([...manualOutItems, newItem]);
    setOutProdId('');
    setOutBox('');
    setOutPiece('');
    setOutSft('');
  };

  const handleSaveManualStockOut = () => {
    setManualOutError('');
    if (!canDispatch) {
      setManualOutError('এডমিন কর্তৃক স্টাফদের স্টক আউট / ডেলিভারি পারমিশন বন্ধ রাখা হয়েছে।');
      return;
    }
    const trimmedRef = manualRefInput.trim();
    if (!trimmedRef) {
      setManualOutError('ম্যানুয়াল নম্বর / স্লিপ নম্বর দিন (যেমন: M-101 বা 501)।');
      return;
    }
    if (manualOutItems.length === 0) {
      setManualOutError('কমপক্ষে একটি পণ্য ম্যানুয়াল স্টক আউট তালিকায় যোগ করুন।');
      return;
    }

    // Double-check live stock before committing
    for (const it of manualOutItems) {
      const prod = products.find((p) => p.id === it.productId);
      const avail = StorageService.getAvailableProductStock(prod);
      if (!prod || !avail.hasStock) {
        setManualOutError(`পণ্য "${it.name}" বর্তমানে স্টকে নেই।`);
        return;
      }
      if (prod.isTile && (prod.qtyPack || 0) > 0) {
        const reqPcs = it.box * prod.qtyPack + it.piece;
        if (reqPcs > avail.totalPieces) {
          setManualOutError(
            `পণ্য "${it.name}" এর বর্তমান স্টক (${avail.stockBox}B / ${avail.stockPiece}P) পর্যাপ্ত নয়।`
          );
          return;
        }
      } else if (it.box > avail.stockBox || it.piece > avail.stockPiece) {
        setManualOutError(
          `পণ্য "${it.name}" এর বর্তমান স্টক (${avail.stockBox}B / ${avail.stockPiece}P) পর্যাপ্ত নয়।`
        );
        return;
      }
    }

    const nextId = StorageService.nextDeliveryChallanId();
    const challanCode = trimmedRef.toUpperCase().startsWith('MAN') ? trimmedRef : `MAN-${trimmedRef}`;
    const manualChallan: DeliveryChallan = {
      id: nextId,
      challanNo: challanCode,
      outType: 'manual',
      manualRefNo: trimmedRef,
      invoiceNo: 0,
      custId: 0,
      custName: manualOutRecipient.trim() || 'ম্যানুয়াল স্টক আউট',
      address: '',
      phone: '',
      deal: '',
      date: `${manualOutDate} ${getNowLocalTimeStr()}`,
      vehicleNo: 'ম্যানুয়াল স্টক আউট',
      note: manualOutNote.trim(),
      dispatchedBy: StorageService.getCurrentUser().name,
      items: manualOutItems,
    };

    FirestoreSyncService.syncAddDeliveryChallan(manualChallan).catch(console.error);
    onStockUpdated();
    showMsg(`ম্যানুয়াল স্টক আউট #${trimmedRef} সফলভাবে সম্পন্ন ও স্টক মাইনাস হয়েছে!`);

    // Reset manual form
    setManualRefInput(`M-${StorageService.nextDeliveryChallanId()}`);
    setManualOutRecipient('');
    setManualOutNote('');
    setManualOutItems([]);

    onOpenPrintModal({
      isOpen: true,
      type: 'delivery_challan',
      deliveryChallan: manualChallan,
    });
  };

  // ================= Split & Full Delivery Handlers (Live Stock Validated) =================
  const openDeliveryModal = (inv: Invoice) => {
    if (!canDispatch) {
      showErrorMsg('এডমিন কর্তৃক স্টাফদের চালান ডেলিভারি ডিসপ্যাচ করার পারমিশন বন্ধ রাখা হয়েছে।');
      return;
    }
    setModalErrorMsg('');
    const statusObj = StorageService.getInvoiceDeliveryStatus(inv.no);
    const inputs: { [productId: number]: { box: string; piece: string; sft: string } } = {};
    statusObj.itemStatuses.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const disp = StorageService.computeDispatchableForRemaining(
        prod,
        it.remainingBox || 0,
        it.remainingPiece || 0,
        it.remainingSft || 0
      );
      inputs[it.productId] = {
        box: String(disp.dispatchBox || 0),
        piece: String(disp.dispatchPiece || 0),
        sft: String(disp.dispatchSft || 0),
      };
    });

    setDeliveryDispatchInputs(inputs);
    setDeliveryModalInvoice(inv);
    setVehicleNo('');
    setDriverName('');
    setDriverPhone('');
    setDeliveryNote('');
  };

  // 1-Click Full Delivery directly from table (only dispatches in-stock quantities; out-of-stock stay pending)
  const handleFullDeliveryInstant = (inv: Invoice) => {
    if (!canDispatch) {
      showErrorMsg('এডমিন কর্তৃক স্টাফদের চালান ডেলিভারি ডিসপ্যাচ করার পারমিশন বন্ধ রাখা হয়েছে।');
      return;
    }
    const statusObj = StorageService.getInvoiceDeliveryStatus(inv.no);
    if (statusObj.isFullyDelivered) {
      return;
    }

    const dispatchItems: DeliveryItem[] = [];
    const pendingByNoStockNames: string[] = [];

    statusObj.itemStatuses
      .filter((it) => it.remainingBox > 0 || it.remainingPiece > 0)
      .forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const disp = StorageService.computeDispatchableForRemaining(
          prod,
          it.remainingBox,
          it.remainingPiece,
          it.remainingSft
        );
        if (disp.hasAnyStock && (disp.dispatchBox > 0 || disp.dispatchPiece > 0)) {
          dispatchItems.push({
            productId: it.productId,
            name: it.name,
            dim: it.dim,
            box: disp.dispatchBox,
            piece: disp.dispatchPiece,
            sft: disp.dispatchSft,
            isTile: it.isTile,
          });
          if (disp.isPartialByStock) {
            pendingByNoStockNames.push(`${it.name} (আংশিক স্টক)`);
          }
        } else {
          pendingByNoStockNames.push(it.name);
        }
      });

    if (dispatchItems.length === 0) {
      showErrorMsg(
        `চালান #${inv.no} এর কোনো পণ্যই বর্তমানে স্টকে নেই (${pendingByNoStockNames.join(', ')})। স্টকে না থাকা পর্যন্ত চালানটি পেন্ডিং ঘরেই থাকবে।`
      );
      return;
    }

    const tripIndex = statusObj.dispatchesCount + 1;
    const challanNo = `CH-${inv.no}-${tripIndex}`;
    const deliveryChallan: DeliveryChallan = {
      id: StorageService.nextDeliveryChallanId(),
      challanNo,
      outType: 'challan',
      invoiceNo: inv.no,
      custId: inv.custId,
      custName: inv.custName,
      address: inv.address,
      phone: inv.phone,
      deal: inv.deal,
      date: getNowLocalDateTimeStr(),
      vehicleNo: pendingByNoStockNames.length > 0 ? 'স্টক অনুযায়ী ডেলিভারি' : 'ফুল ডেলিভারি',
      note:
        pendingByNoStockNames.length > 0
          ? `স্টকে থাকা পণ্য ডেলিভারি করা হয়েছে; স্টক না থাকায় পেন্ডিং: ${pendingByNoStockNames.join(', ')}`
          : '১-ক্লিকে সম্পূর্ণ চালান ডেলিভারি সম্পন্ন',
      dispatchedBy: StorageService.getCurrentUser().name,
      items: dispatchItems,
    };

    FirestoreSyncService.syncAddDeliveryChallan(deliveryChallan).catch(console.error);
    onStockUpdated();
    if (pendingByNoStockNames.length > 0) {
      showMsg(
        `চালান ${challanNo} থেকে স্টকে থাকা পণ্যের স্টক মাইনাস ও ডেলিভারি হয়েছে। স্টকে না থাকায় পেন্ডিং এ আছে: ${pendingByNoStockNames.join(', ')}`
      );
    } else {
      showMsg(`চালান ${challanNo} সম্পূর্ণ ডেলিভারি সম্পন্ন ও স্টক আউট হয়েছে!`);
    }

    // Open delivery challan slip print
    onOpenPrintModal({
      isOpen: true,
      type: 'delivery_challan',
      deliveryChallan,
    });
  };

  // Confirm custom / split delivery from modal (enforces live stock!)
  const handleConfirmSplitDelivery = () => {
    if (!deliveryModalInvoice) return;
    setModalErrorMsg('');
    const statusObj = StorageService.getInvoiceDeliveryStatus(deliveryModalInvoice.no);

    const dispatchItems: DeliveryItem[] = [];
    let hasQty = false;

    for (const it of statusObj.itemStatuses) {
      const input = deliveryDispatchInputs[it.productId] || { box: '0', piece: '0', sft: '0' };
      const b = parseNum(input.box);
      const pc = parseNum(input.piece);

      if (b > it.remainingBox || (b === it.remainingBox && pc > it.remainingPiece)) {
        setModalErrorMsg(
          `পণ্য '${it.name}' এর অবশিষ্ট বাকি আছে ${it.remainingBox} বক্স ${it.remainingPiece} পিস। এর চেয়ে বেশি ডেলিভারি দেওয়া সম্ভব নয়।`
        );
        return;
      }

      if (b > 0 || pc > 0) {
        const prod = products.find((pr) => pr.id === it.productId);
        const avail = StorageService.getAvailableProductStock(prod);
        if (!prod || !avail.hasStock) {
          setModalErrorMsg(
            `পণ্য '${it.name}' বর্তমানে স্টকে নেই (০ স্টক)! এটি পেন্ডিং এ রেখে শুধুমাত্র স্টকে থাকা পণ্য ডেলিভারি দিন।`
          );
          return;
        }
        if (prod.isTile && (prod.qtyPack || 0) > 0) {
          const reqPcs = b * prod.qtyPack + pc;
          if (reqPcs > avail.totalPieces) {
            setModalErrorMsg(
              `পণ্য '${it.name}' এর বর্তমান স্টক আছে ${avail.stockBox} বক্স ${avail.stockPiece} পিস। স্টকের চেয়ে বেশি ডেলিভারি দেওয়া যাবে না (বাকিটা পেন্ডিং থাকবে)।`
            );
            return;
          }
        } else if (b > avail.stockBox || pc > avail.stockPiece) {
          setModalErrorMsg(
            `পণ্য '${it.name}' এর বর্তমান স্টক আছে ${avail.stockBox} বক্স ${avail.stockPiece} পিস। স্টকের চেয়ে বেশি ডেলিভারি দেওয়া যাবে না।`
          );
          return;
        }

        hasQty = true;
        let sft = 0;
        if (prod.isTile) {
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
      setModalErrorMsg('স্টকে থাকা কমপক্ষে একটি পণ্যের ডেলিভারি বক্স বা পিস সংখ্যা দিন (স্টকশূন্য পণ্য ০ রেখে পেন্ডিং এ থাকবে)।');
      return;
    }

    const tripIndex = statusObj.dispatchesCount + 1;
    const challanNo = `CH-${deliveryModalInvoice.no}-${tripIndex}`;
    const deliveryChallan: DeliveryChallan = {
      id: StorageService.nextDeliveryChallanId(),
      challanNo,
      outType: 'challan',
      invoiceNo: deliveryModalInvoice.no,
      custId: deliveryModalInvoice.custId,
      custName: deliveryModalInvoice.custName,
      address: deliveryModalInvoice.address,
      phone: deliveryModalInvoice.phone,
      deal: deliveryModalInvoice.deal,
      date: getNowLocalDateTimeStr(),
      vehicleNo: vehicleNo.trim() || '—',
      driverName: driverName.trim() || '—',
      driverPhone: driverPhone.trim() || '—',
      note: deliveryNote.trim(),
      dispatchedBy: StorageService.getCurrentUser().name,
      items: dispatchItems,
    };

    FirestoreSyncService.syncAddDeliveryChallan(deliveryChallan).catch(console.error);
    onStockUpdated();
    setDeliveryModalInvoice(null);
    showMsg(`চালান ${challanNo} সফলভাবে ডেলিভারি ও স্টক মাইনাস হয়েছে! (অবশিষ্ট পণ্য পেন্ডিং এ থাকবে)`);

    // Open delivery slip print
    onOpenPrintModal({
      isOpen: true,
      type: 'delivery_challan',
      deliveryChallan,
    });
  };

  const deliveryChallansHistory = React.useMemo(
    () => StorageService.getDeliveryChallans(),
    [invoices, products, storageTick]
  );
  const stockInHistory = React.useMemo(
    () => StorageService.getStockInRecords(),
    [products, storageTick]
  );

  // Unified Stock Product History Movements (Stock In + Challan Out + Manual Out)
  const productStockMovements = React.useMemo(() => {
    type Movement = {
      uid: string;
      date: string;
      kind: 'in' | 'challan_out' | 'manual_out';
      sourceLabel: string;
      refDisplay: string;
      productId: number;
      productName: string;
      productCode: string;
      partyName: string;
      note: string;
      box: number;
      piece: number;
      sft: number;
      userBy: string;
    };
    const list: Movement[] = [];

    stockInHistory.forEach((rec) => {
      (rec.items || []).forEach((it, idx) => {
        const prod = products.find((p) => p.id === it.productId);
        const refParts: string[] = [];
        if (rec.vendorChallanNo && rec.vendorChallanNo !== '—') refParts.push(`ভেন্ডর চালান: ${rec.vendorChallanNo}`);
        if (rec.referenceNo && rec.referenceNo !== '—') refParts.push(`PO: ${rec.referenceNo}`);
        list.push({
          uid: `in-${rec.id}-${idx}-${it.productId}`,
          date: rec.date || '',
          kind: 'in',
          sourceLabel: 'স্টক ইন (+)',
          refDisplay: refParts.length > 0 ? refParts.join(' | ') : `স্টক ইন #SI-${rec.id}`,
          productId: it.productId,
          productName: it.name || prod?.name || `#${it.productId}`,
          productCode: prod?.code || '',
          partyName: rec.vendorName || '—',
          note: rec.note || '',
          box: it.box || 0,
          piece: it.piece || 0,
          sft: it.sft || 0,
          userBy: rec.receivedBy || '—',
        });
      });
    });

    deliveryChallansHistory.forEach((ch) => {
      const isManual = ch.outType === 'manual' || ch.invoiceNo === 0;
      (ch.items || []).forEach((it, idx) => {
        const prod = products.find((p) => p.id === it.productId);
        list.push({
          uid: `out-${ch.id}-${idx}-${it.productId}`,
          date: ch.date || '',
          kind: isManual ? 'manual_out' : 'challan_out',
          sourceLabel: isManual ? 'ম্যানুয়াল আউট (-)' : 'চালান আউট (-)',
          refDisplay: isManual
            ? `ম্যানুয়াল নং: ${ch.manualRefNo || ch.challanNo}`
            : `চালান: ${ch.challanNo} (ইনভয়েস #${ch.invoiceNo})`,
          productId: it.productId,
          productName: it.name || prod?.name || `#${it.productId}`,
          productCode: prod?.code || '',
          partyName: isManual ? ch.custName || 'ম্যানুয়াল স্টক আউট' : `${ch.custName}${ch.deal ? ` (${ch.deal})` : ''}`,
          note: ch.note || '',
          box: it.box || 0,
          piece: it.piece || 0,
          sft: it.sft || 0,
          userBy: ch.dispatchedBy || '—',
        });
      });
    });

    // Sort newest first by date string
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [stockInHistory, deliveryChallansHistory, products]);

  const filteredMovements = React.useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return productStockMovements.filter((m) => {
      if (historyProdId && m.productId !== Number(historyProdId)) return false;
      if (historyTypeFilter !== 'all' && m.kind !== historyTypeFilter) return false;
      const d = (m.date || '').slice(0, 10);
      if (historyDateFrom && d < historyDateFrom) return false;
      if (historyDateTo && d > historyDateTo) return false;
      if (q) {
        const match =
          m.productName.toLowerCase().includes(q) ||
          m.productCode.toLowerCase().includes(q) ||
          m.refDisplay.toLowerCase().includes(q) ||
          m.partyName.toLowerCase().includes(q) ||
          m.note.toLowerCase().includes(q) ||
          m.userBy.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [productStockMovements, historyProdId, historyTypeFilter, historyDateFrom, historyDateTo, historySearch]);

  // Pending challans: all invoices with delivery status
  const pendingInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {feedbackMsg}
          </span>
        )}
        {actionErrorMsg && (
          <div className="w-full text-rose-800 bg-rose-50 px-3 py-2 rounded border border-rose-300 font-semibold flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg('')} className="text-rose-600 hover:text-rose-900 cursor-pointer shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
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
            পেন্ডিং চালান ({invoices.filter((i) => StorageService.getInvoiceDeliveryStatus(i.no).status !== 'delivered').length})
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
            স্টক ইন (Purchase)
          </button>
          <button
            onClick={() => setSubTab('stock_out')}
            className={`px-3 py-1.5 rounded font-bold cursor-pointer transition flex items-center gap-1.5 ${
              subTab === 'stock_out'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            ম্যানুয়াল স্টক আউট
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
            স্টক খতিয়ান
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
            ডেলিভারি / আউট ইতিহাস ({deliveryChallansHistory.length})
          </button>
          <button
            onClick={() => setSubTab('product_history')}
            className={`px-3 py-1.5 rounded font-bold cursor-pointer transition flex items-center gap-1.5 ${
              subTab === 'product_history'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            স্টক প্রোডাক্ট হিস্টরি
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
                  const remItems = statusObj.itemStatuses.filter(
                    (it) => it.remainingBox > 0 || it.remainingPiece > 0
                  );
                  let inStockReadyCount = 0;
                  let noStockCount = 0;
                  let partialStockCount = 0;
                  remItems.forEach((it) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const disp = StorageService.computeDispatchableForRemaining(
                      prod,
                      it.remainingBox,
                      it.remainingPiece,
                      it.remainingSft
                    );
                    if (!disp.hasAnyStock) noStockCount++;
                    else if (disp.isPartialByStock) partialStockCount++;
                    else inStockReadyCount++;
                  });

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
                      <td className="p-2 text-center space-y-1">
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
                        {!isDelivered && remItems.length > 0 && (
                          <div>
                            {noStockCount === remItems.length ? (
                              <span className="inline-block text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                স্টকে নেই ({noStockCount} পণ্য পেন্ডিং থাকবে)
                              </span>
                            ) : noStockCount > 0 || partialStockCount > 0 ? (
                              <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                আংশিক স্টক ({noStockCount + partialStockCount} পণ্য অসম্পূর্ণ)
                              </span>
                            ) : (
                              <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                সব পণ্য স্টকে আছে ({inStockReadyCount})
                              </span>
                            )}
                          </div>
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
                          {!isDelivered && (
                            <button
                              onClick={() => handleDeletePendingChallanClick(inv)}
                              title={
                                canDeletePending
                                  ? 'পেন্ডিং চালান ডিলিট করুন'
                                  : 'ডিলিট করতে এডমিন অনুমতি বা পাসওয়ার্ড প্রয়োজন'
                              }
                              className={`p-1 rounded border cursor-pointer transition ${
                                canDeletePending
                                  ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-300'
                                  : 'bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-700 border-slate-300'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-xs text-left border-collapse">
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
              </div>

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

      {/* ================= SUB-TAB 2.5: MANUAL STOCK OUT (WITHOUT INVOICE) ================= */}
      {subTab === 'stock_out' && (
        <div className="space-y-4">
          <div className="bg-white border border-amber-300 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="w-4 h-4 text-amber-700" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    ম্যানুয়াল স্টক আউট (চালান / ইনভয়েস ছাড়া সরাসরি স্টক আউট)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ইনভয়েস চালান ছাড়া ম্যানুয়াল নম্বর দিয়ে সরাসরি গোডাউন থেকে স্টক মাইনাস করুন (হিস্টরিতে ম্যানুয়াল নম্বর ও তারিখ সংরক্ষিত থাকবে)।
                  </p>
                </div>
              </div>
              {!canDispatch && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                  <Lock className="w-3.5 h-3.5" /> পারমিশন বন্ধ আছে
                </span>
              )}
            </div>

            {manualOutError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 px-3 py-2 rounded flex items-center justify-between gap-2 font-semibold">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{manualOutError}</span>
                </div>
                <button onClick={() => setManualOutError('')} className="text-rose-600 hover:text-rose-900 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-amber-50/40 p-3 rounded-lg border border-amber-200">
              <div>
                <label className="block text-slate-700 font-bold mb-1">ম্যানুয়াল নম্বর / স্লিপ নং : *</label>
                <input
                  type="text"
                  value={manualRefInput}
                  onChange={(e) => setManualRefInput(e.target.value)}
                  placeholder="যেমন: M-101 বা 505"
                  className="w-full bg-white border border-amber-400 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">স্টক আউট তারিখ : *</label>
                <input
                  type="date"
                  value={manualOutDate}
                  onChange={(e) => setManualOutDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">গ্রহীতা / কারণ (Recipient) :</label>
                <input
                  type="text"
                  value={manualOutRecipient}
                  onChange={(e) => setManualOutRecipient(e.target.value)}
                  placeholder="যেমন: স্যাম্পল / ড্যামেজ / গ্রাহকের নাম"
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">মন্তব্য / নোট (Note) :</label>
                <input
                  type="text"
                  value={manualOutNote}
                  onChange={(e) => setManualOutNote(e.target.value)}
                  placeholder="অতিরিক্ত বিবরণ বা নোট..."
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                />
              </div>
            </div>

            {/* Product Add Row for Manual Stock Out */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800 text-xs">স্টক আউট পণ্য নির্বাচন করুন:</span>
                {selectedManualOutProd && (() => {
                  const av = StorageService.getAvailableProductStock(selectedManualOutProd);
                  return (
                    <span
                      className={`px-2.5 py-0.5 rounded font-mono font-bold text-[11px] border ${
                        av.hasStock
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      বর্তমান স্টক: {av.stockBox} Box, {av.stockPiece} Pcs ({av.stockSft.toFixed(2)} SFT)
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-slate-600 mb-0.5">পণ্য (Product) :</label>
                  <ProductSearchSelect
                    products={products}
                    selectedProductId={outProdId}
                    onSelectProduct={(p) => handleSelectManualOutProduct(p ? String(p.id) : '')}
                    addedProductIds={manualOutItems.map((it) => it.productId)}
                    placeholder="পণ্য কোড বা নাম লিখুন..."
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-slate-600 mb-0.5 text-center">বক্স (Box)</label>
                  <input
                    type="number"
                    min="0"
                    value={outBox}
                    onChange={(e) => {
                      setOutBox(e.target.value);
                      if (selectedManualOutProd) {
                        calcManualOutSft(selectedManualOutProd, parseNum(e.target.value), parseNum(outPiece));
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono font-bold"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-slate-600 mb-0.5 text-center">পিস (Piece)</label>
                  <input
                    type="number"
                    min="0"
                    value={outPiece}
                    onChange={(e) => {
                      setOutPiece(e.target.value);
                      if (selectedManualOutProd) {
                        calcManualOutSft(selectedManualOutProd, parseNum(outBox), parseNum(e.target.value));
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono font-bold"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-slate-600 mb-0.5 text-center">SFT</label>
                  <input
                    type="text"
                    readOnly
                    value={outSft || '0.00'}
                    className="w-full bg-slate-200 border border-slate-300 rounded px-2 py-1 text-center font-mono font-semibold text-slate-800"
                  />
                </div>

                <div className="col-span-12 sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddManualOutItem}
                    className="w-full bg-amber-700 hover:bg-amber-600 text-white rounded py-1 font-bold cursor-pointer transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Added Manual Stock Out Items Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 text-center w-10">SL</th>
                      <th className="p-2">পণ্যের নাম</th>
                      <th className="p-2 text-center w-24">মাপ (Dim)</th>
                      <th className="p-2 text-center w-20">Box</th>
                      <th className="p-2 text-center w-20">Piece</th>
                      <th className="p-2 text-right w-24">SFT</th>
                      <th className="p-2 text-center w-14">মুছুন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manualOutItems.map((it, idx) => (
                      <tr key={it.productId} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900">{it.name}</td>
                        <td className="p-2 text-center font-mono text-[11px]">{it.dim}</td>
                        <td className="p-2 text-center font-mono font-bold text-rose-800">{formatQty(it.box)}</td>
                        <td className="p-2 text-center font-mono font-bold text-rose-800">{formatQty(it.piece)}</td>
                        <td className="p-2 text-right font-mono font-semibold">
                          {(it.isTile ? it.sft : it.piece).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setManualOutItems(manualOutItems.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    {manualOutItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          উপরে পণ্য ও পরিমাণ নির্বাচন করে 'Add' বাটনে চাপুন
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveManualStockOut}
                disabled={!canDispatch}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded font-bold cursor-pointer transition shadow-md flex items-center gap-2 text-xs"
              >
                <MinusCircle className="w-4 h-4" />
                ম্যানুয়াল স্টক আউট নিশ্চিত করুন (Save &amp; Stock Out)
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
            <table className="w-full min-w-[760px] text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 text-center w-16">PID</th>
                  <th className="p-2">Product Code &amp; Name</th>
                  <th className="p-2">Category</th>
                  <th className="p-2 text-center w-20">মাপ (Dim)</th>
                  <th className="p-2 text-center w-24">বর্তমান স্টক (Box)</th>
                  <th className="p-2 text-center w-24">বর্তমান স্টক (Pcs)</th>
                  <th className="p-2 text-right w-24">মোট স্টক SFT</th>
                  <th className="p-2 text-right w-24">বিক্রয় মূল্য</th>
                  <th className="p-2 text-center w-28">স্টক স্ট্যাটাস</th>
                  <th className="p-2 text-center w-20">হিস্টরি</th>
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
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryProdId(String(p.id));
                            setHistoryTypeFilter('all');
                            setSubTab('product_history');
                          }}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-700 text-purple-800 hover:text-white border border-purple-300 rounded font-bold text-[10px] cursor-pointer transition inline-flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          হিস্টরি
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 4: DELIVERY CHALLANS & MANUAL STOCK OUT HISTORY ================= */}
      {subTab === 'challan_history' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-700" />
              ডেলিভারি চালান ও ম্যানুয়াল স্টক আউট ইতিহাস (Dispatched &amp; Stock Out Log)
            </h3>
            <span className="text-slate-500 font-semibold">
              মোট এন্ট্রি: {deliveryChallansHistory.length} টি
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full min-w-[720px] text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 text-center w-28">Challan / Ref</th>
                  <th className="p-2 text-center w-24">ধরন / Invoice</th>
                  <th className="p-2 w-32">তারিখ</th>
                  <th className="p-2">গ্রাহক / বিবরণ</th>
                  <th className="p-2">Cust. Deal / নোট</th>
                  <th className="p-2">মাধ্যম / ড্রাইভার</th>
                  <th className="p-2 text-right w-28">স্টক আউট পরিমাণ</th>
                  <th className="p-2 text-center w-28">প্রিন্ট ও অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryChallansHistory.map((ch) => {
                  const isManual = ch.outType === 'manual' || ch.invoiceNo === 0;
                  const totBox = ch.items.reduce((s, it) => s + (it.box || 0), 0);
                  const totPc = ch.items.reduce((s, it) => s + (it.piece || 0), 0);
                  const totSft = ch.items.reduce((s, it) => s + (it.sft || 0), 0);

                  return (
                    <tr key={ch.id} className="hover:bg-slate-50 transition">
                      <td className="p-2 text-center font-mono font-bold text-emerald-900">
                        {isManual ? ch.manualRefNo || ch.challanNo : ch.challanNo}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-slate-700">
                        {isManual ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">
                            ম্যানুয়াল আউট
                          </span>
                        ) : (
                          <span>#{ch.invoiceNo}</span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-slate-600">{ch.date?.slice(0, 16)}</td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{ch.custName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{ch.address || ch.phone || '—'}</div>
                      </td>
                      <td className="p-2 font-medium text-slate-700">{ch.deal || ch.note || '—'}</td>
                      <td className="p-2 text-slate-700">
                        <div>{ch.vehicleNo || '—'}</div>
                        <div className="text-[11px] text-slate-500">{ch.driverName && ch.driverName !== '—' ? ch.driverName : ch.dispatchedBy}</div>
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">
                        {totBox} Box, {totPc} Pcs <br />
                        <span className="text-[10px] text-slate-500 font-normal">({totSft.toFixed(2)} Sft)</span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
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
                            {isManual ? 'স্লিপ' : 'চালান'}
                          </button>
                          <button
                            onClick={() => handleDeleteDeliveryHistoryClick(ch)}
                            title={
                              canDeleteDeliveryHistory
                                ? 'ডেলিভারি / স্টক আউট ইতিহাস ডিলিট করুন'
                                : 'ডিলিট করতে এডমিন অনুমতি বা পাসওয়ার্ড প্রয়োজন'
                            }
                            className={`p-1 rounded border cursor-pointer transition ${
                              canDeleteDeliveryHistory
                                ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-300'
                                : 'bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-700 border-slate-300'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {deliveryChallansHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      কোনো ডেলিভারি চালান বা স্টক আউট ইতিহাস নেই
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 5: STOCK PRODUCT HISTORY (IN / CHALLAN OUT / MANUAL OUT) ================= */}
      {subTab === 'product_history' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-700" />
                স্টক প্রোডাক্ট হিস্টরি (Product Stock In / Challan Out / Manual Out History)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                প্রতিটি পণ্যের স্টক ইন এবং কোন চালান বা ম্যানুয়াল নম্বর দিয়ে আউট করা হয়েছে তা তারিখসহ দেখুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const selProd = products.find((p) => p.id === Number(historyProdId));
                onOpenPrintModal({
                  isOpen: true,
                  type: 'report',
                  reportData: {
                    title: selProd
                      ? `স্টক প্রোডাক্ট হিস্টরি — ${selProd.name}`
                      : 'স্টক প্রোডাক্ট হিস্টরি (সকল পণ্য)',
                    period:
                      historyDateFrom || historyDateTo
                        ? `তারিখ: ${historyDateFrom || 'শুরু'} থেকে ${historyDateTo || 'আজ'}`
                        : 'সকল তারিখের রেকর্ড',
                    blocks: [
                      {
                        caption: `মোট মুভমেন্ট: ${filteredMovements.length} টি`,
                        heads: ['তারিখ', 'ধরন', 'চালান / ম্যানুয়াল নম্বর', 'পণ্যের নাম', 'ভেন্ডর / গ্রাহক', 'Box / Pcs', 'SFT'],
                        rows: filteredMovements.map((m) => [
                          m.date?.slice(0, 16) || '—',
                          m.sourceLabel,
                          m.refDisplay,
                          m.productName,
                          m.partyName,
                          `${m.kind === 'in' ? '+' : '-'}${m.box}B / ${m.piece}P`,
                          `${m.kind === 'in' ? '+' : '-'}${m.sft.toFixed(2)}`,
                        ]),
                      },
                    ],
                  },
                });
              }}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded font-bold cursor-pointer transition flex items-center gap-1.5 text-xs shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              হিস্টরি প্রিন্ট করুন
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 items-end">
            <div className="lg:col-span-4">
              <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                <span>পণ্য অনুযায়ী ফিল্টার:</span>
                {historyProdId && (
                  <button
                    type="button"
                    onClick={() => setHistoryProdId('')}
                    className="text-[10px] text-purple-700 hover:underline font-bold cursor-pointer"
                  >
                    × সকল পণ্য দেখুন
                  </button>
                )}
              </label>
              <ProductSearchSelect
                products={products}
                selectedProductId={historyProdId}
                onSelectProduct={(p) => setHistoryProdId(p ? String(p.id) : '')}
                placeholder="নির্দিষ্ট পণ্য বাছুন বা খালি রাখুন..."
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">ধরন (Type):</label>
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900 font-semibold"
              >
                <option value="all">সকল (In &amp; Out)</option>
                <option value="in">স্টক ইন (+)</option>
                <option value="challan_out">চালান আউট (-)</option>
                <option value="manual_out">ম্যানুয়াল আউট (-)</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">From তারিখ:</label>
              <input
                type="date"
                value={historyDateFrom}
                onChange={(e) => setHistoryDateFrom(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-slate-800"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">To তারিখ:</label>
              <input
                type="date"
                value={historyDateTo}
                onChange={(e) => setHistoryDateTo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-slate-800"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">নম্বর / নাম খুঁজুন:</label>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="চালান / ম্যানুয়াল নং..."
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
              />
            </div>
          </div>

          {/* Selected Product Live Stock Summary Card */}
          {(() => {
            const selProd = products.find((p) => p.id === Number(historyProdId));
            const totalInBox = filteredMovements.filter((m) => m.kind === 'in').reduce((s, m) => s + m.box, 0);
            const totalInPcs = filteredMovements.filter((m) => m.kind === 'in').reduce((s, m) => s + m.piece, 0);
            const totalOutBox = filteredMovements.filter((m) => m.kind !== 'in').reduce((s, m) => s + m.box, 0);
            const totalOutPcs = filteredMovements.filter((m) => m.kind !== 'in').reduce((s, m) => s + m.piece, 0);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-cyan-50 border border-cyan-200 rounded p-2.5 flex items-center justify-between">
                  <span className="font-semibold text-cyan-900">মোট স্টক ইন (+):</span>
                  <span className="font-mono font-bold text-cyan-900">
                    +{totalInBox} Box, +{totalInPcs} Pcs
                  </span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded p-2.5 flex items-center justify-between">
                  <span className="font-semibold text-rose-900">মোট স্টক আউট (চালান/ম্যানুয়াল -):</span>
                  <span className="font-mono font-bold text-rose-900">
                    -{totalOutBox} Box, -{totalOutPcs} Pcs
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">
                    {selProd ? 'নির্বাচিত পণ্যের বর্তমান স্টক:' : 'মোট হিস্টরি রেকর্ড:'}
                  </span>
                  <span className="font-mono font-bold text-emerald-900">
                    {selProd
                      ? `${selProd.stockBox || 0} Box, ${selProd.stockPiece || 0} Pcs (${(selProd.stockSft || 0).toFixed(2)} Sft)`
                      : `${filteredMovements.length} টি`}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* History Table */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full min-w-[780px] text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 w-32">তারিখ ও সময়</th>
                  <th className="p-2 text-center w-32">ধরন</th>
                  <th className="p-2 w-52">চালান / ম্যানুয়াল নম্বর (Ref)</th>
                  <th className="p-2">পণ্যের বিবরণ</th>
                  <th className="p-2">ভেন্ডর / গ্রাহক / নোট</th>
                  <th className="p-2 text-right w-28">পরিমাণ (Box / Pcs)</th>
                  <th className="p-2 text-right w-20">SFT</th>
                  <th className="p-2 w-24">ইউজার</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => (
                  <tr key={m.uid} className="hover:bg-slate-50 transition">
                    <td className="p-2 font-mono text-slate-600">{m.date?.slice(0, 16) || '—'}</td>
                    <td className="p-2 text-center">
                      {m.kind === 'in' ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                          স্টক ইন (+)
                        </span>
                      ) : m.kind === 'manual_out' ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          ম্যানুয়াল আউট (-)
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                          চালান আউট (-)
                        </span>
                      )}
                    </td>
                    <td className="p-2 font-mono font-bold text-slate-900">{m.refDisplay}</td>
                    <td className="p-2 font-bold text-slate-900">{m.productName}</td>
                    <td className="p-2">
                      <div className="font-semibold text-slate-800">{m.partyName}</div>
                      {m.note && <div className="text-[10px] text-slate-500">{m.note}</div>}
                    </td>
                    <td
                      className={`p-2 text-right font-mono font-bold ${
                        m.kind === 'in' ? 'text-cyan-800' : 'text-rose-700'
                      }`}
                    >
                      {m.kind === 'in' ? '+' : '-'}
                      {formatQty(m.box)}B / {formatQty(m.piece)}P
                    </td>
                    <td className="p-2 text-right font-mono font-semibold text-slate-700">
                      {m.sft > 0 ? `${m.kind === 'in' ? '+' : '-'}${m.sft.toFixed(2)}` : '—'}
                    </td>
                    <td className="p-2 text-slate-600">{m.userBy}</td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      নির্বাচিত ফিল্টারে কোনো স্টক মুভমেন্ট হিস্টরি পাওয়া যায়নি
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

              {modalErrorMsg && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-3 py-2 rounded flex items-center justify-between gap-2 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{modalErrorMsg}</span>
                  </div>
                  <button onClick={() => setModalErrorMsg('')} className="text-rose-600 hover:text-rose-900 cursor-pointer shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Delivery Items Input Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="p-2 bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                  <span>পণ্যভিত্তিক ডেলিভারি পরিমাণ নির্ধারণ করুন (শুধুমাত্র স্টকে থাকা পণ্য স্টক-মাইনাস হবে, বাকি পেন্ডিং থাকবে):</span>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2">পণ্যের নাম</th>
                      <th className="p-2 text-center w-24">অর্ডার / ডেলিভারি</th>
                      <th className="p-2 text-center w-20 text-rose-700">বাকি আছে</th>
                      <th className="p-2 text-center w-24 text-cyan-900 bg-cyan-50">বর্তমান স্টক</th>
                      <th className="p-2 text-center w-24 bg-emerald-50 text-emerald-900">ট্রিপে (Box)</th>
                      <th className="p-2 text-center w-24 bg-emerald-50 text-emerald-900">ট্রিপে (Pcs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {StorageService.getInvoiceDeliveryStatus(deliveryModalInvoice.no).itemStatuses.map((it) => {
                      const inp = deliveryDispatchInputs[it.productId] || { box: '0', piece: '0', sft: '0' };
                      const prod = products.find((p) => p.id === it.productId);
                      const avail = StorageService.getAvailableProductStock(prod);
                      return (
                        <tr
                          key={it.productId}
                          className={`hover:bg-slate-50 ${!avail.hasStock && (it.remainingBox > 0 || it.remainingPiece > 0) ? 'bg-rose-50/40' : ''}`}
                        >
                          <td className="p-2 font-medium text-slate-900">
                            {it.name}
                            <span className="block text-[10px] text-slate-500 font-mono">{it.dim}</span>
                            {!avail.hasStock && (it.remainingBox > 0 || it.remainingPiece > 0) && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">
                                স্টকে নেই — পেন্ডিং এ থাকবে
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px]">
                            <div>অর্ডার: {it.orderedBox}B/{it.orderedPiece}P</div>
                            <div className="text-emerald-700">গিয়েছে: {it.deliveredBox}B/{it.deliveredPiece}P</div>
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-rose-700">{it.remainingBox}B / {it.remainingPiece}P</td>
                          <td className="p-2 text-center font-mono font-bold bg-cyan-50/40">
                            {avail.hasStock ? (
                              <span className="text-emerald-800">{avail.stockBox}B / {avail.stockPiece}P</span>
                            ) : (
                              <span className="text-rose-700">০ স্টক</span>
                            )}
                          </td>
                          <td className="p-2 text-center bg-emerald-50/50">
                            <input
                              type="number"
                              min="0"
                              max={it.remainingBox}
                              disabled={!avail.hasStock}
                              value={inp.box}
                              onChange={(e) => {
                                setDeliveryDispatchInputs({
                                  ...deliveryDispatchInputs,
                                  [it.productId]: { ...inp, box: e.target.value },
                                });
                              }}
                              className="w-20 bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 rounded px-1.5 py-1 text-center font-mono font-bold text-emerald-900"
                            />
                          </td>
                          <td className="p-2 text-center bg-emerald-50/50">
                            <input
                              type="number"
                              min="0"
                              max={it.remainingPiece}
                              disabled={!avail.hasStock}
                              value={inp.piece}
                              onChange={(e) => {
                                setDeliveryDispatchInputs({
                                  ...deliveryDispatchInputs,
                                  [it.productId]: { ...inp, piece: e.target.value },
                                });
                              }}
                              className="w-20 bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 rounded px-1.5 py-1 text-center font-mono font-bold text-emerald-900"
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

      {/* ================= DELETE PENDING CHALLAN CONFIRMATION MODAL ================= */}
      {deleteChallanTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-rose-300 overflow-hidden text-xs">
            <div className="bg-rose-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">পেন্ডিং চালান ডিলিট নিশ্চিতকরণ</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteChallanTarget(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-slate-700 leading-relaxed font-medium">
                আপনি কি নিশ্চিতভাবে পেন্ডিং চালান <strong>#{deleteChallanTarget.no}</strong> (গ্রাহক:{' '}
                <strong>{deleteChallanTarget.custName}</strong>) স্থায়ীভাবে মুছে ফেলতে চান?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900">
                সতর্কতা: এই চালানের সাথে যুক্ত বিল ও পেন্ডিং ডেলিভারি তালিকা থেকে রেকর্ডটি মুছে যাবে এবং ক্লাউডে সিঙ্ক হবে।
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeleteChallanTarget(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer transition"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => executeDeletePendingChallan(deleteChallanTarget)}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold cursor-pointer transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE DELIVERY HISTORY CHALLAN CONFIRMATION MODAL ================= */}
      {deleteDeliveryHistoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-rose-300 overflow-hidden text-xs">
            <div className="bg-rose-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">ডেলিভারি চালান ইতিহাস ডিলিট নিশ্চিতকরণ</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteDeliveryHistoryTarget(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-slate-700 leading-relaxed font-medium">
                আপনি কি নিশ্চিতভাবে ডেলিভারি চালান <strong>{deleteDeliveryHistoryTarget.challanNo}</strong> (ইনভয়েস{' '}
                <strong>#{deleteDeliveryHistoryTarget.invoiceNo}</strong>, গ্রাহক:{' '}
                <strong>{deleteDeliveryHistoryTarget.custName}</strong>) ইতিহাস থেকে স্থায়ীভাবে মুছে ফেলতে চান?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900">
                সতর্কতা: এটি মুছে ফেললে এই চালানের ডেলিভারি করা পণ্যের স্টক পুনরায় গোডাউন স্টকে যোগ হবে এবং ইনভয়েসের ডেলিভারি স্ট্যাটাস আপডেট হবে।
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeleteDeliveryHistoryTarget(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer transition"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteDeliveryHistory(deleteDeliveryHistoryTarget)}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold cursor-pointer transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
