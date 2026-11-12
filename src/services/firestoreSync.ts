import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Customer,
  DealerDeal,
  DeliveryChallan,
  Invoice,
  Payment,
  Product,
  ShopConfig,
  StockInRecord,
  Txn,
  AppUser,
  StaffPermissions,
} from '../types';
import { StorageService } from './storage';

export class FirestoreSyncService {
  private static isInitialized = false;

  // Initialize Real-time synchronization
  static initRealtimeSync(callbacks: {
    onShopUpdate?: (shop: ShopConfig) => void;
    onProductsUpdate?: (products: Product[]) => void;
    onCustomersUpdate?: (customers: Customer[]) => void;
    onInvoicesUpdate?: (invoices: Invoice[]) => void;
    onPaymentsUpdate?: (payments: Payment[]) => void;
    onTxnsUpdate?: (txns: Txn[]) => void;
    onDealersUpdate?: (dealers: DealerDeal[]) => void;
    onUsersUpdate?: (users: AppUser[]) => void;
    onStockInUpdate?: (records: StockInRecord[]) => void;
    onDeliveriesUpdate?: (challans: DeliveryChallan[]) => void;
    onCategoriesUpdate?: (categories: string[]) => void;
    onVendorsUpdate?: (vendors: string[]) => void;
    onStaffPermsUpdate?: (perms: StaffPermissions) => void;
  }) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // First, bootstrap initial data to Firestore if Firestore is empty
    this.bootstrapDataIfEmpty().catch((err) => {
      console.warn('Initial Firestore bootstrap notice:', err);
    });

