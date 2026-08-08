import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface VariantSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  onSelectVariant: (cartItemId: string, newVariantId: number, availableVariants: any[]) => void;
}

export const VariantSelectModal: React.FC<VariantSelectModalProps> = ({
  isOpen,
  onClose,
  item,
  onSelectVariant,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  useEffect(() => {
    if (item && item.variantId) {
      setSelectedVariantId(Number(item.variantId));
    }
  }, [item]);

  if (!isOpen || !item || !item.availableVariants || item.availableVariants.length === 0) {
    return null;
  }

  const handleConfirm = () => {
    if (selectedVariantId && selectedVariantId !== item.variantId) {
      onSelectVariant(item.id, selectedVariantId, item.availableVariants);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
          <div className="flex items-center gap-2 text-[#333333] font-bold text-base">
            <span className="material-symbols-outlined text-lg">tune</span>
            <span>Chọn phân loại</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product preview box */}
        <div className="bg-[#f8f8f8] border border-[#e6e6e6] p-3 rounded-md flex items-center gap-3 mb-4">
          <img
            src={item.image}
            alt={item.name}
            className="w-14 h-14 object-cover rounded border border-gray-200 shrink-0"
          />
          <div>
            <h4 className="text-sm font-medium text-[#333333] line-clamp-1">{item.name}</h4>
            <span className="text-sm font-bold text-[#333333] block mt-0.5">
              {item.rawPrice.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        {/* Variant section label */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            TÙY CHỌN PHÂN LOẠI
          </span>
          <span className="text-xs text-gray-400">
            {item.availableVariants.length} tùy chọn
          </span>
        </div>

        {/* Variant List */}
        <div className="max-h-[250px] overflow-y-auto space-y-2 mb-6 pr-1">
          {item.availableVariants.map((variant: any) => {
            const isSelected = selectedVariantId === variant.id;
            const attrText = variant.attribute_values
              ? Object.values(variant.attribute_values).join(' - ')
              : variant.sku;
            const variantPrice = Number(variant.price || item.rawPrice);
            const isOutOfStock = variant.stock <= 0;

            return (
              <div
                key={variant.id}
                onClick={() => !isOutOfStock && setSelectedVariantId(variant.id)}
                className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-all ${
                  isOutOfStock
                    ? 'opacity-50 bg-gray-100 cursor-not-allowed border-gray-200'
                    : isSelected
                    ? 'border-2 border-[#4a5d4e] bg-white shadow-xs'
                    : 'border-[#e6e6e6] bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-gray-400 text-sm">inventory_2</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#333333] block">
                      {attrText} {isOutOfStock ? '(Hết hàng)' : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      {variantPrice.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[#4a5d4e] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-300 bg-white" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-[#4a5d4e] hover:bg-[#3d4c40] text-white font-bold py-3 text-xs uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4 stroke-[3]" /> XÁC NHẬN PHÂN LOẠI
        </button>
      </div>
    </div>
  );
};
