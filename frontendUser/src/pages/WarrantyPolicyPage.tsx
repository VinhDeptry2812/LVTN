import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, Wrench, Truck, CheckCircle2, XCircle, PhoneCall, ArrowRight, HelpCircle } from 'lucide-react';

const WarrantyPolicyPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Thời gian bảo hành cho từng loại sản phẩm là bao lâu?',
      a: 'Tất cả các sản phẩm nội thất gỗ tự nhiên (bàn, ghế, giường, tủ) được bảo hành chính hãng từ 2 đến 5 năm tùy dòng sản phẩm. Các phụ kiện kim khí (bản lề, ray trượt, khóa) được bảo hành 12 - 24 tháng theo tiêu chuẩn nhà cung cấp.',
    },
    {
      q: 'Làm thế nào để tôi kích hoạt hoặc gửi yêu cầu bảo hành?',
      a: 'Bạn chỉ cần truy cập vào Trang cá nhân > Quản lý bảo hành trên website để gửi phiếu yêu cầu, hoặc gọi trực tiếp Hotline 1900 6789. Đội ngũ kỹ thuật sẽ liên hệ và hẹn giờ tới kiểm tra tận nhà trong vòng 24h - 48h.',
    },
    {
      q: 'Chi phí vận chuyển sản phẩm bảo hành được tính như thế nào?',
      a: 'Trong phạm vi nội thành, công ty hỗ trợ 100% chi phí vận chuyển và nhân công tháo lắp đối với các sản phẩm nằm trong danh mục được bảo hành miễn phí. Đối với các khu vực ngoại thành hoặc tỉnh xa, chúng tôi hỗ trợ 50% phí vận chuyển.',
    },
    {
      q: 'Nếu sản phẩm bị trầy xước do quá trình sử dụng thì có được bảo hành không?',
      a: 'Các lỗi phát sinh do người sử dụng như trầy xước, đổ hóa chất, tiếp xúc nước lâu ngày... không thuộc phạm vi bảo hành miễn phí. Tuy nhiên, chúng tôi cung cấp dịch vụ Bảo Trì Trọn Đời hỗ trợ sửa chữa, sơn lại hoặc làm mới với chi phí ưu đãi nhất.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface selection:bg-primary selection:text-on-primary">
      <Header />

      <main className="flex-grow pt-[80px] md:pt-[100px] pb-24 animate-in fade-in duration-700">
        {/* Hero Banner Section */}
        <section className="relative py-16 md:py-24 bg-surface-container-low border-b border-outline-variant/20 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#536257_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg relative z-10 text-center">
            <span className="inline-flex items-center gap-2 uppercase tracking-[0.2em] text-xs font-bold text-primary mb-4 bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20">
              <ShieldCheck size={16} /> Chính sách chất lượng
            </span>
            <h1 className="font-headline-xl text-3xl md:text-5xl font-light tracking-wide text-on-surface mb-4">
              Chính Sách Bảo Hành & Đổi Trả
            </h1>
            <p className="font-body-lg text-on-surface-variant max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed">
              Chúng tôi cam kết chất lượng tuyệt hảo cho từng sản phẩm và luôn sẵn sàng đồng hành hỗ trợ Quý khách trong suốt quá trình sử dụng.
            </p>
          </div>
        </section>

        {/* 4 Pillars of Warranty */}
        <section className="py-16 md:py-20 bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 hover:border-primary transition-all duration-300 group shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">Bảo Hành 2 - 5 Năm</h3>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Áp dụng cho toàn bộ cấu trúc gỗ, kết cấu mộng nối và bề mặt sơn của các sản phẩm nội thất chính hãng.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 hover:border-primary transition-all duration-300 group shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <RefreshCw size={26} />
                </div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">1 Đổi 1 Trong 30 Ngày</h3>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Đổi mới sản phẩm hoàn toàn miễn phí nếu phát hiện lỗi kỹ thuật sản xuất hoặc hư hỏng do vận chuyển.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 hover:border-primary transition-all duration-300 group shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Wrench size={26} />
                </div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">Bảo Trì Trọn Đời</h3>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Hỗ trợ lau dầu, làm mới bề mặt gỗ và sửa chữa hư hỏng phát sinh sau bảo hành với mức chi phí ưu đãi.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 hover:border-primary transition-all duration-300 group shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Truck size={26} />
                </div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">Tận Nhà Miễn Phí</h3>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Kỹ thuật viên tới tận nơi hỗ trợ kiểm tra, tháo lắp và vận chuyển bảo hành hoàn toàn miễn phí nội thành.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Warranty Rules & Scope */}
        <section className="py-16 md:py-24 bg-surface-container-lowest border-y border-outline-variant/20">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="uppercase tracking-[0.2em] text-xs text-primary font-bold">Phạm vi áp dụng</span>
              <h2 className="text-2xl md:text-4xl font-headline-lg font-light text-on-surface mt-2">
                Điều Kiện & Quy Định Bảo Hành
              </h2>
              <div className="w-12 h-[2px] bg-primary mx-auto mt-4"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Eligible */}
              <div className="bg-surface p-8 md:p-10 border border-outline-variant/40 rounded-none shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/20">
                  <CheckCircle2 className="text-emerald-600 shrink-0" size={28} />
                  <h3 className="font-headline-md text-xl font-bold text-on-surface">
                    Các trường hợp ĐƯỢC bảo hành miễn phí
                  </h3>
                </div>
                <ul className="space-y-4 text-on-surface-variant text-sm font-light">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                    <span>Sản phẩm còn trong thời hạn bảo hành tính từ ngày giao hàng được ghi trên hóa đơn/phiếu giao hàng hoặc hệ thống bảo hành điện tử.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                    <span>Lỗi kết cấu gỗ bị cong vênh, co ngót, nứt nẻ do biến dạng tự nhiên ngoài mức cho phép của nhà sản xuất.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                    <span>Bề mặt sơn bị bong tróc, nổ sơn hoặc đổi màu tự nhiên do lỗi kỹ thuật trong khâu xử lý bề mặt.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                    <span>Lỗi linh kiện kim khí (ray trượt tủ, bản lề cửa, khóa bọc...) bị kẹt, gãy hoặc hư hỏng trong quá trình sử dụng bình thường.</span>
                  </li>
                </ul>
              </div>

              {/* Not Eligible */}
              <div className="bg-surface p-8 md:p-10 border border-outline-variant/40 rounded-none shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/20">
                  <XCircle className="text-rose-600 shrink-0" size={28} />
                  <h3 className="font-headline-md text-xl font-bold text-on-surface">
                    Các trường hợp KHÔNG thuộc phạm vi bảo hành miễn phí
                  </h3>
                </div>
                <ul className="space-y-4 text-on-surface-variant text-sm font-light">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-2 shrink-0"></span>
                    <span>Sản phẩm hết thời hạn bảo hành ghi nhận trên hệ thống.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-2 shrink-0"></span>
                    <span>Hư hỏng do tác động vật lý của người dùng (trầy xước, va đập mạnh, ngấm nước lâu ngày, tiếp xúc nhiệt độ cao hoặc hóa chất tẩy rửa mạnh).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-2 shrink-0"></span>
                    <span>Khách hàng tự ý tháo dỡ, thay đổi kết cấu hoặc nhờ bên thứ ba sửa chữa mà không có sự đồng ý của nhà sản xuất.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-2 shrink-0"></span>
                    <span>Các hao mòn tự nhiên theo thời gian của chất liệu vải, da bọc nệm (bạc màu, giãn nhẹ nệm sau nhiều năm sử dụng).</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Steps Process */}
        <section className="py-16 md:py-24 bg-surface">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="uppercase tracking-[0.2em] text-xs text-primary font-bold">Nhanh chóng & Thuận tiện</span>
              <h2 className="text-2xl md:text-4xl font-headline-lg font-light text-on-surface mt-2">
                Quy Trình Xử Lý Bảo Hành (3 Bước)
              </h2>
              <div className="w-12 h-[2px] bg-primary mx-auto mt-4"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 text-center relative">
                <span className="font-headline-xl text-5xl font-extralight text-primary/30 block mb-4">01</span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-3">Gửi Yêu Cầu Bảo Hành</h3>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Đăng nhập tài khoản &rarr; Quản lý bảo hành để tạo yêu cầu trực tuyến kèm hình ảnh lỗi, hoặc gọi điện tới Hotline 1900 6789.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 text-center relative">
                <span className="font-headline-xl text-5xl font-extralight text-primary/30 block mb-4">02</span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-3">Xác Minh & Hẹn Lịch</h3>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Bộ phận CSKH sẽ xác minh thông tin đơn hàng trong 2h làm việc và sắp xếp kỹ thuật viên liên hệ hẹn giờ tới kiểm tra tận nhà.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 text-center relative">
                <span className="font-headline-xl text-5xl font-extralight text-primary/30 block mb-4">03</span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-3">Sửa Chữa / Thay Thế</h3>
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  Kỹ thuật viên khắc phục lỗi trực tiếp tại nhà. Đối với lỗi nặng cần sửa tại xưởng, công ty hỗ trợ tháo dỡ và vận chuyển miễn phí.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-surface-container-lowest border-t border-outline-variant/20">
          <div className="max-w-4xl mx-auto px-sp-md md:px-lg">
            <div className="text-center mb-12">
              <span className="uppercase tracking-[0.2em] text-xs text-primary font-bold flex items-center justify-center gap-1.5 mb-2">
                <HelpCircle size={16} /> Giải đáp thắc mắc
              </span>
              <h2 className="text-2xl md:text-4xl font-headline-lg font-light text-on-surface">
                Câu Hỏi Thường Gặp
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border border-outline-variant/30 bg-surface rounded-none overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full px-6 py-5 text-left font-headline-sm font-semibold text-on-surface flex items-center justify-between gap-4 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-xl font-light shrink-0 text-primary">{activeFaq === idx ? '−' : '+'}</span>
                  </button>
                  {activeFaq === idx && (
                    <div className="px-6 pb-6 pt-2 text-on-surface-variant text-sm font-light leading-relaxed border-t border-outline-variant/10">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-on-primary">
          <div className="max-w-container-max mx-auto px-sp-md md:px-lg text-center">
            <h2 className="text-2xl md:text-3xl font-headline-lg font-light mb-4">
              Cần hỗ trợ bảo hành sản phẩm của bạn?
            </h2>
            <p className="font-body-md text-on-primary/80 max-w-xl mx-auto mb-8 font-light">
              Nếu bạn đã mua hàng và có nhu cầu kích hoạt hoặc tra cứu trạng thái bảo hành, hãy truy cập trang cá nhân hoặc liên hệ với đội ngũ CSKH của chúng tôi.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/profile?tab=warranty"
                className="px-8 py-3.5 bg-white text-primary font-label-md font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors shadow-md inline-flex items-center gap-2"
              >
                Tra cứu bảo hành cá nhân <ArrowRight size={18} />
              </Link>
              <a
                href="tel:19006789"
                className="px-8 py-3.5 bg-transparent border border-white/40 text-white font-label-md font-bold uppercase tracking-wider hover:bg-white/10 transition-colors inline-flex items-center gap-2"
              >
                <PhoneCall size={18} /> Hotline: 1900 6789
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WarrantyPolicyPage;
