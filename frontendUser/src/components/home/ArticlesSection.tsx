import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';

export const ArticlesSection = forwardRef<HTMLDivElement>((_, ref) => {
  const articles = [
    {
      id: 1,
      title: 'Top 5 Xu Hướng Thiết Kế Nội Thất Tối Giản Cho Năm 2026',
      category: 'Xu hướng 2026',
      date: '20 Tháng 7, 2026',
      readTime: '5 phút đọc',
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop',
      excerpt: 'Khám phá sự kết hợp tinh tế giữa vật liệu gỗ tự nhiên chuẩn CARB-P2 và gam màu trung tính mang đến sự bình yên trọn vẹn cho tổ ấm.',
    },
    {
      id: 2,
      title: 'Bí Quyết Chọn Giường Gỗ Tự Nhiên Cho Giấc Ngủ Trọn Vẹn',
      category: 'Mẹo bài trí',
      date: '15 Tháng 7, 2026',
      readTime: '4 phút đọc',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800&auto=format&fit=crop',
      excerpt: 'Lựa chọn kích thước giường phù hợp phong thủy phòng ngủ và tiêu chuẩn gỗ tràm tự nhiên đạt chứng chỉ FSC chống mối mọt.',
    },
    {
      id: 3,
      title: 'Hướng Dẫn Bảo Quản & Vệ Sinh Bàn Ăn Gỗ Sồi Đúng Cách',
      category: 'Bảo quản gỗ',
      date: '10 Tháng 7, 2026',
      readTime: '6 phút đọc',
      image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?q=80&w=800&auto=format&fit=crop',
      excerpt: 'Giúp bề mặt bàn ăn gỗ luôn sáng bóng như mới và kéo dài tuổi thọ sản phẩm lên tới hơn 10 năm chỉ với vài bước đơn giản.',
    },
  ];

  return (
    <section ref={ref} className="py-10 md:pb-2 md:pt-20 lg:py-sp-xl bg-surface border-t border-outline-variant/20">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-sp-xl">
          <div>
            <span className="text-primary font-label-md text-xs sm:text-label-md uppercase tracking-widest block mb-1.5 sm:mb-2">Góc cảm hứng</span>
            <h2 className="font-headline-lg text-xl sm:text-headline-lg text-on-surface mb-2">Bài Viết & Mẹo Trang Trí</h2>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant max-w-xl">
              Khám phá các bí quyết chọn lựa nội thất, mẹo tối ưu diện tích và xu hướng không gian sống hiện đại.
            </p>
          </div>
          <Link
            to="/shop"
            className="mt-3 md:mt-0 inline-flex items-center gap-2 font-label-md text-xs sm:text-sm text-primary hover:underline"
          >
            <span>Xem tất cả bài viết</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 md:gap-8">
          {articles.map((post, idx) => (
            <article
              key={post.id}
              className={`article-card-item group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col justify-between cursor-pointer ${
                idx === 0 ? 'col-span-2 md:col-span-1' : 'col-span-1'
              }`}
            >
              <div>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold text-primary shadow-sm">
                    {post.category}
                  </span>
                </div>
                <div className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-on-surface-variant/70 mb-1.5 sm:mb-3">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="font-headline-sm font-bold text-xs sm:text-headline-sm text-on-surface mb-1.5 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="font-body-md text-[11px] sm:text-body-sm text-on-surface-variant/90 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>
              <div className="p-3 sm:p-6 pt-0 flex items-center text-primary font-label-sm text-[11px] sm:text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                <span>Đọc tiếp</span>
                <span className="material-symbols-outlined text-[15px] sm:text-[16px]">arrow_forward</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});

ArticlesSection.displayName = 'ArticlesSection';
