import { useState, useEffect } from 'react';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { AxiosError } from 'axios';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';
import StatCard from '@/components/StatCard';
import toast from 'react-hot-toast';
import {
  Search,
  UserPlus,
  ShieldCheck,
  Lock,
  Unlock,
  Loader2,
  Calendar,
  Mail,
  Phone,
  UserX,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  Check
} from 'lucide-react';

interface UserEntity {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'staff' | 'customer';
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
    staffs: 0,
    locked: 0
  });

  // Current logged in admin info (to prevent self-locking)
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);

  // Detail Modal
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff' as 'admin' | 'staff'
  });

  // Loading state for toggle action
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  // Fetch logged in admin profile
  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setCurrentAdmin(res.data);
    } catch {
      // silent fail
    }
  };

  // Fetch overall statistics for Admin/Staff only
  const fetchOverallStats = async () => {
    try {
      const res = await api.get('/users/admin/list', {
        params: { role: 'admin,staff', limit: 1000 }
      });
      const adminStaffUsers: UserEntity[] = res.data.data || [];
      const admins = adminStaffUsers.filter(u => u.role === 'admin').length;
      const staffs = adminStaffUsers.filter(u => u.role === 'staff').length;
      const locked = adminStaffUsers.filter(u => u.status === 'inactive').length;

      setStats({
        total: adminStaffUsers.length,
        admins,
        staffs,
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
        role: roleFilter === 'all' ? 'admin,staff' : roleFilter,
      };
      if (search.trim()) {
        params.search = search.trim();
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await api.get('/users/admin/list', { params });

      const rawData: UserEntity[] = res.data.data || [];
      // Safety filter: Đảm bảo trang Quản trị tuyệt đối không hiển thị tài khoản khách hàng
      const data = rawData.filter((u: UserEntity) => u.role === 'admin' || u.role === 'staff');

      setUsers(data);
      setMeta(res.data.meta || {
        totalItems: data.length,
        itemCount: data.length,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1
      });
    } catch {
      toast.error('Không thể tải danh sách tài khoản quản trị');
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name.trim()) {
      toast.error('Vui lòng nhập họ và tên');
      return;
    }
    if (!createForm.email.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.error('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }

    setCreateSubmitting(true);
    try {
      await api.post('/users/admin/create', createForm);
      toast.success(`Đã tạo tài khoản ${createForm.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'} thành công!`);

      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'staff'
      });

      fetchUsers(1);
      fetchOverallStats();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const errMsg = axiosError.response?.data?.message || 'Tạo tài khoản thất bại';
      toast.error(errMsg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleStatus = (user: UserEntity) => {
    if (currentAdmin && user.id === currentAdmin.id) {
      toast.error('Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }

    const actionText = user.status === 'active' ? 'khóa' : 'mở khóa';

    openConfirm({
      title: `${user.status === 'active' ? 'Khóa' : 'Mở khóa'} tài khoản`,
      message: `Bạn có chắc chắn muốn ${actionText} tài khoản của ${user.name}?`,
      confirmText: user.status === 'active' ? 'Khóa' : 'Mở khóa',
      type: user.status === 'active' ? 'danger' : 'warning',
      onConfirm: async () => {
        closeConfirm();
        setToggleLoadingId(user.id);
        const newStatus = user.status === 'active' ? 'inactive' : 'active';

        try {
          await api.patch(`/users/admin/${user.id}/status`, { status: newStatus });
          toast.success(`Đã ${actionText} tài khoản thành công!`);

          fetchUsers(meta.currentPage);
          fetchOverallStats();

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

  const handleChangeRole = (user: UserEntity, newRole: string) => {
    if (currentAdmin && user.id === currentAdmin.id) {
      toast.error('Bạn không thể tự thay đổi vai trò của chính mình!');
      return;
    }

    const roleName = newRole === 'admin' ? 'Quản trị viên' : 'Nhân viên';

    openConfirm({
      title: 'Thay đổi vai trò tài khoản',
      message: `Bạn có chắc chắn muốn thay đổi vai trò của ${user.name} thành "${roleName}"?`,
      confirmText: 'Xác nhận',
      type: 'warning',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.patch(`/users/admin/${user.id}/role`, { role: newRole });
          toast.success(`Đã thay đổi vai trò thành ${roleName}!`);

          fetchUsers(meta.currentPage);
          fetchOverallStats();

          if (selectedUser && selectedUser.id === user.id) {
            setSelectedUser({
              ...selectedUser,
              role: newRole as 'admin' | 'staff'
            });
          }
        } catch (err) {
          const axiosError = err as AxiosError<{ message?: string }>;
          const errMsg = axiosError.response?.data?.message || 'Cập nhật vai trò thất bại';
          toast.error(errMsg);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Quản lý tài khoản quản trị"
        subtitle="Tạo tài khoản mới, phân quyền Admin/Nhân viên và quản lý trạng thái tài khoản nội bộ"
        icon={ShieldCheck}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus size={16} /> Tạo tài khoản mới
          </button>
        }
      />

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Tổng nhân sự"
          value={stats.total}
          icon={ShieldCheck}
          iconColorClass="text-indigo-600"
          iconBgClass="bg-indigo-50"
        />
        <StatCard
          title="Quản trị viên (Admin)"
          value={stats.admins}
          icon={Shield}
          iconColorClass="text-purple-600"
          iconBgClass="bg-purple-50"
        />
        <StatCard
          title="Nhân viên (Staff)"
          value={stats.staffs}
          icon={User}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-50"
        />
        <StatCard
          title="Tài khoản bị khóa"
          value={stats.locked}
          icon={UserX}
          iconColorClass="text-rose-600"
          iconBgClass="bg-rose-50"
        />
      </div>

      {/* Bộ lọc và Tìm kiếm */}
      <div className="bg-white p-4 rounded-none border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm tên, email hoặc SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white text-slate-700 font-medium"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="staff">Nhân viên (Staff)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white text-slate-700 font-medium"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Đã bị khóa</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách tài khoản */}
      <div className="bg-white rounded-none border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Nhân sự</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <TableLoader />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                    Không tìm thấy tài khoản quản trị / nhân viên nào.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                        {u.name ? u.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <span>{u.name}</span>
                        {currentAdmin && u.id === currentAdmin.id && (
                          <span className="ml-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm">
                            (Bạn)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u, e.target.value)}
                        disabled={currentAdmin?.id === u.id}
                        className={`text-xs font-semibold px-2 py-1 border focus:outline-none transition-colors ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        } ${currentAdmin?.id === u.id ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="admin">Quản trị viên (Admin)</option>
                        <option value="staff">Nhân viên (Staff)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle size={12} /> Đã bị khóa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={toggleLoadingId === u.id || (currentAdmin?.id === u.id)}
                        className={`p-1.5 border transition-colors ${
                          currentAdmin?.id === u.id
                            ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                            : u.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50 border-slate-200 hover:border-amber-200'
                            : 'text-emerald-600 hover:bg-emerald-50 border-slate-200 hover:border-emerald-200'
                        }`}
                        title={
                          currentAdmin?.id === u.id
                            ? 'Không thể tự khóa chính mình'
                            : u.status === 'active'
                            ? 'Khóa tài khoản'
                            : 'Mở khóa tài khoản'
                        }
                      >
                        {u.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {!loading && meta.totalItems > meta.itemsPerPage && (
          <div className="p-4 border-t border-slate-200">
            <AdminPagination
              currentPage={meta.currentPage}
              totalItems={meta.totalItems}
              pageSize={meta.itemsPerPage}
              onPageChange={(page) => fetchUsers(page)}
            />
          </div>
        )}
      </div>

      {/* Modal Tạo tài khoản mới */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md shadow-xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-600" /> Tạo tài khoản quản trị / nhân viên
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Quản Trị"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@duan.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu khởi tạo *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập ít nhất 6 ký tự..."
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0987654321"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vai trò hệ thống *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'admin' | 'staff' })}
                  className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white font-medium"
                >
                  <option value="staff">Nhân viên (Staff) - Quyền giới hạn</option>
                  <option value="admin">Quản trị viên (Admin) - Toàn quyền quản trị</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Đang tạo...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Tạo tài khoản
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết nhân sự */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg shadow-xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-600" /> Chi tiết tài khoản quản trị
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-4 p-4 bg-slate-900 text-white">
                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                  {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedUser.name}</h4>
                  <p className="text-slate-400">{selectedUser.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-400/30">
                    {selectedUser.role === 'admin' ? 'Quản trị viên hệ thống' : 'Nhân viên vận hành'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Mã ID</span>
                  <p className="font-bold text-slate-700">#{selectedUser.id}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Trạng thái</span>
                  <div>
                    {selectedUser.status === 'active' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Đang hoạt động
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <XCircle size={13} /> Đã bị khóa
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Số điện thoại</span>
                  <p className="font-medium text-slate-700">{selectedUser.phone || 'Chưa cập nhật'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Ngày khởi tạo</span>
                  <p className="font-medium text-slate-700">
                    {new Date(selectedUser.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleToggleStatus(selectedUser)}
                disabled={currentAdmin?.id === selectedUser.id}
                className={`px-3 py-1.5 text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  currentAdmin?.id === selectedUser.id
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : selectedUser.status === 'active'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {selectedUser.status === 'active' ? (
                  <>
                    <Lock size={14} /> Khóa tài khoản này
                  </>
                ) : (
                  <>
                    <Unlock size={14} /> Mở khóa tài khoản này
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận */}
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
