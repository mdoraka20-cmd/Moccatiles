import React, { useState, useEffect } from 'react';
import { ActiveTab, AppUser, Customer, DeliveryChallan, Invoice, Payment, Product, ShopConfig, StockInRecord, Txn, StaffPermissions } from './types';
import { StorageService } from './services/storage';
import { HeaderToolbar } from './components/HeaderToolbar';
import { DashboardView } from './components/DashboardView';
import { OrderView } from './components/OrderView';
import { StockInventoryView } from './components/StockInventoryView';
import { AdminControlView } from './components/AdminControlView';
import { CustomerView } from './components/CustomerView';
import { ProductView } from './components/ProductView';
import { PayReceiptView } from './components/PayReceiptView';
import { DueListView } from './components/DueListView';
import { IncomeExpenseView } from './components/IncomeExpenseView';
import { SalesReportView } from './components/SalesReportView';
import { SettingsView } from './components/SettingsView';
import { DataBackupView } from './components/DataBackupView';
import { VbCodeModal } from './components/VbCodeModal';
import { DesktopAppHub } from './components/DesktopAppHub';
import { PrintModal } from './components/PrintModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { AdminAuthModal } from './components/AdminAuthModal';
import { formatDateBangla } from './utils/numberWords';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstallPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser>(() => StorageService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => StorageService.isUserLoggedIn());
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions>(() => StorageService.getStaffPermissions());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLogout = () => {
    StorageService.setAuthSession(false);
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
  };

  // Application Data States
  const [shop, setShop] = useState<ShopConfig>(() => StorageService.getShop());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [invoices, setInvoices] = useState<Invoice[]>(() => StorageService.getInvoices());
  const [payments, setPayments] = useState<Payment[]>(() => StorageService.getPayments());
  const [txns, setTxns] = useState<Txn[]>(() => StorageService.getTxns());

  // Customer modal picker state
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [selectedPickedCustomer, setSelectedPickedCustomer] = useState<Customer | null>(null);

  // Print modal state
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    type: 'invoice' | 'challan' | 'receipt' | 'report' | 'delivery_challan' | 'stock_in';
    invoice?: Invoice;
    payment?: Payment;
    reportData?: any;
    deliveryChallan?: DeliveryChallan;
    stockInRecord?: StockInRecord;
  }>({
    isOpen: false,
    type: 'invoice',
  });

  // Admin authorization modal state
  const [adminAuthModal, setAdminAuthModal] = useState<{
    isOpen: boolean;
    actionTitle: string;
    actionDetails?: string;
    onSuccess: () => void;
  }>({
    isOpen: false,
    actionTitle: '',
    onSuccess: () => {},
  });

  const requestAdminAction = (
    actionTitle: string,
    onExecute: () => void,
    actionDetails?: string
  ) => {
    if (currentUser.role === 'admin') {
      if (window.confirm(`আপনি কি নিশ্চিতভাবে "${actionTitle}" করতে চান?`)) {
        onExecute();
      }
    } else {
      setAdminAuthModal({
        isOpen: true,
        actionTitle,
        actionDetails,
        onSuccess: () => {
          setAdminAuthModal((prev) => ({ ...prev, isOpen: false }));
          onExecute();
        },
      });
    }
  };

  // Current system date
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateStr(
        now.toLocaleDateString('bn-BD', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const refreshAllData = () => {
    setShop(StorageService.getShop());
    setProducts(StorageService.getProducts());
    setCustomers(StorageService.getCustomers());
    setInvoices(StorageService.getInvoices());
    setPayments(StorageService.getPayments());
    setTxns(StorageService.getTxns());
    setCurrentUser(StorageService.getCurrentUser());
    setStaffPermissions(StorageService.getStaffPermissions());
  };

  // Handlers for Order / Invoices
  const handleSaveInvoice = (inv: Invoice, printKind: 'none' | 'invoice' | 'challan') => {
    const existingIdx = invoices.findIndex((i) => i.no === inv.no);
    let updated: Invoice[];
    if (existingIdx >= 0) {
      updated = [...invoices];
      updated[existingIdx] = inv;
    } else {
      updated = [inv, ...invoices];
    }
    setInvoices(updated);
    StorageService.saveInvoices(updated);

    // Refresh customers in state in case new customer was added
    setCustomers(StorageService.getCustomers());

    if (printKind === 'invoice') {
      setPrintModal({
        isOpen: true,
        type: 'invoice',
        invoice: inv,
      });
    } else if (printKind === 'challan') {
      setPrintModal({
        isOpen: true,
        type: 'challan',
        invoice: inv,
      });
    }
  };

  const handleDeleteInvoice = (no: number) => {
    const updated = invoices.filter((i) => i.no !== no);
    setInvoices(updated);
    StorageService.saveInvoices(updated);
  };

  const handleUpdateInvoiceDeal = (invoiceNo: number, newDeal: string) => {
    setInvoices(StorageService.getInvoices());
  };

  // Handlers for Customer
  const handleSaveCustomer = (cust: Customer) => {
    const existingIdx = customers.findIndex((c) => c.id === cust.id);
    let updated: Customer[];
    if (existingIdx >= 0) {
      updated = [...customers];
      updated[existingIdx] = cust;
    } else {
      updated = [...customers, cust];
    }
    setCustomers(updated);
    StorageService.saveCustomers(updated);
  };

  const handleDeleteCustomer = (id: number) => {
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    StorageService.saveCustomers(updated);
  };

  // Handlers for Products
  const handleSaveProduct = (prod: Product) => {
    const existingIdx = products.findIndex((p) => p.id === prod.id);
    let updated: Product[];
    if (existingIdx >= 0) {
      updated = [...products];
      updated[existingIdx] = prod;
    } else {
      updated = [...products, prod];
    }
    setProducts(updated);
    StorageService.saveProducts(updated);
  };

  const handleDeleteProduct = (id: number) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    StorageService.saveProducts(updated);
  };

  // Handlers for Payments
  const handleSavePayment = (payment: Payment, print: boolean) => {
    const updated = [payment, ...payments];
    setPayments(updated);
    StorageService.savePayments(updated);

    if (print) {
      setPrintModal({
        isOpen: true,
        type: 'receipt',
        payment,
      });
    }
  };

  const handleDeletePayment = (id: number) => {
    const updated = payments.filter((p) => p.id !== id);
    setPayments(updated);
    StorageService.savePayments(updated);
  };

  // Handlers for Txns
  const handleSaveTxn = (t: Txn) => {
    const updated = [t, ...txns];
    setTxns(updated);
    StorageService.saveTxns(updated);
  };

  const handleDeleteTxn = (id: number) => {
    const updated = txns.filter((t) => t.id !== id);
    setTxns(updated);
    StorageService.saveTxns(updated);
  };

  // Shop Config
  const handleSaveShop = (updatedShop: ShopConfig) => {
    setShop(updatedShop);
    StorageService.saveShop(updatedShop);
  };

  // If not logged in, show the dedicated separate Login Page
  if (!isAuthenticated) {
    return <LoginPage shop={shop} onLoginSuccess={handleLoginSuccess} />;
  }

  // Handle Tab Navigation with strict Role & Staff Permission checks
  const handleTabChange = (tab: ActiveTab) => {
    if (currentUser.role !== 'admin') {
      if (tab === 'admin_control') {
        setActiveTab('dashboard');
        return;
      }
      if (tab === 'stock_inventory' && staffPermissions.canAccessStock === false) return;
      if (tab === 'customer' && staffPermissions.canManageCustomers === false) return;
      if (tab === 'products' && staffPermissions.canManageProducts === false) return;
      if (tab === 'payment' && staffPermissions.canRecordPayment === false) return;
      if (tab === 'income_expend' && staffPermissions.canManageExpenses === false) return;
      if (tab === 'sales_report' && staffPermissions.canViewReports === false) return;
      if (tab === 'settings' && staffPermissions.canAccessSettings === false) return;
      if (tab === 'data_backup' && staffPermissions.canBackupData === false) return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Header & WinForms Toolstrip */}
      <HeaderToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        shop={shop}
        currentDateStr={currentDateStr}
        canInstallPwa={!!deferredPrompt}
        onTriggerInstallPrompt={triggerInstallPrompt}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        permissions={staffPermissions}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            invoices={invoices}
            customers={customers}
            products={products}
            payments={payments}
            shop={shop}
            currentUser={currentUser}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onNavigate={(tab) => setActiveTab(tab)}
            onPrintInvoice={(inv, isChallan) => {
              setPrintModal({
                isOpen: true,
                type: isChallan ? 'challan' : 'invoice',
                invoice: inv,
              });
            }}
            onSelectCustomerForPayment={(cust) => {
              setSelectedPickedCustomer(cust);
            }}
          />
        )}

        {activeTab === 'order' && (
          <OrderView
            products={products}
            customers={customers}
            invoices={invoices}
            shop={shop}
            currentUser={currentUser}
            permissions={staffPermissions}
            onSaveInvoice={handleSaveInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onOpenCustomerPicker={() => setIsCustomerPickerOpen(true)}
            selectedCustomerFromPicker={selectedPickedCustomer}
            onClearCustomerPicker={() => setSelectedPickedCustomer(null)}
            onPrintDirectInvoice={(inv, isChallan) => {
              setPrintModal({
                isOpen: true,
                type: isChallan ? 'challan' : 'invoice',
                invoice: inv,
              });
            }}
            onUpdateInvoiceDeal={handleUpdateInvoiceDeal}
            onNavigateToStock={() => setActiveTab('stock_inventory')}
            onRequireAdminAuth={requestAdminAction}
          />
        )}

        {activeTab === 'stock_inventory' && (
          <StockInventoryView
            products={products}
            invoices={invoices}
            shop={shop}
            currentUser={currentUser}
            permissions={staffPermissions}
            onOpenPrintModal={(payload) => setPrintModal(payload)}
            onStockUpdated={refreshAllData}
          />
        )}

        {activeTab === 'customer' && (
          <CustomerView
            customers={customers}
            invoices={invoices}
            currentUser={currentUser}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRequireAdminAuth={requestAdminAction}
          />
        )}

        {activeTab === 'products' && (
          <ProductView
            products={products}
            currentUser={currentUser}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onProductsReload={refreshAllData}
            onRequireAdminAuth={requestAdminAction}
          />
        )}

        {activeTab === 'payment' && (
          <PayReceiptView
            customers={customers}
            payments={payments}
            currentUser={currentUser}
            onSavePayment={handleSavePayment}
            onDeletePayment={handleDeletePayment}
            onReprintPayment={(p) => {
              setPrintModal({
                isOpen: true,
                type: 'receipt',
                payment: p,
              });
            }}
            onOpenCustomerPicker={() => setIsCustomerPickerOpen(true)}
            selectedCustomerFromPicker={selectedPickedCustomer}
            onClearCustomerPicker={() => setSelectedPickedCustomer(null)}
            onRequireAdminAuth={requestAdminAction}
          />
        )}

        {activeTab === 'due_list' && (
          <DueListView
            customers={customers}
            invoices={invoices}
            payments={payments}
            onSelectCustomerForPayment={(cust) => {
              setSelectedPickedCustomer(cust);
            }}
            onNavigateToPayment={() => setActiveTab('payment')}
          />
        )}

        {activeTab === 'income_expend' && (
          <IncomeExpenseView
            txns={txns}
            currentUser={currentUser}
            onSaveTxn={handleSaveTxn}
            onDeleteTxn={handleDeleteTxn}
            onRequireAdminAuth={requestAdminAction}
          />
        )}

        {activeTab === 'sales_report' && (
          <SalesReportView
            invoices={invoices}
            payments={payments}
            products={products}
            customers={customers}
            txns={txns}
            shop={shop}
            onOpenPrintModal={(reportData) => {
              setPrintModal({
                isOpen: true,
                type: 'report',
                reportData,
              });
            }}
          />
        )}

        {activeTab === 'admin_control' && currentUser.role === 'admin' && (
          <AdminControlView
            currentUser={currentUser}
            invoices={invoices}
            customers={customers}
            onDataChanged={refreshAllData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView shop={shop} onSaveShop={handleSaveShop} />
        )}

        {activeTab === 'data_backup' && (
          <DataBackupView
            products={products}
            customers={customers}
            invoices={invoices}
            payments={payments}
            txns={txns}
            shop={shop}
            onDataReload={refreshAllData}
          />
        )}

        {activeTab === 'desktop_app' && (
          <DesktopAppHub
            onTriggerInstallPrompt={triggerInstallPrompt}
            canInstallPwa={!!deferredPrompt}
            isInstalled={isPwaInstalled}
          />
        )}

        {activeTab === 'vb_code' && <VbCodeModal />}
      </main>

      {/* Customer Picker Modal when clicking "..." */}
      {isCustomerPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-300">
            <CustomerView
              customers={customers}
              invoices={invoices}
              currentUser={currentUser}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onRequireAdminAuth={requestAdminAction}
              isPickMode={true}
              onPickCustomer={(cust) => {
                setSelectedPickedCustomer(cust);
                setIsCustomerPickerOpen(false);
              }}
              onClosePickModal={() => setIsCustomerPickerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Universal Login & User Switch Modal */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={(u) => {
            setCurrentUser(u);
          }}
        />
      )}

      {/* Admin Authorization Security Modal */}
      {adminAuthModal.isOpen && (
        <AdminAuthModal
          isOpen={adminAuthModal.isOpen}
          actionTitle={adminAuthModal.actionTitle}
          actionDetails={adminAuthModal.actionDetails}
          onSuccess={adminAuthModal.onSuccess}
          onCancel={() => setAdminAuthModal((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Universal Print Modal */}
      {printModal.isOpen && (
        <PrintModal
          type={printModal.type}
          invoice={printModal.invoice}
          payment={printModal.payment}
          reportData={printModal.reportData}
          deliveryChallan={printModal.deliveryChallan}
          stockInRecord={printModal.stockInRecord}
          shop={shop}
          onClose={() => setPrintModal({ isOpen: false, type: 'invoice' })}
        />
      )}
    </div>
  );
}
