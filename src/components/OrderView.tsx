import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Customer, DealerDeal, Invoice, Item, Product, ShopConfig, AppUser, StaffPermissions, SmsComposeRequest } from '../types';
import { StorageService } from '../services/storage';
import { FirestoreSyncService } from '../services/firestoreSync';
import { formatMoney, formatQty, parseNum, getTodayLocalDateStr, getNowLocalTimeStr } from '../utils/numberWords';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Printer,
  Check,
  Calendar,
  UserCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Truck,
  Edit2,
  Briefcase,
  X,
  Send,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { ProductSearchSelect } from './ProductSearchSelect';

interface OrderViewProps {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  dealers?: DealerDeal[];
  shop: ShopConfig;
  onSaveInvoice: (inv: Invoice, printKind: 'none' | 'invoice' | 'challan') => void;
  onDeleteInvoice: (no: number) => void;
  onOpenCustomerPicker: () => void;
  selectedCustomerFromPicker?: Customer | null;
  onClearCustomerPicker: () => void;
  onPrintDirectInvoice?: (inv: Invoice, isChallan: boolean) => void;
  onUpdateInvoiceDeal?: (invoiceNo: number, newDeal: string) => void;
  onNavigateToStock?: () => void;
  currentUser?: AppUser;
  permissions?: StaffPermissions;
  onRequireAdminAuth?: (actionTitle: string, onExecute: () => void, actionDetails?: string) => void;
  onOpenSmsComposer?: (req: SmsComposeRequest) => void;
}

