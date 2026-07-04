import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { 
  Package, 
  FolderTree, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  ImageUp, 
  Sparkles, 
  ShoppingBag, 
  Clock, 
  DollarSign 
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
        return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Chờ xử lý</span>;
      case 'confirmed':
        return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Xác nhận</span>;
      case 'shipping':
        return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Đang giao</span>;
      case 'delivered':
        return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Đã giao</span>;
      case 'cancelled':
        return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">Đã hủy</span>;
      default:
        return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const statCards = [
    {
      label: 'Tổng doanh thu',
      value: formatPrice(stats?.revenue || 0),
      icon: DollarSign,
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Tổng đơn hàng',
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Đơn chờ xử lý',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      label: 'Sản phẩm',
      value: products.length,
      icon: Package,
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  const quickActions = [
    {
      label: 'Thêm sản phẩm',
      desc: 'Tạo sản phẩm mới với AI mô tả tự động',
      icon: Plus,
      to: '/admin/products/create',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      label: 'Quản lý đơn hàng',
      desc: 'Xử lý các đơn hàng mới đặt từ khách hàng',
      icon: ShoppingBag,
      to: '/admin/orders',
      color: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      label: 'AI Auto-Description',
      desc: 'Tự động sinh mô tả bằng Gemini AI',
      icon: Sparkles,
      to: '/admin/products/create',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Xin chào, Admin 👋</h1>
        <p className="text-slate-500 mt-1">Tổng quan hệ thống quản lý cửa hàng nội thất và đơn hàng.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bgLight} flex items-center justify-center`}>
                <stat.icon size={22} className={stat.textColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`${action.color} text-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all group`}
            >
              <action.icon size={24} className="mb-3 opacity-80" />
              <h3 className="font-semibold text-base">{action.label}</h3>
              <p className="text-sm opacity-80 mt-1">{action.desc}</p>
              <ArrowRight
                size={16}
                className="mt-3 opacity-60 group-hover:translate-x-1 transition-transform"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Grid: Recent Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Products */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Sản phẩm gần đây</h2>
            <Link
              to="/admin/products"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">SKU</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tên</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Giá bán</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400">
                        Chưa có sản phẩm nào.
                      </td>
                    </tr>
                  ) : (
                    products.slice(0, 5).map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">
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
            <h2 className="text-lg font-semibold text-slate-700">Đơn hàng mới</h2>
            <Link
              to="/admin/orders"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Khách hàng</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Tổng tiền</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {!stats || stats.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400">
                        Chưa có đơn hàng nào.
                      </td>
                    </tr>
                  ) : (
                    stats.recentOrders.slice(0, 5).map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{o.user?.name || 'Ẩn danh'}</div>
                          <div className="text-xs text-slate-400">{formatDate(o.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatPrice(o.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
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
