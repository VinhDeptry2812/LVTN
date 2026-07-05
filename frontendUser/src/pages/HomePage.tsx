import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCategories, type Category } from '@/services/category.service';
import { fetchProducts, type ProductFrontend } from '@/services/product.service';
import { getActiveCollections, type Collection } from '@/services/collection.service';
import { useCartStore } from '@/store/useCartStore';
import toast from 'react-hot-toast';

// Register GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function HomePage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const categoriesRef = useRef<HTMLElement>(null);
  const roomsRef = useRef<HTMLElement>(null);
  const promoRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLElement>(null);
  const testimonialsRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const newsletterRef = useRef<HTMLElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<ProductFrontend[]>([]);
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'best' | 'sale'>('new');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState({ days: 7, hours: 0, minutes: 0, seconds: 0 });
  const addItem = useCartStore((state) => state.addItem);

  // Hero Banner Slider States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  const HERO_SLIDES = [
    {
      image: 'https://res.cloudinary.com/dblkv5veh/image/upload/v1782750523/imgi_57_BST-Coastal-3-3_ziafsm.jpg',
      badge: 'Bộ sưu tập',
      title: 'COASTAL',
      description: 'Coastal với đầy đủ các thiết kế cho mọi không gian trong nhà, mang tới một định nghĩa mới về sự thư thái, thoải mái.',
      btnText: 'Xem bộ sưu tập',
      btnUrl: '/collection/coastal'
    },
    {
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop',
      badge: 'Không gian sống tinh tế',
      title: 'PHÒNG KHÁCH',
      description: 'Tối giản hóa không gian sống với các sản phẩm sofa, bàn trà gỗ tự nhiên tinh tế, mang lại hơi thở hiện đại cho tổ ấm của bạn.',
      btnText: 'Khám phá ngay',
      btnUrl: '/shop'
    },
    {
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2000&auto=format&fit=crop',
      badge: 'Không gian yên bình',
      title: 'PHÒNG NGỦ ẤM ÁP',
      description: 'Chăm sóc giấc ngủ trọn vẹn của bạn bằng những mẫu giường gỗ tràm tự nhiên đạt chuẩn xuất khẩu quốc tế.',
      btnText: 'Xem sản phẩm',
      btnUrl: '/shop'
    }
  ];

  // Autoplay & Progress timer for Hero Banner Carousel
  useEffect(() => {
    if (isHovered) return;

    const intervalTime = 50; // ms
    const step = 100 / (6000 / intervalTime); // 100% over 6000ms

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((current) => (current + 1) % HERO_SLIDES.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isHovered]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
    setProgress(0);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    setProgress(0);
  };

  const handleDotClick = (idx: number) => {
    setCurrentSlide(idx);
    setProgress(0);
  };

  // Load Categories, Products, and Collections
  useEffect(() => {
    Promise.all([getCategories(), fetchProducts(), getActiveCollections()])
      .then(([categoriesData, productsData, collectionsData]) => {
        setCategories(categoriesData);
        setAllProducts(productsData);
        setProducts(productsData.slice(0, 4)); // Show first 4 products on homepage
        setCollections(collectionsData);
      })
      .catch(console.error);
  }, []);

  // Countdown timer for Promo Combo
  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;
      
      if (difference <= 0) {
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Toggle wishlist function
  const toggleWishlist = (id: string, name: string) => {
    setWishlist(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        toast.success(`Đã thêm "${name}" vào danh sách yêu thích!`);
      } else {
        toast.success(`Đã xóa "${name}" khỏi danh sách yêu thích!`);
      }
      return next;
    });
  };

  // Get products based on active tab
  const getTabProducts = () => {
    if (allProducts.length === 0) return [];
    
    switch (activeTab) {
      case 'new':
        return [...allProducts]
          .sort((a, b) => Number(b.id) - Number(a.id))
          .slice(0, 4)
          .map(p => ({ ...p, isNew: true }));
          
      case 'best':
        return allProducts.slice(1, 5).map((p) => ({
          ...p,
          badge: 'Bán chạy',
          isNew: false
        }));
        
      case 'sale': {
        const realSales = allProducts.filter(p => p.discount);
        if (realSales.length >= 4) {
          return realSales.slice(0, 4);
        }
        const mockSales = allProducts
          .filter(p => !p.discount)
          .slice(0, 4 - realSales.length)
          .map((p, idx) => {
            const discountPct = idx % 2 === 0 ? 15 : 20;
            const oldPriceVal = Math.round(p.rawPrice * (1 + discountPct / 100));
            return {
              ...p,
              discount: `-${discountPct}%`,
              oldPrice: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(oldPriceVal),
              isNew: false
            };
          });
        return [...realSales, ...mockSales];
      }
      default:
        return allProducts.slice(0, 4);
    }
  };

  // 1. Hero Text Entry Animations (Runs every time currentSlide changes)
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo('.hero-badge', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
      .fromTo('.hero-title', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.35')
      .fromTo('.hero-desc', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.4')
      .fromTo('.hero-btn', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.35');
  }, { dependencies: [currentSlide], scope: heroRef });

  // useGSAP handles cleanup automatically for ScrollTriggers
  useGSAP(() => {
    // 2. Services entry
    gsap.fromTo('.service-item',
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: servicesRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 2.5 About us entry
    gsap.fromTo('.about-animate',
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: aboutRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 3. Bento Grid categories scroll entry
    gsap.fromTo('.category-item',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: categoriesRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 4. Rooms (Collections) entry
    gsap.fromTo('.room-item',
      { opacity: 0, scale: 0.95 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: roomsRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 4.5 Promo banner entry
    gsap.fromTo('.promo-animate',
      { opacity: 0, scale: 0.98 },
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: promoRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 5. Products card list scroll entry
    gsap.fromTo('.product-card-item',
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: productsRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 5.5 Testimonials card entry
    gsap.fromTo('.testimonial-card',
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: testimonialsRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 5.6 Gallery image entry
    gsap.fromTo('.gallery-img-item',
      { opacity: 0, scale: 0.9 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: galleryRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 6. Newsletter box zoom & entry
    gsap.from('.newsletter-box', {
      scale: 0.96,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: newsletterRef.current,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  }, { scope: heroRef });

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-hidden" ref={heroRef}>
      <Header />

      <main className="pt-20">
        {/* Hero Banner Section */}
        <section 
          className="relative h-[calc(100vh-80px)] w-full overflow-hidden flex items-center bg-surface-container"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Slides */}
          <div className="absolute inset-0 z-0 w-full h-full">
            {HERO_SLIDES.map((slide, idx) => {
              const isActive = idx === currentSlide;
              return (
                <div
                  key={idx}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Background Image with Ken Burns effect when active */}
                  <img
                    alt={slide.title}
                    className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                    src={slide.image}
                  />
                  {/* Subtle Dark Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent z-10"></div>
                </div>
              );
            })}
          </div>

          {/* Foreground Text Layer */}
          <div className="relative z-20 max-w-container-max mx-auto px-sp-md md:px-lg w-full text-white">
            <div className="max-w-2xl">
              <span className="hero-badge inline-block px-4 py-1.5 mb-sp-md rounded-full bg-white/20 backdrop-blur-md text-white font-label-md text-label-md uppercase tracking-wider">
                {HERO_SLIDES[currentSlide].badge}
              </span>
              <h1 className="hero-title font-headline-xl text-headline-xl mb-sp-md text-white leading-[1.1] tracking-tight">
                {HERO_SLIDES[currentSlide].title}
              </h1>
              <p className="hero-desc font-body-lg text-body-lg text-white/90 mb-sp-lg max-w-lg leading-relaxed">
                {HERO_SLIDES[currentSlide].description}
              </p>
              <div className="flex flex-wrap gap-sp-md">
                <button
                  onClick={() => navigate(HERO_SLIDES[currentSlide].btnUrl)}
                  className="relative overflow-hidden group hero-btn px-10 py-4 bg-white text-black hover:text-white rounded-xl font-label-md text-label-md active:scale-95 cursor-pointer shadow-lg shadow-black/15 transition-colors duration-200"
                >
                  <span className="absolute inset-0 w-full h-full bg-primary origin-left scale-x-0 transition-transform duration-200 ease-out group-hover:scale-x-100"></span>
                  <span className="relative z-10 transition-colors duration-200">
                    {HERO_SLIDES[currentSlide].btnText}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrevSlide}
            aria-label="Previous Slide"
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={handleNextSlide}
            aria-label="Next Slide"
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
          >
            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Indicators / Progress Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
            {HERO_SLIDES.map((_, idx) => {
              const isActive = idx === currentSlide;
              return (
                <button
                  key={idx}
                  onClick={() => handleDotClick(idx)}
                  className="group relative flex items-center justify-center w-12 h-6 cursor-pointer"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  {/* Track line */}
                  <span className="w-full h-[2px] rounded bg-white/30 group-hover:bg-white/50 transition-colors"></span>
                  {/* Active progress timer line */}
                  {isActive && (
                    <span 
                      className="absolute left-0 h-[2px] rounded bg-white transition-all duration-75"
                      style={{ width: `${progress}%` }}
                    ></span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Core Values / Services Section */}
        <section ref={servicesRef} className="py-12 bg-surface border-b border-outline-variant/30">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: 'local_shipping', title: 'Miễn phí giao hàng', desc: 'Cho đơn hàng trên 5 triệu' },
                { icon: 'verified', title: 'Bảo hành 2 năm', desc: 'Chất lượng đảm bảo' },
                { icon: 'currency_exchange', title: 'Đổi trả 7 ngày', desc: 'Miễn phí đổi trả' },
                { icon: 'eco', title: 'Vật liệu an toàn', desc: 'Đạt chuẩn CARB-P2' },
              ].map((service, idx) => (
                <div key={idx} className="service-item flex flex-col items-center p-4">
                  <span className="material-symbols-outlined text-[40px] text-primary mb-3">{service.icon}</span>
                  <h3 className="font-headline-sm font-bold text-on-surface mb-1">{service.title}</h3>
                  <p className="font-body-sm text-on-surface-variant">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Cam kết chất lượng & Chứng nhận CARB-P2 (MOHO Inspired) */}
        <section ref={aboutRef} className="py-sp-xl bg-surface border-b border-outline-variant/20 overflow-hidden">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column: Image with badges */}
              <div className="relative about-animate">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1541123437800-1bb1317badc2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80"
                    alt="Nhà máy FurniShop"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10"></div>
                </div>
                {/* Badges floating on image */}
                <div className="absolute -bottom-6 -right-6 bg-primary text-on-primary p-6 rounded-2xl shadow-lg hidden md:block max-w-[240px]">
                  <span className="material-symbols-outlined text-[36px] text-on-primary mb-2">workspace_premium</span>
                  <h4 className="font-bold text-headline-sm mb-1">Chuẩn Gỗ CARB-P2</h4>
                  <p className="text-[12px] opacity-90 leading-relaxed">Nồng độ phát thải Formaldehyde gần như bằng 0, tuyệt đối an toàn cho sức khỏe gia đình bạn.</p>
                </div>
              </div>

              {/* Right Column: Narrative */}
              <div className="flex flex-col justify-center about-animate">
                <span className="text-primary font-label-md text-label-md uppercase tracking-widest block mb-3">Về chúng tôi</span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6 leading-tight">
                  Nội thất Xanh cho gia đình Việt
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
                  Là thương hiệu nội thất bán lẻ trực thuộc nhà máy liên doanh xuất khẩu quy mô lớn, FurniShop tự hại sở hữu quy trình sản xuất khép kín đạt chứng chỉ bảo vệ rừng quốc tế <strong>FSC</strong>.
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
                  Từng thớ gỗ, từng lớp sơn phủ đều vượt qua kiểm định khắt khe của chứng chỉ <strong>CARB-P2</strong> (California Air Resources Board) - tiêu chuẩn an toàn không khí cao cấp nhất dành cho vật liệu gỗ công nghiệp, đảm bảo sức khỏe hô hấp lâu dài cho trẻ nhỏ và người cao tuổi.
                </p>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="border-l-2 border-primary pl-4">
                    <h4 className="font-headline-sm font-bold text-on-surface mb-1">100% FSC Certified</h4>
                    <p className="text-[12px] text-on-surface-variant">Gỗ có nguồn gốc minh bạch từ rừng trồng bền vững.</p>
                  </div>
                  <div className="border-l-2 border-primary pl-4">
                    <h4 className="font-headline-sm font-bold text-on-surface mb-1">Eco-friendly Coated</h4>
                    <p className="text-[12px] text-on-surface-variant">Sử dụng sơn phủ thân thiện môi trường, không mùi độc hại.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shop By Room / Collections Section */}
        <section ref={roomsRef} className="py-sp-xl bg-surface-container-lowest">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="flex items-end justify-between mb-sp-lg">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Không gian sống</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Khám phá các gợi ý thiết kế trọn bộ cho ngôi nhà của bạn</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {collections.filter(c => c.name.toLowerCase().includes('phòng')).slice(0, 3).map((col) => (
                <Link
                  key={col.id}
                  to={`/collection/${col.slug}`}
                  className="room-item group relative h-[450px] rounded-2xl overflow-hidden cursor-pointer"
                >
                  <img
                    src={col.cover_image || 'https://via.placeholder.com/600x800?text=Room'}
                    alt={col.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                  <div className="absolute bottom-0 left-0 p-8 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="font-headline-md text-white font-bold mb-2">{col.name}</h3>
                    <div className="flex items-center text-label-sm text-white/90 font-label-sm uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      <span>Khám phá ngay</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/collections"
                className="inline-block px-8 py-3 border border-outline text-on-surface rounded-xl font-label-md hover:bg-surface-container transition-colors"
              >
                Xem tất cả không gian
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Categories: Bento Grid Layout */}
        <section ref={categoriesRef} className="py-sp-xl bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="flex items-end justify-between mb-sp-lg">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Danh mục nổi bật</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Tìm kiếm mảnh ghép hoàn hảo cho từng góc nhỏ</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 md:gap-6 md:h-[650px]">
              {categories.slice(0, 4).map((cat, index) => {
                // Perfect 4-item Bento Grid layout
                let gridClass = '';
                if (index === 0) gridClass = 'md:col-span-2 md:row-span-2 h-[300px] md:h-auto';
                else if (index === 1) gridClass = 'md:col-span-2 md:row-span-1 h-[250px] md:h-auto';
                else gridClass = 'md:col-span-1 md:row-span-1 h-[250px] md:h-auto';

                return (
                  <div
                    key={cat.id}
                    onClick={() => navigate(`/shop?category=${cat.slug}`)}
                    className={`category-item group relative overflow-hidden rounded-2xl bg-surface-container cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 ${gridClass}`}
                  >
                    <img
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      src={cat.image_url || 'https://via.placeholder.com/600x400?text=No+Image'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500"></div>
                    <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <h3 className="font-headline-md font-bold md:font-headline-lg text-white drop-shadow-lg">{cat.name}</h3>
                      <span className="inline-block mt-2 font-label-sm text-label-sm text-white/90 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                        Khám phá ngay &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section: Combo Ưu đãi với Bộ đếm ngược (Countdown Timer) (MOHO Inspired) */}
        <section ref={promoRef} className="py-sp-xl bg-surface-container-low overflow-hidden">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="promo-animate bg-on-surface-variant/5 rounded-3xl overflow-hidden border border-outline-variant/30 flex flex-col lg:flex-row items-center">
              {/* Left Column: Promotion content */}
              <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
                <span className="text-primary font-label-md text-label-md uppercase tracking-widest block mb-3">Ưu đãi giới hạn</span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4 leading-tight">
                  Combo Phòng Khách Ấm Áp
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-8 max-w-lg leading-relaxed">
                  Sở hữu trọn bộ sofa Coastal, bàn trà gỗ sồi tự nhiên và tủ kệ tivi với mức giá ưu đãi cực khủng giảm đến 25%. Miễn phí vận chuyển và lắp đặt tận nhà.
                </p>

                {/* Countdown Timer Grid */}
                <div className="flex gap-4 mb-8">
                  {[
                    { label: 'Ngày', value: timeLeft.days },
                    { label: 'Giờ', value: timeLeft.hours },
                    { label: 'Phút', value: timeLeft.minutes },
                    { label: 'Giây', value: timeLeft.seconds }
                  ].map((unit, idx) => (
                    <div key={idx} className="bg-surface-container-highest/60 backdrop-blur-sm rounded-xl p-4 min-w-[70px] md:min-w-[80px] text-center shadow-sm border border-outline-variant/20">
                      <div className="font-headline-md text-headline-md font-bold text-on-surface mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {String(unit.value).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">{unit.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => navigate('/shop')}
                    className="relative overflow-hidden group px-8 py-3.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md active:scale-95 cursor-pointer shadow-sm"
                  >
                    Mua ngay combo
                  </button>
                </div>
              </div>

              {/* Right Column: Dynamic lifestyle photo */}
              <div className="flex-1 w-full h-[350px] lg:h-[500px] relative">
                <img
                  src="https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80"
                  alt="Combo phòng khách Coastal"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute top-6 right-6 bg-error text-on-error px-4 py-2 rounded-full font-bold text-label-md shadow-md animate-pulse">
                  Giảm 25%
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Bộ chọn Tab Sản phẩm (Mới nhất, Bán chạy, Khuyến mãi) (MOHO Inspired) */}
        <section ref={productsRef} className="py-sp-xl bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-sp-xl gap-sp-md border-b border-outline-variant/20 pb-6">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Mua sắm theo xu hướng</h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                  Khám phá những thiết kế tinh tuyển, đáp ứng các tiêu chuẩn xuất khẩu cao cấp nhất.
                </p>
              </div>

              {/* Tab Selector Buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none shrink-0">
                {[
                  { id: 'new', label: 'Mới nhất' },
                  { id: 'best', label: 'Bán chạy nhất' },
                  { id: 'sale', label: 'Khuyến mãi hot' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-3 rounded-full font-label-md text-label-md transition-all duration-300 whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-on-surface-variant'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabbed Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {getTabProducts().map((prod) => {
                const hoverImg = prod.hoverImage || prod.gallery?.find(img => img.url !== prod.image)?.url;
                const isFavorited = wishlist[prod.id];
                
                return (
                  <Link
                    key={`${activeTab}-${prod.id}`}
                    to={`/product/${prod.id}`}
                    className="product-card-item group block"
                  >
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white mb-4 shadow-sm border border-outline-variant/20 transition-all duration-300 hover:shadow-md">
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
                        <span className="absolute top-4 left-4 bg-error text-on-error px-3 py-1 rounded-full font-label-sm text-label-sm font-bold">
                          {prod.discount}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleWishlist(prod.id, prod.name);
                        }}
                        aria-label={`Thêm ${prod.name} vào yêu thích`}
                        className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all duration-300 ${
                          isFavorited
                            ? 'bg-red-50 text-red-500 border-red-200 opacity-100'
                            : 'bg-white/80 border-outline-variant/50 text-on-surface-variant opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <span className="material-symbols-outlined" style={isFavorited ? { fontVariationSettings: "'FILL' 1" } : {}} aria-hidden="true">
                          favorite
                        </span>
                      </button>
                    </div>
                    <h3 className="font-headline-sm font-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors">{prod.name}</h3>
                    <p className="font-label-md text-label-md text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {prod.price}
                      {prod.oldPrice && (
                        <span className="text-on-surface-variant line-through ml-2 font-normal text-body-sm">{prod.oldPrice}</span>
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
            
            <div className="mt-sp-xl text-center">
              <Link
                to="/shop"
                className="inline-block px-10 py-4 border-2 border-primary text-primary rounded-xl font-label-md text-label-md hover:bg-primary-container/10 transition-colors duration-300"
              >
                Xem tất cả sản phẩm
              </Link>
            </div>
          </div>
        </section>

        {/* Section: Đánh giá từ khách hàng (Testimonials) (MOHO Inspired) */}
        <section ref={testimonialsRef} className="py-sp-xl bg-surface-container-lowest">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="text-center max-w-2xl mx-auto mb-sp-xl">
              <span className="text-primary font-label-md text-label-md uppercase tracking-widest block mb-3">Đánh giá thực tế</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Khách hàng nói gì về FurniShop</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Chị Mai Anh',
                  location: 'Quận 2, TP. Hồ Chí Minh',
                  avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
                  rating: 5,
                  comment: 'Bộ bàn ăn gỗ sồi của FurniShop đẹp vượt mong đợi. Bề mặt gỗ láng mịn, chuẩn CARB-P2 nên mở hộp không hề nghe mùi hóa chất độc hại. Giao hàng và lắp đặt rất nhanh chóng.',
                },
                {
                  name: 'Anh Minh Trí',
                  location: 'Quận Cầu Giấy, Hà Nội',
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
                  rating: 5,
                  comment: 'Sofa giường Coastal thực sự êm ái và tiện lợi. Nhà tôi có trẻ nhỏ nên rất chú trọng vật liệu an toàn, và FurniShop đã làm tốt điều đó. Sẽ tiếp tục ủng hộ thương hiệu.',
                },
                {
                  name: 'Chị Thu Trang',
                  location: 'Quận Hải Châu, Đà Nẵng',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
                  rating: 5,
                  comment: 'Tủ kệ tivi thiết kế tối giản nhưng rất sang trọng và chắc chắn. Dịch vụ chăm sóc khách hàng nhiệt tình, bảo hành 2 năm làm tôi rất an tâm sử dụng.',
                },
              ].map((item, idx) => (
                <div key={idx} className="testimonial-card bg-surface rounded-2xl p-8 border border-outline-variant/30 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex gap-1 text-yellow-500 mb-4">
                      {[...Array(item.rating)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant italic mb-6">
                      "{item.comment}"
                    </p>
                  </div>
                  <div className="flex items-center gap-4 border-t border-outline-variant/20 pt-4">
                    <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    <div>
                      <h4 className="font-headline-sm font-bold text-on-surface mb-0.5">{item.name}</h4>
                      <p className="text-[12px] text-on-surface-variant">{item.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Góc khách hàng chia sẻ hình ảnh thực tế / Instagram Grid (MOHO Inspired) */}
        <section ref={galleryRef} className="py-sp-xl bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-sp-lg gap-sp-md">
              <div>
                <span className="text-primary font-label-md text-label-md uppercase tracking-widest block mb-2">#FurniShopHome</span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Góc nhỏ ấm cúng của bạn</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Chia sẻ không gian sống của bạn trên mạng xã hội với hashtag để nhận ngay voucher giảm 10%.</p>
              </div>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="font-label-md text-label-md text-primary flex items-center gap-2 hover:underline self-start md:self-auto"
              >
                <span>Xem trên Instagram</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1505691938895-1758d7feb511?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1540518614846-7eded433c457?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1524758631624-e2822e304c36?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
              ].map((img, idx) => (
                <div key={idx} className="gallery-img-item group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-sm">
                  <img src={img} alt={`Customer Home ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[32px] transform scale-75 group-hover:scale-100 transition-transform duration-300">favorite</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Inspiration / Blog Section */}
        <section className="py-sp-xl bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="flex items-end justify-between mb-sp-lg">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Góc cảm hứng</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Những xu hướng và mẹo trang trí nội thất mới nhất</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'Bí quyết chọn Sofa hoàn hảo cho không gian nhỏ', img: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', date: '15 Tháng 5, 2024' },
                { title: 'Xu hướng nội thất tối giản (Minimalism) năm nay', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', date: '12 Tháng 5, 2024' },
                { title: 'Cách phối màu sắc để phòng ngủ luôn ấm cúng', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', date: '08 Tháng 5, 2024' },
              ].map((blog, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-sm">
                    <img src={blog.img} alt={blog.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="font-label-sm text-primary mb-2 uppercase tracking-wider">{blog.date}</div>
                  <h3 className="font-headline-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">{blog.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section ref={newsletterRef} className="py-sp-xl bg-primary-container/10">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="newsletter-box bg-surface-container-lowest rounded-[2rem] p-sp-lg md:p-xl flex flex-col md:flex-row items-center justify-between gap-sp-xl shadow-sm">
              <div className="max-w-xl text-center md:text-left">
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Kết nối với Nội thất</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Đăng ký nhận bản tin để cập nhật các bộ sưu tập mới nhất và ưu đãi đặc quyền dành riêng cho bạn.
                </p>
              </div>
              <form
                className="w-full max-w-md flex flex-col sm:flex-row gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as HTMLFormElement;
                  const emailInput = target.querySelector('input[type="email"]') as HTMLInputElement;
                  if (emailInput) {
                    emailInput.value = '';
                  }
                  toast.success('Đăng ký nhận bản tin ưu đãi thành công!');
                }}
              >
                <input
                  className="flex-grow bg-surface-container px-6 py-4 rounded-xl border-none focus:ring-2 focus:ring-primary font-body-md outline-none text-on-surface"
                  placeholder="Địa chỉ email của bạn"
                  type="email"
                  required
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-on-primary-container transition-all cursor-pointer whitespace-nowrap"
                >
                  Đăng ký
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
