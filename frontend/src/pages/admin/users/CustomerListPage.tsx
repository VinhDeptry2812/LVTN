import { useState, useEffect } from 'react';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import { AxiosError } from 'axios';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import toast from 'react-hot-toast';
import {
  Search,
  Users,
  Lock,
  Unlock,
  Calendar,
  Mail,
  Phone,
  UserX,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  UserCheck
} from 'lucide-react';

interface UserEntity {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  gender?: string | null;
  birthday?: string | null;
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

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<UserEntity[]>([]);
  const [meta, setMeta] = useState<Meta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    locked: 0
  });

  // Detail Modal
  const [selectedCustomer, setSelectedCustomer] = useState<UserEntity | null>(null);

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
    onConfirm: () => { },
  });

  // Fetch overall customer statistics
  const fetchOverallStats = async () => {
    try {
      const res = await api.get('/users/admin/list', {
        params: { role: 'customer', limit: 1000 }
      });
      const customerUsers: UserEntity[] = res.data.data || [];
      const active = customerUsers.filter(u => u.status === 'active').length;
      const locked = customerUsers.filter(u => u.status === 'inactive').length;

      setStats({
        total: customerUsers.length,
        active,
        locked
      });
    } catch {
      // silent fail
    }
  };

  // Fetch paginated customer list
  const fetchCustomers = async (page: number = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
        role: 'customer'
      };
      if (search.trim()) {
        params.search = search.trim();
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await api.get('/users/admin/list', { params });

      const rawData: UserEntity[] = res.data.data || [];
      // Safety filter: Đảm bảo trang Khách hàng tuyệt đối chỉ hiển thị tài khoản customer
      const data = rawData.filter((u: UserEntity) => u.role === 'customer');

      setCustomers(data);
      setMeta(res.data.meta || {
        totalItems: data.length,
        itemCount: data.length,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1
      });
    } catch {
      toast.error('Không thể tải danh sách tài khoản khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverallStats();
  }, []);

  useEffect(() => {
    fetchCustomers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleToggleStatus = (customer: UserEntity) => {
    const actionText = customer.status === 'active' ? 'khóa' : 'mở khóa';

    setConfirmModal({
      isOpen: true,
      title: `${customer.status === 'active' ? 'Khóa' : 'Mở khóa'} tài khoản khách hàng`,
      message: `Bạn có chắc chắn muốn ${actionText} tài khoản của khách hàng "${customer.name}"?`,
      confirmText: customer.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa',
      type: customer.status === 'active' ? 'danger' : 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setToggleLoadingId(customer.id);
        const newStatus = customer.status === 'active' ? 'inactive' : 'active';

        try {
          await api.patch(`/users/admin/${customer.id}/status`, { status: newStatus });
          toast.success(`Đã ${actionText} tài khoản khách hàng thành công!`);

          fetchCustomers(meta.currentPage);
          fetchOverallStats();

          if (selectedCustomer && selectedCustomer.id === customer.id) {
            setSelectedCustomer({
              ...selectedCustomer,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-none border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600" size={24} /> Quản lý tài khoản khách hàng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi, kiểm tra thông tin chi tiết và quản lý trạng thái tài khoản của người mua hàng
          </p>
        </div>
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-none border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Tổng khách hàng</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-none border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Đang hoạt động</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-none border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <UserX size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Tài khoản bị khóa</p>
            <p className="text-2xl font-bold text-rose-600">{stats.locked}</p>
          </div>
        </div>
      </div>

      {/* Bộ lọc và Tìm kiếm */}
      <div className="bg-white p-4 rounded-none border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên, Email hoặc Số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
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

      {/* Bảng danh sách */}
      <div className="bg-white rounded-none border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Ngày đăng ký</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8">
                    <TableLoader />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                    Không tìm thấy tài khoản khách hàng nào.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {c.name ? c.name.charAt(0).toUpperCase() : 'K'}
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        <span>{c.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{new Date(c.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.status === 'active' ? (
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
                        onClick={() => setSelectedCustomer(c)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={toggleLoadingId === c.id}
                        className={`p-1.5 border transition-colors ${
                          c.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50 border-slate-200 hover:border-amber-200'
                            : 'text-emerald-600 hover:bg-emerald-50 border-slate-200 hover:border-emerald-200'
                        }`}
                        title={c.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      >
                        {c.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
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
              onPageChange={(page) => fetchCustomers(page)}
            />
          </div>
        )}
      </div>

      {/* Modal Xem chi tiết khách hàng */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg shadow-xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users size={16} className="text-indigo-600" /> Thông tin tài khoản khách hàng
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-4 p-4 bg-indigo-50/50 border border-indigo-100">
                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                  {selectedCustomer.name ? selectedCustomer.name.charAt(0).toUpperCase() : 'K'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{selectedCustomer.name}</h4>
                  <p className="text-slate-500">{selectedCustomer.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                    Khách hàng mua sắm
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Mã ID</span>
                  <p className="font-bold text-slate-700">#{selectedCustomer.id}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Trạng thái</span>
                  <div>
                    {selectedCustomer.status === 'active' ? (
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
                  <p className="font-medium text-slate-700">{selectedCustomer.phone || 'Chưa cập nhật'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Ngày đăng ký</span>
                  <p className="font-medium text-slate-700">
                    {new Date(selectedCustomer.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleToggleStatus(selectedCustomer)}
                className={`px-3 py-1.5 text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  selectedCustomer.status === 'active'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {selectedCustomer.status === 'active' ? (
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
                onClick={() => setSelectedCustomer(null)}
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
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
