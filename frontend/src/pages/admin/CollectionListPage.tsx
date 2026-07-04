import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, Layers, Loader2, Upload } from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  cover_image?: string;
  is_active: boolean;
  products?: { id: number; name: string }[];
}

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function CollectionListPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', cover_image: '', is_active: true });
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);

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

  // Auto-generate slug
  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

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

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa bộ sưu tập này?')) return;
    try {
      await api.delete(`/collections/${id}`);
      toast.success('Đã xóa bộ sưu tập');
      fetchCollections();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Xóa thất bại';
      toast.error(errMsg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Bộ sưu tập</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          <Plus size={18} />
          Thêm bộ sưu tập
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
              collections.map((col) => (
                <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{col.id}</td>
                  <td className="px-6 py-4">
                    {col.cover_image ? (
                      <img src={col.cover_image} alt={col.name} className="w-16 h-10 object-cover rounded border border-slate-200" />
                    ) : (
                      <div className="w-16 h-10 bg-slate-100 rounded flex items-center justify-center">
                        <Layers size={16} className="text-slate-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">{col.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${col.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {col.is_active ? 'Hiển thị' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(col)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(col.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
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
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative my-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingId ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên BST *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="VD: Bộ sưu tập Mùa Thu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Slug (tự động)</label>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Mô tả</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="Nhập mô tả bộ sưu tập..."
                ></textarea>
              </div>

              {/* Upload ảnh bìa */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Ảnh bìa</label>
                <div className="flex items-start gap-4">
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer shrink-0">
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
                        className="h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
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
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-900">
                  Hiển thị bộ sưu tập
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
