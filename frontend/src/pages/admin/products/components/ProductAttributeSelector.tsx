import React from 'react';
import { Plus, X, Tag } from 'lucide-react';

interface ProductAttributeSelectorProps {
  variantAttrKeys: string[];
  showAddAttr: boolean;
  newAttrKey: string;
  setShowAddAttr: (show: boolean) => void;
  setNewAttrKey: (key: string) => void;
  handleAddAttr: () => void;
  removeVariantAttrKey: (key: string) => void;
}

export const ProductAttributeSelector: React.FC<ProductAttributeSelectorProps> = ({
  variantAttrKeys,
  showAddAttr,
  newAttrKey,
  setShowAddAttr,
  setNewAttrKey,
  handleAddAttr,
  removeVariantAttrKey,
}) => {
  return (
    <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Thuộc tính biến thể</h2>
          <p className="text-xs text-slate-500">
            Thêm các thuộc tính giúp khách hàng lựa chọn (VD: Màu sắc, Kích thước, Chất liệu).
          </p>
        </div>

        {!showAddAttr && (
          <button
            type="button"
            onClick={() => setShowAddAttr(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-none flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Thêm thuộc tính mới
          </button>
        )}
      </div>

      {/* Inline Thêm thuộc tính */}
      {showAddAttr && (
        <div className="p-3 mb-4 bg-slate-50 border border-slate-200 space-y-2">
          <div className="text-xs font-bold text-slate-700">Tên thuộc tính mới:</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newAttrKey}
              onChange={(e) => setNewAttrKey(e.target.value)}
              placeholder="VD: Màu sắc, Kích thước, Chất liệu..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAttr();
                }
              }}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddAttr}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-none transition-colors cursor-pointer"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddAttr(false);
                setNewAttrKey('');
              }}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-none transition-colors cursor-pointer"
            >
              Hủy
            </button>
          </div>

          {/* Preset nhanh */}
          <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
            <span>Gợi ý nhanh:</span>
            {['Màu sắc', 'Kích thước', 'Chất liệu', 'Loại gỗ'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setNewAttrKey(preset);
                }}
                className="px-2 py-0.5 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-none transition-colors"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hiển thị các thuộc tính đã định nghĩa */}
      {variantAttrKeys.length === 0 ? (
        <div className="text-center py-4 text-xs text-slate-400 italic">
          Sản phẩm hiện chưa phân loại theo thuộc tính (Sản phẩm đơn). Bấm &quot;Thêm thuộc tính mới&quot; nếu sản phẩm có nhiều phiên bản.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {variantAttrKeys.map((key) => (
            <div
              key={key}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-none"
            >
              <Tag size={12} className="text-slate-500" />
              <span>{key}</span>
              <button
                type="button"
                onClick={() => removeVariantAttrKey(key)}
                className="text-slate-400 hover:text-red-600 ml-1 transition-colors cursor-pointer"
                title={`Xóa thuộc tính ${key}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
