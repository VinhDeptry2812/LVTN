import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/useCartStore';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import toast from 'react-hot-toast';

import {
  fetchProductById,
  formatPrice,
  type ProductFrontend,
  fetchRelatedProducts,
  fetchFrequentlyBoughtTogether,
} from '@/services/product.service';
import { productDetailImage } from '@/utils/cloudinaryUrl';
import { fetchProductReviews, type ProductReviewsResponse } from '@/services/review.service';
import { useDragScroll } from '@/hooks/useDragScroll';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const getSpecValue = (specs: any, keyName: string): string | undefined => {
  if (!specs) return undefined;
  if (Array.isArray(specs)) {
    const found = specs.find(
      (s: any) => s && (s.key === keyName || s.key?.toLowerCase() === keyName.toLowerCase())
    );
    return found?.value;
  }
  return specs[keyName];
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

export function useProductDetail() {
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
    limit: 3,
    allImages: [],
    starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'all'>('all');
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [reviewPage, setReviewPage] = useState<number>(1);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const reviewsDrag = useDragScroll();

  const [recommendedProducts, setRecommendedProducts] = useState<ProductFrontend[]>([]);
  const [frequentlyBoughtProducts, setFrequentlyBoughtProducts] = useState<ProductFrontend[]>([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<ProductFrontend[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<number | string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState<'idle' | 'loading' | 'success'>('idle');

  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomType, setZoomType] = useState<'product' | 'review'>('product');

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (id) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      setLoading(true);
      fetchProductById(id)
        .then((data) => {
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            const firstVariant = data.variants[0];
            setSelectedVariantId(firstVariant.id);
            if (firstVariant.attributes) {
              setSelectedAttributes(firstVariant.attributes);
            } else {
              setSelectedAttributes({});
            }

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

          Promise.all([fetchRelatedProducts(id), fetchFrequentlyBoughtTogether(id)])
            .then(([related, together]) => {
              setRecommendedProducts(related);
              setFrequentlyBoughtProducts(together);
              setLoading(false);
            })
            .catch((err) => {
              console.error('Lỗi khi tải các sản phẩm gợi ý:', err);
              setLoading(false);
            });
        })
        .catch((err) => {
          console.error('Lỗi khi tải dữ liệu sản phẩm:', err);
          setLoading(false);
        });
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      const urlsToPreload = new Set<string>();
      if (product.image) urlsToPreload.add(product.image);
      if (product.gallery && product.gallery.length > 0) {
        product.gallery.forEach((g) => {
          if (g.url) urlsToPreload.add(g.url);
        });
      }
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((v) => {
          if (v.image_url) urlsToPreload.add(v.image_url);
        });
      }

      urlsToPreload.forEach((url) => {
        const imgDetail = new Image();
        imgDetail.src = productDetailImage(url);
      });
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      try {
        const stored = localStorage.getItem('recently_viewed_products');
        const list: ProductFrontend[] = stored ? JSON.parse(stored) : [];

        const filtered = list.filter((p) => String(p.id) !== String(product.id));
        setRecentlyViewedProducts(filtered);

        const updatedList = [product, ...list.filter((p) => String(p.id) !== String(product.id))].slice(0, 10);
        localStorage.setItem('recently_viewed_products', JSON.stringify(updatedList));
      } catch (e) {
        console.error('Lỗi khi lưu sản phẩm vừa xem:', e);
      }
    }
  }, [product]);

  useEffect(() => {
    if (id) {
      setReviewsLoading(true);
      fetchProductReviews(id, {
        page: reviewPage,
        limit: 3,
        rating: reviewRatingFilter,
        sort: reviewSort,
      })
        .then((data) => {
          if (reviewPage === 1) {
            setReviewsData(data);
          } else {
            setReviewsData((prev) => ({
              ...data,
              reviews: [...prev.reviews, ...data.reviews],
            }));
          }
          setReviewsLoading(false);
        })
        .catch((err) => {
          console.error('Lỗi khi tải đánh giá sản phẩm:', err);
          setReviewsLoading(false);
        });
    }
  }, [id, reviewPage, reviewRatingFilter, reviewSort]);

  const handleRatingFilterChange = (star: number | 'all') => {
    setReviewRatingFilter(star);
    setReviewPage(1);
  };

  const handleSortChange = (sortVal: 'newest' | 'highest' | 'lowest') => {
    setReviewSort(sortVal);
    setReviewPage(1);
  };

  const handleLoadMoreReviews = () => {
    if ((reviewsData.currentPage ?? 1) < (reviewsData.totalPages ?? 1)) {
      setReviewPage((prev) => prev + 1);
    }
  };

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

  const displayRawOldPrice = product?.oldPrice
    ? (product?.rawBasePrice || 0) + (currentVariant?.price_adjustment ? Number(currentVariant.price_adjustment) : 0)
    : null;
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
      const matchingVariant = product.variants.find((v: any) => {
        if (!v.attributes) return false;
        return Object.entries(newAttributes).every(([k, vVal]) => v.attributes[k] === vVal);
      });

      if (matchingVariant) {
        setSelectedVariantId(matchingVariant.id);
        if (matchingVariant.image_url) {
          setActiveImage(matchingVariant.image_url);
        } else if (product.gallery && product.gallery.length > 0) {
          const variantImages = product.gallery.filter((g) => g.variant_id === matchingVariant.id);
          if (variantImages.length > 0) {
            setActiveImage(variantImages[0].url);
          } else {
            setActiveImage(product.gallery[0].url);
          }
        }
      } else {
        setSelectedVariantId(null);
      }
    }
  };

  const filteredGallery = useMemo(() => {
    if (!product || !product.gallery) return [];
    if (selectedVariantId) {
      const variantImages = product.gallery.filter((g) => g.variant_id === selectedVariantId || !g.variant_id);
      if (variantImages.some((g) => g.variant_id === selectedVariantId)) {
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
    const maxStock = currentVariant ? currentVariant.stock || 0 : 0;

    if (existingQty + quantity > maxStock) {
      if (existingQty >= maxStock) {
        toast.error(`Bạn đã thêm số lượng tối đa hiện có của sản phẩm này trong kho vào giỏ hàng (${maxStock} sản phẩm).`);
      } else {
        toast.error(`Không thể thêm. Giỏ hàng đã có ${existingQty} sản phẩm, trong kho chỉ còn lại ${maxStock} sản phẩm.`);
      }
      return;
    }

    setIsAdding('loading');

    let materialStr = getSpecValue(product.specs, 'Chất liệu') || getSpecValue(product.specs, 'material') || 'Mặc định';
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
        availableVariants: product.variants,
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
    const maxStock = currentVariant ? currentVariant.stock || 0 : 0;

    if (existingQty + quantity > maxStock) {
      if (existingQty >= maxStock) {
        toast.error(`Bạn đã thêm số lượng tối đa hiện có của sản phẩm này trong kho vào giỏ hàng (${maxStock} sản phẩm).`);
      } else {
        toast.error(`Không thể thêm. Giỏ hàng đã có ${existingQty} sản phẩm, trong kho chỉ còn lại ${maxStock} sản phẩm.`);
      }
      navigate('/checkout');
      return;
    }

    let materialStr = getSpecValue(product.specs, 'Chất liệu') || getSpecValue(product.specs, 'material') || 'Mặc định';
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
      availableVariants: product.variants,
    });

    toast.success('Đã thêm vào giỏ hàng và chuyển tới thanh toán!');
    navigate('/checkout');
  };

  const detailContainerRef = useRef<HTMLDivElement>(null);
  const recommendedRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.from('.detail-gallery', { opacity: 0, x: -50, duration: 0.8, ease: 'power3.out' }).from(
        '.detail-info-block',
        { opacity: 0, x: 50, duration: 0.8, ease: 'power3.out' },
        '-=0.6'
      );

      gsap.from('.recom-card', {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: recommendedRef.current,
          start: 'top 80%',
        },
      });
    },
    { scope: detailContainerRef }
  );

  const thumbnailDrag = useDragScroll();

  const handleQuantityChange = (amount: number) => {
    const maxStock = currentVariant ? currentVariant.stock || 0 : 0;
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

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filteredGallery.length <= 1) return;
    const currentIndex = filteredGallery.findIndex((g) => g.url === activeImage);
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
    const currentIndex = filteredGallery.findIndex((g) => g.url === activeImage);
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

  return {
    navigate,
    product,
    loading,
    reviewsData,
    reviewRatingFilter,
    reviewSort,
    reviewsLoading,
    reviewsSectionRef,
    reviewsDrag,
    recommendedProducts,
    frequentlyBoughtProducts,
    recentlyViewedProducts,
    activeImage,
    setActiveImage,
    selectedVariantId,
    setSelectedVariantId,
    selectedAttributes,
    quantity,
    setQuantity,
    descExpanded,
    setDescExpanded,
    isAdding,
    isShippingOpen,
    setIsShippingOpen,
    isZoomOpen,
    setIsZoomOpen,
    zoomImage,
    setZoomImage,
    zoomType,
    setZoomType,
    isSimpleProduct,
    currentVariant,
    displayPrice,
    displayOldPrice,
    attributeGroups,
    filteredGallery,
    handleRatingFilterChange,
    handleSortChange,
    handleLoadMoreReviews,
    handleAttributeSelect,
    handleAddToCart,
    handleBuyNow,
    detailContainerRef,
    recommendedRef,
    thumbnailDrag,
    handleQuantityChange,
    handleNextImage,
    handlePrevImage,
  };
}
