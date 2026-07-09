import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  LogOut,
  ShoppingBag,
  Layers,
  Bell,
  Search,
  Menu,
  ChevronLeft,
  User,
  ExternalLink,
  Settings,
  ChevronRight,
  Globe,
  Ticket
} from 'lucide-react';

interface NavLinkItem {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
}

interface NavGroup {
  title: string;
  links: NavLinkItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'HỆ THỐNG',
    links: [
      { to: '/admin', icon: LayoutDashboard, label: 'Bảng tổng quan', end: true },
      { to: '/admin/users', icon: User, label: 'Tài khoản' },
    ]
  },
  {
    title: 'QUẢN LÝ CỬA HÀNG',
    links: [
      { to: '/admin/products', icon: Package, label: 'Sản phẩm' },
      { to: '/admin/categories', icon: FolderTree, label: 'Danh mục' },
      { to: '/admin/collections', icon: Layers, label: 'Bộ sưu tập' },
      { to: '/admin/orders', icon: ShoppingBag, label: 'Đơn hàng' },
      { to: '/admin/vouchers', icon: Ticket, label: 'Mã giảm giá' },
    ]
  }
];

const mockNotifications = [
  { id: 1, text: 'Đơn hàng mới #1024 vừa được đặt thành công', time: '5 phút trước', read: false },
  { id: 2, text: 'Sản phẩm Sofa Gỗ Sồi sắp hết hàng (còn 2)', time: '30 phút trước', read: false },
  { id: 3, text: 'Khách hàng Nguyễn Văn A đăng ký tài khoản mới', time: '2 giờ trước', read: true },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notiRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setIsNotiOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Generate breadcrumbs based on location
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/admin')}>Admin</span>
        {paths.slice(1).map((path, idx) => {
          const isLast = idx === paths.length - 2;
          const labelMap: Record<string, string> = {
            products: 'Sản phẩm',
            categories: 'Danh mục',
            collections: 'Bộ sưu tập',
            orders: 'Đơn hàng',
            vouchers: 'Mã giảm giá',
            users: 'Tài khoản',
            create: 'Thêm mới',
            edit: 'Chỉnh sửa'
          };
          const displayLabel = labelMap[path] || path;

          return (
            <div key={path} className="flex items-center gap-1.5">
              <ChevronRight size={12} className="text-slate-300" />
              <span className={isLast ? 'text-slate-600 font-semibold' : 'hover:text-slate-600 cursor-pointer'}>
                {displayLabel}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside
        className={`bg-slate-900 text-white flex flex-col shadow-xl transition-all duration-300 z-20 ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 animate-fadeIn">
              <span className="text-2xl">🛋️</span>
              <div>
                <h1 className="text-base font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">NỘI THẤT</h1>
                <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Quản trị hệ thống</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <span className="text-2xl mx-auto">🛋️</span>
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-none text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Sidebar Profile Card */}
        {!isCollapsed && (
          <div className="p-4 mx-3 my-4 bg-slate-800/50 rounded-none border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-100">Quản trị viên</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-slate-400 font-medium">Trực tuyến</span>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Menu */}
        <nav className="flex-1 py-3 px-3 space-y-6 overflow-y-auto">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-none text-sm font-medium transition-all duration-200 group ${isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                      }`
                    }
                  >
                    <link.icon size={18} className="shrink-0 transition-transform group-hover:scale-105" />
                    {!isCollapsed && <span className="truncate">{link.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800">
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex items-center justify-center p-3 w-full rounded-none text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              title="Mở rộng menu"
            >
              <Menu size={18} />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-none text-sm font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all duration-200 cursor-pointer"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-sm z-10">

          {/* Left: Collapse toggle & Breadcrumbs */}
          <div className="flex items-center gap-4">
            {isCollapsed && (
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 rounded-none text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="hidden sm:block">
              {getBreadcrumbs()}
            </div>
          </div>

          {/* Right: Quick actions, notifications, profile */}
          <div className="flex items-center gap-4">


            {/* Visit Shop Link */}
            <a
              href="http://localhost:5173" // Default client URL
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-semibold px-3 py-1.5 rounded-none hover:bg-slate-50 transition-colors"
            >
              <Globe size={14} />
              <span className="hidden sm:inline">Xem Cửa Hàng</span>
            </a>

            {/* Divider */}
            <div className="h-5 w-[1px] bg-slate-200" />

            {/* Notifications Dropdown */}
            <div className="relative" ref={notiRef}>
              <button
                onClick={() => setIsNotiOpen(!isNotiOpen)}
                className={`p-2 rounded-none transition-all relative ${isNotiOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-none bg-rose-500 ring-2 ring-white animate-pulse" />
              </button>

              {isNotiOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-none shadow-xl border border-slate-200/80 py-2 z-50 animate-slideUp">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">Thông báo mới</span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-none">3 tin mới</span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {mockNotifications.map((noti) => (
                      <div
                        key={noti.id}
                        className={`p-4 hover:bg-slate-50/50 transition-colors cursor-pointer ${!noti.read ? 'bg-indigo-50/20' : ''
                          }`}
                      >
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{noti.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">{noti.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 text-center">
                    <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                      Xem tất cả thông báo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 p-1 rounded-none hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-none bg-indigo-600 font-bold text-white flex items-center justify-center text-xs shadow">
                  AD
                </div>
                <div className="hidden lg:block text-left pr-2">
                  <p className="text-xs font-bold text-slate-700">Admin Moho</p>
                  <p className="text-[10px] font-semibold text-slate-400">Quản trị viên</p>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-none shadow-xl border border-slate-200/80 py-1.5 z-50 animate-slideUp">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">Admin Moho</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">admin@moho.vn</p>
                  </div>
                  <div className="py-1">
                    <a
                      href="http://localhost:5173"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors"
                    >
                      <ExternalLink size={14} />
                      Xem Cửa hàng
                    </a>
                    <button
                      onClick={() => navigate('/admin')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors text-left"
                    >
                      <Settings size={14} />
                      Cài đặt hệ thống
                    </button>
                  </div>
                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-bold transition-colors text-left"
                    >
                      <LogOut size={14} />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-50/70 p-6 md:p-8">
          <div className="max-w-full mx-auto animate-fadeIn">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
