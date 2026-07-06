import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchProducts, type ProductFrontend, matchProduct } from '@/services/product.service';
import { productCardImage } from '@/utils/cloudinaryUrl';

// Đăng ký các plugin GSAP
gsap.registerPlugin(useGSAP, ScrollTrigger);

const ITEMS_PER_PAGE = 16; // Số sản phẩm hiển thị trên mỗi trang

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('price-low');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Lấy dữ liệu sản phẩm từ backend
  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then((productsData) => {
        setProducts(productsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load products for search", err);
        setLoading(false);
      });
  }, []);

  // Reset về trang 1 khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // Lọc và sắp xếp sản phẩm khớp từ khóa
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (query.trim() !== '') {
      result = result.filter((p) => matchProduct(p, query));
    }

    // Sắp xếp theo lựa chọn
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.rawPrice - b.rawPrice);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.rawPrice - a.rawPrice);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1));
    } else {
      // Phổ biến nhất
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [products, query, sortBy]);

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
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-hidden" ref={containerRef}>
      <Header />

      <main className="pt-32 pb-sp-xl">
        <div className="max-w-container-max mx-auto px-sp-md md:px-lg w-full">
          {/* Breadcrumb và Tiêu đề kết quả */}
          <div className="mb-sp-lg">
            <nav className="flex items-center space-x-2 font-label-md text-label-md text-on-surface-variant mb-3">
              <Link className="hover:text-primary transition-colors" to="/">
                Trang chủ
              </Link>
              <span className="opacity-50">/</span>
              <span className="font-bold">Tìm kiếm</span>
            </nav>
            <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">
              {query.trim() ? `Kết quả tìm kiếm cho: "${query}"` : 'Tất cả sản phẩm tìm kiếm'}
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant mt-1.5">
              Tìm thấy <span className="font-bold text-primary">{filteredProducts.length}</span> sản phẩm phù hợp.
            </p>
          </div>

          <div className="flex justify-between items-center mb-sp-md border-b border-outline-variant/15 pb-4">
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none font-label-md text-label-md text-on-surface-variant focus:ring-0 cursor-pointer outline-none"
              >
                <option value="price-low">Giá: Thấp đến Cao</option>
                <option value="price-high">Giá: Cao đến Thấp</option>
                <option value="newest">Mới nhất</option>
                <option value="popular">Phổ biến nhất</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-4 animate-spin">sync</span>
              <p className="font-body-lg">Đang tải sản phẩm...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
              <span className="material-symbols-outlined text-5xl mb-4 text-neutral-300" aria-hidden="true">search_off</span>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">Không tìm thấy sản phẩm nào</h3>
              <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                Rất tiếc, chúng tôi không tìm thấy kết quả phù hợp cho từ khóa của bạn. Vui lòng thử lại với một từ khóa khác hoặc quay lại cửa hàng.
              </p>
              <Link
                to="/shop"
                className="inline-block px-6 py-3 bg-[#333333] hover:bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-all duration-300"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <>
              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
                {paginatedProducts.map((prod) => {
                  const hoverImg = prod.hoverImage || prod.gallery?.find(img => img.url !== prod.image)?.url;
                  return (
                    <Link
                      key={prod.id}
                      to={`/product/${prod.id}`}
                      className="search-product-item group block"
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
                        {prod.discount && (
                          <span className="absolute top-10 left-1 bg-error text-on-error px-3 py-1 rounded-full font-label-sm text-label-sm font-bold">
                            {prod.discount}
                          </span>
                        )}
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
