import React, { useState, useEffect } from 'react';
import { AppUser, ContactsInfo, Customer, DealerDeal, DeliveryChallan, Invoice, NoticeBanner, Payment, Product, Txn, UserRole, StaffPermissions } from '../types';
import { StorageService, defaultStaffPermissions, defaultContactsInfo } from '../services/storage';
import { FirestoreSyncService } from '../services/firestoreSync';
import { getTodayLocalDateStr, getNowLocalDateTimeStr } from '../utils/numberWords';
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
  Database,
  Download,
  Upload,
  Megaphone,
  Power,
} from 'lucide-react';

interface AdminControlViewProps {
  currentUser: AppUser;
  invoices: Invoice[];
  customers: Customer[];
  users?: AppUser[];
  dealers?: DealerDeal[];
  products?: Product[];
  payments?: Payment[];
  txns?: Txn[];
  staffPermissions?: StaffPermissions;
  notice?: NoticeBanner;
  onUpdateNotice?: (notice: NoticeBanner) => void;
  contactsInfo?: ContactsInfo;
  onUpdateContacts?: (contacts: ContactsInfo) => void;
  onDeletePendingChallan?: (invoiceNo: number) => void;
  onDeleteDeliveryChallan?: (challanId: number) => void;
  onDataChanged: () => void;
}

