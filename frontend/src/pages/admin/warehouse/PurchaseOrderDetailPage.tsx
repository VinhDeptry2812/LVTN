/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { formatPrice, formatAttributeValue } from '@/utils/format';
import { ArrowLeft, Loader2, Calendar, User, CheckCircle2, XCircle, Clock, Truck, ShieldAlert } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface UserType {
  id: number;
  name?: string;
  email?: string;
}

interface Variant {
  id: number;
  sku: string;
  attributes: Record<string, string>;
  product: {
    name: string;
  };
}

interface PurchaseOrderItem {
  id: number;
  quantity: number;
  import_price: number;
  variant: Variant;
}

interface PurchaseOrder {
  id: number;
  supplier: Supplier;
  created_by: UserType;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  completed_at?: string;
  items: PurchaseOrderItem[];
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const fetchPoDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
      setPo(res.data);
    } catch {
      toast.error('Không thể tải chi tiết đơn nhập hàng');
      navigate('/admin/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoDetails();
  }, [id]);

  const handleUpdateStatus = (newStatus: 'completed' | 'cancelled') => {
    const isCompleted = newStatus === 'completed';
    openConfirm({
      title: isCompleted ? 'Xác nhận nhập kho' : 'Hủy đơn nhập hàng',
      message: isCompleted
        ? 'Bạn có chắc chắn muốn hoàn tất đơn nhập này? Số lượng tồn kho của các biến thể sản phẩm sẽ được cộng thêm tự động. Hành động này không thể rút lại.'
        : 'Bạn có chắc chắn muốn hủy đơn nhập hàng này? Trạng thái sẽ chuyển thành đã hủy và không thay đổi số lượng tồn kho.',
      confirmText: isCompleted ? 'Hoàn tất nhập kho' : 'Hủy đơn hàng',
      type: isCompleted ? 'info' : 'danger',
      onConfirm: async () => {
        closeConfirm();
        setUpdating(true);
        try {
          await api.patch(`/purchase-orders/${id}/status`, { status: newStatus });
          toast.success(isCompleted ? 'Hoàn tất nhập kho thành công!' : 'Đã hủy đơn nhập hàng!');
          fetchPoDetails();
        } catch (err: any) {
          const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái';
          toast.error(errMsg);
        } finally {
          setUpdating(false);
        }
      },
    });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={36} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!po) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/purchase-orders')}
          className="p-2 hover:bg-slate-100 rounded-none text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chi tiết đơn nhập hàng #{po.id}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Theo dõi lịch sử nhập hàng và hoàn tất thủ tục nhập kho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Items Table) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Danh mục sản phẩm nhập kho
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50 text-left">
                    <th className="px-4 py-3">Sản phẩm</th>
                    <th className="px-4 py-3 text-center w-28">Số lượng nhập</th>
                    <th className="px-4 py-3 w-40 text-right">Đơn giá nhập</th>
                    <th className="px-4 py-3 w-40 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.variant?.product?.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          SKU: {item.variant?.sku}{' '}
                          {Object.entries(item.variant?.attributes || {}).map(([k, v]) => `| ${k}: ${formatAttributeValue(v)}`)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-800">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">
                        {formatPrice(item.import_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatPrice(item.quantity * item.import_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary */}
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Tổng số lượng sản phẩm:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {po.items.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-100">
                  <span>Tổng giá trị đơn nhập:</span>
                  <span className="text-blue-600">{formatPrice(po.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <h2 className="text-base font-bold text-slate-800 mb-2.5">Ghi chú từ quản trị viên</h2>
            <div className="bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 italic">
              {po.notes ? po.notes : 'Không có ghi chú nào đính kèm cho đơn nhập này'}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Action buttons */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Thông tin chung</h2>

            {/* Status display */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Trạng thái đơn hàng</label>
              <div className="flex items-center gap-2">
                {po.status === 'completed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-none">
                    <CheckCircle2 size={14} />
                    Đã hoàn tất nhập kho
                  </span>
                )}
                {po.status === 'cancelled' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-none">
                    <XCircle size={14} />
                    Đã hủy đơn hàng
                  </span>
                )}
                {po.status === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-bold rounded-none animate-pulse">
                    <Clock size={14} />
                    Chờ nhập kho thực tế
                  </span>
                )}
              </div>
            </div>

            {/* Supplier details */}
            <div className="space-y-1.5 text-sm pt-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase">Đối tác cung ứng</label>
              <div className="font-bold text-slate-800">{po.supplier?.name}</div>
              {po.supplier?.phone && <div className="text-slate-600 text-xs">SĐT: {po.supplier.phone}</div>}
              {po.supplier?.email && <div className="text-slate-600 text-xs">Email: {po.supplier.email}</div>}
              {po.supplier?.address && <div className="text-slate-500 text-xs mt-1 leading-relaxed">{po.supplier.address}</div>}
            </div>

            {/* Timestamps */}
            <div className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>Ngày tạo: {new Date(po.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={12} />
                <span>Người tạo: {po.created_by?.name || po.created_by?.email || 'N/A'}</span>
              </div>
              {po.completed_at && (
                <div className="flex items-center gap-1.5 text-green-700 font-medium">
                  <CheckCircle2 size={12} />
                  <span>Hoàn thành: {new Date(po.completed_at).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>

            {/* Action buttons if Pending */}
            {po.status === 'pending' && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-none transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                  Xác nhận Nhập kho
                </button>
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm rounded-none transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert size={16} />
                  Hủy đơn nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
