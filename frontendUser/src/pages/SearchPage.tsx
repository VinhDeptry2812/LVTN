import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ProductFilterBar } from '@/components/ProductFilterBar';
import { fetchProducts, type ProductFrontend } from '@/services/product.service';

// Đăng ký các plugin GSAP
gsap.registerPlugin(useGSAP, ScrollTrigger);

const ITEMS_PER_PAGE = 16; // Số sản phẩm hiển thị trên mỗi trang

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [appliedCustomPrice, setAppliedCustomPrice] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [onlySale, setOnlySale] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('default');

  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Đồng bộ searchQuery khi URL query param (q) thay đổi từ bên ngoài (ví dụ: thanh tìm kiếm Header)
  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (appliedCustomPrice.min !== null || appliedCustomPrice.max !== null) {
      return {
        minPrice: appliedCustomPrice.min ?? undefined,
        maxPrice: appliedCustomPrice.max ?? undefined,
      };
    }
    if (priceRange === 'under-5m') return { minPrice: undefined, maxPrice: 5_000_000 };
    if (priceRange === '5m-10m') return { minPrice: 5_000_000, maxPrice: 10_000_000 };
    if (priceRange === '10m-20m') return { minPrice: 10_000_000, maxPrice: 20_000_000 };
    if (priceRange === 'over-20m') return { minPrice: 20_000_000, maxPrice: undefined };
    return { minPrice: undefined, maxPrice: undefined };
  }, [priceRange, appliedCustomPrice]);

  // Lấy dữ liệu sản phẩm từ backend dựa trên searchQuery, sortBy và bộ lọc
  useEffect(() => {
    setLoading(true);
    fetchProducts({
      search: searchQuery,
      sortBy,
      minPrice,
      maxPrice,
      onlySale: onlySale ? true : undefined,
    })
      .then((productsData) => {
        setProducts(productsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load products for search", err);
        setLoading(false);
      });
  }, [searchQuery, sortBy, minPrice, maxPrice, onlySale]);

  // Reset về trang 1 khi từ khóa hoặc bộ lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, priceRange, appliedCustomPrice, onlySale]);

  const filteredProducts = products;

  const handleClearAll = () => {
    setPriceRange('all');
    setAppliedCustomPrice({ min: null, max: null });
    setOnlySale(false);
    setSortBy('default');
    setSearchQuery('');
    setSearchParams({});
    setCurrentPage(1);
  };

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // GSAP animation cho các card sản phẩm
  useGSAP(() => {
    gsap.fromTo('.search-product-item',
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
  }, { dependencies: [paginatedProducts], scope: containerRef });

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-clip" ref={containerRef}>
      <Header />

      <main className="pt-6 md:pt-8 pb-sp-xl">
        <div className="max-w-container-max mx-auto px-sp-md md:px-lg w-full">
          {/* Breadcrumb và Tiêu đề kết quả */}
          <div className="mb-sp-md">
            <Breadcrumbs items={[{ label: 'Tìm kiếm' }]} className="mb-2" />
            <h1 className="font-headline-lg text-xl sm:text-2xl md:text-3xl font-bold text-on-surface">
              {query.trim() ? `Kết quả tìm kiếm cho: "${query}"` : 'Tất cả sản phẩm tìm kiếm'}
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
              Tìm thấy <span className="font-bold text-primary">{filteredProducts.length}</span> sản phẩm phù hợp.
            </p>
          </div>

          {/* Thanh bộ lọc sản phẩm dùng chung */}
          <ProductFilterBar
            searchQuery={searchQuery}
            setSearchQuery={(q) => {
              setSearchQuery(q);
              const newParams = new URLSearchParams(searchParams);
              if (q) newParams.set('q', q);
              else newParams.delete('q');
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
            onClearAll={handleClearAll}
            setCurrentPage={setCurrentPage}
          />

          {loading ? (
            <div className="py-20 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-4 animate-spin text-primary">sync</span>
              <p className="font-body-lg text-sm">Đang tải sản phẩm...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/40 p-6">
              <span className="material-symbols-outlined text-5xl mb-3 text-on-surface-variant/40" aria-hidden="true">search_off</span>
              <h3 className="font-headline-md text-base font-bold text-on-surface mb-2">Không tìm thấy sản phẩm nào</h3>
              <p className="font-body-md text-xs text-on-surface-variant max-w-md mx-auto mb-6">
                Rất tiếc, chúng tôi không tìm thấy kết quả phù hợp cho từ khóa của bạn. Vui lòng thử lại với từ khóa khác hoặc quay lại cửa hàng.
              </p>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <>
              {/* Product Grid (Responsive: 2 cột trên Mobile, 3-4 cột trên Desktop) */}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-gutter">
                {paginatedProducts.map((prod) => (
                  <div key={prod.id} className="search-product-item">
                    <ProductCard product={prod} />
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-sp-xl">
                  {/* Prev Button */}
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }
                    }}
                    disabled={currentPage === 1}
                    className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-outline-variant/30 disabled:hover:text-on-surface-variant transition-all cursor-pointer"
                    aria-label="Trang trước"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className={`w-10 h-10 rounded-full font-label-md text-sm transition-all cursor-pointer flex items-center justify-center ${currentPage === page
                          ? 'bg-primary text-on-primary shadow-md font-bold'
                          : 'border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary'
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }
                    }}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-outline-variant/30 disabled:hover:text-on-surface-variant transition-all cursor-pointer"
                    aria-label="Trang sau"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
