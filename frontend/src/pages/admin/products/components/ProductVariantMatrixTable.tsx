import React from 'react';
import { Plus, RefreshCw, Copy, Trash2, Upload, AlertCircle } from 'lucide-react';
import type { VariantInput, ProductImageInput } from '../types';
import { PRESET_COLORS } from '../types';
import { SelectImageFromLibraryPopover } from './ProductPopovers';

interface ProductVariantMatrixTableProps {
  variants: VariantInput[];
  variantAttrKeys: string[];
  productImages: ProductImageInput[];
  simpleStock: string;
  simpleImportPrice: string;
  setSimpleStock: (val: string) => void;
  setSimpleImportPrice: (val: string) => void;
  addVariant: () => void;
  duplicateVariant: (index: number) => void;
  removeVariant: (index: number) => void;
  handleAutoSyncAllVariantSkus: () => void;
  handleAutoSyncVariantSku: (index: number) => void;
  handleVariantFieldChange: (
    index: number,
    field: 'sku' | 'stock' | 'import_price' | 'price_adjustment',
    value: string
  ) => void;
  handleVariantImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeVariantImage: (index: number) => void;
  handleVariantAttrChange: (index: number, attrKey: string, value: string) => void;
  handleSelectImageFromLibraryForVariant: (vIdx: number, url: string, file?: File) => void;
}

