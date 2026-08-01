/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { formatPrice } from '@/utils/format';
import { ArrowLeft, Loader2, Calendar, User, CheckCircle2, XCircle, Clock, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { REASON_LABELS } from './StockIssueListPage';

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

interface StockIssueItem {
  id: number;
  quantity: number;
  unit_price: number;
  notes?: string;
  variant: Variant;
}

interface StockIssue {
  id: number;
  code: string;
  reason: 'damaged' | 'expired' | 'sample' | 'internal_use' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  total_amount: number;
  created_by: UserType;
  reviewed_by?: UserType;
  notes?: string;
  created_at: string;
  completed_at?: string;
  items: StockIssueItem[];
}

export default function StockIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<StockIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const fetchIssueDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get<StockIssue>(`/stock-issues/${id}`);
      setIssue(res.data);
    } catch {
      toast.error('Không thể tải chi tiết phiếu xuất kho');
      navigate('/admin/stock-issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueDetails();
  }, [id]);

  const handleUpdateStatus = (newStatus: 'completed' | 'cancelled') => {
    const isCompleted = newStatus === 'completed';
    openConfirm({
      title: isCompleted ? 'Xác nhận duyệt xuất kho' : 'Hủy phiếu xuất kho',
      message: isCompleted
        ? 'Bạn có chắc chắn muốn duyệt phiếu xuất kho này? Số lượng tồn kho của các biến thể sản phẩm sẽ được TRỪ THỰC TẾ ngay lập tức và ghi nhận lịch sử giao dịch kho. Hành động này không thể hoàn tác!'
        : 'Bạn có chắc chắn muốn hủy phiếu xuất kho này? Phiếu xuất sẽ chuyển sang trạng thái đã hủy và không làm thay đổi số lượng tồn kho.',
      confirmText: isCompleted ? 'Duyệt & Trừ kho' : 'Hủy phiếu',
      type: isCompleted ? 'warning' : 'danger',
      onConfirm: async () => {
        closeConfirm();
        setUpdating(true);
        try {
          await api.patch(`/stock-issues/${id}/status`, { status: newStatus });
          toast.success(isCompleted ? 'Duyệt xuất kho thành công! Tồn kho đã được trừ.' : 'Đã hủy phiếu xuất kho!');
          fetchIssueDetails();
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
        <Loader2 size={36} className="text-amber-600 animate-spin" />
      </div>
    );
  }

  if (!issue) return null;

  const reasonInfo = REASON_LABELS[issue.reason] || REASON_LABELS.other;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/stock-issues')}
          className="p-2 hover:bg-slate-100 rounded-none text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Chi tiết phiếu xuất kho {issue.code || `#PXK${issue.id}`}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Xem thông tin chi tiết và xác nhận duyệt xuất kho thực tế</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Items Table) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Danh mục sản phẩm xuất kho
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50 text-left">
                    <th className="px-4 py-3">Sản phẩm</th>
                    <th className="px-4 py-3 text-center w-28">Số lượng xuất</th>
                    <th className="px-4 py-3 w-36 text-right">Đơn giá xuất</th>
                    <th className="px-4 py-3 w-36 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {issue.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.variant?.product?.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          SKU: {item.variant?.sku}{' '}
                          {Object.entries(item.variant?.attributes || {}).map(([k, v]) => `| ${k}: ${v}`)}
                        </div>
                        {item.notes && <div className="text-xs text-amber-700 italic mt-1">Ghi chú: {item.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-800">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">
                        {formatPrice(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatPrice(item.quantity * item.unit_price)}
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
                  <span>Tổng số lượng xuất kho:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {issue.items.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-100">
                  <span>Tổng giá trị hàng xuất:</span>
                  <span className="text-amber-600">{formatPrice(issue.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <h2 className="text-base font-bold text-slate-800 mb-2.5">Ghi chú phiếu xuất kho</h2>
            <div className="bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 italic">
              {issue.notes ? issue.notes : 'Không có ghi chú nào đính kèm cho phiếu xuất kho này'}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Action buttons */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Thông tin chung</h2>

            {/* Status display */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Trạng thái phiếu</label>
              <div className="flex items-center gap-2">
                {issue.status === 'completed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-none">
                    <CheckCircle2 size={14} />
                    Đã xuất kho thực tế
                  </span>
                )}
                {issue.status === 'cancelled' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-none">
                    <XCircle size={14} />
                    Đã hủy phiếu xuất
                  </span>
                )}
                {issue.status === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-bold rounded-none animate-pulse">
                    <Clock size={14} />
                    Chờ duyệt xuất kho
                  </span>
                )}
              </div>
            </div>

            {/* Reason details */}
            <div className="space-y-1.5 text-sm pt-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase">Lý do xuất kho</label>
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-none ${reasonInfo.bg} ${reasonInfo.text}`}>
                {reasonInfo.label}
              </span>
            </div>

            {/* Timestamps & Personnel */}
            <div className="space-y-2.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>Ngày tạo: {new Date(issue.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-slate-400" />
                <span>Người tạo: {issue.created_by?.name || issue.created_by?.email || 'N/A'}</span>
              </div>
              {issue.reviewed_by && (
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <User size={13} className="text-amber-600" />
                  <span>Người duyệt: {issue.reviewed_by?.name || issue.reviewed_by?.email || 'N/A'}</span>
                </div>
              )}
              {issue.completed_at && (
                <div className="flex items-center gap-1.5 text-green-700 font-medium">
                  <CheckCircle2 size={13} />
                  <span>Hoàn tất xuất kho: {new Date(issue.completed_at).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>

            {/* Action buttons if Pending */}
            {issue.status === 'pending' && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-none transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                  Duyệt Xuất Kho
                </button>
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm rounded-none transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert size={16} />
                  Hủy phiếu xuất
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
