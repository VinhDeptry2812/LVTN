import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ImageIcon, X, Check } from 'lucide-react';
import type { VariantInput, ProductImageInput } from '../types';

export const VariantMultiSelectPopover = ({
  variants,
  selectedIndices,
  onChange,
}: {
  variants: VariantInput[];
  selectedIndices: number[];
  onChange: (newIndices: number[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleIndex = (vIdx: number) => {
    if (selectedIndices.includes(vIdx)) {
      onChange(selectedIndices.filter((i) => i !== vIdx));
    } else {
      onChange([...selectedIndices, vIdx]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const getLabel = () => {
    if (selectedIndices.length === 0) return '-- Dùng chung --';
    if (selectedIndices.length === 1) {
      const vIdx = selectedIndices[0];
      const v = variants[vIdx];
      if (!v) return `-- Dùng chung --`;
      const attrStr = Object.values(v.attributes || {})
        .map((val) => String(val).split('|')[0])
        .filter(Boolean)
        .join(', ');
      return attrStr ? `#${vIdx + 1}: ${attrStr}` : `#${vIdx + 1}: SKU ${v.sku || 'Chưa đặt'}`;
    }
    return `${selectedIndices.length} biến thể được chọn`;
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-[9px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-none px-1.5 py-1 text-slate-700 flex items-center justify-between gap-1 transition-colors cursor-pointer"
        title="Chọn biến thể liên kết với hình ảnh này"
      >
        <span className="truncate">{getLabel()}</span>
        <ChevronDown size={10} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-1 min-w-[220px] w-max max-w-[260px] bg-white border border-slate-200 shadow-2xl z-[60] p-2 text-[10px] space-y-1 rounded-none">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1 pb-1 border-b border-slate-100 flex justify-between items-center">
            <span>Chọn biến thể liên kết</span>
            {selectedIndices.length > 0 && (
              <button type="button" onClick={handleClear} className="text-blue-600 hover:underline cursor-pointer text-[9px]">
                Bỏ chọn tất cả
              </button>
            )}
          </div>
          <div className="max-h-44 overflow-y-auto space-y-0.5 pt-0.5">
            <label className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-slate-50 cursor-pointer rounded-none text-slate-700">
              <input
                type="checkbox"
                checked={selectedIndices.length === 0}
                onChange={handleClear}
                className="h-3 w-3 rounded-none text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="font-semibold text-slate-500">-- Dùng chung (Tất cả) --</span>
            </label>
            {variants.map((v, vIdx) => {
              const attrStr = Object.values(v.attributes || {})
                .map((val) => String(val).split('|')[0])
                .filter(Boolean)
                .join(', ');
              const labelText = attrStr ? `#${vIdx + 1}: ${attrStr}` : `#${vIdx + 1}: SKU ${v.sku || 'Chưa đặt'}`;
              const isChecked = selectedIndices.includes(vIdx);
              return (
                <label key={vIdx} className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-slate-50 cursor-pointer rounded-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleIndex(vIdx)}
                    className="h-3 w-3 rounded-none text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className={`truncate ${isChecked ? 'font-bold text-blue-600' : ''}`}>{labelText}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const SelectImageFromLibraryPopover = ({
  productImages,
  onSelectImage,
}: {
  productImages: ProductImageInput[];
  onSelectImage: (imgUrl: string, file?: File) => void;
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-none transition-colors cursor-pointer"
        title="Chọn từ thư viện ảnh sản phẩm đã tải lên"
      >
        <ImageIcon size={10} />
        <span>Thư viện</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 shadow-2xl w-full max-w-lg rounded-none overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ImageIcon size={16} className="text-blue-600" />
                <span>Chọn ảnh cho biến thể từ thư viện</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 transition-colors rounded-none cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {productImages.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Chưa có ảnh nào trong thư viện sản phẩm. Vui lòng tải ảnh sản phẩm lên ở khối "Hình ảnh sản phẩm" phía trên trước.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    Nhấp vào một hình ảnh bên dưới để đặt làm hình đại diện cho biến thể này:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {productImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onSelectImage(img.image_url, img.file);
                          setOpen(false);
                        }}
                        className="group relative aspect-square border-2 border-slate-200 hover:border-blue-600 overflow-hidden bg-slate-50 cursor-pointer transition-all hover:scale-[1.03] shadow-xs"
                      >
                        <img src={img.image_url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-blue-600/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Check size={18} className="text-white drop-shadow-md stroke-[3]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