    // 1. Shop Config Listener
    const shopPath = 'shop';
    onSnapshot(
      doc(db, shopPath, 'config'),
      (snap) => {
        if (snap.exists()) {
          const shopData = snap.data() as ShopConfig;
          StorageService.saveShop(shopData);
          if (callbacks.onShopUpdate) callbacks.onShopUpdate(shopData);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `${shopPath}/config`)
    );

    // 2. Products Listener
    const prodPath = 'products';
    onSnapshot(
      collection(db, prodPath),
      (snap) => {
        if (!snap.empty) {
          const prods: Product[] = [];
          snap.forEach((d) => prods.push(d.data() as Product));
          prods.sort((a, b) => a.id - b.id);
          StorageService.saveProducts(prods);
          if (callbacks.onProductsUpdate) callbacks.onProductsUpdate(prods);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, prodPath)
    );

    // 3. Customers Listener
    const custPath = 'customers';
    onSnapshot(
      collection(db, custPath),
      (snap) => {
        if (!snap.empty) {
          const custs: Customer[] = [];
          snap.forEach((d) => custs.push(d.data() as Customer));
          custs.sort((a, b) => a.id - b.id);
          StorageService.saveCustomers(custs);
          if (callbacks.onCustomersUpdate) callbacks.onCustomersUpdate(custs);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, custPath)
    );

    // 4. Invoices Listener
    const invPath = 'invoices';
    onSnapshot(
      collection(db, invPath),
      (snap) => {
        if (!snap.empty) {
          const invs: Invoice[] = [];
          snap.forEach((d) => invs.push(d.data() as Invoice));
          invs.sort((a, b) => b.no - a.no);
          StorageService.saveInvoices(invs);
          if (callbacks.onInvoicesUpdate) callbacks.onInvoicesUpdate(invs);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, invPath)
    );

    // 5. Payments Listener
    const payPath = 'payments';
    onSnapshot(
      collection(db, payPath),
      (snap) => {
        if (!snap.empty) {
          const pays: Payment[] = [];
          snap.forEach((d) => pays.push(d.data() as Payment));
          pays.sort((a, b) => b.id - a.id);
          StorageService.savePayments(pays);
          if (callbacks.onPaymentsUpdate) callbacks.onPaymentsUpdate(pays);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, payPath)
    );

    // 6. Transactions (Income/Expenses) Listener
    const txnPath = 'txns';
    onSnapshot(
      collection(db, txnPath),
      (snap) => {
        if (!snap.empty) {
          const txnsList: Txn[] = [];
          snap.forEach((d) => txnsList.push(d.data() as Txn));
          txnsList.sort((a, b) => b.id - a.id);
          StorageService.saveTxns(txnsList);
          if (callbacks.onTxnsUpdate) callbacks.onTxnsUpdate(txnsList);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, txnPath)
    );

    // 7. Dealers Listener
    const dealPath = 'dealers';
    onSnapshot(
      collection(db, dealPath),
      (snap) => {
        if (!snap.empty) {
          const dealersList: DealerDeal[] = [];
          snap.forEach((d) => dealersList.push(d.data() as DealerDeal));
          dealersList.sort((a, b) => a.id - b.id);
          StorageService.saveDealers(dealersList);
          if (callbacks.onDealersUpdate) callbacks.onDealersUpdate(dealersList);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, dealPath)
    );

    // 8. Users Listener
    const userPath = 'users';
    onSnapshot(
      collection(db, userPath),
      (snap) => {
        if (!snap.empty) {
          const usersList: AppUser[] = [];
          snap.forEach((d) => usersList.push(d.data() as AppUser));
          StorageService.saveUsers(usersList);
          if (callbacks.onUsersUpdate) callbacks.onUsersUpdate(usersList);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, userPath)
    );

    // 9. Stock In Records Listener
    const stockInPath = 'stockInRecords';
    onSnapshot(
      collection(db, stockInPath),
      (snap) => {
        if (!snap.empty) {
          const records: StockInRecord[] = [];
          snap.forEach((d) => records.push(d.data() as StockInRecord));
          records.sort((a, b) => b.id - a.id);
          StorageService.saveStockInRecords(records);
          if (callbacks.onStockInUpdate) callbacks.onStockInUpdate(records);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, stockInPath)
    );

    // 10. Delivery Challans Listener
    const delivPath = 'deliveryChallans';
    onSnapshot(
      collection(db, delivPath),
      (snap) => {
        if (!snap.empty) {
          const challans: DeliveryChallan[] = [];
          snap.forEach((d) => challans.push(d.data() as DeliveryChallan));
          challans.sort((a, b) => b.id - a.id);
          StorageService.saveDeliveryChallans(challans);
          if (callbacks.onDeliveriesUpdate) callbacks.onDeliveriesUpdate(challans);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, delivPath)
    );

    // 11. Metadata (Categories, Vendors, Staff Permissions)
    const metaPath = 'metadata';
    onSnapshot(
      doc(db, metaPath, 'lists'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.categories)) {
            StorageService.saveCategories(data.categories);
            if (callbacks.onCategoriesUpdate) callbacks.onCategoriesUpdate(data.categories);
          }
          if (Array.isArray(data.vendors)) {
            StorageService.saveVendors(data.vendors);
            if (callbacks.onVendorsUpdate) callbacks.onVendorsUpdate(data.vendors);
          }
          if (data.staffPerms) {
            StorageService.saveStaffPermissions(data.staffPerms);
            if (callbacks.onStaffPermsUpdate) callbacks.onStaffPermsUpdate(data.staffPerms);
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `${metaPath}/lists`)
    );
  }

  // Sync Shop Config
  static async syncShop(shop: ShopConfig) {
    StorageService.saveShop(shop);
    const path = 'shop/config';
    try {
      await setDoc(doc(db, 'shop', 'config'), shop);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Sync Product (Upsert)
  static async syncSaveProduct(prod: Product) {
    const products = StorageService.getProducts();
    const idx = products.findIndex((p) => p.id === prod.id);
    if (idx >= 0) {
      products[idx] = prod;
    } else {
      products.push(prod);
    }
    StorageService.saveProducts(products);

    const path = `products/${prod.id}`;
    try {
      await setDoc(doc(db, 'products', String(prod.id)), prod);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Delete Product
  static async syncDeleteProduct(id: number) {
    const products = StorageService.getProducts().filter((p) => p.id !== id);
    StorageService.saveProducts(products);

    const path = `products/${id}`;
    try {
      await deleteDoc(doc(db, 'products', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Sync Customer (Upsert)
  static async syncSaveCustomer(cust: Customer) {
    const customers = StorageService.getCustomers();
    const idx = customers.findIndex((c) => c.id === cust.id);
    if (idx >= 0) {
      customers[idx] = cust;
    } else {
      customers.push(cust);
    }
    StorageService.saveCustomers(customers);

    const path = `customers/${cust.id}`;
    try {
      await setDoc(doc(db, 'customers', String(cust.id)), cust);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Delete Customer
  static async syncDeleteCustomer(id: number) {
    const customers = StorageService.getCustomers().filter((c) => c.id !== id);
    StorageService.saveCustomers(customers);

    const path = `customers/${id}`;
    try {
      await deleteDoc(doc(db, 'customers', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Sync Invoice (Upsert)
  static async syncSaveInvoice(inv: Invoice) {
    const invoices = StorageService.getInvoices();
    const idx = invoices.findIndex((i) => i.no === inv.no);
    if (idx >= 0) {
      invoices[idx] = inv;
    } else {
      invoices.unshift(inv);
    }
    StorageService.saveInvoices(invoices);

    const path = `invoices/${inv.no}`;
    try {
      await setDoc(doc(db, 'invoices', String(inv.no)), inv);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Delete Invoice
  static async syncDeleteInvoice(no: number) {
    const invoices = StorageService.getInvoices().filter((i) => i.no !== no);
    StorageService.saveInvoices(invoices);

    const path = `invoices/${no}`;
    try {
      await deleteDoc(doc(db, 'invoices', String(no)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Sync Payment
  static async syncSavePayment(payment: Payment) {
    const payments = [payment, ...StorageService.getPayments()];
    StorageService.savePayments(payments);

    const path = `payments/${payment.id}`;
    try {
      await setDoc(doc(db, 'payments', String(payment.id)), payment);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Delete Payment
  static async syncDeletePayment(id: number) {
    const payments = StorageService.getPayments().filter((p) => p.id !== id);
    StorageService.savePayments(payments);

    const path = `payments/${id}`;
    try {
      await deleteDoc(doc(db, 'payments', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Sync Transaction (Income / Expense)
  static async syncSaveTxn(t: Txn) {
    const txns = [t, ...StorageService.getTxns()];
    StorageService.saveTxns(txns);

    const path = `txns/${t.id}`;
    try {
      await setDoc(doc(db, 'txns', String(t.id)), t);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Delete Transaction
  static async syncDeleteTxn(id: number) {
    const txns = StorageService.getTxns().filter((t) => t.id !== id);
    StorageService.saveTxns(txns);

    const path = `txns/${id}`;
    try {
      await deleteDoc(doc(db, 'txns', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Sync Dealer
  static async syncSaveDealers(dealers: DealerDeal[]) {
    StorageService.saveDealers(dealers);
    for (const d of dealers) {
      try {
        await setDoc(doc(db, 'dealers', String(d.id)), d);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `dealers/${d.id}`);
      }
    }
  }

  static async syncDeleteDealer(id: number) {
    const dealers = StorageService.getDealers().filter((d) => d.id !== id);
    StorageService.saveDealers(dealers);

    const path = `dealers/${id}`;
    try {
      await deleteDoc(doc(db, 'dealers', String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Sync Users
  static async syncSaveUsers(users: AppUser[]) {
    StorageService.saveUsers(users);
    for (const u of users) {
      try {
        await setDoc(doc(db, 'users', u.id), u);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${u.id}`);
      }
    }
  }

  static async syncDeleteUser(id: string) {
    const users = StorageService.getUsers().filter((u) => u.id !== id);
    StorageService.saveUsers(users);

    const path = `users/${id}`;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Sync Stock In
  static async syncAddStockInRecord(record: StockInRecord) {
    StorageService.addStockInRecord(record);
    const path = `stockInRecords/${record.id}`;
    try {
      await setDoc(doc(db, 'stockInRecords', String(record.id)), record);
      // Also update products in Firestore
      const products = StorageService.getProducts();
      for (const p of products) {
        await setDoc(doc(db, 'products', String(p.id)), p);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Sync Delivery Challan
  static async syncAddDeliveryChallan(challan: DeliveryChallan) {
    StorageService.addDeliveryChallan(challan);
    const path = `deliveryChallans/${challan.id}`;
    try {
      await setDoc(doc(db, 'deliveryChallans', String(challan.id)), challan);
      // Update invoice and product stocks in Firestore
      const invoices = StorageService.getInvoices();
      const inv = invoices.find((i) => i.no === challan.invoiceNo);
      if (inv) {
        await setDoc(doc(db, 'invoices', String(inv.no)), inv);
      }
      const products = StorageService.getProducts();
      for (const it of challan.items) {
        const prod = products.find((p) => p.id === it.productId);
        if (prod) {
          await setDoc(doc(db, 'products', String(prod.id)), prod);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Sync Metadata lists (Categories, Vendors, Staff Permissions)
  static async syncMetadataLists(categories?: string[], vendors?: string[], staffPerms?: StaffPermissions) {
    const currentCats = categories || StorageService.getCategories();
    const currentVendors = vendors || StorageService.getVendors();
    const currentPerms = staffPerms || StorageService.getStaffPermissions();

    if (categories) StorageService.saveCategories(currentCats);
    if (vendors) StorageService.saveVendors(currentVendors);
    if (staffPerms) StorageService.saveStaffPermissions(currentPerms);

    const path = 'metadata/lists';
    try {
      await setDoc(doc(db, 'metadata', 'lists'), {
        categories: currentCats,
        vendors: currentVendors,
        staffPerms: currentPerms,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Bootstrap initial sample / localStorage data if cloud database is fresh
  private static async bootstrapDataIfEmpty() {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (snap.empty) {
        console.log('Fresh Firestore detected. Bootstrapping data to Cloud Firestore...');
        const batch = writeBatch(db);

        // Shop config
        const shop = StorageService.getShop();
        batch.set(doc(db, 'shop', 'config'), shop);

        // Products
        const products = StorageService.getProducts();
        for (const p of products) {
          batch.set(doc(db, 'products', String(p.id)), p);
        }

        // Customers
        const customers = StorageService.getCustomers();
        for (const c of customers) {
          batch.set(doc(db, 'customers', String(c.id)), c);
        }

        // Invoices
        const invoices = StorageService.getInvoices();
        for (const inv of invoices) {
          batch.set(doc(db, 'invoices', String(inv.no)), inv);
        }

        // Payments
        const payments = StorageService.getPayments();
        for (const pay of payments) {
          batch.set(doc(db, 'payments', String(pay.id)), pay);
        }

        // Txns
        const txns = StorageService.getTxns();
        for (const t of txns) {
          batch.set(doc(db, 'txns', String(t.id)), t);
        }

        // Dealers
        const dealers = StorageService.getDealers();
        for (const d of dealers) {
          batch.set(doc(db, 'dealers', String(d.id)), d);
        }

        // Users
        const users = StorageService.getUsers();
        for (const u of users) {
          batch.set(doc(db, 'users', u.id), u);
        }

        // Stock Ins
        const stockIns = StorageService.getStockInRecords();
        for (const s of stockIns) {
          batch.set(doc(db, 'stockInRecords', String(s.id)), s);
        }

        // Deliveries
        const deliveries = StorageService.getDeliveryChallans();
        for (const ch of deliveries) {
          batch.set(doc(db, 'deliveryChallans', String(ch.id)), ch);
        }

        // Metadata
        batch.set(doc(db, 'metadata', 'lists'), {
          categories: StorageService.getCategories(),
          vendors: StorageService.getVendors(),
          staffPerms: StorageService.getStaffPermissions(),
        });

        await batch.commit();
        console.log('Bootstrap to Cloud Firestore completed successfully!');
      }
    } catch (err) {
      console.warn('Bootstrap skipped or failed:', err);
    }
  }
}
