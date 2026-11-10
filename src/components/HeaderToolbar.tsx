import { ActiveTab, AppUser, ShopConfig, StaffPermissions } from '../types';
import {
  FileText,
  Users,
  Package,
  Receipt,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Settings,
  Database,
  Code2,
  LayoutDashboard,
  Building2,
  Calendar,
  Monitor,
  Download,
  Truck,
  ShieldCheck,
  User,
  LogIn,
  Lock,
  LogOut,
} from 'lucide-react';

interface HeaderToolbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  shop: ShopConfig;
  currentDateStr: string;
  canInstallPwa?: boolean;
  onTriggerInstallPrompt?: () => void;
  currentUser: AppUser;
  onOpenLoginModal: () => void;
  onLogout?: () => void;
  permissions?: StaffPermissions;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  bangla: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  codeTag?: boolean;
  badge?: string;
  permissionKey?: keyof StaffPermissions;
  adminOnly?: boolean;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  activeTab,
  onTabChange,
  shop,
  currentDateStr,
  canInstallPwa,
  onTriggerInstallPrompt,
  currentUser,
  onOpenLoginModal,
  onLogout,
  permissions,
}) => {
  // All navigation items without Desktop App and without VB.NET Code (hidden per user instruction)
  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', bangla: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'order', label: 'Order / Invoice', bangla: 'নতুন বিল ও বিক্রয়', icon: FileText, highlight: true },
    { id: 'stock_inventory', label: 'Stock & Challan', bangla: 'স্টক ও চালান ডেলিভারি', icon: Truck, highlight: true, permissionKey: 'canAccessStock' },
    { id: 'customer', label: 'Customer', bangla: 'গ্রাহক তালিকা', icon: Users, permissionKey: 'canManageCustomers' },
    { id: 'products', label: 'Products', bangla: 'পণ্য ও স্টক', icon: Package, permissionKey: 'canManageProducts' },
    { id: 'payment', label: 'Pay Receipt', bangla: 'টাকা জমা', icon: Receipt, permissionKey: 'canRecordPayment' },
    { id: 'due_list', label: 'Due List', bangla: 'বাকির তালিকা', icon: AlertCircle },
    { id: 'income_expend', label: 'Income Expend', bangla: 'আয়-ব্যয়', icon: TrendingUp, permissionKey: 'canManageExpenses' },
    { id: 'sales_report', label: 'Sales Report', bangla: 'রিপোর্ট ইঞ্জিন', icon: BarChart3, permissionKey: 'canViewReports' },
    { id: 'admin_control', label: 'Admin Control', bangla: 'এডমিন ও স্টাফ পারমিশন', icon: ShieldCheck, highlight: true, adminOnly: true },
    { id: 'settings', label: 'Settings', bangla: 'দোকান সেটিং', icon: Settings, permissionKey: 'canAccessSettings' },
    { id: 'data_backup', label: 'Data Folder', bangla: 'ব্যাকআপ/ডাটা', icon: Database, permissionKey: 'canBackupData' },
  ];

  // Filter based on role and admin-controlled permissions
  const navItems = allNavItems.filter((item) => {
    if (currentUser.role === 'admin') return true;
    if (item.adminOnly) return false;
    if (item.permissionKey && permissions && permissions[item.permissionKey] === false) {
      return false;
    }
    return true;
  });

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white select-none">
      {/* VB.NET / WinForms Classic Windows Style Title Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950 text-slate-300 text-xs border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white shadow-xs">
            IB
          </div>
          <span className="font-semibold text-slate-200 tracking-wide font-mono">
            inventory billing এপ্স - Tiles & Inventory Billing System [VB.NET Edition]
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-medium truncate max-w-xs">{shop.name}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          {/* User Profile / Switch Button */}
          <button
            onClick={onOpenLoginModal}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition cursor-pointer ${
              currentUser.role === 'admin'
                ? 'bg-amber-950/80 border-amber-600/70 text-amber-300 hover:bg-amber-900'
                : 'bg-blue-950/80 border-blue-600/70 text-blue-300 hover:bg-blue-900'
            }`}
            title="ইউজার পরিবর্তন বা লগিন করুন"
          >
            {currentUser.role === 'admin' ? (
              <ShieldCheck className="w-3 h-3 text-amber-400" />
            ) : (
              <User className="w-3 h-3 text-blue-400" />
            )}
            <span className="font-bold">{currentUser.name}</span>
            <span className="text-[9px] font-mono px-1 rounded uppercase bg-black/40">
              {currentUser.role}
            </span>
            <LogIn className="w-3 h-3 ml-0.5 text-slate-400" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-semibold cursor-pointer transition shadow-xs"
              title="লগআউট করে আলাদা লগিন পেজে যান"
            >
              <LogOut className="w-3 h-3 text-rose-400" />
              <span>লগআউট</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span className="font-mono">{currentDateStr}</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Main Desktop WinForms / Business Toolstrip */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-900 overflow-x-auto scrollbar-none border-b border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as ActiveTab)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : item.highlight
                  ? 'bg-slate-800 hover:bg-slate-700/90 text-emerald-300 border border-emerald-500/30'
                  : item.codeTag
                  ? 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
              <div className="flex flex-col text-left leading-tight">
                <span>{item.label}</span>
                <span className={`text-[10px] font-normal ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {item.bangla}
                </span>
              </div>
            </button>
          );
        })}

        {/* Prominent Login / User Switch button directly in the Toolstrip */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs whitespace-nowrap transition cursor-pointer shadow-sm border border-amber-400/50"
            title="ইউজার পরিবর্তন বা সুইচ করুন"
          >
            <Lock className="w-4 h-4 text-white" />
            <div className="flex flex-col text-left leading-tight">
              <span className="flex items-center gap-1">
                লগিন প্যানেল
                <span className="text-[9px] bg-black/40 px-1 rounded uppercase font-mono">{currentUser.role}</span>
              </span>
              <span className="text-[10px] text-amber-100 font-normal">
                {currentUser.name} (সুইচ)
              </span>
            </div>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs whitespace-nowrap transition cursor-pointer shadow-sm border border-rose-500/50"
              title="লগআউট করে আলাদা লগিন পেজে যান"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>লগআউট</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
