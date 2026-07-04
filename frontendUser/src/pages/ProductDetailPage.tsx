  import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/useCartStore';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';
import 'react-quill-new/dist/quill.snow.css';

// Register GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

import { fetchProductById, fetchProducts, formatPrice, type ProductFrontend } from '@/services/product.service';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductFrontend | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<ProductFrontend[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<number | string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchProductById(id)
        .then(data => {
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            const firstVariant = data.variants[0];
            setSelectedVariantId(firstVariant.id);
            if (firstVariant.attributes) {
              setSelectedAttributes(firstVariant.attributes);
            } else {
              setSelectedAttributes({});
            }
            
            // Set active image based on the first variant
            if (firstVariant.image_url) {
              setActiveImage(firstVariant.image_url);
            } else if (data.gallery && data.gallery.length > 0) {
              const variantImages = data.gallery.filter((g: any) => g.variant_id === firstVariant.id);
              if (variantImages.length > 0) {
                setActiveImage(variantImages[0].url);
              } else {
                setActiveImage(data.gallery[0].url || data.image);
              }
            } else {
              setActiveImage(data.image);
            }
          } else {
            setSelectedVariantId(null);
            setSelectedAttributes({});
            setActiveImage(data.gallery?.[0]?.url || data.image);
          }
          return fetchProducts();
        })
        .then(all => {
          setRecommendedProducts(all.filter(p => p.id !== id).slice(0, 4));
          setLoading(false);
        })
        .catch(err => {
          console.error('Lỗi khi tải dữ liệu sản phẩm:', err);
          setLoading(false);
        });
    }
  }, [id]);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const currentVariant = product?.variants?.find((v: any) => v.id === selectedVariantId);
  const displayRawPrice = (product?.rawPrice || 0) + (currentVariant?.price_adjustment ? Number(currentVariant.price_adjustment) : 0);
  const displayPrice = formatPrice(displayRawPrice);

  const attributeGroups = useMemo(() => {
    if (!product || !product.variants || product.variants.length === 0) return null;
    const groups: Record<string, Set<string>> = {};
    product.variants.forEach((variant: any) => {
      if (variant.attributes) {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!groups[key]) groups[key] = new Set<string>();
          groups[key].add(value as string);
        });
      }
    });
    return groups;
  }, [product]);

  const handleAttributeSelect = (key: string, value: string) => {
    const newAttributes = { ...selectedAttributes, [key]: value };
    setSelectedAttributes(newAttributes);

    if (product && product.variants) {
      // Find a variant that matches all selected attributes
      const matchingVariant = product.variants.find((v: any) => {
        if (!v.attributes) return false;
        return Object.entries(newAttributes).every(([k, vVal]) => v.attributes[k] === vVal);
      });

      if (matchingVariant) {
        setSelectedVariantId(matchingVariant.id);
        if (matchingVariant.image_url) {
          setActiveImage(matchingVariant.image_url);
        } else if (product.gallery && product.gallery.length > 0) {
          const variantImages = product.gallery.filter(g => g.variant_id === matchingVariant.id);
          if (variantImages.length > 0) {
            setActiveImage(variantImages[0].url);
          } else {
            setActiveImage(product.gallery[0].url);
          }
        }
      } else {
        setSelectedVariantId(null); // No exact match
      }
    }
  };

  const filteredGallery = useMemo(() => {
    if (!product || !product.gallery) return [];
    if (selectedVariantId) {
      const variantImages = product.gallery.filter(g => g.variant_id === selectedVariantId || !g.variant_id);
      // Nếu có ảnh riêng cho biến thể này (có cái thuộc biến thể), hiển thị variantImages
      if (variantImages.some(g => g.variant_id === selectedVariantId)) {
        return variantImages;
      }
    }
    return product.gallery;
  }, [product, selectedVariantId]);

  const handleAddToCart = () => {
    if (!product) return;
    
    // Determine material string for the variant, or default
    let materialStr = product.specs?.['Chất liệu'] || product.specs?.material || 'Mặc định';
    if (currentVariant && currentVariant.attributes && Object.keys(currentVariant.attributes).length > 0) {
      materialStr = Object.values(currentVariant.attributes).join(' - ');
    }
    
    addItem({
      id: `${product.id}-${selectedVariantId || 'base'}`,
      productId: product.id,
      variantId: selectedVariantId,
      name: product.name,
      material: materialStr,
      price: displayPrice,
      rawPrice: displayRawPrice,
      basePrice: product.rawPrice,
      image: currentVariant?.image_url || product.image,
      quantity: quantity,
      availableVariants: product.variants
    });
    toast.success('Đã thêm sản phẩm vào giỏ hàng!');
    // navigate('/cart'); // Optional: Stop auto navigate so user can continue shopping
  };

  const detailContainerRef = useRef<HTMLDivElement>(null);
  const recommendedRef = useRef<HTMLElement>(null);

  // GSAP animations
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('.detail-gallery', { opacity: 0, x: -50, duration: 0.8, ease: 'power3.out' })
      .from('.detail-info-block', { opacity: 0, x: 50, duration: 0.8, ease: 'power3.out' }, '-=0.6');

    gsap.from('.recom-card', {
      opacity: 0,
      y: 40,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: recommendedRef.current,
        start: 'top 80%'
      }
    });
  }, { scope: detailContainerRef });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [dragged, setDragged] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setStartY(e.pageY - scrollContainerRef.current.offsetTop);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setScrollTop(scrollContainerRef.current.scrollTop);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5; // Adjust scroll speed here
    const walkY = (y - startY) * 1.5;
    if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) {
      setDragged(true);
    }
    scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
    scrollContainerRef.current.scrollTop = scrollTop - walkY;
  };

  const handleQuantityChange = (amount: number) => {
    setQuantity((prev) => Math.max(1, prev + amount));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filteredGallery.length <= 1) return;
    const currentIndex = filteredGallery.findIndex(g => g.url === activeImage);
    // If not found in gallery (e.g. main image), start from 0
    if (currentIndex === -1) {
      setActiveImage(filteredGallery[0].url);
      return;
    }
    const nextIndex = (currentIndex + 1) % filteredGallery.length;
    setActiveImage(filteredGallery[nextIndex].url);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filteredGallery.length <= 1) return;
    const currentIndex = filteredGallery.findIndex(g => g.url === activeImage);
    if (currentIndex === -1) {
      setActiveImage(filteredGallery[0].url);
      return;
    }
    const prevIndex = (currentIndex - 1 + filteredGallery.length) % filteredGallery.length;
    setActiveImage(filteredGallery[prevIndex].url);
  };

  if (loading) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24 pb-sp-xl">
          <p className="text-on-surface-variant font-label-md">Đang tải chi tiết sản phẩm...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-sp-xl">
          <p className="text-on-surface-variant font-label-md mb-4">Không tìm thấy sản phẩm.</p>
          <button onClick={() => navigate('/shop')} className="px-6 py-3 bg-primary text-on-primary rounded-full font-label-md cursor-pointer hover:opacity-90">
            Quay lại cửa hàng
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased" ref={detailContainerRef}>
      <Header />

      <main className="pt-24 pb-sp-xl">
        <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 py-sp-md text-on-surface-variant font-label-sm text-label-sm">
            <Link className="hover:text-primary transition-colors" to="/">
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link className="hover:text-primary transition-colors" to="/shop">
              Sản phẩm
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">{product.name}</span>
          </nav>

          {/* Product Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-xl items-start mt-4">
            {/* Left: Gallery */}
            <div className="detail-gallery flex flex-col md:flex-row gap-sp-md lg:gap-sp-lg h-auto md:max-h-[600px] sticky top-28">
              <div 
                className="relative flex-1 aspect-[4/5] md:aspect-auto md:h-[600px] overflow-hidden cursor-zoom-in group order-1 md:order-2"
                onClick={() => setIsZoomOpen(true)}
              >
                <img
                  className="w-full h-full object-cover transition-all duration-700"
                  src={activeImage}
                  alt={product.name}
                />
              </div>
              {filteredGallery && filteredGallery.length > 1 && (
                <div 
                  className={`flex md:flex-col space-x-sp-md md:space-x-0 md:space-y-sp-md overflow-x-auto md:overflow-y-auto scroll-hide py-2 md:py-0 px-1 w-full md:w-20 order-2 md:order-1 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  ref={scrollContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                >
                  {filteredGallery.map((imgObj, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        if (dragged) {
                          e.preventDefault();
                          return;
                        }
                        setActiveImage(imgObj.url);
                      }}
                      className={`flex-shrink-0 w-20 h-20 md:w-full md:h-20 rounded-none overflow-hidden shadow-sm transition-colors border-2 ${
                        activeImage === imgObj.url ? 'border-primary' : 'border-transparent hover:border-primary/50'
                      }`}
                    >
                      <img className="w-full h-full object-cover pointer-events-none" src={imgObj.url} alt={`Gallery index ${idx}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="detail-info-block flex flex-col space-y-sp-md">
              <div className="space-y-2">
                <h1 className="font-headline-lg text-headline-lg text-on-surface">{product.name}</h1>
                <p className="text-2xl text-primary font-bold">{displayPrice}</p>
              </div>

              {/* Selection: Variants */}
              {attributeGroups && Object.keys(attributeGroups).length > 0 ? (
                Object.entries(attributeGroups).map(([key, valueSet]) => (
                  <div key={key} className="space-y-sp-sm">
                    <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      {key}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {Array.from(valueSet).map((val) => {
                        const isSelected = selectedAttributes[key] === val;
                        const isColorAttr = key.toLowerCase().includes('màu') && val.includes('|');
                        const displayVal = isColorAttr ? val.split('|')[0] : val;
                        const colorCode = isColorAttr ? val.split('|')[1] : null;

                        if (isColorAttr && colorCode) {
                          return (
                            <button
                              key={val}
                              onClick={() => handleAttributeSelect(key, val)}
                              className={`relative flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all duration-300 border ${
                                isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-outline-variant hover:border-primary shadow-sm'
                              }`}
                              style={{ backgroundColor: colorCode }}
                              title={displayVal}
                            >
                              <span className="sr-only">{displayVal}</span>
                              {isSelected && (
                                <svg
                                  className="w-4 h-4 text-white mix-blend-difference"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={val}
                            onClick={() => handleAttributeSelect(key, val)}
                            className={`px-3 py-1.5 rounded-full cursor-pointer transition-all duration-300 text-xs font-label-sm border ${
                              isSelected
                                ? 'ring-2 ring-offset-2 ring-primary border-primary bg-primary text-white'
                                : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-primary'
                            }`}
                          >
                            {displayVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : product.variants && product.variants.length > 0 && (
                <div className="space-y-sp-sm">
                  <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                    BIẾN THỂ
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((variant: any) => {
                      const variantLabel = variant.sku || `Biến thể ${variant.id}`;
                      const isSelected = selectedVariantId === variant.id;
                      return (
                        <button
                          key={variant.id}
                          onClick={() => {
                            const newSelectedId = isSelected ? null : variant.id;
                            setSelectedVariantId(newSelectedId);
                            if (newSelectedId && variant.image_url) {
                              setActiveImage(variant.image_url);
                            } else if (!newSelectedId && product.gallery && product.gallery.length > 0) {
                              setActiveImage(product.gallery[0].url);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full cursor-pointer transition-all duration-300 text-xs font-label-sm border ${
                            isSelected
                              ? 'ring-2 ring-offset-2 ring-primary border-primary bg-primary text-white'
                              : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-primary'
                          }`}
                        >
                          {variantLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Specifications (Moved below variants) */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <div className="py-2 space-y-1 !mt-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <p key={key} className="text-body-sm text-on-surface">
                      <span className="font-bold capitalize">{key}: </span>
                      <span className="text-on-surface-variant">{value}</span>
                    </p>
                  ))}
                </div>
              )}

              {/* Selection: Quantity */}
              <div className="flex items-center space-x-sp-lg !mt-3">
                <div className="flex items-center border border-outline-variant rounded-xl bg-surface-container-low px-1 py-0.5">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="p-1 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <span className="w-8 text-center font-label-md text-on-surface">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="p-1 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-sp-md !mt-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-grow bg-primary text-on-primary py-4 rounded-xl font-label-md text-label-md shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer"
                >
                  THÊM VÀO GIỎ HÀNG
                </button>
                <button aria-label="Thêm vào danh sách yêu thích" className="px-4 border border-primary text-primary rounded-xl hover:bg-surface-container transition-colors active:scale-95 cursor-pointer">
                  <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-4 py-sp-md mt-sp-sm border-t border-b border-surface-container-highest">
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">local_shipping</span>
                  <span className="font-label-sm text-xs leading-tight">Giao hàng & Lắp đặt<br/><strong className="text-on-surface font-bold">Miễn phí</strong></span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">shield</span>
                  <span className="font-label-sm text-xs leading-tight">Bảo hành<br/><strong className="text-on-surface font-bold">2 năm</strong></span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">cached</span>
                  <span className="font-label-sm text-xs leading-tight">Đổi trả 1 - 1<br/><strong className="text-on-surface font-bold">Trong 15 ngày</strong></span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
                  <span className="font-label-sm text-xs leading-tight">Chất liệu<br/><strong className="text-on-surface font-bold">Đạt chuẩn quốc tế</strong></span>
                </div>
              </div>

              {/* Accordion */}
              <div className="pt-sp-md space-y-0">
                <div className="border-b border-surface-container-highest">
                  <button
                    onClick={() => setIsShippingOpen(!isShippingOpen)}
                    className="w-full py-sp-md flex justify-between items-center text-left hover:text-primary transition-colors group cursor-pointer"
                  >
                    <span className="font-label-md text-label-md">VẬN CHUYỂN &amp; ĐỔI TRẢ</span>
                    <span
                      className={`material-symbols-outlined transition-transform duration-300 ${
                        isShippingOpen ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      isShippingOpen ? 'max-h-40' : 'max-h-0'
                    }`}
                  >
                    <p className="pb-sp-md text-on-surface-variant font-body-sm leading-relaxed">
                      Giao hàng miễn phí tại Hà Nội &amp; TP.HCM cho đơn hàng trên 5.000.000₫. Thời gian giao hàng từ
                      3-5 ngày làm việc. Đổi trả trong vòng 15 ngày nếu có lỗi từ nhà sản xuất.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rich Content / Dimensions Section */}
          <section className="mt-20 border-t border-outline-variant pt-16 pb-10">
            {/* Description Section */}
            <div className="max-w-4xl mx-auto mb-24 px-4 md:px-0">
              <div className="flex flex-col items-center mb-10">
                <h2 className="font-headline-md text-3xl md:text-4xl text-on-surface mb-4">
                  Mô tả sản phẩm
                </h2>
                <div className="w-16 h-1 bg-[#5A6B53] rounded-full"></div>
              </div>
              <div className="font-body-md text-on-surface-variant leading-relaxed">
                {product.desc ? (
                  <div>
                    <div className={`relative overflow-hidden transition-all duration-500 ease-in-out ${descExpanded ? 'max-h-[9999px]' : 'max-h-[420px]'}`}>
                      <div className="ql-snow">
                        <div
                          className="ql-editor prose prose-base md:prose-lg max-w-none !p-0 prose-headings:font-headline-md prose-headings:text-on-surface prose-headings:mt-10 prose-headings:mb-4 prose-headings:font-bold prose-p:text-slate-700 prose-p:mb-6 prose-p:leading-loose prose-a:text-primary prose-img:mx-auto prose-img:my-10 prose-img:w-full [&_span]:!bg-transparent [&_p]:!bg-transparent [&_h1]:!bg-transparent [&_h2]:!bg-transparent [&_h3]:!bg-transparent [&_h4]:!bg-transparent [&_strong]:!bg-transparent [&_em]:!bg-transparent"
                          dangerouslySetInnerHTML={{ __html: product.desc }}
                        />
                      </div>
                      {!descExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FAF7F2] to-transparent pointer-events-none" />
                      )}
                    </div>
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() => setDescExpanded(prev => !prev)}
                        className="flex items-center gap-2 px-6 py-2.5 border border-[#5A6B53] text-[#5A6B53] rounded-full text-sm font-semibold hover:bg-[#5A6B53] hover:text-white transition-all duration-300"
                      >
                        <span className="material-symbols-outlined text-base leading-none">{descExpanded ? 'expand_less' : 'expand_more'}</span>
                        {descExpanded ? 'Thu gọn' : 'Xem thêm'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center max-w-2xl mx-auto">
                    <p>Sản phẩm mang phong cách tối giản, tập trung vào công năng sử dụng. Với thiết kế tinh tế, tỉ mỉ trong từng đường nét, mang đến vẻ đẹp hiện đại và ấm cúng cho không gian nội thất của bạn.</p>
                    <p>Được chế tác từ chất liệu gỗ thân thiện với môi trường, trải qua quy trình tẩm sấy và xử lý nghiêm ngặt nhằm chống mối mọt, cong vênh, đảm bảo độ bền bỉ vượt thời gian.</p>
                  </div>
                )}
              </div>
            </div>


          </section>

          {/* Suggestion Section */}
          <section ref={recommendedRef} className="mt-sp-xl">
            <h2 className="font-headline-md text-headline-md mb-sp-lg">Sản phẩm liên quan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
              {recommendedProducts.map((p) => {
                const hoverImg = p.hoverImage || (p.gallery && p.gallery.length > 1 ? p.gallery[1].url : null);
                return (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="recom-card group block"
                  >
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white mb-4">
                      <img
                        className={`absolute inset-0 w-full h-full object-contain p-4 transition-opacity duration-500 ${hoverImg ? 'opacity-100 group-hover:opacity-0' : ''}`}
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                      />
                      {hoverImg && (
                        <img
                          className="absolute inset-0 w-full h-full object-contain p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          src={hoverImg}
                          alt={`${p.name} alternate view`}
                          loading="lazy"
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        aria-label={`Thêm ${p.name} vào yêu thích`}
                        className="absolute top-4 right-4 w-11 h-11 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                      </button>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface mb-1 line-clamp-1">{p.name}</h2>
                    <p className="font-label-md text-label-md text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {p.price}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* Zoom Modal */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setIsZoomOpen(false)}
        >
          <img 
            src={activeImage} 
            alt={product.name} 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <button 
            className="absolute top-4 right-4 text-white hover:text-primary transition-colors p-2 cursor-pointer bg-black/50 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-3xl block">close</span>
          </button>

          {/* Navigation Buttons */}
          {product.gallery && product.gallery.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors p-3 cursor-pointer bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center"
                onClick={handlePrevImage}
              >
                <span className="material-symbols-outlined text-4xl block">chevron_left</span>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors p-3 cursor-pointer bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center"
                onClick={handleNextImage}
              >
                <span className="material-symbols-outlined text-4xl block">chevron_right</span>
              </button>
            </>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}
