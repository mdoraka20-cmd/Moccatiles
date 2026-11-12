import {
  Customer,
  DealerDeal,
  DeliveryChallan,
  DeliveryItem,
  Invoice,
  Item,
  Payment,
  Product,
  ShopConfig,
  StockInItem,
  StockInRecord,
  Txn,
  AppUser,
  StaffPermissions,
} from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'tiles_billing_products_v2',
  CUSTOMERS: 'tiles_billing_customers_v2',
  INVOICES: 'tiles_billing_invoices_v2',
  PAYMENTS: 'tiles_billing_payments_v2',
  TXNS: 'tiles_billing_txns_v2',
  SHOP: 'tiles_billing_shop_v2',
  DEALERS: 'tiles_billing_dealers_v2',
  USERS: 'tiles_billing_users_v2',
  CURRENT_USER: 'tiles_billing_current_user_v2',
  STOCK_INS: 'tiles_billing_stock_ins_v2',
  DELIVERIES: 'tiles_billing_deliveries_v2',
  AUTH_SESSION: 'tiles_billing_auth_session_v2',
  STAFF_PERMS: 'tiles_billing_staff_perms_v2',
  CATEGORIES: 'tiles_billing_categories_v2',
  VENDORS: 'tiles_billing_vendors_v2',
};

export const defaultCategories: string[] = [
  'Wall Tiles',
  'Floor Tiles',
  'Glazed Rustic Wall',
  'Floor Polished 16x16',
  'Porcelain Nano Floor 24x24',
  'Sanitary Brass Fittings',
  'Ceramic Sanitary Ware',
  'Decor & Border',
  'Homogeneous Tiles',
  'Bathroom Tiles',
  'Kitchen Tiles',
  'Stair Tiles',
];

export const defaultVendors: string[] = [
  'আকিজ সিরামিকস (Akij Ceramics)',
  'মীর সিরামিকস (Mir Ceramics)',
  'ডিবিএল সিরামিকস (DBL Ceramics)',
  'আরএকে সিরামিকস (RAK Ceramics)',
  'স্টার সিরামিকস (Star Ceramics)',
  'গ্রেটওয়াল সিরামিকস (Greatwall)',
  'ফু-ওয়াং সিরামিকস (Fu-Wang)',
  'বিসিএল সিরামিকস (BCL Ceramics)',
];

export const defaultStaffPermissions: StaffPermissions = {
  canCreateInvoice: true,
  canEditInvoice: true,
  canDeleteInvoice: false,
  canChangeDeal: true,
  canAccessStock: true,
  canDispatchDelivery: true,
  canStockIn: true,
  canManageCustomers: true,
  canDeleteCustomers: false,
  canManageProducts: false,
  canRecordPayment: true,
  canManageExpenses: true,
  canViewReports: true,
  canAccessSettings: false,
  canBackupData: false,
};

export const defaultShopConfig: ShopConfig = {
  name: 'MOCCA TILES & FITTINGS',
  address: 'Abu Taher Plaza, Puniout Bypass, Brahmanbaria',
  phones: '01748-293 800 (BKash) , 01996-701 702 , 01996-701 707',
  web: 'Web : http://noortiles.wordpress.com, Gmail : tilesnoor@gmail.com',
  note: 'চায়না, ভেজা, সিমেন্ট লাগানো টাইলস ফেরত যোগ্য নয়।\nঅবশ্যই ২ মাসের ভিতর টাইলস ফেরত দিতে হবে।',
  preparedBy: 'AnayeT',
  startInvoiceNo: '260001',
  footerText: 'Software developed by ORS IT- 01732970999',
  logoUrl: '',
};

export const initialUsers: AppUser[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'প্রধান এডমিন (Super Admin)',
    role: 'admin',
    password: 'admin123',
    phone: '01700-000001',
    createdAt: '2026-01-01 09:00:00',
  },
  {
    id: 'usr_sales',
    username: 'sales',
    name: 'সেলস ম্যানেজার (Sales Staff)',
    role: 'staff',
    password: 'sales123',
    phone: '01700-000002',
    createdAt: '2026-01-01 09:00:00',
  },
];