export const ProductVariantMatrixTable: React.FC<ProductVariantMatrixTableProps> = ({
  variants,
  variantAttrKeys,
  productImages,
  simpleStock,
  simpleImportPrice,
  setSimpleStock,
  setSimpleImportPrice,
  addVariant,
  duplicateVariant,
  removeVariant,
  handleAutoSyncAllVariantSkus,
  handleAutoSyncVariantSku,
  handleVariantFieldChange,
  handleVariantImageUpload,
  removeVariantImage,
  handleVariantAttrChange,
  handleSelectImageFromLibraryForVariant,
}) => {
  return (
    <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {variantAttrKeys.length > 0 ? 'Danh sách các phiên bản (Biến thể)' : 'Kho hàng & Giá nhập'}
          </h2>
          <p className="text-xs text-slate-500">
            {variantAttrKeys.length > 0
              ? 'Thiết lập SKU, số lượng tồn kho, giá chênh lệch và hình ảnh riêng cho từng phiên bản.'
              : 'Thiết lập số lượng tồn kho ban đầu và giá nhập gốc cho sản phẩm đơn.'}
          </p>
        </div>

        {variantAttrKeys.length > 0 && (
          <div className="flex items-center gap-2">
            {variants.length > 0 && (
              <button
                type="button"
                onClick={handleAutoSyncAllVariantSkus}
                className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-none flex items-center gap-1 cursor-pointer transition-colors"
                title="Tự động tạo lại mã SKU chuẩn cho toàn bộ danh sách biến thể"
              >
                <RefreshCw size={12} /> Đồng bộ SKU tất cả
              </button>
            )}
            <button
              type="button"
              onClick={addVariant}
              className="px-3 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-none flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={14} /> Thêm phiên bản
            </button>
          </div>
        )}
      </div>

      {/* Trường hợp Sản phẩm đơn (Không có thuộc tính) */}
      {variantAttrKeys.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tồn kho ban đầu
            </label>
            <input
              type="number"
              value={simpleStock}
              onChange={(e) => setSimpleStock(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Giá nhập gốc (đ)
            </label>
            <input
              type="number"
              value={simpleImportPrice}
              onChange={(e) => setSimpleImportPrice(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>
      ) : variants.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-none bg-slate-50/50">
          <p className="text-xs text-slate-500 mb-2">Chưa có phiên bản nào được tạo.</p>
          <button
            type="button"
            onClick={addVariant}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-none hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Tạo phiên bản đầu tiên
          </button>
        </div>
      ) : (
        /* Bảng Danh sách Biến thể */
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-10 text-center">STT</th>
                <th className="p-2.5 min-w-[80px] w-24">Hình ảnh</th>
                {variantAttrKeys.map((key) => (
                  <th key={key} className="p-2.5 min-w-[120px]">
                    {key} <span className="text-red-500">*</span>
                  </th>
                ))}
                <th className="p-2.5 min-w-[140px]">
                  Mã SKU <span className="text-red-500">*</span>
                </th>
                <th className="p-2.5 w-24">Giá chênh lệch (đ)</th>
                <th className="p-2.5 w-20">Tồn kho</th>
                <th className="p-2.5 w-24">Giá nhập (đ)</th>
                <th className="p-2.5 w-20 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {variants.map((v, vIdx) => {
                const displayImage = v.preview_url || v.image_url;

                return (
                  <tr key={vIdx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-400 text-[11px]">{vIdx + 1}</td>

                    {/* Hình ảnh biến thể */}
                    <td className="p-2.5">
                      <div className="flex flex-col items-center">
                        <div className="relative w-12 h-12 border border-slate-300 rounded-none overflow-hidden bg-slate-100 group">
                          {displayImage ? (
                            <>
                              <img src={displayImage} alt={`Variant ${vIdx}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeVariantImage(vIdx)}
                                className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                title="Xóa ảnh phiên bản"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-blue-600 transition-colors">
                              <Upload size={14} />
                              <span className="text-[8px] font-semibold mt-0.5">Tải ảnh</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleVariantImageUpload(vIdx, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Chọn từ thư viện ảnh sản phẩm */}
                        <SelectImageFromLibraryPopover
                          productImages={productImages}
                          onSelectImage={(url, file) => handleSelectImageFromLibraryForVariant(vIdx, url, file)}
                        />
                      </div>
                    </td>

                    {/* Các cột Thuộc tính */}
                    {variantAttrKeys.map((attrKey) => {
                      const isColorAttr = attrKey.toLowerCase().includes('màu');
                      const currentVal = v.attributes[attrKey] || '';
                      const textVal = currentVal.includes('|') ? currentVal.split('|')[0] : currentVal;
                      const hexVal = currentVal.includes('|') ? currentVal.split('|')[1] : '#ffffff';

                      return (
                        <td key={attrKey} className="p-2.5">
                          {isColorAttr ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={textVal}
                                onChange={(e) => {
                                  const newVal = hexVal ? `${e.target.value}|${hexVal}` : e.target.value;
                                  handleVariantAttrChange(vIdx, attrKey, newVal);
                                }}
                                placeholder="VD: Trắng"
                                className="w-full px-2 py-1 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                              />

                              {/* Dropdown Preset Màu sắc */}
                              <div className="flex items-center gap-1">
                                <span
                                  className="w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-sm"
                                  style={{ backgroundColor: hexVal }}
                                />
                                <select
                                  value={hexVal}
                                  onChange={(e) => {
                                    const selectedHex = e.target.value;
                                    const matched = PRESET_COLORS.find((c) => c.hex === selectedHex);
                                    const nameToUse = textVal || matched?.name || 'Màu';
                                    handleVariantAttrChange(vIdx, attrKey, `${nameToUse}|${selectedHex}`);
                                  }}
                                  className="w-full text-[10px] px-1 py-0.5 border border-slate-200 rounded-none bg-slate-50 text-slate-700"
                                >
                                  {PRESET_COLORS.map((c) => (
                                    <option key={c.hex} value={c.hex}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={currentVal}
                              onChange={(e) => handleVariantAttrChange(vIdx, attrKey, e.target.value)}
                              placeholder={`Nhập ${attrKey}`}
                              className="w-full px-2 py-1 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                            />
                          )}
                        </td>
                      );
                    })}

                    {/* Cột SKU với nút Tự đồng bộ SKU */}
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => handleVariantFieldChange(vIdx, 'sku', e.target.value)}
                          placeholder="Mã SKU"
                          className="w-full px-2 py-1 border border-slate-300 rounded-none text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAutoSyncVariantSku(vIdx)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Tự động đồng bộ SKU dựa theo thuộc tính"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Cột Giá chênh lệch */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={v.price_adjustment}
                        onChange={(e) => handleVariantFieldChange(vIdx, 'price_adjustment', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>

                    {/* Cột Tồn kho */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={v.stock}
                        onChange={(e) => handleVariantFieldChange(vIdx, 'stock', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>

                    {/* Cột Giá nhập */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={v.import_price || ''}
                        onChange={(e) => handleVariantFieldChange(vIdx, 'import_price', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-slate-300 rounded-none text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>

                    {/* Cột Thao tác (Copy / Xóa) */}
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateVariant(vIdx)}
                          className="p-1 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Nhân bản phiên bản này"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeVariant(vIdx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Xóa phiên bản này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
