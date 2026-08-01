import { useState, useEffect } from 'react';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { AxiosError } from 'axios';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';

import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, Ticket, Loader2, Calendar, Tag, ShieldCheck, HelpCircle, Search } from 'lucide-react';

interface CategoryOption {
  id: number;
  name: string;
}

interface ProductOption {
  id: number;
  name: string;
  sku?: string;
}

interface Voucher {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_value: number;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  apply_type?: 'all' | 'category' | 'product';
  categories?: CategoryOption[];
  products?: ProductOption[];
}

const formatForInput = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function VoucherListPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter for product selector inside modal
  const [productSearch, setProductSearch] = useState('');

  //state Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const paginatedVouchers = vouchers.slice((page - 1) * limit, page * limit);

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    code: '',
    discount_type: 'fixed_amount' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    max_discount_amount: '' as string | number,
    min_order_value: 0,
    start_date: '',
    end_date: '',
    usage_limit: '' as string | number,
    is_active: true,
    apply_type: 'all' as 'all' | 'category' | 'product',
    category_ids: [] as number[],
    product_ids: [] as number[],
  });

  const fetchVouchers = async () => {
    try {
      const res = await api.get('/vouchers');
      setVouchers(res.data);
    } catch {
      toast.error('Không thể tải danh sách mã giảm giá');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products')
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.data || []);
      const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.data || [];
      setProducts(prodList.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
    } catch {
      console.error('Không thể tải danh mục/sản phẩm');
    }
  };

  useEffect(() => {
    fetchVouchers();
    fetchOptions();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      const newValue = type === 'checkbox' ? checked : value;
      const updated = {
        ...prev,
        [name]: newValue,
      };

      if (name === 'discount_type') {
        if (value === 'percentage') {
          if (Number(prev.discount_value) > 100) {
            updated.discount_value = 10;
          }
        } else if (value === 'fixed_amount') {
          updated.max_discount_amount = '';
        }
      }

      return updated;
    });
  };

  const toggleCategorySelect = (catId: number) => {
    setForm((prev) => {
      const exists = prev.category_ids.includes(catId);
      return {
        ...prev,
        category_ids: exists
          ? prev.category_ids.filter((id) => id !== catId)
          : [...prev.category_ids, catId],
      };
    });
  };

  const toggleProductSelect = (prodId: number) => {
    setForm((prev) => {
      const exists = prev.product_ids.includes(prodId);
      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((id) => id !== prodId)
          : [...prev.product_ids, prodId],
      };
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    setProductSearch('');
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    setForm({
      code: '',
      discount_type: 'fixed_amount',
      discount_value: 0,
      max_discount_amount: '',
      min_order_value: 0,
      start_date: formatForInput(now.toISOString()),
      end_date: formatForInput(nextWeek.toISOString()),
      usage_limit: '',
      is_active: true,
      apply_type: 'all',
      category_ids: [],
      product_ids: [],
    });
    setShowModal(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingId(v.id);
    setProductSearch('');
    setForm({
      code: v.code,
      discount_type: v.discount_type,
      discount_value: Number(v.discount_value),
      max_discount_amount: v.max_discount_amount !== null ? Number(v.max_discount_amount) : '',
      min_order_value: Number(v.min_order_value),
      start_date: formatForInput(v.start_date),
      end_date: formatForInput(v.end_date),
      usage_limit: v.usage_limit !== null ? v.usage_limit : '',
      is_active: v.is_active,
      apply_type: v.apply_type || 'all',
      category_ids: v.categories ? v.categories.map((c) => c.id) : [],
      product_ids: v.products ? v.products.map((p) => p.id) : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim()) {
      toast.error('Mã giảm giá không được để trống');
      return;
    }

    if (form.discount_value <= 0) {
      toast.error('Giá trị giảm giá phải lớn hơn 0');
      return;
    }

    if (form.discount_type === 'percentage' && form.discount_value > 100) {
      toast.error('Phần trăm giảm giá không được lớn hơn 100%');
      return;
    }

    if (form.apply_type === 'category' && form.category_ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 danh mục áp dụng');
      return;
    }

    if (form.apply_type === 'product' && form.product_ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm áp dụng');
      return;
    }

    setSubmitting(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount_amount: form.max_discount_amount !== '' ? Number(form.max_discount_amount) : undefined,
      min_order_value: Number(form.min_order_value),
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      usage_limit: form.usage_limit !== '' ? Number(form.usage_limit) : undefined,
      is_active: form.is_active,
      apply_type: form.apply_type,
      category_ids: form.apply_type === 'category' ? form.category_ids : [],
      product_ids: form.apply_type === 'product' ? form.product_ids : [],
    };

    try {
      if (editingId) {
        await api.patch(`/vouchers/${editingId}`, payload);
        toast.success('Cập nhật mã giảm giá thành công!');
      } else {
        await api.post('/vouchers', payload);
        toast.success('Thêm mã giảm giá thành công!');
      }
      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || (editingId ? 'Cập nhật thất bại' : 'Thêm thất bại');
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    openConfirm({
      title: 'Xóa mã giảm giá',
      message: 'Bạn có chắc chắn muốn xóa mã giảm giá này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa mã',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/vouchers/${id}`);
          toast.success('Đã xóa mã giảm giá');
          fetchVouchers();
        } catch (err) {
          const axiosError = err as AxiosError<{ message?: string }>;
          const errMsg = axiosError.response?.data?.message || 'Xóa thất bại';
          toast.error(errMsg);
        }
      },
    });
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý Mã giảm giá (Voucher)"
        subtitle="Tạo và quản lý các chương trình ưu đãi, khuyến mãi dành cho khách hàng"
        icon={Ticket}
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={16} />
            Thêm mã giảm giá
          </button>
        }
      />

      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <TableLoader />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 whitespace-nowrap">Mã Voucher</th>
                    <th className="px-4 py-3 whitespace-nowrap">Mức giảm</th>
                    <th className="px-4 py-3 whitespace-nowrap">Áp dụng</th>
                    <th className="px-4 py-3 whitespace-nowrap">Đơn tối thiểu</th>
                    <th className="px-4 py-3 whitespace-nowrap">Sử dụng</th>
                    <th className="px-4 py-3 whitespace-nowrap">Thời hạn</th>
                    <th className="px-4 py-3 whitespace-nowrap">Trạng thái</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <Ticket size={36} className="mx-auto mb-2 opacity-30" />
                        Chưa có mã giảm giá nào. Hãy thêm mã giảm giá đầu tiên!
                      </td>
                    </tr>
                  ) : (
                    paginatedVouchers.map((v) => {
                      const isExpired = v.end_date ? new Date(v.end_date) < new Date() : false;

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/80 border border-indigo-200/80 text-indigo-700 font-mono font-bold text-xs rounded tracking-wider shadow-2xs">
                              <Ticket size={13} className="text-indigo-500 shrink-0" />
                              {v.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded border w-fit whitespace-nowrap ${
                                v.discount_type === 'percentage' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200/80' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200/80'
                              }`}>
                                {v.discount_type === 'percentage' 
                                  ? `Giảm ${v.discount_value}%` 
                                  : `Giảm ${Number(v.discount_value).toLocaleString('vi-VN')}₫`
                                }
                              </span>
                              {v.discount_type === 'percentage' && v.max_discount_amount && (
                                <span className="text-[11px] text-slate-400 font-normal mt-0.5">
                                  Tối đa: {Number(v.max_discount_amount).toLocaleString('vi-VN')}₫
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {v.apply_type === 'category' ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 rounded whitespace-nowrap">
                                {v.categories?.length || 0} Danh mục
                              </span>
                            ) : v.apply_type === 'product' ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/80 rounded whitespace-nowrap">
                                {v.products?.length || 0} Sản phẩm
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 rounded whitespace-nowrap">
                                Toàn sàn
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium text-xs">
                            {v.min_order_value && Number(v.min_order_value) > 0 ? `${Number(v.min_order_value).toLocaleString('vi-VN')}₫` : '0₫'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-xs font-medium">
                              <span className="font-bold text-slate-800">{v.used_count}</span>
                              <span className="text-slate-400">/</span>
                              <span className="text-slate-600 font-semibold">{v.usage_limit !== null && v.usage_limit !== undefined ? v.usage_limit : '∞'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              <span>
                                {v.start_date ? new Date(v.start_date).toLocaleDateString('vi-VN') : 'Từ đầu'}
                                <span className="mx-1 text-slate-400">-</span>
                                {v.end_date ? new Date(v.end_date).toLocaleDateString('vi-VN') : 'Không hạn'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 font-medium rounded-full whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Hết hạn
                              </span>
                            ) : v.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium rounded-full whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 font-medium rounded-full whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Đã khóa
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditModal(v)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                                title="Sửa"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(v.id)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              currentPage={page}
              totalItems={vouchers.length}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="mã giảm giá"
            />
          </>
        )}
      </div>

      {/* Modal Add/Edit */}
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
              {editingId ? 'Sửa mã giảm giá' : 'Thêm mã giảm giá mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Form fields */}
                <div className="w-full lg:w-[58%] space-y-4">
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Mã Voucher *</label>
                      <input
                        name="code"
                        value={form.code}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm font-mono uppercase"
                        placeholder="VD: GIAM30K"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Loại giảm giá</label>
                      <select
                        name="discount_type"
                        value={form.discount_type}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm"
                      >
                        <option value="fixed_amount">Số tiền cố định (₫)</option>
                        <option value="percentage">Phần trăm (%)</option>
                      </select>
                    </div>
                  </div>

                  {/* Apply Type Selection */}
                  <div className="bg-slate-50 p-4 border border-slate-200 space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">Phạm vi áp dụng *</label>
                    <div className="flex gap-6 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="apply_type"
                          value="all"
                          checked={form.apply_type === 'all'}
                          onChange={handleChange}
                          className="w-4 h-4 text-slate-900"
                        />
                        Tất cả sản phẩm (Toàn sàn)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="apply_type"
                          value="category"
                          checked={form.apply_type === 'category'}
                          onChange={handleChange}
                          className="w-4 h-4 text-slate-900"
                        />
                        Theo danh mục
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="apply_type"
                          value="product"
                          checked={form.apply_type === 'product'}
                          onChange={handleChange}
                          className="w-4 h-4 text-slate-900"
                        />
                        Theo sản phẩm
                      </label>
                    </div>

                    {/* Category Selection List */}
                    {form.apply_type === 'category' && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-2">Chọn các danh mục được áp dụng:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 bg-white p-3 border border-slate-200">
                          {categories.length === 0 ? (
                            <p className="text-xs text-slate-400">Không có danh mục nào</p>
                          ) : (
                            categories.map((cat) => (
                              <label key={cat.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1">
                                <input
                                  type="checkbox"
                                  checked={form.category_ids.includes(cat.id)}
                                  onChange={() => toggleCategorySelect(cat.id)}
                                  className="w-4 h-4 text-slate-900"
                                />
                                <span>{cat.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <p className="text-[11px] text-purple-700 mt-1 font-medium">
                          Đã chọn {form.category_ids.length} danh mục
                        </p>
                      </div>
                    )}

                    {/* Product Selection List */}
                    {form.apply_type === 'product' && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <p className="text-xs text-slate-500">Tìm và chọn các sản phẩm được áp dụng:</p>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Tìm tên hoặc SKU sản phẩm..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-none outline-none focus:border-slate-800"
                          />
                          <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1 bg-white p-2 border border-slate-200">
                          {filteredProducts.length === 0 ? (
                            <p className="text-xs text-slate-400 p-2 text-center">Không tìm thấy sản phẩm phù hợp</p>
                          ) : (
                            filteredProducts.map((prod) => (
                              <label key={prod.id} className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 border-b border-slate-100 last:border-0">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={form.product_ids.includes(prod.id)}
                                    onChange={() => toggleProductSelect(prod.id)}
                                    className="w-3.5 h-3.5 text-slate-900"
                                  />
                                  <span className="font-medium">{prod.name}</span>
                                </div>
                                {prod.sku && <span className="font-mono text-[10px] text-slate-400">{prod.sku}</span>}
                              </label>
                            ))
                          )}
                        </div>
                        <p className="text-[11px] text-teal-700 font-medium">
                          Đã chọn {form.product_ids.length} sản phẩm
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        {form.discount_type === 'percentage' ? 'Phần trăm giảm (%) *' : 'Giá trị giảm (₫) *'}
                      </label>
                      <input
                        type="number"
                        name="discount_value"
                        value={form.discount_value}
                        onChange={handleChange}
                        required
                        min="1"
                        max={form.discount_type === 'percentage' ? 100 : undefined}
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm"
                        placeholder={form.discount_type === 'percentage' ? 'VD: 10, 20, 50' : 'VD: 30000, 50000'}
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Giảm tối đa (Lên tới)</label>
                      <input
                        type="number"
                        name="max_discount_amount"
                        value={form.max_discount_amount}
                        onChange={handleChange}
                        disabled={form.discount_type === 'fixed_amount'}
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm disabled:bg-slate-50 disabled:text-slate-400"
                        placeholder="Để trống nếu không giới hạn"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Đơn hàng tối thiểu (₫)</label>
                      <input
                        type="number"
                        name="min_order_value"
                        value={form.min_order_value}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm"
                        placeholder="VD: 150000"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Giới hạn số lượt sử dụng</label>
                      <input
                        type="number"
                        name="usage_limit"
                        value={form.usage_limit}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm"
                        placeholder="Để trống nếu vô hạn"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày bắt đầu *</label>
                      <input
                        type="datetime-local"
                        name="start_date"
                        value={form.start_date}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày kết thúc *</label>
                      <input
                        type="datetime-local"
                        name="end_date"
                        value={form.end_date}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center pt-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-slate-900 border-slate-300 rounded-none focus:ring-slate-900 focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm font-medium text-slate-800 cursor-pointer">
                      Hiển thị kích hoạt mã giảm giá
                    </label>
                  </div>
                </div>

                {/* Right side live voucher card preview */}
                <div className="w-full lg:w-[38%] border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-start space-y-6">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-none border border-slate-200 inline-block self-start">
                    Xem trước giao diện Voucher
                  </h3>

                  <div className="space-y-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Giả lập Thẻ giảm giá (Voucher Card)
                    </span>

                    {/* Premium design mock voucher */}
                    <div className="relative border border-slate-300 bg-white p-6 shadow-sm flex flex-col justify-between h-48 w-full border-l-4 border-l-slate-900 overflow-hidden">
                      {/* Circle cuts in layout for ticket effect */}
                      <div className="absolute top-1/2 -left-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-300 transform -translate-y-1/2"></div>
                      <div className="absolute top-1/2 -right-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-300 transform -translate-y-1/2"></div>

                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold tracking-wider text-xs">
                            <Tag size={12} />
                            VOUCHER
                          </div>
                          <h4 className="text-2xl font-extrabold text-slate-900 mt-2 tracking-wide font-mono">
                            {form.code.trim().toUpperCase() || 'CODE_PREVIEW'}
                          </h4>
                        </div>
                        <span className={`text-[9px] font-bold tracking-widest uppercase border px-2 py-0.5 ${form.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          {form.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-slate-200 pt-3">
                        <div className="flex justify-between items-baseline text-slate-900">
                          <span className="text-xs text-slate-400">Giá trị ưu đãi:</span>
                          <span className="text-xl font-black">
                            {form.discount_type === 'percentage' ? (
                              `${form.discount_value || 0}%`
                            ) : (
                              `${Number(form.discount_value || 0).toLocaleString('vi-VN')}₫`
                            )}
                          </span>
                        </div>

                        {form.discount_type === 'percentage' && form.max_discount_amount && (
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-0.5">
                            <span>Giảm tối đa:</span>
                            <span className="font-semibold">{Number(form.max_discount_amount).toLocaleString('vi-VN')}₫</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                          <span>Phạm vi:</span>
                          <span className="font-semibold text-slate-800">
                            {form.apply_type === 'category'
                              ? `${form.category_ids.length} Danh mục`
                              : form.apply_type === 'product'
                              ? `${form.product_ids.length} Sản phẩm`
                              : 'Toàn sàn'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 border border-slate-200 text-xs text-slate-500 space-y-2">
                      <div className="flex items-start gap-2">
                        <ShieldCheck size={16} className="text-slate-700 shrink-0 mt-0.5" />
                        <span>Mã giảm giá sẽ tự động được kiểm duyệt khi đặt hàng phía User.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <HelpCircle size={16} className="text-slate-700 shrink-0 mt-0.5" />
                        <span>Với loại giảm giá <b>Phần trăm (%)</b>, số tiền được giảm sẽ bằng % của tổng giá trị sản phẩm, nhưng không vượt quá hạn mức giảm tối đa (nếu có cài đặt).</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-none transition-all cursor-pointer"
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
