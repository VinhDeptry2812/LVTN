import { useState, useMemo, useRef, useEffect } from 'react';
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
  const [sortBy, setSortBy] = useState<string>('price-low');

  const containerRef = useRef<HTMLDivElement>(null);

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

    // Price filter
    if (maxPrice !== null) {
      result = result.filter((p) => p.rawPrice <= maxPrice);
    }

    // Sorting logic
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.rawPrice - b.rawPrice);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.rawPrice - a.rawPrice);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1));
    } else {
      // popular
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [products, searchQuery, selectedCategories, maxPrice, sortBy]);

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
        <div className="relative w-full h-[400px] md:h-[550px] flex items-end pb-16 mt-20 mb-sp-xl">
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
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
          {/* Product Grid (100%) */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-sp-md">
              <div className="flex items-center space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none font-label-md text-label-md text-on-surface-variant focus:ring-0 cursor-pointer outline-none"
                >
                  <option value="price-low">Giá: Thấp đến Cao</option>
                  <option value="price-high">Giá: Cao đến Thấp</option>
                </select>
              </div>
            </div>

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
                      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white mb-4">
                        <img
                          className={`absolute inset-0 w-full h-full object-contain p-4 transition-opacity duration-500 ${hoverImg ? 'opacity-100 group-hover:opacity-0' : ''}`}
                          src={prod.image}
                          alt={prod.name}
                          loading="lazy"
                        />
                        {hoverImg && (
                          <img
                            className="absolute inset-0 w-full h-full object-contain p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            src={hoverImg}
                            alt={`${prod.name} alternate view`}
                            loading="lazy"
                          />
                        )}
                        {prod.isNew && (
                          <span className="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 rounded-full font-label-sm text-label-sm">
                            Mới
                          </span>
                        )}
                        {prod.badge && (
                          <span className="absolute top-4 left-4 bg-primary-fixed text-primary px-3 py-1 rounded-full font-label-sm text-label-sm">
                            {prod.badge}
                          </span>
                        )}
                        {prod.discount && (
                          <span className="absolute top-4 left-4 bg-error-container text-error px-3 py-1 rounded-full font-label-sm text-label-sm">
                            {prod.discount}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          aria-label={`Thêm ${prod.name} vào yêu thích`}
                          className="absolute top-4 right-4 w-11 h-11 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                        </button>
                      </div>
                      <h2 className="font-headline-md text-headline-md text-on-surface mb-1 line-clamp-1">{prod.name}</h2>

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
