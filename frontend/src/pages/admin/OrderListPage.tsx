import { useState, useEffect } from 'react';
import api from '@/services/api';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  CheckCircle, 
  Truck, 
  XCircle, 
  DollarSign, 
  AlertCircle 
} from 'lucide-react';

interface OrderItem {
  id: number;
  price: number;
  quantity: number;
  product: { name: string; sku?: string };
  variant?: { attributes: Record<string, string> };
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
  user?: { name: string; email: string };
  items: OrderItem[];
}

export default function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = `/orders/admin?page=${page}&limit=${limit}${statusFilter ? `&status=${statusFilter}` : ''}`;
      const res = await api.get(url);
      setOrders(res.data.data);
      setTotal(res.data.total);
    } catch {
      // silent error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleUpdateStatus = async (orderId: number, status: string, paymentStatus?: string) => {
    setUpdatingId(orderId);
    try {
      const payload: Record<string, string> = {};
      if (status) payload.status = status;
      if (paymentStatus) payload.payment_status = paymentStatus;

      await api.patch(`/orders/admin/${orderId}/status`, payload);
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...payload } : null);
      }
    } catch {
      alert('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng.');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><AlertCircle size={12} /> Chờ xử lý</span>;
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><CheckCircle size={12} /> Đã xác nhận</span>;
      case 'shipping':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700"><Truck size={12} /> Đang giao</span>;
      case 'delivered':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle size={12} /> Đã giao</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700"><XCircle size={12} /> Đã hủy</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (pStatus: string) => {
    switch (pStatus) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Chờ thanh toán</span>;
      case 'paid':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Đã thanh toán</span>;
      case 'refunded':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Đã hoàn tiền</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">{pStatus}</span>;
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Đơn hàng</h1>
          <p className="text-slate-500 mt-1">Xử lý, theo dõi và cập nhật trạng thái đơn hàng của khách hàng.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <Filter size={18} />
          <span>Bộ lọc đơn hàng:</span>
        </div>
        <div className="flex gap-2">
          {['', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === '' && 'Tất cả'}
              {status === 'pending' && 'Chờ xử lý'}
              {status === 'confirmed' && 'Đã xác nhận'}
              {status === 'shipping' && 'Đang giao'}
              {status === 'delivered' && 'Đã giao'}
              {status === 'cancelled' && 'Đã hủy'}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
            Không tìm thấy đơn hàng nào phù hợp bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="text-left px-6 py-4 font-semibold">Mã đơn</th>
                  <th className="text-left px-6 py-4 font-semibold">Khách hàng</th>
                  <th className="text-left px-6 py-4 font-semibold">Địa chỉ & SĐT</th>
                  <th className="text-right px-6 py-4 font-semibold">Tổng tiền</th>
                  <th className="text-center px-6 py-4 font-semibold">Trạng thái đơn</th>
                  <th className="text-center px-6 py-4 font-semibold">Thanh toán</th>
                  <th className="text-center px-6 py-4 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">#{order.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{order.user?.name || 'Khách vãng lai'}</div>
                      <div className="text-xs text-slate-400 font-mono">{order.user?.email || 'Không có email'}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(order.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-medium text-slate-700">{order.phone}</div>
                      <div className="text-xs text-slate-500 truncate">{order.shipping_address}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getPaymentStatusBadge(order.payment_status)}
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">{order.payment_method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {order.status === 'pending' && (
                          <button
                            disabled={updatingId !== null}
                            onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                          >
                            Xác nhận
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            disabled={updatingId !== null}
                            onClick={() => handleUpdateStatus(order.id, 'shipping')}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                          >
                            Giao hàng
                          </button>
                        )}
                        {order.status === 'shipping' && (
                          <button
                            disabled={updatingId !== null}
                            onClick={() => handleUpdateStatus(order.id, 'delivered', 'paid')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                          >
                            Hoàn thành
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-500">
              Trang {page} / {totalPages} (Tổng {total} đơn hàng)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Chi tiết đơn hàng #{selectedOrder.id}</h3>
                <p className="text-xs text-slate-500 mt-1">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin khách hàng</h4>
                  <p className="text-sm font-semibold text-slate-800">{selectedOrder.user?.name || 'Khách vãng lai'}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedOrder.user?.email || 'Không có email'}</p>
                  <p className="text-xs text-slate-500">{selectedOrder.phone}</p>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Địa chỉ giao hàng</h4>
                  <p className="text-sm text-slate-700">{selectedOrder.shipping_address}</p>
                  {selectedOrder.notes && (
                    <div className="mt-2 text-xs bg-amber-50 border border-amber-100 rounded p-2 text-amber-700">
                      <strong>Ghi chú:</strong> {selectedOrder.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái đơn</div>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Thanh toán</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {getPaymentStatusBadge(selectedOrder.payment_status)}
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1 py-0.5 rounded uppercase">{selectedOrder.payment_method}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        Hủy đơn
                      </button>
                      {selectedOrder.payment_status !== 'paid' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, selectedOrder.status, 'paid')}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Xác nhận thanh toán
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sản phẩm đặt mua</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-4 flex justify-between items-center bg-white hover:bg-slate-50/50">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{item.product.name}</div>
                        {item.variant && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-0.5">Mã SKU: {item.product.sku || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800 text-sm">{formatPrice(item.price)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Số lượng: x{item.quantity}</div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary row */}
                  <div className="p-4 flex justify-between items-center bg-slate-50 font-bold text-slate-800">
                    <div>Tổng thanh toán</div>
                    <div className="text-lg text-blue-600">{formatPrice(selectedOrder.total_amount)}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-950 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
