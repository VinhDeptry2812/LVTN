/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Search, Loader2, ArrowLeft, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { formatAttributeValue } from '@/utils/format';

interface Supplier {
  id: number;
  name: string;
  is_active: boolean;
}

interface Variant {
  id: number;
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  product_name: string;
  image_url: string;
}

interface SelectedItem {
  variant_id: number;
  sku: string;
  product_name: string;
  attributes: Record<string, string>;
  image_url: string;
  quantity: number | '';
  import_price: number | '';
}

export default function PurchaseOrderCreatePage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal variant lookup state
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [lookupVariants, setLookupVariants] = useState<Variant[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.get('/suppliers', { params: { page: 1, limit: 100 } });
        setSuppliers(res.data.data.filter((s: Supplier) => s.is_active));
      } catch {
        toast.error('Không thể tải danh sách nhà cung cấp');
      }
    };
    fetchSuppliers();
  }, []);

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

  const addVariantToOrder = (variant: Variant) => {
    if (selectedItems.some((item) => item.variant_id === variant.id)) {
      toast.error('Sản phẩm này đã được thêm vào đơn nhập!');
      return;
    }

    const newItem: SelectedItem = {
      variant_id: variant.id,
      sku: variant.sku,
      product_name: variant.product_name,
      attributes: variant.attributes,
      image_url: variant.image_url,
      quantity: 1,
      import_price: 0,
    };

    setSelectedItems((prev) => [...prev, newItem]);
    toast.success('Đã thêm sản phẩm');
  };

  const handleItemChange = (index: number, field: 'quantity' | 'import_price', value: number | '') => {
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
      const price = item.import_price === '' ? 0 : item.import_price;
      return acc + qty * price;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Vui lòng chọn nhà cung cấp!');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm cần nhập!');
      return;
    }

    // Validation
    for (const item of selectedItems) {
      const qty = item.quantity === '' ? 0 : item.quantity;
      const price = item.import_price === '' ? 0 : item.import_price;
      if (qty <= 0) {
        toast.error(`Số lượng sản phẩm ${item.product_name} phải lớn hơn 0`);
        return;
      }
      if (price < 0) {
        toast.error(`Giá nhập sản phẩm ${item.product_name} không được âm`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: Number(selectedSupplierId),
        notes: notes.trim() || undefined,
        items: selectedItems.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity === '' ? 0 : item.quantity,
          import_price: item.import_price === '' ? 0 : item.import_price,
        })),
      };

      await api.post('/purchase-orders', payload);
      toast.success('Lập đơn nhập hàng thành công!');
      navigate('/admin/purchase-orders');
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
          onClick={() => navigate('/admin/purchase-orders')}
          className="p-2 hover:bg-slate-100 rounded-none text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tạo đơn nhập hàng mới</h1>
          <p className="text-sm text-slate-500 mt-0.5">Lập phiếu nhập hàng để bổ sung số lượng tồn kho sản phẩm</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main pane (Items list) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800">Danh sách sản phẩm nhập</h2>
              <button
                type="button"
                onClick={handleOpenLookup}
                className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs rounded-none transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Chọn sản phẩm
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-none text-slate-400">
                <AlertCircle size={36} className="mb-2 opacity-50 text-slate-400" />
                <p className="text-sm font-medium">Chưa có sản phẩm nào được chọn</p>
                <p className="text-xs mt-0.5">Bấm nút "Chọn sản phẩm" ở góc trên để tìm kiếm</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50 text-left">
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-4 py-3 w-28 text-center">Số lượng</th>
                      <th className="px-4 py-3 w-40">Đơn giá nhập</th>
                      <th className="px-4 py-3 w-36 text-right">Thành tiền</th>
                      <th className="px-4 py-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => (
                      <tr key={item.variant_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 flex items-center gap-3">
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="w-10 h-10 object-cover rounded-none border border-slate-200"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate max-w-xs md:max-w-sm">
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
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-2 py-1 text-center border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={item.import_price}
                              onChange={(e) => handleItemChange(index, 'import_price', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-full pl-3 pr-8 py-1 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none text-sm"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                              đ
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {formatCurrency((item.quantity === '' ? 0 : item.quantity) * (item.import_price === '' ? 0 : item.import_price))}
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

        {/* Right Sidebar pane (Supplier & Totals) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-none p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">Thông tin đơn nhập</h2>

            {/* Select Supplier */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nhà cung cấp *</label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none cursor-pointer"
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Chưa có nhà cung cấp hoạt động nào. Vui lòng tạo nhà cung cấp trước!
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ghi chú đơn nhập</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none resize-none"
                placeholder="Ví dụ: Đơn nhập hàng Sofa gỗ tần bì đợt 1 tháng 7"
              />
            </div>

            {/* Summaries */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tổng số mặt hàng:</span>
                <span className="font-semibold text-slate-800">{selectedItems.length} mặt hàng</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tổng số lượng nhập:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedItems.reduce((acc, item) => acc + (item.quantity === '' ? 0 : item.quantity), 0)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-100">
                <span>Tổng tiền hàng:</span>
                <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/purchase-orders')}
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
                Lập đơn nhập
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

            <h2 className="text-lg font-bold text-slate-800 mb-4">Tìm kiếm và chọn sản phẩm</h2>

            {/* Search form in modal */}
            <form onSubmit={handleLookupSearchSubmit} className="flex gap-2 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm, SKU biến thể..."
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-none border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <Loader2 size={24} className="text-blue-600 animate-spin" />
                </div>
              ) : lookupVariants.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Không tìm thấy sản phẩm phù hợp</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600 font-semibold">
                      <th className="px-4 py-2">Sản phẩm</th>
                      <th className="px-4 py-2 text-center w-24">Tồn hiện tại</th>
                      <th className="px-4 py-2 text-center w-20">Chọn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookupVariants.map((variant) => (
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
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => addVariantToOrder(variant)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-[10px] font-bold rounded-none transition-all cursor-pointer"
                          >
                            Thêm
                          </button>
                        </td>
                      </tr>
                    ))}
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
