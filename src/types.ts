export interface Product {
  id: number;
  code: string;
  category: string;
  vendor?: string;
  grade?: 'A' | 'B' | 'C' | string;
  name: string;
  isTile: boolean;
  w: number;
  h: number;
  scm: number;
  sftPack: number;
  qtyPack: number;
  rate: number;
  price: number;
  stockBox?: number;
  stockPiece?: number;
  stockSft?: number;
}

export interface Customer {
  id: number;
  name: string;
  address: string;
  phone: string;
  deal: string;
  openDue: number;
}

export interface DealerDeal {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  note?: string;
}

export interface Item {
  productId: number;
  name: string;
  dim: string;
  box: number;
  piece: number;
  sft: number;
  unit: number;
  total: number;
  isTile: boolean;
}

export interface Payment {
  id: number;
  date: string; // ISO string or YYYY-MM-DD HH:mm:ss
  custId: number;
  custName: string;
  amount: number;
  remark: string;
  method: 'Cash' | 'Bank' | 'Bkash' | string;
}

export interface Invoice {
  no: number;
  date: string; // YYYY-MM-DD HH:mm:ss
  custId: number;
  custName: string;
  address: string;
  phone: string;
  deal: string;
  comment: string;
  labor: number;
  discount: number;
  prevDue: number;
  cash: number;
  bank: number;
  bkash: number;
  items: Item[];
  deliveryStatus?: 'pending' | 'partial' | 'delivered';
}

export interface Txn {
  id: number;
  date: string; // YYYY-MM-DD
  isIncome: boolean;
  head: string;
  amount: number;
}

export interface ShopConfig {
  name: string;
  address: string;
  phones: string;
  web: string;
  note: string;
  preparedBy: string;
  startInvoiceNo: string;
  footerText: string;
  logoUrl?: string;
}

// User & Role Based Access Control (RBAC)
export type UserRole = 'admin' | 'staff';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password: string; // Stored securely in storage
  phone?: string;
  createdAt: string;
}

// Admin controlled permissions for Staff users
export interface StaffPermissions {
  canCreateInvoice: boolean;       // নতুন বিল ও বিক্রয় তৈরি
  canEditInvoice: boolean;         // বিল এডিট
  canDeleteInvoice: boolean;       // বিল ডিলিট
  canChangeDeal: boolean;          // মেমুতে ডিল পরিবর্তন
  canAccessStock: boolean;         // স্টক ও চালান মেনু
  canDispatchDelivery: boolean;    // চালান ডেলিভারি পাঠানো
  canStockIn: boolean;             // ভেন্ডর স্টক ইন
  canManageCustomers: boolean;     // গ্রাহক যোগ ও এডিট
  canDeleteCustomers: boolean;     // গ্রাহক ডিলিট
  canManageProducts: boolean;      // পণ্য এন্ট্রি ও দর
  canRecordPayment: boolean;       // টাকা জমা ভাউচার
  canManageExpenses: boolean;      // আয়-ব্যয় খরচ
  canViewReports: boolean;         // সেলস রিপোর্ট
  canAccessSettings: boolean;      // দোকান সেটিংস
  canBackupData: boolean;          // ডাটা ব্যাকআপ
}

// Stock In / Vendor Purchase Record
export interface StockInItem {
  productId: number;
  name: string;
  dim: string;
  box: number;
  piece: number;
  sft: number;
  rate: number;
  total: number;
  isTile: boolean;
}

export interface StockInRecord {
  id: number;
  vendorName: string;
  vendorChallanNo: string;
  referenceNo: string;
  date: string;
  note: string;
  items: StockInItem[];
  totalAmount: number;
  receivedBy: string;
}

// Delivery Challan / Stock Out (Supports Split / Partial Delivery)
export interface DeliveryItem {
  productId: number;
  name: string;
  dim: string;
  box: number;
  piece: number;
  sft: number;
  isTile: boolean;
}

export interface DeliveryChallan {
  id: number;
  challanNo: string; // e.g. "CH-240001-1"
  invoiceNo: number;
  custId: number;
  custName: string;
  address: string;
  phone: string;
  deal: string;
  date: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  note?: string;
  items: DeliveryItem[]; // Quantities delivered in this specific trip
  dispatchedBy: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'order'
  | 'stock_inventory'
  | 'customer'
  | 'products'
  | 'payment'
  | 'due_list'
  | 'income_expend'
  | 'sales_report'
  | 'settings'
  | 'admin_control'
  | 'data_backup'
  | 'desktop_app'
  | 'vb_code';
