import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { type Collection, getCollectionBySlug } from '@/services/collection.service';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CollectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    getCollectionBySlug(slug)
      .then((data) => {
        setCollection(data);
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
            src={collection.cover_image || 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=2000&auto=format&fit=crop'}
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
          <section className="inspiration-section py-16 md:py-24 bg-surface relative">
            <div className="max-w-3xl mx-auto px-6 text-center">
              <h2 className="inspiration-text font-headline-md text-2xl md:text-3xl text-on-surface mb-8 font-medium">
                Cảm hứng thiết kế
              </h2>
              <div className="space-y-6 text-on-surface-variant font-body-md text-base leading-relaxed md:text-lg md:leading-loose">
                {descParagraphs.map((para, idx) => (
                  <p key={idx} className="inspiration-text">{para}</p>
                ))}
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
                  let mainImage = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800&auto=format&fit=crop';
                  let hoverImg = undefined;

                  if (backendProd.images && backendProd.images.length > 0) {
                    const sortedImages = [...backendProd.images].sort((a: any, b: any) => a.id - b.id);
                    const primaryImg = sortedImages.find((img: any) => img.is_primary);
                    mainImage = primaryImg ? primaryImg.image_url : sortedImages[0].image_url;
                    const secondImg = sortedImages.find((img: any) => img.image_url !== mainImage);
                    if (secondImg) hoverImg = secondImg.image_url;
                  }

                  const priceFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                    .format(Number(backendProd.base_price || 0));

                  return (
                    <Link
                      key={backendProd.id}
                      to={`/product/${backendProd.id}`}
                      className="product-card group block"
                    >
                      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white mb-4">
                        <img
                          className={`absolute inset-0 w-full h-full object-contain p-4 transition-opacity duration-500 ${hoverImg ? 'opacity-100 group-hover:opacity-0' : ''}`}
                          src={mainImage}
                          alt={backendProd.name}
                          loading="lazy"
                        />
                        {hoverImg && (
                          <img
                            className="absolute inset-0 w-full h-full object-contain p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            src={hoverImg}
                            alt={`${backendProd.name} alternate view`}
                            loading="lazy"
                          />
                        )}
                        
                        {/* Optional badging could go here */}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          aria-label={`Thêm ${backendProd.name} vào yêu thích`}
                          className="absolute top-4 right-4 w-11 h-11 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                        </button>
                      </div>
                      
                      <div className="text-left">
                        <h2 className="font-headline-md text-headline-md text-on-surface mb-1 line-clamp-1">{backendProd.name}</h2>
                        <p className="font-label-md text-label-md text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {priceFormatted}
                        </p>
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