export const AdminControlView: React.FC<AdminControlViewProps> = ({
  currentUser,
  invoices,
  customers,
  users: propUsers,
  dealers: propDealers,
  products: propProducts,
  payments: propPayments,
  txns: propTxns,
  staffPermissions: propStaffPermissions,
  notice: propNotice,
  onUpdateNotice,
  contactsInfo: propContacts,
  onUpdateContacts,
  onDeletePendingChallan,
  onDeleteDeliveryChallan,
  onDataChanged,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'deals' | 'permissions' | 'notice' | 'contacts' | 'data_control'>('users');

  // Users State (always synchronized with live Firestore updates)
  const [users, setUsers] = useState<AppUser[]>(() => (propUsers && propUsers.length > 0 ? propUsers : StorageService.getUsers()));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [userPhone, setUserPhone] = useState('');
  const [userStatusMsg, setUserStatusMsg] = useState('');

  // Deals State
  const [dealers, setDealers] = useState<DealerDeal[]>(() => (propDealers ? propDealers : StorageService.getDealers()));
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
  const [staffPerms, setStaffPerms] = useState<StaffPermissions>(() =>
    propStaffPermissions || StorageService.getStaffPermissions()
  );
  const [permsStatusMsg, setPermsStatusMsg] = useState('');
  const [storageTick, setStorageTick] = useState(0);

  // Data Control (Backup, Restore & Delete) State
  const [dataStatusMsg, setDataStatusMsg] = useState('');
  const [dataErrorMsg, setDataErrorMsg] = useState('');
  const [isDataBusy, setIsDataBusy] = useState(false);
  const [selectedDeleteTargets, setSelectedDeleteTargets] = useState<string[]>([]);
  const [pendingChallanSearch, setPendingChallanSearch] = useState('');
  const [pendingChallanDeleteTarget, setPendingChallanDeleteTarget] = useState<Invoice | null>(null);
  const [deliveryHistorySearch, setDeliveryHistorySearch] = useState('');
  const [deliveryHistoryDeleteTarget, setDeliveryHistoryDeleteTarget] = useState<DeliveryChallan | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    targets: string[];
    title: string;
    description: string;
  }>({
    isOpen: false,
    targets: [],
    title: '',
    description: '',
  });

  // Global Scrolling Notice Banner State
  const [noticeEnabled, setNoticeEnabled] = useState<boolean>(() =>
    propNotice ? propNotice.enabled : StorageService.getNotice().enabled
  );
  const [noticeMessage, setNoticeMessage] = useState<string>(() =>
    propNotice ? propNotice.message : StorageService.getNotice().message
  );
  const [noticeStatusMsg, setNoticeStatusMsg] = useState('');

  // Dashboard Contacts & Service Validity Message State
  const initialContacts = propContacts || StorageService.getContactsInfo();
  const [contactCompany, setContactCompany] = useState<string>(initialContacts.companyName);
  const [contactPhones, setContactPhones] = useState<string>(initialContacts.phones);
  const [contactMessage, setContactMessage] = useState<string>(initialContacts.serviceMessage);
  const [contactStatusMsg, setContactStatusMsg] = useState('');

  useEffect(() => {
    const onUpdate = () => setStorageTick((t) => t + 1);
    window.addEventListener('app-storage-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('app-storage-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  useEffect(() => {
    if (propStaffPermissions) {
      setStaffPerms(propStaffPermissions);
    }
  }, [propStaffPermissions]);

  useEffect(() => {
    if (propUsers && propUsers.length > 0) {
      setUsers(propUsers);
    }
  }, [propUsers]);

  useEffect(() => {
    if (propDealers) {
      setDealers(propDealers);
    }
  }, [propDealers]);

  useEffect(() => {
    if (propNotice) {
      setNoticeEnabled(propNotice.enabled);
      setNoticeMessage(propNotice.message);
    }
  }, [propNotice]);

  useEffect(() => {
    if (propContacts) {
      setContactCompany(propContacts.companyName);
      setContactPhones(propContacts.phones);
      setContactMessage(propContacts.serviceMessage);
    }
  }, [propContacts]);

  const handleSaveContacts = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ContactsInfo = {
      companyName: contactCompany.trim() || defaultContactsInfo.companyName,
      phones: contactPhones.trim() || defaultContactsInfo.phones,
      serviceMessage: contactMessage.trim(),
      updatedAt: new Date().toLocaleString('bn-BD'),
      updatedBy: currentUser.name,
    };
    StorageService.saveContactsInfo(payload);
    if (onUpdateContacts) {
      onUpdateContacts(payload);
    } else {
      FirestoreSyncService.syncContactsInfo(payload).catch(console.error);
    }
    setContactStatusMsg('✅ Contacts তথ্য ও সার্ভিস মেসেজ সংরক্ষিত হয়ে ড্যাশবোর্ডে সব ইউজারের জন্য আপডেট হয়েছে!');
    setTimeout(() => setContactStatusMsg(''), 4000);
  };

  const publishNotice = (nextEnabled: boolean, nextMsg: string, feedbackText: string) => {
    const payload: NoticeBanner = {
      enabled: nextEnabled,
      message: nextMsg.trim(),
      updatedAt: new Date().toLocaleString('bn-BD'),
      updatedBy: currentUser.name,
    };
    StorageService.saveNotice(payload);
    if (onUpdateNotice) {
      onUpdateNotice(payload);
    } else {
      FirestoreSyncService.syncNotice(payload).catch(console.error);
    }
    setNoticeStatusMsg(feedbackText);
    setTimeout(() => setNoticeStatusMsg(''), 4000);
  };

  const handleToggleNoticeEnabled = () => {
    const nextEnabled = !noticeEnabled;
    if (nextEnabled && !noticeMessage.trim()) {
      setNoticeStatusMsg('❌ আগে নোটিশের মেসেজ লিখুন, তারপর চালু (ON) করুন।');
      setTimeout(() => setNoticeStatusMsg(''), 4000);
      return;
    }
    setNoticeEnabled(nextEnabled);
    publishNotice(
      nextEnabled,
      noticeMessage,
      nextEnabled
        ? '✅ নোটিশ লাইন চালু (ON) করা হয়েছে — সব ইউজারের টাইমলাইনে এখন দেখা যাচ্ছে!'
        : 'নোটিশ লাইন বন্ধ (OFF) করা হয়েছে — সব ইউজারের টাইমলাইন থেকে হাইড হয়েছে।'
    );
  };

  const handleSaveNoticeMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (noticeEnabled && !noticeMessage.trim()) {
      setNoticeStatusMsg('❌ নোটিশ চালু অবস্থায় মেসেজ খালি রাখা যাবে না।');
      setTimeout(() => setNoticeStatusMsg(''), 4000);
      return;
    }
    publishNotice(
      noticeEnabled,
      noticeMessage,
      noticeEnabled
        ? '✅ নোটিশ মেসেজ আপডেট হয়ে সব ইউজারের টাইমলাইনে পাঠানো হয়েছে!'
        : '✅ নোটিশ মেসেজ সংরক্ষিত হয়েছে (বর্তমানে OFF আছে — দেখাতে চাইলে ON বাটনে চাপুন)।'
    );
  };

  const handleTogglePerm = (key: keyof StaffPermissions) => {
    setStaffPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePerms = () => {
    StorageService.saveStaffPermissions(staffPerms);
    FirestoreSyncService.syncMetadataLists(undefined, undefined, staffPerms).catch(console.error);
    setPermsStatusMsg('স্টাফ পারমিশন ও নিয়ন্ত্রণ সফলভাবে সংরক্ষিত হয়েছে!');
    onDataChanged();
    setTimeout(() => setPermsStatusMsg(''), 4000);
  };

  const handleResetPerms = () => {
    setStaffPerms(defaultStaffPermissions);
    StorageService.saveStaffPermissions(defaultStaffPermissions);
    FirestoreSyncService.syncMetadataLists(undefined, undefined, defaultStaffPermissions).catch(console.error);
    setPermsStatusMsg('স্টাফ পারমিশন ডিফল্ট মানে রিসেট করা হয়েছে!');
    onDataChanged();
    setTimeout(() => setPermsStatusMsg(''), 4000);
  };

  // ---------------- USER MANAGEMENT ----------------
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserStatusMsg('');

    if (!userLogin.trim() || !userName.trim() || !userPassword.trim()) {
      setUserStatusMsg('❌ সকল প্রয়োজনীয় তথ্য পূরণ করুন।');
      setTimeout(() => setUserStatusMsg(''), 3500);
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
      FirestoreSyncService.syncSaveUsers(updated).catch(console.error);
      setUserStatusMsg('ব্যবহারকারী সফলভাবে আপডেট হয়েছে!');
    } else {
      // Check duplicate username
      if (users.some((u) => u.username.toLowerCase() === userLogin.trim().toLowerCase())) {
        setUserStatusMsg('❌ এই ইউজারনেমটি ইতিমধ্যে বিদ্যমান। ভিন্ন ইউজারনেম নির্বাচন করুন।');
        setTimeout(() => setUserStatusMsg(''), 3500);
        return;
      }
      const newUser: AppUser = {
        id: `usr_${Date.now()}`,
        name: userName.trim(),
        username: userLogin.trim(),
        password: userPassword.trim(),
        role: userRole,
        phone: userPhone.trim(),
        createdAt: getNowLocalDateTimeStr(),
      };
      const updated = [...users, newUser];
      setUsers(updated);
      StorageService.saveUsers(updated);
      FirestoreSyncService.syncSaveUsers(updated).catch(console.error);
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
      setUserStatusMsg('❌ আপনি বর্তমানে এই ইউজার হিসেবে লগিন আছেন, এটি ডিলিট করা সম্ভব নয়।');
      setTimeout(() => setUserStatusMsg(''), 4000);
      return;
    }
    const adminCount = users.filter((x) => x.role === 'admin').length;
    if (u.role === 'admin' && adminCount <= 1) {
      setUserStatusMsg('❌ সিস্টেমে কমপক্ষে একজন এডমিন থাকতে হবে।');
      setTimeout(() => setUserStatusMsg(''), 4000);
      return;
    }
    const updated = users.filter((x) => x.id !== u.id);
    setUsers(updated);
    StorageService.saveUsers(updated);
    FirestoreSyncService.syncDeleteUser(u.id).catch(console.error);
    setUserStatusMsg(`সফলভাবে ব্যবহারকারী "${u.name}" মুছে ফেলা হয়েছে!`);
    onDataChanged();
    setTimeout(() => setUserStatusMsg(''), 3000);
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
      setDealStatusMsg('❌ ডিলের নাম দিন।');
      setTimeout(() => setDealStatusMsg(''), 3500);
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
      FirestoreSyncService.syncSaveDealers(updated).catch(console.error);
      setDealStatusMsg('ডিল তথ্য আপডেট হয়েছে!');
    } else {
      const existing = dealers.find(
        (d) => d.name.toLowerCase() === dealName.trim().toLowerCase()
      );
      if (existing) {
        setDealStatusMsg('❌ এই নামের ডিল তালিকায় ইতিমধ্যে সংরক্ষিত আছে!');
        setTimeout(() => setDealStatusMsg(''), 3500);
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
      FirestoreSyncService.syncSaveDealers(updated).catch(console.error);
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
    const updated = dealers.filter((x) => x.id !== d.id);
    setDealers(updated);
    StorageService.saveDealers(updated);
    FirestoreSyncService.syncDeleteDealer(d.id).catch(console.error);
    setDealStatusMsg(`সফলভাবে ডিল "${d.name}" মুছে ফেলা হয়েছে!`);
    onDataChanged();
    setTimeout(() => setDealStatusMsg(''), 3000);
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
    const changedInvs: Invoice[] = [];
    allInvs.forEach((inv) => {
      if (inv.deal?.trim().toLowerCase() === oldName.toLowerCase()) {
        inv.deal = newName;
        changedInvs.push(inv);
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
    FirestoreSyncService.syncSaveDealers(updatedDealers).catch(console.error);
    if (changedInvs.length > 0) {
      FirestoreSyncService.syncSaveInvoices(changedInvs).catch(console.error);
    }
    setDealStatusMsg(`সফলভাবে ${changedInvs.length} টি চালানে এবং মাস্টার তালিকায় "${oldName}" পরিবর্তন করে "${newName}" করা হয়েছে!`);
    setRenameModalOpen(false);
    setTargetDealForRename(null);
    onDataChanged();
    setTimeout(() => setDealStatusMsg(''), 4000);
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

  // ---------------- DATA CONTROL (BACKUP, RESTORE & DELETE) ----------------
  const handleAdminExportBackup = () => {
    setDataErrorMsg('');
    const jsonStr = StorageService.exportAllAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MoccaTiles_Backup_${getTodayLocalDateStr()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDataStatusMsg('সম্পূর্ণ ডাটাবেস ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে!');
    setTimeout(() => setDataStatusMsg(''), 4000);
  };

  const handleAdminRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setIsDataBusy(true);
      setDataErrorMsg('');
      setDataStatusMsg('');
      try {
        const ok = await FirestoreSyncService.syncFullRestoreFromJSON(reader.result as string);
        if (ok) {
          onDataChanged();
          setDataStatusMsg('ডাটা সফলভাবে রিস্টোর ও ক্লাউডে সিঙ্ক হয়েছে! সকল ইউজার নতুন ডাটা দেখতে পাবে।');
          setTimeout(() => setDataStatusMsg(''), 5000);
        } else {
          setDataErrorMsg('ভুল ব্যাকআপ ফাইল। সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।');
        }
      } catch {
        setDataErrorMsg('ফাইল রিস্টোর করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      } finally {
        setIsDataBusy(false);
      }
    };
    reader.readAsText(file);
  };

  const toggleDeleteTarget = (key: string) => {
    setSelectedDeleteTargets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const openConfirmDeleteModal = (targets: string[], title: string, description: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      targets,
      title,
      description,
    });
  };

  const executeConfirmedDelete = async () => {
    const targets = deleteConfirmModal.targets;
    if (targets.length === 0) return;

    setIsDataBusy(true);
    setDataErrorMsg('');
    setDataStatusMsg('');
    try {
      await FirestoreSyncService.syncClearCollections(targets);
      onDataChanged();
      setSelectedDeleteTargets([]);
      setDeleteConfirmModal({ isOpen: false, targets: [], title: '', description: '' });
      setDataStatusMsg('নির্বাচিত ডাটা সফলভাবে স্থায়ীভাবে মুছে ফেলা হয়েছে এবং ক্লাউডে সিঙ্ক হয়েছে।');
      setTimeout(() => setDataStatusMsg(''), 5000);
    } catch {
      setDataErrorMsg('ডাটা ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setIsDataBusy(false);
    }
  };

  const executeDeleteSinglePendingChallan = (inv: Invoice) => {
    setDataErrorMsg('');
    if (onDeletePendingChallan) {
      onDeletePendingChallan(inv.no);
    } else {
      const updated = StorageService.getInvoices().filter((i) => i.no !== inv.no);
      StorageService.saveInvoices(updated);
      FirestoreSyncService.syncDeleteInvoice(inv.no).catch(console.error);
      FirestoreSyncService.syncDeleteDeliveryChallansByInvoice(inv.no).catch(console.error);
    }
    setPendingChallanDeleteTarget(null);
    onDataChanged();
    setDataStatusMsg(`পেন্ডিং চালান #${inv.no} (${inv.custName}) সফলভাবে মুছে ফেলা হয়েছে এবং ক্লাউডে সিঙ্ক হয়েছে।`);
    setTimeout(() => setDataStatusMsg(''), 5000);
  };

  const executeDeleteSingleDeliveryHistory = (ch: DeliveryChallan) => {
    setDataErrorMsg('');
    if (onDeleteDeliveryChallan) {
      onDeleteDeliveryChallan(ch.id);
    } else {
      FirestoreSyncService.syncDeleteDeliveryChallan(ch.id).catch(console.error);
      onDataChanged();
    }
    setDeliveryHistoryDeleteTarget(null);
    setDataStatusMsg(`ডেলিভারি চালান ${ch.challanNo} (${ch.custName}) ইতিহাস থেকে মুছে ফেলা হয়েছে এবং স্টক ও ক্লাউড ডাটাবেস আপডেট হয়েছে।`);
    setTimeout(() => setDataStatusMsg(''), 5000);
  };

  const deliveryChallansHistoryList = React.useMemo(
    () =>
      StorageService.getDeliveryChallans().filter((ch) => {
        const q = deliveryHistorySearch.toLowerCase().trim();
        if (!q) return true;
        return (
          ch.challanNo.toLowerCase().includes(q) ||
          String(ch.invoiceNo).includes(q) ||
          ch.custName.toLowerCase().includes(q) ||
          (ch.phone && ch.phone.includes(q)) ||
          (ch.vehicleNo && ch.vehicleNo.toLowerCase().includes(q))
        );
      }),
    [deliveryHistorySearch, invoices, storageTick]
  );

  const pendingChallansList = React.useMemo(
    () =>
      invoices.filter((inv) => {
        const statusObj = StorageService.getInvoiceDeliveryStatus(inv.no);
        if (statusObj.isFullyDelivered) return false;
        const q = pendingChallanSearch.toLowerCase().trim();
        if (!q) return true;
        return (
          String(inv.no).includes(q) ||
          inv.custName.toLowerCase().includes(q) ||
          (inv.phone && inv.phone.includes(q)) ||
          (inv.deal && inv.deal.toLowerCase().includes(q))
        );
      }),
    [invoices, pendingChallanSearch, storageTick]
  );

  const stockInRecordsCount = React.useMemo(
    () => StorageService.getStockInRecords().length,
    [propProducts, storageTick]
  );

  const deleteCatalogOptions: Array<{ key: string; label: string; count: number; desc: string }> = [
    { key: 'invoices', label: 'বিক্রয় চালান / মেমু (Invoices)', count: invoices.length, desc: 'সকল বিক্রয়ের বিল ও মেমু' },
    { key: 'payments', label: 'টাকা জমার রশিদ (Pay Receipts)', count: (propPayments || StorageService.getPayments()).length, desc: 'সকল ক্রেতার জমা রশিদ' },
    { key: 'txns', label: 'আয়-ব্যয় হিসাব (Income/Expense)', count: (propTxns || StorageService.getTxns()).length, desc: 'দোকানের সকল খরচ ও আয় এন্ট্রি' },
    { key: 'stockInRecords', label: 'স্টক ইন রেকর্ড (Stock In)', count: stockInRecordsCount, desc: 'ভেন্ডর ক্রয় ও স্টক ইন ইতিহাস' },
    { key: 'deliveryChallans', label: 'ডেলিভারি চালান (Delivery Challans)', count: StorageService.getDeliveryChallans().length, desc: 'ট্রিপ ভিত্তিক মাল ডেলিভারি রেকর্ড' },
    { key: 'customers', label: 'গ্রাহক তালিকা (Customers)', count: customers.length, desc: 'সকল কাস্টমার প্রোফাইল' },
    { key: 'products', label: 'পণ্য ও স্টক (Products)', count: (propProducts || StorageService.getProducts()).length, desc: 'সকল পণ্য ক্যাটালগ ও স্টক' },
    { key: 'dealers', label: 'ডিলার মাস্টার (Dealers)', count: dealers.length, desc: 'সংরক্ষিত ডিল ও রেফারেন্স তালিকা' },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-85px)] lg:h-[calc(100vh-85px)] bg-slate-100 lg:overflow-hidden text-xs">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-amber-600 rounded-md shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-xs sm:text-sm tracking-wide text-slate-100 truncate">
              এডমিন কন্ট্রোল ও ডিল মাস্টার
            </h2>
            <p className="text-[10px] text-slate-400 truncate">
              ইউজার, ডিল মাস্টার, পারমিশন ও ডাটা ব্যাকআপ/ডিলেট
            </p>
          </div>
        </div>

        {/* Current User Badge */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 shrink-0">
          <span className="text-slate-400 hidden sm:inline">লগিন ইউজার:</span>
          <span className="font-bold text-amber-300">{currentUser.name}</span>
          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono uppercase">
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="bg-slate-800 px-3 sm:px-4 py-1.5 flex items-center gap-2 border-b border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
            activeSubTab === 'permissions'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          ভূমিকা ও অনুমতি
        </button>
        <button
          onClick={() => setActiveSubTab('notice')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
            activeSubTab === 'notice'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          নোটিশ লাইন
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase ${
              noticeEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-200'
            }`}
          >
            {noticeEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('contacts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
            activeSubTab === 'contacts'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          Contacts ও মেয়াদ
        </button>
        <button
          onClick={() => setActiveSubTab('data_control')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
            activeSubTab === 'data_control'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          ডাটা ব্যাকআপ, রিস্টোর ও ডিলেট
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

                  {/* canDeletePendingChallan */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-rose-700">পেন্ডিং চালান ডিলিট করা</div>
                      <div className="text-[11px] text-slate-500">পেন্ডিং বা আংশিক ডেলিভারি চালান সরাসরি মুছে ফেলার অনুমতি</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(staffPerms.canDeletePendingChallan)}
                      onChange={() => handleTogglePerm('canDeletePendingChallan')}
                      className="w-4 h-4 mt-0.5 accent-rose-600 cursor-pointer"
                    />
                  </label>

                  {/* canDeleteDeliveryChallan */}
                  <label className="flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                    <div>
                      <div className="font-bold text-rose-700">ডেলিভারি চালান ইতিহাস ডিলিট করা</div>
                      <div className="text-[11px] text-slate-500">ডেলিভারি চালান ও ট্রিপ ইতিহাস তালিকা থেকে চালান মুছে ফেলার অনুমতি</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(staffPerms.canDeleteDeliveryChallan)}
                      onChange={() => handleTogglePerm('canDeleteDeliveryChallan')}
                      className="w-4 h-4 mt-0.5 accent-rose-600 cursor-pointer"
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
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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

        {/* ================= 4. GLOBAL SCROLLING NOTICE LINE SUBTAB ================= */}
        {activeSubTab === 'notice' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {noticeStatusMsg && (
              <div
                className={`p-3 rounded-lg border font-semibold text-xs flex items-center justify-between ${
                  noticeStatusMsg.startsWith('❌')
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <span>{noticeStatusMsg}</span>
                <button
                  type="button"
                  onClick={() => setNoticeStatusMsg('')}
                  className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-slate-300 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-600" />
                    সকল ইউজারের জন্য স্ক্রল নোটিশ লাইন (Broadcast Notice Ticker)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    এখানে দেওয়া মেসেজটি সাথে সাথে সব স্টাফ ও এডমিন ইউজারের স্ক্রিনের উপরে চলমান নোটিশ হিসেবে দেখা যাবে। ইচ্ছামত ON বা OFF রাখতে পারবেন।
                  </p>
                </div>

                {/* Big ON / OFF Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleNoticeEnabled}
                  className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-xs shrink-0 border ${
                    noticeEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{noticeEnabled ? 'চালু আছে (ON)' : 'বন্ধ আছে (OFF)'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveNoticeMessage} className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    নোটিশ মেসেজ লিখুন (Notice Text):
                  </label>
                  <textarea
                    rows={3}
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    placeholder="উদাহরণ: আজ বিকাল ৫টার পর স্টক গণনা করা হবে, সবাই সময়মতো চালান এন্ট্রি সম্পন্ন করুন..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs sm:text-sm focus:bg-white focus:border-amber-600 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    {propNotice?.updatedAt && (
                      <span>
                        সর্বশেষ আপডেট: <strong>{propNotice.updatedAt}</strong>
                        {propNotice.updatedBy ? ` (${propNotice.updatedBy})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeMessage('');
                        if (noticeEnabled) {
                          setNoticeEnabled(false);
                          publishNotice(false, '', 'নোটিশ মুছে ফেলে OFF করা হয়েছে।');
                        }
                      }}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer transition"
                    >
                      মেসেজ মুছুন
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      সেভ ও প্রকাশ করুন (Save & Broadcast)
                    </button>
                  </div>
                </div>
              </form>

              {/* Live Preview Box */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-600">
                  লাইভ প্রিভিউ (ইউজাররা যেভাবে দেখবে):
                </span>
                {noticeEnabled && noticeMessage.trim() ? (
                  <div className="bg-amber-400 text-slate-950 border border-amber-500 rounded flex items-center h-8 text-xs font-bold overflow-hidden">
                    <div className="bg-rose-700 text-white px-2.5 h-full flex items-center gap-1.5 shrink-0 z-10">
                      <Megaphone className="w-3.5 h-3.5 animate-pulse" />
                      <span>নোটিশ</span>
                    </div>
                    <div className="notice-marquee-wrapper flex-1 h-full flex items-center">
                      <span className="notice-marquee-track px-4">{noticeMessage}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100 border border-dashed border-slate-300 rounded p-2.5 text-center text-slate-500 text-xs">
                    {noticeEnabled
                      ? 'মেসেজ লিখুন — প্রিভিউ এখানে দেখা যাবে'
                      : 'নোটিশ লাইন বর্তমানে বন্ধ (OFF) আছে। চালু করতে উপরে ON বাটনে চাপুন।'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= 4.5 CONTACTS & SERVICE EXPIRY MESSAGE SUBTAB ================= */}
        {activeSubTab === 'contacts' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {contactStatusMsg && (
              <div className="p-3 rounded-lg border font-semibold text-xs flex items-center justify-between bg-emerald-50 border-emerald-300 text-emerald-800">
                <span>{contactStatusMsg}</span>
                <button
                  type="button"
                  onClick={() => setContactStatusMsg('')}
                  className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-slate-300 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  ড্যাশবোর্ড Contacts ও সার্ভার মেয়াদ মেসেজ (Admin Controlled)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ড্যাশবোর্ডের উপরে থাকা "Contacts" অপশনের ভেতরে সব ইউজার (Admin ও Staff) এই তথ্য ও এডমিন মেসেজ দেখতে পাবে।
                </p>
              </div>

              <form onSubmit={handleSaveContacts} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">কোম্পানির নাম (Company):</label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Os Technology"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:bg-white focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">মোবাইল / হোয়াটসঅ্যাপ (Mobile):</label>
                    <input
                      type="text"
                      value={contactPhones}
                      onChange={(e) => setContactPhones(e.target.value)}
                      placeholder="01732-970999/01682539640(whatsapp)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-semibold focus:bg-white focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    এডমিন থেকে সার্ভিস মেয়াদ / সার্ভার ফি মেসেজ (Message):
                  </label>
                  <textarea
                    rows={3}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={defaultContactsInfo.serviceMessage}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs sm:text-sm focus:bg-white focus:border-amber-600 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setContactCompany(defaultContactsInfo.companyName);
                      setContactPhones(defaultContactsInfo.phones);
                      setContactMessage(defaultContactsInfo.serviceMessage);
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer transition"
                  >
                    ডিফল্ট টেক্সট বসান
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    সংরক্ষণ ও প্রকাশ করুন (Save & Publish)
                  </button>
                </div>
              </form>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="block text-[11px] font-bold text-slate-600">
                  ড্যাশবোর্ড Contacts প্রিভিউ:
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="font-bold text-sm text-slate-900">{contactCompany || defaultContactsInfo.companyName}</div>
                  <div className="font-mono font-semibold text-slate-700">
                    mobile:{contactPhones || defaultContactsInfo.phones}
                  </div>
                  {contactMessage.trim() && (
                    <div className="bg-amber-50 border border-amber-300 rounded p-2.5 text-rose-800 font-bold">
                      "{contactMessage}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. DATA BACKUP, RESTORE & DELETE SUBTAB ================= */}
        {activeSubTab === 'data_control' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            {(dataStatusMsg || dataErrorMsg) && (
              <div
                className={`p-3 rounded-lg border font-semibold text-xs flex items-center justify-between ${
                  dataErrorMsg
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <span>{dataErrorMsg || dataStatusMsg}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDataStatusMsg('');
                    setDataErrorMsg('');
                  }}
                  className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Backup & Restore Card */}
            <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-700" />
                    সম্পূর্ণ ডাটা ব্যাকআপ ও রিস্টোর (Cloud + Local Backup & Restore)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ব্যাকআপ রিস্টোর করলে স্বয়ংক্রিয়ভাবে ক্লাউড ডাটাবেসেও আপডেট হবে, যাতে সব ইউজার ও ডিভাইস সাথে সাথে আপডেট ডাটা পায়।
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isDataBusy}
                  onClick={handleAdminExportBackup}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer transition shadow-xs flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন (JSON)
                </button>

                <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold cursor-pointer transition shadow-xs flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {isDataBusy ? 'প্রসেস হচ্ছে...' : 'ব্যাকআপ ফাইল থেকে রিস্টোর করুন'}
                  <input
                    type="file"
                    accept=".json"
                    disabled={isDataBusy}
                    onChange={handleAdminRestoreBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Selective & Full Data Delete Card */}
            <div className="bg-white rounded-lg border border-rose-300 p-4 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-200">
                <div>
                  <h3 className="font-bold text-sm text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ডাটা ডিলিট কন্ট্রোল (Selective & Full Data Delete)
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    প্রয়োজন অনুযায়ী নির্দিষ্ট বিভাগের ডাটা অথবা সম্পূর্ণ ব্যবসার ডাটা স্থায়ীভাবে মুছে ফেলুন (ইউজার একাউন্ট অক্ষুণ্ণ থাকবে)।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {deleteCatalogOptions.map((opt) => {
                  const isChecked = selectedDeleteTargets.includes(opt.key);
                  return (
                    <label
                      key={opt.key}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-start justify-between gap-2 ${
                        isChecked
                          ? 'bg-rose-50 border-rose-500 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                        <div className="mt-1 font-mono font-bold text-slate-700 text-[11px]">
                          মোট রেকর্ড: {opt.count}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDeleteTarget(opt.key)}
                        className="w-4 h-4 mt-0.5 accent-rose-600 cursor-pointer shrink-0"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={selectedDeleteTargets.length === 0 || isDataBusy}
                  onClick={() =>
                    openConfirmDeleteModal(
                      selectedDeleteTargets,
                      'নির্বাচিত ডাটা স্থায়ীভাবে মুছে ফেলুন',
                      `আপনি নির্বাচিত ${selectedDeleteTargets.length} টি বিভাগের সকল ডাটা মুছে ফেলতে যাচ্ছেন। এই কাজটি আর ফিরিয়ে আনা যাবে না।`
                    )
                  }
                  className="px-4 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  নির্বাচিত ডাটা মুছুন ({selectedDeleteTargets.length})
                </button>

                <button
                  type="button"
                  disabled={isDataBusy}
                  onClick={() =>
                    openConfirmDeleteModal(
                      ['all'],
                      'সম্পূর্ণ ব্যবসার ডাটা মুছুন (Full Data Wipe)',
                      'সতর্কতা: এর ফলে সকল চালান, জমা, আয়-ব্যয়, স্টক-ইন, ডেলিভারি চালান, ক্রেতা, পণ্য ও ডিলার তথ্য স্থায়ীভাবে মুছে যাবে। শুধুমাত্র ইউজার লগিন একাউন্ট থাকবে। আগে ব্যাকআপ ডাউনলোড করে নেওয়ার পরামর্শ দেওয়া হলো।'
                    )
                  }
                  className="px-4 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded-lg font-bold cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  সকল ব্যবসার ডাটা মুছুন (Full Wipe)
                </button>
              </div>
            </div>

            {/* Pending Challans Single Delete Manager Card */}
            <div className="bg-white rounded-lg border border-amber-300 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-600" />
                    পেন্ডিং চালান ডিলিট ম্যানেজার (Pending Challans) — {pendingChallansList.length} টি
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    যেসব চালান এখনো সম্পূর্ণ ডেলিভারি হয়নি (পেন্ডিং বা আংশিক ডেলিভারি), সেগুলো এখান থেকে সরাসরি এক-একটি করে ডিলিট করতে পারবেন।
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={pendingChallanSearch}
                    onChange={(e) => setPendingChallanSearch(e.target.value)}
                    placeholder="চালান নং, গ্রাহক বা ফোন খুঁজুন..."
                    className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2 py-1.5 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-64 border border-slate-200 rounded">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2 text-center w-20">চালান নং</th>
                      <th className="p-2 w-24">তারিখ</th>
                      <th className="p-2">গ্রাহকের নাম ও মোবাইল</th>
                      <th className="p-2 text-center w-28">স্ট্যাটাস</th>
                      <th className="p-2 text-right w-28">অবশিষ্ট বাকি</th>
                      <th className="p-2 text-center w-24">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingChallansList.map((inv) => {
                      const st = StorageService.getInvoiceDeliveryStatus(inv.no);
                      return (
                        <tr key={inv.no} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono font-bold text-slate-900">#{inv.no}</td>
                          <td className="p-2 font-mono text-slate-600">{inv.date?.slice(0, 10)}</td>
                          <td className="p-2">
                            <div className="font-bold text-slate-800">{inv.custName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{inv.phone || inv.address || '—'}</div>
                          </td>
                          <td className="p-2 text-center">
                            {st.status === 'partial' ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                                আংশিক ডেলিভারি
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                                পেন্ডিং
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-rose-700">
                            {st.remainingTotalBox}B / {st.remainingTotalPiece}P
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setPendingChallanDeleteTarget(inv)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 rounded font-bold transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              ডিলিট
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {pendingChallansList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          কোনো পেন্ডিং চালান নেই
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery Challan History Single Delete Manager Card */}
            <div className="bg-white rounded-lg border border-indigo-300 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-700" />
                    ডেলিভারি চালান ইতিহাস ডিলিট ম্যানেজার (Delivery Challans History) — {deliveryChallansHistoryList.length} টি
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ইতিপূর্বে ডেলিভারি হওয়া চালানগুলোর ইতিহাস এখান থেকে এক-একটি করে ডিলিট করতে পারবেন (ডিলিট করলে পণ্যের স্টক ও ইনভয়েস স্ট্যাটাস স্বয়ংক্রিয়ভাবে সমন্বয় হবে)।
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={deliveryHistorySearch}
                    onChange={(e) => setDeliveryHistorySearch(e.target.value)}
                    placeholder="চালান নং, ইনভয়েস, গ্রাহক বা গাড়ি..."
                    className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2 py-1.5 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-64 border border-slate-200 rounded">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2 text-center w-28">Challan No</th>
                      <th className="p-2 text-center w-20">Invoice</th>
                      <th className="p-2 w-28">তারিখ</th>
                      <th className="p-2">গ্রাহকের নাম ও গাড়ি</th>
                      <th className="p-2 text-right w-32">ডেলিভারি পরিমাণ</th>
                      <th className="p-2 text-center w-24">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveryChallansHistoryList.map((ch) => {
                      const totBox = ch.items.reduce((s, it) => s + (it.box || 0), 0);
                      const totPc = ch.items.reduce((s, it) => s + (it.piece || 0), 0);
                      const totSft = ch.items.reduce((s, it) => s + (it.sft || 0), 0);
                      return (
                        <tr key={ch.id} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono font-bold text-emerald-900">
                            {ch.outType === 'manual' || ch.invoiceNo === 0
                              ? ch.manualRefNo || ch.challanNo
                              : ch.challanNo}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-700">
                            {ch.outType === 'manual' || ch.invoiceNo === 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                                ম্যানুয়াল আউট
                              </span>
                            ) : (
                              `#${ch.invoiceNo}`
                            )}
                          </td>
                          <td className="p-2 font-mono text-slate-600">{ch.date?.slice(0, 16)}</td>
                          <td className="p-2">
                            <div className="font-bold text-slate-800">{ch.custName}</div>
                            <div className="text-[10px] text-slate-500">
                              {ch.vehicleNo || '—'} {ch.driverName && ch.driverName !== '—' ? `• ${ch.driverName}` : ''}
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800">
                            {totBox}B / {totPc}P
                            <span className="block text-[10px] text-slate-500 font-normal">({totSft.toFixed(2)} Sft)</span>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setDeliveryHistoryDeleteTarget(ch)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 rounded font-bold transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              ডিলিট
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {deliveryChallansHistoryList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          কোনো ডেলিভারি চালান ইতিহাস নেই
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (In-App, No window.confirm) */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-rose-300 overflow-hidden text-xs">
            <div className="bg-rose-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">{deleteConfirmModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirmModal({ isOpen: false, targets: [], title: '', description: '' })
                }
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-slate-700 leading-relaxed font-medium">
                {deleteConfirmModal.description}
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isDataBusy}
                  onClick={() =>
                    setDeleteConfirmModal({ isOpen: false, targets: [], title: '', description: '' })
                  }
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer transition"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  disabled={isDataBusy}
                  onClick={executeConfirmedDelete}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded font-bold cursor-pointer transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDataBusy ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, স্থায়ীভাবে মুছে ফেলুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Pending Challan Delete Confirmation Modal */}
      {pendingChallanDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-rose-300 overflow-hidden text-xs">
            <div className="bg-rose-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">পেন্ডিং চালান ডিলিট নিশ্চিতকরণ</h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingChallanDeleteTarget(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-slate-700 leading-relaxed font-medium">
                আপনি কি নিশ্চিতভাবে পেন্ডিং চালান <strong>#{pendingChallanDeleteTarget.no}</strong> (গ্রাহক:{' '}
                <strong>{pendingChallanDeleteTarget.custName}</strong>) স্থায়ীভাবে মুছে ফেলতে চান?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900">
                সতর্কতা: এটি ডিলিট করলে সংশ্লিষ্ট চালান এবং এর সাথে যুক্ত পেন্ডিং ডেলিভারি রেকর্ড স্থায়ীভাবে মুছে যাবে।
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPendingChallanDeleteTarget(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer transition"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteSinglePendingChallan(pendingChallanDeleteTarget)}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold cursor-pointer transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  হ্যাঁ, স্থায়ীভাবে মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Delivery Challan History Delete Confirmation Modal */}
      {deliveryHistoryDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-rose-300 overflow-hidden text-xs">
            <div className="bg-rose-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">ডেলিভারি চালান ইতিহাস ডিলিট নিশ্চিতকরণ</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryHistoryDeleteTarget(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-slate-700 leading-relaxed font-medium">
                আপনি কি নিশ্চিতভাবে ডেলিভারি চালান <strong>{deliveryHistoryDeleteTarget.challanNo}</strong> (ইনভয়েস{' '}
                <strong>#{deliveryHistoryDeleteTarget.invoiceNo}</strong>, গ্রাহক:{' '}
                <strong>{deliveryHistoryDeleteTarget.custName}</strong>) ইতিহাস থেকে স্থায়ীভাবে মুছে ফেলতে চান?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900">
                সতর্কতা: এটি মুছে ফেললে এই চালানের ডেলিভারি করা পণ্যের স্টক পুনরায় গোডাউন স্টকে যোগ হবে এবং ইনভয়েসের ডেলিভারি স্ট্যাটাস আপডেট হবে।
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeliveryHistoryDeleteTarget(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold cursor-pointer transition"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteSingleDeliveryHistory(deliveryHistoryDeleteTarget)}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold cursor-pointer transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  হ্যাঁ, স্থায়ীভাবে মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