export const initialDealers: DealerDeal[] = [
  { id: 1, name: 'ডিলার - কামাল ব্রিকস', phone: '01711223344', address: 'বনশ্রী, ঢাকা', note: 'নিয়মিত পাইকারি ডিলার' },
  { id: 2, name: 'কন্ট্রাক্টর আরিফ বিল্ডার্স', phone: '01819556677', address: 'আফতাবনগর, ঢাকা', note: 'নির্মাণ ঠিকাদার' },
  { id: 3, name: 'মেসার্স আনোয়ার ট্রেডার্স', phone: '01912889900', address: 'টঙ্গী, গাজীপুর', note: 'সাব-ডিলার' },
  { id: 4, name: 'আল-আমিন স্যানিটারি মার্ট', phone: '01677889900', address: 'মিরপুর ১০, ঢাকা', note: 'স্যানিটারি পাইকারি' },
];

export const initialProducts: Product[] = [
  {
    id: 3010001,
    code: 'PC-51_A_STC',
    category: 'Glazed Rustic Wall',
    vendor: 'আকিজ সিরামিকস (Akij Ceramics)',
    grade: 'A',
    name: 'PC-51_A_STC-Glazed Rustic Wall',
    isTile: true,
    w: 8,
    h: 12,
    scm: 1.55,
    sftPack: 16.6667,
    qtyPack: 25,
    rate: 45,
    price: 52,
    stockBox: 120,
    stockPiece: 0,
    stockSft: 2000,
  },
  {
    id: 3010002,
    code: 'FL-204_MARBLE',
    category: 'Floor Polished 16x16',
    vendor: 'মীর সিরামিকস (Mir Ceramics)',
    grade: 'A',
    name: 'FL-204_MARBLE-Floor Polished 16x16',
    isTile: true,
    w: 16,
    h: 16,
    scm: 1.78,
    sftPack: 17.78,
    qtyPack: 10,
    rate: 68,
    price: 78,
    stockBox: 85,
    stockPiece: 0,
    stockSft: 1511.3,
  },
  {
    id: 3010003,
    code: 'FL-6060_PORC',
    category: 'Porcelain Nano Floor 24x24',
    vendor: 'আকিজ সিরামিকস (Akij Ceramics)',
    grade: 'B',
    name: 'FL-6060_PORC-Porcelain Nano Floor 24x24',
    isTile: true,
    w: 24,
    h: 24,
    scm: 1.44,
    sftPack: 15.5,
    qtyPack: 4,
    rate: 110,
    price: 135,
    stockBox: 60,
    stockPiece: 0,
    stockSft: 930,
  },
  {
    id: 3010004,
    code: 'SAN-BASIN_MIXER',
    category: 'Sanitary Brass Fittings',
    vendor: 'ডিবিএল সিরামিকস (DBL Ceramics)',
    grade: 'A',
    name: 'SAN-BASIN_MIXER-Sanitary Brass Fittings',
    isTile: false,
    w: 0,
    h: 0,
    scm: 0,
    sftPack: 0,
    qtyPack: 1,
    rate: 1200,
    price: 1650,
    stockBox: 0,
    stockPiece: 45,
    stockSft: 0,
  },
  {
    id: 3010005,
    code: 'SAN-COMMODE_SET',
    category: 'Ceramic Sanitary Ware',
    vendor: 'আরএকে সিরামিকস (RAK Ceramics)',
    grade: 'A',
    name: 'SAN-COMMODE_SET-Ceramic Sanitary Ware',
    isTile: false,
    w: 0,
    h: 0,
    scm: 0,
    sftPack: 0,
    qtyPack: 1,
    rate: 4500,
    price: 5800,
    stockBox: 0,
    stockPiece: 20,
    stockSft: 0,
  },
];

