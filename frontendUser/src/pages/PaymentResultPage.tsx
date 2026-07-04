import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCartStore } from '@/store/useCartStore';
import api from '@/services/api';

type PaymentStatus = 'loading' | 'success' | 'failed';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [orderCode, setOrderCode] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  // Parse VNPay callback query params
  useEffect(() => {
    const responseCode = searchParams.get('vnp_ResponseCode');
    const txnRef = searchParams.get('vnp_TxnRef');
    const vnpAmount = searchParams.get('vnp_Amount');

    if (txnRef) {
      setOrderCode(txnRef);
    }

    if (vnpAmount) {
      // VNPay amount is multiplied by 100
      const realAmount = Number(vnpAmount) / 100;
      setAmount(
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
          .format(realAmount)
      );
    }

    // Process payment verification with backend if VNPay params exist
    if (searchParams.has('vnp_ResponseCode')) {
      api.get(`/payment/vnpay-return?${searchParams.toString()}`)
        .then((response) => {
          if (response.data.success) {
            setStatus('success');
            clearCart();
          } else {
            setStatus('failed');
          }
        })
        .catch((err) => {
          console.error('Lỗi xác thực thanh toán:', err);
          setStatus('failed');
        });
    } else if (searchParams.has('resultCode')) {
      // Handle MoMo return if needed (assuming resultCode=0 is success for MoMo)
      const resultCode = searchParams.get('resultCode');
      if (resultCode === '0') {
        setStatus('success');
        clearCart();
      } else {
        setStatus('failed');
      }
    } else {
       // Direct navigation or COD fallback
       setStatus('success');
       clearCart();
    }

  }, [searchParams, clearCart]);

  // GSAP entrance animation
  useGSAP(() => {
    if (status === 'loading') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      gsap.set('.result-card', { opacity: 1, scale: 1 });
      return;
    }

    gsap.fromTo(
      '.result-icon',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
    );
    gsap.fromTo(
      '.result-title',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay: 0.3, ease: 'power2.out' }
    );
    gsap.fromTo(
      '.result-details',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay: 0.5, ease: 'power2.out' }
    );
    gsap.fromTo(
      '.result-actions',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay: 0.7, ease: 'power2.out' }
    );
  }, { dependencies: [status], scope: containerRef });

  return (
    <div
      className="bg-[#f8f9fa] min-h-screen font-sans flex flex-col"
      ref={containerRef}
    >
      <Header />

      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto rounded-full bg-white border border-[#d9d9d9] flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-[32px] text-[#A5A58D] animate-spin">
                  sync
                </span>
              </div>
              <h2 className="text-xl font-medium text-[#333] mb-2">
                Đang xác nhận thanh toán...
              </h2>
              <p className="text-[#737373] text-sm">
                Vui lòng đợi trong giây lát.
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="result-card bg-white rounded-xl p-8 text-center shadow-sm border border-[#d9d9d9]">
              <div className="result-icon w-20 h-20 mx-auto rounded-full bg-[#f4f8f5] flex items-center justify-center mb-6 border border-[#e8f0e9]">
                <span className="material-symbols-outlined text-[40px] text-[#A5A58D]" aria-hidden="true">
                  check_circle
                </span>
              </div>
              <h1 className="text-2xl font-medium text-[#333] mb-2">
                Đặt hàng thành công!
              </h1>
              <p className="text-[#737373] text-sm mb-8">
                Cảm ơn bạn đã tin tưởng Nội thất. Đơn hàng của bạn đang được xử lý và sẽ được chuyển đi sớm nhất.
              </p>

              {/* Order Details */}
              <div className="result-details bg-[#f8f9fa] rounded-md p-4 space-y-3 text-left mb-8 border border-[#d9d9d9]">
                {orderCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#737373]">Mã đơn hàng</span>
                    <span className="text-sm font-medium text-[#333]">#{orderCode}</span>
                  </div>
                )}
                {amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#737373]">Tổng thanh toán</span>
                    <span className="text-base font-medium text-[#A5A58D]">{amount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#737373]">Trạng thái</span>
                  <span className="text-sm font-medium text-[#A5A58D]">Đã xác nhận</span>
                </div>
              </div>

              {/* Actions */}
              <div className="result-actions flex flex-col gap-3">
                <button
                  onClick={() => navigate('/shop')}
                  className="w-full bg-[#A5A58D] text-white py-3 px-4 rounded-md font-medium hover:bg-[#8e8e7a] transition-colors"
                >
                  Tiếp tục mua sắm
                </button>
                <Link
                  to="/"
                  className="w-full text-center border border-[#A5A58D] text-[#A5A58D] py-3 px-4 rounded-md font-medium hover:bg-[#A5A58D] hover:text-white transition-colors"
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <div className="result-card bg-white rounded-xl p-8 text-center shadow-sm border border-[#ffd5d5]">
              <div className="result-icon w-20 h-20 mx-auto rounded-full bg-[#fff4f4] flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[40px] text-[#ff4d4f]" aria-hidden="true">
                  cancel
                </span>
              </div>
              <h1 className="text-2xl font-medium text-[#ff4d4f] mb-2">
                Thanh toán thất bại
              </h1>
              <p className="text-[#737373] text-sm mb-8">
                Giao dịch của bạn chưa được hoàn tất. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
              </p>

              {/* Error Details */}
              <div className="result-details bg-[#fff4f4] rounded-md p-4 space-y-3 text-left mb-8 border border-[#ffd5d5]">
                {orderCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#737373]">Mã đơn hàng</span>
                    <span className="text-sm font-medium text-[#333]">#{orderCode}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#737373]">Trạng thái</span>
                  <span className="text-sm font-medium text-[#ff4d4f]">Chưa thanh toán</span>
                </div>
              </div>

              {/* Actions */}
              <div className="result-actions flex flex-col gap-3">
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-[#A5A58D] text-white py-3 px-4 rounded-md font-medium hover:bg-[#8e8e7a] transition-colors"
                >
                  Thử lại thanh toán
                </button>
                <Link
                  to="/shop"
                  className="w-full text-center border border-[#d9d9d9] text-[#737373] py-3 px-4 rounded-md font-medium hover:border-[#A5A58D] hover:text-[#A5A58D] transition-colors"
                >
                  Quay lại cửa hàng
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
