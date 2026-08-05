/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Search, Loader2, ArrowLeft, Plus, Trash2, X, AlertCircle, ArrowUpRight } from 'lucide-react';
import { REASON_LABELS } from './StockIssueListPage';
import { formatAttributeValue } from '@/utils/format';

interface Variant {
  id: number;
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  product_name: string;
  image_url: string;
  base_price?: number;
  price_adjustment?: number;
}

interface SelectedItem {
  variant_id: number;
  sku: string;
  product_name: string;
  attributes: Record<string, string>;
  image_url: string;
  stock: number;
  quantity: number | '';
  unit_price: number | '';
  cost_price?: number;
  notes?: string;
}

export default function StockIssueCreatePage() {
  const navigate = useNavigate();
  const [reason, setReason] = useState<string>('damaged');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal variant lookup state
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [lookupVariants, setLookupVariants] = useState<Variant[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const searchVariants = async (query = '') => {
    setLookupLoading(true);
    try {
      const res = await api.get('/products/admin/inventory', {
        params: {
          page: 1,
          limit: 20,
          search: query || undefined,
        },
      });
      setLookupVariants(res.data.data);
    } catch {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleOpenLookup = () => {
    setShowLookupModal(true);
    searchVariants('');
  };

  const handleLookupSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchVariants(lookupSearch);
  };

  const addVariantToIssue = (variant: Variant) => {
    if (selectedItems.some((item) => item.variant_id === variant.id)) {
      toast.error('Sản phẩm này đã được thêm vào phiếu xuất!');
      return;
    }

    const basePrice = Number(variant.base_price || 0);
    const adjustment = Number(variant.price_adjustment || 0);
    const calculatedPrice = basePrice + adjustment;

    const newItem: SelectedItem = {
      variant_id: variant.id,
      sku: variant.sku,
      product_name: variant.product_name,
      attributes: variant.attributes,
      image_url: variant.image_url,
      stock: variant.stock,
      quantity: 1,
      unit_price: calculatedPrice,
      cost_price: calculatedPrice,
      notes: '',
    };

    setSelectedItems((prev) => [...prev, newItem]);
    toast.success('Đã thêm sản phẩm vào danh sách xuất');
  };

  const handleItemChange = (
    index: number,
    field: 'quantity' | 'unit_price' | 'notes',
    value: any,
  ) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((acc, item) => {
      const qty = item.quantity === '' ? 0 : item.quantity;
      const price = item.unit_price === '' ? 0 : item.unit_price;
      return acc + qty * price;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm cần xuất kho!');
      return;
    }

    // Validation
    for (const item of selectedItems) {
      const qty = item.quantity === '' ? 0 : item.quantity;
      const price = item.unit_price === '' ? 0 : item.unit_price;
      if (qty <= 0) {
        toast.error(`Số lượng xuất của sản phẩm ${item.product_name} phải lớn hơn 0`);
        return;
      }
      if (qty > item.stock) {
        toast.error(`Số lượng xuất của ${item.product_name} (${qty}) vượt quá tồn kho hiện tại (${item.stock})`);
        return;
      }
      if (price < 0) {
        toast.error(`Đơn giá xuất của sản phẩm ${item.product_name} không được âm`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        reason,
        notes: notes.trim() || undefined,
        items: selectedItems.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity === '' ? 0 : item.quantity,
          unit_price: item.unit_price === '' ? 0 : item.unit_price,
          notes: item.notes?.trim() || undefined,
        })),
      };

      await api.post('/stock-issues', payload);
      toast.success('Tạo phiếu xuất kho thành công (Trạng thái: Chờ duyệt)!');
      navigate('/admin/stock-issues');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/stock-issues')}
          className="p-2 hover:bg-slate-100 rounded-none text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowUpRight className="text-amber-600" size={26} />
            Tạo phiếu xuất kho mới
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Lập phiếu xuất kho cho hàng hư hỏng, thanh lý, hàng mẫu hoặc dùng nội bộ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main pane (Items list) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800">Danh sách sản phẩm xuất kho</h2>
              <button
                type="button"
                onClick={handleOpenLookup}
                className="flex items-center gap-2 px-4 py-2 border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold text-xs rounded-none transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Chọn sản phẩm
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-none text-slate-400">
                <AlertCircle size={36} className="mb-2 opacity-50 text-slate-400" />
                <p className="text-sm font-medium">Chưa có sản phẩm nào được chọn</p>
                <p className="text-xs mt-0.5">Bấm nút "Chọn sản phẩm" ở trên để tìm kiếm</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50 text-left">
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-4 py-3 w-24 text-center">Tồn kho</th>
                      <th className="px-4 py-3 w-28 text-center">Số lượng xuất</th>
                      <th className="px-4 py-3 w-36">Đơn giá xuất</th>
                      <th className="px-4 py-3 w-36 text-right">Thành tiền</th>
                      <th className="px-4 py-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => (
                      <tr key={item.variant_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-10 h-10 object-cover rounded-none border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate max-w-xs">
                                {item.product_name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap gap-x-2">
                                <span>SKU: {item.sku}</span>
                                {Object.entries(item.attributes).map(([k, v]) => (
                                  <span key={k}>
                                    | {k}: {formatAttributeValue(v)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-medium text-slate-600">
                          {item.stock}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                'quantity',
                                e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            className="w-full px-2 py-1 text-center border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded-none text-sm font-semibold"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  'unit_price',
                                  e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              className="w-full pl-3 pr-6 py-1 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded-none text-sm"
                            />
                            <span className="absolute right-2 top-2 text-xs font-semibold text-slate-400">
                              đ
                            </span>
                          </div>
                          {item.cost_price !== undefined && (
                            <div className="text-[10px] text-slate-400 mt-1 truncate">
                              Giá niêm yết: <span className="font-semibold text-slate-600">{formatCurrency(item.cost_price)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {formatCurrency((item.quantity === '' ? 0 : item.quantity) * (item.unit_price === '' ? 0 : item.unit_price))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-none transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar pane (Reason & Notes & Totals) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Thông tin xuất kho</h2>

            {/* Select Reason */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Lý do xuất kho *</label>
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded-none cursor-pointer"
              >
                <option value="damaged">{REASON_LABELS.damaged.label}</option>
                <option value="expired">{REASON_LABELS.expired.label}</option>
                <option value="sample">{REASON_LABELS.sample.label}</option>
                <option value="internal_use">{REASON_LABELS.internal_use.label}</option>
                <option value="other">{REASON_LABELS.other.label}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ghi chú phiếu xuất</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded-none resize-none"
                placeholder="Ví dụ: Xuất 2 ghế bị gãy chân trong quá trình vận chuyển..."
              />
            </div>

            {/* Summaries */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Số loại sản phẩm:</span>
                <span className="font-semibold text-slate-800">{selectedItems.length} sản phẩm</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tổng số lượng xuất:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedItems.reduce((acc, item) => acc + (item.quantity === '' ? 0 : item.quantity), 0)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-100">
                <span>Tổng giá trị xuất:</span>
                <span className="text-amber-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/stock-issues')}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-center rounded-none cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors text-center rounded-none cursor-pointer"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Tạo phiếu xuất
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Lookup variants Modal */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl p-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowLookupModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-slate-800 mb-4">Tìm kiếm sản phẩm xuất kho</h2>

            {/* Search form in modal */}
            <form onSubmit={handleLookupSearchSubmit} className="flex gap-2 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm, SKU biến thể..."
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-none transition-colors cursor-pointer"
              >
                Tìm
              </button>
            </form>

            {/* Variant list inside modal */}
            <div className="flex-1 overflow-y-auto border border-slate-200">
              {lookupLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="text-amber-600 animate-spin" />
                </div>
              ) : lookupVariants.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Không tìm thấy sản phẩm phù hợp</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600 font-semibold">
                      <th className="px-4 py-2">Sản phẩm</th>
                      <th className="px-4 py-2 text-center w-24">Tồn hiện tại</th>
                      <th className="px-4 py-2 text-right w-28">Giá niêm yết</th>
                      <th className="px-4 py-2 text-center w-20">Chọn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookupVariants.map((variant) => {
                      const price = Number(variant.base_price || 0) + Number(variant.price_adjustment || 0);
                      return (
                        <tr key={variant.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 flex items-center gap-3">
                            <img
                              src={variant.image_url}
                              alt={variant.product_name}
                              className="w-8 h-8 object-cover rounded-none border border-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate max-w-xs">{variant.product_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                SKU: {variant.sku}{' '}
                                {Object.entries(variant.attributes).map(([k, v]) => `| ${k}: ${formatAttributeValue(v)}`)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-medium text-slate-600">
                            {variant.stock}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">
                            {formatCurrency(price)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => addVariantToIssue(variant)}
                              className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600 text-[10px] font-bold rounded-none transition-all cursor-pointer"
                            >
                              Thêm
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowLookupModal(false)}
                className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-none transition-colors cursor-pointer"
              >
                Hoàn tất chọn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
