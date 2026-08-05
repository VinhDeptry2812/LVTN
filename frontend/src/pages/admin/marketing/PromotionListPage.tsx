import { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import useConfirmModal from '@/hooks/useConfirmModal';
import { formatPrice, formatDate } from '@/utils/format';

export interface PromotionCategory {
  id: number;
  name: string;
}

export interface PromotionProduct {
  id: number;
  name: string;
  base_price: number;
}

export interface Promotion {
  id: number;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  apply_type: 'all' | 'category' | 'product';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  categories?: PromotionCategory[];
  products?: PromotionProduct[];
  created_at: string;
}

export default function PromotionListPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  // Available categories & products
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [viewAffectedPromotion, setViewAffectedPromotion] = useState<{
    promo: Promotion;
    products: any[];
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    apply_type: 'all' as 'all' | 'category' | 'product',
    discount_value: 0,
    start_date: '',
    end_date: '',
    is_active: true,
    category_ids: [] as number[],
    product_ids: [] as number[],
  });

  useEffect(() => {
    fetchPromotions();
    fetchOptions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/promotions');
      setPromotions(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách chương trình khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
      ]);
      const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || [];
      const prods = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || [];
      setAllCategories(cats);
      setAllProducts(prods);
    } catch (err) {
      console.error('Lỗi tải danh mục/sản phẩm:', err);
    }
  };

  const formatToLocalDatetime = (dateInput?: string | Date) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleOpenModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        name: promotion.name,
        description: promotion.description || '',
        discount_type: promotion.discount_type,
        apply_type: promotion.apply_type || 'all',
        discount_value: Number(promotion.discount_value),
        start_date: formatToLocalDatetime(promotion.start_date),
        end_date: formatToLocalDatetime(promotion.end_date),
        is_active: promotion.is_active,
        category_ids: promotion.categories?.map((c) => c.id) || [],
        product_ids: promotion.products?.map((p) => p.id) || [],
      });
    } else {
      setEditingPromotion(null);
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);

      setFormData({
        name: '',
        description: '',
        discount_type: 'percentage',
        apply_type: 'all',
        discount_value: 10,
        start_date: formatToLocalDatetime(now),
        end_date: formatToLocalDatetime(nextMonth),
        is_active: true,
        category_ids: [],
        product_ids: [],
      });
    }
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleToggleCategory = (catId: number) => {
    setFormData((prev) => {
      const exists = prev.category_ids.includes(catId);
      return {
        ...prev,
        category_ids: exists
          ? prev.category_ids.filter((id) => id !== catId)
          : [...prev.category_ids, catId],
      };
    });
  };

  const handleToggleProduct = (prodId: number) => {
    setFormData((prev) => {
      const exists = prev.product_ids.includes(prodId);
      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((id) => id !== prodId)
          : [...prev.product_ids, prodId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên chương trình khuyến mãi');
      return;
    }

    if (formData.discount_value <= 0) {
      toast.error('Giá trị giảm phải lớn hơn 0');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    if (formData.apply_type === 'category' && formData.category_ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 danh mục áp dụng');
      return;
    }

    if (formData.apply_type === 'product' && formData.product_ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm áp dụng');
      return;
    }

    const payload = {
      ...formData,
      discount_value: Number(formData.discount_value),
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    try {
      if (editingPromotion) {
        await api.patch(`/promotions/${editingPromotion.id}`, payload);
        toast.success('Cập nhật chương trình khuyến mãi thành công');
      } else {
        await api.post('/promotions', payload);
        toast.success('Thêm mới chương trình khuyến mãi thành công');
      }
      handleCloseModal();
      fetchPromotions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const { confirmModal, openConfirm, closeConfirm } = useConfirmModal();

  const handleDelete = (id: number) => {
    openConfirm({
      title: 'Xóa chương trình khuyến mãi',
      message: 'Bạn có chắc chắn muốn xóa chương trình khuyến mãi này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa chương trình',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/promotions/${id}`);
          toast.success('Xóa chương trình khuyến mãi thành công');
          fetchPromotions();
        } catch (err) {
          console.error(err);
          toast.error('Không thể xóa khuyến mãi này');
        }
      },
    });
  };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      await api.patch(`/promotions/${promotion.id}`, { is_active: !promotion.is_active });
      toast.success(`Đã ${!promotion.is_active ? 'bật' : 'tắt'} chương trình khuyến mãi`);
      fetchPromotions();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thay đổi trạng thái');
    }
  };

  const formatCurrency = formatPrice;

  // Helper lấy toàn bộ ID danh mục (bao gồm chính nó và tất cả danh mục con/cháu trong cây danh mục)
  const getAllDescendantCategoryIds = (selectedCatIds: Set<number>, categoriesTree: any[]): Set<number> => {
    const resultSet = new Set<number>();
    if (!selectedCatIds || selectedCatIds.size === 0) return resultSet;

    const traverse = (node: any, isParentSelected: boolean) => {
      if (!node) return;
      const nodeId = Number(node.id);
      const isSelected = isParentSelected || selectedCatIds.has(nodeId);

      if (isSelected && !isNaN(nodeId)) {
        resultSet.add(nodeId);
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => traverse(child, isSelected));
      }
    };

    categoriesTree.forEach((catNode) => traverse(catNode, false));
    return resultSet;
  };

  const getAffectedProducts = (promo: Promotion) => {
    if (promo.apply_type === 'all') {
      return allProducts;
    }
    if (promo.apply_type === 'product') {
      const prodIds = new Set(promo.products?.map((p) => Number(p.id)) || []);
      return allProducts.filter((p) => prodIds.has(Number(p.id)));
    }
    if (promo.apply_type === 'category') {
      const promoCatIds = new Set(promo.categories?.map((c) => Number(c.id)) || []);
      const validCatIds = getAllDescendantCategoryIds(promoCatIds, allCategories);
      return allProducts.filter((p) => {
        const prodCatId = p.category ? Number(p.category.id) : (p.category_id ? Number(p.category_id) : null);
        return prodCatId !== null && validCatIds.has(prodCatId);
      });
    }
    return [];
  };

  const previewAffectedProducts = useMemo(() => {
    if (formData.apply_type === 'all') {
      return allProducts;
    }
    if (formData.apply_type === 'product') {
      const prodIds = new Set(formData.product_ids);
      return allProducts.filter((p) => prodIds.has(Number(p.id)));
    }
    if (formData.apply_type === 'category') {
      const selectedCatIds = new Set(formData.category_ids);
      const validCatIds = getAllDescendantCategoryIds(selectedCatIds, allCategories);
      return allProducts.filter((p) => {
        const prodCatId = p.category ? Number(p.category.id) : (p.category_id ? Number(p.category_id) : null);
        return prodCatId !== null && validCatIds.has(prodCatId);
      });
    }
    return [];
  }, [formData.apply_type, formData.category_ids, formData.product_ids, allProducts, allCategories]);

  const overlappingPromotions = useMemo(() => {
    if (!formData.start_date || !formData.end_date || previewAffectedProducts.length === 0) {
      return [];
    }

    const formStart = new Date(formData.start_date).getTime();
    const formEnd = new Date(formData.end_date).getTime();
    if (isNaN(formStart) || isNaN(formEnd)) return [];

    const previewProdIds = new Set(previewAffectedProducts.map((p) => Number(p.id)));

    return promotions.filter((promo) => {
      // Bỏ qua chính nó nếu đang ở chế độ chỉnh sửa
      if (editingPromotion && promo.id === editingPromotion.id) return false;
      if (!promo.is_active) return false;

      // Kiểm tra trùng lặp khoảng thời gian
      const promoStart = new Date(promo.start_date).getTime();
      const promoEnd = new Date(promo.end_date).getTime();
      const isDateOverlapped = formStart <= promoEnd && formEnd >= promoStart;
      if (!isDateOverlapped) return false;

      // Kiểm tra trùng lặp sản phẩm
      const promoAffectedProds = getAffectedProducts(promo);
      return promoAffectedProds.some((p) => previewProdIds.has(Number(p.id)));
    });
  }, [
    formData.start_date,
    formData.end_date,
    previewAffectedProducts,
    promotions,
    editingPromotion,
    allCategories,
    allProducts,
  ]);

  const filteredProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-none border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản lý Chương trình Khuyến mãi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tạo và quản lý các chương trình tự động giảm giá sản phẩm/danh mục không cần mã code
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-none shadow-sm transition-all"
        >
          Tạo khuyến mãi mới
        </button>
      </div>

      {/* Promotion List Table */}
      <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium text-sm">
            Đang tải danh sách chương trình khuyến mãi...
          </div>
        ) : promotions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium text-sm">
            Chưa có chương trình khuyến mãi nào. Hãy tạo khuyến mãi đầu tiên!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tên chương trình</th>
                  <th className="py-3.5 px-4">Mức giảm</th>
                  <th className="py-3.5 px-4">Phạm vi áp dụng</th>
                  <th className="py-3.5 px-4">Thời gian hiệu lực</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {promotions.map((promo) => {
                  const now = new Date();
                  const isExpired = new Date(promo.end_date) < now;
                  const isUpcoming = new Date(promo.start_date) > now;

                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{promo.name}</p>
                        {promo.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {promo.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-600">
                          {promo.discount_type === 'percentage'
                            ? `-${promo.discount_value}%`
                            : `-${formatCurrency(promo.discount_value)}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {promo.apply_type === 'all' && (
                          <span className="inline-block px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200">
                            Toàn bộ cửa hàng
                          </span>
                        )}
                        {promo.apply_type === 'category' && (
                          <div>
                            <span className="inline-block px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                              Theo danh mục ({promo.categories?.length || 0})
                            </span>
                          </div>
                        )}
                        {promo.apply_type === 'product' && (
                          <div>
                            <span className="inline-block px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200">
                              Theo sản phẩm ({promo.products?.length || 0})
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setViewAffectedPromotion({
                              promo,
                              products: getAffectedProducts(promo),
                            })
                          }
                          className="mt-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline block"
                        >
                          Xem {getAffectedProducts(promo).length} sản phẩm áp dụng →
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 space-y-0.5">
                        <p>
                          <span className="font-semibold text-slate-700">Từ:</span> {formatDate(promo.start_date)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">Đến:</span> {formatDate(promo.end_date)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isExpired ? (
                          <span className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200">
                            Đã hết hạn
                          </span>
                        ) : isUpcoming ? (
                          <span className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
                            Sắp diễn ra
                          </span>
                        ) : promo.is_active ? (
                          <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            Đang chạy
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
                            Đã tạm dừng
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleActive(promo)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-none border transition-colors ${
                            promo.is_active
                              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {promo.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => handleOpenModal(promo)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add/Edit Promotion */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-800">
                {editingPromotion ? 'Chỉnh sửa chương trình khuyến mãi' : 'Tạo chương trình khuyến mãi mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên chương trình khuyến mãi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giảm giá Chào Hè 20% Toàn Bộ Sản Phẩm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả chương trình khuyến mãi dành cho khách hàng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại giảm giá</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as 'percentage' | 'fixed_amount',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá trị giảm ({formData.discount_type === 'percentage' ? '%' : 'VNĐ'}){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.discount_value || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phạm vi áp dụng</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Toàn bộ cửa hàng' },
                    { id: 'category', label: 'Theo Danh mục' },
                    { id: 'product', label: 'Theo Sản phẩm' },
                  ].map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-center justify-center p-2.5 border text-xs font-semibold cursor-pointer transition-all ${
                        formData.apply_type === type.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="apply_type"
                        value={type.id}
                        checked={formData.apply_type === type.id}
                        onChange={() =>
                          setFormData({ ...formData, apply_type: type.id as any })
                        }
                        className="sr-only"
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Selector */}
              {formData.apply_type === 'category' && (
                <div className="p-4 border border-purple-200 bg-purple-50/50 space-y-2">
                  <label className="block text-xs font-bold text-purple-900">
                    Chọn danh mục áp dụng khuyến mãi <span className="text-rose-500">*</span>
                  </label>
                  {allCategories.length === 0 ? (
                    <p className="text-xs text-slate-500">Chưa có danh mục nào.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2 bg-white p-3 border border-purple-200">
                      {allCategories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-indigo-600"
                        >
                          <input
                            type="checkbox"
                            checked={formData.category_ids.includes(cat.id)}
                            onChange={() => handleToggleCategory(cat.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Product Selector */}
              {formData.apply_type === 'product' && (
                <div className="p-4 border border-teal-200 bg-teal-50/50 space-y-2">
                  <label className="block text-xs font-bold text-teal-900">
                    Chọn sản phẩm áp dụng khuyến mãi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm theo tên..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-teal-300 focus:outline-none focus:border-teal-500 bg-white"
                  />
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-slate-500">Không tìm thấy sản phẩm nào.</p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-2 bg-white p-3 border border-teal-200">
                      {filteredProducts.map((prod) => (
                        <label
                          key={prod.id}
                          className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer hover:text-teal-700"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.product_ids.includes(prod.id)}
                              onChange={() => handleToggleProduct(prod.id)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>{prod.name}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            {formatCurrency(Number(prod.base_price))}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Real-time Preview Box */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span>
                    Sản phẩm dự kiến áp dụng ({previewAffectedProducts.length}):
                  </span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    Mức giảm:{' '}
                    {formData.discount_type === 'percentage'
                      ? `${formData.discount_value}%`
                      : formatCurrency(Number(formData.discount_value))}
                  </span>
                </div>

                {previewAffectedProducts.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">
                    Chưa chọn phạm vi hoặc chưa có sản phẩm nào thuộc phạm vi được chọn.
                  </p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {previewAffectedProducts.map((p) => {
                      const base = Number(p.base_price);
                      const val = Number(formData.discount_value);
                      const disc =
                        formData.discount_type === 'percentage'
                          ? Math.round(base - (base * val) / 100)
                          : Math.max(0, base - val);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-white px-2.5 py-1 border border-emerald-200 text-xs shadow-xs"
                        >
                          <div className="truncate max-w-[220px]">
                            <span className="font-semibold text-slate-800">{p.name}</span>
                            {p.category && (
                              <span className="text-[10px] text-slate-400 block">{p.category.name}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="line-through text-slate-400 text-[11px] mr-1.5">
                              {formatCurrency(base)}
                            </span>
                            <span className="font-bold text-emerald-600">{formatCurrency(disc)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box Cảnh báo Trùng lặp Khuyến mãi */}
              {overlappingPromotions.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <span>⚠️ Phát hiện {overlappingPromotions.length} khuyến mãi khác trùng thời gian & sản phẩm:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-1 text-amber-800">
                    {overlappingPromotions.map((p) => (
                      <li key={p.id} className="leading-tight">
                        <span className="font-semibold">{p.name}</span> (
                        {p.discount_type === 'percentage'
                          ? `-${p.discount_value}%`
                          : `-${formatCurrency(Number(p.discount_value))}`}
                        ) — Từ {formatDate(p.start_date)} đến {formatDate(p.end_date)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] italic text-amber-700 font-medium pt-0.5">
                    * Lưu ý: Hệ thống sẽ tự động so sánh và áp dụng mức giá giảm ưu đãi nhất (thấp nhất) cho khách hàng đối với các sản phẩm bị trùng lặp.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời gian bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời gian kết thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt chương trình ngay lập tức
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {editingPromotion ? 'Lưu cập nhật' : 'Tạo khuyến mãi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Affected Products Modal */}
      {viewAffectedPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Sản phẩm áp dụng: {viewAffectedPromotion.promo.name}
                </h3>
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                  Mức giảm:{' '}
                  {viewAffectedPromotion.promo.discount_type === 'percentage'
                    ? `-${viewAffectedPromotion.promo.discount_value}%`
                    : `-${formatCurrency(viewAffectedPromotion.promo.discount_value)}`}
                </p>
              </div>
              <button
                onClick={() => setViewAffectedPromotion(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <p className="text-xs font-semibold text-slate-500">
                Danh sách {viewAffectedPromotion.products.length} sản phẩm áp dụng giá giảm:
              </p>
              {viewAffectedPromotion.products.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Không có sản phẩm nào thuộc phạm vi này.</p>
              ) : (
                viewAffectedPromotion.products.map((p) => {
                  const base = Number(p.base_price);
                  const val = Number(viewAffectedPromotion.promo.discount_value);
                  const disc =
                    viewAffectedPromotion.promo.discount_type === 'percentage'
                      ? Math.round(base - (base * val) / 100)
                      : Math.max(0, base - val);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        {p.category && (
                          <span className="text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 border border-indigo-100 font-medium inline-block mt-0.5">
                            {p.category.name}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="line-through text-slate-400 text-[11px]">{formatCurrency(base)}</p>
                        <p className="font-bold text-emerald-600 text-sm">{formatCurrency(disc)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewAffectedPromotion(null)}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmModal} onCancel={closeConfirm} />
    </div>
  );
}