export const initialCustomers: Customer[] = [
  {
    id: 4000001,
    name: 'আলহাজ্ব মোঃ কামাল হোসেন',
    address: 'হাউজ ২১, বনশ্রী ডি-ব্লক, ঢাকা',
    phone: '01711223344',
    deal: 'ডিলার - কামাল ব্রিকস',
    openDue: 15000,
  },
  {
    id: 4000002,
    name: 'ইঞ্জিনিয়ার আরিফুল ইসলাম',
    address: 'প্লট ৮, আফতাবনগর, ঢাকা',
    phone: '01819556677',
    deal: 'কন্ট্রাক্টর আরিফ বিল্ডার্স',
    openDue: 0,
  },
  {
    id: 4000003,
    name: 'মেসার্স আনোয়ার এন্টারপ্রাইজ',
    address: 'স্টেশন রোড, টঙ্গী, গাজীপুর',
    phone: '01912889900',
    deal: 'মেসার্স আনোয়ার ট্রেডার্স',
    openDue: 28500,
  },
];

const now = new Date();
const todayStr = now.toISOString().slice(0, 10);

export const initialPayments: Payment[] = [
  {
    id: 1,
    date: `${todayStr} 10:30:00`,
    custId: 4000001,
    custName: 'আলহাজ্ব মোঃ কামাল হোসেন',
    amount: 10000,
    remark: 'পূর্বের বাকি জমা',
    method: 'Bkash',
  },
];

export const initialInvoices: Invoice[] = [
  {
    no: 240001,
    date: `${todayStr} 11:15:00`,
    custId: 4000002,
    custName: 'ইঞ্জিনিয়ার আরিফুল ইসলাম',
    address: 'প্লট ৮, আফতাবনগর, ঢাকা',
    phone: '01819556677',
    deal: 'কন্ট্রাক্টর আরিফ বিল্ডার্স',
    comment: 'নিচতলার ফ্লোর ও বাথরুমের মালামাল',
    labor: 4.8,
    discount: 500,
    prevDue: 0,
    cash: 10000,
    bank: 5000,
    bkash: 0,
    deliveryStatus: 'partial',
    items: [
      {
        productId: 3010001,
        name: 'PC-51_A_STC-Glazed Rustic Wall',
        dim: '8.00 X 12.00',
        box: 5,
        piece: 0,
        sft: 83.33,
        unit: 52,
        total: 4333.16,
        isTile: true,
      },
      {
        productId: 3010003,
        name: 'FL-6060_PORC-Porcelain Nano Floor 24x24',
        dim: '24.00 X 24.00',
        box: 10,
        piece: 0,
        sft: 155,
        unit: 135,
        total: 20925,
        isTile: true,
      },
      {
        productId: 3010004,
        name: 'SAN-BASIN_MIXER-Sanitary Brass Fittings',
        dim: '0.00 X 0.00',
        box: 0,
        piece: 2,
        sft: 0,
        unit: 1650,
        total: 3300,
        isTile: false,
      },
    ],
  },
];

export const initialStockIns: StockInRecord[] = [
  {
    id: 101,
    vendorName: 'মীর সিরামিকস লিমিটেড (Mir Ceramics Ltd.)',
    vendorChallanNo: 'MIR-CH-8842',
    referenceNo: 'PO-2026-001',
    date: `${todayStr} 09:30:00`,
    note: 'মেইন ওয়্যারহাউজ রামপুরা গোডাউনে রিসিভড',
    totalAmount: 185000,
    receivedBy: 'মোঃ রফিকুল ইসলাম',
    items: [
      {
        productId: 3010001,
        name: 'PC-51_A_STC-Glazed Rustic Wall',
        dim: '8.00 X 12.00',
        box: 100,
        piece: 0,
        sft: 1666.67,
        rate: 45,
        total: 75000,
        isTile: true,
      },
      {
        productId: 3010003,
        name: 'FL-6060_PORC-Porcelain Nano Floor 24x24',
        dim: '24.00 X 24.00',
        box: 50,
        piece: 0,
        sft: 775,
        rate: 110,
        total: 85250,
        isTile: true,
      },
    ],
  },
];

