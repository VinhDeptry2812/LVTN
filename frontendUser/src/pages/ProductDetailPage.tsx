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

import { fetchProductById, fetchProducts, formatPrice, type ProductFrontend, fetchRelatedProducts, fetchFrequentlyBoughtTogether } from '@/services/product.service';
import { productDetailImage, productCardImage } from '@/utils/cloudinaryUrl';
import { fetchProductReviews, type Review, type ProductReviewsResponse } from '@/services/review.service';
import ProductSectionCarousel from '@/components/ProductSectionCarousel';

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
const pastelBgClasses = [
  'bg-red-50 text-red-800 border border-red-200/50',
  'bg-blue-50 text-blue-800 border border-blue-200/50',
  'bg-green-50 text-green-800 border border-green-200/50',
  'bg-amber-50 text-amber-800 border border-amber-200/50',
  'bg-purple-50 text-purple-800 border border-purple-200/50',
  'bg-pink-50 text-pink-800 border border-pink-200/50',
  'bg-indigo-50 text-indigo-800 border border-indigo-200/50',
  'bg-teal-50 text-teal-800 border border-teal-200/50',
];

const getAvatarStyle = (name: string) => {
  const code = name ? name.charCodeAt(0) : 0;
  return pastelBgClasses[code % pastelBgClasses.length];
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
  const [reviewsData, setReviewsData] = useState<ProductReviewsResponse>({
    reviews: [],
    averageRating: 0,
    totalReviews: 0,
    filteredTotal: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 6,
    allImages: [],
    starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  // States cho bộ lọc, sắp xếp, phân trang nhận xét Server-side (Option 1B)
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'all'>('all');
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [reviewPage, setReviewPage] = useState<number>(1);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  const [recommendedProducts, setRecommendedProducts] = useState<ProductFrontend[]>([]);
  const [frequentlyBoughtProducts, setFrequentlyBoughtProducts] = useState<ProductFrontend[]>([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<ProductFrontend[]>([]);
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
          // Gọi song song hai API gợi ý từ Backend
          Promise.all([
            fetchRelatedProducts(id),
            fetchFrequentlyBoughtTogether(id)
          ])
            .then(([related, together]) => {
              setRecommendedProducts(related);
              setFrequentlyBoughtProducts(together);
              setLoading(false);
            })
            .catch(err => {
              console.error('Lỗi khi tải các sản phẩm gợi ý:', err);
              setLoading(false);
            });
        })
        .catch(err => {
          console.error('Lỗi khi tải dữ liệu sản phẩm:', err);
          setLoading(false);
        });
    }
  }, [id]);

  // Effect tải trước (preload) tất cả ảnh kích thước lớn để khi người dùng click vào thumbnail thì ảnh chuyển tức thì (0ms)
  useEffect(() => {
    if (product) {
      const urlsToPreload = new Set<string>();
      if (product.image) urlsToPreload.add(product.image);
      if (product.gallery && product.gallery.length > 0) {
        product.gallery.forEach(g => { if (g.url) urlsToPreload.add(g.url); });
      }
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(v => { if (v.image_url) urlsToPreload.add(v.image_url); });
      }

      urlsToPreload.forEach(url => {
        const imgDetail = new Image();
        imgDetail.src = productDetailImage(url);
      });
    }
  }, [product]);

  // Effect quản lý và lưu danh sách sản phẩm vừa xem vào localStorage
  useEffect(() => {
    if (product) {
      try {
        const stored = localStorage.getItem('recently_viewed_products');
        let list: ProductFrontend[] = stored ? JSON.parse(stored) : [];
        
        // Lấy danh sách hiển thị (loại bỏ sản phẩm đang xem hiện tại)
        const filtered = list.filter((p) => String(p.id) !== String(product.id));
        setRecentlyViewedProducts(filtered);

        // Lưu sản phẩm hiện tại vào đầu danh sách lịch sử (tối đa 10 sản phẩm)
        const updatedList = [product, ...list.filter((p) => String(p.id) !== String(product.id))].slice(0, 10);
        localStorage.setItem('recently_viewed_products', JSON.stringify(updatedList));
      } catch (e) {
        console.error('Lỗi khi lưu sản phẩm vừa xem:', e);
      }
    }
  }, [product]);

  // Effect tải đánh giá với phân trang Server-side (Option 1B)
  useEffect(() => {
    if (id) {
      setReviewsLoading(true);
      fetchProductReviews(id, {
        page: reviewPage,
        limit: 6, // 6 reviews / page (tạo thành 3 hàng x 2 cột hoàn hảo)
        rating: reviewRatingFilter,
        sort: reviewSort,
      })
        .then(data => {
          setReviewsData(data);
          setReviewsLoading(false);
        })
        .catch(err => {
          console.error('Lỗi khi tải đánh giá sản phẩm:', err);
          setReviewsLoading(false);
        });
    }
  }, [id, reviewPage, reviewRatingFilter, reviewSort]);

  // Hàm chuyển bộ lọc & tự động quay lại trang 1
  const handleRatingFilterChange = (star: number | 'all') => {
    setReviewRatingFilter(star);
    setReviewPage(1);
  };

  const handleSortChange = (sortVal: 'newest' | 'highest' | 'lowest') => {
    setReviewSort(sortVal);
    setReviewPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setReviewPage(newPage);
    if (reviewsSectionRef.current) {
      reviewsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Không dùng grid ảnh thực tế riêng biệt nữa vì đã đưa ảnh vào từng card nhận xét kiểu MOHO

  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomType, setZoomType] = useState<'product' | 'review'>('product');
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
  const recommendedRef = useRef<HTMLDivElement>(null);

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
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    startYRef.current = e.pageY - scrollContainerRef.current.offsetTop;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
    scrollTopRef.current = scrollContainerRef.current.scrollTop;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startXRef.current) * 1.5;
    const walkY = (y - startYRef.current) * 1.5;
    if (Math.abs(walkX) > 12 || Math.abs(walkY) > 12) {
      hasDraggedRef.current = true;
    }
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walkX;
    scrollContainerRef.current.scrollTop = scrollTopRef.current - walkY;
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
      const nextImg = filteredGallery[0].url;
      setActiveImage(nextImg);
      setZoomImage(nextImg);
      return;
    }
    const nextIndex = (currentIndex + 1) % filteredGallery.length;
    const nextImg = filteredGallery[nextIndex].url;
    setActiveImage(nextImg);
    setZoomImage(nextImg);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filteredGallery.length <= 1) return;
    const currentIndex = filteredGallery.findIndex(g => g.url === activeImage);
    if (currentIndex === -1) {
      const prevImg = filteredGallery[0].url;
      setActiveImage(prevImg);
      setZoomImage(prevImg);
      return;
    }
    const prevIndex = (currentIndex - 1 + filteredGallery.length) % filteredGallery.length;
    const prevImg = filteredGallery[prevIndex].url;
    setActiveImage(prevImg);
    setZoomImage(prevImg);
  };

  if (loading) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32 md:pt-24 pb-sp-xl">
          <p className="text-on-surface-variant font-label-md">Đang tải chi tiết sản phẩm...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product || !product.is_active) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center pt-32 md:pt-24 pb-sp-xl">
          <p className="text-on-surface-variant font-label-md mb-4">Sản phẩm này tạm thời ngưng kinh doanh hoặc không tồn tại.</p>
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

      <main className="pt-32 md:pt-24 pb-sp-xl">
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
            <div className="detail-gallery flex flex-col md:flex-row gap-sp-md lg:gap-sp-lg h-auto md:max-h-[680px] lg:sticky lg:top-28">
              <div
                className="relative flex-1 aspect-[4/5] md:aspect-auto md:h-[680px] overflow-hidden cursor-pointer group order-1 md:order-2 rounded-2xl bg-white shadow-sm border border-outline-variant/30"
                onClick={() => {
                  setZoomImage(activeImage);
                  setZoomType('product');
                  setIsZoomOpen(true);
                }}
              >
                <img
                  className="w-full h-full object-cover"
                  src={productDetailImage(activeImage)}
                  alt={product.name}
                />
              </div>
              {filteredGallery && filteredGallery.length > 1 && (
                <div
                  className="flex md:flex-col space-x-sp-md md:space-x-0 md:space-y-sp-md overflow-x-auto md:overflow-y-auto scroll-hide py-2 md:py-0 px-1 w-full md:w-20 order-2 md:order-1 cursor-grab active:cursor-grabbing select-none"
                  ref={scrollContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                >
                  {filteredGallery.map((imgObj, idx) => (
                    <button
                      key={idx}
                      onMouseEnter={() => {
                        // Preload ảnh lớn khi rề chuột vào thumbnail
                        if (imgObj.url) {
                          const img = new Image();
                          img.src = productDetailImage(imgObj.url);
                        }
                      }}
                      onClick={(e) => {
                        if (hasDraggedRef.current) {
                          e.preventDefault();
                          return;
                        }
                        setActiveImage(imgObj.url);
                      }}
                      className={`flex-shrink-0 w-20 h-20 md:w-full md:h-20 rounded-none overflow-hidden shadow-sm transition-all duration-200 border-2 cursor-pointer ${activeImage === imgObj.url ? 'border-primary scale-[0.98]' : 'border-transparent hover:border-primary/50 hover:opacity-90'
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
                <div className="flex items-center space-x-2 text-xs text-[#5A6B53] font-label-sm uppercase tracking-widest">
                  <span className="text-on-surface-variant">Mã SP: {product.sku || product.id}</span>
                  <span className="text-on-surface-variant">•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-on-surface-variant">Đánh giá:</span>
                    {reviewsData.totalReviews > 0 ? (
                      <span className="flex items-center gap-1 font-bold text-amber-500 normal-case">
                        {reviewsData.averageRating} ★ ({reviewsData.totalReviews})
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/60 font-medium normal-case">Chưa có đánh giá</span>
                    )}
                  </div>
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
            <div className="max-w-5xl mx-auto px-4 md:px-0">
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

          {/* Reviews Section - Seamless Organic Minimalist Layout with Server-Side Pagination */}
          <section ref={reviewsSectionRef} className="mt-16 pt-12 border-t border-[#EBE5DB] w-full">
            
            {/* Section Heading */}
            <div className="flex flex-col items-center mb-10 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5A6B53] mb-2">
                ĐÁNH GIÁ TỪ KHÁCH HÀNG
              </span>
              <h2 className="font-headline-md text-3xl md:text-4xl text-on-surface mb-3 font-semibold">
                Khách hàng nhận xét
              </h2>
              <div className="w-12 h-0.5 bg-[#5A6B53] rounded-full"></div>
            </div>

            {/* Filter Pills & Sort Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE5DB] pb-4 mb-6">
              
              {/* Star Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleRatingFilterChange('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                    reviewRatingFilter === 'all'
                      ? 'bg-[#5A6B53] border-[#5A6B53] text-white shadow-2xs'
                      : 'border-[#EBE5DB] text-on-surface-variant bg-white hover:border-[#5A6B53] hover:text-[#5A6B53]'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${reviewRatingFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {reviewsData.totalReviews}
                  </span>
                </button>

                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = reviewsData.starCounts ? (reviewsData.starCounts as any)[stars] || 0 : 0;
                  const isSelected = reviewRatingFilter === stars;
                  return (
                    <button
                      key={stars}
                      onClick={() => handleRatingFilterChange(stars)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#5A6B53] border-[#5A6B53] text-white shadow-2xs'
                          : 'border-[#EBE5DB] text-on-surface-variant bg-white hover:border-[#5A6B53] hover:text-[#5A6B53]'
                      }`}
                    >
                      <span>{stars}</span>
                      <span className="material-symbols-outlined text-xs text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-full ml-0.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">sort</span>
                  Sắp xếp:
                </span>
                <select
                  value={reviewSort}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  className="bg-white border border-[#EBE5DB] text-on-surface text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A6B53] cursor-pointer"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="highest">Đánh giá cao nhất</option>
                  <option value="lowest">Đánh giá thấp nhất</option>
                </select>
              </div>
            </div>

            {/* Review Cards List - SEAMLESS STREAM (NO BOXES) */}
            <div className="relative min-h-[150px]">
              {reviewsLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-10 rounded-xl">
                  <div className="flex items-center gap-2 text-[#5A6B53] font-semibold text-sm">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Đang nạp đánh giá...
                  </div>
                </div>
              )}

              {reviewsData.reviews.length > 0 ? (
                <div className="divide-y divide-[#EBE5DB]">
                  {reviewsData.reviews.map((rev: Review) => {
                    const avatarColorClass = getAvatarStyle(rev.user?.name || 'Khách');
                    const firstLetter = rev.user?.name ? rev.user.name.charAt(0).toUpperCase() : 'K';
                    const hasImage = rev.images && rev.images.length > 0;

                    return (
                      <div
                        key={rev.id}
                        className="py-6 first:pt-2 last:pb-2 transition-colors duration-200"
                      >
                        {/* Header: User Profile & Rating */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm tracking-wider ${avatarColorClass}`}>
                              {firstLetter}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-on-surface text-sm">
                                  {rev.user?.name || 'Khách hàng'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                  <span className="material-symbols-outlined text-[12px] text-emerald-600">verified</span>
                                  Đã mua hàng
                                </span>
                              </div>
                              
                              {/* Date & Rating Stars Row */}
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex text-amber-400">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span
                                      key={i}
                                      className="material-symbols-outlined text-sm"
                                      style={{ fontVariationSettings: rev.rating > i ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                      star
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[11px] text-on-surface-variant/60 font-sans">
                                  {new Date(rev.created_at).toLocaleDateString('vi-VN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comment Content */}
                        <p className="text-on-surface/90 leading-relaxed text-sm whitespace-pre-wrap font-normal mb-3 pl-13">
                          {rev.comment}
                        </p>

                        {/* Photo Attachments inside card */}
                        {hasImage && (
                          <div className="pl-13 pt-1">
                            <div className="flex flex-wrap gap-2">
                              {rev.images!.map((imgUrl: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border border-[#EBE5DB] rounded-xl cursor-zoom-in hover:opacity-90 transition-all duration-200 shrink-0 bg-white relative group"
                                  onClick={() => {
                                    setZoomImage(imgUrl);
                                    setZoomType('review');
                                    setIsZoomOpen(true);
                                  }}
                                >
                                  <img
                                    src={productCardImage(imgUrl)}
                                    alt={`review-thumb-${rev.id}-${idx}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-base">zoom_in</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-[#EBE5DB] rounded-2xl text-center py-12 px-6 text-on-surface-variant/70">
                  <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 block">rate_review</span>
                  <p className="font-medium text-sm mb-1">Chưa tìm thấy nhận xét phù hợp</p>
                  <p className="text-xs text-on-surface-variant/60 max-w-sm mx-auto mb-4">
                    {reviewsData.totalReviews > 0
                      ? 'Không có đánh giá nào tương ứng với số sao bạn đang lọc.'
                      : 'Sản phẩm này chưa có đánh giá nào. Hãy là người đầu tiên trải nghiệm nhé!'}
                  </p>
                  {reviewRatingFilter !== 'all' && (
                    <button
                      onClick={() => handleRatingFilterChange('all')}
                      className="px-4 py-1.5 bg-[#5A6B53]/10 text-[#5A6B53] font-bold text-xs rounded-full hover:bg-[#5A6B53] hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      Xem tất cả đánh giá
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {reviewsData.totalPages && reviewsData.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#EBE5DB]">
                <span className="text-xs text-on-surface-variant">
                  Trang <strong className="text-on-surface">{reviewsData.currentPage}</strong> / {reviewsData.totalPages} (Tổng số <strong className="text-on-surface">{reviewsData.filteredTotal || reviewsData.totalReviews}</strong> đánh giá)
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={reviewsData.currentPage === 1}
                    onClick={() => handlePageChange((reviewsData.currentPage || 1) - 1)}
                    className="w-8 h-8 rounded-lg border border-[#EBE5DB] bg-white flex items-center justify-center text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5A6B53] hover:text-white hover:border-[#5A6B53] transition-all duration-200 cursor-pointer"
                    title="Trang trước"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>

                  {Array.from({ length: reviewsData.totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isActive = pageNum === reviewsData.currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-[#5A6B53] text-white'
                            : 'bg-white border border-[#EBE5DB] text-on-surface hover:border-[#5A6B53] hover:text-[#5A6B53]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={reviewsData.currentPage === reviewsData.totalPages}
                    onClick={() => handlePageChange((reviewsData.currentPage || 1) + 1)}
                    className="w-8 h-8 rounded-lg border border-[#EBE5DB] bg-white flex items-center justify-center text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5A6B53] hover:text-white hover:border-[#5A6B53] transition-all duration-200 cursor-pointer"
                    title="Trang tiếp"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 1. Carousel Sản phẩm liên quan */}
          {recommendedProducts.length > 0 && (
            <div ref={recommendedRef} className="mt-8">
              <ProductSectionCarousel
                title="Sản phẩm liên quan"
                subtitle="Các sản phẩm cùng danh mục được nhiều khách hàng yêu thích"
                products={recommendedProducts}
                bgClass="bg-transparent"
                viewAllLink="/shop"
              />
            </div>
          )}

          {/* 2. Carousel Sản phẩm vừa xem */}
          {recentlyViewedProducts.length > 0 && (
            <div className="mt-6 border-t border-outline-variant/20 pt-6">
              <ProductSectionCarousel
                title="Sản phẩm vừa xem"
                subtitle="Danh sách các sản phẩm bạn đã tham khảo gần đây"
                products={recentlyViewedProducts}
                bgClass="bg-transparent"
                viewAllLink="/shop"
              />
            </div>
          )}
        </div>
      </main>

      {/* Zoom Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setIsZoomOpen(false)}
        >
          <img
            src={productDetailImage(zoomImage || activeImage)}
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
          {zoomType === 'product' && product.gallery && product.gallery.length > 1 && (
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
