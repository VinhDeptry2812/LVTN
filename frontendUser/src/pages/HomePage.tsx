import { useRef, useState, useEffect, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductSectionCarousel from '@/components/ProductSectionCarousel';

import { HeroBannerSection, type SlideItem } from '@/components/home/HeroBannerSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { AboutUsSection } from '@/components/home/AboutUsSection';
import { SpacesSection } from '@/components/home/SpacesSection';
import { FeaturedCategoriesSection } from '@/components/home/FeaturedCategoriesSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { ArticlesSection } from '@/components/home/ArticlesSection';
import { NewsletterSection } from '@/components/home/NewsletterSection';

import { getCategories, type Category } from '@/services/category.service';
import { fetchProducts, fetchBestSellers, type ProductFrontend } from '@/services/product.service';
import { getActiveCollections, type Collection } from '@/services/collection.service';
import { getActiveBanners } from '@/services/banner.service';
import { fetchFeaturedReviews } from '@/services/review.service';
import { useCartStore } from '@/store/useCartStore';

// Register GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const articlesRef = useRef<HTMLDivElement>(null);
  const newsletterRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<ProductFrontend[]>([]);
  const [bestSellers, setBestSellers] = useState<ProductFrontend[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [featuredReviews, setFeaturedReviews] = useState<any[]>([]);
  const addItem = useCartStore((state) => state.addItem);

  // Hero Banner Slider States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [isBannersLoading, setIsBannersLoading] = useState(true);

  // Autoplay & Progress timer for Hero Banner Carousel
  useEffect(() => {
    if (isHovered || slides.length === 0) return;

    const intervalTime = 50; // ms
    const step = 100 / (6000 / intervalTime); // 100% over 6000ms

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((current) => (current + 1) % slides.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isHovered, slides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    setProgress(0);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const handleDotClick = (idx: number) => {
    setCurrentSlide(idx);
    setProgress(0);
  };

  // Hero Banner Touch Swipe & Mouse Drag
  const [heroDragging, setHeroDragging] = useState(false);
  const heroStartXRef = useRef<number>(0);
  const heroCurrentXRef = useRef<number>(0);
  const heroStartYRef = useRef<number>(0);
  const heroCurrentYRef = useRef<number>(0);
  const heroContainerRef = useRef<HTMLElement>(null);

  const handleHeroDragStart = (clientX: number, clientY: number = 0) => {
    setHeroDragging(true);
    heroStartXRef.current = clientX;
    heroCurrentXRef.current = clientX;
    heroStartYRef.current = clientY;
    heroCurrentYRef.current = clientY;
  };

  const handleHeroDragMove = (clientX: number, clientY: number = 0) => {
    if (!heroDragging) return;
    heroCurrentXRef.current = clientX;
    heroCurrentYRef.current = clientY;
  };

  const handleHeroDragEnd = () => {
    if (!heroDragging) return;
    const diffX = heroCurrentXRef.current - heroStartXRef.current;
    const diffY = heroCurrentYRef.current - heroStartYRef.current;

    if (Math.abs(diffX) > Math.abs(diffY) || heroStartYRef.current === 0) {
      const containerWidth = heroContainerRef.current?.clientWidth || 400;
      const steps = Math.max(1, Math.round(Math.abs(diffX) / (containerWidth * 0.35)));

      if (diffX < -40 && slides.length > 0) {
        setCurrentSlide((prev) => (prev + steps) % slides.length);
        setProgress(0);
      } else if (diffX > 40 && slides.length > 0) {
        setCurrentSlide((prev) => (prev - steps + slides.length * 100) % slides.length);
        setProgress(0);
      }
    }
    setHeroDragging(false);
  };

  // Load Categories, Products, Collections, Banners, and Featured Reviews
  useEffect(() => {
    Promise.all([
      getCategories(),
      fetchProducts(),
      fetchBestSellers(12),
      getActiveCollections(),
      getActiveBanners().catch(() => []),
      fetchFeaturedReviews().catch(() => [])
    ])
      .then(([categoriesData, productsData, bestSellersData, collectionsData, bannersData, reviewsData]) => {
        setCategories(categoriesData);
        setAllProducts(productsData);
        setBestSellers(bestSellersData);
        setCollections(collectionsData);
        setFeaturedReviews(reviewsData);

        if (bannersData && bannersData.length > 0) {
          const mappedSlides = bannersData.map((b) => ({
            image: b.image_url,
            badge: b.subtitle || 'Khuyến mãi',
            title: b.title,
            description: b.description || '',
            btnText: b.button_text || 'Khám phá ngay',
            btnUrl: b.button_link || '/shop'
          }));
          setSlides(mappedSlides);
        }
        setIsBannersLoading(false);

        setTimeout(() => {
          ScrollTrigger.refresh();
        }, 300);
      })
      .catch((err) => {
        console.error(err);
        setIsBannersLoading(false);
      });
  }, []);

  // Memoized product lists for 3 sections
  const newProducts = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => {
        const timeA = a.lastStockAddedAt ? new Date(a.lastStockAddedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.lastStockAddedAt ? new Date(b.lastStockAddedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      })
      .slice(0, 12);
  }, [allProducts]);

  const bestSellerProducts = useMemo(() => {
    return bestSellers.slice(0, 12);
  }, [bestSellers]);

  const saleProducts = useMemo(() => {
    return [...allProducts]
      .filter((p) => p.rawBasePrice && p.rawPrice < p.rawBasePrice)
      .sort((a, b) => {
        const pctA = a.rawBasePrice ? (a.rawBasePrice - a.rawPrice) / a.rawBasePrice : 0;
        const pctB = b.rawBasePrice ? (b.rawBasePrice - b.rawPrice) / b.rawBasePrice : 0;
        return pctB - pctA;
      })
      .slice(0, 12);
  }, [allProducts]);

  // 1. Hero Text Entry Animations (Runs every time currentSlide changes)
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo('.hero-badge', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
      .fromTo('.hero-title', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.35')
      .fromTo('.hero-desc', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.4')
      .fromTo('.hero-btn', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.35');
  }, { dependencies: [currentSlide], scope: heroRef });

  // GSAP ScrollTrigger animations
  useGSAP(() => {
    // Services entry
    gsap.fromTo('.service-item',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: servicesRef.current,
          start: 'top 88%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );

    // About us entry
    gsap.fromTo('.about-animate',
      { opacity: 0, y: 25 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: aboutRef.current,
          start: 'top 85%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );

    // Bento Grid categories scroll entry
    gsap.fromTo('.category-item',
      { opacity: 0, y: 25 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: categoriesRef.current,
          start: 'top 85%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );

    // Rooms (Collections) entry
    gsap.fromTo('.room-item',
      { opacity: 0, y: 20, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: roomsRef.current,
          start: 'top 85%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );

    // Products card list scroll entry
    gsap.fromTo('.product-card-item',
      { opacity: 0, y: 25 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: productsRef.current,
          start: 'top 85%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );

    // Testimonials card entry
    gsap.fromTo('.testimonial-card',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: testimonialsRef.current,
          start: 'top 85%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );

    // Articles card entry
    gsap.fromTo('.article-card-item',
      { opacity: 0, y: 25 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: articlesRef.current,
          start: 'top 85%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );

    // Newsletter box zoom & entry
    gsap.fromTo(
      '.newsletter-box',
      { opacity: 0, y: 20, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: newsletterRef.current,
          start: 'top 90%',
          once: true,
          toggleActions: 'play none none none'
        }
      }
    );
  }, { dependencies: [featuredReviews, allProducts], scope: heroRef });

  const handleAddToCart = (product: ProductFrontend) => {
    addItem({
      id: `${product.id}-base`,
      productId: product.id,
      name: product.name,
      price: product.price,
      rawPrice: product.rawPrice,
      rawOldPrice: product.rawBasePrice,
      image: product.image,
      quantity: 1,
    });
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-hidden" ref={heroRef}>
      <Header />

      <main>
        {/* 1. Hero Banner */}
        <HeroBannerSection
          ref={heroContainerRef}
          slides={slides}
          currentSlide={currentSlide}
          progress={progress}
          isLoading={isBannersLoading}
          setIsHovered={setIsHovered}
          onPrevSlide={handlePrevSlide}
          onNextSlide={handleNextSlide}
          onDotClick={handleDotClick}
          onDragStart={handleHeroDragStart}
          onDragMove={handleHeroDragMove}
          onDragEnd={handleHeroDragEnd}
        />

        {/* 2. Services Section */}
        <ServicesSection ref={servicesRef} />

        {/* 3. About Us Section */}
        <AboutUsSection ref={aboutRef} />

        {/* 4. Featured Categories Section */}
        <FeaturedCategoriesSection ref={categoriesRef} categories={categories} />

        {/* 5. Product Carousels */}
        <div ref={productsRef}>
          {newProducts.length > 0 && (
            <ProductSectionCarousel
              title="SẢN PHẨM MỚI"
              subtitle="Những thiết kế mới nhất vừa cập bến FurniShop"
              products={newProducts}
              viewAllLink="/shop?sort=newest"
              onAddToCart={handleAddToCart}
            />
          )}

          {bestSellerProducts.length > 0 && (
            <ProductSectionCarousel
              title="SẢN PHẨM BẢN CHẠY"
              subtitle="Được khách hàng yêu thích và lựa chọn nhiều nhất"
              products={bestSellerProducts}
              viewAllLink="/shop?sort=bestseller"
              onAddToCart={handleAddToCart}
            />
          )}

          {saleProducts.length > 0 && (
            <ProductSectionCarousel
              title="ƯU ĐÃI ĐẶC BIỆT"
              subtitle="Sở hữu sản phẩm nội thất cao cấp với mức giá ưu đãi"
              products={saleProducts}
              viewAllLink="/shop?sort=sale"
              onAddToCart={handleAddToCart}
            />
          )}
        </div>

        {/* 6. Spaces / Collections Section */}
        <SpacesSection ref={roomsRef} collections={collections} />

        {/* 7. Testimonials Section */}
        <TestimonialsSection ref={testimonialsRef} featuredReviews={featuredReviews} />

        {/* 8. Articles Section */}
        <ArticlesSection ref={articlesRef} />

        {/* 9. Newsletter Section */}
        <NewsletterSection ref={newsletterRef} />
      </main>

      <Footer />
    </div>
  );
}
