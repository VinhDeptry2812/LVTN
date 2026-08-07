import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getPublicPosts, getPostCategories, type Post } from '@/services/post.service';
import {
  Search,
  Calendar,
  Eye,
  User,
  ChevronRight,
  BookOpen,
  Newspaper,
  ArrowRight,
  Tag,
  Clock,
  TrendingUp,
} from 'lucide-react';

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Fetch categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await getPostCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Lỗi lấy danh mục bài viết:', err);
      }
    };
    fetchCats();
  }, []);

  // Fetch recent posts for sidebar
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

  // Fetch posts with filter & pagination
  useEffect(() => {
    const fetchPostsData = async () => {
      try {
        setLoading(true);
        const data = await getPublicPosts({
          page: currentPage,
          limit: 7, // 1 featured + 6 grid items
          category: selectedCategory,
          search: searchQuery,
        });
        setPosts(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      } catch (err) {
        console.error('Lỗi tải bài viết:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPostsData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, selectedCategory, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleCategoryChange = (cat: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (cat) {
      newParams.set('category', cat);
    } else {
      newParams.delete('category');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const gridPosts = posts.length > 0 ? (featuredPost && currentPage === 1 && !searchQuery ? posts.slice(1) : posts) : [];

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface selection:bg-primary selection:text-on-primary">
      <Header />

      <main className="flex-grow pt-[80px] md:pt-[100px] pb-24 animate-in fade-in duration-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant/80 pt-2">
            <Link to="/" className="hover:text-primary transition-colors">
              Trang chủ
            </Link>
            <ChevronRight size={12} />
            <span className="text-on-surface font-bold">Tin tức & Mẹo nội thất</span>
            {selectedCategory && (
              <>
                <ChevronRight size={12} />
                <span className="text-primary font-semibold">{selectedCategory}</span>
              </>
            )}
          </nav>

          {/* Main 2-Column Layout (MOHO Style) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Main Content Area (8 Cols) */}
            <div className="lg:col-span-8 space-y-8">
              {loading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="h-80 bg-slate-200 rounded-3xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="h-64 bg-slate-200 rounded-2xl" />
                    <div className="h-64 bg-slate-200 rounded-2xl" />
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-3xl p-12 border border-outline-variant/30 text-center space-y-4 shadow-sm">
                  <BookOpen size={48} className="mx-auto text-on-surface-variant/40" />
                  <h3 className="text-lg font-bold text-on-surface">Không tìm thấy bài viết phù hợp</h3>
                  <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                    Thử tìm kiếm với từ khóa khác hoặc chọn chuyên mục bài viết khác để khám phá.
                  </p>
                  <button
                    onClick={() => {
                      setSearchInput('');
                      handleCategoryChange('');
                    }}
                    className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    Xem tất cả bài viết
                  </button>
                </div>
              ) : (
                <>
                  {/* Featured Post Card (Top 1) */}
                  {featuredPost && currentPage === 1 && !searchQuery && (
                    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group">
                      <div className="grid grid-cols-1 md:grid-cols-12">
                        <div className="md:col-span-6 h-64 md:h-full relative overflow-hidden bg-slate-100">
                          {featuredPost.thumbnail ? (
                            <img
                              src={featuredPost.thumbnail}
                              alt={featuredPost.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Newspaper size={48} />
                            </div>
                          )}
                          <span className="absolute top-4 left-4 bg-amber-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-md shadow-md uppercase tracking-wider">
                            Nổi bật
                          </span>
                        </div>
                        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-md inline-block">
                              {featuredPost.category}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-bold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
                              <Link to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                            </h2>
                            <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-3 font-light leading-relaxed">
                              {featuredPost.summary || featuredPost.content.substring(0, 150) + '...'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-on-surface-variant/80 border-t border-outline-variant/20 pt-4">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 font-medium text-on-surface">
                                <User size={14} className="text-primary" />
                                {featuredPost.author_name || 'Admin'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(featuredPost.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <Link
                              to={`/blog/${featuredPost.slug}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover group-hover:translate-x-1 transition-all"
                            >
                              <span>Đọc tiếp</span>
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Title */}
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                    <h2 className="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2 font-headline-md">
                      <Newspaper size={20} className="text-primary" />
                      <span>{selectedCategory ? `Bài viết thuộc danh mục "${selectedCategory}"` : 'Danh sách bài viết'}</span>
                    </h2>
                    <span className="text-xs text-on-surface-variant font-medium">Tổng số {totalItems} bài viết</span>
                  </div>

                  {/* Grid Articles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {gridPosts.map((post) => (
                      <article
                        key={post.id}
                        className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group"
                      >
                        <Link to={`/blog/${post.slug}`} className="h-48 overflow-hidden bg-slate-100 relative block">
                          {post.thumbnail ? (
                            <img
                              src={post.thumbnail}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Newspaper size={36} />
                            </div>
                          )}
                          <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-surface-container-lowest/90 backdrop-blur-md text-amber-800 text-[11px] font-bold rounded border border-amber-200/60">
                            {post.category}
                          </span>
                        </Link>

                        <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <h3 className="font-bold text-on-surface text-sm sm:text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                            </h3>
                            <p className="text-xs text-on-surface-variant line-clamp-2 font-light leading-relaxed">
                              {post.summary || post.content.substring(0, 100) + '...'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant/80 pt-3 border-t border-outline-variant/15">
                            <span className="flex items-center gap-1">
                              <Calendar size={13} />
                              {new Date(post.created_at).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={13} />
                              {post.views || 1}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-outline-variant/30 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        Trang trước
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            p === currentPage
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'border border-outline-variant/30 hover:bg-surface-container-high text-on-surface'
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-outline-variant/30 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        Trang sau
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Sticky Sidebar (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="sticky top-28 space-y-6">
                {/* Search Box Widget */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2.5">
                    <Search size={16} className="text-primary" />
                    <span>Tìm kiếm tin tức</span>
                  </h3>
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      type="text"
                      placeholder="Nhập từ khóa tìm kiếm..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-surface-container-high rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-colors"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-hover cursor-pointer"
                    >
                      <Search size={15} />
                    </button>
                  </form>
                </div>

                {/* Categories Widget */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2.5">
                    <Tag size={16} className="text-primary" />
                    <span>Chuyên mục tin tức</span>
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleCategoryChange('')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedCategory === ''
                          ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold'
                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                      }`}
                    >
                      <span>Tất cả bài viết</span>
                      <ChevronRight size={14} className={selectedCategory === '' ? 'text-amber-800' : 'opacity-40'} />
                    </button>

                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold'
                            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                        }`}
                      >
                        <span>{cat}</span>
                        <ChevronRight size={14} className={selectedCategory === cat ? 'text-amber-800' : 'opacity-40'} />
                      </button>
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
                      {recentPosts.map((post) => (
                        <Link
                          key={post.id}
                          to={`/blog/${post.slug}`}
                          className="flex items-start gap-3 group hover:bg-surface-container-high/50 p-1.5 rounded-xl transition-colors"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                            {post.thumbnail ? (
                              <img
                                src={post.thumbnail}
                                alt={post.title}
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
                              {post.title}
                            </h4>
                            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/70">
                              <Clock size={11} />
                              {new Date(post.created_at).toLocaleDateString('vi-VN')}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
