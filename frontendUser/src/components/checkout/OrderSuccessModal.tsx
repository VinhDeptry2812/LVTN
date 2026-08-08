import React from 'react';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';

interface OrderSuccessModalProps {
  showSuccessModal: boolean;
  setShowSuccessModal: (val: boolean) => void;
  navigate: NavigateFunction;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  showSuccessModal,
  setShowSuccessModal,
  navigate,
}) => {
  if (!showSuccessModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="success-dialog bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-stone-100 text-center relative overflow-hidden">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="text-2xl font-serif text-stone-900 mb-2 font-medium">
          Đặt Hàng Thành Công!
        </h3>
        <p className="text-stone-600 text-sm mb-6 leading-relaxed">
          Cảm ơn bạn đã tin tưởng mua sắm tại cửa hàng chúng tôi. Đơn hàng của bạn đã được ghi nhận và đang được xử lý.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setShowSuccessModal(false);
              navigate('/profile?tab=orders');
            }}
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Xem lịch sử đơn hàng
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSuccessModal(false);
              navigate('/');
            }}
            className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Tiếp tục mua sắm
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
