import { useState, useEffect } from 'react';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { 
  Search, 
  User, 
  Shield, 
  Lock, 
  Unlock, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Calendar, 
  Mail, 
  Phone, 
  Users, 
  ShieldCheck, 
  UserX,
  X,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface UserEntity {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'customer';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface Meta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

interface CurrentAdmin {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function UserListPage() {
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [meta, setMeta] = useState<Meta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    customers: 0,
    locked: 0
  });

  // Current logged in admin info (to prevent self-locking)
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);

  // Detail Modal
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);
  
  // Loading state for toggle action
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

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

  // Fetch logged in admin profile
  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setCurrentAdmin(res.data);
    } catch {
      // silent fail
    }
  };

  // Fetch overall statistics by loading a wider set in the background
  const fetchOverallStats = async () => {
    try {
      const res = await api.get('/users/admin/list?limit=1000');
      const allUsers: UserEntity[] = res.data.data || [];
      const admins = allUsers.filter(u => u.role === 'admin').length;
      const customers = allUsers.filter(u => u.role === 'customer').length;
      const locked = allUsers.filter(u => u.status === 'inactive').length;
      
      setStats({
        total: allUsers.length,
        admins,
        customers,
        locked
      });
    } catch {
      // silent fail
    }
  };

  // Fetch paginated user list
  const fetchUsers = async (page: number = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
      };
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get('/users/admin/list', { params });
      
      let filteredData: UserEntity[] = res.data.data || [];
      
      // Perform client-side role and status filtering if active
      if (roleFilter !== 'all') {
        filteredData = filteredData.filter(u => u.role === roleFilter);
      }
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(u => u.status === statusFilter);
      }

      setUsers(filteredData);
      setMeta(res.data.meta || {
        totalItems: filteredData.length,
        itemCount: filteredData.length,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1
      });
    } catch {
      toast.error('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchOverallStats();
  }, []);

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter]);

  const handleToggleStatus = (user: UserEntity) => {
    if (currentAdmin && user.id === currentAdmin.id) {
      toast.error('Bạn không thể tự khóa tài khoản quản trị của chính mình!');
      return;
    }

    const actionText = user.status === 'active' ? 'khóa' : 'mở khóa';

    setConfirmModal({
      isOpen: true,
      title: `${user.status === 'active' ? 'Khóa' : 'Mở khóa'} tài khoản`,
      message: `Bạn có chắc chắn muốn ${actionText} tài khoản của ${user.name}?`,
      confirmText: user.status === 'active' ? 'Khóa' : 'Mở khóa',
      type: user.status === 'active' ? 'danger' : 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setToggleLoadingId(user.id);
        const newStatus = user.status === 'active' ? 'inactive' : 'active';

        try {
          await api.patch(`/users/admin/${user.id}/status`, { status: newStatus });
          toast.success(`Đã ${actionText} tài khoản thành công!`);
          
          // Refresh list and stats
          fetchUsers(meta.currentPage);
          fetchOverallStats();
          
          // Update selectedUser if it's currently open in modal
          if (selectedUser && selectedUser.id === user.id) {
            setSelectedUser({
              ...selectedUser,
              status: newStatus
            });
          }
        } catch (err) {
          const axiosError = err as AxiosError<{ message?: string }>;
          const errMsg = axiosError.response?.data?.message || 'Cập nhật trạng thái thất bại';
          toast.error(errMsg);
        } finally {
          setToggleLoadingId(null);
        }
      }
    });
  };

  const getAvatarStyle = (name: string) => {
    const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colors = [
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-blue-600 text-white',
      'bg-amber-600 text-white',
      'bg-rose-600 text-white',
      'bg-violet-600 text-white',
      'bg-teal-600 text-white',
    ];
    const colorIndex = charCodeSum % colors.length;
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    return { colorClass: colors[colorIndex], initials: initials || 'US' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Quản lý Tài khoản</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Phân quyền, kích hoạt và giám sát hoạt động của các thành viên</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng tài khoản</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 bg-slate-100 flex items-center justify-center text-slate-700 rounded-none border border-slate-200">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quản trị viên</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.admins}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 flex items-center justify-center text-indigo-600 rounded-none border border-indigo-100">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khách hàng</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.customers}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 flex items-center justify-center text-emerald-600 rounded-none border border-emerald-100">
            <User size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài khoản bị khóa</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.locked}</h3>
          </div>
          <div className="w-12 h-12 bg-rose-50 flex items-center justify-center text-rose-600 rounded-none border border-rose-100">
            <UserX size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between rounded-none shadow-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 focus:border-slate-900 outline-none transition-all rounded-none"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Vai trò</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 border border-slate-300 bg-white focus:border-slate-900 outline-none rounded-none cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="admin">Quản trị viên</option>
              <option value="customer">Khách hàng</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 border border-slate-300 bg-white focus:border-slate-900 outline-none rounded-none cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Đã khóa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm rounded-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-slate-800" />
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Đang tải danh sách tài khoản...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Thành viên</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Liên hệ</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Vai trò</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Trạng thái</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Ngày đăng ký</th>
                  <th className="text-center px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <UserX size={32} className="mx-auto mb-2 opacity-30" />
                      Không tìm thấy tài khoản nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const avatar = getAvatarStyle(u.name);
                    const isSelf = currentAdmin && u.id === currentAdmin.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Member column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-none flex items-center justify-center font-bold shadow-inner ${avatar.colorClass}`}>
                              {avatar.initials}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-800 block">{u.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold">ID: #{u.id} {isSelf && '(Bạn)'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact column */}
                        <td className="px-6 py-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <a href={`mailto:${u.email}`} className="hover:underline">{u.email}</a>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Phone size={12} className="text-slate-400 shrink-0" />
                              <a href={`tel:${u.phone}`} className="hover:underline">{u.phone}</a>
                            </div>
                          )}
                        </td>

                        {/* Role column */}
                        <td className="px-6 py-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Shield size={12} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <User size={12} />
                              Khách hàng
                            </span>
                          )}
                        </td>

                        {/* Status column */}
                        <td className="px-6 py-4">
                          {u.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-none bg-rose-500" />
                              Đã khóa
                            </span>
                          )}
                        </td>

                        {/* Created At column */}
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDate(u.created_at)}
                          </div>
                        </td>

                        {/* Actions column */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all rounded-none cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isSelf || toggleLoadingId === u.id}
                              className={`p-2 transition-all rounded-none cursor-pointer ${
                                isSelf 
                                  ? 'text-slate-300 cursor-not-allowed opacity-50' 
                                  : u.status === 'active'
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={
                                isSelf 
                                  ? 'Không thể tự khóa chính mình' 
                                  : u.status === 'active' 
                                    ? 'Khóa tài khoản' 
                                    : 'Mở khóa tài khoản'
                              }
                            >
                              {toggleLoadingId === u.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : u.status === 'active' ? (
                                <Lock size={16} />
                              ) : (
                                <Unlock size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && meta.totalPages > 1 && (
          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị {users.length} trên tổng số {meta.totalItems} tài khoản
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={meta.currentPage === 1}
                onClick={() => fetchUsers(meta.currentPage - 1)}
                className="p-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white rounded-none transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: meta.totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => fetchUsers(index + 1)}
                  className={`px-3.5 py-1.5 text-xs font-bold border transition-all rounded-none cursor-pointer ${
                    meta.currentPage === index + 1
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                disabled={meta.currentPage === meta.totalPages}
                onClick={() => fetchUsers(meta.currentPage + 1)}
                className="p-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white rounded-none transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-lg p-6 relative my-auto border border-slate-300 animate-fadeIn">
            {/* Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all rounded-none cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4 mb-6">
              <div className={`w-14 h-14 rounded-none flex items-center justify-center font-bold text-lg shadow-inner ${getAvatarStyle(selectedUser.name).colorClass}`}>
                {getAvatarStyle(selectedUser.name).initials}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{selectedUser.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {selectedUser.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      Khách hàng
                    </span>
                  )}
                  {selectedUser.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 text-sm text-slate-700">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">Mã tài khoản:</span>
                <span className="col-span-2 font-mono font-bold text-slate-900">#{selectedUser.id}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">Họ và tên:</span>
                <span className="col-span-2 font-extrabold text-slate-900">{selectedUser.name}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">Địa chỉ Email:</span>
                <span className="col-span-2 font-semibold text-slate-900 hover:underline">
                  <a href={`mailto:${selectedUser.email}`}>{selectedUser.email}</a>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">Số điện thoại:</span>
                <span className="col-span-2 font-semibold text-slate-900">
                  {selectedUser.phone ? (
                    <a href={`tel:${selectedUser.phone}`} className="hover:underline">{selectedUser.phone}</a>
                  ) : (
                    <span className="text-slate-400 italic">Chưa cập nhật</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">Ngày đăng ký:</span>
                <span className="col-span-2 font-medium text-slate-700">{formatDate(selectedUser.created_at)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">Cập nhật gần nhất:</span>
                <span className="col-span-2 font-medium text-slate-700">{formatDate(selectedUser.updated_at)}</span>
              </div>

              {/* Warning/Security Section */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2 mt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Ghi chú bảo mật & Quản lý
                </h4>
                <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-1 leading-relaxed">
                  <li>Khóa tài khoản sẽ chặn ngay lập tức quyền đăng nhập và mua sắm của người dùng này trên tất cả các thiết bị.</li>
                  <li>Mọi thông tin lịch sử đơn hàng của người dùng vẫn được bảo toàn trong hệ thống báo cáo.</li>
                  <li>Nếu có tranh chấp hoặc phát hiện hành vi gian lận, Admin nên thực hiện khóa tài khoản để điều tra trước.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-none transition-all cursor-pointer uppercase"
              >
                Đóng
              </button>
              
              {/* Conditional lock/unlock inside modal */}
              {currentAdmin && selectedUser.id !== currentAdmin.id && (
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`px-5 py-2.5 text-xs font-bold text-white rounded-none transition-all cursor-pointer uppercase flex items-center gap-1.5 ${
                    selectedUser.status === 'active'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10'
                  }`}
                >
                  {selectedUser.status === 'active' ? (
                    <>
                      <Lock size={12} />
                      Khóa tài khoản
                    </>
                  ) : (
                    <>
                      <Unlock size={12} />
                      Mở khóa tài khoản
                    </>
                  )}
                </button>
              )}
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
