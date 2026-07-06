import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Register GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

import { fetchProducts, type ProductFrontend, matchProduct } from '@/services/product.service';
import { getCategories, type Category } from '@/services/category.service';
import { heroBannerImage, productCardImage } from '@/utils/cloudinaryUrl';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected filters from search params / state
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // 'price' | 'sort' | null

  const containerRef = useRef<HTMLDivElement>(null);
  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      priceDropdownRef.current && !priceDropdownRef.current.contains(e.target as Node) &&
      sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)
    ) {
      setOpenDropdown(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProducts(), getCategories()])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data", err);
        setLoading(false);
      });
  }, []);

  // Sync category & search filters when URL changes
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');

    if (categoryParam) {
      setSelectedCategories([categoryParam]);
    } else {
      setSelectedCategories([]);
    }

    if (searchParam !== null) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery('');
    }
  }, [searchParams]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query filter
    if (searchQuery.trim() !== '') {
      result = result.filter((p) => matchProduct(p, searchQuery));
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const allowedSlugs = new Set<string>(selectedCategories);

      const processCategory = (cat: Category, addAll: boolean) => {
        const isSelected = addAll || selectedCategories.includes(cat.slug);
        if (isSelected) {
          allowedSlugs.add(cat.slug);
        }
        if (cat.children && cat.children.length > 0) {
          cat.children.forEach(child => processCategory(child, isSelected));
        }
      };

      categories.forEach(cat => processCategory(cat, false));

      result = result.filter((p) => allowedSlugs.has(p.category));
    }

    // Price range filter
    if (priceRange === 'under-5m') {
      result = result.filter((p) => p.rawPrice < 5_000_000);
    } else if (priceRange === '5m-10m') {
      result = result.filter((p) => p.rawPrice >= 5_000_000 && p.rawPrice <= 10_000_000);
    } else if (priceRange === '10m-20m') {
      result = result.filter((p) => p.rawPrice >= 10_000_000 && p.rawPrice <= 20_000_000);
    } else if (priceRange === 'over-20m') {
      result = result.filter((p) => p.rawPrice > 20_000_000);
    }
    // Legacy maxPrice filter (backward compat)
    if (maxPrice !== null) {
      result = result.filter((p) => p.rawPrice <= maxPrice);
    }

    // Sorting & filtering logic
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.rawPrice - b.rawPrice);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.rawPrice - a.rawPrice);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'popular') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'featured') {
      result = result.filter((p) => p.isFeatured || p.discount);
    } else if (sortBy === 'best-seller') {
      result = result.filter((p) => (p.soldCount || 0) > 0 || p.rating >= 4.5);
    } else if (sortBy === 'only-new') {
      result = result.filter((p) => p.isNew);
    }

    return result;
  }, [products, searchQuery, selectedCategories, maxPrice, priceRange, sortBy, categories]);

  // GSAP animation for product grid entries
  useGSAP(() => {
    gsap.fromTo('.shop-product-item',
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        overwrite: 'auto'
      }
    );
  }, { dependencies: [filteredProducts], scope: containerRef });

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const isSelected = prev.includes(category);
      let updated;
      if (isSelected) {
        updated = prev.filter((c) => c !== category);
      } else {
        updated = [...prev, category];
      }
      // Update URL search params
      if (updated.length === 1) {
        setSearchParams({ category: updated[0] });
      } else {
        searchParams.delete('category');
        setSearchParams(searchParams);
      }
      return updated;
    });
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

  const getImageUrl = (url?: string) => {
    if (!url) return "https://res.cloudinary.com/dblkv5veh/image/upload/v1782843908/imgi_175_armchair-may-moi-6_vebjno.jpg";
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl}${url}`;
  };

  const heroImage = getImageUrl(activeCategoryData?.image_url);
  const heroTitle = activeCategoryData ? activeCategoryData.name : "Tất cả sản phẩm";

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-hidden" ref={containerRef}>
      <Header />

      <main className="pb-sp-xl">
        {/* Shop Hero Banner */}
        <div className="relative w-full h-[250px] md:h-[350px] flex items-end pb-16 mt-20 mb-sp-xl">
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
            <nav className="flex items-center space-x-2 font-label-md text-label-md text-white drop-shadow-md">
              <Link className="hover:underline transition-all" to="/">
                Trang chủ
              </Link>
              <span className="opacity-70">/</span>
              <span className="font-bold">{heroTitle}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-container-max mx-auto px-sp-md md:px-lg w-full">
          {/* ═══ Modern Filter Bar ═══ */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-[0_2px_16px_rgba(0,0,0,0.04)] px-6 py-4 mb-sp-lg -mt-8 relative z-10">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter label */}
              <div className="flex items-center gap-1.5 text-on-surface-variant shrink-0">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-label-md text-[13px] font-semibold tracking-wide uppercase">Bộ lọc</span>
              </div>

              {/* Price Range Custom Dropdown */}
              <div className="relative" ref={priceDropdownRef}>
                <button
                  id="filter-price-range"
                  onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
                  className={`inline-flex items-center gap-2 border rounded-xl pl-3.5 pr-3 py-2 font-label-md text-[13px] cursor-pointer outline-none transition-all duration-200 ${
                    priceRange !== 'all'
                      ? 'bg-primary-fixed/30 border-primary/30 text-primary'
                      : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary/30 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-primary/70"></span>
                  <span>{priceRange === 'all' ? 'Khoảng giá' : [
                    { value: 'under-5m', label: 'Dưới 5 triệu' },
                    { value: '5m-10m', label: '5 – 10 triệu' },
                    { value: '10m-20m', label: '10 – 20 triệu' },
                    { value: 'over-20m', label: 'Trên 20 triệu' },
                  ].find(o => o.value === priceRange)?.label}</span>
                  <span className={`material-symbols-outlined text-[16px] text-on-surface-variant/50 transition-transform duration-200 ${openDropdown === 'price' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {openDropdown === 'price' && (
                  <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 animate-slide-down">
                    {[
                      { value: 'all', label: 'Tất cả khoảng giá' },
                      { value: 'under-5m', label: 'Dưới 5 triệu' },
                      { value: '5m-10m', label: '5 – 10 triệu' },
                      { value: '10m-20m', label: '10 – 20 triệu' },
                      { value: 'over-20m', label: 'Trên 20 triệu' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setPriceRange(option.value); setOpenDropdown(null); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left font-body-sm text-[13px] transition-colors duration-150 cursor-pointer ${
                          priceRange === option.value
                            ? 'bg-primary-fixed/20 text-primary font-semibold'
                            : 'text-on-surface hover:bg-surface-container-high/50'
                        }`}
                      >
                        {option.label}
                        {priceRange === option.value && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Custom Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  id="filter-sort"
                  onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                  className={`inline-flex items-center gap-2 border rounded-xl pl-3.5 pr-3 py-2 font-label-md text-[13px] cursor-pointer outline-none transition-all duration-200 ${
                    sortBy !== 'default'
                      ? 'bg-primary-fixed/30 border-primary/30 text-primary'
                      : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary/30 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-primary/70"></span>
                  <span>{sortBy === 'default' ? 'Sắp xếp theo' : [
                    { value: 'price-low', label: 'Giá: Thấp → Cao' },
                    { value: 'price-high', label: 'Giá: Cao → Thấp' },
                    { value: 'newest', label: 'Mới nhất' },
                    { value: 'popular', label: 'Phổ biến nhất' },
                    { value: 'featured', label: 'Nổi bật' },
                    { value: 'best-seller', label: 'Bán chạy' },
                    { value: 'only-new', label: 'Hàng mới về' },
                  ].find(o => o.value === sortBy)?.label}</span>
                  <span className={`material-symbols-outlined text-[16px] text-on-surface-variant/50 transition-transform duration-200 ${openDropdown === 'sort' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {openDropdown === 'sort' && (
                  <div className="absolute top-full left-0 mt-2 min-w-[220px] bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 animate-slide-down">
                    {/* Sorting options */}
                    {[
                      { value: 'default', label: 'Mặc định' },
                      { value: 'price-low', label: 'Giá: Thấp → Cao' },
                      { value: 'price-high', label: 'Giá: Cao → Thấp' },
                      { value: 'newest', label: 'Mới nhất' },
                      { value: 'popular', label: 'Phổ biến nhất' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setSortBy(option.value); setOpenDropdown(null); }}
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
                    {/* Separator */}
                    <div className="border-t border-outline-variant/20 my-1.5 mx-3"></div>
                    {/* Filter options */}
                    {[
                      { value: 'featured', label: 'Nổi bật', icon: 'auto_awesome' },
                      { value: 'best-seller', label: 'Bán chạy', icon: 'local_fire_department' },
                      { value: 'only-new', label: 'Hàng mới về', icon: 'schedule' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setSortBy(option.value); setOpenDropdown(null); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left font-body-sm text-[13px] transition-colors duration-150 cursor-pointer ${
                          sortBy === option.value
                            ? 'bg-primary-fixed/20 text-primary font-semibold'
                            : 'text-on-surface hover:bg-surface-container-high/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px]">{option.icon}</span>
                          {option.label}
                        </span>
                        {sortBy === option.value && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Clear filters */}
              {(priceRange !== 'all' || sortBy !== 'default') && (
                <button
                  onClick={() => {
                    setPriceRange('all');
                    setSortBy('default');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-label-md text-error bg-error-container/40 hover:bg-error-container/70 border border-error/10 transition-all duration-200 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Product Grid (100%) */}
          <div className="flex-1">

            {loading ? (
              <div className="py-20 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-4 animate-spin">sync</span>
                <p className="font-body-lg">Đang tải sản phẩm...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-4" aria-hidden="true">search_off</span>
                <p className="font-body-lg">Không tìm thấy sản phẩm phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
                {filteredProducts.map((prod) => {
                  const hoverImg = prod.hoverImage || prod.gallery?.find(img => img.url !== prod.image)?.url;
                  return (
                    <Link
                      key={prod.id}
                      to={`/product/${prod.id}`}
                      className="shop-product-item group block"
                    >
                      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/30 backdrop-blur-md border border-white/20 mb-1">
                        <img
                          className={`absolute inset-0 w-full h-full object-contain p-0 transition-opacity duration-500 mix-blend-multiply ${hoverImg ? 'opacity-100 group-hover:opacity-0' : ''}`}
                          src={productCardImage(prod.image)}
                          alt={prod.name}
                          loading="lazy"
                        />
                        {hoverImg && (
                          <img
                            className="absolute inset-0 w-full h-full object-contain p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-multiply"
                            src={productCardImage(hoverImg)}
                            alt={`${prod.name} alternate view`}
                            loading="lazy"
                          />
                        )}
                        {prod.isNew && (
                          <span className="absolute top-10 left-1 bg-primary text-on-primary px-3 py-1 rounded-full font-label-sm text-label-sm">
                            Mới
                          </span>
                        )}
                        {prod.badge && (
                          <span className="absolute top-10 left-1 bg-primary-fixed text-primary px-3 py-1 rounded-full font-label-sm text-label-sm">
                            {prod.badge}
                          </span>
                        )}
                        {prod.discount && (
                          <span className="absolute top-10 left-1 bg-error text-on-error px-3 py-1 rounded-full font-label-sm text-label-sm font-bold">
                            {prod.discount}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          aria-label={`Thêm ${prod.name} vào yêu thích`}
                          className="absolute top-10 right-1 w-11 h-11 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                        </button>
                      </div>
                      <h2 className="font-headline-md text-base md:text-lg font-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors duration-300">{prod.name}</h2>

                      <p className="font-label-md text-label-md text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {prod.price}
                        {prod.oldPrice && (
                          <span className="text-on-surface-variant line-through ml-2 font-normal">{prod.oldPrice}</span>
                        )}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
