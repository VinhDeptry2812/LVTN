import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { 
  Package, 
  FolderTree, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  ShoppingBag, 
  Clock, 
  DollarSign,
  TrendingDown,
  ArrowUpRight,
  ShoppingCart
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

interface DashboardStats {
  revenue: number;
  totalOrders: number;
  pendingOrders: number;
  recentOrders: RecentOrder[];
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, statsRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
          api.get('/orders/admin/stats'),
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
        setStats(statsRes.data);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-none bg-amber-500" />Chờ xử lý</span>;
      case 'confirmed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><span className="w-1.5 h-1.5 rounded-none bg-blue-500" />Xác nhận</span>;
      case 'shipping':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><span className="w-1.5 h-1.5 rounded-none bg-indigo-500" />Đang giao</span>;
      case 'delivered':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse" />Đã giao</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span className="w-1.5 h-1.5 rounded-none bg-rose-500" />Đã hủy</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const statCards = [
    {
      label: 'Tổng doanh thu',
      value: formatPrice(stats?.revenue || 0),
      trend: '+12.4%',
      trendUp: true,
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
      bgLight: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Tổng đơn hàng',
      value: stats?.totalOrders || 0,
      trend: '+8.2%',
      trendUp: true,
      icon: ShoppingCart,
      color: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/20',
      bgLight: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Đơn chờ xử lý',
      value: stats?.pendingOrders || 0,
      trend: '-1.5%',
      trendUp: false,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-amber-500/20',
      bgLight: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Tổng sản phẩm',
      value: products.length,
      trend: '+4 mới',
      trendUp: true,
      icon: Package,
      color: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-violet-500/20',
      bgLight: 'bg-violet-50 text-violet-600',
    },
  ];

  const quickActions = [
    {
      label: 'Thêm sản phẩm',
      desc: 'Tạo sản phẩm mới và tạo mô tả tự động bằng Gemini AI',
      icon: Plus,
      to: '/admin/products/create',
      color: 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25',
    },
    {
      label: 'Quản lý đơn hàng',
      desc: 'Xử lý và cập nhật trạng thái đơn hàng của khách hàng',
      icon: ShoppingBag,
      to: '/admin/orders',
      color: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25',
    },
    {
      label: 'AI Auto-Description',
      desc: 'Tự động tạo bài viết mô tả sản phẩm tinh tế chuẩn SEO',
      icon: Sparkles,
      to: '/admin/products/create',
      color: 'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/25',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-none animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang tải dữ liệu tổng quan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-none p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 rounded-none bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-none bg-emerald-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 rounded-none px-3 py-1 text-xs text-indigo-300 font-semibold shadow-inner">
            <Sparkles size={12} className="text-amber-400" />
            Nội thất Moho Admin Portal v2.0
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Xin chào, Admin 👋</h1>
          <p className="text-slate-300 text-sm font-medium leading-relaxed">
            Hôm nay hệ thống đang vận hành rất tốt. Chúc bạn có một ngày làm việc hiệu quả và quản lý cửa hàng thật thuận lợi!
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-none border border-slate-200/60 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                
                {/* Trend indicator */}
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-none text-[10px] font-bold ${
                    stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {stat.trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {stat.trend}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">so với tháng trước</span>
                </div>
              </div>

              <div className={`w-12 h-12 rounded-none bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg ${stat.shadowColor}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend Visual Representation & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-none border border-slate-200/60 p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Biểu đồ doanh thu</h2>
              <p className="text-xs text-slate-400 font-medium">Xu hướng doanh thu các tháng gần đây</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-none flex items-center gap-1">
              Năm 2026 <ArrowUpRight size={12} />
            </span>
          </div>

          {/* SVG Line Chart mockup using Tailwind for premium look */}
          <div className="relative flex-1 min-h-[220px] flex flex-col justify-between pt-4">
            
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-6 pointer-events-none opacity-50">
              <div className="border-b border-slate-100 w-full" />
              <div className="border-b border-slate-100 w-full" />
              <div className="border-b border-slate-100 w-full" />
              <div className="border-b border-slate-100 w-full" />
            </div>

            {/* SVG Visual path */}
            <div className="relative w-full h-[180px] mt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area under line */}
                <path 
                  d="M 0,120 C 60,110 120,70 180,80 C 240,90 300,40 360,50 C 420,60 480,20 540,15 L 540,150 L 0,150 Z" 
                  fill="url(#chartGradient)"
                />
                {/* Main line */}
                <path 
                  d="M 0,120 C 60,110 120,70 180,80 C 240,90 300,40 360,50 C 420,60 480,20 540,15" 
                  fill="none" 
                  stroke="#4f46e5" 
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Dots on points */}
                <circle cx="0" cy="120" r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="120" cy="70" r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="240" cy="90" r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="360" cy="50" r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="480" cy="20" r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="540" cy="15" r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
              </svg>
            </div>

            {/* X-Axis labels */}
            <div className="flex justify-between text-[11px] font-bold text-slate-400 pt-2 px-1">
              <span>Tháng 1</span>
              <span>Tháng 2</span>
              <span>Tháng 3</span>
              <span>Tháng 4</span>
              <span>Tháng 5</span>
              <span>Tháng 6</span>
            </div>
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="bg-white rounded-none border border-slate-200/60 p-6 shadow-sm flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-800">Thao tác nhanh</h2>
            <p className="text-xs text-slate-400 font-medium">Lối tắt tác vụ hành chính nhanh chóng</p>
          </div>
          <div className="flex-1 flex flex-col justify-between gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={`bg-gradient-to-r ${action.color} text-white rounded-none p-4.5 shadow-md hover:shadow-lg transition-all duration-300 group flex items-start gap-4 relative overflow-hidden`}
              >
                <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-10 group-hover:scale-110 transition-transform">
                  <action.icon size={96} />
                </div>
                <div className="p-2 rounded-none bg-white/10 shrink-0">
                  <action.icon size={20} className="text-white" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <h3 className="font-bold text-sm flex items-center gap-1">
                    {action.label}
                    <ArrowRight size={13} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-[11px] opacity-80 leading-normal font-medium">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
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

          <div className="bg-white rounded-none border border-slate-200/60 shadow-sm overflow-hidden">
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

          <div className="bg-white rounded-none border border-slate-200/60 shadow-sm overflow-hidden">
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
                          {getStatusBadge(o.status)}
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
