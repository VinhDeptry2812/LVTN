import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice, formatDate, formatAttributes } from '@/utils/format';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import AdminPageHeader from '@/components/AdminPageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
  RotateCcw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Phone,
  MapPin,
  ClipboardList,
  User,
  Clock,
  Check,
  X,
  Image as ImageIcon
} from 'lucide-react';

interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

interface OrderItem {
  id: number;
  price: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    sku?: string;
    images?: ProductImage[];
  };
  variant?: { 
    id: number;
    attributes: Record<string, string>
   };
}

interface Order {
  id: number;
  shipping_address: string;
  phone: string;
  notes: string | null;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  confirmed_at?: string;
  shipping_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  user?: { name: string; email: string };
  items: OrderItem[];
  voucher_code?: string;
  discount_amount?: number;
  return_reason?: string;
  return_description?: string;
  return_images?: string[];
  return_items?: number[];
  return_rejected_reason?: string;
  return_requested_at?: string;
  return_handled_at?: string;
  return_action_type?: string;
  return_should_restock?: boolean;
}

const parseReturnItemsHelper = (raw: any): { itemId: number; quantity: number | null }[] => {
  if (!raw) return [];
  let items = raw;
  while (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      if (parsed === items) break;
      items = parsed;
    } catch {
      break;
    }
  }
  if (!items) return [];
  if (typeof items === 'number' || typeof items === 'string') {
    const num = Number(items);
    return isNaN(num) || num <= 0 ? [] : [{ itemId: num, quantity: null }];
  }
  if (typeof items === 'object' && !Array.isArray(items)) {
    if (Array.isArray(items.items)) {
      return parseReturnItemsHelper(items.items);
    }
    const possibleId = items.itemId ?? items.id ?? items.productId ?? items.product_id;
    if (possibleId !== undefined && possibleId !== null) {
      const num = Number(possibleId);
      if (!isNaN(num) && num > 0) {
        return [{ itemId: num, quantity: items.quantity ? Number(items.quantity) : null }];
      }
    }
    return Object.entries(items)
      .map(([k, v]) => ({
        itemId: Number(k),
        quantity: typeof v === 'number' ? v : (v as any)?.quantity ? Number((v as any).quantity) : null,
      }))
      .filter((i) => !isNaN(i.itemId) && i.itemId > 0);
  }
  if (Array.isArray(items)) {
    return items
      .map((ri: any) => {
        if (typeof ri === 'number' || typeof ri === 'string') {
          const num = Number(ri);
          return { itemId: isNaN(num) ? 0 : num, quantity: null };
        }
        if (typeof ri === 'object' && ri !== null) {
          const id = ri.itemId ?? ri.id;
          const num = Number(id);
          return {
            itemId: isNaN(num) ? 0 : num,
            quantity: ri.quantity ? Number(ri.quantity) : null,
          };
        }
        return { itemId: 0, quantity: null };
      })
      .filter((i) => i.itemId > 0);
  }
  return [];
};

const calculateReturnTotal = (order: Order): number => {
  const rawItems = order.return_items || (order as any).return_request?.items;
  const parsedReturnItems = parseReturnItemsHelper(rawItems);
  
  if (parsedReturnItems.length === 0 && (order.return_items || (order as any).return_request)) {
    // If we have a return request but couldn't parse specific items, we assume it's for all items.
    return order.total_amount;
  }
  
  let totalRefund = 0;
  order.items.forEach(item => {
    const match = parsedReturnItems.find((ri) => Number(ri.itemId) === Number(item.id));
    if (match) {
      const qty = match.quantity
        ? Math.min(Math.max(Number(match.quantity), 1), item.quantity)
        : item.quantity;
      totalRefund += item.price * qty;
    }
  });
  
  return totalRefund > 0 ? totalRefund : order.total_amount; // fallback if calculation is 0
};

