import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import VariantSelectorModal from '@/components/VariantSelectorModal';

import { useCartStore } from '@/store/useCartStore';
import { productCardImage } from '@/utils/cloudinaryUrl';
import { formatPrice } from '@/utils/format';

const formatAttributes = (attributes: Record<string, any> | undefined) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .join('|');
};

export default function CartPage() {
  const navigate = useNavigate();
  const cartContainerRef = useRef<HTMLDivElement>(null);

  const { items: cartItems, updateQuantity, removeItem, updateVariant, orderNote, setOrderNote } = useCartStore();



  // GSAP animation
  useGSAP(() => {
    gsap.from('.cart-title', { opacity: 0, y: -20, duration: 0.6, ease: 'power2.out' });
    gsap.from('.cart-item-card', {
      opacity: 0,
      x: -30,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out'
    });
    gsap.from('.cart-summary-card', {
      opacity: 0,
      x: 30,
      duration: 0.6,
      ease: 'power2.out',
      delay: 0.2
    });
  }, { scope: cartContainerRef });

  const handleUpdateQuantity = (id: string, currentQty: number, delta: number, item: any) => {
    if (delta > 0) {
      const variant = item.availableVariants?.find((v: any) => v.id === item.variantId);
      const maxStock = variant ? (variant.stock || 0) : 9999;
      if (currentQty >= maxStock) {
        toast.error(`Sản phẩm này chỉ còn tối đa ${maxStock} sản phẩm trong kho!`);
        return;
      }
    }
    updateQuantity(id, currentQty + delta);
  };

  const deleteItem = (id: string) => {
    // GSAP exit animation before removal
    gsap.to(`[data-cart-item="${id}"]`, {
      opacity: 0,
      x: -50,
      duration: 0.3,
      onComplete: () => {
        removeItem(id);
        toast.success('Đã xóa sản phẩm khỏi giỏ hàng');
      }
    });
  };



  const subtotal = cartItems.reduce((sum, item) => sum + item.rawPrice * item.quantity, 0);

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-hidden" ref={cartContainerRef}>
      <Header />

      <main className="pt-28 pb-sp-xl">
        <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
          {/* Breadcrumbs */}
          <Breadcrumbs items={[{ label: 'Giỏ hàng' }]} className="pb-sp-lg" />

          <h1 className="cart-title font-headline-lg text-headline-lg text-primary mb-3 md:mb-sp-xl text-left">Giỏ hàng của bạn</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm space-y-sp-md">
              <span className="material-symbols-outlined text-[64px] text-on-surface-variant">shopping_bag</span>
              <p className="font-headline-md text-headline-md text-on-surface">Giỏ hàng của bạn đang trống</p>
              <button
                onClick={() => navigate('/shop')}
                className="bg-primary text-on-primary px-8 py-3 rounded-full hover:brightness-110 active:scale-95 transition-all"
              >
                QUAY LẠI CỬA HÀNG
              </button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-gutter">
              {/* Product List Section (2/3) */}
              <div className="lg:w-2/3 space-y-sp-md">
                {/* Banner số lượng sản phẩm */}
                <div className="bg-surface-container-low px-6 py-3.5 rounded-xl font-body-md text-body-md text-on-surface-variant flex items-center justify-between border border-outline-variant/20 mb-4 text-left">
                  <span>
                    Có <span className="font-bold text-primary">{cartItems.length} sản phẩm</span> trong giỏ hàng của bạn
                  </span>
                </div>

                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    data-cart-item={item.id}
                    className="cart-item-card relative flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-300"
                  >
                    {/* Delete button (Xóa) ở góc trên bên phải */}
                    <button
                      onClick={() => deleteItem(item.id)}
                      aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                      className="absolute top-4 right-4 sm:top-6 sm:right-6 text-on-surface-variant hover:text-error transition-colors p-1 rounded-full hover:bg-error/5 cursor-pointer z-10"
                    >
                      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                        close
                      </span>
                    </button>

                    {/* Image Container */}
                    <Link to={`/product/${item.productId}`} className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-[#f4f5f4] rounded-xl overflow-hidden mx-auto sm:mx-0 flex items-center justify-center p-2 hover:opacity-80 transition-opacity">
                      <img alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" src={productCardImage(item.image)} loading="lazy" />
                    </Link>

                    {/* Content Container */}
                    <div className="flex-grow flex flex-col min-w-0 pr-0 sm:pr-8">
                      {/* Top row: Name, Variant, Price */}
                      <div className="flex flex-col justify-between items-start gap-1">
                        <div className="min-w-0 flex-1 text-left">
                          <Link to={`/product/${item.productId}`} className="font-headline-md text-headline-md text-on-surface line-clamp-2 hover:text-primary transition-colors block pr-6 font-semibold">{item.name}</Link>

                          {/* Đơn giá và giá gốc gạch ngang */}
                          <div className="flex flex-wrap items-baseline gap-2 mt-1.5 text-left">
                            <span className="font-body-sm text-sm text-on-surface-variant/80 font-medium">{formatPrice(item.rawPrice)}</span>
                            {item.rawOldPrice && item.rawOldPrice > item.rawPrice && (
                              <span className="font-body-sm text-xs text-on-surface-variant/50 line-through">{formatPrice(item.rawOldPrice)}</span>
                            )}
                          </div>

                          {/* Chọn biến thể sản phẩm */}
                          <VariantSelectorModal
                            item={item}
                            onUpdateVariant={updateVariant}
                          />
                        </div>
                      </div>

                      {/* Bottom row: Quantity selector & Line item subtotal */}
                      <div className="mt-6 pt-4 flex justify-between items-center border-t border-outline-variant/20">
                        {/* Quantity selector */}
                        <div className="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest h-9" role="group" aria-label={`Số lượng ${item.name}`}>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, -1, item)}
                            aria-label="Giảm số lượng"
                            className="w-9 h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer rounded-l-lg"
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">remove</span>
                          </button>
                          <span className="font-label-md text-label-md w-10 text-center select-none" aria-live="polite">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1, item)}
                            aria-label="Tăng số lượng"
                            className="w-9 h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer rounded-r-lg"
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                          </button>
                        </div>

                        {/* Line subtotal */}
                        <div className="text-right">
                          <p className="font-headline-md text-headline-md text-on-surface font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatPrice(item.rawPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Order Note Section */}
                <div className="cart-item-card bg-white p-4 sm:p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 mt-6">
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">edit_note</span>
                    Ghi chú đơn hàng
                  </h3>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Ghi chú thêm về đơn hàng của bạn"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-4 font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-primary outline-none transition-colors resize-y min-h-[100px]"
                  ></textarea>
                </div>
              </div>

              {/* Order Summary Section (1/3) */}
              <div className="lg:w-1/3 space-y-sp-md">
                <div className="cart-summary-card bg-surface-container p-sp-md rounded-xl sticky top-28 space-y-sp-md border border-outline-variant/30">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold text-left">Thông tin đơn hàng</h2>

                  <div className="flex justify-between items-end pb-4 pt-2">
                    <span className="font-headline-md text-headline-md text-on-surface font-medium">Tổng:</span>
                    <span className="font-headline-lg text-headline-lg text-error font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(subtotal)}</span>
                  </div>

                  <div className="space-y-sp-sm">
                    <button
                      onClick={() => navigate('/checkout')}
                      className="w-full bg-primary text-on-primary font-label-md text-label-md py-4 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all duration-300 shadow-md cursor-pointer uppercase font-bold tracking-wider flex items-center justify-center gap-2"
                    >
                      Tiến hành thanh toán
                    </button>

                    <Link
                      to="/shop"
                      className="flex items-center justify-center gap-2 font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors mt-sp-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      Tiếp tục mua hàng
                    </Link>
                  </div>

                  {/* Trust Policies / Service Commitments */}
                  <div className="pt-6 border-t border-outline-variant/30 space-y-3.5 text-left text-[12.5px] leading-relaxed text-on-surface-variant">
                    <div className="flex gap-2.5 items-start">
                      <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5 font-bold">check_circle</span>
                      <p>
                        <span className="font-semibold text-on-surface">Không rủi ro.</span> Đặt hàng trước, thanh toán sau tại nhà.
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5 font-bold">check_circle</span>
                      <p>
                        <span className="font-semibold text-on-surface">Miễn phí giao hàng & lắp đặt</span> tại tất cả quận huyện thuộc TP.HCM, Hà Nội, Khu đô thị Ecopark, Biên Hòa và Bình Dương (*)
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5 font-bold">check_circle</span>
                      <p>
                        Đơn hàng của quý khách sẽ được <span className="font-semibold text-on-surface">giao hàng trong vòng 3 ngày</span>, vui lòng đợi nhân viên tư vấn xác nhận lịch giao hàng.
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5 font-bold">check_circle</span>
                      <p>
                        <span className="font-semibold text-on-surface">Miễn phí 1 đổi 1</span> - Bảo hành 2 năm - Bảo trì trọn đời (**)
                      </p>
                    </div>  
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
