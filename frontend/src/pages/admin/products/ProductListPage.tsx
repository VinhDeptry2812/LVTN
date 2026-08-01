import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { formatPrice } from '@/utils/format';
import AdminPagination from '@/components/AdminPagination';
import TableLoader from '@/components/TableLoader';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import AdminPageHeader from '@/components/AdminPageHeader';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
  is_hover: boolean;
}

interface ProductVariant {
  id: number;
  sku: string;
  stock: number;
  price_adjustment: number;
}

interface Collection {
  id: number;
  name: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  base_price: number;
  discount_price?: number | null;
  is_active: boolean;
  is_bulky: boolean;
  category?: { name: string };
  images?: ProductImage[];
  variants?: ProductVariant[];
  collections?: Collection[];
}

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collectionsList, setCollectionsList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'base_price' | 'stock' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Status updating state
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await api.get('/collections');
      setCollectionsList(res.data);
    } catch (err) {
      console.error('Lỗi khi tải bộ sưu tập', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCollections();
  }, []);

  const handleDelete = (id: number) => {
    openConfirm({
      title: 'Xóa sản phẩm',
      message: 'Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa sản phẩm',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/products/${id}`);
          toast.success('Đã xóa sản phẩm thành công');
          fetchProducts();
        } catch {
          toast.error('Xóa sản phẩm thất bại');
        }
      }
    });
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    setUpdatingStatusId(id);
    try {
      await api.patch(`/products/${id}`, { is_active: !currentStatus });
      toast.success('Đã cập nhật trạng thái sản phẩm!');
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
      );
    } catch {
      toast.error('Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Extract unique category names
  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  );

  // Stats calculation
  const stats = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    outOfStock: products.filter((p) => {
      const stock = p.variants?.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) ?? 0;
      return stock === 0;
    }).length,
    lowStock: products.filter((p) => {
      const stock = p.variants?.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) ?? 0;
      return stock > 0 && stock < 10;
    }).length,
  };

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    collectionFilter !== 'all' ||
    stockFilter !== 'all' ||
    sortField !== null;

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setCollectionFilter('all');
    setStockFilter('all');
    setSortField(null);
    toast.success('Đã đặt lại tất cả bộ lọc');
  };

  const handleSort = (field: 'name' | 'base_price' | 'stock') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter products based on search query, status, category, collection and stock
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku ? p.sku.toLowerCase().includes(searchQuery.toLowerCase()) : false);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active);

    const matchesCategory =
      categoryFilter === 'all' ||
      p.category?.name === categoryFilter;

    const matchesCollection =
      collectionFilter === 'all' ||
      p.collections?.some((col) => col.name === collectionFilter);

    const totalStock = p.variants?.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) ?? 0;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'instock' && totalStock > 0) ||
      (stockFilter === 'outofstock' && totalStock === 0) ||
      (stockFilter === 'lowstock' && totalStock > 0 && totalStock < 10);

    return matchesSearch && matchesStatus && matchesCategory && matchesCollection && matchesStock;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = 0;
    let bValue: any = 0;

    if (sortField === 'stock') {
      aValue = a.variants?.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) ?? 0;
      bValue = b.variants?.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) ?? 0;
    } else {
      aValue = (a as any)[sortField];
      bValue = (b as any)[sortField];
    }

    if (typeof aValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc'
      ? (aValue ?? 0) - (bValue ?? 0)
      : (bValue ?? 0) - (aValue ?? 0);
  });

  // Calculate pagination
  const totalItems = sortedProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentProducts = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);



  // Reset page when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, collectionFilter, stockFilter, pageSize]);

  if (loading) {
    return <TableLoader message="Đang tải danh sách sản phẩm..." minHeightClass="h-96" />;
  }


  const renderSortHeader = (field: 'name' | 'base_price' | 'stock', label: string, extraClasses = '') => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase cursor-pointer hover:text-slate-800 transition-colors select-none ${extraClasses}`}
      >
        <div className="flex items-center gap-1.5 justify-start">
          <span>{label}</span>
          <ArrowUpDown size={12} className={`transition-colors ${isSorted ? 'text-indigo-600' : 'text-slate-300'}`} />
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header section */}
      <AdminPageHeader
        title="Danh sách Sản phẩm"
        subtitle="Quản lý và thiết lập thông tin chi tiết các mẫu nội thất"
        icon={Package}
        actions={
          <Link
            to="/admin/products/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5"
          >
            <Plus size={16} />
            Thêm sản phẩm mới
          </Link>
        }
      />

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Products */}
        <button
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setCategoryFilter('all');
            setCollectionFilter('all');
            setStockFilter('all');
            toast.success('Đã hiển thị tất cả sản phẩm');
          }}
          className={`w-full text-left bg-white rounded-none border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-4 cursor-pointer ${!hasActiveFilters ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200/60'
            }`}
          title="Click để hiển thị tất cả sản phẩm"
        >
          <div className="p-3 rounded-none bg-indigo-50 text-indigo-600 shrink-0">
            <Package size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng sản phẩm</span>
            <span className="text-xl font-black text-slate-800">{stats.total}</span>
          </div>
        </button>

        {/* Active Products */}
        <button
          onClick={() => {
            setStatusFilter('active');
            toast.success('Đang lọc sản phẩm đang bán');
          }}
          className={`w-full text-left bg-white rounded-none border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-4 cursor-pointer ${statusFilter === 'active' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200/60'
            }`}
          title="Click để lọc sản phẩm đang bán"
        >
          <div className="p-3 rounded-none bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang bán</span>
            <span className="text-xl font-black text-slate-800">{stats.active}</span>
          </div>
        </button>

        {/* Out Of Stock */}
        <button
          onClick={() => {
            setStockFilter('outofstock');
            setCategoryFilter('all');
            setCollectionFilter('all');
            setStatusFilter('all');
            setSearchQuery('');
            toast.success('Đang lọc sản phẩm hết hàng');
          }}
          className={`w-full text-left bg-white rounded-none border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-4 cursor-pointer ${stockFilter === 'outofstock' ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-slate-200/60'
            }`}
          title="Click để lọc sản phẩm hết hàng"
        >
          <div className="p-3 rounded-none bg-rose-50 text-rose-600 shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hết hàng</span>
            <span className="text-xl font-black text-slate-800">{stats.outOfStock}</span>
          </div>
        </button>

        {/* Low Stock */}
        <button
          onClick={() => {
            setStockFilter('lowstock');
            setCategoryFilter('all');
            setCollectionFilter('all');
            setStatusFilter('all');
            setSearchQuery('');
            toast.success('Đang lọc sản phẩm sắp hết hàng');
          }}
          className={`w-full text-left bg-white rounded-none border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-4 cursor-pointer ${stockFilter === 'lowstock' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200/60'
            }`}
          title="Click để lọc sản phẩm sắp hết hàng"
        >
          <div className="p-3 rounded-none bg-amber-50 text-amber-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sắp hết hàng</span>
            <span className="text-xl font-black text-slate-800">{stats.lowStock}</span>
          </div>
        </button>

      </div>

      {/* Filter and search bar card */}
      <div className="bg-white rounded-none border border-slate-200/60 p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">

          {/* Live Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sản phẩm hoặc mã SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-none text-xs border border-slate-200/85 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500/80 transition-all text-slate-700 font-medium bg-slate-50/50"
            />
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-none px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Danh mục:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Collection Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-none px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Bộ sưu tập:</span>
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">Tất cả bộ sưu tập</option>
                {collectionsList.map((col) => (
                  <option key={col.id} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>

            {/* Stock Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-none px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Tồn kho:</span>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">Tất cả tồn kho</option>
                <option value="instock">Còn hàng</option>
                <option value="outofstock">Hết hàng</option>
                <option value="lowstock">Sắp hết hàng (&lt; 10)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-none px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang bán</option>
                <option value="inactive">Ngừng bán</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-none text-xs font-bold transition-colors cursor-pointer"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw size={13} />
                Xóa bộ lọc
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Main product table container */}
      <div className="bg-white rounded-none shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="text-left px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">SKU</th>
                {renderSortHeader('name', 'Tên sản phẩm')}
                <th className="text-left px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Phân loại</th>
                {renderSortHeader('stock', 'Tồn kho', 'text-center')}
                {renderSortHeader('base_price', 'Giá cơ bản', 'text-right')}
                <th className="text-right px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Giá khuyến mãi</th>
                <th className="text-center px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Trạng thái</th>
                <th className="text-center px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 px-6">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                      <div className="p-4 bg-slate-50 text-slate-400 rounded-none">
                        <Search size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">Không tìm thấy sản phẩm nào</p>
                        <p className="text-xs text-slate-400">
                          Không có sản phẩm nào khớp với các bộ lọc hiện tại của bạn. Thử thay đổi từ khóa hoặc xóa bộ lọc.
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-none text-xs font-bold transition-colors cursor-pointer"
                        >
                          Xóa tất cả bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentProducts.map((p) => {
                  const primaryImg = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url;
                  const totalStock = p.variants?.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) ?? 0;
                  const variantCount = p.variants?.length ?? 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* SKU code */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 font-bold">{p.sku}</td>

                      {/* Name & Avatar/Image */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 rounded-none object-cover border border-slate-200/50 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-none bg-slate-100/80 border border-slate-200/50 flex items-center justify-center font-bold text-slate-400 shrink-0 text-sm">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                to={`/admin/products/edit/${p.id}`}
                                className="font-bold text-slate-700 hover:text-indigo-600 transition-colors block cursor-pointer line-clamp-2 max-w-[240px] sm:max-w-[300px]"
                                title={p.name}
                              >
                                {p.name}
                              </Link>
                              {p.is_bulky && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap" title="Sản phẩm hàng cồng kềnh">
                                  🚚 Cồng kềnh
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold">ID: #{p.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phân loại (Category & Collections) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-700 block max-w-[150px] truncate" title={p.category?.name || '—'}>
                            {p.category?.name || '—'}
                          </span>
                          {p.collections && p.collections.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[150px]" title={p.collections.map(c => c.name).join(', ')}>
                              {p.collections.slice(0, 2).map((col) => (
                                <span key={col.id} className="inline-block px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold rounded-none whitespace-nowrap">
                                  {col.name}
                                </span>
                              ))}
                              {p.collections.length > 2 && (
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-none whitespace-nowrap">
                                  +{p.collections.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Stock count */}
                      <td className="px-6 py-4 text-center">
                        {p.variants && p.variants.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className={`font-bold ${totalStock === 0
                              ? 'text-rose-600'
                              : totalStock < 10
                                ? 'text-amber-600'
                                : 'text-slate-700'
                              }`}>
                              {totalStock}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-medium">
                              {variantCount} biến thể
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-bold text-xs">0 biến thể</span>
                        )}
                      </td>

                      {/* Base Price */}
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">
                        {formatPrice(p.base_price)}
                      </td>

                      {/* Discount Price */}
                      <td className="px-6 py-4 text-right">
                        {p.discount_price ? (
                          <div className="space-y-0.5">
                            <span className="font-black text-rose-600 block">{formatPrice(p.discount_price)}</span>
                            <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-[10px] font-bold text-rose-600 rounded-none">
                              Giảm {Math.round((1 - p.discount_price / p.base_price) * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Không áp dụng</span>
                        )}
                      </td>

                      {/* Status Switch Toggle */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleActive(p.id, p.is_active)}
                            disabled={updatingStatusId === p.id}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${p.is_active ? 'bg-indigo-600' : 'bg-slate-200'
                              } ${updatingStatusId === p.id ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                            title={p.is_active ? 'Click để ngừng bán' : 'Click để đăng bán'}
                          >
                            <span className="sr-only">Toggle active status</span>
                            {updatingStatusId === p.id ? (
                              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-none bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${p.is_active ? 'translate-x-4' : 'translate-x-0'}`}>
                                <span className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-none animate-spin" />
                              </span>
                            ) : (
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-none bg-white shadow ring-0 transition duration-200 ease-in-out ${p.is_active ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                              />
                            )}
                          </button>
                          <span className={`text-[11px] font-bold min-w-[55px] text-left transition-colors ${p.is_active ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                            {p.is_active ? 'Đang bán' : 'Ngừng bán'}
                          </span>
                        </div>
                      </td>

                      {/* Actions buttons */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/admin/products/edit/${p.id}`}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-none transition-all"
                            title="Sửa sản phẩm"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-none transition-all cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={15} />
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

        {/* Improved Pagination bar */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="sản phẩm"
        />

      </div>

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
