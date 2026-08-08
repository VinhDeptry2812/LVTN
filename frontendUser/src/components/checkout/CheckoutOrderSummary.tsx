import React from 'react';
import type { AppliedVoucher } from '@/hooks/useCheckout';

interface CheckoutOrderSummaryProps {
  items: any[];
  subtotal: number;
  shippingFee: number;
  isBulky: boolean;
  isLoadingShipping: boolean;
  unsupportedError: string | null;
  appliedVoucher: AppliedVoucher | null;
  eligibleVouchersCount: number;
  discountAmount: number;
  total: number;
  orderNote: string;
  setOrderNote: (val: string) => void;
  updateVariant: (cartItemId: string, newVariantId: number, availableVariants: any[]) => void;
  handleUpdateQuantity: (id: string, currentQty: number, delta: number, item: any) => void;
  handleRemoveVoucher: () => void;
  setIsVoucherModalOpen: (val: boolean) => void;
  discountCode: string;
  setDiscountCode: (val: string) => void;
  handleApplyVoucher: (codeToApply?: string) => void;
  isValidatingVoucher: boolean;
  onOpenVariantModal: (item: any) => void;
}

export const CheckoutOrderSummary: React.FC<CheckoutOrderSummaryProps> = ({
  items,
  subtotal,
  shippingFee,
  isBulky,
  isLoadingShipping,
  appliedVoucher,
  eligibleVouchersCount,
  discountAmount,
  total,
  orderNote,
  setOrderNote,
  handleUpdateQuantity,
  handleRemoveVoucher,
  setIsVoucherModalOpen,
  discountCode,
  setDiscountCode,
  handleApplyVoucher,
  isValidatingVoucher,
  onOpenVariantModal,
}) => {
  return (
    <>
      {/* Product List */}
      <div className="max-h-[380px] overflow-y-auto pr-1 divide-y divide-[#e6e6e6] mb-6">
        {items.map((item) => (
          <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-14 h-14 object-cover rounded border border-[#e6e6e6]"
                />
                <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {item.quantity}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-[#333333] line-clamp-1">{item.name}</h4>

                {/* Badge chọn biến thể (Mở Modal chọn phân loại theo Ảnh 1 & Ảnh 2) */}
                {item.availableVariants && item.availableVariants.length > 0 ? (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => onOpenVariantModal(item)}
                      className="inline-flex items-center gap-1 text-xs text-[#555555] bg-[#f5f5f5] hover:bg-[#e9e9e9] border border-[#d9d9d9] px-2 py-0.5 rounded text-left transition-colors cursor-pointer"
                    >
                      <span>
                        {item.selectedVariantText ||
                          (item.availableVariants.find((v: any) => v.id === item.variantId)?.attribute_values
                            ? Object.values(item.availableVariants.find((v: any) => v.id === item.variantId).attribute_values).join(' - ')
                            : 'Chọn phân loại')}
                      </span>
                      <span className="text-[10px] text-gray-500">∨</span>
                    </button>
                  </div>
                ) : item.selectedVariantText ? (
                  <p className="text-xs text-[#969696] mt-0.5">{item.selectedVariantText}</p>
                ) : null}

                {/* Tăng giảm số lượng trực tiếp: - 1 + */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.id, item.quantity, -1, item)}
                    className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-100 cursor-pointer bg-white"
                  >
                    -
                  </button>
                  <span className="text-xs text-gray-700 font-medium px-1">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.id, item.quantity, 1, item)}
                    className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-100 cursor-pointer bg-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-[#333333]">
                {(item.rawPrice * item.quantity).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Note đơn hàng */}
      <div className="mb-5">
        <textarea
          rows={2}
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          placeholder="Ghi chú đơn hàng (không bắt buộc)"
          className="w-full bg-white border border-[#d9d9d9] rounded-md px-3 py-2 text-xs focus:border-[#4a5d4e] outline-none transition-shadow"
        />
      </div>

      {/* Khung Mã giảm giá (Theo chuẩn Ảnh 1) */}
      <div className="mb-6 pb-6 border-b border-[#e6e6e6] space-y-2.5">
        {/* Khung gợi ý chọn mã với nét đứt */}
        <div
          onClick={() => setIsVoucherModalOpen(true)}
          className="border border-dashed border-[#cccccc] hover:border-[#4a5d4e] rounded-md p-3 bg-white flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-gray-500 text-xl">confirmation_number</span>
            <div>
              <div className="font-medium text-xs text-[#333333]">Chọn hoặc nhập Mã giảm giá</div>
              <div className="text-[11px] text-gray-400">
                {eligibleVouchersCount > 0
                  ? `Nhấn để xem các mã ưu đãi (${eligibleVouchersCount})`
                  : 'Nhấn để xem các mã ưu đãi'}
              </div>
            </div>
          </div>
          <span className="text-xs text-[#4a5d4e] font-semibold flex items-center gap-0.5 shrink-0">
            Chọn mã <span className="text-xs">›</span>
          </span>
        </div>

        {/* Khung nhập mã thủ công */}
        <div className="flex gap-2">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="NHẬP MÃ GIẢM GIÁ THỦ CÔNG"
            className="flex-1 bg-white border border-[#d9d9d9] rounded px-3 py-2 text-xs uppercase placeholder:text-gray-400 outline-none focus:border-[#4a5d4e]"
          />
          <button
            type="button"
            disabled={isValidatingVoucher || !discountCode.trim()}
            onClick={() => handleApplyVoucher()}
            className="bg-[#a3a8a5] hover:bg-[#888888] disabled:bg-gray-300 text-white text-xs px-4 py-2 rounded font-bold transition-colors cursor-pointer"
          >
            {isValidatingVoucher ? '...' : 'Sử dụng'}
          </button>
        </div>

        {/* Mã đã áp dụng */}
        {appliedVoucher && (
          <div className="flex justify-between items-center bg-[#4a5d4e]/10 border border-[#4a5d4e]/30 p-2.5 rounded text-xs mt-2">
            <div>
              <span className="font-bold text-[#4a5d4e]">{appliedVoucher.code}</span>
              <span className="text-[11px] text-gray-600 block">
                Giảm {appliedVoucher.discount_type === 'percentage' ? `${appliedVoucher.discount_value}%` : `${appliedVoucher.discount_value.toLocaleString('vi-VN')} ₫`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveVoucher}
              className="text-gray-400 hover:text-red-500 text-xs cursor-pointer bg-transparent border-none font-medium"
            >
              Bỏ chọn
            </button>
          </div>
        )}
      </div>

      {/* Subtotal & Phí vận chuyển */}
      <div className="space-y-2.5 pb-5 border-b border-[#e6e6e6] text-sm text-[#737373]">
        <div className="flex justify-between">
          <span>Tạm tính</span>
          <span className="font-medium text-[#333333]">{subtotal.toLocaleString('vi-VN')} ₫</span>
        </div>

        {appliedVoucher && discountAmount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Giảm giá (Voucher)</span>
            <span className="font-medium">-{discountAmount.toLocaleString('vi-VN')} ₫</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>Phí vận chuyển</span>
          <span className="font-medium text-[#333333]">
            {isLoadingShipping ? (
              <span className="text-xs text-gray-400">Đang tính...</span>
            ) : shippingFee === 0 ? (
              <span className="text-green-600">Miễn phí</span>
            ) : (
              `${shippingFee.toLocaleString('vi-VN')} ₫`
            )}
          </span>
        </div>

        {isBulky && (
          <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-1">
            ⚠️ Đơn hàng có sản phẩm cồng kềnh/nặng, đã áp dụng phụ phí vận chuyển.
          </div>
        )}
      </div>

      {/* Total Price (Định dạng VND 10.340.000 ₫ theo chuẩn Ảnh 1) */}
      <div className="pt-4 flex justify-between items-baseline">
        <span className="text-base text-[#333333] font-normal">Tổng cộng</span>
        <div className="flex items-baseline">
          <span className="text-xs text-[#737373] font-medium mr-1.5">VND</span>
          <span className="text-2xl font-bold text-[#333333]">
            {total.toLocaleString('vi-VN')} ₫
          </span>
        </div>
      </div>
    </>
  );
};
