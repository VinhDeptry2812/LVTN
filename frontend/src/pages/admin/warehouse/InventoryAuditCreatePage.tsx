/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatAttributeValue } from '@/utils/format';
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface Variant {
  id: number;
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  product_name: string;
  image_url: string;
}

export default function InventoryAuditCreatePage() {
  const navigate = useNavigate();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination inside creator
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Selected variants state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/admin/inventory', {
        params: {
          page,
          limit,
          search: search || undefined,
        },
      });
      setVariants(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  };

  const handleSelectPageAll = () => {
    const allOnPageSelected = variants.every((v) => selectedIds.has(v.id));
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      variants.forEach((v) => {
        if (allOnPageSelected) {
          copy.delete(v.id);
        } else {
          copy.add(v.id);
        }
      });
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm để kiểm kê!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        variant_ids: Array.from(selectedIds),
        notes: notes.trim() || undefined,
      };

      const res = await api.post('/inventory-audits', payload);
      toast.success('Khởi tạo đợt kiểm kê kho thành công!');
      // Navigate to the detail page of the created audit session
      navigate(`/admin/inventory-audits/${res.data.id}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Không thể tạo đợt kiểm kê';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/inventory-audits')}
          className="p-2 hover:bg-slate-100 rounded-none text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tạo đợt kiểm kê kho</h1>
          <p className="text-sm text-slate-500 mt-0.5">Chọn danh sách biến thể sản phẩm cần đối soát số lượng thực tế</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: Select variants */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-bold text-slate-800">Chọn biến thể sản phẩm</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tìm theo tên, SKU..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                />
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-none transition-colors cursor-pointer"
                >
                  Tìm
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-none overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="text-blue-600 animate-spin" />
                </div>
              ) : variants.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Không tìm thấy biến thể nào</div>
              ) : (
                <>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600 font-semibold">
                        <th className="px-4 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={variants.length > 0 && variants.every((v) => selectedIds.has(v.id))}
                            onChange={handleSelectPageAll}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 rounded-none cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3">Biến thể sản phẩm</th>
                        <th className="px-4 py-3 text-center w-24">Tồn hệ thống</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr
                          key={v.id}
                          onClick={() => handleToggleSelect(v.id)}
                          className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            selectedIds.has(v.id) ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(v.id)}
                              onChange={() => handleToggleSelect(v.id)}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 rounded-none cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 flex items-center gap-3">
                            <img
                              src={v.image_url}
                              alt={v.product_name}
                              className="w-8 h-8 object-cover rounded-none border border-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate max-w-xs">{v.product_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                SKU: {v.sku}{' '}
                                {Object.entries(v.attributes).map(([key, val]) => `| ${key}: ${formatAttributeValue(val)}`)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">{v.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination inside creator list */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                      <div>
                        Trang {page} / {totalPages}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="p-1 rounded-none border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="p-1 rounded-none border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right pane: notes & submit */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Thông tin đợt kiểm</h2>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ghi chú đợt kiểm kho</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none resize-none"
                placeholder="Ví dụ: Kiểm kho Sofa và Bàn ăn quý 2"
              />
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Số sản phẩm đã chọn:</span>
                <span className="font-bold text-blue-600">{selectedIds.size} biến thể</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/inventory-audits')}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-center rounded-none cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors text-center rounded-none cursor-pointer"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Khởi tạo đợt kiểm
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
