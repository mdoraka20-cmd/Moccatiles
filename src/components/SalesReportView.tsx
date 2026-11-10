import React, { useState, useRef } from 'react';
import { Customer, Invoice, Payment, Product, ShopConfig, Txn } from '../types';
import { formatMoney, formatQty, formatDateBangla } from '../utils/numberWords';
import { StorageService } from '../services/storage';
import { BarChart3, Search, Printer, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import { printHtmlContent, downloadHtmlFile } from '../utils/printHelper';

interface SalesReportViewProps {
  invoices: Invoice[];
  payments: Payment[];
  products: Product[];
  customers: Customer[];
  txns: Txn[];
  shop: ShopConfig;
  onOpenPrintModal: (reportData: any) => void;
}

export interface ReportBlock {
  caption?: string;
  heads: string[];
  rows: string[][];
  total?: string[];
}

export interface ReportData {
  title: string;
  period: string;
  info?: string[];
  blocks: ReportBlock[];
  summary?: Array<[string, string]>;
  reportType?: 'stock_report' | 'customer_transaction' | 'standard';
  supplierName?: string;
  stockDate?: string;
  printDate?: string;
  customerHeader?: string;
  totalsRight?: {
    debit: string;
    credit: string;
    due: string;
  };
}

const formatDateDDMMYY = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}/${mon}/${yr}`;
};

const formatMMDDYYYY = (dateStr?: string) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return dateStr || '';
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  return `${mon}/${day}/${yr}`;
};

const getPrintDateTime = () => {
  const d = new Date();
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const yr = d.getFullYear();
  let hr = d.getHours();
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12;
  hr = hr ? hr : 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mon}/${day}/${yr} ${hr}:${min} ${ampm}`;
};

