import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { ProductFrontend } from '@/services/product.service';

export interface ProductSectionCarouselProps {
  title: string;
  subtitle: string;
  products: ProductFrontend[];
  itemsToShow?: number;
  viewAllLink?: string;
  bgClass?: string;
  onAddToCart?: (product: ProductFrontend) => void;
}

const ProductSectionCarousel: React.FC<ProductSectionCarouselProps> = ({
  title,
  subtitle,
  products,
  itemsToShow: itemsToShowProp,
  viewAllLink = '/shop',
  bgClass = 'bg-surface',
}) => {
  const [responsiveItemsToShow, setResponsiveItemsToShow] = useState(4);

  useEffect(() => {
    if (itemsToShowProp) return;
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setResponsiveItemsToShow(2);
      } else if (window.innerWidth < 1024) {
        setResponsiveItemsToShow(3);
      } else {
        setResponsiveItemsToShow(4);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [itemsToShowProp]);

  const itemsToShow = itemsToShowProp || responsiveItemsToShow;

  const [carouselIndex, setCarouselIndex] = useState(0);
  const maxIdx = Math.max(0, products.length - itemsToShow);

  // Auto adjust carouselIndex if maxIdx decreases
  useEffect(() => {
    if (carouselIndex > maxIdx) {
      setCarouselIndex(maxIdx);
    }
  }, [maxIdx, carouselIndex]);

  const handlePrev = () => {
    setCarouselIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCarouselIndex((prev) => Math.min(maxIdx, prev + 1));
  };

  // Logic Nắm kéo Chuột & Vuốt Cảm ứng
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (clientX: number, clientY: number = 0) => {
    setIsDragging(true);
    startXRef.current = clientX;
    currentXRef.current = clientX;
    startYRef.current = clientY;
    currentYRef.current = clientY;
  };

  const handleDragMove = (clientX: number, clientY: number = 0) => {
    if (!isDragging) return;
    currentXRef.current = clientX;
    currentYRef.current = clientY;
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    const diffX = currentXRef.current - startXRef.current;
    const diffY = currentYRef.current - startYRef.current;

    // Chỉ thực hiện trượt nếu vuốt thiên về chiều ngang hơn chiều dọc
    if (Math.abs(diffX) > Math.abs(diffY) || startYRef.current === 0) {
      const containerWidth = containerRef.current?.clientWidth || 300;
      const approxItemWidth = containerWidth / itemsToShow;
      const steps = Math.max(1, Math.round(Math.abs(diffX) / (approxItemWidth * 0.65)));

      if (diffX < -40 && carouselIndex < maxIdx) {
        setCarouselIndex((prev) => Math.min(maxIdx, prev + steps));
      } else if (diffX > 40 && carouselIndex > 0) {
        setCarouselIndex((prev) => Math.max(0, prev - steps));
      }
    }
    setIsDragging(false);
  };

  if (products.length === 0) return null;

  return (
    <section className={`py-8 md:pb-2 md:pt-18 lg:py-sp-xl  lg:pt-0 ${bgClass}`}>
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-0 lg:mb-0 gap-2 sm:gap-sp-md border-b border-outline-variant/20 md:pb-6">
          <div>
            <h2 className="font-headline-lg text-xl sm:text-headline-lg text-on-surface mb-1 sm:mb-2">{title}</h2>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant max-w-xl">
              {subtitle}
            </p>
          </div>
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-primary font-label-md text-xs sm:text-label-md font-bold hover:underline shrink-0 flex items-center gap-1 mt-2 md:mt-0"
            >
              Xem tất cả <ChevronRight size={18} />
            </Link>
          )}
        </div>

        <div className="relative -mx-1.5 sm:-mx-3 px-1.5 sm:px-3">
          <div
            ref={containerRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing select-none touch-pan-y"
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            <div
              className="flex items-stretch -mx-1.5 sm:-mx-2 transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${(carouselIndex * 100) / itemsToShow}%)`,
              }}
            >
              {products.map((prod, idx) => (
                <div
                  key={`${idx}-${prod.id}`}
                  className="shrink-0 px-1.5 sm:px-2 animate-slide-item flex flex-col"
                  style={{ width: `${100 / itemsToShow}%` }}
                >
                  <ProductCard product={prod} />
                </div>
              ))}
            </div>
          </div>

          {carouselIndex > 0 && (
            <button
              onClick={handlePrev}
              aria-label="Slide trước"
              className="absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 sm:-translate-x-1/2 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/95 border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-on-primary shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/btn"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:-translate-x-0.5 transition-transform" />
            </button>
          )}
          {carouselIndex < maxIdx && (
            <button
              onClick={handleNext}
              aria-label="Slide tiếp theo"
              className="absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 sm:translate-x-1/2 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/95 border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-on-primary shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/btn"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductSectionCarousel;
