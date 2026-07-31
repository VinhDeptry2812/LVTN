/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { ArrowLeft, Loader2, Calendar, User, CheckCircle2, XCircle, Clock, Save, ShieldAlert } from 'lucide-react';

interface Variant {
  id: number;
  sku: string;
  attributes: Record<string, string>;
  product: {
    name: string;
  };
}

interface InventoryAuditItem {
  id: number;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  variant: Variant;
}

interface UserType {
  id: number;
  name?: string;
  email?: string;
}

interface InventoryAudit {
  id: number;
  created_by: UserType;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  completed_at?: string;
  items: InventoryAuditItem[];
}

export default function InventoryAuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<InventoryAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [localNotes, setLocalNotes] = useState('');

  // Editable quantities state for pending audits
  const [editableItems, setEditableItems] = useState<{ [variantId: number]: number | '' }>({});

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const fetchAuditDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get<InventoryAudit>(`/inventory-audits/${id}`);
      setAudit(res.data);
      setLocalNotes(res.data.notes || '');

      // Initialize local editable quantities from fetched data
      const qtyMap: { [variantId: number]: number } = {};
      res.data.items.forEach((item) => {
        qtyMap[item.variant.id] = item.actual_quantity;
      });
      setEditableItems(qtyMap);
    } catch {
      toast.error('Không thể tải chi tiết phiếu kiểm kê');
      navigate('/admin/inventory-audits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditDetails();
  }, [id]);

  const handleQtyChange = (variantId: number, val: number | '') => {
    setEditableItems((prev) => ({
      ...prev,
      [variantId]: val === '' ? '' : (val < 0 ? 0 : val),
    }));
  };

  const handleSaveDraft = async () => {
    if (!audit) return;
    setUpdating(true);
    try {
      const itemsPayload = audit.items.map((item) => ({
        variant_id: item.variant.id,
        actual_quantity: editableItems[item.variant.id] === '' ? 0 : (editableItems[item.variant.id] ?? 0),
      }));

      await api.patch(`/inventory-audits/${id}`, {
        items: itemsPayload,
        notes: localNotes.trim() || undefined,
      });

      toast.success('Lưu tạm phiếu kiểm kê thành công!');
      fetchAuditDetails();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu tạm';
      toast.error(errMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = (newStatus: 'completed' | 'cancelled') => {
    if (!audit) return;
    const isCompleted = newStatus === 'completed';

    openConfirm({
      title: isCompleted ? 'Hoàn tất kiểm kê kho' : 'Hủy đợt kiểm kê',
      message: isCompleted
        ? 'Bạn có chắc chắn muốn hoàn tất đợt kiểm kê này? Số lượng tồn kho của các biến thể sản phẩm sẽ được cập nhật chính xác theo số lượng thực tế bạn đã nhập. Hành động này không thể hoàn tác.'
        : 'Bạn có chắc chắn muốn hủy đợt kiểm kê này? Mọi thông tin đếm kho sẽ bị hủy bỏ và trạng thái chuyển thành đã hủy.',
      confirmText: isCompleted ? 'Hoàn tất đối soát' : 'Hủy bỏ đợt kiểm',
      type: isCompleted ? 'warning' : 'danger',
      onConfirm: async () => {
        closeConfirm();
        setUpdating(true);
        try {
          const itemsPayload = audit.items.map((item) => ({
            variant_id: item.variant.id,
            actual_quantity: editableItems[item.variant.id] === '' ? 0 : (editableItems[item.variant.id] ?? 0),
          }));

          const payload: any = {
            status: newStatus,
          };

          if (isCompleted) {
            payload.items = itemsPayload;
            payload.notes = localNotes.trim() || undefined;
          }

          await api.patch(`/inventory-audits/${id}`, payload);
          toast.success(isCompleted ? 'Đã hoàn tất đối soát tồn kho!' : 'Đã hủy đợt kiểm kê!');
          fetchAuditDetails();
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

  if (!audit) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/inventory-audits')}
          className="p-2 hover:bg-slate-100 rounded-none text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Đợt kiểm kê kho #{audit.id}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Đối soát chênh lệch giữa số liệu tồn kho hệ thống và đếm thực tế</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main: items table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Danh sách biến thể đối soát
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50 text-left">
                    <th className="px-4 py-3">Biến thể sản phẩm</th>
                    <th className="px-4 py-3 text-center w-28">Tồn hệ thống</th>
                    <th className="px-4 py-3 text-center w-36">Thực tế</th>
                    <th className="px-4 py-3 text-center w-24">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.items.map((item) => {
                    const variantId = item.variant.id;
                    const sysQty = item.system_quantity;
                    const actualQty = audit.status === 'pending' ? (editableItems[variantId] ?? 0) : item.actual_quantity;
                    const actualQtyVal = actualQty === '' ? 0 : actualQty;
                    const diff = actualQtyVal - sysQty;

                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{item.variant?.product?.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            SKU: {item.variant?.sku}{' '}
                            {Object.entries(item.variant?.attributes || {}).map(([k, v]) => `| ${k}: ${v}`)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-medium text-slate-600">{sysQty}</td>
                        <td className="px-4 py-3 text-center">
                          {audit.status === 'pending' ? (
                            <input
                              type="number"
                              min="0"
                              value={actualQty}
                              onChange={(e) => handleQtyChange(variantId, e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-24 px-2 py-1 text-center border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none text-sm"
                            />
                          ) : (
                            <span className="font-mono font-medium text-slate-800">{actualQty}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          {diff === 0 ? (
                            <span className="text-slate-400">0</span>
                          ) : diff > 0 ? (
                            <span className="text-green-600">+{diff}</span>
                          ) : (
                            <span className="text-red-600">{diff}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <h2 className="text-base font-bold text-slate-800 mb-2.5">Ghi chú đợt kiểm kho</h2>
            {audit.status === 'pending' ? (
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none resize-none"
                placeholder="Ví dụ: Ghi chú ghi nhận kết quả kiểm đếm hoặc tình trạng kho..."
              />
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 italic">
                {audit.notes ? audit.notes : 'Không có ghi chú nào đính kèm cho đợt kiểm này'}
              </div>
            )}
          </div>
        </div>

        {/* Right Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Thông tin chung</h2>

            {/* Status display */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Trạng thái đợt kiểm</label>
              <div className="flex items-center gap-2">
                {audit.status === 'completed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-none">
                    <CheckCircle2 size={14} />
                    Đã hoàn tất đối soát
                  </span>
                )}
                {audit.status === 'cancelled' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-none">
                    <XCircle size={14} />
                    Đã hủy đợt kiểm
                  </span>
                )}
                {audit.status === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-bold rounded-none animate-pulse">
                    <Clock size={14} />
                    Đang tiến hành đếm kho
                  </span>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-2.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>Ngày tạo: {new Date(audit.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={12} />
                <span>Người tạo: {audit.created_by?.name || audit.created_by?.email || 'N/A'}</span>
              </div>
              {audit.completed_at && (
                <div className="flex items-center gap-1.5 text-green-700 font-medium">
                  <CheckCircle2 size={12} />
                  <span>Hoàn thành: {new Date(audit.completed_at).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="pt-2 space-y-2 border-t border-slate-100 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Số lượng sản phẩm:</span>
                <span className="font-semibold text-slate-800">{audit.items.length} biến thể</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Khớp hoàn toàn:</span>
                <span className="font-semibold text-slate-800">
                  {audit.items.filter((item) => {
                    const actualQty = audit.status === 'pending' ? (editableItems[item.variant.id] ?? 0) : item.actual_quantity;
                    return actualQty === item.system_quantity;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Lệch tồn kho:</span>
                <span className="font-semibold text-red-600">
                  {audit.items.filter((item) => {
                    const actualQty = audit.status === 'pending' ? (editableItems[item.variant.id] ?? 0) : item.actual_quantity;
                    return actualQty !== item.system_quantity;
                  }).length}
                </span>
              </div>
            </div>

            {/* Action buttons if Pending */}
            {audit.status === 'pending' && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <button
                  onClick={handleSaveDraft}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-none transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Lưu tạm số liệu
                </button>
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-none transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Hoàn thành Kiểm kê
                </button>
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm rounded-none transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert size={16} />
                  Hủy đợt kiểm kê
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
