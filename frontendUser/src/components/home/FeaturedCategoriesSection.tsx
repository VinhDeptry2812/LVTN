import React, { forwardRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '@/services/category.service';
import { categoryCardImage } from '@/utils/cloudinaryUrl';

interface FeaturedCategoriesSectionProps {
  categories: Category[];
}

export const FeaturedCategoriesSection = forwardRef<HTMLDivElement, FeaturedCategoriesSectionProps>(({ categories }, ref) => {
  const navigate = useNavigate();

  // Lấy 4 danh mục khớp chính xác với vị trí sort_order (1, 2, 3, 4) của Bento Grid Admin
  const categoriesToDisplay = useMemo(() => {
    const flatten = (items: Category[]): Category[] => {
      const list: Category[] = [];
      for (const item of items) {
        list.push(item);
        if (item.children && item.children.length > 0) {
          list.push(...flatten(item.children));
        }
      }
      return list;
    };

    const allCategories = flatten(categories);

    // Lấy các danh mục được gán vị trí (sort_order 1..4)
    const slot1 = allCategories.find((c) => c.sort_order === 1);
    const slot2 = allCategories.find((c) => c.sort_order === 2);
    const slot3 = allCategories.find((c) => c.sort_order === 3);
    const slot4 = allCategories.find((c) => c.sort_order === 4);

    const assignedIds = new Set(
      [slot1, slot2, slot3, slot4].filter(Boolean).map((c) => c!.id)
    );

    const remaining = allCategories.filter((c) => !assignedIds.has(c.id));
    let remIndex = 0;
    const getFallback = () => {
      const item = remaining[remIndex];
      if (item) remIndex++;
      return item;
    };

    const finalSlot1 = slot1 || getFallback();
    const finalSlot2 = slot2 || getFallback();
    const finalSlot3 = slot3 || getFallback();
    const finalSlot4 = slot4 || getFallback();

    return [
      { category: finalSlot1, position: 1 },
      { category: finalSlot2, position: 2 },
      { category: finalSlot3, position: 3 },
      { category: finalSlot4, position: 4 },
    ].filter((item): item is { category: Category; position: number } => Boolean(item.category));
  }, [categories]);

  return (
    <section ref={ref} className="pt-5 md:py-0 md:pt-20 lg:py-sp-xl bg-surface">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="flex items-end justify-between mb-6 sm:mb-sp-lg">
          <div>
            <h2 className="font-headline-lg text-xl sm:text-headline-lg text-on-surface mb-1 sm:mb-2">Danh mục nổi bật</h2>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant">Tìm kiếm mảnh ghép hoàn hảo cho từng góc nhỏ</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-3 sm:gap-4 md:gap-6 md:h-[650px]">
          {categoriesToDisplay.map(({ category: cat, position }) => {
            let gridClass = '';
            if (position === 1) gridClass = 'col-span-2 md:col-span-2 md:row-span-2 h-[200px] sm:h-[280px] md:h-auto';
            else if (position === 2) gridClass = 'col-span-2 md:col-span-2 md:row-span-1 h-[160px] sm:h-[240px] md:h-auto';
            else if (position === 3) gridClass = 'col-span-1 md:col-span-1 md:row-span-1 h-[160px] sm:h-[240px] md:h-auto';
            else gridClass = 'col-span-1 md:col-span-1 md:row-span-1 h-[160px] sm:h-[240px] md:h-auto';

            return (
              <div
                key={cat.id}
                onClick={() => navigate(`/shop?category=${cat.slug}`)}
                className={`category-item group relative overflow-hidden rounded-2xl bg-surface-container cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 ${gridClass}`}
              >
                <img
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src={categoryCardImage(cat.image_url) || 'https://via.placeholder.com/600x400?text=No+Image'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500"></div>
                <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 md:p-8 transform translate-y-1 sm:translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="font-headline-md font-bold text-base sm:text-headline-md md:text-headline-lg text-white drop-shadow-lg">{cat.name}</h3>
                  <span className="inline-block mt-1 sm:mt-2 font-label-sm text-[11px] sm:text-label-sm text-white/90 uppercase tracking-widest opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    Khám phá ngay &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

FeaturedCategoriesSection.displayName = 'FeaturedCategoriesSection';
