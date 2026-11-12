import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { StorageService } from '../services/storage';
import { FirestoreSyncService } from '../services/firestoreSync';
import { formatMoney, formatQty, formatQty4, parseNum } from '../utils/numberWords';
import {
  Package,
  Search,
  Plus,
  Save,
  Trash2,
  Check,
  Edit2,
  Tag,
  Tags,
  X,
  AlertCircle,
  RefreshCw,
  Building2,
  Award,
  Filter,
} from 'lucide-react';

interface ProductViewProps {
  products: Product[];
  onSaveProduct: (prod: Product) => void;
  onDeleteProduct: (id: number) => void;
  onProductsReload?: () => void;
  currentUser?: any;
  onRequireAdminAuth?: (actionTitle: string, onExecute: () => void, actionDetails?: string) => void;
}

export const ProductView: React.FC<ProductViewProps> = ({
  products,
  onSaveProduct,
  onDeleteProduct,
  onProductsReload,
  currentUser,
  onRequireAdminAuth,
}) => {
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);

  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [grade, setGrade] = useState<'A' | 'B' | 'C' | string>('A');
  const [name, setName] = useState('');
  const [isTile, setIsTile] = useState(true);
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [scm, setScm] = useState('');
  const [sftPack, setSftPack] = useState('');
  const [qtyPack, setQtyPack] = useState('');
  const [rate, setRate] = useState('');
  const [price, setPrice] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  // Category Management State
  const [categories, setCategories] = useState<string[]>(() => StorageService.getCategories());
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [editingCatOriginal, setEditingCatOriginal] = useState<string | null>(null);
  const [editingCatNewName, setEditingCatNewName] = useState('');
  const [catFeedbackMsg, setCatFeedbackMsg] = useState('');

  // Vendor Management State
  const [vendors, setVendors] = useState<string[]>(() => StorageService.getVendors());
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [newVendorInput, setNewVendorInput] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [editingVendorOriginal, setEditingVendorOriginal] = useState<string | null>(null);
  const [editingVendorNewName, setEditingVendorNewName] = useState('');
  const [vendorFeedbackMsg, setVendorFeedbackMsg] = useState('');

  // Table Filters
  const [filterVendor, setFilterVendor] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // Keep categories and vendors in sync with Storage / Firebase live changes
  useEffect(() => {
    const handleStorage = () => {
      setCategories(StorageService.getCategories());
      setVendors(StorageService.getVendors());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const showCatMsg = (msg: string) => {
    setCatFeedbackMsg(msg);
    setTimeout(() => setCatFeedbackMsg(''), 4000);
  };

  const showVendorMsg = (msg: string) => {
    setVendorFeedbackMsg(msg);
    setTimeout(() => setVendorFeedbackMsg(''), 4000);
  };

  const handleAddVendor = (nameToUse?: string) => {
    const target = (nameToUse !== undefined ? nameToUse : newVendorInput).trim();
    if (!target) {
      alert('অনুগ্রহ করে ভেন্ডর / ব্র্যান্ডের নাম লিখুন।');
      return;
    }
    const updated = StorageService.addVendor(target);
    setVendors(updated);
    FirestoreSyncService.syncMetadataLists(undefined, updated).catch(console.error);
    setVendor(target);
    setNewVendorInput('');
    showVendorMsg(`ভেন্ডর "${target}" সফলভাবে যোগ করা হয়েছে!`);
  };

  const handleSaveRenameVendor = (oldName: string) => {
    const trimmedNew = editingVendorNewName.trim();
    if (!trimmedNew) {
      alert('ভেন্ডরের নতুন নাম দিন।');
      return;
    }
    if (trimmedNew.toLowerCase() === oldName.toLowerCase()) {
      setEditingVendorOriginal(null);
      return;
    }
    const { updatedVendors, affectedCount } = StorageService.renameVendor(oldName, trimmedNew);
    setVendors(updatedVendors);
    FirestoreSyncService.syncMetadataLists(undefined, updatedVendors).catch(console.error);
    if (vendor.toLowerCase() === oldName.toLowerCase()) {
      setVendor(trimmedNew);
    }
    setEditingVendorOriginal(null);
    onProductsReload?.();
    showVendorMsg(
      `ভেন্ডর "${oldName}" পরিবর্তন করে "${trimmedNew}" করা হয়েছে! ${
        affectedCount > 0 ? `(${affectedCount} টি পণ্যে স্বয়ংক্রিয়ভাবে আপডেট হয়েছে)` : ''
      }`
    );
  };

  const handleDeleteVendor = (vendorName: string, usageCount: number) => {
    const warningText =
      usageCount > 0
        ? `"${vendorName}" ভেন্ডরটি ${usageCount} টি পণ্যে ব্যবহৃত হচ্ছে! আপনি কি এটি ভেন্ডর তালিকা থেকে কমাতে/মুছতে চান?`
        : `"${vendorName}" ভেন্ডরটি তালিকা থেকে মুছে ফেলবেন?`;

    const executeDelete = () => {
      const updated = StorageService.deleteVendor(vendorName);
      setVendors(updated);
      FirestoreSyncService.syncMetadataLists(undefined, updated).catch(console.error);
      if (vendor.toLowerCase() === vendorName.toLowerCase()) {
        setVendor('');
      }
      showVendorMsg(`ভেন্ডর "${vendorName}" তালিকা থেকে মুছে ফেলা হয়েছে!`);
    };

    if (onRequireAdminAuth) {
      onRequireAdminAuth(`ভেন্ডর / ব্র্যান্ড '${vendorName}' মুছে ফেলা`, executeDelete, warningText);
    } else {
      executeDelete();
    }
  };

  const handleAddCategory = (nameToUse?: string) => {
    const target = (nameToUse !== undefined ? nameToUse : newCategoryInput).trim();
    if (!target) {
      alert('অনুগ্রহ করে ক্যাটাগরির নাম লিখুন।');
      return;
    }
    const updated = StorageService.addCategory(target);
    setCategories(updated);
    FirestoreSyncService.syncMetadataLists(updated).catch(console.error);
    setCategory(target);
    setNewCategoryInput('');
    showCatMsg(`ক্যাটাগরি "${target}" সফলভাবে যোগ করা হয়েছে!`);
  };

  const handleSaveRename = (oldName: string) => {
    const trimmedNew = editingCatNewName.trim();
    if (!trimmedNew) {
      alert('ক্যাটাগরির নতুন নাম দিন।');
      return;
    }
    if (trimmedNew.toLowerCase() === oldName.toLowerCase()) {
      setEditingCatOriginal(null);
      return;
    }
    const { updatedCategories, affectedCount } = StorageService.renameCategory(oldName, trimmedNew);
    setCategories(updatedCategories);
    FirestoreSyncService.syncMetadataLists(updatedCategories).catch(console.error);
    if (category.toLowerCase() === oldName.toLowerCase()) {
      setCategory(trimmedNew);
    }
    setEditingCatOriginal(null);
    onProductsReload?.();
    showCatMsg(
      `ক্যাটাগরি "${oldName}" পরিবর্তন করে "${trimmedNew}" করা হয়েছে! ${
        affectedCount > 0 ? `(${affectedCount} টি পণ্যে স্বয়ংক্রিয়ভাবে আপডেট হয়েছে)` : ''
      }`
    );
  };

  const handleDeleteCategory = (catName: string, usageCount: number) => {
    const warningText =
      usageCount > 0
        ? `"${catName}" ক্যাটাগরিটি ${usageCount} টি পণ্যে ব্যবহৃত হচ্ছে! আপনি কি এটি ক্যাটাগরি তালিকা থেকে কমাতে/মুছতে চান?`
        : `"${catName}" ক্যাটাগরিটি তালিকা থেকে মুছে ফেলবেন?`;

    const executeDelete = () => {
      const updated = StorageService.deleteCategory(catName);
      setCategories(updated);
      FirestoreSyncService.syncMetadataLists(updated).catch(console.error);
      if (category.toLowerCase() === catName.toLowerCase()) {
        setCategory('');
      }
      showCatMsg(`ক্যাটাগরি "${catName}" তালিকা থেকে মুছে ফেলা হয়েছে!`);
    };

    if (onRequireAdminAuth) {
      onRequireAdminAuth(`ক্যাটাগরি '${catName}' মুছে ফেলা`, executeDelete, warningText);
    } else {
      executeDelete();
    }
  };

  // Auto name generation: Code + "-" + Category
  useEffect(() => {
    const c = code.trim();
    const cat = category.trim();
    if (c) {
      setName(cat ? `${c}-${cat}` : c);
    } else {
      setName('');
    }
  }, [code, category]);

  // Auto Sft Pack calculation for tiles: (W * H / 144) * QtyPack
  useEffect(() => {
    if (isTile) {
      const wVal = parseNum(w);
      const hVal = parseNum(h);
      const qVal = parseNum(qtyPack);
      if (wVal > 0 && hVal > 0 && qVal > 0) {
        const computed = (wVal * hVal * qVal) / 144;
        setSftPack(formatQty4(computed));
      }
    }
  }, [w, h, qtyPack, isTile]);

  const handleSelectRow = (p: Product) => {
    setSelectedProd(p);
    setCode(p.code);
    setCategory(p.category);
    setVendor(p.vendor || '');
    setGrade(p.grade || 'A');
    setName(p.name);
    setIsTile(p.isTile);
    setW(p.isTile ? formatQty(p.w) : '');
    setH(p.isTile ? formatQty(p.h) : '');
    setScm(formatQty(p.scm));
    setSftPack(formatQty4(p.sftPack));
    setQtyPack(formatQty(p.qtyPack));
    setRate(formatQty(p.rate));
    setPrice(formatQty(p.price));
  };

  const handleNew = () => {
    setSelectedProd(null);
    setCode('');
    setCategory('');
    setVendor('');
    setGrade('A');
    setName('');
    setIsTile(true);
    setW('');
    setH('');
    setScm('');
    setSftPack('');
    setQtyPack('');
    setRate('');
    setPrice('');
  };

  const handleSave = () => {
    if (!code.trim()) {
      alert('Product Code দিন।');
      return;
    }
    const nm = name.trim();
    const duplicate = products.find(
      (p) => p.name.toLowerCase() === nm.toLowerCase() && (!selectedProd || p.id !== selectedProd.id)
    );
    if (duplicate) {
      alert('এই নামে পণ্য আগেই আছে। অন্য নাম বা কোড দিন।');
      return;
    }

    if (isTile && parseNum(sftPack) <= 0) {
      alert('টাইলসের জন্য SFT Per Pack দিন (মাপ ও Qty দিলে নিজে হিসাব হবে)।');
      return;
    }

    const prod: Product = {
      id: selectedProd ? selectedProd.id : StorageService.nextProductId(),
      code: code.trim(),
      category: category.trim(),
      vendor: vendor.trim(),
      grade: grade || 'A',
      name: nm,
      isTile,
      w: isTile ? parseNum(w) : 0,
      h: isTile ? parseNum(h) : 0,
      scm: parseNum(scm),
      sftPack: parseNum(sftPack),
      qtyPack: parseNum(qtyPack),
      rate: parseNum(rate),
      price: parseNum(price),
    };

    if (category.trim()) {
      const updatedCats = StorageService.addCategory(category.trim());
      setCategories(updatedCats);
      FirestoreSyncService.syncMetadataLists(updatedCats).catch(console.error);
    }
    if (vendor.trim()) {
      const updatedVends = StorageService.addVendor(vendor.trim());
      setVendors(updatedVends);
      FirestoreSyncService.syncMetadataLists(undefined, updatedVends).catch(console.error);
    }

    onSaveProduct(prod);
    setSelectedProd(prod);
    alert(`পণ্য সংরক্ষিত হয়েছে! PID: ${prod.id} (${prod.grade ? `Grade ${prod.grade}` : ''})`);
  };

  const handleDelete = () => {
    if (!selectedProd) return;
    const executeDelete = () => {
      onDeleteProduct(selectedProd.id);
      handleNew();
    };

    if (onRequireAdminAuth) {
      onRequireAdminAuth(
        `পণ্য '${selectedProd.name}' মুছে ফেলা`,
        executeDelete,
        `PID: #${selectedProd.id} | কোড: ${selectedProd.code} | ব্র্যান্ড: ${selectedProd.vendor || '—'} | গ্রেড: Grade ${selectedProd.grade || 'A'}`
      );
    } else {
      executeDelete();
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(categorySearchQuery.toLowerCase().trim())
  );

  const filteredVendors = vendors.filter((v) =>
    v.toLowerCase().includes(vendorSearchQuery.toLowerCase().trim())
  );

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.vendor && p.vendor.toLowerCase().includes(q)) ||
      String(p.id).includes(q);

    const matchVendor =
      filterVendor === 'all' ||
      (p.vendor && p.vendor.toLowerCase() === filterVendor.toLowerCase());

    const matchGrade =
      filterGrade === 'all' ||
      (p.grade || 'A').toUpperCase() === filterGrade.toUpperCase();

    return matchSearch && matchVendor && matchGrade;
  });

  // Grade Counts & Stock Summary
  const gradeACount = products.filter((p) => (p.grade || 'A').toUpperCase() === 'A').length;
  const gradeBCount = products.filter((p) => (p.grade || '').toUpperCase() === 'B').length;
  const gradeCCount = products.filter((p) => (p.grade || '').toUpperCase() === 'C').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Product Entry Form Card */}
      <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-2xs space-y-3 text-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Package className="w-4 h-4 text-emerald-700" />
          <h3 className="font-bold text-sm text-slate-800">
            {selectedProd ? `পণ্য সম্পাদন (PID: ${selectedProd.id})` : 'নতুন পণ্য এন্ট্রি (Product Information)'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Row 1 */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Product ID :</label>
            <div className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-700">
              {selectedProd ? selectedProd.id : '(নতুন স্বয়ংক্রিয় আইডি)'}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Product Code : *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PC-51_A_STC"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold flex items-center gap-1">
                <Tags className="w-3.5 h-3.5 text-emerald-700" />
                <span>Category :</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                title="ক্যাটাগরি কমানো, বাড়ানো ও এডিট করুন"
              >
                <Tag className="w-3 h-3" />
                <span>ম্যানেজ ({categories.length})</span>
              </button>
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ক্যাটাগরি বা টাইপ"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:border-emerald-600 focus:outline-hidden font-medium"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                title="ক্যাটাগরি যোগ / এডিট / মুছুন"
                className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 transition"
              >
                <Plus className="w-3 h-3" />
                <span>এডিট</span>
              </button>
            </div>

            {/* Quick Category Selection Badges */}
            <div className="mt-1 flex flex-wrap gap-1 items-center">
              {categories.slice(0, 4).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer border ${
                    category === c
                      ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
              {categories.length > 4 && (
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-1.5 py-0.5 rounded text-[10px] text-emerald-700 hover:bg-emerald-50 font-bold border border-emerald-200 cursor-pointer"
                >
                  +{categories.length - 4}টি
                </button>
              )}
            </div>
          </div>

          {/* Vendor / Brand Input */}
          <div className="sm:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Vendor / Brand :</span>
              </label>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(true)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                title="ভেন্ডর কমানো, বাড়ানো ও এডিট করুন"
              >
                <Building2 className="w-3 h-3" />
                <span>ম্যানেজ ({vendors.length})</span>
              </button>
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                list="vendor-suggestions"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="ভেন্ডর বা ব্র্যান্ড নাম"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:border-blue-600 focus:outline-hidden font-medium"
              />
              <datalist id="vendor-suggestions">
                {vendors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(true)}
                title="ভেন্ডর যোগ / এডিট / মুছুন"
                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 transition"
              >
                <Plus className="w-3 h-3" />
                <span>এডিট</span>
              </button>
            </div>

            {/* Quick Vendor Selection Badges */}
            <div className="mt-1 flex flex-wrap gap-1 items-center">
              {vendors.slice(0, 3).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVendor(v)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer border truncate max-w-[120px] ${
                    vendor === v
                      ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                  title={v}
                >
                  {v.split(' ')[0]}
                </button>
              ))}
              {vendors.length > 3 && (
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(true)}
                  className="px-1.5 py-0.5 rounded text-[10px] text-blue-700 hover:bg-blue-50 font-bold border border-blue-200 cursor-pointer"
                >
                  +{vendors.length - 3}টি
                </button>
              )}
            </div>
          </div>

          {/* Grade Selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>পণ্যের গ্রেড (Grade) : *</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">A, B বা C</span>
            </label>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <button
                type="button"
                onClick={() => setGrade('A')}
                className={`py-1.5 px-2 rounded font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 border ${
                  grade === 'A'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <span>Grade A</span>
              </button>
              <button
                type="button"
                onClick={() => setGrade('B')}
                className={`py-1.5 px-2 rounded font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 border ${
                  grade === 'B'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <span>Grade B</span>
              </button>
              <button
                type="button"
                onClick={() => setGrade('C')}
                className={`py-1.5 px-2 rounded font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 border ${
                  grade === 'C'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <span>Grade C</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Product Name : (Auto)</label>
            <input
              type="text"
              readOnly
              value={name}
              placeholder="স্বয়ংক্রিয় নাম"
              className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800"
            />
          </div>

          {/* Row 2: Type toggle and dimensions */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">পণ্যের ধরন (Type) :</label>
            <div className="flex items-center gap-4 py-1">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                <input
                  type="radio"
                  name="prodType"
                  checked={isTile}
                  onChange={() => setIsTile(true)}
                  className="text-emerald-600"
                />
                Tiles (টাইলস)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                <input
                  type="radio"
                  name="prodType"
                  checked={!isTile}
                  onChange={() => setIsTile(false)}
                  className="text-emerald-600"
                />
                Other (ফিটিংস/স্যানিটারি)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Dimension (ইঞ্চি) W x H :</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                disabled={!isTile}
                value={w}
                onChange={(e) => setW(e.target.value)}
                placeholder="W (ইঞ্চি)"
                className="w-1/2 bg-white disabled:bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-center font-mono"
              />
              <span className="text-slate-500 font-bold">x</span>
              <input
                type="text"
                disabled={!isTile}
                value={h}
                onChange={(e) => setH(e.target.value)}
                placeholder="H (ইঞ্চি)"
                className="w-1/2 bg-white disabled:bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-center font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Qty Per Pack (পিস) :</label>
            <input
              type="text"
              value={qtyPack}
              onChange={(e) => setQtyPack(e.target.value)}
              placeholder="e.g. 25"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">SFT Per Pack :</label>
            <input
              type="text"
              value={sftPack}
              onChange={(e) => setSftPack(e.target.value)}
              placeholder="স্বয়ংক্রিয় হিসাব বা হাতে লিখুন"
              className="w-full bg-amber-50 border border-amber-300 rounded px-2.5 py-1.5 font-mono font-bold text-amber-950"
            />
          </div>

          {/* Row 3: Pricing */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">SCM Per Pack :</label>
            <input
              type="text"
              value={scm}
              onChange={(e) => setScm(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">ক্রয় মূল্য (Cost Rate / Sft) :</label>
            <input
              type="text"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              বিক্রয় মূল্য ({isTile ? 'Sales Price / SFT' : 'প্রতি পিসের দাম'}) : *
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-emerald-800 text-sm"
            />
          </div>

          <div className="flex items-end text-[11px] text-slate-500 italic pb-2">
            {!isTile && '* Other পণ্যের জন্য Sales Price = প্রতি পিসের দাম'}
            {isTile && '* টাইলসের জন্য মাপ ও পিস দিলে SFT নিজে হিসাব হয়'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={handleNew}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            নতুন (New)
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            সংরক্ষণ (Save)
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedProd}
            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            মুছুন (Delete)
          </button>
        </div>
      </div>

      {/* Grid Card with Vendor & Grade Filters */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কোড, নাম বা ভেন্ডর..."
                className="w-full bg-white border border-slate-300 rounded pl-8 pr-2 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* Vendor Filter */}
            <div className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">সকল ভেন্ডর / ব্র্যান্ড ({vendors.length})</option>
                {vendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded p-0.5">
              <span className="text-[10px] text-slate-400 px-1 font-bold">গ্রেড:</span>
              <button
                type="button"
                onClick={() => setFilterGrade('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  filterGrade === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterGrade('A')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  filterGrade === 'A'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Grade A ({gradeACount})
              </button>
              <button
                type="button"
                onClick={() => setFilterGrade('B')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  filterGrade === 'B'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Grade B ({gradeBCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterGrade('C')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  filterGrade === 'C'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                Grade C ({gradeCCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-bold bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
              মোট: <span className="text-emerald-700 font-bold">{filteredProducts.length}</span> টি পণ্য
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[440px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0">
              <tr>
                <th className="p-2 text-center w-16">PID</th>
                <th className="p-2">Product Name</th>
                <th className="p-2">Category</th>
                <th className="p-2">Vendor / Brand</th>
                <th className="p-2 text-center w-20">Grade</th>
                <th className="p-2 text-center w-20">Dimension</th>
                <th className="p-2 text-right w-16">Sft/Pack</th>
                <th className="p-2 text-right w-16">Qty/Pack</th>
                <th className="p-2 text-right w-20">Sales Price</th>
                <th className="p-2 text-right w-24">বর্তমান স্টক</th>
                <th className="p-2 text-center w-12">মুছুন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isSelected = selectedProd?.id === p.id;
                const pGrade = (p.grade || 'A').toUpperCase();
                return (
                  <tr
                    key={p.id}
                    onClick={() => handleSelectRow(p)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-emerald-100 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-2 text-center font-mono font-bold text-slate-700">{p.id}</td>
                    <td className="p-2 font-medium text-slate-900">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.code}</div>
                    </td>
                    <td className="p-2 text-slate-600">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                        {p.category || '—'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-700 font-medium">
                      {p.vendor ? (
                        <span className="text-blue-800 font-semibold flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          {p.vendor}
                        </span>
                      ) : (
                        <span className="text-slate-400">অনির্দিষ্ট</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          pGrade === 'A'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : pGrade === 'B'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        Grade {pGrade}
                      </span>
                    </td>
                    <td className="p-2 text-center font-mono text-[11px] text-slate-600">
                      {p.isTile ? `${formatQty(p.w)} X ${formatQty(p.h)}` : '—'}
                    </td>
                    <td className="p-2 text-right font-mono">{formatQty4(p.sftPack)}</td>
                    <td className="p-2 text-right font-mono">{formatQty(p.qtyPack)}</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      ৳ {formatMoney(p.price)}
                    </td>
                    <td className="p-2 text-right font-mono">
                      <div className="font-bold text-slate-800">
                        {p.stockBox || 0} B
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {p.isTile ? `${(p.stockSft || 0).toFixed(1)} sft` : `${p.stockPiece || 0} pcs`}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const executeDelete = () => {
                            onDeleteProduct(p.id);
                            if (selectedProd?.id === p.id) {
                              handleNew();
                            }
                          };
                          if (currentUser?.role === 'admin') {
                            executeDelete();
                          } else if (onRequireAdminAuth) {
                            onRequireAdminAuth(
                              `পণ্য '${p.name}' মুছে ফেলা`,
                              executeDelete,
                              `আইডি: #${p.id} | কোড: ${p.code}`
                            );
                          } else {
                            executeDelete();
                          }
                        }}
                        title={currentUser?.role === 'admin' ? 'সরাসরি পণ্য মুছুন (Admin Delete)' : 'এডমিন পারমিশন নিয়ে মুছুন'}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    কোনো পণ্য খুঁজে পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Master Management Modal (কমানো, বাড়ানো ও এডিট) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col border border-slate-300 overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 rounded-md">
                  <Tags className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    ক্যাটাগরি ব্যবস্থাপনা (Category Master Management)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    পণ্য এন্ট্রির জন্য নতুন ক্যাটাগরি বাড়ানো, নাম এডিট বা অপ্রয়োজনীয় ক্যাটাগরি কমানো/মুছে ফেলা
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback Alert if any */}
            {catFeedbackMsg && (
              <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{catFeedbackMsg}</span>
              </div>
            )}

            {/* Section 1: Add New Category (বাড়ানো) */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold">
                + নতুন ক্যাটাগরি যোগ করুন (বাড়ানো):
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCategory();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="নতুন ক্যাটাগরির নাম লিখুন (যেমন: Floor 32x32, Kitchen Dark, ইত্যাদি)"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:border-emerald-600 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>যোগ করুন</span>
                </button>
              </form>
            </div>

            {/* Section 2: Search & Category List (এডিট ও কমানো) */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700">
                  বিদ্যমান ক্যাটাগরি তালিকা ({categories.length} টি):
                </span>
                <div className="relative w-48">
                  <input
                    type="text"
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    placeholder="ক্যাটাগরি খুঁজুন..."
                    className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-900"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                </div>
              </div>

              {/* List items */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {filteredCategories.map((catName) => {
                  const usageCount = products.filter(
                    (p) => p.category && p.category.toLowerCase() === catName.toLowerCase()
                  ).length;
                  const isEditing = editingCatOriginal === catName;

                  return (
                    <div
                      key={catName}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 transition gap-2"
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCatNewName}
                            onChange={(e) => setEditingCatNewName(e.target.value)}
                            className="flex-1 bg-white border border-emerald-500 rounded px-2.5 py-1 text-slate-900 font-semibold focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(catName)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            সেভ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatOriginal(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                          >
                            বাতিল
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-emerald-100 text-emerald-800 rounded">
                              <Tag className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-xs">{catName}</span>
                              <div className="text-[10px] text-slate-500">
                                {usageCount > 0 ? (
                                  <span className="text-emerald-700 font-medium">
                                    {usageCount} টি পণ্যে ব্যবহৃত হচ্ছে
                                  </span>
                                ) : (
                                  <span className="text-slate-400">কোনো পণ্যে ব্যবহৃত হয়নি</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Select into current form */}
                            <button
                              type="button"
                              onClick={() => {
                                setCategory(catName);
                                setIsCategoryModalOpen(false);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded border border-slate-300 font-semibold transition flex items-center gap-1 cursor-pointer text-[11px]"
                              title="ফর্মে এই ক্যাটাগরি নির্বাচন করুন"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              নির্বাচন
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatOriginal(catName);
                                setEditingCatNewName(catName);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition cursor-pointer"
                              title="ক্যাটাগরির নাম পরিবর্তন / এডিট করুন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button (কমানো) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(catName, usageCount)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition cursor-pointer"
                              title="ক্যাটাগরি মুছে ফেলুন (কমানো)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="p-6 text-center text-slate-400">
                    কোনো ক্যাটাগরি পাওয়া যায়নি
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                * ক্যাটাগরির নাম পরিবর্তন করলে বিদ্যমান সকল পণ্যে স্বয়ংক্রিয়ভাবে আপডেট হবে।
              </span>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded cursor-pointer transition"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Master Management Modal (ভেন্ডর কমানো, বাড়ানো ও এডিট) */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col border border-slate-300 overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-md">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    ভেন্ডর ও ব্র্যান্ড ব্যবস্থাপনা (Vendor / Brand Master)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    পণ্য এন্ট্রির জন্য ভেন্ডর/সরবরাহকারী বাড়ানো, নাম সংশোধন বা অপ্রয়োজনীয় ভেন্ডর মুছে ফেলা
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVendorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback Alert if any */}
            {vendorFeedbackMsg && (
              <div className="mx-4 mt-3 p-2.5 bg-blue-50 border border-blue-300 rounded-lg text-blue-800 flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{vendorFeedbackMsg}</span>
              </div>
            )}

            {/* Section 1: Add New Vendor (বাড়ানো) */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold">
                + নতুন ভেন্ডর / ব্র্যান্ড যোগ করুন (বাড়ানো):
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddVendor();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newVendorInput}
                  onChange={(e) => setNewVendorInput(e.target.value)}
                  placeholder="নতুন ভেন্ডর/ব্র্যান্ডের নাম লিখুন (যেমন: মীর সিরামিকস, আকিজ ইত্যাদি)"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:border-blue-600 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>যোগ করুন</span>
                </button>
              </form>
            </div>

            {/* Section 2: Search & Vendor List (এডিট ও কমানো) */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700">
                  বিদ্যমান ভেন্ডর তালিকা ({vendors.length} টি):
                </span>
                <div className="relative w-48">
                  <input
                    type="text"
                    value={vendorSearchQuery}
                    onChange={(e) => setVendorSearchQuery(e.target.value)}
                    placeholder="ভেন্ডর খুঁজুন..."
                    className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-900"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                </div>
              </div>

              {/* List items */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {filteredVendors.map((vName) => {
                  const usageCount = products.filter(
                    (p) => p.vendor && p.vendor.toLowerCase() === vName.toLowerCase()
                  ).length;
                  const isEditing = editingVendorOriginal === vName;

                  return (
                    <div
                      key={vName}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 transition gap-2"
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingVendorNewName}
                            onChange={(e) => setEditingVendorNewName(e.target.value)}
                            className="flex-1 bg-white border border-blue-500 rounded px-2.5 py-1 text-slate-900 font-semibold focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRenameVendor(vName)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            সেভ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingVendorOriginal(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                          >
                            বাতিল
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-100 text-blue-800 rounded">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-xs">{vName}</span>
                              <div className="text-[10px] text-slate-500">
                                {usageCount > 0 ? (
                                  <span className="text-blue-700 font-medium">
                                    {usageCount} টি পণ্যে সেট করা রয়েছে
                                  </span>
                                ) : (
                                  <span className="text-slate-400">কোনো পণ্যে সেট হয়নি</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Select into current form */}
                            <button
                              type="button"
                              onClick={() => {
                                setVendor(vName);
                                setIsVendorModalOpen(false);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded border border-slate-300 font-semibold transition flex items-center gap-1 cursor-pointer text-[11px]"
                              title="ফর্মে এই ভেন্ডর নির্বাচন করুন"
                            >
                              <Check className="w-3 h-3 text-blue-600" />
                              নির্বাচন
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVendorOriginal(vName);
                                setEditingVendorNewName(vName);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition cursor-pointer"
                              title="ভেন্ডরের নাম পরিবর্তন / এডিট করুন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button (কমানো) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVendor(vName, usageCount)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition cursor-pointer"
                              title="ভেন্ডর মুছে ফেলুন (কমানো)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {filteredVendors.length === 0 && (
                  <div className="p-6 text-center text-slate-400">
                    কোনো ভেন্ডর পাওয়া যায়নি
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                * ভেন্ডরের নাম পরিবর্তন করলে বিদ্যমান সকল পণ্যে স্বয়ংক্রিয়ভাবে আপডেট হবে।
              </span>
              <button
                onClick={() => setIsVendorModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded cursor-pointer transition"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
