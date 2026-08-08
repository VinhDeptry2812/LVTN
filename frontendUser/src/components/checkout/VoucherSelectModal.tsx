import React from 'react';
import { X, Ticket, AlertCircle, Loader2 } from 'lucide-react';
import type { AppliedVoucher } from '@/hooks/useCheckout';

interface VoucherSelectModalProps {
  isVoucherModalOpen: boolean;
  setIsVoucherModalOpen: (val: boolean) => void;
  discountCode: string;
  setDiscountCode: (val: string) => void;
  appliedVoucher: AppliedVoucher | null;
  isValidatingVoucher: boolean;
  isLoadingActiveVouchers: boolean;
  sortedModalVouchers: any[];
  subtotal: number;
  handleApplyVoucher: (codeToApply?: string) => void;
  handleRemoveVoucher: () => void;
}

export const VoucherSelectModal: React.FC<VoucherSelectModalProps> = ({
  isVoucherModalOpen,
  setIsVoucherModalOpen,
  discountCode,
  setDiscountCode,
  appliedVoucher,
  isValidatingVoucher,
  isLoadingActiveVouchers,
  sortedModalVouchers,
  subtotal,
  handleApplyVoucher,
  handleRemoveVoucher,
}) => {
  if (!isVoucherModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl border border-gray-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
          <h3 className="text-base font-bold text-[#333333] flex items-center gap-2">
            <Ticket className="w-5 h-5 text-gray-700" />
            Chọn Mã Giảm Giá
          </h3>
          <button
            type="button"
            onClick={() => setIsVoucherModalOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input thủ công */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="NHẬP MÃ GIẢM GIÁ..."
              className="flex-1 px-3 py-2 bg-white border border-[#d9d9d9] rounded text-xs uppercase placeholder:text-gray-400 outline-none focus:border-[#4a5d4e]"
            />
            <button
              type="button"
              disabled={isValidatingVoucher || !discountCode.trim()}
              onClick={() => handleApplyVoucher()}
              className="px-5 py-2 bg-[#a3a8a5] hover:bg-[#888888] disabled:bg-gray-300 text-white rounded text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
            >
              {isValidatingVoucher ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                'Áp dụng'
              )}
            </button>
          </div>
        </div>

        {/* Danh sách voucher khả dụng */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          {isLoadingActiveVouchers ? (
            <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#4a5d4e]" />
              Đang tải danh sách mã giảm giá...
            </div>
          ) : sortedModalVouchers.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              Hiện chưa có mã giảm giá nào khả dụng.
            </div>
          ) : (
            sortedModalVouchers.map((v) => {
              const minVal = Number(v.min_order_value || 0);
              const isEligible = subtotal >= minVal;
              const isSelected = appliedVoucher?.code === v.code;

              return (
                <div
                  key={v.id || v.code}
                  className={`p-4 rounded-md border-2 border-dashed transition-all relative ${
                    isSelected
                      ? 'border-[#4a5d4e] bg-emerald-50/30'
                      : isEligible
                      ? 'border-amber-400 bg-white'
                      : 'border-gray-200 bg-gray-50/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Badge header row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-xs text-gray-700 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded">
                          {v.code}
                        </span>
                        {isEligible ? (
                          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                            Khả dụng
                          </span>
                        ) : (
                          <span className="text-[11px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            Chưa đủ điều kiện
                          </span>
                        )}
                      </div>

                      {/* Title & Conditions */}
                      <h4 className="font-bold text-sm text-[#333333]">
                        {v.discount_type === 'percentage'
                          ? `Giảm ${v.discount_value}%`
                          : `Giảm ${Number(v.discount_value).toLocaleString('vi-VN')} ₫`}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {minVal > 0
                          ? `Đơn hàng từ ${minVal.toLocaleString('vi-VN')} ₫`
                          : 'Đơn hàng bất kỳ'}
                      </p>
                    </div>

                    {/* Action button on right */}
                    <div className="shrink-0 flex items-center self-center">
                      {isEligible ? (
                        isSelected ? (
                          <button
                            type="button"
                            onClick={handleRemoveVoucher}
                            className="text-xs text-red-600 hover:underline font-medium cursor-pointer"
                          >
                            Bỏ chọn
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isValidatingVoucher}
                            onClick={() => handleApplyVoucher(v.code)}
                            className="bg-[#4a5d4e] hover:bg-[#3d4c40] text-white text-xs px-5 py-2 font-bold rounded cursor-pointer transition-colors"
                          >
                            Áp dụng
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Chưa đủ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-200 mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsVoucherModalOpen(false)}
            className="px-6 py-1.5 text-xs font-medium text-[#333333] border border-[#d9d9d9] hover:bg-gray-50 rounded transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