export const SalesReportView: React.FC<SalesReportViewProps> = ({
  invoices,
  payments,
  products,
  customers,
  txns,
  shop,
  onOpenPrintModal,
}) => {
  const reportOptions = [
    { id: 0, title: '1. Daily sales report (Daily Transaction)', desc: 'দৈনিক বিক্রয়, জমা, খরচ ও নগদ হিসাব' },
    { id: 1, title: '2. Date wise sales', desc: 'তারিখ অনুযায়ী মোট বিক্রয়, জমা ও বাকি' },
    { id: 2, title: '3. Customer Transaction Detail (ক্রেতা লেনদেন বিবরণী)', desc: 'চালান ও জমা রশিদের ডেবিট-ক্রেডিট খতিয়ান ও বকেয়া হিসাব' },
    { id: 3, title: '4. Date and product wise sales', desc: 'তারিখ ও পণ্যভিত্তিক বিক্রয়ের বিবরণ' },
    { id: 4, title: '5. Account type wise sales', desc: 'নগদ (Full Paid) বনাম বাকি (Credit)' },
    { id: 5, title: '6. Dealer wise Report', desc: 'ডিলার / রেফারেন্স অনুযায়ী বিক্রয়' },
    { id: 6, title: '7. Product wise sales', desc: 'পণ্য অনুযায়ী মোট বিক্রয় পরিমাণ ও মূল্য' },
    { id: 7, title: '8. Stock Report (স্টক রিপোর্ট)', desc: 'সাপ্লায়ার অনুযায়ী ProductID, Size, Grade, Type, Sft ও সমাপনী কার্টন|পিস' },
  ];

  const [selectedReportId, setSelectedReportId] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().slice(0, 10));

  // Selection keys for reports
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    customers.length > 0 ? customers[0].id : null
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null); // null = all
  const [selectedAccountType, setSelectedAccountType] = useState<number>(0); // 0=all, 1=cash, 2=credit
  const [selectedDealer, setSelectedDealer] = useState<string>('');
  const [selectedReportVendor, setSelectedReportVendor] = useState<string>('all');
  const [selectedReportGrade, setSelectedReportGrade] = useState<string>('all');

  // Available Vendors
  const availableVendors = React.useMemo(() => {
    const list = StorageService.getVendors();
    products.forEach((p) => {
      if (p.vendor && !list.includes(p.vendor)) {
        list.push(p.vendor);
      }
    });
    return Array.from(new Set(list)).sort();
  }, [products]);

  // Zoom level for preview
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [statusNotice, setStatusNotice] = useState<string>('');
  const reportPaperRef = useRef<HTMLDivElement>(null);

  const handlePrintReport = () => {
    if (!reportData) return;
    if (reportPaperRef.current) {
      const { filename } = printHtmlContent(reportPaperRef.current.innerHTML, reportData.title);
      setStatusNotice(`🖨️ প্রিন্ট ফাইলটি (${filename}) ডাউনলোড হয়েছে। ফাইলটিতে ক্লিক করলেই সরাসরি প্রিন্ট ও PDF উইন্ডো চালু হবে।`);
    } else {
      onOpenPrintModal(reportData);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    if (reportPaperRef.current) {
      const filename = downloadHtmlFile(reportPaperRef.current.innerHTML, reportData.title);
      setStatusNotice(`📥 ফাইলটি (${filename}) ডাউনলোড হয়েছে।`);
    }
  };

  // Distinct dealers
  const distinctDealers = Array.from(
    new Set(invoices.map((v) => v.deal).filter((d) => d && d.trim().length > 0))
  ).sort();

  // Helper: Filter invoices in date range
  const getInvoicesInRange = () => {
    return invoices
      .filter((v) => {
        const d = v.date?.slice(0, 10) || '';
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      })
      .sort((a, b) => a.no - b.no);
  };

  const getPaymentsInRange = () => {
    return payments.filter((p) => {
      const d = p.date?.slice(0, 10) || '';
      return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
    });
  };

  // Compile Report Data Structure
  const generateReportData = (): ReportData | null => {
    const invs = getInvoicesInRange();
    const pays = getPaymentsInRange();
    const periodText = `${formatDateBangla(dateFrom)} হতে ${formatDateBangla(dateTo)} পর্যন্ত`;

    switch (selectedReportId) {
      case 0: {
        // Daily Transaction
        const payRows: string[][] = [];
        let paySum = 0;
        let sl = 1;
        pays.forEach((p) => {
          payRows.push([
            String(sl++),
            String(p.id),
            p.custName,
            p.remark || '—',
            p.method,
            formatMoney(p.amount),
            formatMoney(StorageService.getCustomerBalance(p.custId)),
          ]);
          paySum += p.amount;
        });

        const invRows: string[][] = [];
        let invPaidSum = 0;
        let invDueSum = 0;
        invs.forEach((v) => {
          const lsum = v.items.reduce((s, it) => s + (it.total || 0), 0);
          const sub2 = lsum + (v.labor || 0) - (v.discount || 0);
          const paid = (v.cash || 0) + (v.bank || 0) + (v.bkash || 0);
          const due = sub2 - paid;
          invRows.push([
            String(sl++),
            String(v.no),
            v.custName,
            v.comment || '—',
            v.deal || '—',
            formatMoney(paid),
            formatMoney(due),
          ]);
          invPaidSum += paid;
          invDueSum += due;
        });

        // Received by table
        const cashTotal =
          invs.reduce((s, v) => s + (v.cash || 0), 0) +
          pays.filter((p) => p.method === 'Cash' || !p.method).reduce((s, p) => s + (p.amount || 0), 0);
        const bankTotal =
          invs.reduce((s, v) => s + (v.bank || 0), 0) +
          pays.filter((p) => p.method === 'Bank').reduce((s, p) => s + (p.amount || 0), 0);
        const bkashTotal =
          invs.reduce((s, v) => s + (v.bkash || 0), 0) +
          pays.filter((p) => p.method === 'Bkash').reduce((s, p) => s + (p.amount || 0), 0);

        const incomeSum = txns
          .filter((t) => t.isIncome && (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo))
          .reduce((s, t) => s + (t.amount || 0), 0);
        const expenseSum = txns
          .filter((t) => !t.isIncome && (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo))
          .reduce((s, t) => s + (t.amount || 0), 0);

        const totalCashCollections = invPaidSum + paySum;
        const totalCashWithIncome = totalCashCollections + incomeSum;
        const netCashBalance = totalCashWithIncome - expenseSum;

        return {
          title: 'Daily Transaction Report (দৈনিক সার্বিক লেনদেন)',
          period: periodText,
          blocks: [
            {
              caption: 'টাকা জমার তালিকা (Pay Receipts)',
              heads: ['SL', 'Receipt', 'গ্রাহকের নাম', 'মন্তব্য', 'মাধ্যম', 'জমা (৳)', 'বর্তমান বাকি'],
              rows: payRows,
              total: ['', '', '', '', 'মোট জমা =', `৳ ${formatMoney(paySum)}`, ''],
            },
            {
              caption: 'দৈনিক বিক্রয় চালান (Daily Invoices)',
              heads: ['SL', 'Invoice', 'গ্রাহকের নাম', 'মন্তব্য', 'ডিল', 'নগদ জমা (৳)', 'বাকি (৳)'],
              rows: invRows,
              total: ['', '', '', '', 'মোট =', `৳ ${formatMoney(invPaidSum)}`, `৳ ${formatMoney(invDueSum)}`],
            },
            {
              caption: 'মাধ্যমে ভাগ (Received By)',
              heads: ['মাধ্যম (Method)', 'ইনভয়েস হতে (৳)', 'জমা রশিদ হতে (৳)', 'সর্বমোট (৳)'],
              rows: [
                [
                  'নগদ (Cash)',
                  formatMoney(invs.reduce((s, v) => s + (v.cash || 0), 0)),
                  formatMoney(pays.filter((p) => p.method === 'Cash' || !p.method).reduce((s, p) => s + p.amount, 0)),
                  formatMoney(cashTotal),
                ],
                [
                  'ব্যাংক (Bank)',
                  formatMoney(invs.reduce((s, v) => s + (v.bank || 0), 0)),
                  formatMoney(pays.filter((p) => p.method === 'Bank').reduce((s, p) => s + p.amount, 0)),
                  formatMoney(bankTotal),
                ],
                [
                  'বিকাশ (bKash)',
                  formatMoney(invs.reduce((s, v) => s + (v.bkash || 0), 0)),
                  formatMoney(pays.filter((p) => p.method === 'Bkash').reduce((s, p) => s + p.amount, 0)),
                  formatMoney(bkashTotal),
                ],
              ],
              total: ['সর্বমোট =', '', '', `৳ ${formatMoney(cashTotal + bankTotal + bkashTotal)}`],
            },
          ],
          summary: [
            ['Total Sales Received', `৳ ${formatMoney(invPaidSum)}`],
            ['(+) Total Pay Receipts', `৳ ${formatMoney(paySum)}`],
            ['Total Cash Collected', `৳ ${formatMoney(totalCashCollections)}`],
            ['(+) Total Other Income', `৳ ${formatMoney(incomeSum)}`],
            ['Gross Cash In Hand', `৳ ${formatMoney(totalCashWithIncome)}`],
            ['(-) Total Other Expense', `৳ ${formatMoney(expenseSum)}`],
            ['Net Cash Balance', `৳ ${formatMoney(netCashBalance)}`],
          ] as Array<[string, string]>,
        };
      }

      case 1: {
        // Date Wise Sales
        const dateGroups: { [dt: string]: { count: number; qty: number; amount: number; paid: number } } = {};
        invs.forEach((v) => {
          const dt = v.date?.slice(0, 10) || '';
          if (!dateGroups[dt]) {
            dateGroups[dt] = { count: 0, qty: 0, amount: 0, paid: 0 };
          }
          const lsum = v.items.reduce((s, it) => s + (it.total || 0), 0);
          const sub2 = lsum + (v.labor || 0) - (v.discount || 0);
          const paid = (v.cash || 0) + (v.bank || 0) + (v.bkash || 0);
          const qty = v.items.reduce((s, it) => s + (it.isTile ? it.sft : it.piece), 0);

          dateGroups[dt].count += 1;
          dateGroups[dt].qty += qty;
          dateGroups[dt].amount += sub2;
          dateGroups[dt].paid += paid;
        });

        const rows: string[][] = [];
        let totalCount = 0;
        let totalQty = 0;
        let totalAmount = 0;
        let totalPaid = 0;
        let sl = 1;

        Object.keys(dateGroups)
          .sort()
          .forEach((dt) => {
            const g = dateGroups[dt];
            rows.push([
              String(sl++),
              formatDateBangla(dt),
              String(g.count),
              g.qty.toFixed(2),
              formatMoney(g.amount),
              formatMoney(g.paid),
              formatMoney(g.amount - g.paid),
            ]);
            totalCount += g.count;
            totalQty += g.qty;
            totalAmount += g.amount;
            totalPaid += g.paid;
          });

        return {
          title: 'Date Wise Sales Report (তারিখভিত্তিক বিক্রয় খতিয়ান)',
          period: periodText,
          blocks: [
            {
              heads: ['SL', 'বিক্রয় তারিখ', 'চালান সংখ্যা', 'মোট পরিমাণ (Sft/Pcs)', 'বিক্রয় মূল্য (৳)', 'জমা (৳)', 'বাকি (৳)'],
              rows,
              total: [
                '',
                'সর্বমোট =',
                String(totalCount),
                totalQty.toFixed(2),
                `৳ ${formatMoney(totalAmount)}`,
                `৳ ${formatMoney(totalPaid)}`,
                `৳ ${formatMoney(totalAmount - totalPaid)}`,
              ],
            },
          ],
        };
      }

      case 2: {
        // Customer Transaction Detail (ক্রেতা লেনদেন বিবরণী) - Matching transaction.jpg
        const targetCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
        if (!targetCust) return null;

        interface TxnItem {
          sl: number;
          invoiceNo: string;
          payDate: string;
          rawDate: string;
          paymentType: string;
          particulars: string;
          debit: number;
          credit: number;
        }

        const txList: TxnItem[] = [];

        // 1. Opening balance if any
        if (targetCust.openDue && targetCust.openDue > 0) {
          txList.push({
            sl: 0,
            invoiceNo: '',
            payDate: formatDateDDMMYY(dateFrom || '2026-01-01'),
            rawDate: dateFrom || '2026-01-01',
            paymentType: '',
            particulars: 'Opening Balance (পূর্বের বকেয়া)',
            debit: targetCust.openDue,
            credit: 0,
          });
        }

        // 2. Invoices (Debit)
        const custInvs = invoices.filter((v) => v.custId === targetCust.id);
        custInvs.forEach((v) => {
          if (dateFrom && v.date && v.date.slice(0, 10) < dateFrom) return;
          if (dateTo && v.date && v.date.slice(0, 10) > dateTo) return;

          const { sub2 } = StorageService.getInvoiceTotals(v);
          txList.push({
            sl: 0,
            invoiceNo: String(v.no),
            payDate: formatDateDDMMYY(v.date),
            rawDate: v.date || '',
            paymentType: '',
            particulars: v.comment || '',
            debit: sub2,
            credit: 0,
          });

          // If immediate payment made on invoice (cash, bank, bkash)
          const invPaid = (v.cash || 0) + (v.bank || 0) + (v.bkash || 0);
          if (invPaid > 0) {
            let pType = 'Cash';
            if (v.bank && v.bank > 0) pType = 'Bank Deposit';
            else if (v.bkash && v.bkash > 0) pType = 'bKash Deposit';
            else if (v.cash && v.cash > 0) pType = 'Cash Deposit';

            txList.push({
              sl: 0,
              invoiceNo: String(v.no),
              payDate: formatDateDDMMYY(v.date),
              rawDate: v.date || '',
              paymentType: pType,
              particulars: `(${v.no}) Cash in Hand`,
              debit: 0,
              credit: invPaid,
            });
          }
        });

        // 3. Separate payment receipts (Credit)
        const custPays = payments.filter((p) => p.custId === targetCust.id);
        custPays.forEach((p) => {
          if (dateFrom && p.date && p.date.slice(0, 10) < dateFrom) return;
          if (dateTo && p.date && p.date.slice(0, 10) > dateTo) return;

          const invMatch = p.remark?.match(/\d{4,}/)?.[0] || '';

          txList.push({
            sl: 0,
            invoiceNo: invMatch,
            payDate: formatDateDDMMYY(p.date),
            rawDate: p.date || '',
            paymentType: p.method === 'Bank' ? 'Bank Deposit' : p.method === 'Bkash' ? 'bKash Deposit' : 'Cash Deposit',
            particulars: p.remark ? p.remark : invMatch ? `(${invMatch}) Cash in Hand` : 'Cash in Hand',
            debit: 0,
            credit: p.amount || 0,
          });
        });

        // Sort chronologically
        txList.sort((a, b) => (a.rawDate > b.rawDate ? 1 : a.rawDate < b.rawDate ? -1 : 0));

        let totalDebit = 0;
        let totalCredit = 0;
        const rows: string[][] = txList.map((item, idx) => {
          totalDebit += item.debit;
          totalCredit += item.credit;
          return [
            String(idx + 1),
            item.invoiceNo,
            item.payDate,
            item.paymentType,
            item.particulars,
            item.debit > 0 ? formatMoney(item.debit) : '0.00',
            item.credit > 0 ? formatMoney(item.credit) : '0.00',
          ];
        });

        const totalDue = totalDebit - totalCredit;

        return {
          title: 'ক্রেতা (Customer) Transaction Detail',
          period: dateFrom && dateTo ? `${formatDateBangla(dateFrom)} হতে ${formatDateBangla(dateTo)}` : '',
          reportType: 'customer_transaction',
          customerHeader: `${targetCust.id} -${targetCust.name}. (${targetCust.address || '—'}),`,
          blocks: [
            {
              heads: ['SL', 'Invoice No', 'Pay Date', 'Payment Type', 'Particulars', 'Debit', 'Credit'],
              rows,
            },
          ],
          totalsRight: {
            debit: formatMoney(totalDebit),
            credit: formatMoney(totalCredit),
            due: formatMoney(totalDue),
          },
        };
      }

      case 3: {
        // Date and Product Wise Sales
        const prod = products.find((p) => p.id === selectedProductId);
        const rows: string[][] = [];
        let tQty = 0;
        let tTotal = 0;
        let sl = 1;

        invs.forEach((v) => {
          v.items.forEach((it) => {
            if (selectedProductId && it.productId !== selectedProductId) return;
            const q = it.isTile ? it.sft : it.piece;
            rows.push([
              String(sl++),
              String(v.no),
              formatDateBangla(v.date),
              `${v.custName} ${!selectedProductId ? `| ${it.name}` : ''}`,
              q.toFixed(2),
              formatMoney(it.unit),
              formatMoney(it.total),
            ]);
            tQty += q;
            tTotal += it.total;
          });
        });

        return {
          title: 'Date and Product Wise Sales (তারিখ ও পণ্যভিত্তিক বিক্রয়)',
          period: periodText,
          info: [`নির্বাচিত পণ্য: ${prod ? prod.name : 'সকল পণ্য (All Products)'}`],
          blocks: [
            {
              heads: ['SL', 'Invoice', 'তারিখ', 'গ্রাহক ও পণ্য', 'পরিমাণ (Sft/Pcs)', 'দর (Rate ৳)', 'মোট টাকা (৳)'],
              rows,
              total: ['', '', '', 'সর্বমোট =', tQty.toFixed(2), '', `৳ ${formatMoney(tTotal)}`],
            },
          ],
        };
      }

      case 4: {
        // Account Type Wise Sales (Cash vs Credit)
        const typeText =
          selectedAccountType === 1
            ? 'নগদ / সম্পূর্ণ পরিশোধ (Cash)'
            : selectedAccountType === 2
            ? 'বাকি / বকেয়া আছে (Credit)'
            : 'সকল লেনদেন (All Account Types)';

        const rows: string[][] = [];
        let tSub2 = 0;
        let tPaid = 0;
        let sl = 1;

        invs.forEach((v) => {
          const lsum = v.items.reduce((s, it) => s + (it.total || 0), 0);
          const sub2 = lsum + (v.labor || 0) - (v.discount || 0);
          const paid = (v.cash || 0) + (v.bank || 0) + (v.bkash || 0);
          const due = sub2 - paid;

          if (selectedAccountType === 1 && due > 0) return;
          if (selectedAccountType === 2 && due <= 0) return;

          rows.push([
            String(sl++),
            String(v.no),
            formatDateBangla(v.date),
            v.custName,
            formatMoney(sub2),
            formatMoney(paid),
            formatMoney(due),
          ]);
          tSub2 += sub2;
          tPaid += paid;
        });

        return {
          title: 'Account Type Wise Sales Report (হিসাবের ধরনভিত্তিক বিক্রয়)',
          period: periodText,
          info: [`লেনদেনের ধরন: ${typeText}`],
          blocks: [
            {
              heads: ['SL', 'Invoice', 'তারিখ', 'গ্রাহকের নাম', 'বিক্রয় মূল্য (৳)', 'জমা (৳)', 'বাকি (৳)'],
              rows,
              total: ['', '', '', 'সর্বমোট =', `৳ ${formatMoney(tSub2)}`, `৳ ${formatMoney(tPaid)}`, `৳ ${formatMoney(tSub2 - tPaid)}`],
            },
          ],
        };
      }

      case 5: {
        // Dealer Wise Report
        const dealerInvs = invs.filter((v) => v.deal === selectedDealer);
        const rows: string[][] = [];
        let tQty = 0;
        let tSub2 = 0;
        let sl = 1;

        dealerInvs.forEach((v) => {
          const lsum = v.items.reduce((s, it) => s + (it.total || 0), 0);
          const sub2 = lsum + (v.labor || 0) - (v.discount || 0);
          const q = v.items.reduce((s, it) => s + (it.isTile ? it.sft : it.piece), 0);
          rows.push([String(sl++), String(v.no), formatDateBangla(v.date), q.toFixed(2), formatMoney(sub2)]);
          tQty += q;
          tSub2 += sub2;
        });

        return {
          title: 'Dealer Wise Sales Report (ডিলার / রেফারেন্সভিত্তিক বিক্রয়)',
          period: periodText,
          info: [`ডিলার / রেফারেন্স নাম: ${selectedDealer || '—'}`],
          blocks: [
            {
              heads: ['SL', 'Invoice', 'তারিখ', 'পরিমাণ (Sft/Qty)', 'বিক্রয় মূল্য (৳)'],
              rows,
              total: ['', '', 'সর্বমোট =', tQty.toFixed(2), `৳ ${formatMoney(tSub2)}`],
            },
          ],
        };
      }

      case 6: {
        // Product Wise Sales
        const prod = products.find((p) => p.id === selectedProductId);
        const prodGroups: { [pName: string]: { qty: number; amount: number } } = {};

        invs.forEach((v) => {
          v.items.forEach((it) => {
            if (selectedProductId && it.productId !== selectedProductId) return;
            if (!prodGroups[it.name]) {
              prodGroups[it.name] = { qty: 0, amount: 0 };
            }
            const q = it.isTile ? it.sft : it.piece;
            prodGroups[it.name].qty += q;
            prodGroups[it.name].amount += it.total;
          });
        });

        const rows: string[][] = [];
        let tQty = 0;
        let tAmount = 0;
        let sl = 1;

        Object.keys(prodGroups)
          .sort()
          .forEach((pName) => {
            const g = prodGroups[pName];
            rows.push([String(sl++), pName, g.qty.toFixed(2), formatMoney(g.amount)]);
            tQty += g.qty;
            tAmount += g.amount;
          });

        return {
          title: 'Product Wise Sales Report (পণ্যভিত্তিক বিক্রয় খতিয়ান)',
          period: periodText,
          info: [`পণ্য: ${prod ? prod.name : 'সকল পণ্য (All Products)'}`],
          blocks: [
            {
              heads: ['SL', 'পণ্যের নাম (Product Name)', 'মোট বিক্রয় পরিমাণ (Sft/Pcs)', 'মোট বিক্রয় মূল্য (৳)'],
              rows,
              total: ['', 'সর্বমোট =', tQty.toFixed(2), `৳ ${formatMoney(tAmount)}`],
            },
          ],
        };
      }

      case 7: {
        // Stock Report (স্টক রিপোর্ট) - Matching stock report.jpg
        const filtered = products.filter((p) => {
          const matchVendor =
            selectedReportVendor === 'all' ||
            (p.vendor && p.vendor.trim().toLowerCase() === selectedReportVendor.trim().toLowerCase());
          const pGrade = (p.grade || 'A').toUpperCase();
          const matchGrade = selectedReportGrade === 'all' || pGrade === selectedReportGrade.toUpperCase();
          return matchVendor && matchGrade;
        });

        // Grade stats calculation for summary
        const gradeStats = {
          A: { count: 0, box: 0, piece: 0, sft: 0, val: 0 },
          B: { count: 0, box: 0, piece: 0, sft: 0, val: 0 },
          C: { count: 0, box: 0, piece: 0, sft: 0, val: 0 },
        };

        let grandBox = 0;
        let grandPiece = 0;
        let grandSft = 0;
        let grandValue = 0;

        filtered.forEach((p) => {
          const rawG = (p.grade || 'A').toUpperCase();
          const g = rawG === 'B' ? 'B' : rawG === 'C' ? 'C' : 'A';
          const box = p.stockBox || 0;
          const piece = p.stockPiece || 0;
          const sft = p.stockSft || 0;
          const val = p.isTile ? (p.stockSft || 0) * (p.price || 0) : (p.stockPiece || 0) * (p.price || 0);

          gradeStats[g].count += 1;
          gradeStats[g].box += box;
          gradeStats[g].piece += piece;
          gradeStats[g].sft += sft;
          gradeStats[g].val += val;

          grandBox += box;
          grandPiece += piece;
          grandSft += sft;
          grandValue += val;
        });

        const rows: string[][] = filtered.map((p) => {
          const pId = String(p.id);
          const pName = p.name;
          const pSize = p.w && p.h ? `(${p.w}X${p.h})` : '—';
          const pGrade = (p.grade || 'A').toUpperCase();
          const pType = p.category || 'Wall';
          const pSft = p.stockSft ? Number(p.stockSft).toFixed(2).replace(/\.00$/, '') : '0';
          const closingCartoon = `${p.stockBox || 0}|${p.stockPiece || 0}`;

          return [pId, pName, pSize, pGrade, pType, pSft, closingCartoon];
        });

        const supplierDisplay = selectedReportVendor === 'all' ? (availableVendors[0] || 'Aura') : selectedReportVendor;
        const stockDateStr = formatMMDDYYYY(dateFrom || new Date().toISOString().slice(0, 10));
        const printDateStr = getPrintDateTime();

        return {
          title: 'Stock Report',
          period: `Stock Date: ${stockDateStr}`,
          reportType: 'stock_report',
          supplierName: supplierDisplay,
          stockDate: stockDateStr,
          printDate: printDateStr,
          blocks: [
            {
              heads: ['ProductID', 'Product', 'Size', 'GradeName', 'TypeName', 'Stock(Sft)', 'Closing Cartoon|Pcs'],
              rows,
              total: [
                'মোট',
                `${filtered.length} টি আইটেম`,
                '',
                selectedReportGrade !== 'all' ? `Grade ${selectedReportGrade}` : 'All Grades',
                '',
                grandSft.toFixed(2),
                `${grandBox}|${grandPiece}`,
              ],
            },
          ],
          summary: [
            ['সাপ্লায়ার / ভেন্ডর', supplierDisplay],
            ['মোট প্রোডাক্ট', `${filtered.length} টি`],
            ['Grade A আইটেম', `${gradeStats.A.count} টি (${gradeStats.A.box} বক্স, ${gradeStats.A.sft.toFixed(2)} Sft)`],
            ['Grade B আইটেম', `${gradeStats.B.count} টি (${gradeStats.B.box} বক্স, ${gradeStats.B.sft.toFixed(2)} Sft)`],
            ['Grade C আইটেম', `${gradeStats.C.count} টি (${gradeStats.C.box} বক্স, ${gradeStats.C.sft.toFixed(2)} Sft)`],
            ['মোট কার্টন ও পিস স্টক', `${grandBox} Cartoon | ${grandPiece} Pcs`],
            ['মোট স্টক স্কয়ার ফিট (Sft)', `${grandSft.toFixed(2)} Sft`],
            ['মোট স্টক বিক্রয় মূল্য', `৳ ${formatMoney(grandValue)}`],
          ] as Array<[string, string]>,
        };
      }

      default:
        return null;
    }
  };

  const reportData = generateReportData();

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-85px)] bg-slate-100 overflow-hidden text-xs">
      {/* Left Control Column */}
      <div className="w-full lg:w-[320px] bg-white border-r border-slate-300 flex flex-col overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
            <BarChart3 className="w-4 h-4 text-emerald-700" />
            রিপোর্ট নির্বাচন (Select Report)
          </h3>
          <div className="space-y-1 mt-2">
            {reportOptions.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReportId(r.id)}
                className={`w-full text-left p-2 rounded transition cursor-pointer ${
                  selectedReportId === r.id
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="font-semibold">{r.title}</div>
                <div className={`text-[10px] ${selectedReportId === r.id ? 'text-emerald-100' : 'text-slate-500'}`}>
                  {r.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
          <label className="font-bold text-slate-700 block">তারিখের সীমা (Date Range) :</label>
          <div className="flex items-center gap-2">
            <span className="w-10 text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-[11px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Dynamic Selectors depending on Report */}
        {selectedReportId === 2 && (
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">গ্রাহক নির্বাচন :</label>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900 font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {(selectedReportId === 3 || selectedReportId === 6) && (
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">পণ্য নির্বাচন :</label>
            <select
              value={selectedProductId || ''}
              onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900 font-medium"
            >
              <option value="">(সব পণ্য - All Products)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedReportId === 4 && (
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">হিসাবের ধরন (Account Type) :</label>
            <select
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900 font-medium"
            >
              <option value={0}>সকল লেনদেন (All)</option>
              <option value={1}>নগদ (সম্পূর্ণ পরিশোধ / Full Paid)</option>
              <option value={2}>বাকি (বকেয়া আছে / Credit)</option>
            </select>
          </div>
        )}

        {selectedReportId === 5 && (
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">ডিলার / রেফারেন্স :</label>
            <select
              value={selectedDealer}
              onChange={(e) => setSelectedDealer(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900 font-medium"
            >
              <option value="">-- ডিলার বাছুন --</option>
              {distinctDealers.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedReportId === 7 && (
          <div className="space-y-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block text-xs">Supplier :</label>
              <select
                value={selectedReportVendor}
                onChange={(e) => setSelectedReportVendor(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900 font-semibold"
              >
                <option value="all">-- All Suppliers / Vendors --</option>
                {availableVendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block text-xs">From :</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-[11px]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                // Trigger refresh / re-render
                setSelectedReportId(7);
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-xs cursor-pointer text-xs flex items-center justify-center gap-1.5"
            >
              Submit
            </button>

            <div className="space-y-1 pt-1 border-t border-slate-200">
              <label className="font-bold text-slate-700 block text-[11px]">ফিল্টার গ্রেড (Grade Filter) :</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'all', label: 'সকল', color: 'bg-slate-700' },
                  { id: 'A', label: 'Grade A', color: 'bg-emerald-700' },
                  { id: 'B', label: 'Grade B', color: 'bg-amber-700' },
                  { id: 'C', label: 'Grade C', color: 'bg-rose-700' },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedReportGrade(g.id)}
                    className={`py-1 px-1.5 rounded text-[11px] font-bold text-center cursor-pointer transition ${
                      selectedReportGrade === g.id
                        ? `${g.color} text-white shadow-xs`
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handlePrintReport}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded shadow-sm transition cursor-pointer flex items-center justify-center gap-2 text-xs active:scale-95"
          >
            <Printer className="w-4 h-4" />
            সরাসরি প্রিন্ট করুন (Print Now)
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleDownloadReport}
              className="py-1.5 px-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 text-[11px]"
            >
              <Download className="w-3.5 h-3.5" />
              ডাউনলোড (HTML)
            </button>
            <button
              onClick={() => {
                if (reportData) onOpenPrintModal(reportData);
              }}
              className="py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 text-[11px]"
            >
              প্রিভিউ মোডাল
            </button>
          </div>
        </div>
      </div>

      {/* Right Canvas: Live Preview */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-200">
        {/* Top Zoom & Print Bar */}
        <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between border-b border-slate-700">
          <span className="font-bold text-xs">{reportData?.title}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.1))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] text-slate-300">{Math.round(zoomScale * 100)}%</span>
            <button
              onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.1))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomScale(1)}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Fit Normal"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePrintReport}
              className="ml-3 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              প্রিন্ট করুন (Print)
            </button>
            <button
              onClick={handleDownloadReport}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              ডাউনলোড
            </button>
          </div>
        </div>

        {/* Action feedback banner */}
        {statusNotice && (
          <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-emerald-800 shadow-inner">
            <span>{statusNotice}</span>
            <button
              onClick={() => setStatusNotice('')}
              className="text-emerald-200 hover:text-white font-bold ml-3 text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-emerald-800"
            >
              ✕ বন্ধ করুন
            </button>
          </div>
        )}

        {/* Paper Container */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center">
          <div
            ref={reportPaperRef}
            style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
            className="bg-white p-6 sm:p-8 w-full max-w-[850px] shadow-lg rounded-sm border border-slate-300 text-slate-900 transition-transform duration-100"
          >
            {/* 1. CUSTOMER TRANSACTION DETAIL VIEW (Matching transaction.jpg) */}
            {reportData?.reportType === 'customer_transaction' ? (
              <div>
                <div className="text-center pb-2">
                  <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">{shop.name}</h1>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{shop.address}</p>
                  <p className="text-xs font-semibold text-slate-700">{shop.phones}</p>

                  <div className="my-3 flex justify-center">
                    <div className="border border-slate-900 px-6 py-1 text-sm font-bold text-slate-900">
                      ক্রেতা (Customer) Transaction Detail
                    </div>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900 mb-2 font-mono">
                  {reportData.customerHeader}
                </div>

                {reportData.blocks.map((block, bIdx) => (
                  <div key={bIdx} className="mb-4">
                    <table className="w-full text-xs border-collapse border border-slate-900">
                      <thead className="bg-white text-slate-900 font-bold border-b border-slate-900">
                        <tr>
                          {block.heads.map((h, hIdx) => (
                            <th
                              key={hIdx}
                              className={`border border-slate-900 p-1.5 ${
                                h === 'SL'
                                  ? 'text-center w-10'
                                  : h === 'Debit' || h === 'Credit'
                                  ? 'text-right'
                                  : 'text-left'
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-400 hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`border border-slate-400 p-1.5 ${
                                  cIdx === 0
                                    ? 'text-center font-mono w-10'
                                    : cIdx === 5 || cIdx === 6
                                    ? 'text-right font-mono'
                                    : 'text-left'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Right Bottom Summary */}
                {reportData.totalsRight && (
                  <div className="flex justify-end mt-4">
                    <div className="w-64 font-mono text-xs">
                      <div className="flex justify-between py-1 font-bold text-slate-800">
                        <span>সর্বমোট ডে.</span>
                        <span>{reportData.totalsRight.debit}</span>
                      </div>
                      <div className="flex justify-between py-1 font-bold text-slate-800">
                        <span>সর্বমোট ক্রে.</span>
                        <span>{reportData.totalsRight.credit}</span>
                      </div>
                      <div className="border-t border-slate-900 my-1"></div>
                      <div className="flex justify-between py-1 font-black text-sm text-red-600">
                        <span>মোট বকেয়া</span>
                        <span>{reportData.totalsRight.due}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : reportData?.reportType === 'stock_report' ? (
              /* 2. STOCK REPORT VIEW (Matching stock report.jpg) */
              <div>
                <div className="text-center pb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{shop.name}</h1>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{shop.address}</p>
                  <h2 className="text-base font-bold text-slate-900 mt-2">{reportData.supplierName}</h2>
                  <p className="text-xs text-slate-600">Stock Date: {reportData.stockDate}</p>
                </div>

                <div className="flex justify-end text-[11px] text-slate-700 font-mono mb-1">
                  | Print Date : {reportData.printDate}
                </div>

                {reportData.blocks.map((block, bIdx) => (
                  <div key={bIdx} className="mb-4">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-800 text-slate-900 font-bold text-left">
                          {block.heads.map((h, hIdx) => (
                            <th
                              key={hIdx}
                              className={`py-1.5 px-2 ${
                                h === 'GradeName'
                                  ? 'text-center'
                                  : h === 'Closing Cartoon|Pcs' || h === 'Stock(Sft)'
                                  ? 'text-left'
                                  : 'text-left'
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {block.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-1.5 px-2 ${
                                  cIdx === 0
                                    ? 'text-left font-mono font-medium text-slate-800'
                                    : cIdx === 3
                                    ? 'text-center font-bold text-slate-800'
                                    : 'text-left'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {block.total && (
                          <tr className="font-bold border-t-2 border-slate-800 bg-slate-50">
                            {block.total.map((tCell, tIdx) => (
                              <td
                                key={tIdx}
                                className={`py-1.5 px-2 ${tIdx === 3 ? 'text-center' : 'text-left'}`}
                              >
                                {tCell}
                              </td>
                            ))}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Stock Summary Box */}
                {reportData.summary && (
                  <div className="flex justify-end mt-4">
                    <div className="w-80 border border-slate-300 rounded p-2.5 bg-slate-50 text-xs font-mono space-y-1">
                      {reportData.summary.map(([label, val], sIdx) => (
                        <div key={sIdx} className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-medium text-slate-600">{label}:</span>
                          <span className="font-bold text-slate-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* 3. STANDARD REPORT VIEW */
              <div>
                <div className="border-b-2 border-slate-800 pb-3 mb-4 text-center">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">{shop.name}</h2>
                  <p className="text-xs text-slate-600 mt-0.5">{shop.address}</p>
                  <p className="text-xs text-slate-600">ফোন: {shop.phones}</p>
                  <div className="mt-3">
                    <h3 className="text-base font-bold uppercase tracking-wider text-slate-800 border-b border-slate-400 inline-block px-3 pb-0.5">
                      {reportData?.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">{reportData?.period}</p>
                  </div>
                </div>

                {reportData?.info && (
                  <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 space-y-0.5">
                    {reportData.info.map((inf, i) => (
                      <p key={i}>{inf}</p>
                    ))}
                  </div>
                )}

                {/* Blocks */}
                {reportData?.blocks.map((block, bIdx) => (
                  <div key={bIdx} className="mb-5">
                    {block.caption && (
                      <h4 className="font-bold text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded-t border-t border-x border-slate-300 inline-block">
                        {block.caption}
                      </h4>
                    )}
                    <table className="w-full text-xs text-left border-collapse border border-slate-300">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <tr>
                          {block.heads.map((h, hIdx) => (
                            <th key={hIdx} className="border border-slate-300 p-1.5 text-center">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {block.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`border border-slate-200 p-1.5 ${
                                  cIdx === 0
                                    ? 'text-center font-mono w-10 text-slate-500'
                                    : cIdx >= row.length - 2
                                    ? 'text-right font-mono font-medium'
                                    : 'text-left'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {block.total && (
                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                            {block.total.map((tCell, tIdx) => (
                              <td
                                key={tIdx}
                                className={`border border-slate-300 p-1.5 ${
                                  tIdx >= block.total!.length - 2 ? 'text-right font-mono' : 'text-left'
                                }`}
                              >
                                {tCell}
                              </td>
                            ))}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Summary Box */}
                {reportData?.summary && (
                  <div className="flex justify-end mt-4">
                    <div className="w-72 border border-slate-400 rounded p-3 bg-slate-50 text-xs font-mono space-y-1">
                      {reportData.summary.map(([label, val], sIdx) => (
                        <div key={sIdx} className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="font-semibold text-slate-700">{label}:</span>
                          <span className="font-bold text-slate-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
