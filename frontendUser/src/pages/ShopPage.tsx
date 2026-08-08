import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ProductFilterBar } from '@/components/ProductFilterBar';
import { useDragScroll } from '@/hooks/useDragScroll';

// Register GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

import { fetchProductsPaginated, fetchProducts, type ProductFrontend, matchProduct } from '@/services/product.service';
import { getCategories, type Category } from '@/services/category.service';
import { heroBannerImage, productCardImage } from '@/utils/cloudinaryUrl';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parentDrag = useDragScroll();
  const childDrag = useDragScroll();

  // Selected filters from search params / state
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [appliedCustomPrice, setAppliedCustomPrice] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [onlySale, setOnlySale] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('default');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const containerRef = useRef<HTMLDivElement>(null);

  const handleClearAll = () => {
    setPriceRange('all');
    setAppliedCustomPrice({ min: null, max: null });
    setOnlySale(false);
    setSortBy('default');
    setSelectedCategories([]);
    setSearchQuery('');
    setSearchParams({});
    setCurrentPage(1);
  };

  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Load danh mục sản phẩm ban đầu
  useEffect(() => {
    getCategories()
      .then((categoriesData) => setCategories(categoriesData))
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  // Sync category & search filters when URL changes
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');

    if (categoryParam) {
      const catList = categoryParam.split(',').map((s) => s.trim()).filter(Boolean);
      setSelectedCategories(catList);
    } else {
      setSelectedCategories([]);
    }

    if (searchParam !== null) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery('');
    }

    // Reset page when URL query changes
    setCurrentPage(1);
  }, [searchParams]);

  // Fetch paginated & filtered products from Server-side
  useEffect(() => {
    setLoading(true);
    let minP: number | undefined = undefined;
    let maxP: number | undefined = undefined;

    if (appliedCustomPrice.min !== null || appliedCustomPrice.max !== null) {
      minP = appliedCustomPrice.min ?? undefined;
      maxP = appliedCustomPrice.max ?? undefined;
    } else if (priceRange === 'under-5m') {
      maxP = 5_000_000;
    } else if (priceRange === '5m-10m') {
      minP = 5_000_000;
      maxP = 10_000_000;
    } else if (priceRange === '10m-20m') {
      minP = 10_000_000;
      maxP = 20_000_000;
    } else if (priceRange === 'over-20m') {
      minP = 20_000_000;
    }

    if (maxPrice !== null) {
      maxP = maxPrice;
    }

    const categoryParam = selectedCategories.length > 0 ? selectedCategories.join(',') : undefined;

    fetchProductsPaginated({
      page: currentPage,
      limit: itemsPerPage,
      search: searchQuery.trim() || undefined,
      category: categoryParam,
      minPrice: minP,
      maxPrice: maxP,
      onlySale: onlySale || undefined,
      sortBy: sortBy,
    })
      .then((res) => {
        setProducts(res.data);
        setTotalProducts(res.total);
        setTotalPages(res.totalPages);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load products from server", err);
        setLoading(false);
      });
  }, [currentPage, searchQuery, selectedCategories, priceRange, appliedCustomPrice, maxPrice, onlySale, sortBy]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: 250,
      behavior: 'smooth'
    });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }
    return pages;
  };


  const toggleCategory = (categorySlug: string) => {
    setCurrentPage(1);
    const isSelected = selectedCategories.includes(categorySlug);
    let updated: string[];

    if (!categorySlug) {
      updated = [];
    } else if (isSelected) {
      updated = selectedCategories.filter((c) => c !== categorySlug);
    } else {
      updated = [categorySlug];
    }

    setSelectedCategories(updated);

    const newParams = new URLSearchParams(searchParams);
    if (updated.length > 0) {
      newParams.set('category', updated.join(','));
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange('all');
    setAppliedCustomPrice({ min: null, max: null });
    setOnlySale(false);
    setSearchQuery('');
    setSortBy('default');
    setCurrentPage(1);
    setSearchParams(new URLSearchParams());
  };

  const allCategories: Category[] = [];
  const extractCategories = (cats: Category[]) => {
    cats.forEach(c => {
      allCategories.push(c);
      if (c.children && c.children.length > 0) {
        extractCategories(c.children);
      }
    });
  };
  extractCategories(categories);

  const activeCategoryData = selectedCategories.length > 0
    ? allCategories.find(c => c.slug === selectedCategories[0])
    : null;

  const activeParentCategory = categories.find((parentCat) => {
    if (selectedCategories.includes(parentCat.slug)) return true;
    if (parentCat.children && parentCat.children.some((child) => selectedCategories.includes(child.slug))) {
      return true;
    }
    return false;
  });

  const getImageUrl = (url?: string) => {
    if (!url) return "https://res.cloudinary.com/dblkv5veh/image/upload/v1782843908/imgi_175_armchair-may-moi-6_vebjno.jpg";
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl}${url}`;
  };

  const heroImage = getImageUrl(activeCategoryData?.image_url);
  const heroTitle = activeCategoryData ? activeCategoryData.name : "Tất cả sản phẩm";

  const activeFiltersCount =
    (selectedCategories.length > 0 ? 1 : 0) +
    (priceRange !== 'all' || appliedCustomPrice.min !== null || appliedCustomPrice.max !== null ? 1 : 0) +
    (onlySale ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0) +
    (sortBy !== 'default' ? 1 : 0);

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-hidden" ref={containerRef}>
      <Header />

      <main className="pb-sp-xl">
        {/* Shop Hero Banner */}
        <div className="relative w-full h-[250px] md:h-[350px] flex items-end pb-16 mb-sp-xl">
          <div className="absolute inset-0 z-0">
            <img
              src={heroBannerImage(heroImage)}
              alt="Shop Banner"
              className="w-full h-full object-cover"
            />
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-container-max mx-auto px-sp-md md:px-lg text-white">
            <h1 className="font-headline-xl text-[40px] md:text-[56px] font-bold mb-2 text-white drop-shadow-md">{heroTitle}</h1>
            <Breadcrumbs items={[{ label: heroTitle }]} className="drop-shadow-md text-white font-label-md" />
          </div>
        </div>

        <div className="max-w-container-max mx-auto px-sp-md md:px-lg w-full">
          {/* ═══ 1. Hierarchical Category Pills (2 Tầng - Hỗ trợ Kéo thả chuột Desktop) ═══ */}
          {categories.length > 0 && (
            <div className="bg-surface/90 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-3 mb-4 -mt-12 relative z-20 space-y-2 select-none">
              {/* Tầng 1: Các danh mục Cha */}
              <div className="relative group/parent">
                {parentDrag.canScrollLeft && (
                  <button
                    onClick={() => parentDrag.scrollBy(-220)}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-surface-container-highest/90 border border-outline-variant/40 shadow-md flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-all cursor-pointer"
                    aria-label="Cuộn sang trái"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                )}

                <div
                  ref={parentDrag.ref}
                  {...parentDrag.events}
                  className={`flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none active:cursor-grabbing ${
                    parentDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (parentDrag.isDragging) return;
                      setSelectedCategories([]);
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('category');
                      setSearchParams(newParams);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-label-md whitespace-nowrap transition-all duration-200 cursor-pointer border shrink-0 ${
                      selectedCategories.length === 0
                        ? 'bg-primary text-on-primary border-primary shadow-sm font-semibold'
                        : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary/50 hover:bg-surface-container'
                    }`}
                  >
                    Tất cả sản phẩm
                  </button>

                  {categories.map((parentCat) => {
                    const isParentSelected = selectedCategories.includes(parentCat.slug);
                    const hasChildSelected = parentCat.children?.some((child) => selectedCategories.includes(child.slug));
                    const isActive = isParentSelected || hasChildSelected;

                    return (
                      <button
                        key={parentCat.id}
                        onClick={() => {
                          if (parentDrag.isDragging) return;
                          toggleCategory(parentCat.slug);
                        }}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-label-md whitespace-nowrap transition-all duration-200 cursor-pointer border flex items-center gap-1 shrink-0 ${
                          isActive
                            ? 'bg-primary text-on-primary border-primary shadow-sm font-semibold'
                            : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary/50 hover:bg-surface-container'
                        }`}
                      >
                        <span>{parentCat.name}</span>
                        {parentCat.children && parentCat.children.length > 0 && (
                          <span className={`material-symbols-outlined text-[15px] ${isActive ? 'text-on-primary/80' : 'text-on-surface-variant/50'}`}>
                            keyboard_arrow_down
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {parentDrag.canScrollRight && (
                  <button
                    onClick={() => parentDrag.scrollBy(220)}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-surface-container-highest/90 border border-outline-variant/40 shadow-md flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-all cursor-pointer"
                    aria-label="Cuộn sang phải"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                )}
              </div>

              {/* Tầng 2: Các danh mục Con trực thuộc danh mục Cha đang chọn */}
              {activeParentCategory && activeParentCategory.children && activeParentCategory.children.length > 0 && (
                <div className="relative group/child pt-2 border-t border-outline-variant/20">
                  {childDrag.canScrollLeft && (
                    <button
                      onClick={() => childDrag.scrollBy(-200)}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-surface-container-highest/90 border border-outline-variant/40 shadow-md flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-all cursor-pointer"
                      aria-label="Cuộn danh mục con sang trái"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                    </button>
                  )}

                  <div
                    ref={childDrag.ref}
                    {...childDrag.events}
                    className={`flex items-center gap-2 overflow-x-auto no-scrollbar animate-slide-down select-none active:cursor-grabbing ${
                      childDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                  >
                    <span className="text-[12px] font-label-md text-on-surface-variant/70 shrink-0 font-semibold pl-1">
                      {activeParentCategory.name}:
                    </span>

                    <button
                      onClick={() => {
                        if (childDrag.isDragging) return;
                        toggleCategory(activeParentCategory.slug);
                      }}
                      className={`px-3 py-1 rounded-full text-[12px] font-label-md whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                        selectedCategories.includes(activeParentCategory.slug)
                          ? 'bg-primary-fixed text-primary border-primary/30 font-semibold'
                          : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Tất cả {activeParentCategory.name}
                    </button>

                    {activeParentCategory.children.map((childCat) => {
                      const isChildSelected = selectedCategories.includes(childCat.slug);
                      return (
                        <button
                          key={childCat.id}
                          onClick={() => {
                            if (childDrag.isDragging) return;
                            toggleCategory(childCat.slug);
                          }}
                          className={`px-3 py-1 rounded-full text-[12px] font-label-md whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                            isChildSelected
                              ? 'bg-primary-fixed text-primary border-primary/30 font-semibold shadow-xs'
                              : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {childCat.name}
                        </button>
                      );
                    })}
                  </div>

                  {childDrag.canScrollRight && (
                    <button
                      onClick={() => childDrag.scrollBy(200)}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-surface-container-highest/90 border border-outline-variant/40 shadow-md flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-all cursor-pointer"
                      aria-label="Cuộn danh mục con sang phải"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ Reusable Product Filter Bar ═══ */}
          <ProductFilterBar
            searchQuery={searchQuery}
            setSearchQuery={(q) => {
              setSearchQuery(q);
              const newParams = new URLSearchParams(searchParams);
              if (q) newParams.set('search', q);
              else newParams.delete('search');
              setSearchParams(newParams);
            }}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            appliedCustomPrice={appliedCustomPrice}
            setAppliedCustomPrice={setAppliedCustomPrice}
            onlySale={onlySale}
            setOnlySale={setOnlySale}
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedCategories={selectedCategories}
            onClearAll={handleClearAll}
            setCurrentPage={setCurrentPage}
          />

          {/* ═══ Results Count Indicator ═══ */}
          <div className="flex items-center justify-between gap-4 flex-wrap mb-sp-md px-1">
            <div className="text-[13px] font-body-sm text-on-surface-variant font-medium">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-on-surface-variant/70">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  Đang cập nhật danh sách...
                </span>
              ) : totalProducts > 0 ? (
                <span>
                  Hiển thị <strong className="text-on-surface font-semibold">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalProducts)}</strong> trong số <strong className="text-primary font-semibold">{totalProducts}</strong> sản phẩm
                </span>
              ) : (
                <span className="text-error font-medium">Không tìm thấy sản phẩm nào</span>
              )}
            </div>
          </div>



          {/* Product Grid (Responsive: 2 cột trên Mobile, 3-4 cột trên Desktop) */}
          <div className="flex-1 min-h-[480px]">
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-gutter">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/20 animate-pulse flex flex-col justify-between min-h-[350px]">
                    <div>
                      <div className="w-full aspect-[4/5] bg-surface-container-high/60 rounded-xl mb-3"></div>
                      <div className="h-4 bg-surface-container-high/80 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-surface-container-high/50 rounded w-1/2 mb-3"></div>
                    </div>
                    <div className="h-5 bg-surface-container-high/70 rounded w-1/3 mt-auto"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-4" aria-hidden="true">search_off</span>
                <p className="font-body-lg">Không tìm thấy sản phẩm phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <div className={`transition-opacity duration-300 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-gutter">
                  {products.map((prod) => (
                    <div key={prod.id} className="shop-product-item">
                      <ProductCard product={prod} />
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12 pb-6">
                    <button
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 cursor-pointer ${currentPage === 1
                        ? 'border-outline-variant/20 text-on-surface-variant/30 cursor-not-allowed bg-surface-container-low'
                        : 'border-outline-variant/40 text-on-surface hover:border-primary/50 hover:bg-surface-container hover:text-primary'
                        }`}
                      aria-label="Trang trước"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>

                    {getPageNumbers().map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="w-10 h-10 flex items-center justify-center text-on-surface-variant/60 font-body-md">
                            ...
                          </span>
                        );
                      }

                      const pageNum = page as number;
                      const isActive = pageNum === currentPage;

                      return (
                        <button
                          key={`page-${pageNum}`}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 rounded-xl font-label-md text-[14px] font-semibold transition-all duration-200 cursor-pointer ${isActive
                            ? 'bg-primary text-on-primary shadow-[0_4px_12px_rgba(var(--color-primary-rgb),0.2)]'
                            : 'border border-outline-variant/40 text-on-surface hover:border-primary/50 hover:bg-surface-container hover:text-primary'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 cursor-pointer ${currentPage === totalPages
                        ? 'border-outline-variant/20 text-on-surface-variant/30 cursor-not-allowed bg-surface-container-low'
                        : 'border-outline-variant/40 text-on-surface hover:border-primary/50 hover:bg-surface-container hover:text-primary'
                        }`}
                      aria-label="Trang sau"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>



      <Footer />
    </div>
  );
}
