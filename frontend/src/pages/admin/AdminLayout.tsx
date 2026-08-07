import { useState, useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  LogOut,
  ShoppingBag,
  Layers,
  Bell,
  Menu,
  ChevronLeft,
  User,
  ExternalLink,
  Settings,
  ChevronRight,
  Globe,
  Ticket,
  Loader2,
  Star,
  ChevronDown,
  Database,
  ShieldCheck,
  Users,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'customer';
}

interface NavLinkItem {
  to?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  end?: boolean;
  subLinks?: { to: string; label: string; icon?: ComponentType<{ size?: number; className?: string }> }[];
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
      { to: '/admin/users', icon: ShieldCheck, label: 'Tài khoản quản trị' },
      { to: '/admin/customers', icon: Users, label: 'Tài khoản khách hàng' },
    ]
  },
  {
    title: 'QUẢN LÝ CỬA HÀNG',
    links: [
      { to: '/admin/products', icon: Package, label: 'Sản phẩm' },
      {
        icon: Database,
        label: 'Quản lý kho',
        subLinks: [
          { to: '/admin/inventory', label: 'Tồn kho' },
          { to: '/admin/suppliers', label: 'Nhà cung cấp' },
          { to: '/admin/purchase-orders', label: 'Đơn nhập hàng' },
          { to: '/admin/inventory-audits', label: 'Kiểm kê định kỳ' },
          { to: '/admin/stock-issues', label: 'Xuất kho' },
        ]
      },
      { to: '/admin/categories', icon: FolderTree, label: 'Danh mục' },
      { to: '/admin/collections', icon: Layers, label: 'Bộ sưu tập' },
      { to: '/admin/banners', icon: ImageIcon, label: 'Quản lý Banner' },
      { to: '/admin/posts', icon: FileText, label: 'Quản lý Bài viết' },
      {
        icon: ShoppingBag,
        label: 'Quản lý đơn hàng',
        subLinks: [
          { to: '/admin/orders', label: 'Đơn hàng' },
          { to: '/admin/returns', label: 'Đổi trả hàng lỗi' },
          { to: '/admin/warranties', label: 'Quản lý bảo hành' },
        ]
      },
      { to: '/admin/vouchers', icon: Ticket, label: 'Mã giảm giá' },
      { to: '/admin/promotions', icon: Layers, label: 'Chương trình khuyến mãi' },
      { to: '/admin/reviews', icon: Star, label: 'Đánh giá sản phẩm' },
    ]
  }
];

interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_link?: string;
  created_at: string;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      const notiData = Array.isArray(listRes.data)
        ? listRes.data
        : (listRes.data?.data || []);
      setNotifications(notiData);
      setUnreadCount(typeof countRes.data === 'number' ? countRes.data : countRes.data?.count || (typeof countRes.data === 'string' ? parseInt(countRes.data, 10) : 0));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetchNotifications();

    // Kết nối Realtime SSE Stream từ Backend (Hỗ trợ cả môi trường Dev và Production đã deploy)
    const baseUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
      : '/api';
    const sseUrl = `${baseUrl}/notifications/stream`;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload || payload.type === 'ping') return;

          // Thêm vào danh sách thông báo và tăng số chưa đọc
          setNotifications((prev) => [payload, ...prev]);
          setUnreadCount((prev) => prev + 1);
        } catch (err) {
          console.error('Lỗi xử lý tin nhắn SSE:', err);
        }
      };

      eventSource.onerror = () => {
        // Tự động Reconnect của EventSource hoặc giữ im lặng nếu proxy production tự ngắt
      };
    } catch (err) {
      console.error('Lỗi kết nối SSE Stream:', err);
    }

    // Cơ chế Polling dự phòng 30s/lần để đảm bảo thông báo luôn cập nhật kể cả khi SSE bị ngắt kết nối
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
    };
  }, []);

  const handleNotificationClick = async (noti: SystemNotification) => {
    if (!noti.is_read) {
      try {
        await api.patch(`/notifications/${noti.id}/read`);
        setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Lỗi khi đánh dấu đã đọc:', err);
      }
    }
    setIsNotiOpen(false);
    if (noti.reference_link) {
      navigate(noti.reference_link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu đọc tất cả thông báo');
    } catch (err) {
      console.error('Lỗi khi đánh dấu đọc tất cả:', err);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';

    let isoStr = String(dateStr).trim();
    if (!isoStr.includes('Z') && !isoStr.includes('+')) {
      isoStr = isoStr.replace(' ', 'T') + 'Z';
    }

    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';

    const now = new Date();

    // Bù trừ 7 tiếng (25200 giây) chênh lệch múi giờ từ PostgreSQL driver
    let diffSec = Math.floor((now.getTime() - date.getTime()) / 1000) - 25200;

    if (diffSec < 0) diffSec = 0;

    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;

    const diffDays = Math.floor(diffSec / 86400);
    if (diffDays < 30) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN');
  };

  useEffect(() => {
    const initialOpenState: Record<string, boolean> = {};
    navigationGroups.forEach(group => {
      group.links.forEach(link => {
        if (link.subLinks && link.subLinks.some(sub => {
          return sub.to === '/admin/inventory'
            ? location.pathname === '/admin/inventory'
            : location.pathname.startsWith(sub.to);
        })) {
          initialOpenState[link.label] = true;
        }
      });
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenSubMenus(prev => ({ ...prev, ...initialOpenState }));
  }, [location.pathname]);

  const notiRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/profile');
        const user = response.data;
        
        // Chỉ cho phép admin và staff truy cập trang quản trị
        if (user.role !== 'admin' && user.role !== 'staff') {
          toast.error('Bạn không có quyền truy cập trang quản trị!');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          navigate('/login', { replace: true });
          return;
        }

        setProfile(user);
      } catch (error) {
        console.error('Error fetching profile:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        navigate('/login', { replace: true });
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Chặn nhân viên truy cập các trang quản trị không có thẩm quyền và tự động đẩy về /admin/orders
  useEffect(() => {
    if (profile && profile.role === 'staff') {
      const restrictedRoutes = [
        '/admin/users',
        '/admin/customers',
        '/admin/banners',
        '/admin/vouchers',
        '/admin/promotions',
        '/admin/settings'
      ];
      
      const isDashboardRoot = location.pathname === '/admin' || location.pathname === '/admin/';
      const isRestricted = restrictedRoutes.some(route => location.pathname.startsWith(route));

      if (isDashboardRoot || isRestricted) {
        if (isRestricted) {
          toast.error('Bạn không có quyền truy cập trang này!');
        }
        navigate('/admin/orders', { replace: true });
      }
    }
  }, [profile, location.pathname, navigate]);

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
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  // Generate breadcrumbs based on location
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const defaultHome = profile?.role === 'staff' ? '/admin/orders' : '/admin';
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate(defaultHome)}>Admin</span>
        {paths.slice(1).map((path, idx) => {
          const isLast = idx === paths.length - 2;
          const labelMap: Record<string, string> = {
            products: 'Sản phẩm',
            inventory: 'Tồn kho',
            suppliers: 'Nhà cung cấp',
            'purchase-orders': 'Đơn nhập hàng',
            'inventory-audits': 'Kiểm kê định kỳ',
            'stock-issues': 'Xuất kho',
            categories: 'Danh mục',
            collections: 'Bộ sưu tập',
            banners: 'Quản lý Banner',
            orders: 'Đơn hàng',
            returns: 'Đổi trả hàng lỗi',
            warranties: 'Quản lý bảo hành',
            vouchers: 'Mã giảm giá',
            users: 'Tài khoản',
            reviews: 'Đánh giá',
            settings: 'Cài đặt hệ thống',
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

  const getDisplayName = (user?: UserProfile | null) => {
    if (!user) return 'Tài khoản Quản trị';
    if (user.name && user.name.trim()) return user.name.trim();
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Quản trị viên';
  };

  const getInitials = (user?: UserProfile | null) => {
    const displayName = getDisplayName(user);
    if (!displayName) return 'AD';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'admin') return 'Quản trị viên';
    if (role === 'staff') return 'Nhân viên';
    return 'Thành viên';
  };

  const clientUrl = import.meta.env.VITE_CLIENT_URL || 
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `${window.location.protocol}//${window.location.hostname.replace('admin.', '').replace('-admin', '')}`
      : 'http://localhost:5173');

  const getFilteredNavigationGroups = () => {
    if (!profile) return [];
    return navigationGroups.map(group => {
      const filteredLinks = group.links.filter(link => {
        if (profile.role === 'staff') {
          const hiddenRoutes = [
            '/admin',
            '/admin/users',
            '/admin/customers',
            '/admin/banners',
            '/admin/vouchers',
            '/admin/promotions'
          ];
          if (link.to && hiddenRoutes.includes(link.to)) {
            return false;
          }
        }
        return true;
      });
      return { ...group, links: filteredLinks };
    }).filter(group => group.links.length > 0);
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
          <span className="text-sm font-semibold tracking-wider text-slate-300">Đang tải cấu hình quyền...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside
        className={`bg-slate-900 text-white flex flex-col transition-all duration-300 z-20 overflow-hidden ${
          isCollapsed ? 'w-16 shadow-none' : 'w-64 shadow-xl'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center border-b border-slate-800 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <>
              <div
                className="flex items-center gap-2.5 animate-fadeIn cursor-pointer"
                onClick={() => navigate(profile?.role === 'staff' ? '/admin/orders' : '/admin')}
              >
                <img src="/logo.png" alt="Logo Nội Thất" className="w-8 h-8 object-contain rounded-md bg-white/10 p-1 shadow-sm" />
                <div>
                  <h1 className="text-base font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">NỘI THẤT</h1>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Quản trị hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-none text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Thu gọn menu"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-none text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Mở rộng menu"
            >
              <img src="/logo.png" alt="Logo Nội Thất" className="w-7 h-7 object-contain rounded-md bg-white/10 p-1 shadow-sm" />
            </button>
          )}
        </div>

        {/* Sidebar Profile Card */}
        <div className={`my-3 px-2 ${isCollapsed ? 'flex justify-center' : 'mx-3'}`}>
          {!isCollapsed ? (
            <div className="p-3 bg-slate-800/60 rounded-none border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-none bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner text-xs shrink-0">
                {getInitials(profile)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-slate-100">{getDisplayName(profile)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {getRoleLabel(profile?.role)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-none bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-inner cursor-pointer"
              title={`${getDisplayName(profile)} (${getRoleLabel(profile?.role)})`}
            >
              {getInitials(profile)}
            </div>
          )}
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 py-2 px-2 space-y-5 overflow-y-auto no-scrollbar">
          {getFilteredNavigationGroups().map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed ? (
                <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                  {group.title}
                </h3>
              ) : (
                <div className="h-[1px] bg-slate-800/80 my-2 mx-2" />
              )}
              <div className="space-y-1">
                {group.links.map((link) => {
                  const LinkIcon = link.icon;
                  if (link.subLinks) {
                    const isSubOpen = openSubMenus[link.label] || false;
                    const hasActiveSub = link.subLinks.some(sub => {
                      return sub.to === '/admin/inventory'
                        ? location.pathname === '/admin/inventory'
                        : location.pathname.startsWith(sub.to);
                    });

                    return (
                      <div key={link.label} className="space-y-1">
                        <button
                          onClick={() => {
                            if (isCollapsed) {
                              setIsCollapsed(false);
                            }
                            setOpenSubMenus(prev => ({
                              ...prev,
                              [link.label]: !prev[link.label]
                            }));
                          }}
                          title={isCollapsed ? link.label : undefined}
                          className={`flex items-center w-full rounded-none text-xs font-semibold transition-all duration-200 group cursor-pointer ${
                            isCollapsed
                              ? 'justify-center p-2.5'
                              : 'justify-between px-3 py-2.5'
                          } ${
                            hasActiveSub
                              ? 'bg-slate-800 text-indigo-400 font-bold border-l-2 border-indigo-500'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          }`}
                        >
                          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                            <LinkIcon size={18} className={`shrink-0 ${hasActiveSub ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`} />
                            {!isCollapsed && <span className="truncate">{link.label}</span>}
                          </div>
                          {!isCollapsed && (
                            isSubOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                          )}
                        </button>

                        {/* SubLinks */}
                        {!isCollapsed && isSubOpen && (
                          <div className="space-y-1 mt-1 ml-4 pl-3 border-l border-slate-800">
                            {link.subLinks.map((sub) => {
                              const isSubActive = sub.to === '/admin/inventory'
                                ? location.pathname === '/admin/inventory'
                                : location.pathname.startsWith(sub.to);
                              return (
                                <NavLink
                                  key={sub.to}
                                  to={sub.to}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-none text-xs font-medium transition-all duration-200 w-full text-left cursor-pointer group ${
                                    isSubActive
                                      ? 'text-indigo-400 bg-indigo-500/10 font-bold border-l-2 border-indigo-400 -ml-[13px] pl-[11px]'
                                      : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
                                  }`}
                                >
                                  <span className="truncate">{sub.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={link.to}
                      to={link.to!}
                      end={link.end}
                      title={isCollapsed ? link.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center rounded-none text-xs font-semibold transition-all duration-200 group ${
                          isCollapsed
                            ? 'justify-center p-2.5'
                            : 'gap-3 px-3 py-2.5'
                        } ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <LinkIcon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                          {!isCollapsed && <span className="truncate">{link.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-slate-800">
          {isCollapsed ? (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 w-full rounded-none text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-none text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all duration-200 cursor-pointer"
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
              href={clientUrl}
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
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                )}
              </button>

              {isNotiOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-none shadow-xl border border-slate-200/80 py-2 z-50 animate-slideUp">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">Thông báo mới</span>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-none">
                        {unreadCount} chưa đọc
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-none">
                        Đã đọc hết
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Chưa có thông báo nào
                      </div>
                    ) : (
                      notifications.map((noti) => (
                        <div
                          key={noti.id}
                          onClick={() => handleNotificationClick(noti)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                            !noti.is_read ? 'bg-indigo-50/30 font-medium' : 'opacity-80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-800 truncate">{noti.title}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(noti.created_at)}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{noti.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && unreadCount > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100 text-center">
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                    </div>
                  )}
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
                  {getInitials(profile)}
                </div>
                <div className="hidden lg:block text-left pr-2">
                  <p className="text-xs font-bold text-slate-700">{getDisplayName(profile)}</p>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {getRoleLabel(profile?.role)}
                  </p>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-none shadow-xl border border-slate-200/80 py-1.5 z-50 animate-slideUp">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{getDisplayName(profile)}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{profile?.email || 'N/A'}</p>
                  </div>
                  <div className="py-1">
                    <a
                      href={clientUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors"
                    >
                      <ExternalLink size={14} />
                      Xem Cửa hàng
                    </a>
                    {profile?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate('/admin/settings');
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium transition-colors text-left cursor-pointer"
                      >
                        <Settings size={14} />
                        Cài đặt hệ thống
                      </button>
                    )}
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
            <Outlet context={{ profile }} />
          </div>
        </main>

      </div>
    </div>
  );
}
