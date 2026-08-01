import React, { useState, useRef, useEffect } from 'react';

export interface AppliedCustomPrice {
  min: number | null;
  max: number | null;
}

export interface ProductFilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
  appliedCustomPrice: AppliedCustomPrice;
  setAppliedCustomPrice: (price: AppliedCustomPrice) => void;
  onlySale: boolean;
  setOnlySale: (sale: boolean) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedCategories?: string[];
  setSelectedCategories?: (cats: string[]) => void;
  onClearAll: () => void;
  setCurrentPage?: (page: number) => void;
  placeholderSearch?: string;
}

export const ProductFilterBar: React.FC<ProductFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  priceRange,
  setPriceRange,
  appliedCustomPrice,
  setAppliedCustomPrice,
  onlySale,
  setOnlySale,
  sortBy,
  setSortBy,
  selectedCategories = [],
  setSelectedCategories,
  onClearAll,
  setCurrentPage,
  placeholderSearch = 'Tìm sản phẩm...'
}) => {
  const [openDropdown, setOpenDropdown] = useState<'price' | 'sort' | null>(null);
  const [customMinInput, setCustomMinInput] = useState<string>('');
  const [customMaxInput, setCustomMaxInput] = useState<string>('');

  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize custom price inputs when appliedCustomPrice changes
  useEffect(() => {
    setCustomMinInput(appliedCustomPrice.min !== null ? String(appliedCustomPrice.min) : '');
    setCustomMaxInput(appliedCustomPrice.max !== null ? String(appliedCustomPrice.max) : '');
  }, [appliedCustomPrice]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        priceDropdownRef.current &&
        !priceDropdownRef.current.contains(event.target as Node) &&
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters =
    priceRange !== 'all' ||
    appliedCustomPrice.min !== null ||
    appliedCustomPrice.max !== null ||
    onlySale ||
    sortBy !== 'default' ||
    selectedCategories.length > 0 ||
    searchQuery !== '';

  const handleReset = () => {
    onClearAll();
    setCustomMinInput('');
    setCustomMaxInput('');
    setOpenDropdown(null);
  };

  return (
    <div className="w-full mb-sp-md">
      {/* Main Filter Bar */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 md:px-6 md:py-4 relative z-10">
        {/* Mobile Header Row: Tiêu đề + Nút Xóa bộ lọc */}
        <div className="flex items-center justify-between mb-3 md:hidden border-b border-outline-variant/20 pb-2.5">
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
            <span className="font-label-md text-[13px] font-bold tracking-wide uppercase text-on-surface">
              Bộ lọc sản phẩm
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-label-md text-error bg-error-container/40 hover:bg-error-container/70 border border-error/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-3">
          {/* Desktop Filter label */}
          <div className="hidden md:flex items-center gap-1.5 text-on-surface-variant shrink-0 mr-1">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span className="font-label-md text-[13px] font-semibold tracking-wide uppercase">Bộ lọc</span>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full md:w-auto md:flex-1 md:min-w-[180px] md:max-w-[260px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/60 pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder={placeholderSearch}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (setCurrentPage) setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-[13px] bg-surface border border-outline-variant/40 rounded-xl outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (setCurrentPage) setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface flex items-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Filter Buttons Controls: Grid 2-col on Mobile, Flex inline on Desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center gap-2 w-full md:w-auto">
            {/* Price Range Custom Dropdown */}
            <div className="relative w-full md:w-auto" ref={priceDropdownRef}>
              <button
                id="filter-price-range"
                onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
                className={`w-full md:w-auto inline-flex items-center justify-between md:justify-start gap-2 border rounded-xl px-3 py-2 font-label-md text-[12px] sm:text-[13px] cursor-pointer outline-none transition-all duration-200 ${
                  priceRange !== 'all' || appliedCustomPrice.min !== null || appliedCustomPrice.max !== null
                    ? 'bg-primary-fixed/30 border-primary/30 text-primary font-medium'
                    : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary/30 hover:bg-surface-container'
                }`}
              >
                <span className="truncate">
                  {appliedCustomPrice.min !== null || appliedCustomPrice.max !== null
                    ? `Giá: ${appliedCustomPrice.min ? appliedCustomPrice.min / 1_000_000 + 'tr' : '0'} – ${
                        appliedCustomPrice.max ? appliedCustomPrice.max / 1_000_000 + 'tr' : '∞'
                      }`
                    : priceRange === 'all'
                    ? 'Khoảng giá'
                    : [
                        { value: 'under-5m', label: 'Dưới 5 triệu' },
                        { value: '5m-10m', label: '5 – 10 triệu' },
                        { value: '10m-20m', label: '10 – 20 triệu' },
                        { value: 'over-20m', label: 'Trên 20 triệu' },
                      ].find((o) => o.value === priceRange)?.label}
                </span>
                <span
                  className={`material-symbols-outlined text-[16px] text-on-surface-variant/50 shrink-0 transition-transform duration-200 ${
                    openDropdown === 'price' ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {openDropdown === 'price' && (
                <div className="absolute top-full left-0 mt-2 w-[280px] max-w-[calc(100vw-32px)] bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 z-50 animate-slide-down">
                  <p className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-2 px-1 font-bold">
                    Mức giá cố định
                  </p>
                  <div className="space-y-1 mb-3">
                    {[
                      { value: 'all', label: 'Tất cả khoảng giá' },
                      { value: 'under-5m', label: 'Dưới 5 triệu' },
                      { value: '5m-10m', label: '5 – 10 triệu' },
                      { value: '10m-20m', label: '10 – 20 triệu' },
                      { value: 'over-20m', label: 'Trên 20 triệu' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPriceRange(option.value);
                          setAppliedCustomPrice({ min: null, max: null });
                          setOpenDropdown(null);
                          if (setCurrentPage) setCurrentPage(1);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left font-body-sm text-[13px] transition-colors duration-150 cursor-pointer ${
                          priceRange === option.value && appliedCustomPrice.min === null && appliedCustomPrice.max === null
                            ? 'bg-primary-fixed/20 text-primary font-semibold'
                            : 'text-on-surface hover:bg-surface-container-high/50'
                        }`}
                      >
                        {option.label}
                        {priceRange === option.value && appliedCustomPrice.min === null && appliedCustomPrice.max === null && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-outline-variant/20 pt-3">
                    <p className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-2 px-1 font-bold">
                      Hoặc nhập khoảng giá (VNĐ)
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        placeholder="Từ"
                        value={customMinInput}
                        onChange={(e) => setCustomMinInput(e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 text-[12px] bg-surface border border-outline-variant/40 rounded-lg outline-none focus:border-primary"
                      />
                      <span className="text-on-surface-variant text-[12px]">–</span>
                      <input
                        type="number"
                        placeholder="Đến"
                        value={customMaxInput}
                        onChange={(e) => setCustomMaxInput(e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 text-[12px] bg-surface border border-outline-variant/40 rounded-lg outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const min = customMinInput ? Number(customMinInput) : null;
                        const max = customMaxInput ? Number(customMaxInput) : null;
                        setAppliedCustomPrice({ min, max });
                        setPriceRange('custom');
                        setOpenDropdown(null);
                        if (setCurrentPage) setCurrentPage(1);
                      }}
                      className="w-full py-1.5 bg-primary text-on-primary rounded-lg text-[12px] font-label-md font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Áp dụng khoảng giá
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Custom Dropdown */}
            <div className="relative w-full md:w-auto" ref={sortDropdownRef}>
              <button
                id="filter-sort"
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className={`w-full md:w-auto inline-flex items-center justify-between md:justify-start gap-2 border rounded-xl px-3 py-2 font-label-md text-[12px] sm:text-[13px] cursor-pointer outline-none transition-all duration-200 ${
                  sortBy !== 'default'
                    ? 'bg-primary-fixed/30 border-primary/30 text-primary font-medium'
                    : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary/30 hover:bg-surface-container'
                }`}
              >
                <span className="truncate">
                  {sortBy === 'default'
                    ? 'Sắp xếp theo'
                    : [
                        { value: 'price-low', label: 'Giá: Thấp → Cao' },
                        { value: 'price-high', label: 'Giá: Cao → Thấp' },
                        { value: 'newest', label: 'Mới nhất' },
                        { value: 'popular', label: 'Phổ biến nhất' },
                      ].find((o) => o.value === sortBy)?.label}
                </span>
                <span
                  className={`material-symbols-outlined text-[16px] text-on-surface-variant/50 shrink-0 transition-transform duration-200 ${
                    openDropdown === 'sort' ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {openDropdown === 'sort' && (
                <div className="absolute top-full right-0 md:left-0 mt-2 min-w-[200px] w-full md:w-auto max-w-[calc(100vw-32px)] bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 animate-slide-down">
                  {[
                    { value: 'default', label: 'Mặc định' },
                    { value: 'price-low', label: 'Giá: Thấp → Cao' },
                    { value: 'price-high', label: 'Giá: Cao → Thấp' },
                    { value: 'newest', label: 'Mới nhất' },
                    { value: 'popular', label: 'Phổ biến nhất' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setOpenDropdown(null);
                        if (setCurrentPage) setCurrentPage(1);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left font-body-sm text-[13px] transition-colors duration-150 cursor-pointer ${
                        sortBy === option.value
                          ? 'bg-primary-fixed/20 text-primary font-semibold'
                          : 'text-on-surface hover:bg-surface-container-high/50'
                      }`}
                    >
                      {option.label}
                      {sortBy === option.value && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Sale Toggle Filter */}
            <button
              onClick={() => {
                setOnlySale(!onlySale);
                if (setCurrentPage) setCurrentPage(1);
              }}
              className={`col-span-2 sm:col-span-1 w-full md:w-auto inline-flex items-center justify-center gap-1.5 border rounded-xl px-3.5 py-2 font-label-md text-[12px] sm:text-[13px] cursor-pointer outline-none transition-all duration-200 ${
                onlySale
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 font-semibold'
                  : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary/30 hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">local_offer</span>
              <span>Khuyến mãi</span>
            </button>
          </div>

          {/* Spacer on Desktop */}
          <div className="hidden md:block md:flex-1"></div>

          {/* Clear all filters on Desktop */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-label-md text-error bg-error-container/40 hover:bg-error-container/70 border border-error/10 transition-all duration-200 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap pt-2 px-1">
          <span className="text-[12px] font-label-md text-on-surface-variant/70">Đang lọc:</span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-label-md bg-primary-fixed/20 text-primary border border-primary/20">
              Từ khóa: "{searchQuery}"
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (setCurrentPage) setCurrentPage(1);
                }}
                className="hover:text-primary/70 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}

          {onlySale && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-label-md bg-amber-500/10 text-amber-700 border border-amber-500/20">
              Đang giảm giá
              <button
                onClick={() => {
                  setOnlySale(false);
                  if (setCurrentPage) setCurrentPage(1);
                }}
                className="hover:text-amber-900 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}

          {(priceRange !== 'all' || appliedCustomPrice.min !== null || appliedCustomPrice.max !== null) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-label-md bg-primary-fixed/20 text-primary border border-primary/20">
              {appliedCustomPrice.min !== null || appliedCustomPrice.max !== null
                ? `Giá: ${appliedCustomPrice.min ? appliedCustomPrice.min / 1_000_000 + 'tr' : '0'} – ${
                    appliedCustomPrice.max ? appliedCustomPrice.max / 1_000_000 + 'tr' : '∞'
                  }`
                : [
                    { value: 'under-5m', label: '< 5 triệu' },
                    { value: '5m-10m', label: '5 – 10 triệu' },
                    { value: '10m-20m', label: '10 – 20 triệu' },
                    { value: 'over-20m', label: '> 20 triệu' },
                  ].find((o) => o.value === priceRange)?.label}
              <button
                onClick={() => {
                  setPriceRange('all');
                  setAppliedCustomPrice({ min: null, max: null });
                  setCustomMinInput('');
                  setCustomMaxInput('');
                  if (setCurrentPage) setCurrentPage(1);
                }}
                className="hover:text-primary/70 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
