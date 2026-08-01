import { useState, useEffect } from 'react';
import { bannerService,type Banner } from '@/services/banner.service';
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
  Image as ImageIcon,
  Loader2,
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
  Search,
} from 'lucide-react';

export default function BannerListPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal confirm
  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  // Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: 'Xem sản phẩm',
    button_link: '/shop',
    position: 1,
    is_active: true,
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await bannerService.getBannersAdmin();
      setBanners(data);
    } catch {
      toast.error('Không thể tải danh sách banner');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Filter & Paginate
  const filteredBanners = banners.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q))
    );
  });

  const total = filteredBanners.length;
  const paginatedBanners = filteredBanners.slice((page - 1) * limit, page * limit);

  // Open Modal Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      button_text: 'Xem ngay',
      button_link: '/shop',
      position: banners.length > 0 ? Math.max(...banners.map((b) => b.position || 0)) + 1 : 1,
      is_active: true,
    });
    setShowModal(true);
  };

  // Open Modal Edit
  const handleOpenEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      image_url: banner.image_url,
      button_text: banner.button_text || 'Xem ngay',
      button_link: banner.button_link || '/shop',
      position: banner.position || 1,
      is_active: banner.is_active,
    });
    setShowModal(true);
  };

  // Upload image to Cloudinary
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
      setForm((prev) => ({ ...prev, image_url: res.data.url }));
      toast.success('Đã tải ảnh lên thành công');
    } catch {
      toast.error('Lỗi khi tải ảnh lên Cloudinary');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề banner');
      return;
    }
    if (!form.image_url.trim()) {
      toast.error('Vui lòng cung cấp hình ảnh banner');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await bannerService.updateBanner(editingId, form);
        toast.success('Cập nhật banner thành công!');
      } else {
        await bannerService.createBanner(form);
        toast.success('Tạo mới banner thành công!');
      }
      setShowModal(false);
      fetchBanners();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: number) => {
    try {
      await bannerService.toggleBannerActive(id);
      toast.success('Đã cập nhật trạng thái hiển thị');
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch {
      toast.error('Không thể đổi trạng thái banner');
    }
  };

  // Confirm Delete
  const handleDeleteClick = (banner: Banner) => {
    openConfirm({
      title: 'Xóa Banner',
      message: `Bạn có chắc chắn muốn xóa banner "${banner.title}"? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa Banner',
      type: 'danger',
      onConfirm: async () => {
        try {
          await bannerService.deleteBanner(banner.id);
          toast.success('Đã xóa banner');
          fetchBanners();
        } catch {
          toast.error('Không thể xóa banner');
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
        title="Quản lý Banner Slider"
        subtitle="Quản lý hình ảnh, thông điệp và liên kết của các Banner quảng cáo nổi bật trên Trang chủ."
        icon={ImageIcon}
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-none shadow transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Thêm Banner mới</span>
          </button>
        }
      />

      {/* Control Bar: Search */}
      <div className="bg-white p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, thẻ badge, mô tả..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Tổng số banner: <span className="font-bold text-slate-800">{total}</span>
        </div>
      </div>

      {/* Banner Table */}
      <div className="bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <TableLoader message="Đang tải danh sách banner..." />
        ) : paginatedBanners.length === 0 ? (
          <div className="py-12 text-center">
            <ImageIcon size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm">Chưa có banner nào</p>
            <p className="text-slate-400 text-xs mt-1">Hãy nhấn nút "Thêm Banner mới" để bắt đầu tạo quảng cáo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">Vị trí</th>
                  <th className="py-3 px-4 w-44">Hình ảnh</th>
                  <th className="py-3 px-4">Thông điệp Banner</th>
                  <th className="py-3 px-4">Nút hành động</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedBanners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Vị trí */}
                    <td className="py-3 px-4 text-center font-bold text-slate-600">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-100 text-slate-800 font-mono text-xs">
                        #{banner.position}
                      </span>
                    </td>

                    {/* Preview Image */}
                    <td className="py-3 px-4">
                      <div className="relative w-36 h-20 bg-slate-100 rounded overflow-hidden border border-slate-200 shadow-sm group">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </td>

                    {/* Text content */}
                    <td className="py-3 px-4 max-w-xs">
                      {banner.subtitle && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 rounded mb-1">
                          {banner.subtitle}
                        </span>
                      )}
                      <h4 className="font-bold text-slate-900 text-sm">{banner.title}</h4>
                      {banner.description && (
                        <p className="text-slate-500 text-xs line-clamp-2 mt-0.5">{banner.description}</p>
                      )}
                    </td>

                    {/* Button info */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-block font-semibold px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 shadow-2xs">
                          {banner.button_text}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                          <ExternalLink size={12} />
                          <span className="truncate max-w-[150px]">{banner.button_link}</span>
                        </div>
                      </div>
                    </td>

                    {/* Active toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(banner.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          banner.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {banner.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                        <span>{banner.is_active ? 'Hiển thị' : 'Đang ẩn'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(banner)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(banner)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Xóa"
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
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <AdminPagination
              currentPage={page}
              totalItems={total}
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

      {/* Modal Thêm / Chỉnh sửa Banner */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ImageIcon size={18} className="text-indigo-400" />
                {editingId ? 'Chỉnh sửa Banner' : 'Thêm Banner mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Tiêu đề chính */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tiêu đề Banner <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: PHÒNG NGỦ ẤM ÁP"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Subtitle / Badge */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Thẻ Badge / Tiêu đề phụ
                </label>
                <input
                  type="text"
                  placeholder="VD: Không gian yên bình"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả nội dung</label>
                <textarea
                  rows={2}
                  placeholder="VD: Chăm sóc giấc ngủ trọn vẹn của bạn bằng những mẫu giường gỗ tự nhiên..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Hình ảnh Banner */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Hình ảnh Banner <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Dán đường dẫn URL ảnh hoặc chọn file tải lên bên phải"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-none cursor-pointer transition-colors shrink-0">
                      {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>Tải ảnh lên</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Image Preview Box */}
                  {form.image_url && (
                    <div className="relative w-full h-36 bg-slate-100 border border-slate-200 overflow-hidden group">
                      <img src={form.image_url} alt="Banner Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, image_url: '' })}
                          className="p-2 bg-rose-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} /> Xóa ảnh
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Nút bấm Text & Link URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tên nút bấm (Button Text)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Xem sản phẩm"
                    value={form.button_text}
                    onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Đường dẫn nút (Button Link)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: /shop hoặc /collection/coastal"
                    value={form.button_link}
                    onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Position & IsActive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Thứ tự hiển thị (Position)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className="text-xs font-bold text-slate-700">
                    {form.is_active ? 'Bật hiển thị' : 'Đang ẩn'}
                  </span>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-none shadow transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingId ? 'Lưu thay đổi' : 'Tạo Banner'}</span>
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
