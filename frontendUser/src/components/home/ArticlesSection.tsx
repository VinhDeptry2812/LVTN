import React, { forwardRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicPosts, type Post } from '@/services/post.service';
import { Newspaper } from 'lucide-react';

export const ArticlesSection = forwardRef<HTMLDivElement>((_, ref) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const res = await getPublicPosts({ limit: 3 });
        setPosts(res.items || []);
      } catch (err) {
        console.error('Lỗi tải bài viết trang chủ:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (!loading && posts.length === 0) {
    return null;
  }

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
            to="/blog"
            className="mt-3 md:mt-0 inline-flex items-center gap-2 font-label-md text-xs sm:text-sm text-primary hover:underline"
          >
            <span>Xem tất cả bài viết</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-4 space-y-4 animate-pulse border border-slate-200">
                <div className="w-full h-48 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 md:gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="article-card-item group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col justify-between cursor-pointer"
              >
                <Link to={`/blog/${post.slug}`} className="block flex-1 flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      {post.thumbnail ? (
                        <img
                          src={post.thumbnail}
                          alt={post.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Newspaper size={48} />
                        </div>
                      )}
                      <span className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold text-primary shadow-sm">
                        {post.category}
                      </span>
                    </div>
                    <div className="p-3 sm:p-6">
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-on-surface-variant/70 mb-1.5 sm:mb-3">
                        <span>{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                        <span>•</span>
                        <span>{post.views || 0} lượt xem</span>
                      </div>
                      <h3 className="font-headline-sm font-bold text-xs sm:text-headline-sm text-on-surface mb-1.5 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      {post.summary && (
                        <p className="font-body-md text-[11px] sm:text-body-sm text-on-surface-variant/90 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                          {post.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-3 sm:p-6 pt-0 flex items-center text-primary font-label-sm text-[11px] sm:text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                    <span>Đọc tiếp</span>
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">arrow_forward</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

ArticlesSection.displayName = 'ArticlesSection';
