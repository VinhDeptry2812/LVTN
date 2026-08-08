import {
  RefreshCw,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import TiptapEditor from '../../../../components/TiptapEditor';
import type { Category, SpecRow } from '../types';

interface ProductBasicInfoFormProps {
  form: {
    sku: string;
    name: string;
    slug: string;
    description: string;
    base_price: string;
    discount_price: string;
    category_id: string;
    is_active: boolean;
    is_bulky: boolean;
  };
  validationErrors: Record<string, string>;
  skuManuallyEdited: boolean;
  categories: Category[];
  collections: { id: number; name: string }[];
  selectedCollectionIds: number[];
  specs: SpecRow[];
  descTab: 'edit' | 'preview';
  aiLoading: boolean;
  setDescTab: (tab: 'edit' | 'preview') => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  validateField: (field: string, val: string) => void;
  handleResetAutoSku: () => void;
  handleCollectionToggle: (id: number) => void;
  handleAiGenerate: () => void;
  addSpec: () => void;
  removeSpec: (index: number) => void;
  handleSpecChange: (index: number, field: 'key' | 'value', val: string) => void;
}

export const ProductBasicInfoForm: React.FC<ProductBasicInfoFormProps> = ({
  form,
  validationErrors,
  skuManuallyEdited,
  categories,
  collections,
  selectedCollectionIds,
  specs,
  descTab,
  aiLoading,
  setDescTab,
  handleChange,
  setForm,
  validateField,
  handleResetAutoSku,
  handleCollectionToggle,
  handleAiGenerate,
  addSpec,
  removeSpec,
  handleSpecChange,
}) => {

  return (
    <div className="space-y-6">
      {/* KHỐI 1: THÔNG TIN SẢN PHẨM & PHÂN LOẠI */}
      <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>Thông tin cơ bản & Phân loại</span>
          <span className="text-xs text-slate-400 font-normal">Bước 1: Thiết lập tên, SKU và danh mục</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={(e) => validateField('name', e.target.value)}
              placeholder="VD: Ghế Sofa Bằng Da Cao Cấp Milano"
              className={`w-full px-3 py-2 border rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none ${
                validationErrors.name ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            />
            {validationErrors.name && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Đường dẫn (Slug)
            </label>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="ghe-sofa-bang-da-cao-cap-milano"
              className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none bg-slate-50 text-slate-600 font-mono text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mã SKU gốc <span className="text-red-500">*</span>
              </label>
              {skuManuallyEdited && (
                <button
                  type="button"
                  onClick={handleResetAutoSku}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5 cursor-pointer"
                  title="Khôi phục tính năng tự động tạo mã SKU từ Danh mục & Tên"
                >
                  <RefreshCw size={10} /> Bật tự sinh SKU
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                onBlur={(e) => validateField('sku', e.target.value)}
                placeholder="VD: SF-MILANO-001"
                className={`w-full px-3 py-2 border rounded-none text-sm font-mono focus:ring-1 focus:ring-slate-900 focus:outline-none uppercase ${
                  validationErrors.sku ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
              {!skuManuallyEdited && form.sku && (
                <span className="absolute right-2 top-2.5 text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-none pointer-events-none">
                  Tự động
                </span>
              )}
            </div>
            {validationErrors.sku && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {validationErrors.sku}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Danh mục sản phẩm <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              onBlur={(e) => validateField('category_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none ${
                validationErrors.category_id ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {'\u00A0\u00A0'.repeat(cat.level || 0)}
                  {cat.level && cat.level > 0 ? '└─ ' : ''}
                  {cat.name}
                </option>
              ))}
            </select>
            {validationErrors.category_id && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {validationErrors.category_id}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Bộ sưu tập
            </label>
            <div className="border border-slate-300 rounded-none p-3 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50/50">
              {collections.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Chưa có bộ sưu tập nào</span>
              ) : (
                collections.map((col) => (
                  <label key={col.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={selectedCollectionIds.includes(col.id)}
                      onChange={() => handleCollectionToggle(col.id)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>{col.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-6 pt-2 border-t border-slate-100 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="w-4 h-4 rounded-none border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-sm font-medium text-slate-700">Đang kinh doanh (Hiển thị công khai)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_bulky"
                checked={form.is_bulky}
                onChange={handleChange}
                className="w-4 h-4 rounded-none border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-slate-700">Hàng cồng kềnh (Phí vận chuyển riêng)</span>
            </label>
          </div>
        </div>
      </div>

      {/* KHỐI 2: GIÁ BÁN & THIẾT LẬP GIA */}
      <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>Giá bán & Thiết lập giá</span>
          <span className="text-xs text-slate-400 font-normal">Bước 2: Thiết lập giá bán gốc sản phẩm</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Giá bán niêm yết (đ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="base_price"
              value={form.base_price}
              onChange={handleChange}
              onBlur={(e) => validateField('base_price', e.target.value)}
              placeholder="VD: 5000000"
              className={`w-full px-3 py-2 border rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none ${
                validationErrors.base_price ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            />
            {validationErrors.base_price && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {validationErrors.base_price}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Giá khuyến mãi (đ)
              </label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 italic">
                <HelpCircle size={10} /> Đã vô hiệu hóa
              </span>
            </div>
            <input
              type="number"
              name="discount_price"
              value={form.discount_price}
              disabled
              onChange={handleChange}
              placeholder="Quản lý tự động qua Khuyến mãi"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-100/80 text-slate-400 rounded-none text-sm cursor-not-allowed font-medium select-none"
            />
            <p className="text-[11px] text-slate-400 mt-1 italic">
              * Giá khuyến mãi được quản lý tự động thông qua Module Chương trình Khuyến mãi / Mã giảm giá.
            </p>
          </div>
        </div>
      </div>

      {/* KHỐI 3: THÔNG SỐ KỸ THUẬT */}
      <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Thông số kỹ thuật</h2>
            <p className="text-xs text-slate-500">Cấu hình thông số sản phẩm như Kích thước, Chất liệu, Cân nặng... Ô giá trị hỗ trợ nhập nhiều dòng văn bản.</p>
          </div>
          <button
            type="button"
            onClick={addSpec}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-none flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Thêm dòng
          </button>
        </div>

        <div className="space-y-3">
          {specs.map((spec, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                placeholder="Tên thông số (VD: Chất liệu)"
                value={spec.key}
                onChange={(e) => handleSpecChange(i, 'key', e.target.value)}
                className="w-1/3 px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none font-semibold text-slate-800"
              />
              <textarea
                rows={2}
                placeholder="Giá trị thông số (Nhập văn bản nhiều dòng...)"
                value={spec.value}
                onChange={(e) => handleSpecChange(i, 'value', e.target.value)}
                className="w-2/3 px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none resize-y min-h-[64px] font-normal text-slate-700 leading-relaxed"
              />
              <button
                type="button"
                onClick={() => removeSpec(i)}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors cursor-pointer mt-1"
                title="Xóa thông số này"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* KHỐI 4: MÔ TẢ CHI TIẾT SẢN PHẨM */}
      <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Mô tả sản phẩm</h2>
            <p className="text-xs text-slate-500">Soạn thảo nội dung chi tiết bài viết giới thiệu sản phẩm bằng trình biên tập Rich Text.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-none text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles size={14} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'AI đang viết...' : 'Tự động viết bằng AI'}
            </button>
            <div className="flex bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setDescTab('edit')}
                className={`px-3 py-1 text-xs font-semibold ${descTab === 'edit' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setDescTab('preview')}
                className={`px-3 py-1 text-xs font-semibold ${descTab === 'preview' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Xem trước
              </button>
            </div>
          </div>
        </div>

        {descTab === 'edit' ? (
          <TiptapEditor
            value={form.description}
            onChange={(val) => setForm((prev: any) => ({ ...prev, description: val }))}
            placeholder="Nhập mô tả chi tiết sản phẩm..."
          />
        ) : (
          <div
            className="prose prose-sm max-w-none p-4 border border-slate-200 bg-slate-50/50 min-h-[250px] rounded-xl"
            dangerouslySetInnerHTML={{ __html: form.description || '<p class="text-slate-400 italic">Chưa có nội dung mô tả</p>' }}
          />
        )}
      </div>
    </div>
  );
};
