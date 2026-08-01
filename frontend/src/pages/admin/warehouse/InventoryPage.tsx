import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
  Database,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Package,
  Loader2,
  SlidersHorizontal,
  History,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

interface Variant {
  id: number;
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  product_name: string;
  image_url: string;
}

interface PaginatedResponse {
  data: Variant[];
  total: number;
  page: number;
  limit: number;
}

export default function InventoryPage() {
  // Tabs state
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');

  // State for inventory list
  const [variants, setVariants] = useState<Variant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'lowStock' | 'outOfStock'>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);

  // Stats
  const [totalProductsStock, setTotalProductsStock] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  // Inline editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingStock, setEditingStock] = useState<number>(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Transactions State
  const [txData, setTxData] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txLimit] = useState(10);
  const [txType, setTxType] = useState<string>('all');
  const [txStartDate, setTxStartDate] = useState<string>('');
  const [txEndDate, setTxEndDate] = useState<string>('');

  // Fetch stats separately or deduce from endpoints
  const fetchStats = useCallback(async () => {
    try {
      // We can query with limit=1 to get counts of different states
      const [allRes, lowRes, outRes] = await Promise.all([
        api.get('/products/admin/inventory', { params: { page: 1, limit: 1, filter: 'all' } }),
        api.get('/products/admin/inventory', { params: { page: 1, limit: 1, filter: 'lowStock', lowStockThreshold } }),
        api.get('/products/admin/inventory', { params: { page: 1, limit: 1, filter: 'outOfStock' } }),
      ]);
      setTotalProductsStock(allRes.data.total);
      setLowStockCount(lowRes.data.total);
      setOutOfStockCount(outRes.data.total);
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  }, [lowStockThreshold]);

  // Fetch main inventory list
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse>('/products/admin/inventory', {
        params: {
          page,
          limit,
          search: search || undefined,
          filter,
          lowStockThreshold,
        },
      });
      setVariants(response.data.data);
      setTotal(response.data.total);
    } catch {
      toast.error('Không thể kết nối API danh sách tồn kho');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filter, lowStockThreshold]);

  // Fetch Transactions List
  const fetchTransactions = useCallback(async () => {
    txLoading || setTxLoading(true);
    try {
      const response = await api.get('/products/admin/inventory/transactions', {
        params: {
          page: txPage,
          limit: txLimit,
          type: txType !== 'all' ? txType : undefined,
          startDate: txStartDate || undefined,
          endDate: txEndDate || undefined,
        },
      });
      setTxData(response.data.data);
      setTxTotal(response.data.total);
    } catch {
      toast.error('Không thể tải nhật ký biến động kho');
    } finally {
      setTxLoading(false);
    }
  }, [txPage, txLimit, txType, txStartDate, txEndDate]);

  // Load data
  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [fetchInventory, activeTab]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [fetchTransactions, activeTab]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  // Start inline editing
  const startEdit = (variant: Variant) => {
    setEditingId(variant.id);
    setEditingStock(variant.stock);
  };

  // Cancel inline editing
  const cancelEdit = () => {
    setEditingId(null);
  };

  // Save inline editing
  const saveEdit = async (variantId: number) => {
    if (editingStock < 0 || !Number.isInteger(editingStock)) {
      toast.error('Số lượng tồn kho phải là số nguyên không âm');
      return;
    }

    setUpdatingId(variantId);
    try {
      await api.patch(`/products/admin/inventory/variants/${variantId}`, {
        stock: editingStock,
      });
      toast.success('Cập nhật tồn kho thành công');
      setEditingId(null);
      fetchInventory();
      fetchStats();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      const errMsg = err.response?.data?.message || 'Cập nhật tồn kho thất bại';
      toast.error(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  // Keyboard controls for inline edit
  const handleKeyDown = (e: React.KeyboardEvent, variantId: number) => {
    if (e.key === 'Enter') {
      saveEdit(variantId);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Format variant attributes
  const formatAttributes = (attributes: Record<string, string>) => {
    if (!attributes || Object.keys(attributes).length === 0) return 'Mặc định';
    return Object.entries(attributes)
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');
  };

  // Render stock status badge
  const renderStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle size={12} /> Hết hàng
        </span>
      );
    }
    if (stock <= lowStockThreshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle size={12} /> Sắp hết hàng
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle size={12} /> Đủ hàng
      </span>
    );
  };

  // Render transaction type badge
  const renderTxTypeBadge = (type: string) => {
    switch (type) {
      case 'purchase_order':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider text-[10px]">
            Nhập kho
          </span>
        );
      case 'order_sale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider text-[10px]">
            Bán hàng
          </span>
        );
      case 'order_return':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider text-[10px]">
            Trả hàng
          </span>
        );
      case 'order_cancel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider text-[10px]">
            Hủy đơn
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider text-[10px]">
            Điều chỉnh
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 uppercase tracking-wider text-[10px]">
            {type}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / limit);
  const totalTxPages = Math.ceil(txTotal / txLimit);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-1">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Quản lý tồn kho
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi, lọc cảnh báo và cập nhật nhanh số lượng sản phẩm đang có trong kho.
          </p>
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Tổng số loại sản phẩm */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số loại sản phẩm</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{totalProductsStock}</h3>
            <p className="text-[11px] text-slate-500">Tổng số dòng sản phẩm có sẵn trong danh mục</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 flex items-center justify-center text-blue-600 rounded-none border border-blue-100">
            <Package size={20} />
          </div>
        </div>

        {/* Card 2: Cần nhập thêm */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cần nhập thêm</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{lowStockCount}</h3>
            <p className="text-[11px] text-slate-500">Biến thể có lượng tồn kho &le; {lowStockThreshold}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 flex items-center justify-center text-amber-600 rounded-none border border-amber-100">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Card 3: Đang hết hàng */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 flex items-center justify-between hover:shadow-md transition-all rounded-none">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang hết hàng</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{outOfStockCount}</h3>
            <p className="text-[11px] text-slate-500">Đang có số lượng tồn kho bằng 0</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 flex items-center justify-center text-rose-600 rounded-none border border-rose-100">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Package size={16} /> Danh sách tồn kho
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <History size={16} /> Nhật ký biến động
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Filter and Search Section */}
          <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm SKU hoặc Tên sản phẩm..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-none border border-slate-200 text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-none text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
                >
                  <SlidersHorizontal size={14} className="text-slate-500" />
                  <span>Ngưỡng báo động</span>
                </button>
              </div>
            </div>

            {/* Quick Filters (Tabs) */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {[
                { id: 'all', label: 'TẤT CẢ' },
                { id: 'lowStock', label: 'Sắp hết hàng' },
                { id: 'outOfStock', label: 'Hết hàng' }
              ].map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setFilter(tab.id as any); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-900/10'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Config Threshold dropdown */}
            {showThresholdConfig && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-none flex flex-col sm:flex-row sm:items-center gap-4 animate-slideDown">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Số lượng tối thiểu cảnh báo sắp hết hàng
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Các sản phẩm có số lượng tồn bằng hoặc thấp hơn số này sẽ được lọc vào tab "Sắp hết hàng".
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lowStockThreshold}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      setLowStockThreshold(val);
                      setPage(1);
                    }}
                    className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-none text-sm text-center"
                  />
                  <span className="text-xs text-slate-500">sản phẩm</span>
                </div>
              </div>
            )}
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-24">Ảnh</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Sản phẩm</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">SKU</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Thuộc tính</th>
                    <th className="text-center px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-48">Tình trạng</th>
                    <th className="text-center px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-48">Tồn kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-slate-400">
                        <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={32} />
                        <span>Đang tải danh sách tồn kho...</span>
                      </td>
                    </tr>
                  ) : variants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-slate-400">
                        <Package size={48} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-500">Không tìm thấy sản phẩm</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Hãy thay đổi từ khóa tìm kiếm hoặc bộ lọc hiện tại.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    variants.map((v) => {
                      const isEditing = editingId === v.id;
                      const isUpdating = updatingId === v.id;

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Image */}
                          <td className="px-6 py-4">
                            {v.image_url ? (
                              <img
                                src={v.image_url}
                                alt={v.product_name}
                                className="w-12 h-12 object-cover rounded-none border border-slate-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-none flex items-center justify-center">
                                <Package size={18} className="text-slate-300" />
                              </div>
                            )}
                          </td>

                          {/* Product Name */}
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800 line-clamp-2">
                              {v.product_name}
                            </span>
                          </td>

                          {/* SKU */}
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">
                            {v.sku}
                          </td>

                          {/* Attributes */}
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">
                            {formatAttributes(v.attributes)}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            {renderStockBadge(v.stock)}
                          </td>

                          {/* Stock (Inline Edit) */}
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={editingStock}
                                  onChange={(e) => setEditingStock(Math.max(0, Number(e.target.value)))}
                                  onKeyDown={(e) => handleKeyDown(e, v.id)}
                                  className="w-20 px-2 py-1 text-center bg-white border border-indigo-500 outline-none text-sm font-semibold rounded-none focus:ring-2 focus:ring-indigo-200"
                                  autoFocus
                                  disabled={isUpdating}
                                />
                                <button
                                  onClick={() => saveEdit(v.id)}
                                  disabled={isUpdating}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-none transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Lưu"
                                >
                                  {isUpdating ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Check size={16} />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={isUpdating}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-none transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Hủy"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div
                                onDoubleClick={() => startEdit(v)}
                                onClick={() => startEdit(v)}
                                className="group flex items-center justify-center gap-2 cursor-pointer py-1.5 rounded-none hover:bg-slate-100 transition-all"
                                title="Nhấp đúp chuột để chỉnh sửa"
                              >
                                <span className="font-mono font-bold text-sm text-slate-800">
                                  {v.stock}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                  Sửa
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  Hiển thị {variants.length} / {total} dòng sản phẩm
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors rounded-none cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors rounded-none cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Filter Section for Transactions */}
          <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Transaction Type Select */}
              <div className="flex flex-col min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loại biến động</label>
                <select
                  value={txType}
                  onChange={(e) => {
                    setTxType(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-none border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Tất cả biến động</option>
                  <option value="purchase_order">Nhập kho (Nhà cung cấp)</option>
                  <option value="order_sale">Bán hàng (Đơn hàng)</option>
                  <option value="order_return">Khách trả hàng</option>
                  <option value="order_cancel">Hủy đơn hàng</option>
                  <option value="adjustment">Điều chỉnh thủ công</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="flex flex-col min-w-[150px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={txStartDate}
                  onChange={(e) => {
                    setTxStartDate(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-none border border-slate-200 text-xs font-semibold bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-700"
                />
              </div>

              {/* End Date */}
              <div className="flex flex-col min-w-[150px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={txEndDate}
                  onChange={(e) => {
                    setTxEndDate(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-none border border-slate-200 text-xs font-semibold bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-700"
                />
              </div>

              {/* Reset Filters button */}
              {(txType !== 'all' || txStartDate || txEndDate) && (
                <button
                  onClick={() => {
                    setTxType('all');
                    setTxStartDate('');
                    setTxEndDate('');
                    setTxPage(1);
                  }}
                  className="self-end flex items-center justify-center gap-2 px-4 py-2.5 rounded-none text-xs font-bold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer shadow-sm"
                >
                  <X size={14} />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-40">Thời gian</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Sản phẩm</th>
                    <th className="text-center px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-28">Loại</th>
                    <th className="text-center px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-28">Thay đổi</th>
                    <th className="text-center px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-36">Biến động tồn</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] w-36">Người thực hiện</th>
                    <th className="text-left px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Ghi chú / Tham chiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400">
                        <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={32} />
                        <span>Đang tải nhật ký biến động kho...</span>
                      </td>
                    </tr>
                  ) : txData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400">
                        <History size={48} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-500">Không tìm thấy lịch sử biến động</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Chưa phát sinh biến động nào phù hợp với bộ lọc đã chọn.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    txData.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Time */}
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar size={14} className="text-slate-400" />
                            <span>
                              {new Date(tx.created_at).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Product Detail */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 line-clamp-1">
                              {tx.variant?.product_name || 'Sản phẩm đã xóa'}
                            </span>
                            <span className="text-xs text-slate-500 mt-0.5">
                              {tx.variant?.attributes ? formatAttributes(tx.variant.attributes) : ''}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-indigo-600/80 mt-1">
                              SKU: {tx.variant?.sku || 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="px-6 py-4 text-center">
                          {renderTxTypeBadge(tx.type)}
                        </td>

                        {/* Quantity Change */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold ${
                            tx.change_qty > 0 ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5' : 'text-rose-600 bg-rose-50 px-1.5 py-0.5'
                          }`}>
                            {tx.change_qty > 0 ? (
                              <>
                                <ArrowUpRight size={12} className="stroke-[3px]" /> +{tx.change_qty}
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft size={12} className="stroke-[3px]" /> {tx.change_qty}
                              </>
                            )}
                          </span>
                        </td>

                        {/* Stock Level Changes */}
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-500 font-semibold">
                          {tx.previous_stock} &rarr; {tx.new_stock}
                        </td>

                        {/* Performed By */}
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            <span>{tx.user?.name || 'Hệ thống'}</span>
                          </div>
                        </td>

                        {/* Reference and Note */}
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {tx.reference_id && (
                            <div className="font-semibold text-slate-700 mb-0.5">
                              Mã đơn: #{tx.reference_id}
                            </div>
                          )}
                          <div className="italic text-slate-500 line-clamp-2 max-w-xs">{tx.note || 'Không có ghi chú'}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Transactions */}
            {!txLoading && totalTxPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  Hiển thị {txData.length} / {txTotal} giao dịch kho
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    disabled={txPage === 1}
                    className="p-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors rounded-none cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    Trang {txPage} / {totalTxPages}
                  </span>
                  <button
                    onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
                    disabled={txPage === totalTxPages}
                    className="p-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors rounded-none cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

