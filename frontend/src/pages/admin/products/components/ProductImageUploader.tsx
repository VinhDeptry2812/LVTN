import React from 'react';
import { Upload, Trash2, Move, AlertCircle } from 'lucide-react';
import type { ProductImageInput, VariantInput } from '../types';
import { VariantMultiSelectPopover } from './ProductPopovers';

interface ProductImageUploaderProps {
  productImages: ProductImageInput[];
  variants: VariantInput[];
  uploadingImage: boolean;
  isFileDragOver: boolean;
  draggedImageIndex: number | null;
  handleImagesUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileDragOver: (e: React.DragEvent) => void;
  handleFileDragLeave: () => void;
  handleFileDrop: (e: React.DragEvent) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (index: number) => void;
  setPrimaryImage: (index: number) => void;
  setHoverImage: (index: number) => void;
  removeImage: (index: number) => void;
  handleImageVariantMultiSelect: (imgIndex: number, newIndices: number[]) => void;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  productImages,
  variants,
  uploadingImage,
  isFileDragOver,
  draggedImageIndex,
  handleImagesUpload,
  handleFileDragOver,
  handleFileDragLeave,
  handleFileDrop,
  handleDragStart,
  handleDragOver,
  handleDrop,
  setPrimaryImage,
  setHoverImage,
  removeImage,
  handleImageVariantMultiSelect,
}) => {
  return (
    <div className="bg-white p-6 rounded-none shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Hình ảnh sản phẩm</h2>
          <p className="text-xs text-slate-500">
            Tải lên ít nhất 1 hình ảnh. Kéo thả để thay đổi thứ tự. Ảnh đầu tiên làm đại diện.
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700">
          Đã chọn: {productImages.length} ảnh
        </span>
      </div>

      {/* Vùng Drag & Drop Tải ảnh */}
      <div
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className={`border-2 border-dashed rounded-none p-6 text-center transition-colors mb-4 relative cursor-pointer ${
          isFileDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImagesUpload}
          disabled={uploadingImage}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <Upload className={`w-8 h-8 ${isFileDragOver ? 'text-blue-500' : 'text-slate-400'}`} />
          <div className="text-xs text-slate-600">
            <span className="font-bold text-blue-600">Nhấp để chọn ảnh</span> hoặc kéo thả file ảnh vào đây
          </div>
          <p className="text-[10px] text-slate-400">Hỗ trợ PNG, JPG, WEBP. Ảnh tự động tối ưu & nén dung lượng.</p>
        </div>
      </div>

      {/* Grid danh sách hình ảnh */}
      {productImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {productImages.map((img, index) => {
            const currentSelectedIndices = img.variant_indices || (img.variant_index !== undefined ? [img.variant_index] : []);
            return (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`group relative border rounded-none overflow-hidden bg-slate-50 flex flex-col justify-between transition-all ${
                  draggedImageIndex === index ? 'opacity-40 border-dashed border-blue-500' : 'border-slate-200'
                } ${img.is_primary ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
              >
                <div className="relative aspect-square overflow-hidden bg-white">
                  <img src={img.image_url} alt={`Product ${index}`} className="w-full h-full object-cover" />

                  {/* Badges */}
                  <div className="absolute top-1 left-1 flex flex-col gap-1 z-10">
                    {img.is_primary && (
                      <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-none shadow">
                        Ảnh chính
                      </span>
                    )}
                    {img.is_hover && (
                      <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-none shadow">
                        Ảnh Hover
                      </span>
                    )}
                  </div>

                  {/* Drag Handle & Remove overlay */}
                  <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                    <span
                      className="p-1 bg-black/50 hover:bg-black/70 text-white rounded-none cursor-move transition-colors"
                      title="Kéo để di chuyển"
                    >
                      <Move size={12} />
                    </span>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-none transition-colors cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Controls bên dưới mỗi thumbnail ảnh */}
                <div className="p-1.5 bg-slate-50 border-t border-slate-200 space-y-1 text-[10px]">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(index)}
                      className={`px-1.5 py-0.5 text-[9px] font-semibold border rounded-none transition-colors cursor-pointer w-1/2 ${
                        img.is_primary
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {img.is_primary ? '✓ Ảnh chính' : 'Đặt ảnh chính'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setHoverImage(index)}
                      className={`px-1.5 py-0.5 text-[9px] font-semibold border rounded-none transition-colors cursor-pointer w-1/2 ${
                        img.is_hover
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {img.is_hover ? '✓ Hover' : 'Đặt Hover'}
                    </button>
                  </div>

                  {/* Liên kết nhiều Biến thể bằng Popover Multi-select */}
                  {variants.length > 0 && (
                    <VariantMultiSelectPopover
                      variants={variants}
                      selectedIndices={currentSelectedIndices}
                      onChange={(newIndices) => handleImageVariantMultiSelect(index, newIndices)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {productImages.length === 0 && (
        <div className="text-center py-4 text-slate-400 text-xs flex items-center justify-center gap-1">
          <AlertCircle size={14} /> Chưa có hình ảnh nào. Vui lòng thêm ảnh sản phẩm.
        </div>
      )}
    </div>
  );
};