export const initialDeliveries: DeliveryChallan[] = [
  {
    id: 1,
    challanNo: 'CH-240001-1',
    invoiceNo: 240001,
    custId: 4000002,
    custName: 'ইঞ্জিনিয়ার আরিফুল ইসলাম',
    address: 'প্লট ৮, আফতাবনগর, ঢাকা',
    phone: '01819556677',
    deal: 'কন্ট্রাক্টর আরিফ বিল্ডার্স',
    date: `${todayStr} 14:00:00`,
    vehicleNo: 'ঢাকা মেট্রো-ন ১১-২২৩৩',
    driverName: 'মোঃ বাবুল হোসেন',
    driverPhone: '01722-334455',
    note: 'প্রথম ট্রিপ ডেলিভারি',
    dispatchedBy: 'মোঃ রফিকুল ইসলাম',
    items: [
      {
        productId: 3010001,
        name: 'PC-51_A_STC-Glazed Rustic Wall',
        dim: '8.00 X 12.00',
        box: 5,
        piece: 0,
        sft: 83.33,
        isTile: true,
      },
    ],
  },
];

export const initialTxns: Txn[] = [
  {
    id: 1,
    date: todayStr,
    isIncome: true,
    head: 'পুরাতন কার্টন ও প্যাকিং সেল',
    amount: 1200,
  },
  {
    id: 2,
    date: todayStr,
    isIncome: false,
    head: 'দোকানের চা-নাস্তা ও ডেলিভারি লেবার খরচ',
    amount: 850,
  },
];

