import React, { useState } from 'react';
import { ActiveTab, AppUser, NoticeBanner, ShopConfig, StaffPermissions } from '../types';
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
  LayoutDashboard,
  Building2,
  Calendar,
  Truck,
  ShieldCheck,
  User,
  LogIn,
  Lock,
  LogOut,
  Menu,
  X,
  Megaphone,
  MessageSquare,
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
  notice?: NoticeBanner;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  bangla: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  permissionKey?: keyof StaffPermissions;
  adminOnly?: boolean;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  activeTab,
  onTabChange,
  shop,
  currentDateStr,
  currentUser,
  onOpenLoginModal,
  onLogout,
  permissions,
  notice,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { id: 'sms_center', label: 'SMS Center', bangla: 'এসএমএস ও রিপোর্ট', icon: MessageSquare, highlight: true, permissionKey: 'canSendSms' },
    { id: 'admin_control', label: 'Admin Control', bangla: 'এডমিন ও স্টাফ পারমিশন', icon: ShieldCheck, highlight: true, adminOnly: true },
    { id: 'settings', label: 'Settings', bangla: 'দোকান সেটিং', icon: Settings, permissionKey: 'canAccessSettings' },
    { id: 'data_backup', label: 'Data Folder', bangla: 'ব্যাকআপ/ডাটা', icon: Database, adminOnly: true },
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

  const activeNavItem = navItems.find((n) => n.id === activeTab) || navItems[0];
  const ActiveIcon = activeNavItem?.icon || LayoutDashboard;

  const handleSelectTab = (tab: ActiveTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white select-none sticky top-0 z-40">
      {/* Top Bar (Clean Shop Name + User + Date) */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-950 text-slate-300 text-xs border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-100 font-bold tracking-wide truncate max-w-[200px] sm:max-w-md">
            {shop.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-slate-400 shrink-0">
          {/* User Profile / Switch Button */}
          <button
            onClick={onOpenLoginModal}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition cursor-pointer ${
              currentUser.role === 'admin'
                ? 'bg-amber-950/80 border-amber-600/70 text-amber-300 hover:bg-amber-900'
                : 'bg-blue-950/80 border-blue-600/70 text-blue-300 hover:bg-blue-900'
            }`}
            title="ইউজার পরিবর্তন বা লগিন করুন"
          >
            {currentUser.role === 'admin' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <span className="font-bold max-w-[85px] sm:max-w-none truncate">{currentUser.name}</span>
            <span className="hidden sm:inline text-[9px] font-mono px-1 rounded uppercase bg-black/40">
              {currentUser.role}
            </span>
            <LogIn className="w-3 h-3 ml-0.5 text-slate-400 hidden sm:inline" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-semibold cursor-pointer transition shadow-xs"
              title="লগআউট করে আলাদা লগিন পেজে যান"
            >
              <LogOut className="w-3 h-3 text-rose-400" />
              <span>লগআউট</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span className="font-mono">{currentDateStr}</span>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer transition"
            aria-label="মেনু খুলুন"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>মেনু</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Active Bar (< md) */}
      <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <ActiveIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-white truncate">
            {activeNavItem?.bangla || activeNavItem?.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-semibold text-[11px] cursor-pointer"
          >
            {mobileMenuOpen ? 'মেনু বন্ধ করুন' : 'সকল মেনু দেখুন'}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Drawer (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-700 p-3 space-y-3 max-h-[78vh] overflow-y-auto shadow-xl">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono">{currentDateStr}</span>
            </div>
            <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {currentUser.role}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg text-left transition cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : item.highlight
                      ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800/70 text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0 leading-tight">
                    <div className="text-xs font-bold truncate">{item.bangla}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {item.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLoginModal();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer min-h-[44px]"
            >
              <Lock className="w-4 h-4" />
              <span>ইউজার সুইচ</span>
            </button>

            {onLogout && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Desktop Toolstrip (>= md) */}
      <div className="hidden md:flex items-center gap-1 px-2 py-1.5 bg-slate-900 overflow-x-auto scrollbar-none border-b border-slate-800">
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

      {/* Live Scrolling Notice Line (Controlled by Admin Panel ON/OFF) */}
      {notice?.enabled && notice.message.trim() && (
        <div className="bg-amber-400 text-slate-950 border-t border-amber-500/80 flex items-center h-7 text-xs font-bold overflow-hidden">
          <div className="bg-rose-700 text-white px-2.5 h-full flex items-center gap-1.5 shrink-0 z-10 shadow-sm">
            <Megaphone className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span>নোটিশ</span>
          </div>
          <div className="notice-marquee-wrapper flex-1 h-full flex items-center">
            <span className="notice-marquee-track px-4 tracking-wide">
              {notice.message}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};

