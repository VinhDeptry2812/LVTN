/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';

import { Plus, Loader2, Eye, Calendar, User, ClipboardList, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface UserType {
  id: number;
  name?: string;
  email?: string;
}

interface InventoryAudit {
  id: number;
  created_by: UserType;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  completed_at?: string;
}

interface PaginatedResponse {
  data: InventoryAudit[];
  total: number;
  page: number;
  limit: number;
}

export default function InventoryAuditListPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await api.get<PaginatedResponse>('/inventory-audits', { params });
      setAudits(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Không thể tải danh sách phiếu kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [page, statusFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Kiểm kê kho"
        subtitle="Quản lý và thực hiện các phiên kiểm kê đối soát tồn kho thực tế"
        icon={ClipboardList}
        actions={
          <button
            onClick={() => navigate('/admin/inventory-audits/create')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            Tạo đợt kiểm kho
          </button>
        }
      />

      {/* Filters Panel */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
            <Filter size={16} />
            <span>Bộ lọc:</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-semibold">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Đang tiến hành (Pending)</option>
              <option value="completed">Đã hoàn tất (Completed)</option>
              <option value="cancelled">Đã hủy (Cancelled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <TableLoader />
        ) : audits.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList size={48} className="mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-base font-medium">Không tìm thấy phiếu kiểm kê nào</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tạo đợt kiểm kho mới</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Mã đợt</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Ghi chú kiểm kho</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Người khởi tạo</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Ngày tạo</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Ngày hoàn tất</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Trạng thái</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((ad) => (
                    <tr key={ad.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                        #{ad.id}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium max-w-xs truncate">
                        {ad.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div className="flex items-center gap-1.5 text-xs">
                          <User size={12} className="text-slate-400" />
                          <span>{ad.created_by?.name || ad.created_by?.email || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{new Date(ad.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {ad.completed_at ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar size={12} className="text-slate-400" />
                            <span>{new Date(ad.completed_at).toLocaleString('vi-VN')}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa hoàn tất</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-none ${ad.status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : ad.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            }`}
                        >
                          {ad.status === 'completed' && 'Đã hoàn tất'}
                          {ad.status === 'cancelled' && 'Đã hủy'}
                          {ad.status === 'pending' && 'Đang kiểm kho'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate(`/admin/inventory-audits/${ad.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-none transition-all cursor-pointer"
                          title="Thực hiện kiểm đếm"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <AdminPagination
              currentPage={page}
              totalItems={total}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </div>
    </div>
  );
}
