import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  const categoriesRef = useRef<HTMLElement>(null);
  const roomsRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLElement>(null);
  const newsletterRef = useRef<HTMLElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    Promise.all([getCategories(), fetchProducts(), getActiveCollections()])
      .then(([categoriesData, productsData, collectionsData]) => {
        setCategories(categoriesData);
        setProducts(productsData.slice(0, 4)); // Show first 4 products on homepage
        setCollections(collectionsData);
      })
      .catch(console.error);
  }, []);

  // useGSAP handles cleanup automatically
  useGSAP(() => {
    // 1. Hero Text Entry Animations
    const tl = gsap.timeline();
    tl.from('.hero-badge', { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' })
      .from('.hero-title', { opacity: 0, y: 40, duration: 1, ease: 'power3.out' }, '-=0.5')
      .from('.hero-desc', { opacity: 0, y: 25, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from('.hero-btn', { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out' }, '-=0.5');

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

    // 5. New products card list scroll entry
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

    // 4. Newsletter box zoom & entry
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
        <section className="relative h-[870px] w-full overflow-hidden flex items-center">
          <div className="absolute inset-0 z-0">
            <img
              alt="Hero Banner"
              className="w-full h-full object-cover"
              src="https://res.cloudinary.com/dblkv5veh/image/upload/v1782750523/imgi_57_BST-Coastal-3-3_ziafsm.jpg"
            />
            <div className="absolute inset-0 "></div>
          </div>
          <div className="relative z-10 max-w-container-max mx-auto px-sp-md md:px-lg w-full">
            <div className="max-w-2xl">
              <span className="hero-badge inline-block px-4 py-1.5 mb-sp-md rounded-full bg-primary-container/20 text-primary font-label-md text-label-md uppercase tracking-wider">
                Bộ sưu tập
              </span>
              <h1 className="hero-title font-headline-xl text-headline-xl mb-sp-md text-on-surface leading-[1.1]">
                COASTAL
              </h1>
              <p className="hero-desc font-body-lg text-body-lg text-on-surface-variant mb-sp-lg max-w-lg">
                Coastal với đầy đủ các thiết kế cho mọi không gian trong nhà, mang tới một định nghĩa mới về sự thư thái, thoải mái.
              </p>
              <div className="flex flex-wrap gap-sp-md">
                <button
                  onClick={() => navigate('/collection/coastal')}
                  className="relative overflow-hidden group hero-btn px-10 py-4 border-2 border-primary bg-primary rounded-xl font-label-md text-label-md active:scale-95 cursor-pointer"
                >
                  <span className="absolute inset-0 w-full h-full bg-white origin-right scale-x-0 transition-transform duration-300 ease-out group-hover:origin-left group-hover:scale-x-100"></span>
                  <span className="relative z-10 text-on-primary group-hover:text-primary transition-colors duration-300">
                    Xem bộ sưu tập
                  </span>
                </button>
              </div>
            </div>
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

        {/* New Products Section */}
        <section ref={productsRef} className="py-sp-xl bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-sp-xl gap-sp-md">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Sản phẩm mới nhất</h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                  Cập nhật những thiết kế mới nhất mang hơi thở đương đại và chất liệu thiên nhiên bền bỉ.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {products.map((prod) => {
                const hoverImg = prod.hoverImage || prod.gallery?.find(img => img.url !== prod.image)?.url;
                return (
                  <Link
                    key={prod.id}
                    to={`/product/${prod.id}`}
                    className="product-card-item group block"
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
                      {(prod as any).badge && (
                        <span className="absolute top-4 left-4 bg-primary-fixed text-primary px-3 py-1 rounded-full font-label-sm text-label-sm">
                          {(prod as any).badge}
                        </span>
                      )}
                      {(prod as any).discount && (
                        <span className="absolute top-4 left-4 bg-error-container text-error px-3 py-1 rounded-full font-label-sm text-label-sm">
                          {(prod as any).discount}
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
                      {(prod as any).oldPrice && (
                        <span className="text-on-surface-variant line-through ml-2 font-normal">{(prod as any).oldPrice}</span>
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

        {/* Inspiration / Blog Section */}
        <section className="py-sp-xl bg-surface">
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
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4">
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
                }}
              >
                <input
                  className="flex-grow bg-surface-container px-6 py-4 rounded-xl border-none focus:ring-2 focus:ring-primary font-body-md outline-none"
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
