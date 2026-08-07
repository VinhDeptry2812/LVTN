import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getPostBySlug, getPublicPosts, getPostCategories, type Post } from '@/services/post.service';
import {
  Calendar,
  Eye,
  User,
  ChevronRight,
  Share2,
  ArrowLeft,
  BookOpen,
  Newspaper,
  Tag,
  Clock,
  TrendingUp,
  Check,
} from 'lucide-react';

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Categories for Sidebar
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await getPostCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Lỗi lấy danh mục:', err);
      }
    };
    fetchCats();
  }, []);

  // Fetch Recent Posts for Sidebar
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await getPublicPosts({ limit: 5, page: 1 });
        setRecentPosts(res.items);
      } catch (err) {
        console.error('Lỗi lấy bài viết mới nhất:', err);
      }
    };
    fetchRecent();
  }, []);

  // Fetch Current Post Detail & Related Posts
  useEffect(() => {
    if (!slug) return;

    const fetchPostDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPostBySlug(slug);
        setPost(data);

        if (data.category) {
          const relatedRes = await getPublicPosts({
            category: data.category,
            limit: 4,
          });
          setRelatedPosts(relatedRes.items.filter((p) => p.id !== data.id));
        }
      } catch (err) {
        console.error('Lỗi tải bài viết:', err);
        setError('Bài viết không tồn tại hoặc đã bị ẩn.');
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface selection:bg-primary selection:text-on-primary">
      <Header />

      <main className="flex-grow pt-[80px] md:pt-[100px] pb-24 animate-in fade-in duration-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant/80 overflow-x-auto whitespace-nowrap pt-2">
            <Link to="/" className="hover:text-primary transition-colors">
              Trang chủ
            </Link>
            <ChevronRight size={12} />
            <Link to="/blog" className="hover:text-primary transition-colors">
              Tin tức & Mẹo nội thất
            </Link>
            {post?.category && (
              <>
                <ChevronRight size={12} />
                <Link to={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:text-primary transition-colors">
                  {post.category}
                </Link>
              </>
            )}
            <ChevronRight size={12} />
            <span className="text-on-surface font-bold truncate max-w-xs">{post?.title || 'Chi tiết bài viết'}</span>
          </nav>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
              <div className="lg:col-span-8 space-y-6">
                <div className="h-8 bg-slate-200 rounded w-1/3" />
                <div className="h-12 bg-slate-200 rounded w-3/4" />
                <div className="h-80 bg-slate-200 rounded-3xl" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                  <div className="h-4 bg-slate-200 rounded w-4/6" />
                </div>
              </div>
              <div className="lg:col-span-4 hidden lg:block space-y-6">
                <div className="h-48 bg-slate-200 rounded-2xl" />
                <div className="h-64 bg-slate-200 rounded-2xl" />
              </div>
            </div>
          ) : error || !post ? (
            <div className="max-w-md mx-auto py-16 text-center space-y-4">
              <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-md space-y-4">
                <BookOpen size={48} className="mx-auto text-on-surface-variant/40" />
                <h2 className="text-xl font-bold text-on-surface">{error || 'Không tìm thấy bài viết'}</h2>
                <p className="text-xs text-on-surface-variant">
                  Bài viết bạn truy cập có thể đã bị thay đổi địa chỉ hoặc không còn khả dụng.
                </p>
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-hover transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Trở về danh sách Tin tức</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Main 2-Column Layout (MOHO Detail Style) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Main Article Area (8 Cols) */}
              <div className="lg:col-span-8 space-y-8">
                <article className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden p-6 sm:p-10 space-y-8">
                  {/* Article Header */}
                  <div className="space-y-4 border-b border-outline-variant/20 pb-6">
                    <div className="flex items-center justify-between gap-4">
                      <span className="px-3.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-extrabold rounded-md">
                        {post.category}
                      </span>
                      <button
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                        <span>{copied ? 'Đã sao chép link' : 'Chia sẻ bài viết'}</span>
                      </button>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface leading-tight font-headline-xl">
                      {post.title}
                    </h1>

                    {/* Metadata Line */}
                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-on-surface-variant/80 pt-2 border-t border-outline-variant/15">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 font-medium text-on-surface">
                          <User size={15} className="text-primary" />
                          {post.author_name || 'Ban biên tập MOHO'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={15} />
                          {new Date(post.created_at).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="flex items-center gap-1.5">
                        <Eye size={15} />
                        {post.views || 1} lượt xem
                      </span>
                    </div>

                    {/* Lead Paragraph Summary */}
                    {post.summary && (
                      <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed italic border-l-4 border-primary pl-4 bg-primary/5 py-3 rounded-r-lg font-light">
                        {post.summary}
                      </p>
                    )}
                  </div>

                  {/* Featured Thumbnail */}
                  {post.thumbnail && (
                    <div className="rounded-2xl overflow-hidden max-h-[480px] bg-slate-100 shadow-sm border border-outline-variant/20">
                      <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Article Content */}
                  <div className="prose prose-slate max-w-none text-on-surface leading-relaxed text-sm sm:text-base whitespace-pre-line space-y-4 font-light">
                    {post.content}
                  </div>
                </article>

                {/* Related Articles Section */}
                {relatedPosts.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                      <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 font-headline-md">
                        <Newspaper size={20} className="text-primary" />
                        <span>Bài viết cùng chuyên mục</span>
                      </h3>
                      <Link to="/blog" className="text-xs font-bold text-primary hover:text-primary-hover transition-colors">
                        Xem thêm &rarr;
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {relatedPosts.map((rel) => (
                        <Link
                          key={rel.id}
                          to={`/blog/${rel.slug}`}
                          className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 space-y-3 hover:shadow-lg transition-all duration-300 group flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="h-32 rounded-xl overflow-hidden bg-slate-100 relative">
                              {rel.thumbnail ? (
                                <img
                                  src={rel.thumbnail}
                                  alt={rel.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Newspaper size={30} />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block">
                              {rel.category}
                            </span>
                            <h4 className="font-bold text-on-surface text-xs leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {rel.title}
                            </h4>
                          </div>
                          <span className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 pt-2 border-t border-outline-variant/15">
                            <Calendar size={12} />
                            {new Date(rel.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sticky Sidebar (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="sticky top-28 space-y-6">
                  {/* Categories Widget */}
                  <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2.5">
                      <Tag size={16} className="text-primary" />
                      <span>Chuyên mục tin tức</span>
                    </h3>
                    <div className="space-y-1">
                      <Link
                        to="/blog"
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
                      >
                        <span>Tất cả bài viết</span>
                        <ChevronRight size={14} className="opacity-40" />
                      </Link>

                      {categories.map((cat) => (
                        <Link
                          key={cat}
                          to={`/blog?category=${encodeURIComponent(cat)}`}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            post.category === cat
                              ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold'
                              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                          }`}
                        >
                          <span>{cat}</span>
                          <ChevronRight size={14} className={post.category === cat ? 'text-amber-800' : 'opacity-40'} />
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Recent Posts Widget */}
                  {recentPosts.length > 0 && (
                    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-3">
                      <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2.5">
                        <TrendingUp size={16} className="text-primary" />
                        <span>Bài viết mới nhất</span>
                      </h3>
                      <div className="space-y-3">
                        {recentPosts.map((rPost) => (
                          <Link
                            key={rPost.id}
                            to={`/blog/${rPost.slug}`}
                            className="flex items-start gap-3 group hover:bg-surface-container-high/50 p-1.5 rounded-xl transition-colors"
                          >
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                              {rPost.thumbnail ? (
                                <img
                                  src={rPost.thumbnail}
                                  alt={rPost.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Newspaper size={20} />
                                </div>
                              )}
                            </div>
                            <div className="space-y-1 flex-grow">
                              <h4 className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                {rPost.title}
                              </h4>
                              <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/70">
                                <Clock size={11} />
                                {new Date(rPost.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
