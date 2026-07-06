import { useState, useEffect } from 'react';
import api from '@/services/api';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X, Ticket, Loader2, Calendar, Tag, ShieldCheck, HelpCircle } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVouchers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openCreateModal = () => {
    setEditingId(null);
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
    });
    setShowModal(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingId(v.id);
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

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa mã giảm giá này?')) return;
    try {
      await api.delete(`/vouchers/${id}`);
      toast.success('Đã xóa mã giảm giá');
      fetchVouchers();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Xóa thất bại';
      toast.error(errMsg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-none animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Mã giảm giá (Voucher)</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-none text-sm font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          <Plus size={18} />
          Thêm mã giảm giá
        </button>
      </div>

      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Mã</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Loại giảm giá</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Giá trị giảm</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Đơn tối thiểu</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Đã dùng / Giới hạn</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Thời hạn</th>
              <th className="text-left px-6 py-4 font-semibold text-slate-600">Trạng thái</th>
              <th className="text-center px-6 py-4 font-semibold text-slate-600">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <Ticket size={32} className="mx-auto mb-2 opacity-40" />
                  Chưa có mã giảm giá nào. Hãy thêm mã giảm giá đầu tiên!
                </td>
              </tr>
            ) : (
              vouchers.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-800">{v.code}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-semibold uppercase ${v.discount_type === 'percentage' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                      {v.discount_type === 'percentage' ? 'Phần trăm' : 'Tiền mặt'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {v.discount_type === 'percentage' ? (
                      `${v.discount_value}%`
                    ) : (
                      `${Number(v.discount_value).toLocaleString('vi-VN')}₫`
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {Number(v.min_order_value) === 0 ? (
                      'Không yêu cầu'
                    ) : (
                      `${Number(v.min_order_value).toLocaleString('vi-VN')}₫`
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {v.used_count} / {v.usage_limit === null ? '∞' : v.usage_limit}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Bắt đầu: {new Date(v.start_date).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Kết thúc: {new Date(v.end_date).toLocaleString('vi-VN')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {v.is_active ? 'Hiển thị' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
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

                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Giá trị giảm *</label>
                      <input
                        type="number"
                        name="discount_value"
                        value={form.discount_value}
                        onChange={handleChange}
                        required
                        min="1"
                        className="w-full px-4 py-2.5 rounded-none border border-slate-300 focus:border-slate-900 outline-none transition-all text-sm"
                        placeholder="VD: 30000 hoặc 10"
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
                            FURNISHOP VOUCHER
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
                          <span>Đơn hàng tối thiểu:</span>
                          <span className="font-semibold">
                            {Number(form.min_order_value || 0) === 0 ? 'Không yêu cầu' : `${Number(form.min_order_value).toLocaleString('vi-VN')}₫`}
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
    </div>
  );
}
