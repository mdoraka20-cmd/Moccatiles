import React, { useState } from 'react';
import { ShopConfig } from '../types';
import { Settings, Save, Upload, Check, Image as ImageIcon } from 'lucide-react';

interface SettingsViewProps {
  shop: ShopConfig;
  onSaveShop: (shop: ShopConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ shop, onSaveShop }) => {
  const [name, setName] = useState(shop.name);
  const [address, setAddress] = useState(shop.address);
  const [phones, setPhones] = useState(shop.phones);
  const [web, setWeb] = useState(shop.web);
  const [note, setNote] = useState(shop.note);
  const [preparedBy, setPreparedBy] = useState(shop.preparedBy);
  const [startInvoiceNo, setStartInvoiceNo] = useState(shop.startInvoiceNo);
  const [footerText, setFooterText] = useState(shop.footerText);
  const [logoUrl, setLogoUrl] = useState(shop.logoUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const updated: ShopConfig = {
      name: name.trim(),
      address: address.trim(),
      phones: phones.trim(),
      web: web.trim(),
      note: note.trim(),
      preparedBy: preparedBy.trim(),
      startInvoiceNo: startInvoiceNo.trim(),
      footerText: footerText.trim(),
      logoUrl,
    };
    onSaveShop(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 text-xs">
      <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-sm text-slate-800">
              দোকানের তথ্য ও প্রিন্ট সেটিং (Shop Information & Print Config)
            </h3>
          </div>
          {savedSuccess && (
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> সংরক্ষিত হয়েছে!
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">দোকানের নাম (Shop Name) : *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. মেসার্স সততা টাইলস ও স্যানিটারি"
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-bold text-slate-900 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">ঠিকানা (Address) :</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="দোকানের পূর্ণ ঠিকানা"
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">ফোন নম্বরসমূহ (Phones) :</label>
              <input
                type="text"
                value={phones}
                onChange={(e) => setPhones(e.target.value)}
                placeholder="০১৭১২-৩৪৫৬৭৮, ০১৮১২-৩৪৫৬৭৮"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Web / Email :</label>
              <input
                type="text"
                value={web}
                onChange={(e) => setWeb(e.target.value)}
                placeholder="Email: info@shop.com | Web: www.shop.com"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              বিশেষ দ্রষ্টব্য (Invoice ও Challan-এর নিচে মুদ্রিত শর্তাবলী) :
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ভেজা, সিমেন্ট লাগানো ও অতিরিক্ত সময়ের টাইলস সংক্রান্ত শর্তাবলী..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900 resize-none font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Prepared by (প্রস্তুতকারী - মেমু ও চালানের নিচে স্বাক্ষরের উপরে প্রদর্শিত নাম) :
            </label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="e.g. AnayeT বা প্রস্তুতকারীর নাম"
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">ফুটার লেখা (প্রিন্টের একদম নিচে) :</label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="আমাদের সেবায় সন্তুষ্ট থাকলে আবার আসবেন..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900"
            />
          </div>

          {/* Logo upload */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-slate-700 font-semibold mb-2">দোকানের লোগো (Logo Image) :</label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative border border-slate-300 rounded p-1 bg-slate-50 w-20 h-20 flex items-center justify-center">
                  <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded w-20 h-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] mt-1">No logo</span>
                </div>
              )}

              <div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold cursor-pointer transition shadow-xs text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  লোগো ছবি বাছুন (Upload Logo)
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-500 mt-1">PNG, JPG বা WebP ফরম্যাট সমর্থন করে।</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded cursor-pointer transition shadow-xs flex items-center gap-2 text-xs"
          >
            <Save className="w-4 h-4" />
            সেটিং সংরক্ষণ করুন (Save Settings)
          </button>
        </div>
      </div>
    </div>
  );
};
