/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import AdminPageHeader from '@/components/AdminPageHeader';
import StatusBadge from '@/components/StatusBadge';

import toast from 'react-hot-toast';
import { Plus, Loader2, Eye, Calendar, User, FileSpreadsheet, ChevronLeft, ChevronRight, Filter, ArrowDownRight } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
}

interface UserType {
  id: number;
  name?: string;
  email?: string;
}

interface PurchaseOrder {
  id: number;
  supplier: Supplier;
  created_by: UserType;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  completed_at?: string;
}

interface PaginatedResponse {
  data: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
}

export default function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers', { params: { page: 1, limit: 100 } });
      setSuppliers(res.data.data);
    } catch {
      console.error('Không thể tải danh mục nhà cung cấp');
    }
  };

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (supplierFilter !== 'all') {
        params.supplierId = Number(supplierFilter);
      }

      const res = await api.get<PaginatedResponse>('/purchase-orders', { params });
      setPurchaseOrders(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Không thể tải danh sách đơn nhập hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [page, statusFilter, supplierFilter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Đơn nhập hàng"
        subtitle="Lập và theo dõi các đơn đặt hàng cung ứng từ nhà cung cấp"
        icon={ArrowDownRight}
        actions={
          <button
            onClick={() => navigate('/admin/purchase-orders/create')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            Tạo đơn nhập hàng
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
              <option value="pending">Chờ nhập kho (Pending)</option>
              <option value="completed">Đã hoàn tất (Completed)</option>
              <option value="cancelled">Đã hủy (Cancelled)</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-semibold">Nhà cung cấp</label>
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer max-w-xs"
            >
              <option value="all">Tất cả nhà cung cấp</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <TableLoader  />
        ) : purchaseOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-base font-medium">Không tìm thấy đơn nhập hàng nào</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tạo đơn hàng mới</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Mã đơn</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Nhà cung cấp</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Tổng giá trị</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Người lập</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Ngày lập</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Trạng thái</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-600">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                        #{po.id}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{po.supplier?.name || 'Không xác định'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(po.total_amount)}</td>
                      <td className="px-6 py-4 text-slate-700 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <User size={12} className="text-slate-400" />
                          <span>{po.created_by?.name || po.created_by?.email || 'Hệ thống'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{new Date(po.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={po.status} category="purchase_order" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate(`/admin/purchase-orders/${po.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-none transition-all cursor-pointer"
                          title="Xem chi tiết"
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
