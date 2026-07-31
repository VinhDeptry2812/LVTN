import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import type { Collection } from '@/services/collection.service';
import { heroBannerImage } from '@/utils/cloudinaryUrl';

interface SpacesSectionProps {
  collections: Collection[];
}

export const SpacesSection = forwardRef<HTMLDivElement, SpacesSectionProps>(({ collections }, ref) => {
  return (
    <section ref={ref} className="pb-10 pt-5 md:py-0 md:pt-20 lg:py-sp-xl lg:pt-5 bg-surface-container-lowest">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="flex items-end justify-between mb-6 sm:mb-sp-lg">
          <div>
            <h2 className="font-headline-lg text-xl sm:text-headline-lg text-on-surface mb-1 sm:mb-2">Không gian sống</h2>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant">Khám phá các gợi ý thiết kế trọn bộ cho ngôi nhà của bạn</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
          {collections.filter(c => c.name.toLowerCase().includes('phòng')).slice(0, 3).map((col, idx) => (
            <Link
              key={col.id}
              to={`/collection/${col.slug}`}
              className={`room-item group relative h-[220px] sm:h-[380px] md:h-[450px] rounded-2xl overflow-hidden cursor-pointer ${
                idx === 2 ? 'col-span-2 md:col-span-1' : 'col-span-1'
              }`}
            >
              <img
                src={heroBannerImage(col.cover_image) || 'https://via.placeholder.com/600x800?text=Room'}
                alt={col.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
              <div className="absolute bottom-0 left-0 p-4 sm:p-8 w-full transform translate-y-1 sm:translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="font-headline-md text-base sm:text-headline-md text-white font-bold mb-1 sm:mb-2">{col.name}</h3>
                <div className="flex items-center text-[11px] sm:text-label-sm text-white/90 font-label-sm uppercase tracking-widest gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  <span>Khám phá ngay</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 sm:mt-10 text-center">
          <Link
            to="/collections"
            className="inline-block px-6 py-2.5 sm:px-8 sm:py-3 border border-outline text-on-surface rounded-xl font-label-md text-xs sm:text-sm hover:bg-surface-container transition-colors"
          >
            Xem tất cả không gian
          </Link>
        </div>
      </div>
    </section>
  );
});

SpacesSection.displayName = 'SpacesSection';
