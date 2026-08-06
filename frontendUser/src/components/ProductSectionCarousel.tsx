import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { ProductFrontend } from '@/services/product.service';
import { useDragScroll } from '@/hooks/useDragScroll';

export interface ProductSectionCarouselProps {
  title: string;
  subtitle: string;
  products: ProductFrontend[];
  itemsToShow?: number;
  viewAllLink?: string;
  bgClass?: string;
  sectionPaddingClass?: string;
  contentPaddingClass?: string;
  onAddToCart?: (product: ProductFrontend) => void;
}

const ProductSectionCarousel: React.FC<ProductSectionCarouselProps> = ({
  title,
  subtitle,
  products,
  itemsToShow: itemsToShowProp,
  viewAllLink = '/shop',
  bgClass = 'bg-surface',
  sectionPaddingClass = 'py-8 md:pb-2 md:pt-18 lg:py-sp-xl lg:pt-0',
  contentPaddingClass = 'px-sp-md md:px-lg',
}) => {
  const [responsiveItemsToShow, setResponsiveItemsToShow] = useState(4);
  const carouselDrag = useDragScroll();

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

  const handleScrollLeft = () => {
    if (!carouselDrag.ref.current) return;
    const scrollAmount = carouselDrag.ref.current.clientWidth * 0.75;
    carouselDrag.scrollBy(-scrollAmount);
  };

  const handleScrollRight = () => {
    if (!carouselDrag.ref.current) return;
    const scrollAmount = carouselDrag.ref.current.clientWidth * 0.75;
    carouselDrag.scrollBy(scrollAmount);
  };

  if (products.length === 0) return null;

  return (
    <section className={`${sectionPaddingClass} ${bgClass}`}>
      <div className={`max-w-container-max mx-auto ${contentPaddingClass}`}>
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

        <div className="relative -mx-1.5 sm:-mx-3 px-1.5 sm:px-3 group/carousel">
          <div
            ref={carouselDrag.ref}
            {...carouselDrag.events}
            className={`flex items-stretch overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth py-2 px-1 select-none ${
              carouselDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {products.map((prod, idx) => (
              <div
                key={`${idx}-${prod.id}`}
                className="shrink-0 px-1.5 sm:px-2 snap-start flex flex-col transition-all"
                style={{ width: `${100 / itemsToShow}%` }}
              >
                <ProductCard product={prod} />
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <button
            type="button"
            onClick={handleScrollLeft}
            aria-label="Slide trước"
            className="absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 sm:-translate-x-1/2 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/95 border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-on-primary shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/btn"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:-translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={handleScrollRight}
            aria-label="Slide tiếp theo"
            className="absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 sm:translate-x-1/2 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/95 border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-on-primary shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/btn"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductSectionCarousel;
