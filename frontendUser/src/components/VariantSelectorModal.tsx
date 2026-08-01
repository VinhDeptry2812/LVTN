import { useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { productCardImage } from '@/utils/cloudinaryUrl';
import { formatPrice } from '@/utils/format';

export interface VariantItem {
  id: string;
  name: string;
  image?: string;
  material?: string;
  variantId?: number | string | null;
  rawPrice: number;
  basePrice?: number;
  availableVariants?: Array<{
    id: number;
    sku?: string;
    price_adjustment?: number;
    stock_quantity?: number;
    image_url?: string;
    attributes?: Record<string, any>;
  }>;
}

interface VariantSelectorModalProps {
  item: VariantItem;
  onUpdateVariant: (itemId: string, newVariantId: number) => void;
  readOnly?: boolean;
}

const formatAttributes = (attributes: Record<string, any> | undefined) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .join(' · ');
};

const formatMaterialDisplay = (material?: string) => {
  if (!material) return '';
  if (material.includes('·')) return material;
  if (material.includes('|')) {
    return material.split('|').map((s) => s.trim()).join(' · ');
  }
  if (material.includes(' - ')) {
    return material.split(' - ').map((s) => (s.includes('|') ? s.split('|')[0].trim() : s.trim())).join(' · ');
  }
  return material;
};

export default function VariantSelectorModal({ item, onUpdateVariant, readOnly = false }: VariantSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempVariantId, setTempVariantId] = useState<number | null>(null);

  const hasVariants = item.availableVariants && item.availableVariants.length > 0;
  const currentMaterialLabel = formatMaterialDisplay(item.material);

  const handleOpen = () => {
    if (readOnly || !hasVariants) return;
    const currentId = item.variantId ? Number(item.variantId) : null;
    setTempVariantId(currentId || item.availableVariants?.[0]?.id || null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (tempVariantId !== null && tempVariantId !== (item.variantId ? Number(item.variantId) : null)) {
      onUpdateVariant(item.id, tempVariantId);
      toast.success('Đã cập nhật phân loại sản phẩm.');
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Pill Badge Component */}
      {hasVariants && !readOnly ? (
        <button
          type="button"
          onClick={handleOpen}
          className="group inline-flex items-center gap-1.5 mt-1.5 bg-[#f4f4f6] hover:bg-[#e8e8ec] text-[#27272a] font-medium text-[11px] sm:text-xs px-2.5 py-1 rounded-full border border-[#e4e4e7] transition-all cursor-pointer max-w-full text-left"
        >
          <span className="truncate">
            {currentMaterialLabel || 'Chọn phân loại'}
          </span>
          <span className="material-symbols-outlined text-[15px] text-primary shrink-0 transition-transform group-hover:translate-y-0.5">
            keyboard_arrow_down
          </span>
        </button>
      ) : (
        currentMaterialLabel && (
          <span className="inline-block mt-1.5 bg-[#f4f4f6] text-[#52525b] font-medium text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full border border-[#e4e4e7] truncate max-w-full text-left">
            {currentMaterialLabel}
          </span>
        )
      )}

      {/* Modal Popup React Portal */}
      {isOpen && createPortal(
        (() => {
          const currentTempVariant = item.availableVariants?.find((v) => v.id === tempVariantId);
          const basePrice = item.basePrice || item.rawPrice || 0;
          const tempPrice = basePrice + (currentTempVariant?.price_adjustment ? Number(currentTempVariant.price_adjustment) : 0);
          const tempImage = currentTempVariant?.image_url || item.image;

          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-[92vw] sm:w-full max-w-md shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[85vh] sm:max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">tune</span>
                    <h3 className="font-bold text-base sm:text-lg text-[#18181b]">Chọn phân loại</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full bg-[#f4f4f5] hover:bg-[#e4e4e7] flex items-center justify-center transition-colors cursor-pointer text-[#71717a] hover:text-[#18181b]"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-grow">
                  {/* Product Preview */}
                  <div className="flex gap-3 sm:gap-4 items-center bg-[#fafafa] p-3 sm:p-3.5 rounded-xl border border-[#f0f0f0]">
                    <img
                      src={productCardImage(tempImage)}
                      alt={item.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-[#e4e4e7] bg-white shrink-0"
                    />
                    <div className="text-left space-y-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm text-[#27272a] line-clamp-2 leading-snug">{item.name}</p>
                      <p className="font-bold text-sm sm:text-lg text-primary">{formatPrice(tempPrice)}</p>
                    </div>
                  </div>

                  {/* Variant Options - Option B Card List */}
                  <div className="text-left space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#71717a]">Tùy chọn phân loại</span>
                      <span className="text-xs text-[#a1a1aa] font-medium">{item.availableVariants?.length || 0} tùy chọn</span>
                    </div>

                    <div className="space-y-2 sm:space-y-2.5 max-h-[260px] sm:max-h-[280px] overflow-y-auto pr-1">
                      {item.availableVariants?.map((v) => {
                        const isSelected = v.id === tempVariantId;
                        const rawLabel = (v.attributes && Object.keys(v.attributes).length > 0)
                          ? formatAttributes(v.attributes)
                          : (v.sku || `Phân loại ${v.id}`);
                        const formattedLabel = rawLabel.includes('|')
                          ? rawLabel.split('|').map((s: string) => s.trim()).join(' · ')
                          : rawLabel;

                        const variantPrice = basePrice + (v.price_adjustment ? Number(v.price_adjustment) : 0);
                        const variantImage = v.image_url;

                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setTempVariantId(v.id)}
                            className={`w-full p-2.5 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 text-left ${
                              isSelected
                                ? 'border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/30'
                                : 'border-[#e4e4e7] hover:border-[#a1a1aa] bg-white hover:bg-[#fafafa]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-grow">
                              {variantImage ? (
                                <img
                                  src={productCardImage(variantImage)}
                                  alt={formattedLabel}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-md object-cover border border-[#e4e4e7] shrink-0"
                                />
                              ) : (
                                <div
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md border flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-[#f4f4f5] border-[#e4e4e7] text-[#71717a]'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-lg">style</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-grow">
                                <p className={`text-xs sm:text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-[#27272a]'}`}>
                                  {formattedLabel}
                                </p>
                                {v.stock_quantity !== undefined && (
                                  <p className="text-[11px] text-[#71717a] mt-0.5">
                                    {v.stock_quantity > 0 ? `Còn ${v.stock_quantity} sản phẩm` : 'Hết hàng'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                              <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-primary' : 'text-[#3f3f46]'}`}>
                                {formatPrice(variantPrice)}
                              </span>
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-primary text-white scale-110' : 'border border-[#d4d4d8] bg-white'
                                }`}
                              >
                                {isSelected && <span className="material-symbols-outlined text-[13px] font-bold">check</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3.5 sm:p-5 border-t border-[#f0f0f0] bg-[#fafafa]">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full bg-primary text-white py-3 sm:py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">check</span>
                    Xác nhận phân loại
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </>
  );
}
