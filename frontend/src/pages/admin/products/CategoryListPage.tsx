import { useState, useEffect } from 'react';
import api from '@/services/api';
import { compressImage } from '@/utils/image';
import { generateSlug } from '@/utils/string';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import ConfirmModal from '@/components/ConfirmModal';
import AdminPageHeader from '@/components/AdminPageHeader';
import useConfirmModal from '@/hooks/useConfirmModal';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, FolderTree, Loader2, Upload, ChevronRight, ChevronDown } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
  parent?: Category | null;
  children?: Category[];
  level?: number;
}

const flattenCategories = (nodes: Category[], parent: Category | null = null, level = 0): Category[] => {
  const result: Category[] = [];
  for (const node of nodes) {
    // Tự động gán parent kế thừa từ hàm đệ quy cấp trên
    const nodeWithParent = { ...node, parent, level };
    result.push(nodeWithParent);
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategories(node.children, nodeWithParent, level + 1));
    }
  }
  return result;
};

export default function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // 1. Lấy danh sách các danh mục gốc (cấp 0)
  const rootCategories = categories.filter((cat) => (cat.level || 0) === 0);
  const total = rootCategories.length; // Tổng số danh mục gốc

  // 2. Lấy các danh mục gốc của trang hiện tại
  const paginatedRoots = rootCategories.slice((page - 1) * limit, page * limit);
  const paginatedRootIds = new Set(paginatedRoots.map((r) => r.id));

  // 3. Hàm truy tìm ID danh mục gốc của 1 danh mục bất kỳ
  const getRootId = (cat: Category): number => {
    let curr = cat;
    while (curr.parent) {
      curr = curr.parent;
    }
    return curr.id;
  };

  // 4. Lọc danh sách danh mục thuộc các gốc của trang hiện tại
  const paginatedCategories = categories.filter((cat) =>
    paginatedRootIds.has(getRootId(cat))
  );



  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', image_url: '', parentId: '' as string | number });
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      const flat = flattenCategories(res.data);
      setCategories(flat);
    } catch {
      toast.error('Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isVisible = (cat: Category): boolean => {
    let current = cat.parent;
    while (current) {
      if (!expandedIds.has(current.id)) return false;
      current = current.parent;
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'name' ? { slug: generateSlug(value) } : {}),
    }));
  };

  // Xử lý ảnh (chỉ hiển thị preview, chưa upload)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const compressedFile = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressedFile);

      setLocalImageFile(compressedFile);
      setForm((prev) => ({ ...prev, image_url: previewUrl }));
    } catch {
      toast.error('Xử lý ảnh thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', image_url: '', parentId: '' });
    setLocalImageFile(null);
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      image_url: cat.image_url || '',
      parentId: cat.parent?.id || '',
    });
    setLocalImageFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let finalImageUrl = form.image_url;

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
      image_url: finalImageUrl || undefined,
      parentId: form.parentId === '' ? null : Number(form.parentId),
    };

    try {
      if (editingId) {
        await api.patch(`/categories/${editingId}`, payload);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await api.post('/categories', payload);
        toast.success('Thêm danh mục thành công!');
      }
      toast.dismiss('submit-upload');
      setShowModal(false);
      fetchCategories();
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
      title: 'Xóa danh mục',
      message: 'Bạn có chắc chắn muốn xóa danh mục này? Tất cả danh mục con phụ thuộc có thể bị ảnh hưởng. Hành động này không thể hoàn tác.',
      confirmText: 'Xóa danh mục',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/categories/${id}`);
          toast.success('Đã xóa danh mục');
          fetchCategories();
        } catch (err: any) {
          const errMsg = err.response?.data?.message || 'Xóa thất bại';
          toast.error(errMsg);
        }
      }
    });
  };

  if (loading) {
    return <TableLoader message="Đang tải danh sách danh mục..." minHeightClass="h-64" />;
  }

  // Helper to find all descendant IDs of a category
  const getDescendantIds = (catId: number, flatList: Category[]): number[] => {
    const ids: number[] = [];
    const findChildren = (parentId: number) => {
      const children = flatList.filter((c) => c.parent?.id === parentId);
      for (const child of children) {
        ids.push(child.id);
        findChildren(child.id);
      }
    };
    findChildren(catId);
    return ids;
  };

  const invalidParentIds = editingId ? [editingId, ...getDescendantIds(editingId, categories)] : [];
  const parentOptions = categories.filter((c) => !invalidParentIds.includes(c.id));

  return (
    <div>
      <AdminPageHeader
        title="Quản lý Danh mục"
        subtitle="Quản lý danh mục sản phẩm và phân cấp danh mục trong hệ thống"
        icon={FolderTree}
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-sm font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus size={18} />
            Thêm danh mục
          </button>
        }
      />

      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 font-semibold text-slate-600">ID</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Ảnh</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Tên danh mục</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Slug</th>
              <th className="text-center px-6 py-4 font-semibold text-slate-600">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <FolderTree size={32} className="mx-auto mb-2 opacity-40" />
                  Chưa có danh mục nào. Hãy thêm danh mục đầu tiên!
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat) => {
                if (!isVisible(cat)) return null;
                const hasChildren = categories.some((c) => c.parent?.id === cat.id);
                const isExpanded = expandedIds.has(cat.id);

                return (
                  <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{cat.id}</td>
                    <td className="px-6 py-4">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-10 h-10 object-cover rounded-none border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-none flex items-center justify-center">
                          <FolderTree size={16} className="text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center" style={{ paddingLeft: `${(cat.level || 0) * 1.5}rem` }}>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="mr-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-none transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          (cat.level || 0) > 0 ? (
                            <span className="w-6 mr-2 inline-block text-slate-300 font-mono text-right pr-1">└─</span>
                          ) : (
                            <span className="w-6 mr-2 inline-block"></span>
                          )
                        )}
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{cat.slug}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-none transition-all cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <AdminPagination
          currentPage={page}
          totalItems={total}
          pageSize={limit}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          itemLabel="danh mục"
        />

      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingId ? 'Sửa danh mục' : 'Thêm danh mục mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên danh mục *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="VD: Sofa Phòng Khách"
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
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Danh mục cha</label>
                <select
                  name="parentId"
                  value={form.parentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-white cursor-pointer"
                >
                  <option value="">Không có (Danh mục gốc)</option>
                  {parentOptions.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {'\u00A0\u00A0\u00A0\u00A0'.repeat(parent.level || 0)}
                      {(parent.level || 0) > 0 ? '└─ ' : ''}
                      {parent.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload ảnh Cloudinary */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Ảnh đại diện</label>
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
                  {form.image_url && (
                    <div className="relative group">
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-none border border-slate-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (form.image_url.startsWith('blob:')) {
                            URL.revokeObjectURL(form.image_url);
                          }
                          setLocalImageFile(null);
                          setForm((prev) => ({ ...prev, image_url: '' }));
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-none text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
