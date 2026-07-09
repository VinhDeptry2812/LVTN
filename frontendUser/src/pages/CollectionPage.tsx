import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { type Collection, getCollectionBySlug } from '@/services/collection.service';
import { mapBackendProductToFrontend } from '@/services/product.service';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroBannerImage, productCardImage } from '@/utils/cloudinaryUrl';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CollectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const containerRef = useRef<HTMLDivElement>(null);
  const productsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    getCollectionBySlug(slug)
      .then((data) => {
        setCollection(data);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Không tìm thấy bộ sưu tập');
        setLoading(false);
      });
  }, [slug]);

  useGSAP(() => {
    if (loading || !collection) return;

    // Parallax cho Hero Image
    gsap.to('.hero-parallax-img', {
      scrollTrigger: {
        trigger: '.hero-parallax-container',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      y: 150,
      ease: 'none'
    });

    // Fade up cho text ở Hero
    gsap.fromTo('.hero-text-anim',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out', delay: 0.2 }
    );

    // Animation cho phần text cảm hứng (Inspiration)
    gsap.fromTo('.inspiration-text',
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 1,
        scrollTrigger: {
          trigger: '.inspiration-section',
          start: 'top 80%',
        }
      }
    );

  }, { dependencies: [loading, collection], scope: containerRef });

  // Paginated Products
  const paginatedProducts = useMemo(() => {
    if (!collection || !collection.products) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return collection.products.slice(startIndex, startIndex + itemsPerPage);
  }, [collection, currentPage]);

  const totalPages = useMemo(() => {
    if (!collection || !collection.products) return 0;
    return Math.ceil(collection.products.length / itemsPerPage);
  }, [collection]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (productsSectionRef.current) {
      const yOffset = -100; // Offset for sticky header
      const y = productsSectionRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
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

  // GSAP animation for product grid entries
  useGSAP(() => {
    if (paginatedProducts.length > 0) {
      gsap.fromTo('.product-card',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          overwrite: 'auto'
        }
      );
    }
  }, { dependencies: [paginatedProducts], scope: containerRef });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <h2 className="text-2xl font-bold text-on-surface mb-4">Không tìm thấy bộ sưu tập</h2>
        <Link to="/" className="text-primary hover:underline">Về trang chủ</Link>
      </div>
    );
  }

  // Tách description thành các đoạn văn nếu dài
  const descParagraphs = collection.description ? collection.description.split('\n').filter(p => p.trim() !== '') : [];

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-surface font-sans text-on-surface selection:bg-primary selection:text-on-primary">
      <Header />

      <main className="flex-grow pt-[72px]">
        {/* HERO SECTION - Lookbook Style */}
        <section className="hero-parallax-container relative h-[60vh] md:h-[75vh] w-full overflow-hidden bg-surface">
          <img
            alt={collection.name}
            className="hero-parallax-img absolute top-[-15%] left-0 w-full h-[130%] object-cover"
            src={heroBannerImage(collection.cover_image) || 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=2000&auto=format&fit=crop'}
          />
          {/* Lớp phủ mờ nhẹ giúp chữ dễ đọc hơn */}
          <div className="absolute inset-0 bg-black/30"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
            <span className="hero-text-anim text-white/90 font-label-md tracking-[0.2em] uppercase mb-4 block">
              {collection.name?.toLowerCase().includes('phòng') ? 'Không gian' : 'Bộ sưu tập'}
            </span>
            <h1 className="hero-text-anim font-headline-xl text-4xl md:text-6xl lg:text-7xl text-white font-medium mb-6 drop-shadow-md">
              {collection.name}
            </h1>
            <div className="hero-text-anim w-12 h-[2px] bg-white/60 mx-auto"></div>
          </div>
        </section>

        {/* INSPIRATION SECTION - Cảm hứng thiết kế */}
        {descParagraphs.length > 0 && (
          <section className="inspiration-section py-20 md:py-28 bg-surface-container-low/40 relative overflow-hidden">
            {/* Trang trí các vòng tròn mờ nghệ thuật phía sau */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-fixed/15 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
              <div className="text-center md:text-left mb-12 md:mb-16">
                <span className="text-primary font-label-md tracking-[0.2em] uppercase mb-3 block">Ý tưởng & Câu chuyện</span>
                <h2 className="inspiration-text font-headline-lg text-3xl md:text-4xl text-on-surface font-medium">
                  Cảm hứng thiết kế
                </h2>
                <div className="w-12 h-[2px] bg-primary mt-4 md:mx-0 mx-auto"></div>
              </div>

              {descParagraphs.length >= 3 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                  {/* Cột trái: Trích dẫn nổi bật (Lấy đoạn cuối cùng của mô tả) */}
                  <div className="lg:col-span-5 flex">
                    <div className="inspiration-text w-full bg-surface border border-outline-variant/30 rounded-2xl p-8 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-primary/20 group">
                      <div className="absolute top-0 left-0 w-full h-[4px] bg-primary"></div>
                      <span className="material-symbols-outlined text-primary/15 text-7xl absolute right-4 top-4 select-none pointer-events-none">
                        format_quote
                      </span>
                      <div className="relative z-10 pt-4">
                        <p className="font-headline-md text-xl md:text-2xl text-primary font-normal leading-relaxed italic mb-8">
                          "{descParagraphs[descParagraphs.length - 1]}"
                        </p>
                      </div>
                      <div className="border-t border-outline-variant/30 pt-6">
                        <p className="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant/80">
                          Triết lý không gian
                        </p>
                        <p className="text-body-sm font-medium text-primary mt-1">
                          {collection.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cột phải: Các đoạn mô tả chi tiết */}
                  <div className="lg:col-span-7 flex flex-col justify-center">
                    {/* Đoạn mở đầu lớn hơn */}
                    <p className="inspiration-text font-body-lg text-lg md:text-xl text-on-surface/90 font-medium leading-relaxed mb-6">
                      {descParagraphs[0]}
                    </p>

                    {/* Các đoạn tiếp theo dạng grid 2 cột trên desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                      {descParagraphs.slice(1, descParagraphs.length - 1).map((para, idx) => (
                        <div key={idx} className="inspiration-text border-l-2 border-primary/20 pl-4 py-1">
                          <p className="text-body-md text-on-surface-variant leading-relaxed">
                            {para}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Layout thu gọn căn giữa sang trọng dành cho mô tả ngắn */
                <div className="max-w-7xl mx-auto bg-surface border border-outline-variant/30 rounded-2xl p-8 md:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden text-left">
                  <span className="material-symbols-outlined text-primary/5 text-9xl absolute -left-6 -top-6 select-none font-light">
                    format_quote
                  </span>
                  <div className="relative z-10 space-y-6">
                    {descParagraphs.map((para, idx) => (
                      <p
                        key={idx}
                        className={`inspiration-text text-on-surface-variant leading-relaxed ${idx === 0
                          ? 'text-lg md:text-xl text-on-surface font-medium md:leading-loose'
                          : 'text-base md:text-lg md:leading-loose'
                          }`}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* PRODUCTS GRID SECTION */}
        <section className="py-16 md:py-24 bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="text-center mb-16">
              <h2 className="font-headline-lg text-3xl md:text-4xl text-on-surface font-medium mb-4">
                Các thiết kế trong {collection.name?.toLowerCase().includes('phòng') ? 'không gian này' : 'bộ sưu tập'}
              </h2>
              <div className="w-16 h-[2px] bg-outline mx-auto"></div>
            </div>

            {(!collection.products || collection.products.length === 0) ? (
              <div className="py-20 text-center">
                <p className="text-slate-500 font-body-lg italic">
                  Chưa có sản phẩm nào trong {collection.name?.toLowerCase().includes('phòng') ? 'không gian này' : 'bộ sưu tập này'}.
                </p>
              </div>
            ) : (
              <div className="products-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {collection.products.map((backendProd: any) => {
                  const product = mapBackendProductToFrontend(backendProd);

                  return (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="product-card group block"
                    >
                      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/30 backdrop-blur-md border border-white/20 mb-1">
                        <img
                          className={`absolute inset-0 w-full h-full object-contain p-0 transition-opacity duration-500 mix-blend-multiply ${product.hoverImage ? 'opacity-100 group-hover:opacity-0' : ''}`}
                          src={productCardImage(product.image)}
                          alt={product.name}
                          loading="lazy"
                        />
                        {product.hoverImage && (
                          <img
                            className="absolute inset-0 w-full h-full object-contain p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-multiply"
                            src={productCardImage(product.hoverImage)}
                            alt={`${product.name} alternate view`}
                            loading="lazy"
                          />
                        )}

                        {product.discount && (
                          <div className="absolute top-10 left-1 bg-error text-on-error px-3 py-1 rounded-full font-label-sm text-label-sm font-bold shadow-sm z-10">
                            Giảm {product.discount.replace('-', '')}
                          </div>
                        )}


                      </div>

                      <div className="text-left">
                        <h2 className="font-headline-md text-base md:text-lg font-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors duration-300">{product.name}</h2>
                        <div className="flex items-baseline space-x-2">
                          <p className="font-label-md text-label-md text-primary font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {product.price}
                          </p>
                          {product.oldPrice && (
                            <p className="text-xs text-on-surface-variant/60 line-through font-sans" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {product.oldPrice}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CollectionPage;

