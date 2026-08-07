import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCategories, type Category } from '@/services/category.service';
import logoImg from '@/assets/logo/logo.png';

export default function Footer() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data))
      .catch(console.error);
  }, []);

  return (
    <footer className="bg-surface-container-low text-on-surface border-t border-outline-variant/20 pt-2 md:pt-16 pb-8 w-full md:mt-sp-xl lg:mt-0">
      <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
        {/* Main Grid Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-outline-variant/20">

          {/* Column 1: Brand & Contact Info (occupies 2 columns on lg) */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-4 hover:opacity-90 transition-opacity">
              <img
                src={logoImg}
                alt="Logo Nội thất"
                className="h-16 sm:h-[80px] w-auto object-contain"
              />
            </Link>
            <p className="font-body-md text-on-surface-variant text-sm mb-6 max-w-md leading-relaxed">
              Tôn vinh vẻ đẹp của sự giản đơn, tinh tế và ấm áp trong từng không gian sống. Chúng tôi mang đến những thiết kế nội thất hiện đại, bền bỉ theo thời gian.
            </p>

            <div className="space-y-3 text-sm text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                <span>180 Đường Tạ Quang Bửu, Quận 8, TP. Hồ Chí Minh</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                <span className="font-semibold text-on-surface">Hotline: 1900 6789 - (028) 3838 9999</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
                <span>Email: support@noithat.vn</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                <span>Giờ làm việc: 8:00 - 21:00 (Tất cả các ngày trong tuần)</span>
              </div>
            </div>
          </div>

          {/* Column 2: Product Categories */}
          <div>
            <h4 className="font-headline-sm text-base font-bold text-on-surface mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.5 after:bg-primary">
              Danh mục sản phẩm
            </h4>
            <ul className="space-y-2.5 text-sm text-on-surface-variant">
              {categories.length > 0 ? (
                categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      to={`/shop?category=${cat.slug}`}
                      className="hover:text-primary hover:translate-x-1 transition-all inline-block"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/shop?category=sofa" className="hover:text-primary transition-colors">Ghế Sofa</Link></li>
                  <li><Link to="/shop?category=ban-an" className="hover:text-primary transition-colors">Bàn ăn cao cấp</Link></li>
                  <li><Link to="/shop?category=giuong-ngu" className="hover:text-primary transition-colors">Giường ngủ</Link></li>
                  <li><Link to="/shop?category=tu-ke" className="hover:text-primary transition-colors">Tủ & Kệ trang trí</Link></li>
                  <li><Link to="/shop?category=den-trang-tri" className="hover:text-primary transition-colors">Đèn trang trí</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Column 3: Customer Care & Policies */}
          <div>
            <h4 className="font-headline-sm text-base font-bold text-on-surface mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.5 after:bg-primary">
              Hỗ trợ & Chính sách
            </h4>
            <ul className="space-y-2.5 text-sm text-on-surface-variant">
              <li>
                <Link to="/about-furniture" className="hover:text-primary transition-colors">Về thương hiệu Nội thất</Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary transition-colors font-medium text-primary">Tin tức & Mẹo nội thất</Link>
              </li>
              <li>
                <Link to="/about-store" className="hover:text-primary transition-colors">Hệ thống Showroom</Link>
              </li>
              <li>
                <Link to="/warranty-policy" className="hover:text-primary transition-colors">Chính sách bảo hành 3-5 năm</Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">Chính sách giao hàng & lắp đặt</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">Chính sách đổi trả 1-đổi-1</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">Hướng dẫn bảo quản sản phẩm</a>
              </li>
            </ul>
          </div>

          {/* Column 4: Payments & Social Media */}
          <div>
            <h4 className="font-headline-sm text-base font-bold text-on-surface mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.5 after:bg-primary">
              Kết nối & Thanh toán
            </h4>

            {/* Social Media */}
            <div className="mb-6">
              <p className="text-xs text-on-surface-variant mb-3 font-medium">Theo dõi chúng tôi trên:</p>
              <div className="flex gap-2">
                <a
                  href="#"
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all shadow-xs"
                  title="Facebook"
                >
                  <span className="material-symbols-outlined text-[18px]">public</span>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all shadow-xs"
                  title="Instagram"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all shadow-xs"
                  title="Youtube"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all shadow-xs"
                  title="Email"
                >
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </a>
              </div>
            </div>

            {/* Payment Icons */}
            <div>
              <p className="text-xs text-on-surface-variant mb-3 font-medium">Phương thức thanh toán:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded font-bold text-primary">VNPay</span>
                <span className="px-2.5 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded font-semibold text-on-surface">COD</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar / Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <p>© 2026 Nội thất. Tất cả các quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:underline hover:text-primary">Điều khoản sử dụng</a>
            <a href="#" className="hover:underline hover:text-primary">Chính sách bảo mật</a>
            <a href="#" className="hover:underline hover:text-primary">Sơ đồ trang web</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
