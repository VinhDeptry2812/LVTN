import React from 'react';
import { type Review, type ProductReviewsResponse } from '@/services/review.service';
import { productCardImage } from '@/utils/cloudinaryUrl';

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

interface ProductReviewsSectionProps {
  reviewsSectionRef: React.RefObject<HTMLDivElement | null>;
  reviewsData: ProductReviewsResponse;
  reviewsLoading: boolean;
  reviewRatingFilter: number | 'all';
  reviewSort: 'newest' | 'highest' | 'lowest';
  reviewsDrag: any;
  handleRatingFilterChange: (star: number | 'all') => void;
  handleSortChange: (sortVal: 'newest' | 'highest' | 'lowest') => void;
  handleLoadMoreReviews: () => void;
  setZoomImage: (url: string) => void;
  setZoomType: (type: 'product' | 'review') => void;
  setIsZoomOpen: (open: boolean) => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  reviewsSectionRef,
  reviewsData,
  reviewsLoading,
  reviewRatingFilter,
  reviewSort,
  reviewsDrag,
  handleRatingFilterChange,
  handleSortChange,
  handleLoadMoreReviews,
  setZoomImage,
  setZoomType,
  setIsZoomOpen,
}) => {
  return (
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
        <div className="flex overflow-x-auto no-scrollbar items-center gap-2 max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap py-1">
          <button
            onClick={() => handleRatingFilterChange('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border cursor-pointer flex items-center gap-1.5 shrink-0 ${
              reviewRatingFilter === 'all'
                ? 'bg-[#5A6B53] border-[#5A6B53] text-white shadow-xs'
                : 'border-[#EBE5DB] text-on-surface-variant bg-transparent hover:border-[#5A6B53] hover:text-[#5A6B53]'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${
                reviewRatingFilter === 'all' ? 'bg-white/25 text-white' : 'bg-[#EBE5DB]/60 text-slate-700'
              }`}
            >
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
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border flex items-center gap-1 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#5A6B53] border-[#5A6B53] text-white shadow-xs'
                    : 'border-[#EBE5DB] text-on-surface-variant bg-transparent hover:border-[#5A6B53] hover:text-[#5A6B53]'
                }`}
              >
                <span>{stars}</span>
                <span
                  className="material-symbols-outlined text-xs text-amber-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ml-0.5 ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-[#EBE5DB]/60 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Selector & Navigation Buttons */}
        <div className="flex items-center justify-between sm:justify-start gap-3 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EBE5DB]/60">
          <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">sort</span>
            Sắp xếp:
          </span>
          <select
            value={reviewSort}
            onChange={(e) => handleSortChange(e.target.value as any)}
            className="bg-transparent border border-[#EBE5DB] text-on-surface text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A6B53] cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="highest">Đánh giá cao nhất</option>
            <option value="lowest">Đánh giá thấp nhất</option>
          </select>

          {/* Navigation Arrows for Carousel */}
          {reviewsData.reviews.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
              <button
                onClick={() => reviewsDrag.scrollBy(-380)}
                className="w-8 h-8 rounded-full border border-[#EBE5DB] flex items-center justify-center text-on-surface-variant hover:border-[#5A6B53] hover:text-[#5A6B53] hover:bg-[#5A6B53]/5 transition-all cursor-pointer"
                title="Cuộn sang trái"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button
                onClick={() => reviewsDrag.scrollBy(380)}
                className="w-8 h-8 rounded-full border border-[#EBE5DB] flex items-center justify-center text-on-surface-variant hover:border-[#5A6B53] hover:text-[#5A6B53] hover:bg-[#5A6B53]/5 transition-all cursor-pointer"
                title="Cuộn sang phải"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Cards Carousel Stream */}
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
          <div
            ref={reviewsDrag.ref}
            {...reviewsDrag.events}
            className={`flex overflow-x-auto gap-4 sm:gap-6 py-2 no-scrollbar snap-x snap-mandatory scroll-smooth select-none ${
              reviewsDrag.isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {reviewsData.reviews.map((rev: Review) => {
              const avatarColorClass = getAvatarStyle(rev.user?.name || 'Khách');
              const firstLetter = rev.user?.name ? rev.user.name.charAt(0).toUpperCase() : 'K';
              const hasImage = rev.images && rev.images.length > 0;

              return (
                <div
                  key={rev.id}
                  className="w-[280px] sm:w-[340px] md:w-[380px] shrink-0 snap-start p-5 rounded-2xl border border-[#EBE5DB] bg-transparent hover:border-[#5A6B53]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: User Profile & Rating */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm tracking-wider ${avatarColorClass}`}
                        >
                          {firstLetter}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-on-surface text-sm truncate max-w-[140px]">
                              {rev.user?.name || 'Khách hàng'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                              <span className="material-symbols-outlined text-[10px] text-emerald-600">verified</span>
                              Đã mua
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className="material-symbols-outlined text-xs"
                                  style={{ fontVariationSettings: rev.rating > i ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                  star
                                </span>
                              ))}
                            </div>
                            <span className="text-[11px] text-on-surface-variant/60 font-sans">
                              {new Date(rev.created_at).toLocaleDateString('vi-VN', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-on-surface/90 leading-relaxed text-sm whitespace-pre-wrap font-normal mb-3 line-clamp-4">
                      {rev.comment}
                    </p>
                  </div>

                  {hasImage && (
                    <div className="pt-3 border-t border-[#EBE5DB]/60 mt-auto">
                      <div className="flex flex-wrap gap-2">
                        {rev.images!.map((imgUrl: string, idx: number) => (
                          <div
                            key={idx}
                            className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border border-[#EBE5DB] rounded-xl cursor-zoom-in hover:opacity-90 hover:shadow-md transition-all duration-200 shrink-0 bg-white relative group shadow-xs"
                            onClick={() => {
                              if (reviewsDrag.isDragging) return;
                              setZoomImage(imgUrl);
                              setZoomType('review');
                              setIsZoomOpen(true);
                            }}
                          >
                            <img
                              src={productCardImage(imgUrl)}
                              alt={`review-thumb-${rev.id}-${idx}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white">
                              <span className="material-symbols-outlined text-sm">zoom_in</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {(reviewsData.currentPage ?? 1) < (reviewsData.totalPages ?? 1) && (
              <div
                onClick={() => {
                  if (reviewsDrag.isDragging) return;
                  handleLoadMoreReviews();
                }}
                className="w-[140px] sm:w-[170px] shrink-0 snap-start min-h-[220px] p-4 rounded-2xl border-2 border-dashed border-[#5A6B53]/40 bg-[#5A6B53]/5 hover:bg-[#5A6B53] hover:border-[#5A6B53] text-[#5A6B53] hover:text-white transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs hover:shadow-md"
                title="Bấm để tải thêm đánh giá"
              >
                <div className="w-11 h-11 rounded-full bg-[#5A6B53]/15 group-hover:bg-white/20 flex items-center justify-center mb-3 transition-colors group-hover:scale-110 duration-300">
                  {reviewsLoading ? (
                    <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform duration-300">
                      arrow_forward
                    </span>
                  )}
                </div>
                <span className="font-bold text-xs tracking-wide uppercase mb-1">
                  {reviewsLoading ? 'Đang tải...' : 'Xem thêm'}
                </span>
                <span className="text-[11px] opacity-75 group-hover:opacity-90 font-normal">
                  Còn {reviewsData.totalReviews - reviewsData.reviews.length} nhận xét
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-transparent border border-[#EBE5DB] rounded-2xl text-center py-12 px-6 text-on-surface-variant/70">
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
                className="px-4 py-1.5 bg-transparent border border-[#5A6B53] text-[#5A6B53] font-bold text-xs rounded-none hover:bg-[#5A6B53] hover:text-white transition-all duration-200 cursor-pointer"
              >
                Xem tất cả đánh giá
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductReviewsSection;
