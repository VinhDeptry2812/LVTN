import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
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
  AlertCircle,
  TrendingUp,
  Package,
  Calendar,
  Phone,
  MapPin,
  ClipboardList,
  Download,
  User,
  Clock,
  Check,
  X
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
    name: string; 
    sku?: string;
    images?: ProductImage[];
  };
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
  confirmed_at?: string;
  shipping_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  user?: { name: string; email: string };
  items: OrderItem[];
  voucher_code?: string;
  discount_amount?: number;
}

export default function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });
  const [stats, setStats] = useState<{
    totalOrders: number;
    pendingOrders: number;
    revenue: number;
  } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/orders/admin/stats');
      setStats(res.data);
    } catch {
      // silent handle
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = `/orders/admin?page=${page}&limit=${limit}${
        statusFilter ? `&status=${statusFilter}` : ''
      }${debouncedSearch ? `&search=${debouncedSearch}` : ''}${
        paymentMethodFilter ? `&paymentMethod=${paymentMethodFilter}` : ''
      }${
        dateRangeFilter !== 'all' ? `&dateRange=${dateRangeFilter}` : ''
      }`;
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
    fetchStats();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, debouncedSearch, paymentMethodFilter, dateRangeFilter]);

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

  const handleExportEXCEL = () => {
    //Xử lí xuất file excel báo cáo đơn hàng
  };

  const handleUpdateStatus = (orderId: number, status: string, paymentStatus?: string) => {
    let statusMsg = '';
    if (status === 'confirmed') statusMsg = 'xác nhận đơn hàng này';
    else if (status === 'shipping') statusMsg = 'bắt đầu giao hàng đơn hàng này';
    else if (status === 'delivered') statusMsg = 'xác nhận đã giao thành công đơn hàng này';
    else if (status === 'completed') statusMsg = 'hoàn thành đơn hàng này';
    else if (status === 'cancelled') statusMsg = 'hủy đơn hàng này';
    else if (paymentStatus === 'paid') statusMsg = 'xác nhận đã thanh toán đơn hàng này';
    else statusMsg = 'cập nhật trạng thái đơn hàng này';

    setConfirmModal({
      isOpen: true,
      title: 'Cập nhật trạng thái đơn hàng',
      message: `Bạn có chắc chắn muốn ${statusMsg}?`,
      confirmText: status === 'cancelled' ? 'Hủy đơn' : 'Cập nhật',
      type: status === 'cancelled' ? 'danger' : 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
          
          // Refresh stats
          fetchStats();
          toast.success('Cập nhật trạng thái đơn hàng thành công!');
        } catch {
          toast.error('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng.');
        } finally {
          setUpdatingId(null);
        }
      }
    });
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
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle size={12} /> Chờ xử lý</span>;
      case 'confirmed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><CheckCircle size={12} /> Đã xác nhận</span>;
      case 'shipping':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><Truck size={12} /> Đang giao</span>;
      case 'delivered':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200"><CheckCircle size={12} /> Đã giao</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle size={12} /> Hoàn thành</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle size={12} /> Đã hủy</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (pStatus: string) => {
    switch (pStatus) {
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-none text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Chờ thanh toán</span>;
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-none text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã thanh toán</span>;
      case 'refunded':
        return <span className="px-2.5 py-0.5 rounded-none text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Đã hoàn tiền</span>;
      case 'failed':
        return <span className="px-2.5 py-0.5 rounded-none text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Thất bại</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-none text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">{pStatus}</span>;
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Quản lý Đơn hàng
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Xem chi tiết, đóng gói, giao hàng và theo dõi dòng đời đơn hàng.</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Doanh Thu</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatPrice(stats.revenue)}</h3>
              <p className="text-[11px] text-slate-500">Chỉ tính các đơn hàng đã hoàn thành</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 flex items-center justify-center text-blue-600 rounded-none border border-blue-100">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đơn Chờ Xử Lý</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.pendingOrders}</h3>
              <p className="text-[11px] text-slate-500">Cần phê duyệt và chuyển sang đóng gói</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 flex items-center justify-center text-amber-600 rounded-none border border-amber-100">
              <AlertCircle size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Số Đơn Hàng</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.totalOrders}</h3>
              <p className="text-[11px] text-slate-500">Gồm tất cả trạng thái trong hệ thống</p>
            </div>
            <div className="w-12 h-12 bg-slate-50 flex items-center justify-center text-slate-600 rounded-none border border-slate-100">
              <ShoppingBag size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, khách hàng, số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-none border border-slate-200 text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400 text-slate-800"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Dropdown */}
            <div className="relative min-w-[150px]">
              <select
                value={dateRangeFilter}
                onChange={(e) => { setDateRangeFilter(e.target.value); setPage(1); }}
                className="w-full pl-3 pr-8 py-2.5 rounded-none border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 appearance-none cursor-pointer"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <Calendar size={14} />
              </div>
            </div>

            {/* Payment Method Dropdown */}
            <div className="relative min-w-[150px]">
              <select
                value={paymentMethodFilter}
                onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
                className="w-full pl-3 pr-8 py-2.5 rounded-none border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 appearance-none cursor-pointer"
              >
                <option value="">Tất cả phương thức</option>
                <option value="COD">Thanh toán COD</option>
                <option value="VNPAY">Thanh toán VNPAY</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <Filter size={14} />
              </div>
            </div>

            {/* Export Excel button */}
            <button
              onClick={handleExportEXCEL}
              disabled={orders.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-none text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} className="text-slate-500" />
              <span>Xuất file Excel</span>
            </button>
          </div>
        </div>

        {/* Tab Status Filters */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {[
            { id: '', label: 'Tất cả đơn', icon: <ShoppingBag size={14} /> },
            { id: 'pending', label: 'Chờ xử lý', icon: <AlertCircle size={14} /> },
            { id: 'confirmed', label: 'Đã xác nhận', icon: <CheckCircle size={14} /> },
            { id: 'shipping', label: 'Đang giao', icon: <Truck size={14} /> },
            { id: 'delivered', label: 'Đã giao', icon: <CheckCircle size={14} /> },
            { id: 'completed', label: 'Hoàn thành', icon: <CheckCircle size={14} /> },
            { id: 'cancelled', label: 'Đã hủy', icon: <XCircle size={14} /> },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-900/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
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
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="text-left px-6 py-4">Mã đơn</th>
                  <th className="text-left px-6 py-4">Khách hàng</th>
                  <th className="text-left px-6 py-4">Thông tin giao nhận</th>
                  <th className="text-right px-6 py-4">Tổng tiền</th>
                  <th className="text-center px-6 py-4">Trạng thái đơn</th>
                  <th className="text-center px-6 py-4">Thanh toán</th>
                  <th className="text-center px-6 py-4">Thao tác nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-none text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        #{order.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-none border flex items-center justify-center font-bold text-xs uppercase shadow-sm ${getAvatarColor(order.user?.name || 'K')}`}>
                          {(order.user?.name || 'K').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{order.user?.name || 'Khách vãng lai'}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{order.user?.email || 'Không có email'}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                            <Calendar size={10} />
                            <span>{formatDate(order.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[220px]">
                      <div className="font-semibold text-slate-700 flex items-center gap-1 text-xs">
                        <Phone size={12} className="text-slate-400 flex-shrink-0" />
                        <span>{order.phone}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-1" title={order.shipping_address}>
                        <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{order.shipping_address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-blue-600 text-sm">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getPaymentStatusBadge(order.payment_status)}
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-none uppercase mt-0.5">{order.payment_method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="w-8 h-8 rounded-none text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 flex items-center justify-center transition-all cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        
                        {order.status === 'pending' && (
                          <>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                              className="w-8 h-8 rounded-none bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/40 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              title="Xác nhận đơn hàng"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              className="w-8 h-8 rounded-none bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/40 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              title="Hủy đơn hàng"
                            >
                              <X size={15} />
                            </button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleUpdateStatus(order.id, 'shipping')}
                              className="w-8 h-8 rounded-none bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/40 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              title="Bắt đầu giao hàng"
                            >
                              <Truck size={14} />
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              className="w-8 h-8 rounded-none bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/40 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              title="Hủy đơn hàng"
                            >
                              <X size={15} />
                            </button>
                          </>
                        )}
                        {order.status === 'shipping' && (
                          <button
                            disabled={updatingId !== null}
                            onClick={() => handleUpdateStatus(order.id, 'delivered')}
                            className="w-8 h-8 rounded-none bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200/40 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                            title="Xác nhận đã giao hàng"
                          >
                            <Check size={15} />
                          </button>
                        )}
                        {order.status === 'delivered' && (
                          <button
                            disabled={updatingId !== null}
                            onClick={() => handleUpdateStatus(order.id, 'completed', 'paid')}
                            className="w-8 h-8 rounded-none bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/40 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                            title="Cưỡng chế hoàn thành (Nhận hàng)"
                          >
                            <Check size={15} />
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
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Trang {page} / {totalPages} (Tổng cộng {total} đơn hàng)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2 border border-slate-200 rounded-none bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-2 border border-slate-200 rounded-none bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal (Split Layout) */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  Đơn hàng #{selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Đặt lúc: {formatDate(selectedOrder.created_at)}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-2xl cursor-pointer w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-none transition-all"
              >
                &times;
              </button>
            </div>

            {/* Modal Content (Split Layout) */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side: Order Items & Subtotal (takes 2/3 space) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Order Items list */}
                  <div className="bg-white rounded-none border border-slate-100 shadow-sm p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                      <ShoppingBag size={16} className="text-slate-500" />
                      Sản phẩm đặt mua ({selectedOrder.items.length})
                    </h4>
                    
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-none overflow-hidden">
                      {selectedOrder.items.map((item) => {
                        const primaryImg = item.product.images?.find(img => img.is_primary)?.image_url 
                          || item.product.images?.[0]?.image_url;
                        return (
                          <div key={item.id} className="p-4 flex justify-between items-center bg-white hover:bg-slate-50/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-none flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                                {primaryImg ? (
                                  <img 
                                    src={primaryImg} 
                                    alt={item.product.name} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <span className="text-slate-500 font-extrabold text-sm uppercase">
                                    {item.product.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm leading-tight">{item.product.name}</div>
                                {item.variant && (
                                  <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1.5">
                                    {Object.entries(item.variant.attributes).map(([k, v]) => (
                                      <span key={k} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-none font-semibold">
                                        {k}: {v}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 mt-1 font-mono">Mã SKU: {item.product.sku || '—'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-800 text-sm">{formatPrice(item.price)}</div>
                              <div className="text-xs text-slate-500 mt-1 font-semibold">Số lượng: x{item.quantity}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Summary & Status card */}
                  <div className="bg-white rounded-none border border-slate-100 shadow-sm p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                      <DollarSign size={16} className="text-slate-500" />
                      Chi tiết thanh toán & Trạng thái đơn
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                      {/* Left Sub-column: Price Calculation */}
                      <div className="space-y-3 md:border-r md:border-slate-100 md:pr-6">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Tạm tính hàng hóa:</span>
                          <span className="font-semibold text-slate-700">
                            {formatPrice(selectedOrder.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}
                          </span>
                        </div>
                        {selectedOrder.voucher_code && (
                          <div className="flex justify-between text-xs text-emerald-600">
                            <span className="flex items-center gap-1 font-semibold">
                              Mã giảm giá ({selectedOrder.voucher_code}):
                            </span>
                            <span className="font-semibold">-{formatPrice(selectedOrder.discount_amount || 0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Phí giao hàng:</span>
                          <span className="font-bold text-emerald-600">Miễn phí</span>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold text-slate-850">
                          <span className="text-xs">Tổng cộng thanh toán:</span>
                          <span className="text-lg text-blue-600 font-extrabold">{formatPrice(selectedOrder.total_amount)}</span>
                        </div>
                      </div>

                      {/* Right Sub-column: Payment & Order Status */}
                      <div className="space-y-3 flex flex-col justify-center">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-semibold">Phương thức:</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-100 px-2.5 py-0.5 rounded-none border border-slate-200">{selectedOrder.payment_method}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-semibold">Thanh toán:</span>
                          {getPaymentStatusBadge(selectedOrder.payment_status)}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-semibold">Trạng thái đơn:</span>
                          {getStatusBadge(selectedOrder.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Customer Info, Payment Status, and Timeline */}
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="bg-white rounded-none border border-slate-100 shadow-sm p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Giao nhận & Liên hệ</h4>
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block mb-1">Khách hàng</span>
                        <span className="font-bold text-slate-800 text-sm block">{selectedOrder.user?.name || 'Khách vãng lai'}</span>
                        <span className="font-mono text-slate-400 block mt-0.5">{selectedOrder.user?.email || 'Không có email'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block mb-1">Số điện thoại liên lạc</span>
                        <span className="font-bold text-slate-700 text-sm block">{selectedOrder.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block mb-1">Địa chỉ giao hàng</span>
                        <span className="text-slate-600 block leading-relaxed font-semibold">{selectedOrder.shipping_address}</span>
                      </div>
                      {selectedOrder.notes && (
                        <div className="bg-amber-50/80 border border-amber-100 rounded-none p-3 text-amber-800 text-xs">
                          <strong className="block mb-1 font-bold text-[10px] uppercase tracking-wider text-amber-900">Ghi chú từ khách:</strong>
                          {selectedOrder.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline status flow */}
                  <div className="bg-white rounded-none border border-slate-100 shadow-sm p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Tiến độ đơn hàng</h4>
                    
                    <div className="relative border-l-2 border-slate-100 pl-4 ml-2.5 space-y-5 text-xs py-1">
                      
                      {/* Step 1: Created */}
                      <div className="relative">
                        <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-blue-600 border-2 border-white ring-4 ring-blue-50" />
                        <div className="font-bold text-slate-800">Đơn hàng được tạo thành công</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">{formatDate(selectedOrder.created_at)}</div>
                      </div>

                      {/* Step 2: Confirmed */}
                      {['confirmed', 'shipping', 'delivered', 'completed'].includes(selectedOrder.status) ? (
                        <div className="relative">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-blue-600 border-2 border-white ring-4 ring-blue-50" />
                          <div className="font-bold text-slate-800">Đã xác nhận đơn hàng</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            {selectedOrder.confirmed_at ? formatDate(selectedOrder.confirmed_at) : 'Admin đã xác thực thông tin đơn'}
                          </div>
                        </div>
                      ) : selectedOrder.status === 'cancelled' ? (
                        <div className="relative">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-rose-600 border-2 border-white ring-4 ring-rose-50" />
                          <div className="font-bold text-rose-700">Đơn hàng đã hủy</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            {selectedOrder.cancelled_at ? formatDate(selectedOrder.cancelled_at) : 'Không còn hiệu lực xử lý'}
                          </div>
                        </div>
                      ) : (
                        <div className="relative opacity-40">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-slate-300 border-2 border-white" />
                          <div className="font-semibold text-slate-500">Đang chờ xác nhận</div>
                        </div>
                      )}

                      {/* Step 3: Shipping */}
                      {['shipping', 'delivered', 'completed'].includes(selectedOrder.status) ? (
                        <div className="relative">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-blue-600 border-2 border-white ring-4 ring-blue-50" />
                          <div className="font-bold text-slate-800">Đang vận chuyển</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            {selectedOrder.shipping_at ? formatDate(selectedOrder.shipping_at) : 'Hàng hóa đang trên đường giao hàng'}
                          </div>
                        </div>
                      ) : selectedOrder.status !== 'cancelled' ? (
                        <div className="relative opacity-40">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-slate-300 border-2 border-white" />
                          <div className="font-semibold text-slate-500">Đang chờ giao hàng</div>
                        </div>
                      ) : null}

                      {/* Step 4: Delivered */}
                      {['delivered', 'completed'].includes(selectedOrder.status) ? (
                        <div className="relative">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-blue-600 border-2 border-white ring-4 ring-blue-50" />
                          <div className="font-bold text-slate-800">Đã giao thành công</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            {selectedOrder.delivered_at ? formatDate(selectedOrder.delivered_at) : 'Chờ khách xác nhận đã nhận sản phẩm'}
                          </div>
                        </div>
                      ) : selectedOrder.status !== 'cancelled' ? (
                        <div className="relative opacity-40">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-slate-300 border-2 border-white" />
                          <div className="font-semibold text-slate-500">Đang chờ khách nhận hàng</div>
                        </div>
                      ) : null}

                      {/* Step 5: Completed */}
                      {selectedOrder.status === 'completed' ? (
                        <div className="relative">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-emerald-600 border-2 border-white ring-4 ring-emerald-50" />
                          <div className="font-bold text-emerald-700">Đơn hàng hoàn tất</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            {selectedOrder.completed_at ? formatDate(selectedOrder.completed_at) : 'Khách đã bấm xác nhận nhận sản phẩm'}
                          </div>
                        </div>
                      ) : selectedOrder.status !== 'cancelled' ? (
                        <div className="relative opacity-40">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-slate-300 border-2 border-white" />
                          <div className="font-semibold text-slate-500">Chờ hoàn tất đơn hàng</div>
                        </div>
                      ) : null}

                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              {/* Left action button inside Modal */}
              <div className="flex gap-2">
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'delivered' && (
                  <button
                    disabled={updatingId !== null}
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'cancelled');
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/50 rounded-none text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Hủy đơn hàng này
                  </button>
                )}

                {selectedOrder.status === 'pending' && (
                  <button
                    disabled={updatingId !== null}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Xác nhận đơn ngay
                  </button>
                )}

                {selectedOrder.status === 'confirmed' && (
                  <button
                    disabled={updatingId !== null}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'shipping')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Giao đơn vận chuyển
                  </button>
                )}

                {selectedOrder.status === 'shipping' && (
                  <button
                    disabled={updatingId !== null}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-none text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Xác nhận đã giao hàng
                  </button>
                )}

                {selectedOrder.status === 'delivered' && (
                  <button
                    disabled={updatingId !== null}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'completed', 'paid')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cưỡng chế hoàn thành
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-none text-sm font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>

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
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
