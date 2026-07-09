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
import { productDetailImage, productCardImage } from '@/utils/cloudinaryUrl';

const COLOR_MAP: Record<string, string> = {
  'trắng': '#ffffff',
  'đen': '#000000',
  'xám': '#808080',
  'đỏ': '#ff0000',
  'xanh lá': '#008000',
  'xanh dương': '#0000ff',
  'xanh': '#2b6cb0',
  'vàng': '#ecc94b',
  'cam': '#dd6b20',
  'hồng': '#ed64a6',
  'nâu': '#744210',
  'kem': '#fffdd0',
  'be': '#f5f5dc',
  'gỗ': '#8b5a2b',
  'white': '#ffffff',
  'black': '#000000',
  'gray': '#808080',
  'red': '#ff0000',
  'green': '#008000',
  'blue': '#0000ff',
  'yellow': '#ecc94b',
  'orange': '#dd6b20',
  'pink': '#ed64a6',
  'brown': '#744210',
  'beige': '#f5f5dc',
};

const formatAttributes = (attributes: Record<string, any> | undefined) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .join('|');
};

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
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ transformOrigin: 'center' });
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState<'idle' | 'loading' | 'success'>('idle');

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
          return fetchProducts().then(all => {
            const otherProducts = all.filter(p => p.id !== id);
            const sameCategory = otherProducts.filter(p => p.category === data.category);
            
            let recommended = [...sameCategory];
            if (recommended.length < 4) {
              const diffCategory = otherProducts.filter(p => p.category !== data.category);
              recommended = [...recommended, ...diffCategory];
            }
            
            setRecommendedProducts(recommended.slice(0, 4));
            setLoading(false);
          });
        })
        .catch(err => {
          console.error('Lỗi khi tải dữ liệu sản phẩm:', err);
          setLoading(false);
        });
    }
  }, [id]);
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const isSimpleProduct = useMemo(() => {
    if (!product || !product.variants || product.variants.length === 0) return true;
    if (product.variants.length === 1) {
      const firstVar = product.variants[0];
      return !firstVar.attributes || Object.keys(firstVar.attributes).length === 0;
    }
    return false;
  }, [product]);

  const currentVariant = product?.variants?.find((v: any) => v.id === selectedVariantId);
  const displayRawPrice = (product?.rawPrice || 0) + (currentVariant?.price_adjustment ? Number(currentVariant.price_adjustment) : 0);
  const displayPrice = formatPrice(displayRawPrice);

  const displayRawOldPrice = product?.oldPrice ? ((product?.rawBasePrice || 0) + (currentVariant?.price_adjustment ? Number(currentVariant.price_adjustment) : 0)) : null;
  const displayOldPrice = displayRawOldPrice ? formatPrice(displayRawOldPrice) : null;

  useEffect(() => {
    if (currentVariant) {
      const maxStock = currentVariant.stock || 0;
      if (maxStock > 0) {
        if (quantity > maxStock) {
          setQuantity(maxStock);
          toast.error(`Đã điều chỉnh số lượng về tối đa trong kho (${maxStock} sản phẩm)`);
        }
      } else {
        setQuantity(1);
      }
    }
  }, [selectedVariantId, currentVariant]);

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

    const itemId = `${product.id}-${selectedVariantId || 'base'}`;
    const existingItem = useCartStore.getState().items.find((i) => i.id === itemId);
    const existingQty = existingItem ? existingItem.quantity : 0;
    const maxStock = currentVariant ? (currentVariant.stock || 0) : 0;

    if (existingQty + quantity > maxStock) {
      if (existingQty >= maxStock) {
        toast.error(`Bạn đã thêm số lượng tối đa hiện có của sản phẩm này trong kho vào giỏ hàng (${maxStock} sản phẩm).`);
      } else {
        toast.error(`Không thể thêm. Giỏ hàng đã có ${existingQty} sản phẩm, trong kho chỉ còn lại ${maxStock} sản phẩm.`);
      }
      return;
    }

    setIsAdding('loading');

    // Determine material string for the variant, or default
    let materialStr = product.specs?.['Chất liệu'] || product.specs?.material || 'Mặc định';
    if (currentVariant && currentVariant.attributes && Object.keys(currentVariant.attributes).length > 0) {
      materialStr = formatAttributes(currentVariant.attributes);
    }

    setTimeout(() => {
      addItem({
        id: itemId,
        productId: product.id,
        variantId: selectedVariantId,
        name: product.name,
        material: materialStr,
        price: displayPrice,
        rawPrice: displayRawPrice,
        basePrice: product.rawPrice,
        baseOldPrice: product.rawBasePrice || product.rawPrice,
        rawOldPrice: displayRawOldPrice || displayRawPrice,
        image: currentVariant?.image_url || product.image,
        quantity: quantity,
        availableVariants: product.variants
      });
      setIsAdding('success');
      toast.success('Đã thêm sản phẩm vào giỏ hàng!');

      setTimeout(() => {
        setIsAdding('idle');
      }, 2000);
    }, 600);
  };

  const handleBuyNow = () => {
    if (!product) return;

    const itemId = `${product.id}-${selectedVariantId || 'base'}`;
    const existingItem = useCartStore.getState().items.find((i) => i.id === itemId);
    const existingQty = existingItem ? existingItem.quantity : 0;
    const maxStock = currentVariant ? (currentVariant.stock || 0) : 0;

    if (existingQty + quantity > maxStock) {
      if (existingQty >= maxStock) {
        toast.error(`Bạn đã thêm số lượng tối đa hiện có của sản phẩm này trong kho vào giỏ hàng (${maxStock} sản phẩm).`);
      } else {
        toast.error(`Không thể thêm. Giỏ hàng đã có ${existingQty} sản phẩm, trong kho chỉ còn lại ${maxStock} sản phẩm.`);
      }
      navigate('/checkout');
      return;
    }

    let materialStr = product.specs?.['Chất liệu'] || product.specs?.material || 'Mặc định';
    if (currentVariant && currentVariant.attributes && Object.keys(currentVariant.attributes).length > 0) {
      materialStr = formatAttributes(currentVariant.attributes);
    }

    addItem({
      id: itemId,
      productId: product.id,
      variantId: selectedVariantId,
      name: product.name,
      material: materialStr,
      price: displayPrice,
      rawPrice: displayRawPrice,
      basePrice: product.rawPrice,
      baseOldPrice: product.rawBasePrice || product.rawPrice,
      rawOldPrice: displayRawOldPrice || displayRawPrice,
      image: currentVariant?.image_url || product.image,
      quantity: quantity,
      availableVariants: product.variants
    });

    toast.success('Đã thêm vào giỏ hàng và chuyển tới thanh toán!');
    navigate('/checkout');
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
    const maxStock = currentVariant ? (currentVariant.stock || 0) : 0;
    setQuantity((prev) => {
      const nextVal = prev + amount;
      if (nextVal < 1) return 1;
      if (nextVal > maxStock) {
        toast.error(`Chỉ còn ${maxStock} sản phẩm trong kho`);
        return maxStock;
      }
      return nextVal;
    });
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(1.5)',
    });
  };

  const handleImageMouseLeave = () => {
    setIsHovered(false);
    setZoomStyle({
      transformOrigin: 'center',
      transform: 'scale(1)',
    });
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
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-sp-xl items-start mt-4">
            {/* Left: Gallery */}
            <div className="detail-gallery flex flex-col md:flex-row gap-sp-md lg:gap-sp-lg h-auto md:max-h-[680px] sticky top-28">
              <div
                className="relative flex-1 aspect-[4/5] md:aspect-auto md:h-[680px] overflow-hidden cursor-zoom-in group order-1 md:order-2 rounded-2xl bg-white shadow-sm border border-outline-variant/30"
                onClick={() => setIsZoomOpen(true)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseMove={handleImageMouseMove}
                onMouseLeave={handleImageMouseLeave}
              >
                <img
                  className="w-full h-full object-cover transition-transform duration-100 ease-out"
                  src={productDetailImage(activeImage)}
                  alt={product.name}
                  style={isHovered ? zoomStyle : undefined}
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
                      className={`flex-shrink-0 w-20 h-20 md:w-full md:h-20 rounded-none overflow-hidden shadow-sm transition-colors border-2 ${activeImage === imgObj.url ? 'border-primary' : 'border-transparent hover:border-primary/50'
                        }`}
                    >
                      <img className="w-full h-full object-cover pointer-events-none" src={productCardImage(imgObj.url)} alt={`Gallery index ${idx}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="detail-info-block flex flex-col space-y-sp-md">
              <div className="border-b border-outline-variant/30 pb-6 mb-2 space-y-3">
                <div className="space-y-2">
                  <h1 className="font-headline-lg text-3xl md:text-4xl text-on-surface tracking-wide font-semibold leading-tight">
                    {product.name}
                  </h1>
                  <div className="flex items-baseline space-x-3">
                    <p className="text-3xl text-primary font-light font-sans tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {displayPrice}
                    </p>
                    {displayOldPrice && (
                      <>
                        <p className="text-lg text-on-surface-variant/60 line-through font-sans" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {displayOldPrice}
                        </p>
                        <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded uppercase tracking-wider shadow-sm">
                          {product.discount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-xs text-on-surface-variant font-label-sm uppercase tracking-widest">
                  <span>Mã SP: {product.sku || product.id}</span>
                  <span>•</span>
                  <span>Đánh giá: {product.rating} ★</span>
                </div>
              </div>

              {/* Selection: Variants */}
              {!isSimpleProduct && (
                attributeGroups && Object.keys(attributeGroups).length > 0 ? (
                  Object.entries(attributeGroups).map(([key, valueSet]) => {
                    const isColorGroup = key.toLowerCase().includes('màu');
                    const selectedVal = selectedAttributes[key];
                    const displaySelectedVal = selectedVal
                      ? (selectedVal.includes('|') ? selectedVal.split('|')[0] : selectedVal)
                      : '';

                    return (
                      <div key={key} className="space-y-sp-sm">
                        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                          {key}
                          {isColorGroup && displaySelectedVal && (
                            <span className="normal-case text-on-surface ml-1.5 font-bold">: {displaySelectedVal}</span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {Array.from(valueSet).map((val) => {
                            const isSelected = selectedAttributes[key] === val;
                            const isColorAttr = key.toLowerCase().includes('màu');
                            let displayVal = val;
                            let colorCode: string | null = null;

                            if (isColorAttr) {
                              if (val.includes('|')) {
                                const parts = val.split('|');
                                displayVal = parts[0];
                                colorCode = parts[1];
                              } else {
                                const cleanVal = val.trim().toLowerCase();
                                colorCode = COLOR_MAP[cleanVal] || null;
                              }
                            }

                            if (isColorAttr && colorCode) {
                              return (
                                <button
                                  key={val}
                                  onClick={() => handleAttributeSelect(key, val)}
                                  className={`relative flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all duration-500 border ${isSelected
                                      ? 'border-primary ring-[1.5px] ring-primary ring-offset-[3px] scale-105'
                                      : 'border-outline-variant hover:ring-[1px] hover:ring-outline hover:ring-offset-[2px] hover:scale-105 shadow-sm'
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
                                className={`px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 text-xs font-label-md border font-semibold ${isSelected
                                    ? 'border-primary bg-primary text-white shadow-sm'
                                    : 'border-outline-variant bg-transparent text-on-surface hover:bg-on-surface hover:text-surface'
                                  }`}
                              >
                                {displayVal}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
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
                            className={`px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 text-xs font-label-md border font-semibold ${isSelected
                                ? 'border-primary bg-primary text-white shadow-sm'
                                : 'border-outline-variant bg-transparent text-on-surface hover:bg-on-surface hover:text-surface'
                              }`}
                          >
                            {variantLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              {/* Specifications (Moved below variants) */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <div className="py-2 space-y-1 !mt-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <p key={key} className="text-body-sm text-on-surface">
                      <span className="font-bold capitalize">{key}: </span><br /> 
                      <span className="text-on-surface-variant whitespace-pre-line">{value}</span>
                    </p>
                  ))}
                </div>
              )}

              {/* Trạng thái tồn kho của biến thể */}
              <div className="text-sm flex items-center gap-2 !mt-4">
                <span className="text-on-surface-variant font-medium">Trạng thái:</span>
                {currentVariant ? (
                  currentVariant.stock > 0 ? (
                    <span className="text-emerald-600 font-bold">
                      Còn {currentVariant.stock} sản phẩm
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold">
                      Hết hàng
                    </span>
                  )
                ) : (
                  <span className="text-rose-600 font-bold">
                    Hết hàng
                  </span>
                )}
              </div>

              {/* Selection: Quantity */}
              <div className="flex items-center space-x-sp-lg !mt-3">
                <div className="flex items-center border border-outline-variant rounded-xl bg-surface-container-low px-1 py-0.5">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="p-1 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <input
                    type="text"
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      const maxStock = currentVariant ? (currentVariant.stock || 0) : 0;
                      if (val === '') {
                        setQuantity(0);
                      } else {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed) && parsed > 0 && /^\d+$/.test(val)) {
                          if (parsed > maxStock) {
                            toast.error(`Chỉ còn ${maxStock} sản phẩm trong kho`);
                            setQuantity(maxStock);
                          } else {
                            setQuantity(parsed);
                          }
                        }
                      }
                    }}
                    onBlur={() => {
                      const maxStock = currentVariant ? (currentVariant.stock || 0) : 0;
                      if (quantity < 1) {
                        setQuantity(1);
                      } else if (quantity > maxStock) {
                        setQuantity(maxStock);
                      }
                    }}
                    className="w-12 text-center font-label-md text-on-surface bg-transparent focus:outline-none font-bold"
                  />
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="p-1 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-sp-md !mt-3 w-full">
                {(() => {
                  const isOutOfStock = !currentVariant || (currentVariant.stock || 0) <= 0;
                  return (
                    <>
                      <button
                        onClick={handleAddToCart}
                        disabled={isAdding !== 'idle' || isOutOfStock}
                        className={`flex-1 py-4 border rounded-xl font-label-md text-label-md shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center space-x-2 ${isOutOfStock
                            ? 'bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed shadow-none hover:shadow-none active:scale-100'
                            : isAdding === 'success'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100'
                              : 'border-primary text-primary bg-transparent hover:bg-primary hover:text-white'
                          }`}
                      >
                        {isOutOfStock ? (
                          <span>HẾT HÀNG</span>
                        ) : isAdding === 'loading' ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>ĐANG XỬ LÝ...</span>
                          </>
                        ) : isAdding === 'success' ? (
                          <>
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            <span>ĐÃ THÊM!</span>
                          </>
                        ) : (
                          <span>THÊM VÀO GIỎ</span>
                        )}
                      </button>
                      <button
                        onClick={handleBuyNow}
                        disabled={isOutOfStock}
                        className={`flex-1 py-4 border rounded-xl font-label-md text-label-md shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center ${isOutOfStock
                            ? 'bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed shadow-none hover:shadow-none active:scale-100'
                            : 'bg-primary text-on-primary border-primary hover:opacity-95'
                          }`}
                      >
                        <span>MUA NGAY</span>
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-sp-md mt-sp-sm border-t border-b border-outline-variant/30">
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">local_shipping</span>
                  <span className="font-label-sm text-xs leading-tight">Giao hàng & Lắp đặt<br /><strong className="text-on-surface font-bold">Miễn phí</strong></span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">shield</span>
                  <span className="font-label-sm text-xs leading-tight">Bảo hành<br /><strong className="text-on-surface font-bold">2 năm</strong></span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">cached</span>
                  <span className="font-label-sm text-xs leading-tight">Đổi trả 1 - 1<br /><strong className="text-on-surface font-bold">Trong 15 ngày</strong></span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
                  <span className="font-label-sm text-xs leading-tight">Chất liệu<br /><strong className="text-on-surface font-bold">Đạt chuẩn quốc tế</strong></span>
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
                      className={`material-symbols-outlined transition-transform duration-300 ${isShippingOpen ? 'rotate-180' : ''
                        }`}
                    >
                      expand_more
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${isShippingOpen ? 'max-h-40' : 'max-h-0'
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
          <section className="mt-20 border-t border-outline-variant pt-16 pb-5">
            {/* Description Section */}
            <div className="max-w-4xl mx-auto px-4 md:px-0">
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
                      <div className="tiptap">
                        <style>{`
                          .tiptap { max-width: 100%; word-break: normal; overflow-wrap: break-word; word-wrap: break-word; }
                          .tiptap p { margin-bottom: 0.75rem; line-height: 1.625; color: #334155; }
                          .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #1e293b; }
                          .tiptap h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b; }
                          .tiptap h3 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; color: #1e293b; }
                          .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                          .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                          .tiptap blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; font-style: italic; color: #475569; margin: 0.75rem 0; }
                          .tiptap code { background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
                          .tiptap img { max-width: 100%; height: auto; display: block; margin: 1.5rem auto; border-radius: 8px; }
                          
                          /* Table styles */
                          .tiptap table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; overflow: hidden; }
                          .tiptap th, .tiptap td { border: 1px solid #cbd5e1; padding: 0.5rem; text-align: left; }
                          .tiptap th { background-color: #f1f5f9; font-weight: 600; }
                          .tiptap mark { background-color: #fef08a; padding: 0.1rem 0.25rem; border-radius: 4px; color: #1e293b; }
                          .tiptap hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.5rem 0; }
                          .tiptap pre { background-color: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 1rem 0; }
                        `}</style>
                        <div dangerouslySetInnerHTML={{ __html: product.desc }} />
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
          <section ref={recommendedRef} className="mt-8">
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
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/30 backdrop-blur-md border border-white/20 mb-1">
                      <img
                        className={`absolute inset-0 w-full h-full object-contain p-0 transition-opacity duration-500 mix-blend-multiply ${hoverImg ? 'opacity-100 group-hover:opacity-0' : ''}`}
                        src={productCardImage(p.image)}
                        alt={p.name}
                        loading="lazy"
                      />
                      {hoverImg && (
                        <img
                          className="absolute inset-0 w-full h-full object-contain p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-multiply"
                          src={productCardImage(hoverImg)}
                          alt={`${p.name} alternate view`}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <h3 className="font-headline-md text-base md:text-lg font-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors duration-300">{p.name}</h3>
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
            src={productDetailImage(activeImage)}
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
