import React, { forwardRef } from 'react';

export const AboutUsSection = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <section ref={ref} className="pb-10 md:py-0 bg-gradient-to-b from-surface via-surface-container-lowest/30 to-surface border-b border-outline-variant/20 overflow-hidden">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column: Image with artistic border & floating glass badge */}
          <div className="relative about-animate group">
            {/* Decorative background border */}
            <div className="absolute -inset-2 sm:-inset-3 border-2 border-primary/15 rounded-3xl -z-10 translate-x-2 translate-y-2 pointer-events-none transition-transform duration-500 group-hover:translate-x-3 group-hover:translate-y-3"></div>

            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-outline-variant/20">
              <img
                src="https://images.unsplash.com/photo-1541123437800-1bb1317badc2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80"
                alt="Nhà máy FurniShop"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/5 transition-opacity duration-500 group-hover:opacity-10"></div>
            </div>
            {/* Floating Glassmorphism Badge */}
            <div className="absolute -bottom-6 -right-4 lg:-right-8 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/40 hidden md:block max-w-[260px] transition-all duration-500 hover:scale-105">
              <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[28px]">workspace_premium</span>
              </div>
              <h4 className="font-bold text-headline-sm text-neutral-800 mb-1.5">Chuẩn Gỗ CARB-P2</h4>
              <p className="text-[12px] text-neutral-600 leading-relaxed">Nồng độ phát thải Formaldehyde gần như bằng 0, tuyệt đối an toàn cho sức khỏe gia đình bạn.</p>
            </div>
          </div>

          {/* Right Column: Premium Narrative */}
          <div className="flex flex-col justify-center about-animate">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary font-semibold tracking-widest uppercase text-xs">Về chúng tôi</span>
              <div className="h-[1px] w-12 bg-primary/30"></div>
            </div>
            <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface mb-4 sm:mb-6 leading-tight">
              Nội thất <span className="text-primary">Xanh</span> cho gia đình Việt
            </h2>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant/90 mb-4 sm:mb-5 leading-relaxed">
              Là thương hiệu nội thất bán lẻ trực thuộc nhà máy liên doanh xuất khẩu quy mô lớn, Nội thất tự hào sở hữu quy trình sản xuất khép kín đạt chứng chỉ bảo vệ rừng quốc tế <strong>FSC</strong>.
            </p>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant/90 mb-6 sm:mb-8 leading-relaxed">
              Từng thớ gỗ, từng lớp sơn phủ đều vượt qua kiểm định khắt khe của chứng chỉ <strong>CARB-P2</strong> (California Air Resources Board) - tiêu chuẩn an toàn không khí cao cấp nhất dành cho vật liệu gỗ công nghiệp.
            </p>

            {/* Certifications Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
              {/* FSC Card */}
              <div className="group/card flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-primary/[0.02] border border-primary/5 hover:border-primary/15 hover:bg-primary/[0.04] transition-all duration-300">
                <div className="bg-primary/10 text-primary w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/card:scale-110">
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">forest</span>
                </div>
                <div>
                  <h4 className="font-bold text-neutral-800 text-xs sm:text-sm mb-1 group-hover/card:text-primary transition-colors">100% FSC Certified</h4>
                  <p className="text-[11px] sm:text-[12px] text-on-surface-variant leading-relaxed">Gỗ có nguồn gốc minh bạch từ rừng trồng bền vững.</p>
                </div>
              </div>

              {/* Eco Card */}
              <div className="group/card flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-primary/[0.02] border border-primary/5 hover:border-primary/15 hover:bg-primary/[0.04] transition-all duration-300">
                <div className="bg-primary/10 text-primary w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/card:scale-110">
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">eco</span>
                </div>
                <div>
                  <h4 className="font-bold text-neutral-800 text-xs sm:text-sm mb-1 group-hover/card:text-primary transition-colors">Eco-friendly Coated</h4>
                  <p className="text-[11px] sm:text-[12px] text-on-surface-variant leading-relaxed">Sử dụng sơn phủ thân thiện môi trường, không mùi độc hại.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

AboutUsSection.displayName = 'AboutUsSection';
