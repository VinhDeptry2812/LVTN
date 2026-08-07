import { useState, useEffect } from 'react';
import { postService, type Post, PostStatus } from '@/services/post.service';
import api from '@/services/api';
import { compressImage } from '@/utils/image';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Pencil,
  X,
  FileText,
  Loader2,
  Upload,
  Eye,
  Search,
  Star,
  CheckCircle2,
  Sparkles,
  Filter,
} from 'lucide-react';

const CATEGORIES = [
  'Mẹo nội thất',
  'Xu hướng thiết kế',
  'Tin tức & Sự kiện',
  'Hướng dẫn mua sắm',
  'Khuyến mãi & Quyền lợi',
];

export default function PostListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal confirm
  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  // Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    category: 'Mẹo nội thất',
    status: PostStatus.PUBLISHED,
    summary: '',
    content: '',
    thumbnail: '',
    author_name: 'Ban biên tập FurniShop',
    is_featured: false,
  });

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await postService.getPostsAdmin({
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        status: (selectedStatus as PostStatus) || undefined,
        page,
        limit,
      });
      setPosts(res.items);
      setTotalItems(res.total);
    } catch {
      toast.error('Không thể tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, limit, selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  // Open Modal Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      slug: '',
      category: 'Mẹo nội thất',
      status: PostStatus.PUBLISHED,
      summary: '',
      content: '',
      thumbnail: '',
      author_name: 'Ban biên tập FurniShop',
      is_featured: false,
    });
    setShowModal(true);
  };

  // Open Modal Edit
  const handleOpenEdit = (post: Post) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      category: post.category || 'Mẹo nội thất',
      status: post.status,
      summary: post.summary || '',
      content: post.content || '',
      thumbnail: post.thumbnail || '',
      author_name: post.author_name || 'Ban biên tập FurniShop',
      is_featured: post.is_featured,
    });
    setShowModal(true);
  };

  // Upload thumbnail image to Cloudinary
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);

      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, thumbnail: res.data.url }));
      toast.success('Đã tải ảnh đại diện lên thành công');
    } catch {
      toast.error('Lỗi khi tải ảnh lên server');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Vui lòng nhập nội dung bài viết');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await postService.updatePost(editingId, form);
        toast.success('Cập nhật bài viết thành công!');
      } else {
        await postService.createPost(form);
        toast.success('Tạo mới bài viết thành công!');
      }
      setShowModal(false);
      fetchPosts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu bài viết');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle featured status
  const handleToggleFeatured = async (id: number) => {
    try {
      await postService.toggleFeatured(id);
      toast.success('Đã cập nhật trạng thái bài viết nổi bật');
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_featured: !p.is_featured } : p))
      );
    } catch {
      toast.error('Không thể đổi trạng thái bài viết nổi bật');
    }
  };

  // Confirm Delete
  const handleDeleteClick = (post: Post) => {
    openConfirm({
      title: 'Xóa bài viết',
      message: `Bạn có chắc chắn muốn xóa bài viết "${post.title}"? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa bài viết',
      type: 'danger',
      onConfirm: async () => {
        try {
          await postService.deletePost(post.id);
          toast.success('Đã xóa bài viết');
          fetchPosts();
        } catch {
          toast.error('Không thể xóa bài viết');
        } finally {
          closeConfirm();
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Quản lý Bài viết & Tin tức"
        subtitle="Soạn thảo, quản lý bài viết tin tức, mẹo thiết kế nội thất và kinh nghiệm mua sắm trên Storefront."
        icon={FileText}
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-none shadow transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Viết bài mới</span>
          </button>
        }
      />

      {/* Control Bar: Search & Filter */}
      <div className="bg-white p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tiêu đề hoặc tóm tắt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Tất cả danh mục</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value={PostStatus.PUBLISHED}>Đã xuất bản</option>
              <option value={PostStatus.DRAFT}>Bản nháp</option>
              <option value={PostStatus.ARCHIVED}>Lưu trữ</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-none cursor-pointer flex items-center gap-1.5"
          >
            <Filter size={14} />
            <span>Lọc</span>
          </button>
        </form>

        <div className="text-xs text-slate-500 font-medium shrink-0">
          Tổng bài viết: <span className="font-bold text-slate-800">{totalItems}</span>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <TableLoader message="Đang tải danh sách bài viết..." />
        ) : posts.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">Chưa tìm thấy bài viết nào</p>
            <p className="text-slate-400 text-xs mt-1">Hãy nhấn nút "Viết bài mới" để bắt đầu biên tập nội dung.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-32">Ảnh đại diện</th>
                  <th className="py-3 px-4">Bài viết & Tóm tắt</th>
                  <th className="py-3 px-4">Danh mục</th>
                  <th className="py-3 px-4 text-center">Nổi bật</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Lượt xem</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {posts.map((post, idx) => (
                  <tr key={post.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* STT */}
                    <td className="py-3 px-4 text-center font-bold text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>

                    {/* Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="w-24 h-16 bg-slate-100 rounded overflow-hidden border border-slate-200 shadow-2xs">
                        {post.thumbnail ? (
                          <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <FileText size={24} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Title & Summary */}
                    <td className="py-3 px-4 max-w-sm">
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1 hover:text-indigo-600 transition-colors">
                        {post.title}
                      </h4>
                      {post.summary && (
                        <p className="text-slate-500 text-xs line-clamp-2 mt-0.5">{post.summary}</p>
                      )}
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>Tác giả: {post.author_name || 'Ban biên tập'}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded">
                        {post.category || 'Mẹo nội thất'}
                      </span>
                    </td>

                    {/* Featured toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleFeatured(post.id)}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          post.is_featured
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100'
                        }`}
                        title={post.is_featured ? 'Hủy nổi bật' : 'Đánh dấu nổi bật'}
                      >
                        <Star size={18} fill={post.is_featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full ${
                          post.status === PostStatus.PUBLISHED
                            ? 'bg-emerald-100 text-emerald-800'
                            : post.status === PostStatus.DRAFT
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {post.status === PostStatus.PUBLISHED ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Đã xuất bản</span>
                          </>
                        ) : post.status === PostStatus.DRAFT ? (
                          'Bản nháp'
                        ) : (
                          'Lưu trữ'
                        )}
                      </span>
                    </td>

                    {/* Views */}
                    <td className="py-3 px-4 text-center font-semibold text-slate-600">
                      <div className="flex items-center justify-center gap-1">
                        <Eye size={13} className="text-slate-400" />
                        <span>{post.views || 0}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(post)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Chỉnh sửa bài viết"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(post)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Xóa bài viết"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalItems > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <AdminPagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal Thêm / Chỉnh sửa Bài viết */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 text-slate-900 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-slate-900">
                  <FileText size={18} className="text-indigo-600" />
                  {editingId ? 'Chỉnh sửa bài viết' : 'Soạn bài viết mới'}
                </h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Nhập nội dung thông tin bài viết tin tức, mẹo trang trí nội thất cho khách hàng.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] space-y-5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Cột trái (8 cols): Tiêu đề, Tóm tắt, Nội dung */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Tiêu đề */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Tiêu đề bài viết <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: 10 Mẹo trang trí phòng khách đẹp chuẩn phong cách Bắc Âu"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Đường dẫn Slug (Tùy chọn - tự tạo theo tiêu đề nếu để trống)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 10-meo-trang-tri-phong-khach"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 font-mono bg-slate-50"
                    />
                  </div>

                  {/* Tóm tắt */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Tóm tắt bài viết (Mô tả ngắn)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Nhập 1 - 2 câu tóm tắt nội dung thu hút người đọc..."
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Nội dung chi tiết */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nội dung chi tiết bài viết <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={10}
                      required
                      placeholder="Nhập nội dung đầy đủ bài viết ở đây..."
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
                    />
                  </div>
                </div>

                {/* Cột phải (4 cols): Thumbnail, Danh mục, Trạng thái, Tác giả */}
                <div className="lg:col-span-4 space-y-4 bg-slate-50 p-4 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                    Cấu hình bài viết
                  </h4>

                  {/* Thumbnail */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Ảnh đại diện Thumbnail
                    </label>
                    <div className="space-y-2">
                      <div className="w-full h-36 bg-slate-200 rounded border border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative group">
                        {form.thumbnail ? (
                          <img src={form.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-slate-400 p-3">
                            <Upload size={24} className="mx-auto mb-1 opacity-50" />
                            <span className="text-[11px]">Chưa có ảnh đại diện</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="URL ảnh hoặc chọn file"
                          value={form.thumbnail}
                          onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded-none text-[11px]"
                        />
                        <label className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-none cursor-pointer shrink-0">
                          {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                          <span>Tải</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Danh mục */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Danh mục bài viết
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-none text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Trạng thái */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Trạng thái bài viết
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as PostStatus })}
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-none text-xs focus:ring-1 focus:ring-indigo-500 font-semibold"
                    >
                      <option value={PostStatus.PUBLISHED}>Đã xuất bản (Công khai)</option>
                      <option value={PostStatus.DRAFT}>Bản nháp (Ẩn)</option>
                      <option value={PostStatus.ARCHIVED}>Lưu trữ</option>
                    </select>
                  </div>

                  {/* Tác giả */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Tác giả hiển thị
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Ban biên tập FurniShop"
                      value={form.author_name}
                      onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Checkbox Bài viết nổi bật */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_featured}
                        onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Sparkles size={14} className="text-amber-500" />
                        Đánh dấu Bài viết Nổi bật
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-none hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-none shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingId ? 'Lưu thay đổi' : 'Đăng bài viết'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
