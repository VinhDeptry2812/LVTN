import React from 'react';
import { Link } from 'react-router-dom';
import type { ProductFrontend } from '@/services/product.service';
import { productCardImage } from '@/utils/cloudinaryUrl';

interface DesktopSearchBarProps {
  desktopSearchContainerRef: React.RefObject<HTMLDivElement | null>;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchSuggestions: ProductFrontend[];
  totalMatchedCount: number;
  isSearching: boolean;
  handleSearchSubmit: (e: React.FormEvent) => void;
}

export const DesktopSearchBar: React.FC<DesktopSearchBarProps> = ({
  desktopSearchContainerRef,
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  searchSuggestions,
  totalMatchedCount,
  isSearching,
  handleSearchSubmit,
}) => {
  return (
    <div className="hidden md:block relative" ref={desktopSearchContainerRef}>
      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        aria-label="Tìm kiếm sản phẩm"
        aria-expanded={isSearchOpen}
        className={`p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center cursor-pointer ${
          isSearchOpen ? 'bg-surface-container-low text-primary' : ''
        }`}
      >
        <span
          className={`material-symbols-outlined block ${
            isSearchOpen ? 'text-primary' : 'text-on-surface-variant'
          }`}
          aria-hidden="true"
        >
          search
        </span>
      </button>

      {/* Expandable Search Input Dropdown */}
      {isSearchOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-4 rounded-sm z-30 animate-slide-down before:content-[''] before:absolute before:-top-2 before:right-4 before:border-8 before:border-transparent before:border-b-white">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-neutral-100/80 focus-within:bg-white border border-neutral-200/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 rounded-full pl-3 pr-2.5 py-1.5 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-neutral-400 text-[18px] mr-1.5 select-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              autoFocus
              className="flex-1 bg-transparent border-none focus:outline-none py-0.5 text-xs text-on-surface placeholder:text-neutral-400 font-body-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-neutral-400 hover:text-on-surface transition-colors cursor-pointer"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <span className="material-symbols-outlined text-[16px] block">close</span>
              </button>
            )}
          </form>

          {/* Search Results in Dropdown */}
          {searchQuery.trim() && (
            <div className="mt-3 divide-y divide-outline-variant/10 max-h-[250px] overflow-y-auto">
              {isSearching ? (
                <div className="py-4 text-center text-on-surface-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-xl mb-1 text-primary animate-spin">
                    progress_activity
                  </span>
                  <p className="font-body-sm text-[10px]">Đang tìm kiếm...</p>
                </div>
              ) : searchSuggestions.length > 0 ? (
                <>
                  {searchSuggestions.map((prod) => (
                    <Link
                      key={prod.id}
                      to={`/product/${prod.id}`}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-container-low/20 group transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-label-md text-on-surface group-hover:text-primary transition-colors text-[11px] font-semibold uppercase truncate">
                          {prod.name}
                        </h4>
                        <div className="font-label-sm text-[10px] flex items-center gap-1.5 mt-0.5">
                          <span className="text-[#333333] font-bold">{prod.price}</span>
                          {prod.oldPrice && (
                            <span className="text-on-surface-variant line-through text-[9px] font-normal">
                              {prod.oldPrice}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-white rounded border border-outline-variant/20 flex-shrink-0 flex items-center justify-center p-0.5 overflow-hidden">
                        <img
                          src={productCardImage(prod.image)}
                          alt={prod.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </Link>
                  ))}
                  <button
                    onClick={handleSearchSubmit}
                    className="bg-[#f5f5f5] hover:bg-[#eaeaea] py-2 text-center text-[10px] text-[#333] font-semibold transition-colors border-t border-outline-variant/20 cursor-pointer w-full mt-2"
                  >
                    Xem thêm {totalMatchedCount} sản phẩm
                  </button>
                </>
              ) : (
                <div className="py-4 text-center text-on-surface-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-xl mb-1 text-outline/60">
                    search_off
                  </span>
                  <p className="font-body-sm text-[10px]">Không tìm thấy sản phẩm</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MobileSearchBarProps {
  mobileSearchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchSuggestions: ProductFrontend[];
  totalMatchedCount: number;
  handleSearchSubmit: (e: React.FormEvent) => void;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  mobileSearchInputRef,
  searchQuery,
  setSearchQuery,
  searchSuggestions,
  totalMatchedCount,
  handleSearchSubmit,
}) => {
  return (
    <div className="block md:hidden bg-surface border-t border-b border-outline-variant/20 px-sp-md py-2.5 relative z-20">
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center bg-neutral-100/80 hover:bg-neutral-200/40 focus-within:bg-white border border-neutral-200/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 rounded-full transition-all duration-300 pl-3.5 pr-2.5 py-1.5"
      >
        <span className="material-symbols-outlined text-neutral-400 text-[18px] mr-1.5 select-none">
          search
        </span>
        <input
          ref={mobileSearchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm sản phẩm..."
          className="flex-1 bg-transparent border-none focus:outline-none py-0.5 text-xs text-on-surface placeholder:text-neutral-400 font-body-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="p-1 text-neutral-400 hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Xóa nội dung tìm kiếm"
          >
            <span className="material-symbols-outlined text-[16px] block">close</span>
          </button>
        )}
      </form>

      {/* Suggestions Dropdown for Mobile - takes full width below search input */}
      {searchQuery.trim() && (
        <div className="absolute top-[100%] left-0 right-0 bg-surface border-t border-outline-variant/20 shadow-2xl overflow-y-auto max-h-[70vh] flex flex-col z-30 divide-y divide-outline-variant/10 animate-slide-down">
          {searchSuggestions.length > 0 ? (
            <>
              {searchSuggestions.map((prod) => (
                <Link
                  key={prod.id}
                  to={`/product/${prod.id}`}
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low/50 group transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-label-md text-on-surface group-hover:text-primary transition-colors text-xs font-semibold uppercase truncate mb-1">
                      {prod.name}
                    </h4>
                    <div className="font-label-sm text-xs flex items-center gap-2">
                      <span className="text-[#333333] font-bold">{prod.price}</span>
                      {prod.oldPrice && (
                        <span className="text-on-surface-variant line-through text-[11px] font-normal">
                          {prod.oldPrice}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-white rounded border border-outline-variant/20 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                    <img
                      src={productCardImage(prod.image)}
                      alt={prod.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </Link>
              ))}

              {/* View more count */}
              <button
                onClick={handleSearchSubmit}
                className="bg-[#f5f5f5] hover:bg-[#eaeaea] py-3 text-center text-xs text-[#333] font-semibold transition-colors border-t border-outline-variant/20 cursor-pointer w-full"
              >
                Xem thêm {totalMatchedCount} sản phẩm
              </button>
            </>
          ) : (
            <div className="py-10 text-center text-on-surface-variant flex flex-col items-center">
              <span className="material-symbols-outlined text-3xl mb-2 text-outline/60">
                search_off
              </span>
              <p className="font-body-sm text-xs">Không tìm thấy sản phẩm nào phù hợp</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
