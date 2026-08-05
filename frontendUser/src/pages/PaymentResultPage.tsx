import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { XCircle, Loader2, Copy, Check, ShoppingBag, Home } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState<string>('Thanh toán khi nhận hàng (COD)');
  const [copied, setCopied] = useState(false);

  // Parse VNPay/MoMo callback query params
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
      setPaymentMethod('Cổng thanh toán VNPAY');
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
          console.error('Lỗi xác thực thanh toán VNPAY:', err);
          setStatus('failed');
        });
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
      gsap.set('.result-card', { opacity: 1 });
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(
      '.result-icon',
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.5)' }
    )
    .fromTo(
      '.result-title',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.3'
    )
    .fromTo(
      '.result-timeline',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.3'
    )
    .fromTo(
      '.result-details',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.3'
    )
    .fromTo(
      '.result-actions',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.3'
    );
  }, { dependencies: [status], scope: containerRef });

  const handleCopy = () => {
    if (orderCode) {
      navigator.clipboard.writeText(orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentDateString = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="bg-background min-h-screen font-body-md flex flex-col"
      ref={containerRef}
    >
      <Header />

      <main className="flex-1 flex items-center justify-center pt-32 pb-20 md:pt-40 md:pb-28 px-4">
        <div className="max-w-md w-full">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="result-card text-center bg-surface-container-lowest border border-outline-variant/30 p-6 md:p-8 shadow-sm rounded-none">
              <div className="w-12 h-12 mx-auto flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                Đang xác nhận thanh toán...
              </h2>
              <p className="text-on-surface-variant/80 text-body-sm font-body-sm">
                Vui lòng không đóng trình duyệt hoặc quay lại trang trước.
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="result-card bg-surface-container-lowest border border-outline-variant/40 p-6 md:p-8 shadow-sm text-center rounded-none">
              {/* Icon Container with double ring */}
              <div className="result-icon w-16 h-16 mx-auto rounded-full bg-primary/5 flex items-center justify-center mb-4 border border-primary/10 relative">
                <div className="absolute inset-1.5 rounded-full border border-primary/20 animate-pulse"></div>
                <Check className="w-6 h-6 text-primary relative z-10" />
              </div>

              <h1 className="result-title font-headline-md text-headline-md text-on-surface mb-2">
                Đặt hàng thành công!
              </h1>
              <p className="result-title text-on-surface-variant/80 text-body-sm font-body-sm max-w-sm mx-auto mb-6">
                Cảm ơn bạn đã lựa chọn Nội thất. Chúng tôi đã ghi nhận đơn hàng và sẽ liên hệ xác nhận thời gian giao hàng trong vòng 24h tới.
              </p>

              {/* Order Progress Steps */}
              <div className="result-timeline py-4 border-t border-b border-outline-variant/20 my-6">
                <div className="flex items-center justify-between max-w-[280px] mx-auto text-[10px] font-label-sm uppercase tracking-wider">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[9px]">
                      ✓
                    </div>
                    <span className="text-primary font-bold">Đặt hàng</span>
                  </div>
                  <div className="flex-1 h-[2px] bg-primary mx-2 -translate-y-3.5"></div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[9px]">
                      ✓
                    </div>
                    <span className="text-primary font-bold">Xác nhận</span>
                  </div>
                  <div className="flex-1 h-[2px] bg-outline-variant/30 mx-2 -translate-y-3.5"></div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border border-outline text-on-surface-variant/70 flex items-center justify-center font-bold text-[9px]">
                      3
                    </div>
                    <span className="text-on-surface-variant/50">Chuẩn bị</span>
                  </div>
                </div>
              </div>

              {/* Minimalist Invoice Receipt */}
              <div className="result-details bg-surface-container-low p-5 space-y-3 text-left mb-6 border border-dashed border-outline-variant/60">
                <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider border-b border-outline-variant/20 pb-2 mb-1.5">
                  Chi tiết giao dịch
                </h3>
                {orderCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-on-surface-variant/80">Mã đơn hàng</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-body-sm font-bold text-on-surface">#{orderCode}</span>
                      <button
                        onClick={handleCopy}
                        className="text-primary hover:text-primary-fixed-dim transition-colors p-0.5"
                        title="Sao chép mã đơn"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-on-surface-variant/80">Ngày đặt hàng</span>
                  <span className="text-body-sm font-medium text-on-surface">{currentDateString}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-on-surface-variant/80">Phương thức</span>
                  <span className="text-body-sm font-medium text-on-surface">{paymentMethod}</span>
                </div>
                {amount && (
                  <div className="flex justify-between items-center border-t border-outline-variant/20 pt-3 mt-1.5">
                    <span className="text-body-sm font-bold text-on-surface">Tổng thanh toán</span>
                    <span className="text-base font-bold text-primary">{amount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-on-surface-variant/80">Trạng thái thanh toán</span>
                  <span className="text-body-sm font-semibold text-primary">Thành công</span>
                </div>
              </div>

              {/* Actions */}
              <div className="result-actions flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/shop')}
                  className="flex-1 bg-primary text-on-primary py-3 px-5 font-label-md text-label-md tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Tiếp tục mua sắm
                </button>
                <Link
                  to="/"
                  className="flex-1 border border-outline text-on-surface py-3 px-5 font-label-md text-label-md tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Về trang chủ
                </Link>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <div className="result-card bg-surface-container-lowest border border-outline-variant/40 p-6 md:p-8 shadow-sm text-center rounded-none">
              <div className="result-icon w-16 h-16 mx-auto rounded-full bg-error/5 flex items-center justify-center mb-4 border border-error/10 relative">
                <XCircle className="w-8 h-8 text-error" />
              </div>
              <h1 className="result-title font-headline-md text-headline-md text-error mb-2">
                Thanh toán thất bại
              </h1>
              <p className="result-title text-on-surface-variant/80 text-body-sm font-body-sm max-w-sm mx-auto mb-6">
                Giao dịch của bạn chưa được hoàn tất do lỗi thanh toán hoặc giao dịch bị hủy bỏ.
              </p>

              {/* Error Details */}
              <div className="result-details bg-error/[0.02] p-5 space-y-3 text-left mb-6 border border-dashed border-error/20">
                <h3 className="font-label-md text-label-md text-error uppercase tracking-wider border-b border-error/10 pb-2 mb-1.5">
                  Thông tin lỗi
                </h3>
                {orderCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-on-surface-variant/80">Mã đơn hàng</span>
                    <span className="text-body-sm font-bold text-on-surface">#{orderCode}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-on-surface-variant/80">Trạng thái</span>
                  <span className="text-body-sm font-bold text-error">Chưa thanh toán</span>
                </div>
                <div className="flex justify-between items-center border-t border-error/10 pt-3 mt-1.5">
                  <span className="text-body-sm text-on-surface-variant/80">Hỗ trợ</span>
                  <span className="text-body-sm font-medium text-on-surface">Hotline: 1900 1234</span>
                </div>
              </div>

              {/* Actions */}
              <div className="result-actions flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/checkout')}
                  className="flex-1 bg-primary text-on-primary py-3 px-5 font-label-md text-label-md tracking-wider cursor-pointer transition-colors"
                >
                  Thử lại thanh toán
                </button>
                <Link
                  to="/shop"
                  className="flex-1 border border-outline text-on-surface py-3 px-5 font-label-md text-label-md tracking-wider flex items-center justify-center cursor-pointer transition-colors"
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
