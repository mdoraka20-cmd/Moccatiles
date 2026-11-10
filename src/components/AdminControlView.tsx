import React, { useState } from 'react';
import { AppUser, Customer, DealerDeal, Invoice, UserRole, StaffPermissions } from '../types';
import { StorageService, defaultStaffPermissions } from '../services/storage';
import {
  ShieldCheck,
  Users,
  Briefcase,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Lock,
  UserPlus,
  RefreshCw,
  Search,
  Building,
  Phone,
  FileText,
  Truck,
} from 'lucide-react';

interface AdminControlViewProps {
  currentUser: AppUser;
  invoices: Invoice[];
  customers: Customer[];
  onDataChanged: () => void;
}

export const AdminControlView: React.FC<AdminControlViewProps> = ({
  currentUser,
  invoices,
  customers,
  onDataChanged,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'deals' | 'permissions'>('users');

  // Users State
  const [users, setUsers] = useState<AppUser[]>(() => StorageService.getUsers());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [userPhone, setUserPhone] = useState('');
  const [userStatusMsg, setUserStatusMsg] = useState('');

  // Deals State
  const [dealers, setDealers] = useState<DealerDeal[]>(() => StorageService.getDealers());
  const [dealSearch, setDealSearch] = useState('');
  const [editingDealId, setEditingDealId] = useState<number | null>(null);
  const [dealName, setDealName] = useState('');
  const [dealPhone, setDealPhone] = useState('');
  const [dealAddress, setDealAddress] = useState('');
  const [dealNote, setDealNote] = useState('');
  const [dealStatusMsg, setDealStatusMsg] = useState('');

  // Deal Rename Modal State (batch replace deal on invoices)
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [targetDealForRename, setTargetDealForRename] = useState<DealerDeal | null>(null);
  const [newDealBatchName, setNewDealBatchName] = useState('');
  // Staff Permissions Management State
  const [staffPerms, setStaffPerms] = useState<StaffPermissions>(() => StorageService.getStaffPermissions());
  const [permsStatusMsg, setPermsStatusMsg] = useState('');

  const handleTogglePerm = (key: keyof StaffPermissions) => {
    setStaffPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePerms = () => {
    StorageService.saveStaffPermissions(staffPerms);
    setPermsStatusMsg('স্টাফ পারমিশন ও নিয়ন্ত্রণ সফলভাবে সংরক্ষিত হয়েছে!');
    onDataChanged();
    setTimeout(() => setPermsStatusMsg(''), 4000);
  };

  const handleResetPerms = () => {
    if (confirm('স্টাফদের অনুমতিসমূহ ডিফল্ট মানে রিসেট করতে চান?')) {
      setStaffPerms(defaultStaffPermissions);
      StorageService.saveStaffPermissions(defaultStaffPermissions);
      setPermsStatusMsg('স্টাফ পারমিশন ডিফল্ট মানে সেট করা হয়েছে!');
      onDataChanged();
      setTimeout(() => setPermsStatusMsg(''), 4000);
    }
  };

  // ---------------- USER MANAGEMENT ----------------
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserStatusMsg('');

    if (!userLogin.trim() || !userName.trim() || !userPassword.trim()) {
      alert('সকল প্রয়োজনীয় তথ্য পূরণ করুন।');
      return;
    }

    if (editingUserId) {
      // Update existing
      const updated = users.map((u) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: userName.trim(),
            username: userLogin.trim(),
            password: userPassword.trim(),
            role: userRole,
            phone: userPhone.trim(),
          };
        }
        return u;
      });
      setUsers(updated);
      StorageService.saveUsers(updated);
      setUserStatusMsg('ব্যবহারকারী সফলভাবে আপডেট হয়েছে!');
    } else {
      // Check duplicate username
      if (users.some((u) => u.username.toLowerCase() === userLogin.trim().toLowerCase())) {
        alert('এই ইউজারনেমটি ইতিমধ্যে বিদ্যমান। ভিন্ন ইউজারনেম নির্বাচন করুন।');
        return;
      }
      const newUser: AppUser = {
        id: `usr_${Date.now()}`,
        name: userName.trim(),
        username: userLogin.trim(),
        password: userPassword.trim(),
        role: userRole,
        phone: userPhone.trim(),
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      const updated = [...users, newUser];
      setUsers(updated);
      StorageService.saveUsers(updated);
      setUserStatusMsg('নতুন ব্যবহারকারী তৈরি হয়েছে!');
    }

    handleResetUserForm();
    onDataChanged();
    setTimeout(() => setUserStatusMsg(''), 3000);
  };

  const handleEditUser = (u: AppUser) => {
    setEditingUserId(u.id);
    setUserName(u.name);
    setUserLogin(u.username);
    setUserPassword(u.password);
    setUserRole(u.role);
    setUserPhone(u.phone || '');
  };

  const handleDeleteUser = (u: AppUser) => {
    if (u.id === currentUser.id) {
      alert('আপনি বর্তমানে এই ইউজার হিসেবে লগিন আছেন, এটি ডিলিট করা সম্ভব নয়।');
      return;
    }
    const adminCount = users.filter((x) => x.role === 'admin').length;
    if (u.role === 'admin' && adminCount <= 1) {
      alert('সিস্টেমে কমপক্ষে একজন এডমিন থাকতে হবে।');
      return;
    }
    if (confirm(`ব্যবহারকারী "${u.name}" ডিলিট করতে চান?`)) {
      const updated = users.filter((x) => x.id !== u.id);
      setUsers(updated);
      StorageService.saveUsers(updated);
      onDataChanged();
    }
  };

  const handleResetUserForm = () => {
    setEditingUserId(null);
    setUserName('');
    setUserLogin('');
    setUserPassword('');
    setUserRole('staff');
    setUserPhone('');
  };

  // ---------------- DEALER/DEAL MANAGEMENT ----------------
  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    setDealStatusMsg('');

    if (!dealName.trim()) {
      alert('ডিলের নাম দিন।');
      return;
    }

    if (editingDealId !== null) {
      const updated = dealers.map((d) => {
        if (d.id === editingDealId) {
          return {
            ...d,
            name: dealName.trim(),
            phone: dealPhone.trim(),
            address: dealAddress.trim(),
            note: dealNote.trim(),
          };
        }
        return d;
      });
      setDealers(updated);
      StorageService.saveDealers(updated);
      setDealStatusMsg('ডিল তথ্য আপডেট হয়েছে!');
    } else {
      const existing = dealers.find(
        (d) => d.name.toLowerCase() === dealName.trim().toLowerCase()
      );
      if (existing) {
        alert('এই নামের ডিল তালিকায় ইতিমধ্যে সংরক্ষিত আছে!');
        return;
      }
      const nextId = dealers.length === 0 ? 1 : Math.max(...dealers.map((d) => d.id)) + 1;
      const newD: DealerDeal = {
        id: nextId,
        name: dealName.trim(),
        phone: dealPhone.trim(),
        address: dealAddress.trim(),
        note: dealNote.trim(),
      };
      const updated = [...dealers, newD];
      setDealers(updated);
      StorageService.saveDealers(updated);
      setDealStatusMsg('নতুন ডিল সংরক্ষিত হয়েছে!');
    }

    handleResetDealForm();
    onDataChanged();
    setTimeout(() => setDealStatusMsg(''), 3000);
  };

  const handleEditDeal = (d: DealerDeal) => {
    setEditingDealId(d.id);
    setDealName(d.name);
    setDealPhone(d.phone || '');
    setDealAddress(d.address || '');
    setDealNote(d.note || '');
  };

  const handleDeleteDeal = (d: DealerDeal) => {
    const invCount = invoices.filter((i) => i.deal?.trim().toLowerCase() === d.name.toLowerCase()).length;
    if (confirm(`ডিল "${d.name}" মুছে ফেলবেন? ${invCount > 0 ? `(এই ডিলে ${invCount} টি চালান রয়েছে)` : ''}`)) {
      const updated = dealers.filter((x) => x.id !== d.id);
      setDealers(updated);
      StorageService.saveDealers(updated);
      onDataChanged();
    }
  };

  const handleResetDealForm = () => {
    setEditingDealId(null);
    setDealName('');
    setDealPhone('');
    setDealAddress('');
    setDealNote('');
  };

  // Batch Replace Deal across all invoices
  const handleOpenBatchRename = (d: DealerDeal) => {
    setTargetDealForRename(d);
    setNewDealBatchName(d.name);
    setRenameModalOpen(true);
  };

  const executeBatchRename = () => {
    if (!targetDealForRename || !newDealBatchName.trim()) return;
    const oldName = targetDealForRename.name;
    const newName = newDealBatchName.trim();

    // Update in invoices
    const allInvs = StorageService.getInvoices();
    let count = 0;
    allInvs.forEach((inv) => {
      if (inv.deal?.trim().toLowerCase() === oldName.toLowerCase()) {
        inv.deal = newName;
        count++;
      }
    });
    StorageService.saveInvoices(allInvs);

    // Update in dealers list
    const updatedDealers = dealers.map((d) => {
      if (d.id === targetDealForRename.id) {
        return { ...d, name: newName };
      }
      return d;
    });
    setDealers(updatedDealers);
    StorageService.saveDealers(updatedDealers);

    alert(`সফলভাবে ${count} টি চালানে এবং মাস্টার তালিকায় "${oldName}" পরিবর্তন করে "${newName}" করা হয়েছে!`);
    setRenameModalOpen(false);
    setTargetDealForRename(null);
    onDataChanged();
  };

  const filteredDealers = dealers.filter(
    (d) =>
      d.name.toLowerCase().includes(dealSearch.toLowerCase()) ||
      (d.phone && d.phone.includes(dealSearch)) ||
      (d.address && d.address.toLowerCase().includes(dealSearch.toLowerCase()))
  );

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-100 min-h-[60vh]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-200 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">অ্যাক্সেস সংরক্ষিত (Admin Only Access)</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              এই কন্ট্রোল প্যানেলটি শুধুমাত্র অ্যাডমিন (Admin) ব্যবহারকারীর জন্য সংরক্ষিত। আপনি বর্তমানে <strong>"{currentUser.name}"</strong> (ভূমিকা: {currentUser.role}) হিসেবে যুক্ত আছেন। স্টাফদের জন্য এডমিন কন্ট্রোল অপশন সম্পূর্ণ বন্ধ রাখা হয়েছে।
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-semibold rounded-lg">
              এডমিনের সাথে যোগাযোগ করে পারমিশন আপডেট করুন
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-85px)] bg-slate-100 overflow-hidden text-xs">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-600 rounded-md">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide text-slate-100">
              এডমিন কন্ট্রোল ও ডিল মাস্টার (Admin Security & Master Directory)
            </h2>
            <p className="text-[10px] text-slate-400">
              User Management, Dealer Deal Directory & Role-Based Access Control
            </p>
          </div>
        </div>

        {/* Current User Badge */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
          <span className="text-slate-400">লগিন ইউজার:</span>
          <span className="font-bold text-amber-300">{currentUser.name}</span>
          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono uppercase">
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="bg-slate-800 px-4 py-1.5 flex items-center gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            activeSubTab === 'users'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          ইউজার কন্ট্রোল ({users.length})
        </button>
        <button
          onClick={() => setActiveSubTab('deals')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            activeSubTab === 'deals'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          কাস্টমার ডিল মাস্টার ({dealers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
            activeSubTab === 'permissions'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          ভূমিকা ও অনুমতি (Role Permissions)
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ================= 1. USERS SUBTAB ================= */}
        {activeSubTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: User Creation / Edit Form */}
            <div className="lg:col-span-4 bg-white rounded-lg border border-slate-300 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                  {editingUserId ? 'ইউজার পরিবর্তন (Edit User)' : 'নতুন ইউজার যোগ (Add User)'}
                </h3>
                {editingUserId && (
                  <button
                    onClick={handleResetUserForm}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    বাতিল
                  </button>
                )}
              </div>

              {userStatusMsg && (
                <div className="p-2 mb-3 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded font-semibold text-xs">
                  {userStatusMsg}
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">পূর্ণ নাম (Full Name): *</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. মোঃ শফিকুল ইসলাম"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ইউজারনেম (Login ID): *</label>
                  <input
                    type="text"
                    required
                    value={userLogin}
                    onChange={(e) => setUserLogin(e.target.value)}
                    placeholder="e.g. shafiq or sales2"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">পাসওয়ার্ড (Password): *</label>
                  <input
                    type="text"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">দায়িত্ব / ভূমিকা (Role): *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-bold focus:bg-white focus:border-amber-600"
                  >
                    <option value="staff">সেলস স্টাফ (Staff / Operator)</option>
                    <option value="admin">সিস্টেম এডমিন (Super Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">মোবাইল নম্বর (Phone):</label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:border-amber-600"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingUserId ? 'আপডেট করুন' : 'ইউজার সংরক্ষণ'}
                  </button>
                  {editingUserId && (
                    <button
                      type="button"
                      onClick={handleResetUserForm}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold transition"
                    >
                      বাতিল
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right: User List Table */}
            <div className="lg:col-span-8 bg-white rounded-lg border border-slate-300 overflow-hidden shadow-xs">
              <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between">
                <span className="font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  সিস্টেম ইউজার তালিকা ({users.length} জন)
                </span>
                <span className="text-[11px] text-slate-300">
                  লগিন ইউজার পাসওয়ার্ড পরিবর্তন ও একাউন্ট ম্যানেজ
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="py-2 px-3">নাম</th>
                      <th className="py-2 px-3">ইউজারনেম</th>
                      <th className="py-2 px-3">ভূমিকা</th>
                      <th className="py-2 px-3">পাসওয়ার্ড</th>
                      <th className="py-2 px-3">মোবাইল</th>
                      <th className="py-2 px-3">তৈরির তারিখ</th>
                      <th className="py-2 px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((u) => {
                      const isCurrent = u.id === currentUser.id;
                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50 transition ${
                            isCurrent ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {u.name}
                            {isCurrent && (
                              <span className="ml-1 text-[10px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-normal">
                                (আপনি)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {u.username}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 bg-slate-50">
                            {u.password}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {u.phone || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {u.createdAt}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditUser(u)}
                                className="p-1 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded transition cursor-pointer"
                                title="এডিট করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={isCurrent || (u.role === 'admin' && users.filter((x) => x.role === 'admin').length <= 1)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer disabled:opacity-20"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. DEALS SUBTAB ================= */}
        {activeSubTab === 'deals' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Deal Add / Edit Form */}
            <div className="lg:col-span-4 bg-white rounded-lg border border-slate-300 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  {editingDealId !== null ? 'ডিল পরিবর্তন (Edit Deal)' : 'নতুন ডিল সংরক্ষণ (Add Deal)'}
                </h3>
                {editingDealId !== null && (
                  <button
                    onClick={handleResetDealForm}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    বাতিল
                  </button>
                )}
              </div>

              {dealStatusMsg && (
                <div className="p-2 mb-3 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded font-semibold text-xs">
                  {dealStatusMsg}
                </div>
              )}

              <p className="text-slate-500 text-[11px] mb-3">
                গ্রাহকের সাথে ডিল/রেফারেন্সের নাম এখানে সংরক্ষণ থাকবে। বিলে টাইপ করার সাথে সাথে এই তালিকা থেকে অটো সাজেস্ট হবে।
              </p>

              <form onSubmit={handleSaveDeal} className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ডিল/রেফারেন্সের নাম: *</label>
                  <input
                    type="text"
                    required
                    value={dealName}
                    onChange={(e) => setDealName(e.target.value)}
                    placeholder="e.g. ডিলার - কামাল ব্রিকস"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-semibold focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">যোগাযোগ নম্বর (Phone):</label>
                  <input
                    type="text"
                    value={dealPhone}
                    onChange={(e) => setDealPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ঠিকানা / এরিয়া (Address):</label>
                  <input
                    type="text"
                    value={dealAddress}
                    onChange={(e) => setDealAddress(e.target.value)}
                    placeholder="e.g. বনশ্রী, ঢাকা"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">মন্তব্য (Note):</label>
                  <textarea
                    rows={2}
                    value={dealNote}
                    onChange={(e) => setDealNote(e.target.value)}
                    placeholder="ডিলার বিবরণ বা শর্ত"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 resize-none focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingDealId !== null ? 'আপডেট করুন' : 'ডিল যোগ করুন'}
                  </button>
                  {editingDealId !== null && (
                    <button
                      type="button"
                      onClick={handleResetDealForm}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold transition"
                    >
                      বাতিল
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right: Deals List */}
            <div className="lg:col-span-8 bg-white rounded-lg border border-slate-300 overflow-hidden shadow-xs flex flex-col">
              <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between">
                <span className="font-bold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  সংরক্ষিত ডিলার ও রেফারেন্স তালিকা ({filteredDealers.length})
                </span>
                <div className="w-56">
                  <div className="relative">
                    <input
                      type="text"
                      value={dealSearch}
                      onChange={(e) => setDealSearch(e.target.value)}
                      placeholder="ডিল খুঁজুন..."
                      className="w-full pl-7 pr-2 py-1 bg-slate-700 text-white placeholder-slate-400 rounded text-xs border border-slate-600 focus:outline-hidden"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="py-2 px-3">আইডি</th>
                      <th className="py-2 px-3">ডিল / রেফারেন্সের নাম</th>
                      <th className="py-2 px-3">ফোন</th>
                      <th className="py-2 px-3">ঠিকানা</th>
                      <th className="py-2 px-3">মন্তব্য</th>
                      <th className="py-2 px-3 text-center">চালান সংখ্যা</th>
                      <th className="py-2 px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDealers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          কোন ডিল পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredDealers.map((d) => {
                        const invCount = invoices.filter(
                          (i) => i.deal?.trim().toLowerCase() === d.name.toLowerCase()
                        ).length;
                        return (
                          <tr key={d.id} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                              #{d.id}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {d.name}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {d.phone || '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {d.address || '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                              {d.note || '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold font-mono">
                                {invCount}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenBatchRename(d)}
                                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded transition border border-slate-300"
                                  title="সকল চালানে একযোগে এই ডিলের নাম পরিবর্তন করুন"
                                >
                                  রিনেম
                                </button>
                                <button
                                  onClick={() => handleEditDeal(d)}
                                  className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded transition cursor-pointer"
                                  title="এডিট করুন"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDeal(d)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. PERMISSIONS SUBTAB ================= */}
        {activeSubTab === 'permissions' && (
          <div className="space-y-4">
            {/* Action & Status Header */}
            <div className="bg-white rounded-lg border border-slate-300 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  স্টাফ নিয়ন্ত্রণ ও পারমিশন কন্ট্রোল (Staff Access Control)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  এডমিন হিসেবে নির্ধারণ করুন সেলস স্টাফরা সফটওয়্যারে কোন কোন কাজের অনুমতি পাবে।
                </p>
              </div>

              <div className="flex items-center gap-2">
                {permsStatusMsg && (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded font-semibold text-xs flex items-center gap-1.5 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    {permsStatusMsg}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetPerms}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs transition cursor-pointer"
                >
                  ডিফল্ট রিসেট
                </button>
                <button
                  type="button"
                  onClick={handleSavePerms}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  পারমিশন সংরক্ষণ করুন
                </button>
              </div>
            </div>

            {/* Permission Control Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category 1: Sales & Billing */}
              <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-bold text-xs">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>১. বিক্রয় ও মেমু নিয়ন্ত্রণ (Sales & Bills)</span>
                </div>

                <div className="space-y-2.5">
                  {/* canCreateInvoice */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">নতুন মেমু তৈরি</div>
                      <div className="text-[11px] text-slate-500">নতুন বিক্রয় চালান ও বিল তৈরি করতে পারবে</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canCreateInvoice}
                      onChange={() => handleTogglePerm('canCreateInvoice')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canEditInvoice */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">মেমু লোড ও সংশোধন</div>
                      <div className="text-[11px] text-slate-500">পূর্বের সংরক্ষিত চালান লোড ও এডিট করতে পারবে</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canEditInvoice}
                      onChange={() => handleTogglePerm('canEditInvoice')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canDeleteInvoice */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-rose-700">চালান ডিলিট করার ক্ষমতা</div>
                      <div className="text-[11px] text-slate-500">সংরক্ষিত মেমু সরাসরি সিস্টেম থেকে মুছে ফেলা</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canDeleteInvoice}
                      onChange={() => handleTogglePerm('canDeleteInvoice')}
                      className="w-4 h-4 mt-0.5 accent-rose-600 cursor-pointer"
                    />
                  </label>

                  {/* canChangeDeal */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">মেমুতে ডিল পরিবর্তন</div>
                      <div className="text-[11px] text-slate-500">ভুলে অন্য নাম দেওয়া হলে মেমুতে ডিল বদলানো</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canChangeDeal}
                      onChange={() => handleTogglePerm('canChangeDeal')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Category 2: Stock & Challan */}
              <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-bold text-xs">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>২. স্টক ও চালান ডেলিভারি (Inventory)</span>
                </div>

                <div className="space-y-2.5">
                  {/* canAccessStock */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">স্টক ও চালান মেনু অ্যাক্সেস</div>
                      <div className="text-[11px] text-slate-500">Stock & Challan মেনু ও গোডাউন স্টক দেখা</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canAccessStock}
                      onChange={() => handleTogglePerm('canAccessStock')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canDispatchDelivery */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">চালান ডেলিভারি পাঠানো</div>
                      <div className="text-[11px] text-slate-500">ভেঙ্গে ট্রিপ বা ফুল চালান ডেলিভারি ও স্টক আউট</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canDispatchDelivery}
                      onChange={() => handleTogglePerm('canDispatchDelivery')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canStockIn */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">ভেন্ডর স্টক ইন (ক্রয়)</div>
                      <div className="text-[11px] text-slate-500">চালান ও রেফারেন্স নম্বর সহ মাল ইনপুট ও স্টক বৃদ্ধি</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canStockIn}
                      onChange={() => handleTogglePerm('canStockIn')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Category 3: Customer & Catalog */}
              <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-bold text-xs">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>৩. গ্রাহক ও পণ্য ব্যবস্থাপনা</span>
                </div>

                <div className="space-y-2.5">
                  {/* canManageCustomers */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">গ্রাহক যোগ ও এডিট</div>
                      <div className="text-[11px] text-slate-500">নতুন গ্রাহক তৈরি ও ফোন/ঠিকানা আপডেট</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canManageCustomers}
                      onChange={() => handleTogglePerm('canManageCustomers')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canDeleteCustomers */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-rose-700">গ্রাহক ডিলিট করা</div>
                      <div className="text-[11px] text-slate-500">গ্রাহকের প্রোফাইল সরাসরি মুছে ফেলার ক্ষমতা</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canDeleteCustomers}
                      onChange={() => handleTogglePerm('canDeleteCustomers')}
                      className="w-4 h-4 mt-0.5 accent-rose-600 cursor-pointer"
                    />
                  </label>

                  {/* canManageProducts */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">পণ্য ও বিক্রয় দর পরিবর্তন</div>
                      <div className="text-[11px] text-slate-500">পণ্য ক্যাটালগে নতুন পণ্য যুক্ত ও রেট বদলানো</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canManageProducts}
                      onChange={() => handleTogglePerm('canManageProducts')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Category 4: Accounts & Reports */}
              <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-bold text-xs">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span>৪. আর্থিক হিসাব ও রিপোর্ট</span>
                </div>

                <div className="space-y-2.5">
                  {/* canRecordPayment */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">বাকি টাকা জমা নেওয়া</div>
                      <div className="text-[11px] text-slate-500">Pay Receipt ও মানি রিসিট প্রিন্ট করার ক্ষমতা</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canRecordPayment}
                      onChange={() => handleTogglePerm('canRecordPayment')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canManageExpenses */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">আয়-ব্যয় খরচ এন্ট্রি</div>
                      <div className="text-[11px] text-slate-500">দোকানের দৈনিক খরচ ও অন্যান্য আয়ের হিসাব</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canManageExpenses}
                      onChange={() => handleTogglePerm('canManageExpenses')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canViewReports */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">বিক্রয় রিপোর্ট দেখা</div>
                      <div className="text-[11px] text-slate-500">Daily Sales, Date-wise ও Dealer রিপোর্ট ভিউ</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canViewReports}
                      onChange={() => handleTogglePerm('canViewReports')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Category 5: Security & Settings */}
              <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-bold text-xs">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>৫. সিস্টেম সেটিংস ও ডাটা</span>
                </div>

                <div className="space-y-2.5">
                  {/* canAccessSettings */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-slate-800">দোকান সেটিংস অ্যাক্সেস</div>
                      <div className="text-[11px] text-slate-500">দোকানের নাম, ঠিকানা ও ফুটার টেক্সট বদলানো</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canAccessSettings}
                      onChange={() => handleTogglePerm('canAccessSettings')}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  {/* canBackupData */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-rose-700">ডাটা ব্যাকআপ ও রিসেট</div>
                      <div className="text-[11px] text-slate-500">ডাটা ফোল্ডার ব্যাকআপ ও ডাটাবেস রিসেট কন্ট্রোল</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={staffPerms.canBackupData}
                      onChange={() => handleTogglePerm('canBackupData')}
                      className="w-4 h-4 mt-0.5 accent-rose-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex justify-between items-center">
              <span className="text-slate-600 text-xs font-semibold">
                যেকোনো পারমিশন পরিবর্তন করার পর ডানপাশের বাটনে ক্লিক করে সংরক্ষণ করুন।
              </span>
              <button
                type="button"
                onClick={handleSavePerms}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                পারমিশন সংরক্ষণ করুন (Save All Permissions)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Deal Rename Modal */}
      {renameModalOpen && targetDealForRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden text-xs">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">ডিল একযোগে রিনেম করুন</h3>
              </div>
              <button
                onClick={() => setRenameModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-slate-600">
                আপনি <strong>"{targetDealForRename.name}"</strong> ডিলটির নাম পরিবর্তন করতে যাচ্ছেন। এর ফলে সমস্ত পূর্বের চালানে স্বয়ংক্রিয়ভাবে নতুন নামটি বসে যাবে।
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">নতুন ডিলের নাম:</label>
                <input
                  type="text"
                  value={newDealBatchName}
                  onChange={(e) => setNewDealBatchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 font-bold text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold transition"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={executeBatchRename}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  সকল চালানে পরিবর্তন প্রয়োগ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
