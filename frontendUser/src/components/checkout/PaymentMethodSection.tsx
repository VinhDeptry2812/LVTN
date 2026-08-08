import React from 'react';
import { Link } from 'react-router-dom';

interface PaymentMethodSectionProps {
  paymentMethod: 'cod' | 'vnpay';
  setPaymentMethod: (val: 'cod' | 'vnpay') => void;
  isSubmitting: boolean;
  unsupportedError: string | null;
  total: number;
}

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  paymentMethod,
  setPaymentMethod,
  isSubmitting,
  unsupportedError,
}) => {
  return (
    <>
      <div className="mb-6">
        <h3 className="text-base font-bold text-[#333333] mb-3">Phương thức thanh toán</h3>
        <div className="border border-[#d9d9d9] rounded bg-white overflow-hidden">
          {/* COD */}
          <label className="flex items-center p-3.5 border-b border-[#d9d9d9] cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={() => setPaymentMethod('cod')}
              className="text-[#4a5d4e] focus:ring-[#4a5d4e] h-4 w-4 cursor-pointer"
            />
            <span className="material-symbols-outlined text-gray-600 text-lg ml-3 mr-2">local_shipping</span>
            <span className="text-xs font-medium text-[#333333]">Thanh toán khi nhận hàng (COD)</span>
          </label>

          {/* VNPAY */}
          <label className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center">
              <input
                type="radio"
                name="paymentMethod"
                value="vnpay"
                checked={paymentMethod === 'vnpay'}
                onChange={() => setPaymentMethod('vnpay')}
                className="text-[#4a5d4e] focus:ring-[#4a5d4e] h-4 w-4 cursor-pointer"
              />
              <span className="material-symbols-outlined text-gray-600 text-lg ml-3 mr-2">account_balance</span>
              <span className="text-xs font-medium text-[#333333]">Thanh toán qua VNPAY</span>
            </div>
            <div className="shrink-0 ml-2">
              <span className="font-extrabold text-[11px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded tracking-tighter">
                VNPAY<span className="text-blue-600 font-bold">QR</span>
              </span>
            </div>
          </label>
        </div>
      </div>

      {unsupportedError && (
        <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
          <p className="font-bold">{unsupportedError}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Vui lòng xóa các sản phẩm không hỗ trợ giao hàng tận nơi khỏi giỏ hàng để tiếp tục thanh toán.
          </p>
        </div>
      )}

      {/* Action buttons (Theo chuẩn Ảnh 1) */}
      <div className="flex items-center justify-between pt-4 border-t border-[#e6e6e6] gap-4">
        <Link to="/cart" className="text-xs text-[#333333] hover:text-[#4a5d4e] font-medium flex items-center gap-0.5">
          ‹ Giỏ hàng
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || Boolean(unsupportedError)}
          className="bg-[#4a5d4e] hover:bg-[#3d4c40] text-white font-bold px-8 py-3 rounded transition-colors disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed text-xs uppercase tracking-wider"
        >
          {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng'}
        </button>
      </div>

      {/* Footer Links (Theo chuẩn Ảnh 1) */}
      <div className="border-t border-[#e6e6e6] pt-6 mt-8 flex flex-wrap gap-6 text-[11px] text-[#737373]">
        <Link to="#" className="hover:underline">Chính sách hoàn trả</Link>
        <Link to="#" className="hover:underline">Chính sách bảo mật</Link>
        <Link to="#" className="hover:underline">Điều khoản sử dụng</Link>
      </div>
    </>
  );
};