export default function ReturnOrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>(''); // 'return_pending' | 'return_approved' | 'return_rejected' | '' (tất cả đổi trả)
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [approveActionType, setApproveActionType] = useState<'refund' | 'exchange'>('refund');
  const [approveShouldRestock, setApproveShouldRestock] = useState<boolean>(true);
  const [showApproveOptions, setShowApproveOptions] = useState(false);
  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // isReturn=true để chỉ lấy các đơn hàng đổi trả
      const url = `/orders/admin?page=${page}&limit=${limit}&isReturn=true${statusFilter ? `&status=${statusFilter}` : ''
        }${debouncedSearch ? `&search=${debouncedSearch}` : ''}`;
      const res = await api.get(url);
      const mappedOrders = res.data.data.map((order: any) => ({
        ...order,
        return_reason: order.return_request?.reason,
        return_description: order.return_request?.description,
        return_images: order.return_request?.images,
        return_items: order.return_request?.items,
        return_rejected_reason: order.return_request?.rejected_reason,
        return_requested_at: order.return_request?.requested_at,
        return_handled_at: order.return_request?.handled_at,
        return_action_type: order.return_request?.action_type,
        return_should_restock: order.return_request?.should_restock,
      }));
      setOrders(mappedOrders);
      setTotal(res.data.total);
    } catch {
      toast.error('Không thể lấy danh sách yêu cầu đổi trả.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, debouncedSearch]);

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-violet-50 text-violet-700 border-violet-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handleProcessReturn = async (
    orderId: number,
    approve: boolean,
    actionType?: 'refund' | 'exchange',
    shouldRestock?: boolean
  ) => {
    if (!approve && !rejectReasonInput.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setUpdatingId(orderId);
    try {
      const payload: Record<string, any> = {
        status: approve ? 'return_approved' : 'return_rejected',
      };
      if (approve) {
        payload.actionType = actionType;
        payload.shouldRestock = shouldRestock;
      } else {
        payload.rejectReason = rejectReasonInput;
      }

      await api.post(`/orders/admin/${orderId}/handle-return`, payload);

      const newStatus = approve ? 'return_approved' : 'return_rejected';
      const updatedFields = {
        status: newStatus,
        return_rejected_reason: approve ? undefined : rejectReasonInput,
        return_handled_at: new Date().toISOString(),
        return_action_type: approve ? actionType : undefined,
        return_should_restock: approve ? shouldRestock : undefined,
      };

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updatedFields } : null);
      }

      toast.success(approve ? 'Đã duyệt yêu cầu đổi trả thành công!' : 'Đã từ chối yêu cầu đổi trả.');
      setShowRejectInput(false);
      setShowApproveOptions(false);
      setRejectReasonInput('');
      closeConfirm();
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu đổi trả.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Quản lý Đổi trả"
        subtitle="Duyệt và xử lý các yêu cầu đổi trả sản phẩm lỗi từ khách hàng."
        icon={RotateCcw}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Tổng yêu cầu đổi trả"
          value={total}
          icon={ClipboardList}
          iconColorClass="text-slate-600"
          iconBgClass="bg-slate-50"
        />
        <StatCard
          title="Chờ xử lý"
          value={orders.filter(o => o.status === 'return_pending').length}
          icon={AlertTriangle}
          iconColorClass="text-amber-600"
          iconBgClass="bg-amber-50"
        />
        <StatCard
          title="Đã giải quyết"
          value={orders.filter(o => ['return_approved', 'return_rejected'].includes(o.status)).length}
          icon={CheckCircle2}
          iconColorClass="text-emerald-600"
          iconBgClass="bg-emerald-50"
        />
      </div>

      {/* Table filters and Search */}
      <div className="bg-white border border-slate-100 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-50 p-1">
            {[
              { label: 'Tất cả yêu cầu', value: '' },
              { label: 'Chờ xử lý', value: 'return_pending' },
              { label: 'Đã nhận đổi', value: 'return_approved' },
              { label: 'Từ chối đổi', value: 'return_rejected' }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${statusFilter === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm theo Mã đơn, Khách hàng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Return Order Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <TableLoader message="Đang tải danh sách đổi trả..." />
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-4xl">📥</span>
              <p className="text-sm font-bold text-slate-600 mt-3">Không tìm thấy yêu cầu đổi trả nào</p>
              <p className="text-xs text-slate-400 mt-1">Các yêu cầu từ khách hàng sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Mã đơn</th>
                  <th className="py-3.5 px-6">Khách hàng</th>
                  <th className="py-3.5 px-6">Lý do báo lỗi</th>
                  <th className="py-3.5 px-6">Tổng tiền</th>
                  <th className="py-3.5 px-6">Ngày yêu cầu</th>
                  <th className="py-3.5 px-6">Trạng thái</th>
                  <th className="py-3.5 px-6 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-700">#{order.id}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 flex items-center justify-center font-bold border ${getAvatarColor(
                            order.user?.name || order.user?.email || 'Guest'
                          )}`}
                        >
                          {order.user?.name ? order.user.name.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{order.user?.name || 'Khách vãng lai'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{order.user?.email || order.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 max-w-[200px] truncate font-medium text-slate-600">
                      {order.return_reason || '—'}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {formatPrice(calculateReturnTotal(order))}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {formatDate(order.return_requested_at)}
                    </td>
                    <td className="py-4 px-6"><StatusBadge status={order.status} category="return" /></td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer"
                      >
                        <Eye size={12} />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {orders.length > 0 && (
          <AdminPagination
            currentPage={page}
            totalItems={total}
            pageSize={limit}
            onPageChange={setPage}
            itemLabel="yêu cầu"
          />
        )}
      </div>

      {/* Modal Return Details */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Chi tiết Yêu cầu Đổi trả đơn #{selectedOrder.id}</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                  Yêu cầu gửi lúc: {formatDate(selectedOrder.return_requested_at)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setShowRejectInput(false);
                  setShowApproveOptions(false);
                  setRejectReasonInput('');
                  setApproveActionType('refund');
                  setApproveShouldRestock(true);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* customer & status information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-100 p-4 space-y-2">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Thông tin khách hàng
                  </h3>
                  <p className="flex items-center gap-2 text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-700">
                      {selectedOrder.user?.name || 'Khách vãng lai'}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>{selectedOrder.phone}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400" />
                    <span>{selectedOrder.shipping_address}</span>
                  </p>
                </div>

                <div className="border border-slate-100 p-4 space-y-2">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Thông tin xử lý
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Trạng thái đổi trả:</span>
                    <StatusBadge status={selectedOrder.status} category="return" />
                  </div>
                  {selectedOrder.return_handled_at && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Ngày xử lý:</span>
                      <span>{formatDate(selectedOrder.return_handled_at)}</span>
                    </div>
                  )}
                  {selectedOrder.status === 'return_rejected' && selectedOrder.return_rejected_reason && (
                    <div className="mt-2 bg-rose-50 border border-rose-100 p-2.5 text-rose-800">
                      <p className="font-bold">Lý do từ chối:</p>
                      <p className="mt-0.5 italic">{selectedOrder.return_rejected_reason}</p>
                    </div>
                  )}
                  {selectedOrder.status === 'return_approved' && (
                    <div className="mt-2 bg-indigo-50 border border-indigo-100 p-2.5 text-indigo-900 space-y-1 text-[11px] rounded-sm">
                      <p className="font-bold text-[9px] uppercase tracking-wider text-indigo-700">Quyết định của Admin:</p>
                      <p className="font-semibold">
                        Phương án: {selectedOrder.return_action_type === 'exchange' ? 'Đổi sản phẩm mới 1-1' : 'Trả hàng hoàn tiền'}
                      </p>
                      <p className="font-medium text-slate-600">
                        Xử lý kho: {selectedOrder.return_should_restock ? 'Đã hoàn lại kho bán lẻ' : 'Hàng lỗi/hỏng - Không nhập kho'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items returning */}
              <div className="border border-slate-100 p-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
                  Danh sách sản phẩm lỗi cần đổi trả
                </h3>
                <div className="divide-y divide-slate-100">
                  {selectedOrder.items.map(item => {
                    const returnInfo = (() => {
                      const rawItems = selectedOrder.return_items || (selectedOrder as any).return_request?.items;
                      const parsedReturnItems = parseReturnItemsHelper(rawItems);

                      if (parsedReturnItems.length === 0 && (selectedOrder.return_items || (selectedOrder as any).return_request)) {
                        return {
                          isDefective: true,
                          qty: item.quantity,
                        };
                      }

                      const match = parsedReturnItems.find((ri) => Number(ri.itemId) === Number(item.id));

                      if (match) {
                        return {
                          isDefective: true,
                          qty: match.quantity
                            ? Math.min(Math.max(Number(match.quantity), 1), item.quantity)
                            : item.quantity,
                        };
                      }

                      return null;
                    })();

                    if (!returnInfo || !returnInfo.isDefective) return null; // Chỉ hiển thị các item lỗi cần đổi trả

                    const primaryImg = item.product.images?.find(img => img.is_primary)?.image_url;

                    return (
                      <div key={item.id} className="py-3 flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-50 border border-rose-200 shrink-0 relative">
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageIcon size={18} />
                            </div>
                          )}
                          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full ring-2 ring-white">
                            Lỗi
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 truncate">{item.product.name}</p>
                          {item.variant?.attributes && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatAttributes(item.variant.attributes)}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-slate-900">{formatPrice(item.price)}</p>
                          <p className="text-rose-600 font-semibold mt-0.5">
                            Số lượng lỗi: x{returnInfo.qty} <span className="text-[10px] text-slate-400 font-normal">(Đã mua: x{item.quantity})</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* return reason detailed box */}
              <div className="bg-amber-50/50 border border-amber-200/60 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold border-b border-amber-200/50 pb-2">
                  <AlertTriangle size={14} />
                  <span>Nội dung khai báo từ khách hàng</span>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold tracking-wider uppercase text-[10px]">Lý do chính:</p>
                  <p className="font-bold text-slate-700 mt-0.5">{selectedOrder.return_reason || 'Chưa cung cấp lý do'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold tracking-wider uppercase text-[10px]">Phương án khách hàng yêu cầu:</p>
                  <p className="font-bold text-indigo-700 mt-0.5">
                    {selectedOrder.return_action_type === 'exchange' ? 'Đổi mới sản phẩm 1-1' : 'Trả hàng và hoàn tiền'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold tracking-wider uppercase text-[10px]">Mô tả chi tiết:</p>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap mt-0.5">
                    {selectedOrder.return_description || 'Không có mô tả chi tiết kèm theo.'}
                  </p>
                </div>

                {/* Return Images */}
                {selectedOrder.return_images && selectedOrder.return_images.length > 0 && (
                  <div>
                    <p className="text-slate-400 font-semibold tracking-wider uppercase text-[10px] mb-2">Hình ảnh minh họa sản phẩm lỗi:</p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedOrder.return_images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square bg-white border border-slate-200 overflow-hidden hover:opacity-85 transition-opacity group relative"
                        >
                          <img
                            src={img}
                            alt={`Lỗi minh họa ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ImageIcon className="text-white" size={16} />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
              {selectedOrder.status === 'return_pending' ? (
                <>
                  {!showRejectInput && !showApproveOptions ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowApproveOptions(true);
                          setApproveActionType(selectedOrder.return_action_type === 'exchange' ? 'exchange' : 'refund');
                        }}
                        disabled={updatingId === selectedOrder.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer"
                      >
                        <Check size={14} />
                        Phê duyệt đổi trả
                      </button>
                      <button
                        onClick={() => setShowRejectInput(true)}
                        disabled={updatingId === selectedOrder.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
                      >
                        <X size={14} />
                        Từ chối đổi trả
                      </button>
                    </div>
                  ) : showApproveOptions ? (
                    <div className="space-y-4 animate-slideUp bg-indigo-50/50 border border-indigo-100 p-4 rounded-sm text-left">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs border-b border-indigo-100 pb-2">
                        <CheckCircle2 size={16} className="text-indigo-600" />
                        <span>CẤU HÌNH PHƯƠNG ÁN XỬ LÝ ĐỔI TRẢ</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Phương án xử lý */}
                        <div className="space-y-2">
                          <label className="block font-bold text-slate-700 uppercase tracking-wider">
                            Phương án xử lý:
                          </label>
                          <div className="flex flex-col gap-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="approveActionType"
                                checked={approveActionType === 'refund'}
                                onChange={() => setApproveActionType('refund')}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="font-semibold text-slate-700">Trả hàng & Hoàn tiền (Refund)</span>
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="approveActionType"
                                checked={approveActionType === 'exchange'}
                                onChange={() => setApproveActionType('exchange')}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="font-semibold text-slate-700">Đổi sản phẩm mới 1-1 (Exchange)</span>
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {approveActionType === 'refund'
                              ? 'Hệ thống sẽ ghi nhận hoàn tiền cho các mặt hàng bị trả lại.'
                              : 'Hệ thống tự động tạo 1 đơn hàng mới giá trị 0đ và trừ tồn kho sản phẩm mới xuất đi.'}
                          </p>
                        </div>

                        {/* Tình trạng hàng trả về */}
                        <div className="space-y-2">
                          <label className="block font-bold text-slate-700 uppercase tracking-wider">
                            Tình trạng hàng & Kho:
                          </label>
                          <div className="flex flex-col gap-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="approveShouldRestock"
                                checked={approveShouldRestock === true}
                                onChange={() => setApproveShouldRestock(true)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="font-semibold text-slate-700">Nhập lại kho bán lẻ (Restock)</span>
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="approveShouldRestock"
                                checked={approveShouldRestock === false}
                                onChange={() => setApproveShouldRestock(false)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="font-semibold text-slate-700">Hàng lỗi/hỏng - Không nhập kho</span>
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {approveShouldRestock
                              ? 'Tăng số lượng sản phẩm tương ứng trong kho bán lẻ.'
                              : 'Ghi nhận nhận hàng lỗi từ khách, không đưa vào bán lẻ.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-indigo-100 pt-3">
                        <button
                          onClick={() => {
                            openConfirm({
                              title: 'Duyệt yêu cầu đổi trả',
                              message: `Bạn có chắc chắn muốn DUYỆT yêu cầu đổi trả cho đơn hàng #${selectedOrder.id} với phương án: ${approveActionType === 'refund' ? 'Trả hàng hoàn tiền' : 'Đổi mới 1-1'
                                } và ${approveShouldRestock ? 'Hoàn lại kho bán lẻ' : 'Không hoàn kho (Hàng hỏng)'
                                }?`,
                              confirmText: 'Xác nhận duyệt',
                              type: 'info',
                              onConfirm: () => handleProcessReturn(selectedOrder.id, true, approveActionType, approveShouldRestock),
                            });
                          }}
                          disabled={updatingId === selectedOrder.id}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer text-xs"
                        >
                          Xác nhận duyệt
                        </button>
                        <button
                          onClick={() => {
                            setShowApproveOptions(false);
                            setApproveActionType('refund');
                            setApproveShouldRestock(true);
                          }}
                          disabled={updatingId === selectedOrder.id}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 font-bold transition-colors text-slate-500 cursor-pointer text-xs"
                        >
                          Quay lại
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-slideUp text-left">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Nhập lý do từ chối duyệt đổi trả (Bắt buộc):
                        </label>
                        <textarea
                          placeholder="Ví dụ: Sản phẩm bị rách sau khi giặt hoặc đã qua sử dụng lâu ngày, không được chấp nhận..."
                          value={rejectReasonInput}
                          onChange={e => setRejectReasonInput(e.target.value)}
                          rows={2}
                          className="w-full border border-slate-200 p-2 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleProcessReturn(selectedOrder.id, false)}
                          disabled={updatingId === selectedOrder.id}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer text-xs"
                        >
                          Xác nhận từ chối
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectInput(false);
                            setRejectReasonInput('');
                          }}
                          disabled={updatingId === selectedOrder.id}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 font-bold transition-colors text-slate-500 cursor-pointer text-xs"
                        >
                          Hủy bỏ
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all cursor-pointer"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
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
