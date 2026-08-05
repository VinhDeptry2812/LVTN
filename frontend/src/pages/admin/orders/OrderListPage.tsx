import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { formatPrice, formatDate } from '@/utils/format';

import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';
import StatCard from '@/components/StatCard';

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
  X,
  CheckCheck,
  Ban,
  ClipboardCheck
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
  cancel_reason?: string;
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

  // State cho Modal Hủy Đơn Hàng Admin
  const [adminCancelModalOrderId, setAdminCancelModalOrderId] = useState<number | null>(null);
  const [adminCancelReasonOption, setAdminCancelReasonOption] = useState<string>('Sản phẩm hết hàng trong kho');
  const [adminCustomCancelReason, setAdminCustomCancelReason] = useState<string>('');

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();
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
      const url = `/orders/admin?page=${page}&limit=${limit}${statusFilter ? `&status=${statusFilter}` : ''
        }${debouncedSearch ? `&search=${debouncedSearch}` : ''}${paymentMethodFilter ? `&paymentMethod=${paymentMethodFilter}` : ''
        }${dateRangeFilter !== 'all' ? `&dateRange=${dateRangeFilter}` : ''
        }`;
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
      }));
      setOrders(mappedOrders);
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

  const handleDownloadInvoice = async (orderId: number) => {
    const loadingToast = toast.loading('Đang chuẩn bị hóa đơn...');
    try {
      const response = await api.get(`/orders/${orderId}/invoice`, {
        responseType: 'blob',
      });
      toast.dismiss(loadingToast);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Xuất hóa đơn PDF thành công!');
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Lỗi khi xuất hóa đơn:', error);
      toast.error('Không thể xuất hóa đơn. Vui lòng thử lại sau.');
    }
  };

  const handleUpdateStatus = (orderId: number, status: string, paymentStatus?: string) => {
    if (status === 'cancelled') {
      setAdminCancelModalOrderId(orderId);
      setAdminCancelReasonOption('Sản phẩm hết hàng trong kho');
      setAdminCustomCancelReason('');
      return;
    }

    let statusMsg = '';
    if (status === 'confirmed') statusMsg = 'xác nhận đơn hàng này';
    else if (status === 'shipping') statusMsg = 'bắt đầu giao hàng đơn hàng này';
    else if (status === 'delivered') statusMsg = 'xác nhận đã giao thành công đơn hàng này';
    else if (status === 'completed') statusMsg = 'hoàn thành đơn hàng này';
    else if (paymentStatus === 'paid') statusMsg = 'xác nhận đã thanh toán đơn hàng này';
    else statusMsg = 'cập nhật trạng thái đơn hàng này';

    openConfirm({
      title: 'Cập nhật trạng thái đơn hàng',
      message: `Bạn có chắc chắn muốn ${statusMsg}?`,
      confirmText: 'Cập nhật',
      type: 'warning',
      onConfirm: async () => {
        closeConfirm();
        setUpdatingId(orderId);
        try {
          const payload: Record<string, string> = {};
          if (status) payload.status = status;
          if (paymentStatus) payload.payment_status = paymentStatus;

          const response = await api.patch(`/orders/admin/${orderId}/status`, payload);
          const updatedOrder = response.data;

          // Update local state
          setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(updatedOrder);
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

  const handleConfirmAdminCancelOrder = async () => {
    if (!adminCancelModalOrderId) return;
    const finalReason = adminCancelReasonOption === 'Lý do khác' ? adminCustomCancelReason.trim() : adminCancelReasonOption;
    if (adminCancelReasonOption === 'Lý do khác' && !finalReason) {
      toast.error('Vui lòng nhập chi tiết lý do hủy đơn.');
      return;
    }

    setUpdatingId(adminCancelModalOrderId);
    try {
      const payload = { status: 'cancelled', cancel_reason: finalReason };
      const response = await api.patch(`/orders/admin/${adminCancelModalOrderId}/status`, payload);
      const updatedOrder = response.data;

      setOrders(prev => prev.map(o => o.id === adminCancelModalOrderId ? updatedOrder : o));
      if (selectedOrder && selectedOrder.id === adminCancelModalOrderId) {
        setSelectedOrder(updatedOrder);
      }

      fetchStats();
      toast.success('Hủy đơn hàng thành công!');
      setAdminCancelModalOrderId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn hàng.');
    } finally {
      setUpdatingId(null);
    }
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
      case 'return_pending':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300"><AlertCircle size={12} /> Y/C Đổi trả</span>;
      case 'return_approved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200"><CheckCircle size={12} /> Nhận đổi trả</span>;
      case 'return_rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300"><XCircle size={12} /> Từ chối đổi trả</span>;
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
      <AdminPageHeader
        title="Quản lý Đơn hàng"
        subtitle="Xem chi tiết, đóng gói, giao hàng và theo dõi dòng đời đơn hàng."
        icon={ShoppingBag}
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Tổng Doanh Thu"
            value={formatPrice(stats.revenue)}
            subtext="Chỉ tính các đơn hàng đã hoàn thành"
            icon={TrendingUp}
            iconColorClass="text-emerald-600"
            iconBgClass="bg-emerald-50"
          />
          <StatCard
            title="Đơn Chờ Xử Lý"
            value={stats.pendingOrders}
            subtext="Cần phê duyệt và chuyển sang đóng gói"
            icon={AlertCircle}
            iconColorClass="text-amber-600"
            iconBgClass="bg-amber-50"
          />
          <StatCard
            title="Tổng Số Đơn Hàng"
            value={stats.totalOrders}
            subtext="Gồm tất cả trạng thái trong hệ thống"
            icon={ShoppingBag}
            iconColorClass="text-indigo-600"
            iconBgClass="bg-indigo-50"
          />
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
            { id: 'pending', label: 'Chờ xử lý', icon: <Clock size={14} /> },
            { id: 'confirmed', label: 'Đã xác nhận', icon: <ClipboardCheck size={14} /> },
            { id: 'shipping', label: 'Đang giao', icon: <Truck size={14} /> },
            { id: 'delivered', label: 'Đã giao', icon: <CheckCircle size={14} /> },
            { id: 'completed', label: 'Hoàn thành', icon: <CheckCheck size={14} /> },
            { id: 'cancelled', label: 'Đã hủy', icon: <Ban size={14} /> },

          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer ${isActive
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
          <TableLoader />
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
                    <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getPaymentStatusBadge(order.payment_status)}
                        {order.payment_method === 'VNPAY' ? (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50/60 border border-blue-200/60 px-1.5 py-0.5 rounded-none uppercase mt-1">VNPAY</span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-650 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-none uppercase mt-1">{order.payment_method}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="w-8 h-8 rounded-none text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>

                        {order.status === 'pending' && (
                          <>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                              className="w-8 h-8 rounded-none text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-50"
                              title="Xác nhận đơn hàng"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              className="w-8 h-8 rounded-none text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-50"
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
                              className="w-8 h-8 rounded-none text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-50"
                              title="Bắt đầu giao hàng"
                            >
                              <Truck size={14} />
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              className="w-8 h-8 rounded-none text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-50"
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
                            className="w-8 h-8 rounded-none text-slate-500 hover:text-teal-600 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-50"
                            title="Xác nhận đã giao hàng"
                          >
                            <Check size={15} />
                          </button>
                        )}
                        {order.status === 'delivered' && (
                          <button
                            disabled={updatingId !== null}
                            onClick={() => handleUpdateStatus(order.id, 'completed', 'paid')}
                            className="w-8 h-8 rounded-none text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-50"
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
        <AdminPagination
          currentPage={page}
          totalItems={total}
          pageSize={limit}
          onPageChange={(newPage) => setPage(newPage)}
        />

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
                      Sản phẩm đặt mua ({selectedOrder.items?.length || 0})
                    </h4>

                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-none overflow-hidden">
                      {selectedOrder.items?.map((item) => {
                        const primaryImg = item.product?.images?.find(img => img.is_primary)?.image_url
                          || item.product?.images?.[0]?.image_url;
                        const isReturnedItem = selectedOrder.return_items?.includes(item.id);
                        return (
                          <div key={item.id} className={`p-4 flex justify-between items-center bg-white hover:bg-slate-50/30 transition-colors ${isReturnedItem ? 'border-l-4 border-l-rose-500 bg-rose-50/10' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-none flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                                {primaryImg ? (
                                  <img
                                    src={primaryImg}
                                    alt={item.product?.name || 'Sản phẩm'}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-slate-500 font-extrabold text-sm uppercase">
                                    {item.product?.name?.charAt(0) || 'P'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="font-bold text-slate-800 text-sm leading-tight">{item.product?.name || 'Sản phẩm không xác định'}</div>
                                  {isReturnedItem && (
                                    <span className="px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 uppercase tracking-wider">
                                      Lỗi cần đổi trả
                                    </span>
                                  )}
                                </div>
                                {item.variant && (
                                  <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1.5">
                                    {Object.entries(item.variant.attributes).map(([k, v]) => (
                                      <span key={k} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-none font-semibold">
                                        {k}: {v}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 mt-1 font-mono">Mã SKU: {item.product?.sku || '—'}</div>
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

                  {/* Return Request Info if available */}
                  {(selectedOrder.status.startsWith('return_') || selectedOrder.return_reason) && (
                    <div className="bg-amber-50/50 rounded-none border border-amber-200 shadow-sm p-5 space-y-4">
                      <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 border-b border-amber-100 pb-3">
                        <AlertCircle size={16} className="text-amber-700" />
                        Thông tin yêu cầu đổi trả hàng lỗi
                      </h4>
                      <div className="space-y-3.5 text-xs text-slate-700">
                        <div>
                          <span className="text-slate-400 font-semibold block mb-1">Lý do đổi trả</span>
                          <span className="font-bold text-amber-900 text-sm">{selectedOrder.return_reason || 'Không rõ'}</span>
                        </div>
                        {selectedOrder.return_description && (
                          <div>
                            <span className="text-slate-400 font-semibold block mb-1">Mô tả chi tiết lỗi</span>
                            <p className="text-slate-650 leading-relaxed font-semibold">{selectedOrder.return_description}</p>
                          </div>
                        )}
                        {selectedOrder.return_images && selectedOrder.return_images.length > 0 && (
                          <div>
                            <span className="text-slate-400 font-semibold block mb-1">Hình ảnh đính kèm ({selectedOrder.return_images.length})</span>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {selectedOrder.return_images.map((imgUrl, idx) => (
                                <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="relative group">
                                  <img
                                    src={imgUrl}
                                    alt={`return-evidence-${idx}`}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-16 h-16 object-cover border border-slate-200 hover:border-amber-500 rounded-none transition-all shadow-sm"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedOrder.return_rejected_reason && (
                          <div className="bg-rose-50 border border-rose-100 rounded-none p-3 text-rose-800">
                            <strong className="block mb-1 font-bold text-[10px] uppercase tracking-wider text-rose-900">Lý do từ chối trước đó:</strong>
                            {selectedOrder.return_rejected_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                      {['confirmed', 'shipping', 'delivered', 'completed', 'return_pending', 'return_approved', 'return_rejected'].includes(selectedOrder.status) ? (
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
                          {selectedOrder.cancel_reason && (
                            <div className="mt-2 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-none text-xs">
                              <strong className="block font-bold text-[10px] uppercase text-rose-900 mb-0.5">Lý do hủy đơn:</strong>
                              {selectedOrder.cancel_reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative opacity-40">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-slate-300 border-2 border-white" />
                          <div className="font-semibold text-slate-500">Đang chờ xác nhận</div>
                        </div>
                      )}

                      {/* Step 3: Shipping */}
                      {['shipping', 'delivered', 'completed', 'return_pending', 'return_approved', 'return_rejected'].includes(selectedOrder.status) ? (
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
                      {['delivered', 'completed', 'return_pending', 'return_approved', 'return_rejected'].includes(selectedOrder.status) ? (
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
                      {['completed', 'return_pending', 'return_approved', 'return_rejected'].includes(selectedOrder.status) ? (
                        <div className="relative">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-emerald-600 border-2 border-white ring-4 ring-emerald-50" />
                          <div className="font-bold text-emerald-700">Đơn hàng hoàn tất</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            {selectedOrder.completed_at ? formatDate(selectedOrder.completed_at) : 'Đơn hàng đã được hoàn tất trước khi yêu cầu đổi trả'}
                          </div>
                        </div>
                      ) : selectedOrder.status !== 'cancelled' ? (
                        <div className="relative opacity-40">
                          <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-slate-300 border-2 border-white" />
                          <div className="font-semibold text-slate-500">Chờ hoàn tất đơn hàng</div>
                        </div>
                      ) : null}

                      {/* Step 6: Return Flow */}
                      {selectedOrder.status.startsWith('return_') && (
                        <>
                          {/* Sub-step 6a: Return Requested */}
                          <div className="relative">
                            <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-amber-500 border-2 border-white ring-4 ring-amber-50" />
                            <div className="font-bold text-amber-700">Yêu cầu đổi trả hàng</div>

                            <div className="text-slate-400 text-[10px] mt-0.5">
                              {selectedOrder.return_requested_at ? formatDate(selectedOrder.return_requested_at) : 'Khách hàng đã gửi yêu cầu đổi trả'}
                            </div>
                          </div>

                          {/* Sub-step 6b: Return Handled */}
                          {selectedOrder.status === 'return_approved' ? (
                            <div className="relative">
                              <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-emerald-600 border-2 border-white ring-4 ring-emerald-50" />
                              <div className="font-bold text-emerald-700">Chấp nhận đổi trả hàng</div>
                              <div className="text-slate-400 text-[10px] mt-0.5">
                                {selectedOrder.return_handled_at ? formatDate(selectedOrder.return_handled_at) : 'Yêu cầu đổi trả đã được duyệt'}
                              </div>
                            </div>
                          ) : selectedOrder.status === 'return_rejected' ? (
                            <div className="relative">
                              <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-rose-600 border-2 border-white ring-4 ring-rose-50" />
                              <div className="font-bold text-rose-700">Từ chối đổi trả hàng</div>

                              <div className="text-slate-400 text-[10px] mt-0.5">
                                {selectedOrder.return_handled_at ? formatDate(selectedOrder.return_handled_at) : 'Yêu cầu đổi trả bị từ chối'}
                              </div>
                            </div>
                          ) : (
                            <div className="relative opacity-40">
                              <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-none bg-slate-300 border-2 border-white" />
                              <div className="font-semibold text-slate-500">Đang chờ xử lý yêu cầu đổi trả</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              {/* Left action button inside Modal */}
              <div className="flex gap-2">
                {selectedOrder.status !== 'cancelled' &&
                  selectedOrder.status !== 'completed' &&
                  selectedOrder.status !== 'delivered' &&
                  !selectedOrder.status.startsWith('return_') && (
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
                onClick={() => handleDownloadInvoice(selectedOrder.id)}
                className="px-4 py-2 border border-slate-900 text-slate-900 rounded-none text-sm font-bold hover:bg-slate-100 transition-all cursor-pointer mr-2"
              >
                Xuất hóa đơn (PDF)
              </button>

              <button
                onClick={() => {
                  setShowModal(false);
                }}
                className="px-5 py-2 bg-slate-900 text-white rounded-none text-sm font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Hủy Đơn Hàng Admin */}
      {adminCancelModalOrderId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-none bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Xác nhận hủy đơn hàng #{adminCancelModalOrderId}
                  </h3>
                  <p className="text-[11px] text-slate-500">Yêu cầu nhập lý do hủy đơn (Admin)</p>
                </div>
              </div>
              <button
                onClick={() => setAdminCancelModalOrderId(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Lý do hủy đơn hàng <span className="text-rose-600">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    'Sản phẩm hết hàng trong kho',
                    'Khách hàng yêu cầu hủy qua điện thoại',
                    'Thông tin giao hàng không chính xác / nghi ngờ giả mạo',
                    'Đơn hàng trùng lặp',
                    'Lý do khác',
                  ].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-2.5 rounded-none border text-xs cursor-pointer transition ${
                        adminCancelReasonOption === option
                          ? 'border-rose-600 bg-rose-50/50 font-medium text-rose-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="adminCancelReason"
                        value={option}
                        checked={adminCancelReasonOption === option}
                        onChange={() => setAdminCancelReasonOption(option)}
                        className="accent-rose-600"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {adminCancelReasonOption === 'Lý do khác' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Nhập chi tiết lý do <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    value={adminCustomCancelReason}
                    onChange={(e) => setAdminCustomCancelReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể..."
                    rows={3}
                    className="w-full text-xs p-2.5 rounded-none border border-slate-200 focus:border-rose-600 focus:outline-none bg-slate-50"
                  />
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-none text-[11px] leading-relaxed">
                <strong>Lưu ý:</strong> Lý do hủy đơn sẽ được gửi trực tiếp đến Email của khách hàng và lưu lại trong nhật ký hệ thống.
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdminCancelModalOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-none transition"
                disabled={updatingId !== null}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminCancelOrder}
                disabled={updatingId !== null}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-none transition shadow-sm disabled:opacity-50"
              >
                {updatingId !== null ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
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
        onCancel={closeConfirm}
      />
    </div>
  );
}
