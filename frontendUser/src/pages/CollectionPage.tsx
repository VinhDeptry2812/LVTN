import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
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

              <div className="max-w-7xl mx-auto bg-surface border border-outline-variant/30 rounded-2xl p-8 md:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden text-left">
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
                    <div key={product.id} className="product-card">
                      <ProductCard product={product} />
                    </div>
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

