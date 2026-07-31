/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Search, Loader2, Phone, Mail, MapPin, FileText, CheckCircle2, XCircle, ChevronLeft, ChevronRight, X, Truck } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_code?: string;
  is_active: boolean;
  created_at: string;
}

interface PaginatedResponse {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
}

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    tax_code: '',
    is_active: true,
  });

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse>('/suppliers', {
        params: {
          page,
          limit,
          search: search || undefined,
        },
      });
      setSuppliers(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      tax_code: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingId(sup.id);
    setForm({
      name: sup.name,
      contact_name: sup.contact_name || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      tax_code: sup.tax_code || '',
      is_active: sup.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/suppliers/${editingId}`, form);
        toast.success('Cập nhật nhà cung cấp thành công!');
      } else {
        await api.post('/suppliers', form);
        toast.success('Thêm nhà cung cấp thành công!');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    openConfirm({
      title: 'Xóa nhà cung cấp',
      message: 'Bạn có chắc chắn muốn xóa nhà cung cấp này? Các đơn nhập hàng liên quan vẫn sẽ được lưu trữ trong lịch sử hệ thống.',
      confirmText: 'Xóa',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/suppliers/${id}`);
          toast.success('Xóa nhà cung cấp thành công!');
          fetchSuppliers();
        } catch (err: any) {
          const errMsg = err.response?.data?.message || 'Không thể xóa nhà cung cấp';
          toast.error(errMsg);
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Nhà cung cấp"
        subtitle="Quản lý danh sách đối tác cung ứng sản phẩm cho cửa hàng"
        icon={Truck}
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            Thêm nhà cung cấp
          </button>
        }
      />

      {/* Filters & Search */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên, email, sđt..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-none border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-none transition-colors cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <TableLoader />
        ) : suppliers.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText size={48} className="mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-base font-medium">Chưa có nhà cung cấp nào</p>
            <p className="text-sm mt-1">Hãy bấm nút "Thêm nhà cung cấp" để bắt đầu</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Nhà cung cấp</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Đại diện liên hệ</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Thông tin liên lạc</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Mã số thuế</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Trạng thái</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{sup.name}</div>
                        {sup.address && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 max-w-xs truncate">
                            <MapPin size={12} className="shrink-0" />
                            <span>{sup.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{sup.contact_name || '-'}</td>
                      <td className="px-6 py-4 space-y-1">
                        {sup.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone size={12} className="text-slate-400" />
                            <span>{sup.phone}</span>
                          </div>
                        )}
                        {sup.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail size={12} className="text-slate-400" />
                            <span>{sup.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{sup.tax_code || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-none ${sup.is_active
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                        >
                          {sup.is_active ? (
                            <>
                              <CheckCircle2 size={12} />
                              Hoạt động
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              Tạm dừng
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(sup)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-none transition-all cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(sup.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-none transition-all cursor-pointer"
                            title="Xóa nhà cung cấp"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <AdminPagination
              currentPage={page}
              totalItems={total}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="nhà cung cấp"
            />
          </>
        )}
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingId ? 'Chỉnh sửa thông tin nhà cung cấp' : 'Thêm nhà cung cấp mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Tên nhà cung cấp *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="VD: Công ty TNHH Nội Thất Hòa Phát"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Người liên hệ</label>
                  <input
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Mã số thuế</label>
                  <input
                    name="tax_code"
                    value={form.tax_code}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                    placeholder="VD: 0102030405"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Số điện thoại</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="VD: 0987654321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="VD: contact@supplier.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Địa chỉ</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-2 rounded-none border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none"
                    placeholder="VD: Số 123 Đường Nguyễn Trãi, Quận Thanh Xuân, Hà Nội"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    Kích hoạt nhà cung cấp (Cho phép lập đơn nhập hàng)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                  {editingId ? 'Cập nhật' : 'Lưu lại'}
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
