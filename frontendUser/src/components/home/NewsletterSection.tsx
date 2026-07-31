import React, { forwardRef } from 'react';
import toast from 'react-hot-toast';

export const NewsletterSection = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <section ref={ref} className="pb-8 sm:py-sp-xl lg:py-0 md:my-8">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="newsletter-box relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface-container-lowest to-surface-container-low rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-outline-variant/20 shadow-md">
          {/* Background Decorative Elements */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] sm:text-xs font-semibold mb-3 sm:mb-4">
                <span className="material-symbols-outlined text-[16px]">mark_email_unread</span>
                <span>ĐĂNG KÝ BẢN TIN ĐẶC QUYỀN</span>
              </div>
              <h2 className="font-headline-lg text-xl sm:text-3xl md:text-4xl font-bold text-on-surface mb-2 sm:mb-3 tracking-tight">
                Nhận ngay Voucher <span className="text-primary">100.000đ</span> cho đơn đầu tiên
              </h2>
              <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant max-w-xl mb-4 sm:mb-6 leading-relaxed">
                Đăng ký để cập nhật các bộ sưu tập nội thất mới nhất, tư vấn không gian sống và các chương trình ưu đãi độc quyền dành riêng cho bạn.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-[11px] sm:text-xs text-on-surface-variant font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px] sm:text-[18px]">verified</span>
                  <span>Voucher 100k ngay lập tức</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px] sm:text-[18px]">lock</span>
                  <span>Không gửi spam</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px] sm:text-[18px]">cancel_schedule_send</span>
                  <span>Hủy bất kỳ lúc nào</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <form
                className="flex flex-col sm:flex-row lg:flex-col gap-3 p-2.5 sm:p-3 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-sm"
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as HTMLFormElement;
                  const emailInput = target.querySelector('input[type="email"]') as HTMLInputElement;
                  if (emailInput) {
                    emailInput.value = '';
                  }
                  toast.success('Đăng ký nhận ưu đãi thành công! Vui lòng kiểm tra hộp thư email của bạn.');
                }}
              >
                <div className="relative flex-grow">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">
                    mail
                  </span>
                  <input
                    className="w-full bg-surface-container/60 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary focus:bg-surface-container-lowest font-body-md outline-none text-on-surface text-xs sm:text-sm transition-all"
                    placeholder="Nhập địa chỉ email của bạn..."
                    type="email"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 sm:py-3.5 bg-primary text-on-primary rounded-xl font-label-md font-semibold text-xs sm:text-sm hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Đăng ký ngay</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

NewsletterSection.displayName = 'NewsletterSection';
