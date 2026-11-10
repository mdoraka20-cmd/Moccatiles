import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { formatMoney } from '../utils/numberWords';
import { Search, X, Check, Package, Layers } from 'lucide-react';

interface ProductSearchSelectProps {
  products: Product[];
  selectedProductId: number | string | null;
  onSelectProduct: (product: Product | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  placeholder = 'পণ্য কোড বা নাম লিখুন (কিবোর্ড দিয়ে খুঁজুন)...',
  className = '',
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find currently selected product
  const selectedProd = products.find((p) => String(p.id) === String(selectedProductId)) || null;

  // Filter products based on query
  const filteredProducts = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return products.slice(0, 40); // show top 40 initially
    }
    return products
      .filter((p) => {
        const matchCode = p.code?.toLowerCase().includes(q);
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        const matchVendor = p.vendor?.toLowerCase().includes(q);
        const matchSize = p.w && p.h ? `${p.w}x${p.h}`.toLowerCase().includes(q) : false;
        const matchId = String(p.id).includes(q);
        return matchCode || matchName || matchCat || matchVendor || matchSize || matchId;
      })
      .slice(0, 50);
  }, [products, query]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current && listRef.current.children[highlightedIndex]) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (prod: Product) => {
    onSelectProduct(prod);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProduct(null);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
        return;
      }
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={`flex items-center gap-1.5 bg-white border rounded px-2.5 py-1 text-xs transition cursor-text shadow-2xs ${
          isOpen ? 'border-emerald-600 ring-1 ring-emerald-500' : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />

        {selectedProd && !isOpen ? (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[11px] shrink-0">
                {selectedProd.code}
              </span>
              <span className="font-semibold text-slate-900 truncate text-[11px]">
                {selectedProd.name}
              </span>
              {selectedProd.isTile && selectedProd.w && selectedProd.h && (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded font-mono shrink-0">
                  {selectedProd.w}x{selectedProd.h}"
                </span>
              )}
              {selectedProd.grade && (
                <span
                  className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                    selectedProd.grade === 'A'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedProd.grade === 'B'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  Gr-{selectedProd.grade}
                </span>
              )}
              <span className="text-[10px] font-mono font-semibold text-blue-700 shrink-0 ml-1">
                [স্টক: {selectedProd.stockBox || 0} Box]
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                title="মুছুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedProd ? `${selectedProd.code} - ${selectedProd.name}` : placeholder}
            className="w-full bg-transparent border-none outline-none font-medium text-slate-900 placeholder:text-slate-400 text-xs"
          />
        )}

        {isOpen && query && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions List */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden max-h-72 flex flex-col text-xs animate-in fade-in duration-100">
          <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>কিবোর্ড দিয়ে পণ্য খুঁজুন (↑ ↓ তীর বোতাম ও Enter দিয়ে বাছুন)</span>
            <span className="font-mono text-emerald-800 font-bold">{filteredProducts.length} টি পণ্য</span>
          </div>

          <ul ref={listRef} className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {filteredProducts.map((p, idx) => {
              const isSelected = String(p.id) === String(selectedProductId);
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 cursor-pointer transition flex items-center justify-between gap-2 ${
                    isHighlighted
                      ? 'bg-emerald-50 text-emerald-950 font-medium'
                      : 'hover:bg-slate-50 text-slate-800'
                  } ${isSelected ? 'border-l-4 border-emerald-600 bg-emerald-50/70' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded shrink-0">
                      {p.code}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs truncate">{p.name}</span>
                        {p.vendor && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 rounded font-medium">
                            {p.vendor}
                          </span>
                        )}
                        {p.grade && (
                          <span
                            className={`text-[10px] font-bold px-1.5 rounded ${
                              p.grade === 'A'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.grade === 'B'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            Grade {p.grade}
                          </span>
                        )}
                        {p.isTile && p.w && p.h && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded font-mono">
                            ({p.w}x{p.h}")
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-3 mt-0.5">
                        <span>ক্যাটাগরি: {p.category || 'Tiles'}</span>
                        <span className="text-emerald-700 font-semibold font-mono">
                          দর: ৳{formatMoney(p.price || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Information Pills */}
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[11px] font-bold text-cyan-900 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded">
                      {p.stockBox || 0} Box | {p.stockPiece || 0} Pcs
                    </div>
                    {p.isTile && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {(p.stockSft || 0).toFixed(1)} SFT
                      </div>
                    )}
                  </div>
                </li>
              );
            })}

            {filteredProducts.length === 0 && (
              <li className="p-4 text-center text-slate-400">
                "{query}" নামে কোনো পণ্য পাওয়া যায়নি।
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