export class StorageService {
  static getShop(): ShopConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOP);
      if (!data) return defaultShopConfig;
      const parsed = JSON.parse(data);
      if (parsed.name === 'মেসার্স সততা টাইলস ও স্যানিটারি') {
        return defaultShopConfig;
      }
      return { ...defaultShopConfig, ...parsed };
    } catch {
      return defaultShopConfig;
    }
  }

  static saveShop(shop: ShopConfig) {
    localStorage.setItem(STORAGE_KEYS.SHOP, JSON.stringify(shop));
  }

  static getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : initialProducts;
    } catch {
      return initialProducts;
    }
  }

  static saveProducts(products: Product[]) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  static getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : initialCustomers;
    } catch {
      return initialCustomers;
    }
  }

  static saveCustomers(customers: Customer[]) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  static getInvoices(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return data ? JSON.parse(data) : initialInvoices;
    } catch {
      return initialInvoices;
    }
  }

  static saveInvoices(invoices: Invoice[]) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }

  static getPayments(): Payment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return data ? JSON.parse(data) : initialPayments;
    } catch {
      return initialPayments;
    }
  }

  static savePayments(payments: Payment[]) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }

  static getTxns(): Txn[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TXNS);
      return data ? JSON.parse(data) : initialTxns;
    } catch {
      return initialTxns;
    }
  }

  static saveTxns(txns: Txn[]) {
    localStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(txns));
  }

  // Dealers / Deals master
  static getDealers(): DealerDeal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEALERS);
      return data ? JSON.parse(data) : initialDealers;
    } catch {
      return initialDealers;
    }
  }

  static saveDealers(dealers: DealerDeal[]) {
    localStorage.setItem(STORAGE_KEYS.DEALERS, JSON.stringify(dealers));
  }

  static addOrGetDealer(dealName: string): DealerDeal | null {
    const trimmed = dealName.trim();
    if (!trimmed) return null;
    const dealers = this.getDealers();
    const existing = dealers.find((d) => d.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const nextId = dealers.length === 0 ? 1 : Math.max(...dealers.map((d) => d.id)) + 1;
    const newDealer: DealerDeal = {
      id: nextId,
      name: trimmed,
    };
    const updated = [...dealers, newDealer];
    this.saveDealers(updated);
    return newDealer;
  }

  // Update Deal on an existing invoice/memo
  static updateInvoiceDeal(invoiceNo: number, newDealName: string): boolean {
    const invoices = this.getInvoices();
    const idx = invoices.findIndex((inv) => inv.no === invoiceNo);
    if (idx === -1) return false;

    invoices[idx].deal = newDealName.trim();
    this.saveInvoices(invoices);
    if (newDealName.trim()) {
      this.addOrGetDealer(newDealName.trim());
    }
    return true;
  }

  // User Authentication & Roles
  static getUsers(): AppUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : initialUsers;
    } catch {
      return initialUsers;
    }
  }

  static saveUsers(users: AppUser[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static verifyAdminPassword(inputPass: string): boolean {
    try {
      const users = this.getUsers();
      const admin = users.find((u) => u.role === 'admin');
      const correctPass = admin?.password || 'admin123';
      return inputPass.trim() === correctPass.trim();
    } catch {
      return inputPass.trim() === 'admin123';
    }
  }

  static getCurrentUser(): AppUser {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : initialUsers[0]; // default admin
    } catch {
      return initialUsers[0];
    }
  }

  static setCurrentUser(user: AppUser) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  static isUserLoggedIn(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
    } catch {
      return false;
    }
  }

  static setAuthSession(isLoggedIn: boolean) {
    if (isLoggedIn) {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
  }

  static getStaffPermissions(): StaffPermissions {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAFF_PERMS);
      return data ? { ...defaultStaffPermissions, ...JSON.parse(data) } : defaultStaffPermissions;
    } catch {
      return defaultStaffPermissions;
    }
  }

  static saveStaffPermissions(perms: StaffPermissions) {
    localStorage.setItem(STORAGE_KEYS.STAFF_PERMS, JSON.stringify(perms));
  }

  // Categories Master Management
  static getCategories(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Gather from existing products if any
      const fromProds = this.getProducts()
        .map((p) => p.category)
        .filter((c) => c && c.trim().length > 0);
      const combined = Array.from(new Set([...defaultCategories, ...fromProds])).sort();
      this.saveCategories(combined);
      return combined;
    } catch {
      return defaultCategories;
    }
  }

  static saveCategories(categories: string[]) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  static addCategory(categoryName: string): string[] {
    const trimmed = categoryName.trim();
    if (!trimmed) return this.getCategories();
    const current = this.getCategories();
    if (!current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...current, trimmed].sort();
      this.saveCategories(updated);
      return updated;
    }
    return current;
  }

  static renameCategory(oldName: string, newName: string): { updatedCategories: string[]; affectedCount: number } {
    const oldTrimmed = oldName.trim();
    const newTrimmed = newName.trim();
    if (!oldTrimmed || !newTrimmed) return { updatedCategories: this.getCategories(), affectedCount: 0 };

    const current = this.getCategories();
    const updatedCategories = current.map((c) => (c.toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : c)).sort();
    this.saveCategories(updatedCategories);

    // Update in products
    const products = this.getProducts();
    let affectedCount = 0;
    products.forEach((p) => {
      if (p.category && p.category.toLowerCase() === oldTrimmed.toLowerCase()) {
        p.category = newTrimmed;
        if (p.code) {
          p.name = `${p.code}-${newTrimmed}`;
        }
        affectedCount++;
      }
    });
    if (affectedCount > 0) {
      this.saveProducts(products);
    }

    return { updatedCategories, affectedCount };
  }

  static deleteCategory(categoryName: string): string[] {
    const trimmed = categoryName.trim();
    const current = this.getCategories();
    const updated = current.filter((c) => c.toLowerCase() !== trimmed.toLowerCase());
    this.saveCategories(updated);
    return updated;
  }

  // Vendors Master Management
  static getVendors(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VENDORS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const fromProds = this.getProducts()
        .map((p) => p.vendor)
        .filter((v): v is string => !!v && v.trim().length > 0);
      const combined = Array.from(new Set([...defaultVendors, ...fromProds])).sort();
      this.saveVendors(combined);
      return combined;
    } catch {
      return defaultVendors;
    }
  }

  static saveVendors(vendors: string[]) {
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));
  }

  static addVendor(vendorName: string): string[] {
    const trimmed = vendorName.trim();
    if (!trimmed) return this.getVendors();
    const current = this.getVendors();
    if (!current.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...current, trimmed].sort();
      this.saveVendors(updated);
      return updated;
    }
    return current;
  }

  static renameVendor(oldName: string, newName: string): { updatedVendors: string[]; affectedCount: number } {
    const oldTrimmed = oldName.trim();
    const newTrimmed = newName.trim();
    if (!oldTrimmed || !newTrimmed) return { updatedVendors: this.getVendors(), affectedCount: 0 };

    const current = this.getVendors();
    const updatedVendors = current.map((v) => (v.toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : v)).sort();
    this.saveVendors(updatedVendors);

    // Update in products
    const products = this.getProducts();
    let affectedCount = 0;
    products.forEach((p) => {
      if (p.vendor && p.vendor.toLowerCase() === oldTrimmed.toLowerCase()) {
        p.vendor = newTrimmed;
        affectedCount++;
      }
    });
    if (affectedCount > 0) {
      this.saveProducts(products);
    }

    return { updatedVendors, affectedCount };
  }

  static deleteVendor(vendorName: string): string[] {
    const trimmed = vendorName.trim();
    const current = this.getVendors();
    const updated = current.filter((v) => v.toLowerCase() !== trimmed.toLowerCase());
    this.saveVendors(updated);
    return updated;
  }

  // Stock In records
  static getStockInRecords(): StockInRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_INS);
      return data ? JSON.parse(data) : initialStockIns;
    } catch {
      return initialStockIns;
    }
  }

  static saveStockInRecords(records: StockInRecord[]) {
    localStorage.setItem(STORAGE_KEYS.STOCK_INS, JSON.stringify(records));
  }

  static addStockInRecord(record: StockInRecord) {
    const records = this.getStockInRecords();
    const updated = [record, ...records];
    this.saveStockInRecords(updated);

    // Increase product stock quantities
    const products = this.getProducts();
    record.items.forEach((it) => {
      const pIdx = products.findIndex((p) => p.id === it.productId);
      if (pIdx !== -1) {
        products[pIdx].stockBox = (products[pIdx].stockBox || 0) + (it.box || 0);
        products[pIdx].stockPiece = (products[pIdx].stockPiece || 0) + (it.piece || 0);
        products[pIdx].stockSft = (products[pIdx].stockSft || 0) + (it.sft || 0);
      }
    });
    this.saveProducts(products);
  }

  // Delivery Challans (Stock Out & Split Deliveries)
  static getDeliveryChallans(): DeliveryChallan[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
      return data ? JSON.parse(data) : initialDeliveries;
    } catch {
      return initialDeliveries;
    }
  }

  static saveDeliveryChallans(challans: DeliveryChallan[]) {
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(challans));
  }

  static addDeliveryChallan(challan: DeliveryChallan) {
    const challans = this.getDeliveryChallans();
    const updated = [challan, ...challans];
    this.saveDeliveryChallans(updated);

    // Deduct stock for delivered items
    const products = this.getProducts();
    challan.items.forEach((it) => {
      const pIdx = products.findIndex((p) => p.id === it.productId);
      if (pIdx !== -1) {
        products[pIdx].stockBox = Math.max(0, (products[pIdx].stockBox || 0) - (it.box || 0));
        products[pIdx].stockPiece = Math.max(0, (products[pIdx].stockPiece || 0) - (it.piece || 0));
        products[pIdx].stockSft = Math.max(0, (products[pIdx].stockSft || 0) - (it.sft || 0));
      }
    });
    this.saveProducts(products);

    // Update invoice delivery status
    const invoices = this.getInvoices();
    const invIdx = invoices.findIndex((i) => i.no === challan.invoiceNo);
    if (invIdx !== -1) {
      const statusObj = this.getInvoiceDeliveryStatus(challan.invoiceNo, invoices[invIdx], updated);
      invoices[invIdx].deliveryStatus = statusObj.status;
      this.saveInvoices(invoices);
    }
  }

  // Calculate detailed Delivery Status for an Invoice
  static getInvoiceDeliveryStatus(
    invoiceNo: number,
    invParam?: Invoice,
    challansParam?: DeliveryChallan[]
  ) {
    const inv = invParam || this.getInvoices().find((i) => i.no === invoiceNo);
    if (!inv) {
      return {
        status: 'pending' as const,
        orderedTotalBox: 0,
        deliveredTotalBox: 0,
        remainingTotalBox: 0,
        orderedTotalPiece: 0,
        deliveredTotalPiece: 0,
        remainingTotalPiece: 0,
        isFullyDelivered: false,
        itemStatuses: [],
        dispatchesCount: 0,
      };
    }

    const challans = (challansParam || this.getDeliveryChallans()).filter(
      (ch) => ch.invoiceNo === invoiceNo
    );

    let orderedTotalBox = 0;
    let deliveredTotalBox = 0;
    let orderedTotalPiece = 0;
    let deliveredTotalPiece = 0;

    const itemStatuses = inv.items.map((it) => {
      const orderedBox = it.box || 0;
      const orderedPiece = it.piece || 0;
      const orderedSft = it.sft || 0;

      // Sum all delivered quantities for this product across all challans of this invoice
      let deliveredBox = 0;
      let deliveredPiece = 0;
      let deliveredSft = 0;

      challans.forEach((ch) => {
        ch.items.forEach((chIt) => {
          if (chIt.productId === it.productId) {
            deliveredBox += chIt.box || 0;
            deliveredPiece += chIt.piece || 0;
            deliveredSft += chIt.sft || 0;
          }
        });
      });

      const remainingBox = Math.max(0, orderedBox - deliveredBox);
      const remainingPiece = Math.max(0, orderedPiece - deliveredPiece);
      const remainingSft = Math.max(0, orderedSft - deliveredSft);

      orderedTotalBox += orderedBox;
      deliveredTotalBox += deliveredBox;
      orderedTotalPiece += orderedPiece;
      deliveredTotalPiece += deliveredPiece;

      return {
        productId: it.productId,
        name: it.name,
        dim: it.dim,
        isTile: it.isTile,
        orderedBox,
        orderedPiece,
        orderedSft,
        deliveredBox,
        deliveredPiece,
        deliveredSft,
        remainingBox,
        remainingPiece,
        remainingSft,
        isItemComplete: remainingBox <= 0 && remainingPiece <= 0,
      };
    });

    const isFullyDelivered = itemStatuses.every((it) => it.isItemComplete);
    const hasAnyDelivery = challans.length > 0;

    const status: 'pending' | 'partial' | 'delivered' = isFullyDelivered
      ? 'delivered'
      : hasAnyDelivery
      ? 'partial'
      : 'pending';

    return {
      status,
      orderedTotalBox,
      deliveredTotalBox,
      remainingTotalBox: Math.max(0, orderedTotalBox - deliveredTotalBox),
      orderedTotalPiece,
      deliveredTotalPiece,
      remainingTotalPiece: Math.max(0, orderedTotalPiece - deliveredTotalPiece),
      isFullyDelivered,
      itemStatuses,
      dispatchesCount: challans.length,
    };
  }

  // Invoice calculations
  static getInvoiceTotals(inv: Invoice) {
    const lineSum = inv.items.reduce((s, it) => s + (it.total || 0), 0);
    const sub1 = lineSum + (inv.labor || 0);
    const sub2 = sub1 - (inv.discount || 0);
    const net = sub2 + (inv.prevDue || 0);
    const paid = (inv.cash || 0) + (inv.bank || 0) + (inv.bkash || 0);
    const due = net - paid;
    return { lineSum, sub1, sub2, net, paid, due };
  }

  // Customer current balance (Opening Due + Invoice Due added - Payments)
  static getCustomerBalance(custId: number): number {
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === custId);
    let balance = cust ? cust.openDue || 0 : 0;

    const invoices = this.getInvoices();
    for (const inv of invoices) {
      if (inv.custId === custId) {
        const { sub2, paid } = this.getInvoiceTotals(inv);
        balance += sub2 - paid;
      }
    }

    const payments = this.getPayments();
    for (const p of payments) {
      if (p.custId === custId) {
        balance -= p.amount || 0;
      }
    }

    return Math.round(balance * 100) / 100;
  }

  static nextInvoiceNo(): number {
    const yr = new Date().getFullYear() % 100; // e.g. 26 in 2026, 27 in 2027
    const minNo = yr * 10000;
    const maxNo = (yr + 1) * 10000;
    const invoices = this.getInvoices();
    const currentYearInvoices = invoices.filter((i) => i.no >= minNo && i.no < maxNo);
    if (currentYearInvoices.length > 0) {
      return Math.max(...currentYearInvoices.map((i) => i.no)) + 1;
    }
    return yr * 10000 + 1; // starts at 260001 for 2026, 270001 for 2027
  }

  static nextProductId(): number {
    const products = this.getProducts();
    return products.length === 0 ? 3010001 : Math.max(...products.map((p) => p.id)) + 1;
  }

  static nextCustId(): number {
    const customers = this.getCustomers();
    return customers.length === 0 ? 4000001 : Math.max(...customers.map((c) => c.id)) + 1;
  }

  static nextPayId(): number {
    const payments = this.getPayments();
    return payments.length === 0 ? 1 : Math.max(...payments.map((p) => p.id)) + 1;
  }

  static nextTxnId(): number {
    const txns = this.getTxns();
    return txns.length === 0 ? 1 : Math.max(...txns.map((t) => t.id)) + 1;
  }

  static nextStockInId(): number {
    const records = this.getStockInRecords();
    return records.length === 0 ? 101 : Math.max(...records.map((r) => r.id)) + 1;
  }

  static nextDeliveryChallanId(): number {
    const challans = this.getDeliveryChallans();
    return challans.length === 0 ? 1 : Math.max(...challans.map((ch) => ch.id)) + 1;
  }

  // Full export as JSON
  static exportAllAsJSON(): string {
    const data = {
      shop: this.getShop(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      invoices: this.getInvoices(),
      payments: this.getPayments(),
      txns: this.getTxns(),
      dealers: this.getDealers(),
      users: this.getUsers(),
      stockInRecords: this.getStockInRecords(),
      deliveryChallans: this.getDeliveryChallans(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  // Full import from JSON
  static importFromJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.shop) this.saveShop(data.shop);
      if (Array.isArray(data.products)) this.saveProducts(data.products);
      if (Array.isArray(data.customers)) this.saveCustomers(data.customers);
      if (Array.isArray(data.invoices)) this.saveInvoices(data.invoices);
      if (Array.isArray(data.payments)) this.savePayments(data.payments);
      if (Array.isArray(data.txns)) this.saveTxns(data.txns);
      if (Array.isArray(data.dealers)) this.saveDealers(data.dealers);
      if (Array.isArray(data.users)) this.saveUsers(data.users);
      if (Array.isArray(data.stockInRecords)) this.saveStockInRecords(data.stockInRecords);
      if (Array.isArray(data.deliveryChallans)) this.saveDeliveryChallans(data.deliveryChallans);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  // Reset to default sample data
  static resetToDefaults() {
    this.saveShop(defaultShopConfig);
    this.saveProducts(initialProducts);
    this.saveCustomers(initialCustomers);
    this.saveInvoices(initialInvoices);
    this.savePayments(initialPayments);
    this.saveTxns(initialTxns);
    this.saveDealers(initialDealers);
    this.saveUsers(initialUsers);
    this.setCurrentUser(initialUsers[0]);
    this.saveStockInRecords(initialStockIns);
    this.saveDeliveryChallans(initialDeliveries);
  }
}
