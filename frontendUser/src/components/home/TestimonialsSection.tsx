import React, { forwardRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDragScroll } from '@/hooks/useDragScroll';

interface TestimonialsSectionProps {
  featuredReviews: any[];
}

export const TestimonialsSection = forwardRef<HTMLDivElement, TestimonialsSectionProps>(({ featuredReviews }, ref) => {
  const reviewsDrag = useDragScroll();

  const handleScrollLeft = () => {
    if (!reviewsDrag.ref.current) return;
    const scrollAmount = reviewsDrag.ref.current.clientWidth * 0.75;
    reviewsDrag.scrollBy(-scrollAmount);
  };

  const handleScrollRight = () => {
    if (!reviewsDrag.ref.current) return;
    const scrollAmount = reviewsDrag.ref.current.clientWidth * 0.75;
    reviewsDrag.scrollBy(scrollAmount);
  };

  return (
    <section ref={ref} className="py-10 md:pb-2 md:pt-18 lg:py-sp-xl lg:pt-0 bg-surface-container-lowest overflow-hidden">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-sp-xl">
          <span className="text-primary font-label-md text-xs sm:text-label-md uppercase tracking-widest block mb-2 sm:mb-3">
            Trải nghiệm thực tế
          </span>
          <h2 className="font-headline-lg text-xl sm:text-headline-lg text-on-surface">Đánh Giá Từ Khách Hàng</h2>
          <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant mt-1 sm:mt-2">
            Hàng ngàn gia đình đã tin tưởng lựa chọn sản phẩm của chúng tôi cho không gian sống.
          </p>
        </div>

        {/* Testimonials Carousel Wrapper */}
        {featuredReviews.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-2xl border border-outline-variant/30 max-w-md mx-auto shadow-sm">
            <span className="material-symbols-outlined text-4xl text-primary/60 mb-2">rate_review</span>
            <p className="text-on-surface-variant font-body-md">Chưa có đánh giá 5 sao nào từ khách hàng.</p>
          </div>
        ) : (
          <div className="relative px-1 md:px-6">
            {/* Scroll Container with useDragScroll */}
            <div
              ref={reviewsDrag.ref}
              {...reviewsDrag.events}
              className={`flex gap-4 md:gap-6 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory py-2 select-none ${
                reviewsDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {featuredReviews.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="shrink-0 snap-start w-[85vw] sm:w-[350px] md:w-[380px] lg:w-[400px] flex flex-col"
                >
                  <div className="testimonial-card bg-surface rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between h-full">
                    {item.images && item.images.length > 0 && (
                      <div className="w-full h-52 sm:h-64 md:h-72 overflow-hidden shrink-0">
                        <img
                          src={item.images[0]}
                          alt="Ảnh đánh giá"
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-4 sm:p-6 md:p-7 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex gap-1 text-yellow-500 mb-2 sm:mb-3">
                          {[...Array(item.rating || 5)].map((_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined text-[18px] sm:text-[20px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant italic mb-4 sm:mb-6 leading-relaxed line-clamp-4">
                          “{item.comment}”
                        </p>
                      </div>
                      <div className="border-t border-outline-variant/20 pt-3 sm:pt-4 mt-auto">
                        <h4 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-on-surface">
                          {item.user?.name || 'KHÁCH HÀNG NỘI THẤT'}
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls: Prev & Next Buttons */}
            {featuredReviews.length > 1 && (
              <>
                <button
                  onClick={handleScrollLeft}
                  aria-label="Đánh giá trước"
                  className="absolute left-0 top-1/2 -translate-y-1/2 sm:-translate-x-2 md:-translate-x-4 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/95 border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-on-primary shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/btn"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:-translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={handleScrollRight}
                  aria-label="Đánh giá tiếp theo"
                  className="absolute right-0 top-1/2 -translate-y-1/2 sm:translate-x-2 md:translate-x-4 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/95 border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-on-primary shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/btn"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
});

TestimonialsSection.displayName = 'TestimonialsSection';
