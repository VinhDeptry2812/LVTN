import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import { 
  Package, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  ShoppingBag, 
  Clock, 
  DollarSign,
  TrendingDown,
  ArrowUpRight,
  ShoppingCart,
  RotateCw,
  FilePlus,
  ShieldCheck,
  BarChart3,
  Users,
  CheckCircle2,
  Award,
  Layers,
  AlertTriangle
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  base_price: number;
  is_active: boolean;
  category?: { name: string };
  created_at?: string;
}

interface Category {
  id: number;
  name: string;
}

interface RecentOrder {
  id: number;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  user?: { name: string };
}

interface ChartDataItem {
  label: string;
  month?: string;
  revenue: number;
}

interface DashboardStats {
  revenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrdersCount?: number;
  customerCount?: number;
  totalRegisteredCustomers?: number;
  topCategory?: {
    name: string;
    percent: number;
  };
  chartData?: ChartDataItem[];
  monthlyRevenue?: ChartDataItem[];
  recentOrders: RecentOrder[];
}

export default function DashboardPage() {
  const { profile } = useOutletContext<{ profile: { role: string; name: string } }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [returnOrdersCount, setReturnOrdersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'7days' | '30days' | '6months' | 'year' | 'custom'>('6months');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchData = async (
    isManualRefresh = false, 
    selectedTimeframe = timeframe,
    sDate = startDate,
    eDate = endDate
  ) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const isStaff = profile?.role === 'staff';
      
      if (isStaff) {
        // Đối với nhân viên: không gọi API lấy doanh thu (/orders/admin/stats)
        const [prodRes, catRes, recentOrdersRes, pendingOrdersRes, invRes, returnRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
          api.get('/orders/admin?page=1&limit=5'),
          api.get('/orders/admin?page=1&limit=1&status=pending'),
          api.get('/products/admin/inventory?filter=lowStock&limit=1').catch(() => ({ data: { total: 0 } })),
          api.get('/orders/admin?isReturn=true&limit=1').catch(() => ({ data: { total: 0 } })),
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
        setStats({
          revenue: 0,
          totalOrders: recentOrdersRes.data.total,
          pendingOrders: pendingOrdersRes.data.total,
          recentOrders: recentOrdersRes.data.data,
        });
        setLowStockCount(invRes.data?.total || 0);
        setReturnOrdersCount(returnRes.data?.total || 0);
      } else {
        // Đối với Admin: gọi thống kê doanh thu theo mốc thời gian (timeframe) hoặc tùy chọn ngày (startDate, endDate)
        let url = `/orders/admin/stats?timeframe=${selectedTimeframe}`;
        if (selectedTimeframe === 'custom' && sDate && eDate) {
          url += `&startDate=${sDate}&endDate=${eDate}`;
        }

        const [prodRes, catRes, statsRes, invRes, returnRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
          api.get(url),
          api.get('/products/admin/inventory?filter=lowStock&limit=1').catch(() => ({ data: { total: 0 } })),
          api.get('/orders/admin?isReturn=true&limit=1').catch(() => ({ data: { total: 0 } })),
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
        setStats(statsRes.data);
        setLowStockCount(invRes.data?.total || 0);
        setReturnOrdersCount(returnRes.data?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchData(false, timeframe, startDate, endDate);
    }
  }, [profile, timeframe]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isStaff = profile?.role === 'staff';

  // 4 thẻ Thống kê quản trị chính (1 hàng)
  const statCards = [
    ...(isStaff ? [] : [{
      label: 'Tổng doanh thu',
      value: formatPrice(stats?.revenue || 0),
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
    }]),
    {
      label: 'Tổng đơn hàng',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      label: 'Đơn chờ xử lý',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-amber-500/20',
    },
    {
      label: 'Tổng sản phẩm',
      value: products.length,
      icon: Package,
      color: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-violet-500/20',
    },
  ];

  // Thống kê phân tích chuyên sâu (KPIs vận hành thực tế)
  const completedCount =
    stats?.completedOrdersCount ??
    (stats?.totalOrders
      ? stats.totalOrders - (stats.pendingOrders || 0)
      : 0);
  const totalCount = stats?.totalOrders ?? 0;
  const completionRate =
    totalCount > 0
      ? ((completedCount / totalCount) * 100).toFixed(1) + '%'
      : '0%';
  const avgOrderVal =
    completedCount > 0
      ? Math.round((stats?.revenue || 0) / completedCount)
      : totalCount > 0
        ? Math.round((stats?.revenue || 0) / totalCount)
        : 0;

  const extraKpis = [
    {
      title: 'Đơn hoàn thành',
      val: stats ? completionRate : '0%',
      sub: stats
        ? `Đã xử lý ${completedCount}/${totalCount} đơn`
        : 'Tỷ lệ xử lý đơn công nhận',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Giá trị TB / Đơn',
      val: formatPrice(avgOrderVal),
      sub: 'Trung bình doanh thu trên đơn',
      icon: BarChart3,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Khách mua hàng',
      val:
        stats?.customerCount !== undefined
          ? `${stats.customerCount}`
          : '0',
      sub:
        stats?.totalRegisteredCustomers !== undefined
          ? `Trên tổng số ${stats.totalRegisteredCustomers} tài khoản hệ thống`
          : 'Khách hàng đã phát sinh đơn',
      icon: Users,
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Danh mục hot nhất',
      val: stats?.topCategory?.name || 'Chưa có dữ liệu',
      sub: stats?.topCategory?.percent
        ? `Chiếm ${stats.topCategory.percent}% doanh số bán`
        : 'Chưa có đơn hoàn thành',
      icon: Award,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
  ];

  const quickActions = [
    {
      label: 'Thêm sản phẩm mới',
      desc: 'Tạo sản phẩm và tự động sinh bài viết bằng Gemini AI',
      icon: Plus,
      to: '/admin/products/create',
      color: 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25',
    },
    {
      label: 'Xử lý đơn hàng',
      desc: 'Cập nhật trạng thái đơn hàng & xác nhận giao hàng',
      icon: ShoppingBag,
      to: '/admin/orders',
      color: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25',
    },
    {
      label: 'Tạo đơn nhập kho',
      desc: 'Tạo phiếu nhập hàng từ nhà cung cấp cho kho',
      icon: FilePlus,
      to: '/admin/warehouse/purchase-orders/create',
      color: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25',
    },
    {
      label: 'Duyệt yêu cầu bảo hành',
      desc: 'Xem và xử lý các yêu cầu bảo hành từ khách hàng',
      icon: ShieldCheck,
      to: '/admin/warranties',
      color: 'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/25',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-none animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang tải dữ liệu ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Sleek Modern Page Header*/}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Tổng quan hệ thống
          </h1>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-none text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          <RotateCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
          {refreshing ? 'Đang cập nhật...' : 'Làm mới số liệu'}
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-none border border-slate-200/80 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
              </div>

              <div className={`w-11 h-11 rounded-none bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-md ${stat.shadowColor}`}>
                <stat.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Bar Chart & Extra Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Biểu đồ Doanh Thu Dạng Cột (Bar Chart) */}
        {!isStaff && (
          <div className="lg:col-span-2 bg-white rounded-none border border-slate-200/80 p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />
                  Biểu đồ doanh thu
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {timeframe === '7days' && 'Thống kê doanh thu theo từng ngày trong 7 ngày qua'}
                  {timeframe === '30days' && 'Thống kê doanh thu theo từng ngày trong 30 ngày qua'}
                  {timeframe === '6months' && 'Thống kê doanh thu theo tháng (6 tháng gần nhất)'}
                  {timeframe === 'year' && 'Thống kê doanh thu theo tháng (Năm 2026)'}
                  {timeframe === 'custom' && `Doanh thu từ ${startDate} đến ${endDate}`}
                </p>
              </div>
              
              {/* Nút bấm chuyển đổi mốc thời gian */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-none border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTimeframe('7days')}
                    className={`px-2.5 py-1 rounded-none transition-all ${
                      timeframe === '7days'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    7 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('30days')}
                    className={`px-2.5 py-1 rounded-none transition-all ${
                      timeframe === '30days'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    30 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('6months')}
                    className={`px-2.5 py-1 rounded-none transition-all ${
                      timeframe === '6months'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    6 tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('year')}
                    className={`px-2.5 py-1 rounded-none transition-all ${
                      timeframe === 'year'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Năm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('custom')}
                    className={`px-2.5 py-1 rounded-none transition-all ${
                      timeframe === 'custom'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tùy chỉnh
                  </button>
                </div>
              </div>
            </div>

            {/* Khối Tùy chọn Ngày (Chỉ hiện khi chọn Tùy chỉnh) */}
            {timeframe === 'custom' && (
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Từ ngày:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      if (newStart && endDate) {
                        fetchData(false, 'custom', newStart, endDate);
                      }
                    }}
                    className="border border-slate-300 rounded-none px-2.5 py-1 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-600 shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Đến ngày:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setEndDate(newEnd);
                      if (startDate && newEnd) {
                        fetchData(false, 'custom', startDate, newEnd);
                      }
                    }}
                    className="border border-slate-300 rounded-none px-2.5 py-1 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-600 shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Recharts Bar Chart */}
            <div className="relative flex-1 min-h-[260px] pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats?.chartData || stats?.monthlyRevenue || []} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : `${(val / 1000).toFixed(0)}k`}
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderRadius: '0px', 
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 700 }}
                    formatter={(value: any) => [formatPrice(Number(value) || 0), 'Doanh thu']}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#4F46E5" 
                    radius={[2, 2, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Khối Thông số Thống kê Bổ sung (Additional KPIs) */}
        <div className="bg-white rounded-none border border-slate-200/80 p-6 shadow-sm flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              Chỉ số vận hành
            </h2>
            <p className="text-xs text-slate-400 font-medium">Hiệu suất hoạt động bán hàng tháng này</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 flex-1">
            {extraKpis.map((kpi) => (
              <div 
                key={kpi.title} 
                className="flex items-center gap-3.5 p-3 rounded-none border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all"
              >
                <div className={`p-2.5 rounded-none ${kpi.bgColor} shrink-0`}>
                  <kpi.icon size={18} className={kpi.iconColor} />
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</p>
                  <h4 className="text-base font-black text-slate-800 tracking-tight truncate">{kpi.val}</h4>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{kpi.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-none border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-800">Thao tác nhanh</h2>
          <p className="text-xs text-slate-400 font-medium">Lối tắt tác vụ quản trị hệ thống thường dùng</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`bg-gradient-to-r ${action.color} text-white rounded-none p-4 shadow-sm hover:shadow-md transition-all duration-300 group flex items-start gap-3.5 relative overflow-hidden`}
            >
              <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-10 group-hover:scale-110 transition-transform">
                <action.icon size={80} />
              </div>
              <div className="p-2 rounded-none bg-white/10 shrink-0">
                <action.icon size={18} className="text-white" />
              </div>
              <div className="flex-1 space-y-0.5">
                <h3 className="font-bold text-xs flex items-center gap-1">
                  {action.label}
                  <ArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-[10px] opacity-80 leading-normal font-medium">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Grid: Recent Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Products */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Sản phẩm mới thêm</h2>
              <p className="text-xs text-slate-400 font-medium">Các sản phẩm nội thất vừa tạo</p>
            </div>
            <Link
              to="/admin/products"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-none transition-all"
            >
              Tất cả <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white rounded-none border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80">
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs tracking-wider uppercase">SKU</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs tracking-wider uppercase">Tên sản phẩm</th>
                    <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs tracking-wider uppercase">Giá bán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-slate-400 font-medium">
                        Chưa có sản phẩm nào.
                      </td>
                    </tr>
                  ) : (
                    products.slice(0, 5).map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-400 font-bold">{p.sku || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer">{p.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 font-semibold">{p.category?.name || 'Chưa phân loại'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-indigo-600">
                          {formatPrice(p.base_price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Đơn hàng mới nhận</h2>
              <p className="text-xs text-slate-400 font-medium">Đơn đặt hàng khách hàng mua gần đây</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-none transition-all"
            >
              Tất cả <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white rounded-none border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80">
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs tracking-wider uppercase">Khách hàng</th>
                    <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs tracking-wider uppercase">Tổng tiền</th>
                    <th className="text-center px-5 py-3.5 font-bold text-slate-500 text-xs tracking-wider uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!stats || stats.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-slate-400 font-medium">
                        Chưa có đơn hàng nào gần đây.
                      </td>
                    </tr>
                  ) : (
                    stats.recentOrders.slice(0, 5).map((o) => (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-700">{o.user?.name || 'Khách vãng lai'}</div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{formatDate(o.created_at)}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-slate-800">
                          {formatPrice(o.total_amount)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <StatusBadge status={o.status} category="order" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
