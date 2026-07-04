import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import { useCartStore } from '@/store/useCartStore';

export default function CartPage() {
  const navigate = useNavigate();
  const cartContainerRef = useRef<HTMLDivElement>(null);

  const { items: cartItems, updateQuantity, removeItem, updateVariant, orderNote, setOrderNote } = useCartStore();

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);

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

  const handleUpdateQuantity = (id: string, currentQty: number, delta: number) => {
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

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'MINIMALIST') {
      setDiscount(0.1); // 10% discount
      setPromoApplied(true);
    } else {
      toast.error('Mã giảm giá không hợp lệ. Thử mã "MINIMALIST"');
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.rawPrice * item.quantity, 0);
  const discountAmount = subtotal * discount;
  const total = subtotal - discountAmount;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace('₫', '₫');
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md antialiased overflow-x-hidden" ref={cartContainerRef}>
      <Header />

      <main className="pt-28 pb-sp-xl">
        <div className="max-w-container-max mx-auto px-sp-md md:px-lg">
          {/* Breadcrumbs */}
          <nav className="flex items-center justify-start space-x-2 pb-sp-lg text-on-surface-variant font-label-sm text-label-sm">
            <Link className="hover:text-primary transition-colors" to="/">
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Giỏ hàng</span>
          </nav>

          <h1 className="cart-title font-headline-lg text-headline-lg text-primary mb-sp-xl text-left">Giỏ hàng của bạn</h1>

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
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    data-cart-item={item.id}
                    className="cart-item-card flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-300"
                  >
                    {/* Image Container */}
                    <Link to={`/product/${item.productId}`} className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-[#f4f5f4] rounded-xl overflow-hidden mx-auto sm:mx-0 flex items-center justify-center p-2 hover:opacity-80 transition-opacity">
                      <img alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" src={item.image} loading="lazy" />
                    </Link>

                    {/* Content Container */}
                    <div className="flex-grow flex flex-col min-w-0">

                      {/* Top row: Name, Variant, Price */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <Link to={`/product/${item.productId}`} className="font-headline-md text-headline-md text-on-surface line-clamp-2 hover:text-primary transition-colors block">{item.name}</Link>
                          {item.availableVariants && item.availableVariants.length > 0 ? (
                            <div className="mt-2 inline-block">
                              <select
                                value={item.variantId || (item.availableVariants[0]?.id || '')}
                                onChange={(e) => updateVariant(item.id, Number(e.target.value))}
                                className="font-body-sm text-body-sm text-on-surface-variant border border-outline-variant rounded-lg py-1.5 px-3 bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none max-w-full cursor-pointer hover:border-primary transition-colors appearance-none"
                                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23495057%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto', paddingRight: '2rem' }}
                              >
                                {item.availableVariants.map((v: any) => {
                                  const label = (v.attributes && Object.keys(v.attributes).length > 0)
                                    ? Object.values(v.attributes).join(' - ')
                                    : (v.sku || `Biến thể ${v.id}`);
                                  return (
                                    <option key={v.id} value={v.id}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          ) : (
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{item.material}</p>
                          )}
                        </div>
                        <div className="text-center sm:text-right flex-shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
                          <p className="font-headline-md text-headline-md text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(item.rawPrice)}</p>
                        </div>
                      </div>

                      {/* Bottom row: Quantity and Delete */}
                      <div className="mt-auto pt-4 flex justify-between items-center border-t border-outline-variant/20 sm:border-t-0 sm:pt-0 sm:mt-auto">

                        {/* Quantity selector */}
                        <div className="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest h-9" role="group" aria-label={`Số lượng ${item.name}`}>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                            aria-label="Giảm số lượng"
                            className="w-9 h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer rounded-l-lg"
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">remove</span>
                          </button>
                          <span className="font-label-md text-label-md w-10 text-center select-none" aria-live="polite">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                            aria-label="Tăng số lượng"
                            className="w-9 h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer rounded-r-lg"
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                          </button>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => deleteItem(item.id)}
                          aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors group cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform" aria-hidden="true">
                            delete
                          </span>
                          <span className="font-label-sm text-label-sm hidden sm:inline">Xóa</span>
                        </button>
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
              <div className="lg:w-1/3">
                <div className="cart-summary-card bg-surface-container p-sp-md rounded-xl sticky top-28 space-y-sp-md">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Tóm tắt đơn hàng</h2>
                  <div className="space-y-sp-sm border-b border-outline-variant pb-sp-lg">
                    <div className="flex justify-between">
                      <span className="font-body-md text-body-md text-on-surface-variant">Tạm tính</span>
                      <span className="font-label-md text-label-md text-on-surface">{formatPrice(subtotal)}</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between text-error">
                        <span className="font-body-md text-body-md">Mã giảm giá (10%)</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-body-md text-body-md text-on-surface-variant">Phí vận chuyển</span>
                      <span className="font-label-md text-label-md text-primary">-</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end pb-4">
                    <span className="font-headline-md text-headline-md text-on-surface">Tổng cộng</span>
                    <span className="font-headline-md text-headline-md text-primary">{formatPrice(total)}</span>
                  </div>
                  <div className="space-y-sp-sm">
                    <button
                      onClick={() => navigate('/checkout')}
                      className="group relative w-full overflow-hidden bg-primary text-on-primary font-label-md text-label-md py-4 rounded-full active:scale-[0.98] transition-transform duration-300 shadow-sm cursor-pointer"
                    >
                      <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out z-0"></span>
                      <span className="relative z-10">Tiến hành thanh toán</span>
                    </button>
                    <Link
                      to="/shop"
                      className="block text-center font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors mt-sp-md"
                    >
                      Tiếp tục mua sắm
                    </Link>
                  </div>

                  {/* Promotion Code Input */}
                  <div className="pt-4 border-t border-outline-variant">
                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-2">Mã giảm giá</p>
                    <div className="flex gap-2">
                      <input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-grow bg-white border border-outline-variant rounded-lg font-body-sm text-body-sm px-4 focus:ring-1 focus:ring-primary h-12"
                        placeholder="Nhập mã của bạn"
                        type="text"
                      />
                      <button
                        onClick={applyPromo}
                        className="px-6 h-12 bg-surface-container-highest rounded-lg font-label-sm text-label-sm text-primary hover:bg-primary-fixed transition-colors cursor-pointer"
                      >
                        Áp dụng
                      </button>
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
