import { useState, useEffect } from 'react';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import toast from 'react-hot-toast';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';
import { compressImage } from '@/utils/image';
import { generateSlug } from '@/utils/string';
import { Plus, Trash2, Pencil, X, Layers, Loader2, Upload, Quote, Image as ImageIcon, FileText } from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  cover_image?: string;
  is_active: boolean;
  products?: { id: number; name: string }[];
}


export default function CollectionListPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', cover_image: '', is_active: true });
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);

  // Thêm State Phân Trang
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  // Tính toán cắt trang
  const total = collections.length;
  const paginatedCollections = collections.slice((page - 1) * limit, page * limit);


  const fetchCollections = async () => {
    try {
      const res = await api.get('/collections/admin/all');
      setCollections(res.data);
    } catch {
      toast.error('Không thể tải danh sách bộ sưu tập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const compressedFile = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressedFile);

      setLocalImageFile(compressedFile);
      setForm((prev) => ({ ...prev, cover_image: previewUrl }));
    } catch {
      toast.error('Xử lý ảnh thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', description: '', cover_image: '', is_active: true });
    setLocalImageFile(null);
    setShowModal(true);
  };

  const openEditModal = (col: Collection) => {
    setEditingId(col.id);
    setForm({
      name: col.name,
      slug: col.slug,
      description: col.description || '',
      cover_image: col.cover_image || '',
      is_active: col.is_active,
    });
    setLocalImageFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let finalImageUrl = form.cover_image;

    if (localImageFile) {
      toast.loading('Đang tải ảnh lên...', { id: 'submit-upload' });
      try {
        const formData = new FormData();
        formData.append('file', localImageFile);

        const res = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImageUrl = res.data.url;
      } catch {
        toast.dismiss('submit-upload');
        toast.error('Tải ảnh thất bại!');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      cover_image: finalImageUrl || undefined,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await api.patch(`/collections/${editingId}`, payload);
        toast.success('Cập nhật bộ sưu tập thành công!');
      } else {
        await api.post('/collections', payload);
        toast.success('Thêm bộ sưu tập thành công!');
      }
      toast.dismiss('submit-upload');
      setShowModal(false);
      fetchCollections();
    } catch (err: any) {
      toast.dismiss('submit-upload');
      const errMsg = err.response?.data?.message || (editingId ? 'Cập nhật thất bại' : 'Thêm thất bại');
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    openConfirm({
      title: 'Xóa bộ sưu tập',
      message: 'Bạn có chắc chắn muốn xóa bộ sưu tập này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa bộ sưu tập',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/collections/${id}`);
          toast.success('Đã xóa bộ sưu tập');
          fetchCollections();
        } catch (err: any) {
          const errMsg = err.response?.data?.message || 'Xóa thất bại';
          toast.error(errMsg);
        }
      }
    });
  };
  if (loading) {
    return <TableLoader message="Đang tải danh sách bộ sưu tập..." minHeightClass="h-64" />;
  }


  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý Bộ sưu tập"
        subtitle="Quản lý danh mục các bộ sưu tập thiết kế và sản phẩm theo chủ đề"
        icon={Layers}
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={16} />
            Thêm bộ sưu tập
          </button>
        }
      />

      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 font-semibold text-slate-600">ID</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Ảnh bìa</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Tên BST</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Trạng thái</th>
              <th className="text-center px-6 py-4 font-semibold text-slate-600">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <Layers size={32} className="mx-auto mb-2 opacity-40" />
                  Chưa có bộ sưu tập nào. Hãy thêm bộ sưu tập đầu tiên!
                </td>
              </tr>
            ) : (
              paginatedCollections.map((col) => (
                <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{col.id}</td>
                  <td className="px-6 py-4">
                    {col.cover_image ? (
                      <img src={col.cover_image} alt={col.name} className="w-16 h-10 object-cover rounded-none border border-slate-200" />
                    ) : (
                      <div className="w-16 h-10 bg-slate-100 rounded-none flex items-center justify-center">
                        <Layers size={16} className="text-slate-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">{col.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-none text-xs font-medium ${col.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {col.is_active ? 'Hiển thị' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(col)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-none transition-all cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(col.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminPagination
          currentPage={page}
          totalItems={total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          itemLabel="bộ sưu tập"
        />
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-5xl p-6 relative my-auto transition-all duration-300">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingId ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* CỐT TRÁI: FORM NHẬP LIỆU */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên BST *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="VD: Bộ sưu tập Mùa Thu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Slug (tự động)</label>
                    <input
                      name="slug"
                      value={form.slug}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-none border border-slate-200 bg-slate-50 text-slate-500 text-sm"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Mô tả</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={5}
                      className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-sans"
                      placeholder="Nhập mô tả bộ sưu tập..."
                    ></textarea>
                  </div>

                  {/* Upload ảnh bìa */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Ảnh bìa</label>
                    <div className="flex items-start gap-4">
                      <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-slate-300 rounded-none hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer shrink-0">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {uploadingImage ? (
                          <Loader2 size={20} className="text-blue-500 animate-spin" />
                        ) : (
                          <>
                            <Upload size={18} className="text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-400">Chọn ảnh</span>
                          </>
                        )}
                      </label>
                      {form.cover_image && (
                        <div className="relative group">
                          <img
                            src={form.cover_image}
                            alt="Preview"
                            className="h-24 object-cover rounded-none border border-slate-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (form.cover_image.startsWith('blob:')) {
                                URL.revokeObjectURL(form.cover_image);
                              }
                              setLocalImageFile(null);
                              setForm((prev) => ({ ...prev, cover_image: '' }));
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-none text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center pt-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-none focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-900">
                      Hiển thị bộ sưu tập
                    </label>
                  </div>
                </div>

                {/* CỘT PHẢI: BẢN XEM TRƯỚC (LIVE PREVIEW) */}
                <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-start space-y-5">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-none border border-blue-100 inline-block self-start">
                    Bản xem trước giao diện User (Live Preview)
                  </h3>

                  {/* 1. Xem trước Banner */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      1. Ảnh bìa & Tiêu đề (Hero Banner)
                    </span>
                    <div className="relative w-full h-32 rounded-none overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                      {form.cover_image ? (
                        <img
                          src={form.cover_image}
                          alt="Hero preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                          <ImageIcon size={24} className="opacity-40" />
                          <span className="text-[10px]">Chưa có ảnh bìa bộ sưu tập</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-3 text-center">
                        <span className="text-[9px] text-white/60 uppercase tracking-[0.25em] font-light mb-1">
                          BỘ SƯU TẬP
                        </span>
                        <h4 className="text-white font-bold text-base tracking-wider truncate max-w-full px-4">
                          {form.name || 'Tên bộ sưu tập'}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* 2. Xem trước Bố cục mô tả */}
                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        2. Câu chuyện cảm hứng (Inspiration)
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 rounded-none p-4 flex-1 flex flex-col justify-start min-h-[220px]">
                      <div className="text-left mb-3.5 scale-90 origin-left">
                        <span className="text-blue-600 text-[9px] font-bold tracking-[0.2em] uppercase block mb-1">
                          Ý tưởng & Câu chuyện
                        </span>
                        <h5 className="text-slate-800 text-sm font-semibold">Cảm hứng thiết kế</h5>
                        <div className="w-6 h-[1.5px] bg-blue-600 mt-1"></div>
                      </div>

                      {(() => {
                        const paragraphs = form.description.split('\n').filter(p => p.trim() !== '');
                        if (paragraphs.length === 0) {
                          return (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8 text-center italic text-xs gap-1.5">
                              <FileText size={20} className="opacity-40" />
                              <span>Hãy gõ mô tả ở ô bên trái để xem bố cục giả lập...</span>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2 text-[10.5px] leading-relaxed max-h-[160px] overflow-y-auto pr-1">
                            {paragraphs.map((p, idx) => (
                              <p key={idx} className={idx === 0 ? 'text-slate-800 font-semibold' : 'text-slate-600'}>
                                {p}
                              </p>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-none transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-none transition-all cursor-pointer"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
