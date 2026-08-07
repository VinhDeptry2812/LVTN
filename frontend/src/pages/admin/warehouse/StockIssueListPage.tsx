/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';
import toast from 'react-hot-toast';
import { Plus, Eye, Calendar, User, FileSpreadsheet, Filter, Search, ArrowUpRight } from 'lucide-react';

interface UserType {
  id: number;
  name?: string;
  email?: string;
}

interface StockIssue {
  id: number;
  code: string;
  reason: 'damaged' | 'expired' | 'sample' | 'internal_use' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  total_amount: number;
  created_by: UserType;
  reviewed_by?: UserType;
  notes?: string;
  created_at: string;
  completed_at?: string;
}

interface PaginatedResponse {
  data: StockIssue[];
  total: number;
  page: number;
  limit: number;
}

export const REASON_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  order_sale: { label: 'Xuất bán đơn hàng', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  damaged: { label: 'Hàng hỏng / lỗi', bg: 'bg-red-50', text: 'text-red-700' },
  expired: { label: 'Hết hạn sử dụng', bg: 'bg-orange-50', text: 'text-orange-700' },
  sample: { label: 'Hàng mẫu / Trưng bày', bg: 'bg-purple-50', text: 'text-purple-700' },
  internal_use: { label: 'Sử dụng nội bộ', bg: 'bg-blue-50', text: 'text-blue-700' },
  other: { label: 'Lý do khác', bg: 'bg-slate-100', text: 'text-slate-700' },
};

export default function StockIssueListPage() {
  const navigate = useNavigate();
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const fetchStockIssues = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (reasonFilter !== 'all') {
        params.reason = reasonFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get<PaginatedResponse>('/stock-issues', { params });
      setStockIssues(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Không thể tải danh sách phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockIssues();
  }, [page, limit, statusFilter, reasonFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStockIssues();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Phiếu xuất kho"
        subtitle="Lập và quản lý phiếu xuất kho cho hàng hỏng, hàng mẫu, dùng nội bộ..."
        icon={ArrowUpRight}
        actions={
          <button
            onClick={() => navigate('/admin/stock-issues/create')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            Tạo phiếu xuất kho
          </button>
        }
      />

      {/* Filters Panel */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
                className="px-3 py-1.5 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt (Pending)</option>
                <option value="completed">Đã xuất kho (Completed)</option>
                <option value="cancelled">Đã hủy (Cancelled)</option>
              </select>
            </div>

            {/* Reason Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-semibold">Lý do xuất</label>
              <select
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white cursor-pointer max-w-xs"
              >
                <option value="all">Tất cả lý do</option>
                <option value="order_sale">Xuất bán đơn hàng</option>
                <option value="damaged">Hàng hỏng / lỗi</option>
                <option value="expired">Hết hạn sử dụng</option>
                <option value="sample">Hàng mẫu / Trưng bày</option>
                <option value="internal_use">Sử dụng nội bộ</option>
                <option value="other">Lý do khác</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Mã phiếu / ghi chú..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 w-56"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-none hover:bg-slate-700 transition-colors"
            >
              Tìm
            </button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <TableLoader />
        ) : stockIssues.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-base font-medium">Không tìm thấy phiếu xuất kho nào</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tạo phiếu xuất mới</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Mã phiếu</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Lý do xuất</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Tổng giá trị</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Người lập</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Ngày lập</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Trạng thái</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {stockIssues.map((issue) => {
                    const reasonInfo = REASON_LABELS[issue.reason] || REASON_LABELS.other;
                    return (
                      <tr key={issue.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-amber-700 text-xs">
                          {issue.code || `#PXK${issue.id}`}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-none ${reasonInfo.bg} ${reasonInfo.text}`}>
                            {reasonInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(issue.total_amount)}</td>
                        <td className="px-6 py-4 text-slate-700">
                          <div className="flex items-center gap-1.5 text-xs">
                            <User size={12} className="text-slate-400" />
                            <span>{issue.created_by?.name || issue.created_by?.email || 'Hệ thống'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar size={12} className="text-slate-400" />
                            <span>{new Date(issue.created_at).toLocaleString('vi-VN')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-none ${issue.status === 'completed'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : issue.status === 'cancelled'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              }`}
                          >
                            {issue.status === 'completed' && 'Đã xuất kho'}
                            {issue.status === 'cancelled' && 'Đã hủy'}
                            {issue.status === 'pending' && 'Chờ duyệt'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => navigate(`/admin/stock-issues/${issue.id}`)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-none transition-all cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <AdminPagination
              currentPage={page}
              totalItems={total}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="phiếu xuất"
            />
          </>
        )}
      </div>
    </div>
  );
}