export const OrderView: React.FC<OrderViewProps> = ({
  products,
  customers,
  invoices,
  dealers,
  shop,
  onSaveInvoice,
  onDeleteInvoice,
  onOpenCustomerPicker,
  selectedCustomerFromPicker,
  onClearCustomerPicker,
  onPrintDirectInvoice,
  onUpdateInvoiceDeal,
  onNavigateToStock,
  currentUser,
  permissions,
  onRequireAdminAuth,
  onOpenSmsComposer,
}) => {
  const canSendSms = currentUser?.role !== 'staff' || permissions?.canSendSms !== false;
  // Order Header state
  const [editingNo, setEditingNo] = useState<number>(0);
  const [invoiceNo, setInvoiceNo] = useState<number>(0);
  const [salesDate, setSalesDate] = useState<string>(() => getTodayLocalDateStr());
  const [custId, setCustId] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [deal, setDeal] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  // Customer Name, Phone & Deal suggestion dropdowns
  const [showCustNameSug, setShowCustNameSug] = useState<boolean>(false);
  const [showCustPhoneSug, setShowCustPhoneSug] = useState<boolean>(false);
  const [showDealSug, setShowDealSug] = useState<boolean>(false);
  const custNameBoxRef = useRef<HTMLDivElement>(null);
  const custPhoneBoxRef = useRef<HTMLDivElement>(null);
  const dealBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (custNameBoxRef.current && !custNameBoxRef.current.contains(e.target as Node)) {
        setShowCustNameSug(false);
      }
      if (custPhoneBoxRef.current && !custPhoneBoxRef.current.contains(e.target as Node)) {
        setShowCustPhoneSug(false);
      }
      if (dealBoxRef.current && !dealBoxRef.current.contains(e.target as Node)) {
        setShowDealSug(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const custNameMatches = useMemo(() => {
    const q = custName.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [customers, custName]);

  const custPhoneMatches = useMemo(() => {
    const pQ = phone.trim().toLowerCase();
    const nQ = custName.trim().toLowerCase();
    if (!pQ && !nQ) return [];
    return customers
      .filter((c) => {
        const phoneMatch = pQ ? (c.phone || '').toLowerCase().includes(pQ) : false;
        const nameMatch = nQ ? c.name.toLowerCase().includes(nQ) : false;
        if (pQ && nQ) return phoneMatch || nameMatch;
        return pQ ? phoneMatch : nameMatch;
      })
      .slice(0, 8);
  }, [customers, phone, custName]);

  const applySuggestedCustomer = (c: Customer) => {
    setCustId(String(c.id));
    setCustName(c.name);
    setAddress(c.address);
    setPhone(c.phone);
    setDeal(c.deal || '');
    setPreviousDue(StorageService.getCustomerBalance(c.id));
    setShowCustNameSug(false);
    setShowCustPhoneSug(false);
  };

  // Persistent Dealers master list
  const [dealersList, setDealersList] = useState<DealerDeal[]>(() => dealers || StorageService.getDealers());

  useEffect(() => {
    if (dealers) {
      setDealersList(dealers);
    }
  }, [dealers]);

  // Combined unique Deal person names from dealers master list, customers, and invoices
  const allDealSuggestions = useMemo(() => {
    const map = new Map<string, string>();
    const pushName = (raw?: string) => {
      const cleaned = (raw || '').trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (!map.has(key)) map.set(key, cleaned);
    };
    dealersList.forEach((d) => pushName(d.name));
    customers.forEach((c) => pushName(c.deal));
    invoices.forEach((inv) => pushName(inv.deal));
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [dealersList, customers, invoices]);

  const dealMatches = useMemo(() => {
    const q = deal.trim().toLowerCase();
    if (!q) return allDealSuggestions.slice(0, 12);
    return allDealSuggestions.filter((d) => d.toLowerCase().includes(q)).slice(0, 12);
  }, [allDealSuggestions, deal]);

  // Items in current invoice
  const [lines, setLines] = useState<Item[]>([]);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(-1);

  // New Item Entry inputs
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemBox, setItemBox] = useState<string>('');
  const [itemPiece, setItemPiece] = useState<string>('');
  const [itemSft, setItemSft] = useState<string>('');
  const [itemRate, setItemRate] = useState<string>('');
  const [itemTotal, setItemTotal] = useState<string>('');

  // Financial inputs
  const [autoRound10, setAutoRound10] = useState<boolean>(true);
  const [laborCost, setLaborCost] = useState<string>('0.00');
  const [discount, setDiscount] = useState<string>('0');
  const [previousDue, setPreviousDue] = useState<number>(0);
  const [cash, setCash] = useState<string>('');
  const [bank, setBank] = useState<string>('');
  const [bkash, setBkash] = useState<string>('');

  // Status & item warning messages
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [itemWarningMsg, setItemWarningMsg] = useState<string>('');
  const [lastSavedInvoice, setLastSavedInvoice] = useState<Invoice | null>(null);

  // Right-side list state (defaults to current date's memos)
  const [selectedRightInvoice, setSelectedRightInvoice] = useState<Invoice | null>(null);

  // Keep selectedRightInvoice synchronized with live Firestore updates
  useEffect(() => {
    if (selectedRightInvoice) {
      const live = invoices.find((i) => i.no === selectedRightInvoice.no) || null;
      if (!live) {
        setSelectedRightInvoice(null);
      } else if (live !== selectedRightInvoice) {
        setSelectedRightInvoice(live);
      }
    }
  }, [invoices, selectedRightInvoice]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(() => getTodayLocalDateStr());
  const [dateTo, setDateTo] = useState<string>(() => getTodayLocalDateStr());

  // Deal Change Modal State (for correcting deal on saved invoice)
  const [changeDealModalOpen, setChangeDealModalOpen] = useState(false);
  const [invoiceToChangeDeal, setInvoiceToChangeDeal] = useState<Invoice | null>(null);
  const [newDealInput, setNewDealInput] = useState('');

  // Refresh dealers list whenever storage changes
  const refreshDealers = () => {
    setDealersList(StorageService.getDealers());
  };

  // Generate next Invoice No on mount
  useEffect(() => {
    if (editingNo === 0) {
      setInvoiceNo(StorageService.nextInvoiceNo());
    }
  }, [invoices, editingNo]);

  // When a customer is picked from modal
  useEffect(() => {
    if (selectedCustomerFromPicker) {
      setCustId(String(selectedCustomerFromPicker.id));
      setCustName(selectedCustomerFromPicker.name);
      setAddress(selectedCustomerFromPicker.address);
      setPhone(selectedCustomerFromPicker.phone);
      setDeal(selectedCustomerFromPicker.deal || '');
      setPreviousDue(StorageService.getCustomerBalance(selectedCustomerFromPicker.id));
      onClearCustomerPicker();
    }
  }, [selectedCustomerFromPicker, onClearCustomerPicker]);

  // Reset form
  const resetForm = () => {
    setEditingNo(0);
    setInvoiceNo(StorageService.nextInvoiceNo());
    setSalesDate(getTodayLocalDateStr());
    setCustId('');
    setCustName('');
    setAddress('');
    setPhone('');
    setDeal('');
    setComment('');
    setLines([]);
    setSelectedLineIndex(-1);
    clearItemEntry();
    setAutoRound10(true);
    setLaborCost('0.00');
    setDiscount('0');
    setPreviousDue(0);
    setCash('');
    setBank('');
    setBkash('');
    setStatusMsg('');
    setItemWarningMsg('');
  };

  const clearItemEntry = () => {
    setSelectedProductId('');
    setItemBox('');
    setItemPiece('');
    setItemSft('');
    setItemRate('');
    setItemTotal('');
  };

  // Added product IDs & normalized codes for duplicate prevention
  const addedProductIds = useMemo(() => lines.map((l) => l.productId), [lines]);
  const addedProductCodes = useMemo(() => {
    const codes: string[] = [];
    lines.forEach((l) => {
      const p = products.find((prod) => prod.id === l.productId);
      if (p?.code && p.code.trim()) {
        codes.push(p.code.trim().toLowerCase());
      }
    });
    return codes;
  }, [lines, products]);

  const isProductAlreadyAdded = (prod: Product): boolean => {
    if (lines.some((it) => it.productId === prod.id)) return true;
    const normCode = (prod.code || '').trim().toLowerCase();
    if (normCode && addedProductCodes.includes(normCode)) return true;
    return false;
  };

  // Product Selection handler
  const handleProductSelect = (pId: string) => {
    setItemWarningMsg('');
    const prod = products.find((p) => p.id === Number(pId));
    if (!prod) {
      setSelectedProductId(pId);
      clearItemEntry();
      return;
    }

    if (isProductAlreadyAdded(prod)) {
      const label = prod.code ? `[${prod.code}] ${prod.name}` : prod.name;
      const msg = `"${label}" ইতিমধ্যে এই চালানে যোগ করা আছে — একটি কোড বা পণ্য ডাবল এন্ট্রি করা যাবে না!`;
      setItemWarningMsg(msg);
      setStatusMsg(msg);
      clearItemEntry();
      return;
    }

    setSelectedProductId(pId);
    setItemRate(String(prod.price || prod.rate));
    setItemBox('1');
    setItemPiece('0');

    if (prod.isTile) {
      const sft = Math.round(prod.sftPack * 100) / 100;
      setItemSft(sft.toFixed(2));
      const tot = Math.round(sft * (prod.price || prod.rate) * 100) / 100;
      setItemTotal(tot.toFixed(2));
    } else {
      setItemSft('0.00');
      const tot = Math.round(1 * (prod.price || prod.rate) * 100) / 100;
      setItemTotal(tot.toFixed(2));
    }
  };

  // Box / Piece changed -> Calc Sft & Total
  const handleBoxPieceChange = (boxStr: string, pieceStr: string) => {
    setItemBox(boxStr);
    setItemPiece(pieceStr);
    const prod = products.find((p) => p.id === Number(selectedProductId));
    if (!prod) return;

    calculateItemValues(prod, parseNum(boxStr), parseNum(pieceStr), parseNum(itemRate));
  };

  // Sft changed -> Calc Box / Piece & Total (rounded up to whole pieces)
  const handleSftChange = (sftStr: string) => {
    setItemSft(sftStr);
    const prod = products.find((p) => p.id === Number(selectedProductId));
    if (!prod || !prod.isTile || prod.sftPack <= 0 || prod.qtyPack <= 0) return;

    const sftVal = parseNum(sftStr);
    const rateVal = parseNum(itemRate);
    const perPiece = prod.sftPack / prod.qtyPack;
    const pieces = sftVal <= 0 ? 0 : Math.max(0, Math.ceil(sftVal / perPiece - 0.02));
    const box = Math.floor(pieces / prod.qtyPack);
    const piece = pieces - box * prod.qtyPack;

    setItemBox(formatQty(box));
    setItemPiece(formatQty(piece));

    const actualSft = Math.round((box * prod.sftPack + piece * perPiece) * 100) / 100;
    const total = Math.round(actualSft * rateVal * 100) / 100;
    setItemTotal(total.toFixed(2));
  };

  const calculateItemValues = (prod: Product, box: number, piece: number, rate: number) => {
    let sft = 0;
    let total = 0;
    if (prod.isTile) {
      sft = box * (prod.sftPack || 0) + (prod.qtyPack > 0 ? (piece * (prod.sftPack || 0)) / prod.qtyPack : 0);
      sft = Math.round(sft * 100) / 100;
      total = Math.round(sft * rate * 100) / 100;
      setItemSft(sft.toFixed(2));
    } else {
      total = Math.round(piece * rate * 100) / 100;
      setItemSft('0.00');
    }
    setItemTotal(total.toFixed(2));
  };

  // Rate change
  const handleRateChange = (rateStr: string) => {
    setItemRate(rateStr);
    const prod = products.find((p) => p.id === Number(selectedProductId));
    if (!prod) return;
    const rateVal = parseNum(rateStr);
    const sftVal = parseNum(itemSft);
    const pieceVal = parseNum(itemPiece);

    const total = prod.isTile ? Math.round(sftVal * rateVal * 100) / 100 : Math.round(pieceVal * rateVal * 100) / 100;
    setItemTotal(total.toFixed(2));
  };

  // Add line item
  const handleAddItem = () => {
    setItemWarningMsg('');
    const prod = products.find((p) => p.id === Number(selectedProductId));
    if (!prod) {
      const msg = 'তালিকা থেকে সঠিক পণ্য বাছুন।';
      setItemWarningMsg(msg);
      setStatusMsg(msg);
      return;
    }
    if (isProductAlreadyAdded(prod)) {
      const label = prod.code ? `[${prod.code}] ${prod.name}` : prod.name;
      const msg = `"${label}" ইতিমধ্যে এই চালানে যোগ করা আছে — একটি কোড বা পণ্য ডাবল এন্ট্রি করা যাবে না!`;
      setItemWarningMsg(msg);
      setStatusMsg(msg);
      clearItemEntry();
      return;
    }
    const b = parseNum(itemBox);
    const pc = parseNum(itemPiece);
    if (b <= 0 && pc <= 0) {
      const msg = 'Box বা Piece দিন।';
      setItemWarningMsg(msg);
      setStatusMsg(msg);
      return;
    }

    const newItem: Item = {
      productId: prod.id,
      name: prod.name,
      dim: prod.isTile ? `${prod.w.toFixed(2)} X ${prod.h.toFixed(2)}` : '0.00 X 0.00',
      box: b,
      piece: pc,
      sft: parseNum(itemSft),
      unit: parseNum(itemRate),
      total: parseNum(itemTotal),
      isTile: prod.isTile,
    };

    setLines([...lines, newItem]);
    setStatusMsg('');
    clearItemEntry();
  };

  const handleRemoveLine = () => {
    if (selectedLineIndex >= 0 && selectedLineIndex < lines.length) {
      const updated = lines.filter((_, idx) => idx !== selectedLineIndex);
      setLines(updated);
      setSelectedLineIndex(-1);
    }
  };

  // Financial calculations
  const lineSum = lines.reduce((s, it) => s + (it.total || 0), 0);
  const totalSftSum = lines.reduce((s, it) => s + (it.isTile ? it.sft : 0), 0);

  // Auto round 10 calculation
  useEffect(() => {
    if (autoRound10) {
      const rounded = Math.round(lineSum / 10) * 10;
      const labor = Math.round((rounded - lineSum) * 100) / 100;
      setLaborCost(labor.toFixed(2));
    }
  }, [lineSum, autoRound10]);

  const laborVal = parseNum(laborCost);
  const discountVal = parseNum(discount);
  const subTotal1 = lineSum + laborVal;
  const subTotal2 = subTotal1 - discountVal;
  const netPayable = subTotal2 + previousDue;

  const cashVal = parseNum(cash);
  const bankVal = parseNum(bank);
  const bkashVal = parseNum(bkash);
  const totalPaid = cashVal + bankVal + bkashVal;
  const dueBalance = netPayable - totalPaid;

  // Full payment button
  const handleFullPayment = () => {
    const rest = netPayable - bankVal - bkashVal;
    setCash(formatQty(Math.max(0, rest)));
  };

  // Save invoice
  const handleSave = (printKind: 'none' | 'invoice' | 'challan', sendToDeliveryQueue: boolean = false) => {
    if (editingNo > 0) {
      if (currentUser?.role === 'staff' && permissions && !permissions.canEditInvoice) {
        setStatusMsg('এডমিন কর্তৃক আপনার চালান সম্পাদনার পারমিশন বন্ধ রাখা হয়েছে।');
        return;
      }
    } else {
      if (currentUser?.role === 'staff' && permissions && !permissions.canCreateInvoice) {
        setStatusMsg('এডমিন কর্তৃক নতুন চালান তৈরির পারমিশন বন্ধ রাখা হয়েছে।');
        return;
      }
    }

    if (lines.length === 0) {
      setStatusMsg('কমপক্ষে একটি পণ্য যোগ করুন।');
      return;
    }
    if (!custName.trim()) {
      setStatusMsg('গ্রাহকের নাম দিন।');
      return;
    }

    // Auto save deal to master directory & sync to Firestore if newly added
    if (deal.trim()) {
      const beforeCount = StorageService.getDealers().length;
      StorageService.addOrGetDealer(deal.trim());
      const afterDealers = StorageService.getDealers();
      if (afterDealers.length !== beforeCount) {
        FirestoreSyncService.syncSaveDealers(afterDealers).catch(console.error);
      }
      refreshDealers();
    }

    // Check customer: use explicitly selected custId first, or exact name + phone match
    let customerToUse = custId
      ? customers.find((c) => String(c.id) === custId && c.name.toLowerCase() === custName.trim().toLowerCase())
      : undefined;

    if (!customerToUse && phone.trim()) {
      customerToUse = customers.find(
        (c) =>
          c.name.toLowerCase() === custName.trim().toLowerCase() &&
          c.phone.trim() === phone.trim()
      );
    }

    let isNewlyCreatedCustomer = false;
    if (!customerToUse) {
      // Create new customer on the fly with 0 opening due
      isNewlyCreatedCustomer = true;
      const newCustId = StorageService.nextCustId();
      customerToUse = {
        id: newCustId,
        name: custName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        deal: deal.trim(),
        openDue: 0,
      };
      const updatedCustomers = [...StorageService.getCustomers(), customerToUse];
      StorageService.saveCustomers(updatedCustomers);
    }

    const effectivePrevDue = isNewlyCreatedCustomer ? 0 : previousDue;
    const currentNo = editingNo > 0 ? editingNo : invoiceNo;
    const liveExistingInv = editingNo > 0 ? invoices.find((i) => i.no === currentNo) : undefined;
    const inv: Invoice = {
      no: currentNo,
      date: `${salesDate} ${getNowLocalTimeStr()}`,
      custId: customerToUse.id,
      custName: customerToUse.name,
      address: address.trim() || customerToUse.address,
      phone: phone.trim() || customerToUse.phone,
      deal: deal.trim() || customerToUse.deal,
      comment: comment.trim(),
      labor: laborVal,
      discount: discountVal,
      prevDue: effectivePrevDue,
      cash: cashVal,
      bank: bankVal,
      bkash: bkashVal,
      items: lines,
      deliveryStatus: sendToDeliveryQueue
        ? 'pending'
        : editingNo > 0
        ? liveExistingInv?.deliveryStatus || selectedRightInvoice?.deliveryStatus || 'pending'
        : 'pending',
    };

    onSaveInvoice(inv, printKind);
    setLastSavedInvoice(inv);
    setStatusMsg(`Invoice #${inv.no} সংরক্ষিত হয়েছে! ${sendToDeliveryQueue ? 'চালান ডেলিভারি কিউতে পাঠানো হয়েছে।' : ''}`);
    setTimeout(() => setStatusMsg(''), 4000);
    resetForm();

    if (sendToDeliveryQueue && onNavigateToStock) {
      setTimeout(() => {
        onNavigateToStock();
      }, 500);
    }
  };

  const handleTriggerInvoiceSms = (inv: Invoice) => {
    if (!onOpenSmsComposer) return;
    const matchedCust = customers.find((c) => c.id === inv.custId);
    const lsum = inv.items.reduce((s, it) => s + (it.total || 0), 0);
    const totalAmount = lsum + (inv.labor || 0) - (inv.discount || 0);
    const paidAmount = (inv.cash || 0) + (inv.bank || 0) + (inv.bkash || 0);
    const dueAmount = totalAmount + (inv.prevDue || 0) - paidAmount;

    onOpenSmsComposer({
      triggerType: 'invoice',
      title: `ইনভয়েস #${inv.no} — SMS পাঠান`,
      recipients: [
        {
          custId: inv.custId,
          custName: inv.custName,
          phone: inv.phone || matchedCust?.phone || '',
          invoiceNo: String(inv.no),
          totalAmount,
          paidAmount,
          dueAmount,
          date: inv.date?.slice(0, 10) || getTodayLocalDateStr(),
          smsOptOut: matchedCust?.smsOptOut,
          smsConsent: matchedCust?.smsConsent,
        },
      ],
    });
  };

  // Load existing invoice for editing
  const handleLoadSelectedInvoice = (inv: Invoice) => {
    setEditingNo(inv.no);
    setInvoiceNo(inv.no);
    setSalesDate(inv.date?.slice(0, 10) || getTodayLocalDateStr());
    setCustId(String(inv.custId));
    setCustName(inv.custName);
    setAddress(inv.address);
    setPhone(inv.phone);
    setDeal(inv.deal || '');
    setComment(inv.comment || '');
    setLines([...inv.items]);
    setAutoRound10(false);
    setLaborCost(inv.labor.toFixed(2));
    setDiscount(String(inv.discount));
    setPreviousDue(inv.prevDue);
    setCash(String(inv.cash));
    setBank(String(inv.bank));
    setBkash(String(inv.bkash));
    setSelectedRightInvoice(inv);
  };

  // Open deal change modal for an invoice
  const handleOpenDealChangeModal = (inv: Invoice) => {
    setInvoiceToChangeDeal(inv);
    setNewDealInput(inv.deal || '');
    setChangeDealModalOpen(true);
  };

  // Execute deal change on an invoice
  const handleConfirmDealChange = () => {
    if (!invoiceToChangeDeal) return;
    const trimmedDeal = newDealInput.trim();
    if (!trimmedDeal) {
      setStatusMsg('ডিলের নাম লিখুন বা তালিকা থেকে বাছুন।');
      return;
    }

    StorageService.updateInvoiceDeal(invoiceToChangeDeal.no, trimmedDeal);
    const beforeCount = StorageService.getDealers().length;
    StorageService.addOrGetDealer(trimmedDeal);
    const afterDealers = StorageService.getDealers();
    if (afterDealers.length !== beforeCount) {
      FirestoreSyncService.syncSaveDealers(afterDealers).catch(console.error);
    }
    refreshDealers();

    if (onUpdateInvoiceDeal) {
      onUpdateInvoiceDeal(invoiceToChangeDeal.no, trimmedDeal);
    }

    // Update selected invoice in state
    if (selectedRightInvoice?.no === invoiceToChangeDeal.no) {
      setSelectedRightInvoice({
        ...selectedRightInvoice,
        deal: trimmedDeal,
      });
    }

    setStatusMsg(`Invoice #${invoiceToChangeDeal.no} এর ডিল সফলভাবে পরিবর্তন করে "${trimmedDeal}" করা হয়েছে!`);
    setTimeout(() => setStatusMsg(''), 4000);
    setChangeDealModalOpen(false);
    setInvoiceToChangeDeal(null);
  };

  // Mark invoice for delivery queue
  const handleSendInvoiceToDelivery = (inv: Invoice) => {
    const invoicesList = StorageService.getInvoices();
    const idx = invoicesList.findIndex((i) => i.no === inv.no);
    if (idx !== -1) {
      invoicesList[idx].deliveryStatus = 'pending';
      StorageService.saveInvoices(invoicesList);
      if (onUpdateInvoiceDeal) {
        onUpdateInvoiceDeal(inv.no, inv.deal); // Triggers parent reload
      }
    }
    setStatusMsg(`Invoice #${inv.no} চালান ডেলিভারি পেন্ডিং কিউতে রাখা হয়েছে।`);
    setTimeout(() => setStatusMsg(''), 4000);
    if (onNavigateToStock) onNavigateToStock();
  };

  // Filter right side list by date range (defaults to current date) and search
  const filteredInvoices = invoices.filter((inv) => {
    const d = (inv.date || '').trim().slice(0, 10);
    let inDateRange = true;
    if (dateFrom && dateTo) {
      const startD = dateFrom <= dateTo ? dateFrom : dateTo;
      const endD = dateFrom <= dateTo ? dateTo : dateFrom;
      inDateRange = d >= startD && d <= endD;
    } else if (dateFrom) {
      inDateRange = d >= dateFrom;
    } else if (dateTo) {
      inDateRange = d <= dateTo;
    }
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(inv.no).includes(q) ||
      inv.custName.toLowerCase().includes(q) ||
      inv.phone.includes(q) ||
      String(inv.custId).includes(q) ||
      (inv.deal && inv.deal.toLowerCase().includes(q));
    return inDateRange && matchesSearch;
  });

  const sumSalesSub2 = filteredInvoices.reduce((s, inv) => {
    const lsum = inv.items.reduce((acc, it) => acc + (it.total || 0), 0);
    return s + (lsum + (inv.labor || 0) - (inv.discount || 0));
  }, 0);

  const sumPaid = filteredInvoices.reduce(
    (s, inv) => s + (inv.cash || 0) + (inv.bank || 0) + (inv.bkash || 0),
    0
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-85px)] lg:h-[calc(100vh-85px)] bg-slate-100 lg:overflow-hidden text-xs">
      {/* HTML5 Datalist for Auto-completing Dealer Deals */}
      <datalist id="dealer-deals-datalist">
        {allDealSuggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* ================= LEFT PANEL: ORDER ENTRY ================= */}
      <div className="w-full lg:w-[60%] bg-white lg:border-r border-slate-300 flex flex-col lg:overflow-y-auto">
        {/* Header Bar */}
        <div className="bg-slate-800 text-white px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm tracking-wide">
              {editingNo > 0 ? `চালান সংশোধন (Editing Invoice #${editingNo})` : 'নতুন বিক্রয় চালান (New Invoice / Order)'}
            </h2>
          </div>
          {statusMsg && (
            <span className="text-emerald-300 font-semibold bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-600 flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {statusMsg}
            </span>
          )}
        </div>

        <div className="p-3 sm:p-4 space-y-3 flex-1 overflow-y-auto">
          {/* Top Form Grid: Customer & Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {/* Column 1: Invoice metadata & Customer */}
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="w-24 text-slate-700 font-semibold text-right pr-2">Invoice/SL :</label>
                <input
                  type="text"
                  readOnly
                  value={editingNo > 0 ? editingNo : invoiceNo}
                  className="flex-1 bg-slate-200 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center">
                <label className="w-24 text-slate-700 font-semibold text-right pr-2">User Code :</label>
                <input
                  type="text"
                  readOnly
                  value={custId}
                  placeholder="অটো গ্রাহক আইডি"
                  className="flex-1 bg-slate-200 border border-slate-300 rounded px-2 py-1 font-mono text-slate-800"
                />
              </div>

              <div className="flex items-center">
                <label className="w-24 text-slate-700 font-semibold text-right pr-2">Sales Date :</label>
                <input
                  type="date"
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1" ref={custNameBoxRef}>
                <label className="w-24 text-slate-700 font-semibold text-right pr-2 shrink-0">Customer :</label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={custName}
                    onFocus={() => setShowCustNameSug(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustName(val);
                      setShowCustNameSug(true);
                      if (custId) {
                        const currentLinked = customers.find((c) => String(c.id) === custId);
                        if (!currentLinked || currentLinked.name.toLowerCase() !== val.toLowerCase().trim()) {
                          setCustId('');
                          setPreviousDue(0);
                        }
                      } else {
                        setPreviousDue(0);
                      }
                    }}
                    placeholder="গ্রাহকের নাম বা নির্বাচন"
                    autoComplete="off"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                  />
                  {showCustNameSug && custNameMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-amber-400 rounded-md shadow-xl z-40 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      <div className="px-2 py-1 bg-amber-50 text-[10px] font-bold text-amber-800 flex items-center justify-between sticky top-0 border-b border-amber-200">
                        <span>পুরাতন গ্রাহক সাজেশন ({custNameMatches.length})</span>
                        <button
                          type="button"
                          onClick={() => setShowCustNameSug(false)}
                          className="text-amber-700 hover:text-amber-950 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {custNameMatches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applySuggestedCustomer(c);
                          }}
                          className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{c.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {c.phone || 'নম্বর নেই'}{c.address ? ` • ${c.address}` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                            #{c.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onOpenCustomerPicker}
                  title="তালিকা থেকে বাছুন"
                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shrink-0"
                >
                  ...
                </button>
              </div>

              <div className="flex items-center">
                <label className="w-24 text-slate-700 font-semibold text-right pr-2 shrink-0">Short Add :</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="গ্রাহকের ঠিকানা"
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>

              <div className="flex items-center" ref={custPhoneBoxRef}>
                <label className="w-24 text-slate-700 font-semibold text-right pr-2 shrink-0">Contact No :</label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={phone}
                    onFocus={() => setShowCustPhoneSug(true)}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setShowCustPhoneSug(true);
                    }}
                    placeholder="মোবাইল নম্বর"
                    autoComplete="off"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                  />
                  {showCustPhoneSug && custPhoneMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-amber-400 rounded-md shadow-xl z-40 max-h-52 overflow-y-auto divide-y divide-slate-100">
                      <div className="px-2 py-1 bg-amber-50 text-[10px] font-bold text-amber-800 flex items-center justify-between sticky top-0 border-b border-amber-200">
                        <span>নাম/নম্বর সাজেশন ({custPhoneMatches.length})</span>
                        <button
                          type="button"
                          onClick={() => setShowCustPhoneSug(false)}
                          className="text-amber-700 hover:text-amber-950 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {custPhoneMatches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applySuggestedCustomer(c);
                          }}
                          className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-emerald-800 truncate">
                              {c.phone || 'নম্বর নেই'}
                            </div>
                            <div className="text-[10px] text-slate-700 font-semibold truncate">
                              {c.name}{c.address ? ` • ${c.address}` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                            #{c.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cust. Deal with Auto-saved Suggestions */}
              <div className="flex items-center gap-1" ref={dealBoxRef}>
                <label className="w-24 text-slate-700 font-semibold text-right pr-2 flex items-center justify-end gap-1 shrink-0">
                  <Briefcase className="w-3 h-3 text-emerald-600" />
                  Cust. Deal :
                </label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    list="dealer-deals-datalist"
                    value={deal}
                    onFocus={() => setShowDealSug(true)}
                    onChange={(e) => {
                      setDeal(e.target.value);
                      setShowDealSug(true);
                    }}
                    placeholder="ডিল বাছুন বা নতুন লিখুন"
                    autoComplete="off"
                    className="w-full bg-white border border-emerald-400/80 rounded px-2 py-1 text-slate-900 font-semibold focus:border-emerald-600 focus:outline-hidden"
                  />
                  {showDealSug && dealMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-emerald-400 rounded-md shadow-xl z-40 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      <div className="px-2 py-1 bg-emerald-50 text-[10px] font-bold text-emerald-800 flex items-center justify-between sticky top-0 border-b border-emerald-200">
                        <span>পূর্বের ডিল সাজেশন ({dealMatches.length})</span>
                        <button
                          type="button"
                          onClick={() => setShowDealSug(false)}
                          className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {dealMatches.map((dealName) => (
                        <button
                          key={dealName}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDeal(dealName);
                            setShowDealSug(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between gap-2"
                        >
                          <span className="font-bold text-slate-900 truncate">{dealName}</span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                            Deal
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start">
                <label className="w-24 text-slate-700 font-semibold text-right pr-2 pt-1">Comment :</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="বিলে মুদ্রিত মন্তব্য"
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 resize-none"
                />
              </div>
            </div>

            {/* Column 2: Financials & Totals */}
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="w-28 text-slate-700 font-semibold text-right pr-2">Total Amount :</label>
                <input
                  type="text"
                  readOnly
                  value={formatMoney(lineSum)}
                  className="flex-1 bg-slate-200 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-right text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1">
                <label className="w-28 text-slate-700 font-semibold text-right pr-2">লেবার / ভেন্ডিং :</label>
                <input
                  type="number"
                  step="any"
                  value={laborCost}
                  onChange={(e) => {
                    setAutoRound10(false);
                    setLaborCost(e.target.value);
                  }}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-right text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setAutoRound10(!autoRound10)}
                  title="Auto 10 Round"
                  className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                    autoRound10 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Round
                </button>
              </div>

              <div className="flex items-center">
                <label className="w-28 text-slate-700 font-semibold text-right pr-2">Discount (ছাড়) :</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-right text-slate-900"
                />
              </div>

              <div className="flex items-center">
                <label className="w-28 text-slate-700 font-semibold text-right pr-2">পূর্বের বাকি :</label>
                <input
                  type="text"
                  readOnly
                  value={formatMoney(previousDue)}
                  className="flex-1 bg-slate-200 border border-slate-300 rounded px-2 py-1 font-mono text-right text-slate-800"
                />
              </div>

              <div className="flex items-center">
                <label className="w-28 text-slate-900 font-bold text-right pr-2 text-emerald-800">
                  সর্বমোট প্রদেয় :
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatMoney(netPayable)}
                  className="flex-1 bg-emerald-50 border border-emerald-400 rounded px-2 py-1 font-mono font-bold text-right text-emerald-900 text-sm"
                />
              </div>

              {/* Payment Section */}
              <div className="flex items-center gap-1 pt-1 border-t border-slate-200">
                <label className="w-28 text-slate-700 font-semibold text-right pr-2">Cash (নগদ) :</label>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-right text-slate-900 font-semibold"
                />
                <button
                  type="button"
                  onClick={handleFullPayment}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold cursor-pointer"
                  title="সম্পূর্ণ টাকা পরিশোধ"
                >
                  Full
                </button>
              </div>

              <div className="flex items-center">
                <label className="w-28 text-slate-700 font-semibold text-right pr-2">Bank (ব্যাংক) :</label>
                <input
                  type="number"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-right text-blue-700"
                />
              </div>

              <div className="flex items-center">
                <label className="w-28 text-slate-700 font-semibold text-right pr-2">bKash (বিকাশ) :</label>
                <input
                  type="number"
                  value={bkash}
                  onChange={(e) => setBkash(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-right text-pink-700"
                />
              </div>

              <div className="flex items-center">
                <label className="w-28 text-slate-800 font-bold text-right pr-2 text-rose-800">Due (বাকি) :</label>
                <input
                  type="text"
                  readOnly
                  value={formatMoney(dueBalance)}
                  className="flex-1 bg-rose-100 border-2 border-rose-300 rounded px-2 py-1 font-mono font-bold text-right text-rose-900 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: New, Save, Save + Invoice Print, Save + Challan Print, Save + Send to Delivery */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
            <button
              onClick={resetForm}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold cursor-pointer transition shadow-xs"
            >
              নতুন (New)
            </button>
            <button
              onClick={() => handleSave('none', false)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              সংরক্ষণ (Save)
            </button>
            <button
              onClick={() => handleSave('invoice', false)}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Save + Invoice
            </button>
            <button
              onClick={() => handleSave('challan', false)}
              className="px-3.5 py-2 bg-indigo-800 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Save + Challan
            </button>
            <button
              onClick={() => handleSave('none', true)}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
              title="বিলটি সেভ করে স্টক আউট ও চালান ডেলিভারি পেন্ডিং কিউতে রাখুন"
            >
              <Send className="w-3.5 h-3.5" />
              Save + চালানে পাঠান
            </button>
            {invoices.some((i) => i.no === invoiceNo) && (
              <button
                type="button"
                onClick={() => {
                  const executeDelete = () => {
                    onDeleteInvoice(invoiceNo);
                    resetForm();
                  };
                  if (currentUser?.role === 'admin') {
                    executeDelete();
                  } else if (onRequireAdminAuth) {
                    onRequireAdminAuth(
                      `চালান #${invoiceNo} মুছে ফেলা`,
                      executeDelete,
                      `গ্রাহক: ${custName}`
                    );
                  } else {
                    executeDelete();
                  }
                }}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
                title={currentUser?.role === 'admin' ? 'সরাসরি চালান মুছুন (Admin Delete)' : 'এডমিন পারমিশন নিয়ে মুছুন'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                চালান মুছুন (Delete)
              </button>
            )}
            {onOpenSmsComposer && canSendSms && (editingNo > 0 || lastSavedInvoice || (custName.trim() && lines.length > 0)) && (
              <button
                type="button"
                onClick={() => {
                  if (editingNo > 0) {
                    const liveInv = invoices.find((i) => i.no === editingNo);
                    if (liveInv) {
                      handleTriggerInvoiceSms(liveInv);
                      return;
                    }
                  }
                  if (lines.length > 0 && custName.trim()) {
                    const matchedCust = custId ? customers.find((c) => String(c.id) === custId) : undefined;
                    onOpenSmsComposer({
                      triggerType: 'invoice',
                      title: `ইনভয়েস #${invoiceNo} — SMS পাঠান`,
                      recipients: [
                        {
                          custId: matchedCust?.id,
                          custName: custName.trim(),
                          phone: phone.trim() || matchedCust?.phone || '',
                          invoiceNo: String(invoiceNo),
                          totalAmount: subTotal2,
                          paidAmount: totalPaid,
                          dueAmount: dueBalance,
                          date: salesDate,
                          smsOptOut: matchedCust?.smsOptOut,
                          smsConsent: matchedCust?.smsConsent,
                        },
                      ],
                    });
                  } else if (lastSavedInvoice) {
                    handleTriggerInvoiceSms(lastSavedInvoice);
                  }
                }}
                className="px-3.5 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
                title="গ্রাহকের মোবাইলে ইনভয়েস SMS পাঠান"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {lines.length > 0 && custName.trim()
                  ? `Send SMS (#${invoiceNo})`
                  : lastSavedInvoice
                  ? `Send SMS (#${lastSavedInvoice.no})`
                  : 'Send SMS'}
              </button>
            )}
            <div className="ml-auto flex items-center gap-2 text-slate-600 font-semibold text-xs">
              <span>মোট Sft:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                {totalSftSum.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Item Add Row */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5">
            <div className="grid grid-cols-12 gap-1.5 items-end">
              <div className="col-span-12 sm:col-span-4">
                <label className="block text-slate-700 font-semibold mb-0.5 flex items-center justify-between">
                  <span>পণ্য নির্বাচন (Product) :</span>
                  <span className="text-[10px] text-slate-500 font-normal">কিবোর্ডে টাইপ করে সাজেশান পান</span>
                </label>
                <ProductSearchSelect
                  products={products}
                  selectedProductId={selectedProductId}
                  onSelectProduct={(p) => handleProductSelect(p ? String(p.id) : '')}
                  addedProductIds={addedProductIds}
                  addedProductCodes={addedProductCodes}
                  placeholder="পণ্য কোড বা নাম লিখুন (কিবোর্ড দিয়ে খুঁজুন)..."
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-0.5">Box (কার্টন)</label>
                <input
                  type="number"
                  value={itemBox}
                  onChange={(e) => handleBoxPieceChange(e.target.value, itemPiece)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-center text-slate-900 font-bold"
                />
              </div>

              <div className="col-span-6 sm:col-span-1">
                <label className="block text-slate-700 font-semibold mb-0.5">Piece</label>
                <input
                  type="number"
                  value={itemPiece}
                  onChange={(e) => handleBoxPieceChange(itemBox, e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-center text-slate-900 font-bold"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-0.5">Total Sft</label>
                <input
                  type="number"
                  step="any"
                  value={itemSft}
                  onChange={(e) => handleSftChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-center text-slate-900 font-bold"
                />
              </div>

              <div className="col-span-4 sm:col-span-1">
                <label className="block text-slate-700 font-semibold mb-0.5">Rate (দর)</label>
                <input
                  type="number"
                  step="any"
                  value={itemRate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-center text-slate-900"
                />
              </div>

              <div className="col-span-4 sm:col-span-1">
                <label className="block text-slate-700 font-semibold mb-0.5">Total (টাকা)</label>
                <input
                  type="text"
                  readOnly
                  value={itemTotal}
                  placeholder="0.00"
                  className="w-full bg-slate-200 border border-slate-300 rounded px-2 py-1 font-mono text-center font-bold text-slate-900"
                />
              </div>

              <div className="col-span-12 sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
            {itemWarningMsg && (
              <div className="mt-2 bg-rose-50 border border-rose-300 text-rose-800 px-2.5 py-1.5 rounded flex items-center justify-between gap-2 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{itemWarningMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setItemWarningMsg('')}
                  className="text-rose-600 hover:text-rose-900 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="max-h-56 overflow-auto">
              <table className="w-full min-w-[540px] text-xs text-left border-collapse">
                <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300 sticky top-0">
                  <tr>
                    <th className="p-1.5 text-center w-8">SL</th>
                    <th className="p-1.5">পণ্যের বিবরণ (Item Name)</th>
                    <th className="p-1.5 text-center">সাইজ</th>
                    <th className="p-1.5 text-center">Box</th>
                    <th className="p-1.5 text-center">Piece</th>
                    <th className="p-1.5 text-right">Sft</th>
                    <th className="p-1.5 text-right">দর (৳)</th>
                    <th className="p-1.5 text-right">মোট (৳)</th>
                    <th className="p-1.5 text-center w-8">মুছুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lines.map((it, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedLineIndex(idx)}
                      className={`cursor-pointer transition ${
                        selectedLineIndex === idx ? 'bg-amber-100 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-1.5 text-center font-mono text-slate-600">{idx + 1}</td>
                      <td className="p-1.5 font-medium text-slate-900">{it.name}</td>
                      <td className="p-1.5 text-center font-mono text-slate-600">{it.dim}</td>
                      <td className="p-1.5 text-center font-mono font-bold text-emerald-900">{it.box}</td>
                      <td className="p-1.5 text-center font-mono">{it.piece}</td>
                      <td className="p-1.5 text-right font-mono">{it.isTile ? it.sft.toFixed(2) : '—'}</td>
                      <td className="p-1.5 text-right font-mono">{it.unit.toFixed(2)}</td>
                      <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                        {it.total.toFixed(2)}
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLines(lines.filter((_, i) => i !== idx));
                            if (selectedLineIndex === idx) setSelectedLineIndex(-1);
                          }}
                          title="এই আইটেমটি সরান"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-slate-400 italic">
                        এখনো কোনো আইটেম যোগ করা হয়নি। উপরে পণ্য ও পরিমাণ দিয়ে 'Add' চাপুন।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {lines.length > 0 && (
              <div className="p-1.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">
                  {lines.length} টি পণ্য যোগ করা হয়েছে
                </span>
                <button
                  type="button"
                  onClick={handleRemoveLine}
                  disabled={selectedLineIndex < 0}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-semibold transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  চিহ্নিত লাইন মুছুন (Remove Line)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL: INVOICES LIST & SEARCH ================= */}
      <div className="w-full lg:w-[40%] bg-white flex flex-col lg:overflow-hidden border-t lg:border-t-0">
        {/* Filter bar */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="চালান নং, গ্রাহক, ডিল, ফোন নম্বর খুঁজুন..."
                className="w-full bg-white border border-slate-300 rounded pl-7 pr-2 py-1 text-slate-800 text-xs"
              />
            </div>
            <button
              onClick={() => {
                const today = getTodayLocalDateStr();
                setSearchQuery('');
                setDateFrom(today);
                setDateTo(today);
              }}
              title="আজকের মেমু ফিল্টারে রিসেট করুন"
              className="p-1 text-slate-600 hover:text-slate-900 border border-slate-300 rounded bg-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-600 font-semibold">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
            />
            <span className="text-slate-600 font-semibold">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={() => {
                const today = getTodayLocalDateStr();
                setDateFrom(today);
                setDateTo(today);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[10px] border cursor-pointer transition ${
                dateFrom === getTodayLocalDateStr() && dateTo === getTodayLocalDateStr()
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              আজকের
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className={`px-2 py-0.5 rounded font-bold text-[10px] border cursor-pointer transition ${
                !dateFrom && !dateTo
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              সব তারিখ
            </button>
          </div>
        </div>

        {/* Invoice Grid with Deal Column and Status */}
        <div className="flex-1 overflow-auto max-h-[380px] lg:max-h-none">
          <table className="w-full min-w-[520px] text-xs text-left border-collapse">
            <thead className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
              <tr>
                <th className="p-1.5 text-center w-8">SL</th>
                <th className="p-1.5 text-center w-20">Invoice</th>
                <th className="p-1.5">গ্রাহক ও ঠিকানা</th>
                <th className="p-1.5">কাস্টমার ডিল</th>
                <th className="p-1.5 text-right w-18">মূল্য (৳)</th>
                <th className="p-1.5 text-center w-14">ডেলিভারি</th>
                <th className="p-1.5 text-center w-8">মুছুন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv, idx) => {
                const isSel = selectedRightInvoice?.no === inv.no;
                const lsum = inv.items.reduce((s, it) => s + (it.total || 0), 0);
                const sub2 = lsum + (inv.labor || 0) - (inv.discount || 0);
                const deliveryStatus = inv.deliveryStatus || 'pending';

                return (
                  <tr
                    key={inv.no}
                    onClick={() => setSelectedRightInvoice(inv)}
                    onDoubleClick={() => handleLoadSelectedInvoice(inv)}
                    className={`cursor-pointer transition ${
                      isSel ? 'bg-emerald-100 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-1.5 text-center font-mono text-[11px] text-slate-500">{idx + 1}</td>
                    <td className="p-1.5 text-center font-mono">
                      <div className="font-bold text-slate-900">#{inv.no}</div>
                      <div className="text-[9px] text-slate-500 font-normal">{(inv.date || '').slice(0, 10)}</div>
                    </td>
                    <td className="p-1.5">
                      <div className="font-semibold text-slate-900">{inv.custName}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {inv.address || '—'}
                      </div>
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-slate-800 truncate max-w-[90px]" title={inv.deal}>
                          {inv.deal || '—'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDealChangeModal(inv);
                          }}
                          title="মেমুতে ডিলের নাম পরিবর্তন করুন"
                          className="p-0.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                      {formatMoney(sub2)}
                    </td>
                    <td className="p-1.5 text-center">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          deliveryStatus === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : deliveryStatus === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {deliveryStatus === 'delivered' ? 'সম্পূর্ণ' : deliveryStatus === 'partial' ? 'আংশিক' : 'পেন্ডিং'}
                      </span>
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const executeDelete = () => {
                            onDeleteInvoice(inv.no);
                            if (selectedRightInvoice?.no === inv.no) {
                              setSelectedRightInvoice(null);
                            }
                          };
                          if (currentUser?.role === 'admin') {
                            executeDelete();
                          } else if (onRequireAdminAuth) {
                            onRequireAdminAuth(
                              `চালান #${inv.no} মুছে ফেলা`,
                              executeDelete,
                              `গ্রাহক: ${inv.custName} | মূল্য: ৳ ${formatMoney(sub2)}`
                            );
                          } else {
                            executeDelete();
                          }
                        }}
                        title={currentUser?.role === 'admin' ? 'সরাসরি চালান মুছুন (Admin Delete)' : 'এডমিন পারমিশন নিয়ে মুছুন'}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    {invoices.length === 0
                      ? 'কোনো চালান পাওয়া যায়নি'
                      : 'নির্বাচিত তারিখে কোনো মেমু পাওয়া যায়নি — পুরাতন মেমু দেখতে From/To তারিখ পরিবর্তন করুন'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Summary & Actions */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-300 space-y-2">
          <div className="bg-white p-2 rounded border border-slate-200 text-xs font-mono space-y-0.5 text-slate-800">
            <div className="flex justify-between font-bold">
              <span>মোট বিল: {filteredInvoices.length} টি</span>
              <span className="text-emerald-800">বিক্রয়: ৳ {formatMoney(sumSalesSub2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>মোট জমা: ৳ {formatMoney(sumPaid)}</span>
              <span className="text-rose-700 font-semibold">বাকি: ৳ {formatMoney(sumSalesSub2 - sumPaid)}</span>
            </div>
          </div>

          {/* Action buttons: Direct print invoice / challan, Load, Delete, Change Deal, Send to Delivery */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => {
                if (currentUser?.role === 'staff' && permissions && !permissions.canEditInvoice) {
                  setStatusMsg('চালান সংশোধন করার অনুমতি শুধুমাত্র এডমিনের রয়েছে।');
                  return;
                }
                if (selectedRightInvoice) handleLoadSelectedInvoice(selectedRightInvoice);
              }}
              disabled={!selectedRightInvoice || (currentUser?.role === 'staff' && permissions?.canEditInvoice === false)}
              className="py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-bold transition cursor-pointer text-center"
              title={currentUser?.role === 'staff' && permissions?.canEditInvoice === false ? 'চালান সংশোধন অনুমতি নেই' : 'চালান লোড করুন'}
            >
              Load / Edit
            </button>
            <button
              onClick={() => {
                if (currentUser?.role === 'staff' && permissions && !permissions.canChangeDeal) {
                  setStatusMsg('ডিল পরিবর্তন করার অনুমতি শুধুমাত্র এডমিনের রয়েছে।');
                  return;
                }
                if (selectedRightInvoice) handleOpenDealChangeModal(selectedRightInvoice);
              }}
              disabled={!selectedRightInvoice || (currentUser?.role === 'staff' && permissions?.canChangeDeal === false)}
              className="py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-bold transition cursor-pointer flex items-center justify-center gap-1"
              title={currentUser?.role === 'staff' && permissions?.canChangeDeal === false ? 'ডিল পরিবর্তন অনুমতি নেই' : 'ভুলে অন্যের নাম দেওয়া ডিল পরিবর্তন করুন'}
            >
              <Edit2 className="w-3 h-3" />
              ডিল পরিবর্তন
            </button>
            <button
              onClick={() => {
                if (selectedRightInvoice) handleSendInvoiceToDelivery(selectedRightInvoice);
              }}
              disabled={!selectedRightInvoice}
              className="py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded font-bold transition cursor-pointer flex items-center justify-center gap-1"
              title="চালান পেন্ডিং ডেলিভারি কিউতে পাঠান"
            >
              <Send className="w-3 h-3" />
              চালানে পাঠান
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (selectedRightInvoice && onPrintDirectInvoice) {
                  onPrintDirectInvoice(selectedRightInvoice, false);
                }
              }}
              disabled={!selectedRightInvoice}
              className="flex-1 py-1.5 bg-teal-800 hover:bg-teal-700 disabled:opacity-40 text-white rounded font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              ইনভয়েস প্রিন্ট (Invoice)
            </button>
            <button
              onClick={() => {
                if (selectedRightInvoice && onPrintDirectInvoice) {
                  onPrintDirectInvoice(selectedRightInvoice, true);
                }
              }}
              disabled={!selectedRightInvoice}
              className="flex-1 py-1.5 bg-indigo-800 hover:bg-indigo-700 disabled:opacity-40 text-white rounded font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              চালান প্রিন্ট (Challan)
            </button>
            {onOpenSmsComposer && canSendSms && (
              <button
                type="button"
                onClick={() => {
                  if (selectedRightInvoice) handleTriggerInvoiceSms(selectedRightInvoice);
                }}
                disabled={!selectedRightInvoice}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                title="নির্বাচিত ইনভয়েসের গ্রাহককে SMS পাঠান"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                SMS
              </button>
            )}
            <button
              onClick={() => {
                if (!selectedRightInvoice) return;
                const executeDelete = () => {
                  onDeleteInvoice(selectedRightInvoice.no);
                  setSelectedRightInvoice(null);
                };

                if (onRequireAdminAuth) {
                  onRequireAdminAuth(
                    `চালান/ইনভয়েস #${selectedRightInvoice.no} স্থায়ীভাবে মুছে ফেলা`,
                    executeDelete,
                    `গ্রাহক: ${selectedRightInvoice.custName} | বিক্রয় মূল্য: ৳ ${formatMoney(
                      selectedRightInvoice.items.reduce((s, it) => s + (it.total || 0), 0)
                    )}`
                  );
                } else {
                  executeDelete();
                }
              }}
              disabled={!selectedRightInvoice}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded font-bold transition cursor-pointer"
              title={currentUser?.role === 'staff' ? 'ইউজার হিসেবে ডিলিট করতে এডমিন পারমিশন প্রয়োজন' : 'চালান মুছে ফেলুন (Direct Admin Delete)'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= CHANGE DEAL MODAL ================= */}
      {changeDealModalOpen && invoiceToChangeDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">মেমুতে ডিলের নাম পরিবর্তন করুন</h3>
              </div>
              <button
                onClick={() => setChangeDealModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">চালান নম্বর:</span>
                  <span className="font-mono font-bold text-slate-900">#{invoiceToChangeDeal.no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">গ্রাহকের নাম:</span>
                  <span className="font-bold text-slate-900">{invoiceToChangeDeal.custName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">বর্তমান ডিল:</span>
                  <span className="font-semibold text-rose-700">{invoiceToChangeDeal.deal || '(কোন ডিল নেই)'}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  সঠিক ডিল / রেফারেন্স নির্বাচন করুন বা লিখুন:
                </label>
                <input
                  type="text"
                  list="dealer-deals-datalist"
                  value={newDealInput}
                  onChange={(e) => setNewDealInput(e.target.value)}
                  placeholder="ডিল বাছুন বা নতুন লিখুন"
                  className="w-full bg-white border border-emerald-500 rounded px-3 py-2 text-slate-900 font-bold focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  ভুলে একজনের জায়গায় অন্য কারো নাম দেওয়া হয়ে থাকলে এখান থেকে সহজেই পরিবর্তন করা যাবে এবং নতুন নামটি সাথে সাথে ডাটাবেসে সেভ থাকবে।
                </p>
              </div>

              {/* Quick Select Buttons from Existing Deals */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">সংরক্ষিত ডিলসমূহ থেকে বাছুন:</label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded border border-slate-200">
                  {allDealSuggestions.map((dealName) => (
                    <button
                      key={dealName}
                      type="button"
                      onClick={() => setNewDealInput(dealName)}
                      className="px-2 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 rounded text-[11px] text-slate-800 font-medium cursor-pointer transition"
                    >
                      {dealName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setChangeDealModalOpen(false)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold transition"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDealChange}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  পরিবর্তন নিশ্চিত করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
