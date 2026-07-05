import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Search, 
  Filter, 
  SlidersHorizontal,
  ChevronDown,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Product {
  id: number;
  sku: string;
  name: string;
  base_price: number;
  discount_price?: number | null;
  is_active: boolean;
  category?: { name: string };
}

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Đã xóa sản phẩm thành công');
      fetchProducts();
    } catch {
      toast.error('Xóa sản phẩm thất bại');
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // Extract unique category names
  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  );

  // Filter products based on search query, status and category
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && p.is_active) || 
      (statusFilter === 'inactive' && !p.is_active);

    const matchesCategory = 
      categoryFilter === 'all' || 
      p.category?.name === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate pagination
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang tải danh sách sản phẩm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Danh sách Sản phẩm</h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Quản lý và thiết lập thông tin chi tiết các mẫu nội thất</p>
        </div>
        <Link
          to="/admin/products/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:-translate-y-0.5"
        >
          <Plus size={16} />
          Thêm sản phẩm mới
        </Link>
      </div>

      {/* Filter and search bar card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 md:p-5 shadow-sm space-y-4">
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border border-slate-200/85 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500/80 transition-all text-slate-700 font-medium bg-slate-50/50"
            />
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
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

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
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

          </div>

        </div>
      </div>

      {/* Main product table container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="text-left px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">SKU</th>
                <th className="text-left px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Tên sản phẩm</th>
                <th className="text-left px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Danh mục</th>
                <th className="text-right px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Giá cơ bản</th>
                <th className="text-right px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Giá khuyến mãi</th>
                <th className="text-center px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Trạng thái</th>
                <th className="text-center px-6 py-4 font-bold text-slate-500 text-xs tracking-wider uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 font-medium">
                    Không tìm thấy sản phẩm nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                currentProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* SKU code */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-400 font-bold">{p.sku}</td>
                    
                    {/* Name & Avatar mockup */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100/80 border border-slate-200/50 flex items-center justify-center font-bold text-slate-400 shrink-0 text-sm">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 hover:text-indigo-600 transition-colors block cursor-pointer">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">ID: #{p.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 text-slate-500 font-medium">{p.category?.name || '—'}</td>

                    {/* Base Price */}
                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                      {formatPrice(p.base_price)}
                    </td>

                    {/* Discount Price */}
                    <td className="px-6 py-4 text-right">
                      {p.discount_price ? (
                        <div className="space-y-0.5">
                          <span className="font-black text-rose-600 block">{formatPrice(p.discount_price)}</span>
                          <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-[10px] font-bold text-rose-600 rounded">
                            Giảm {Math.round((1 - p.discount_price / p.base_price) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Không áp dụng</span>
                      )}
                    </td>

                    {/* Status Toggle Tag */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {p.is_active ? 'Đang bán' : 'Ngừng bán'}
                      </span>
                    </td>

                    {/* Actions buttons */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/admin/products/edit/${p.id}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Sửa sản phẩm"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="bg-slate-50/80 px-6 py-4 flex items-center justify-between border-t border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">
              Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} của {totalItems} sản phẩm
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                    currentPage === page
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
