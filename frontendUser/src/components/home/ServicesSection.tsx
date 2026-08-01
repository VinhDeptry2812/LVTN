import React, { forwardRef } from 'react';

export const ServicesSection = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <section ref={ref} className="py-8 sm:py-12 bg-surface border-b border-outline-variant/30">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
          {[
            { icon: 'local_shipping', title: 'Miễn phí giao hàng', desc: 'Cho đơn hàng trên 5 triệu' },
            { icon: 'verified', title: 'Bảo hành 2 năm', desc: 'Chất lượng đảm bảo' },
            { icon: 'currency_exchange', title: 'Đổi trả 7 ngày', desc: 'Miễn phí đổi trả' },
            { icon: 'eco', title: 'Vật liệu an toàn', desc: 'Đạt chuẩn CARB-P2' },
          ].map((service, idx) => (
            <div key={idx} className="service-item flex flex-col items-center p-2.5 sm:p-4">
              <span className="material-symbols-outlined text-[32px] sm:text-[40px] text-primary mb-2 sm:mb-3">{service.icon}</span>
              <h3 className="font-headline-sm font-bold text-on-surface text-xs sm:text-headline-sm mb-1">{service.title}</h3>
              <p className="font-body-sm text-[11px] sm:text-body-sm text-on-surface-variant">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

ServicesSection.displayName = 'ServicesSection';
